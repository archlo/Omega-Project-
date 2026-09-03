---
name: wz-gap-audit
description: Use when the user wants to know what WZ nodes/fields exist in a subsystem that the TS client doesn't read yet — phrases like "what's missing in our client", "what wz nodes are we not handling", "what are we missing for mobs", "what fields aren't we using", "audit our mob coverage", "what's not implemented yet on items", "compare WZ to our client", "see the full overview, what may be missing", "find unread WZ nodes", "are we using everything from X.wz". Pairs the `wz-explore` output (union of WZ nodes seen in the WZ) with grep over the matching TS service / Info file to produce a diff of *unread* nodes ranked by frequency. Output names the specific files and shows what's wired vs not. Triggers ONLY for the audit pass; for actually wiring the missing nodes use `wz-gap-implement`.
---

# wz-gap-audit

Compares what the WZ subsystem *can* carry to what the TS client *does* read.
Surfaces every WZ node name that appears in the WZ universe but is never
referenced from the matching TS code path.

## When to use

- "What WZ nodes are we not using for mobs?"
- "What might be missing in the client?"
- "What optional capabilities do we ignore on items?"
- Any "find the gap" question between WZ assets and our TS parsers.

## When NOT to use

- Bare WZ exploration (no comparison to TS code) → `wz-explore`.
- Actually fixing the gap → `wz-gap-implement`.
- Full subsystem sweep with new typed model + docs page → `wz-subsystem-research`.

## Inputs

- A WZ subsystem (`Mob.wz`, `Item.wz`, `Skill.wz`, `Npc.wz`, `Reactor.wz`,
  `Quest.wz`, `Map.wz`, `Character.wz`, …). Read the `.nx` form in
  `wz_client/` (the client's `WzPackage` prefers `.nx`).
- The matching client-side service / info file (mostly under `src/character/`
  and `src/map/`).

The audit only needs the *subsystem name*; everything else is discovered.

## Workflow

1. **Get the universe.** Enumerate the nodes with the `wz-explore` tooling
   (see that skill for full command syntax):

   ```bash
   python nx-tools/nxtools.py ls wz_client/Mob.nx                 # root entries
   python nx-tools/nxtools.py dump wz_client/Mob.nx 0100100.img/info --json
   ```

   To see which fields are *rare vs core* across all entries, sample a set of
   representative ids (e.g. `ls` the root, pick ~10 spread across difficulty),
   `dump --json` each `info` subtree, and tally the child names. The
   interactive `shell` (`python nx-tools/nxtools.py shell wz_client/Mob.nx`)
   with `find <substr>` helps answer "which entries carry node X".

   For some subsystems the entries don't sit at the WZ root. Follow the
   client's own `ItemInfoService.GetItemProp` convention (`src/character/ItemInfoService.ts:53`):
   **equips (cat 1) load from `Character.nx/<Category>/<id:D8>.img`**,
   bundles (cat 2–5) from `Item.nx/<Folder>/<id/10000:D4>.img/<id:D8>`. Use
   `ls` first to find the right subtree, then dump that subtree.

2. **Find the TS reader file.** Locate by convention:

| WZ          | Typical reader file |
|-------------|---------------------|
| `Mob.wz`    | `src/character/MobInfo.ts` + `MobInfoService.ts` |
| `Item.wz`   | `src/character/ItemInfoService.ts` (+ `ItemOptionInfo.ts`) |
| `Skill.wz`  | `src/character/SkillInfoService.ts` |
| `Npc.wz`    | `src/character/NpcInfo.ts` (or similar) |
| `Reactor.wz`| `src/character/ReactorInfo.ts` |
| `Quest.wz`  | `src/character/QuestInfoService.ts` |
| `Map.wz`    | `src/map/MapInfo.ts` / `src/map/FieldScene.ts` |
| `Character.wz` | `src/character/MakeCharInfoProvider.ts` |

   Verify with `Glob 'src/**/*Info*.ts'` and `Grep '<wz>.GetItem'` if the
   convention doesn't hold. Always cross-check by grepping for one known
   field (e.g. `"maxHP"` or `_readInt(info, 'level')`) — the right file will
   be the one that reads it.

3. **Extract the read set.** Grep the service file for quoted node names and
   `_read*` helper keys. The names appear as `_readInt(p, 'key')`,
   `_readBool(p, 'key')`, `_readStr(p, 'key')` (see `MobInfoService.ts:196`),
   inside `GetItem('a/b/c')` path literals, or as switch/case keys on a
   `string` from `prop.Items`:

   ```bash
   grep -oE "'[a-zA-Z][a-zA-Z0-9_]*'" <reader-file> | sort -u
   ```

   (On PowerShell: `Select-String -AllMatches -Pattern "'[a-zA-Z][a-zA-Z0-9_]*'" ...`).
   You'll get more than you want (log strings, comments). Dedup and treat the
   set as "definitely referenced"; false positives are tolerable, false
   negatives are not.

4. **Diff.** For each name in the universe, mark it `[read]` if it's in the
   grep set, `[unread]` otherwise. Sort the unread rows by frequency desc.

5. **Augment with the server + IDB meaning.** For the top ~10 unread rows,
   cross-reference our own server's loader at
   `C:\Users\jorge\OneDrive\Desktop\server\src\provider\<subsystem>\<X>Template.ts`
   (e.g. `mob/MobTemplate.ts`, `skill/SkillInfo.ts`, `item/ItemTemplate.ts`),
   and the IDB's matching class via `ida-lookup`. Add a one-line meaning
   column. Don't paste raw bodies — paraphrase.

6. **Report.** A single table with these columns:

   ```
   node        | count / ratio | status  | meaning (short)
   ----------- + ------------- + ------- + ----------------------------------
   info/level  | 1887  99.9%   | [read]  | base mob level
   stand       | 1338  70.8%   | [read]  | idle action canvas + delay
   jump        |  215  11.4%   | [unread]| jump action; absent on grounded mobs
   skill1      |  390  20.7%   | [unread]| visible cast canvases for skill #1
   chase       |   38   2.0%   | [unread]| separate animation while aggro'd
   …
   ```

   Then a short summary: "N nodes unread, top candidates to wire are A / B /
   C because <reason>."

## Heuristics for prioritising

- **High frequency + missing.** A node present in >20% of entries that's
  unread is almost always a real gap.
- **Visible animation.** Action nodes (`stand`, `move`, `jump`, `fly`,
  `attack*`, `skill*`, `hit`, `die*`, `regen`, `say`) that aren't read map
  directly to missing on-screen behaviour — easy to test.
- **Server-validated fields.** If the server's `MobTemplate` (or equivalent)
  reads a field, the server cares about it; if the client also cares (combat
  damage formulas, drop tables) the gap is functional, not cosmetic.
- **Cosmetic only.** Hue / colour / visual-flag fields the server doesn't
  read are still worth flagging but lower priority.

## Output discipline

- Lead with the headline: "Mob.wz exposes 42 distinct nodes; MobInfoService
  reads 28; 14 are unread."
- One table.
- One short paragraph naming the top 3–5 actionable gaps.
- Don't paste raw JSON. Don't paste full file contents.

## Boundaries

- **Read-only.** Never edit code from this skill — write up the audit and
  stop. Handoff to `wz-gap-implement` for the wiring.
- Never commit or push.
- The grep heuristic is best-effort. If you suspect a false positive (a
  field that *is* read indirectly), check with `Grep` for the actual usage
  before claiming it's unread.
