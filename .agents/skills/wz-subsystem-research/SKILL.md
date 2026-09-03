---
name: wz-subsystem-research
description: Use when the user asks to research / map / build a typed TS model for a WZ subsystem — phrases like "research Item.wz", "do a Mob.wz-style sweep on Skill.wz", "build the full attribute reference for Map.wz", "what's in Quest.wz", "expand <X>Info to all fields", or any reference to enumerating every WZ node a subsystem uses. Performs the same Kinoko+IDB cross-reference sweep used to produce `MobInfo` / `docs/mob-wz.md` for Mob.wz, so future combat / AI / drop / visual work doesn't need to re-introduce concepts. Triggers ONLY for full-subsystem sweeps (20+ fields); for one-off node lookups use `Grep` / `Read` directly.
---

# wz-subsystem-research

The MapleClaude codebase owns its understanding of WZ subsystems as typed TS
models — see the Mob.wz pass that produced:

- `src/character/MobInfo.ts` (40+ properties + 5 collections)
- `src/character/MobAttack.ts` + `MobSkillRef.ts` + `MobSkillType.ts`
- `src/character/MobInfoService.ts` (parser + cache)
- `docs/mob-wz.md` (one-page reference table)
- `memory/mob-wz-attributes.md` (persistent index entry)

When the user wants the same depth on another WZ subsystem — Item / Skill / Map /
NPC / Reactor / Quest / Character / Field / etc. — this skill walks the workflow.

## When NOT to use

- One-off field lookup ("what does Mob.wz/info/pushed mean?") → use `Grep` /
  `Read` directly.
- Implementing a single packet handler → use `server-packet-mirror` /
  `client-packet-author`.
- WZ binary format questions (PKG1, AES, UOL) → use `wz-reader`.

## Sources (read both — server-only or client-only alone is incomplete)

1. **Kinoko upstream Java** at `KINOKO_UPSTREAM` (`CLAUDE.local.md`).
   - `og_kinoko/.../kinoko/provider/<subsystem>/<X>Template.java` — what the
     server validates (the in-memory record).
   - `og_kinoko/.../kinoko/provider/<X>Provider.java` — the loader + cache.
2. **v95 client `CXxx*` struct** via the `ida-pro/idalib` MCP.
   - Bind procedure in `CLAUDE.local.md` ("Live IDA database (idalib MCP)").
   - Use the `idb-bind` skill if the DB is locked / disconnected.
   - This is the larger superset — every WZ node the client reads at runtime,
     plus the runtime semantics for each field (which game system uses it).

The Kinoko-only set is server-validated; the client-only delta is the cosmetic /
movement / display / control flags the server doesn't track.
## Workflow

The right move 99% of the time is to **launch the `wz-subsystem-research` agent**
with the target subsystem name. The agent owns the deep parts (IDB binding, the
Kinoko parse traversal, the merge into one structured report) and respects the
privacy rules around the local references.

```text
Agent({
  description: "<X>.wz schema sweep",
  subagent_type: "wz-subsystem-research",
  prompt: "Research the <X> WZ subsystem end-to-end. Subsystem: <X>. Where in the
           Kinoko upstream: kinoko/provider/<area>/. Expected client struct:
           CXxxTemplate / CXxxInfo. Report the merged attribute schema (server-
           validated + client-only), recommend the TS model files to create under
           src/<area>/, and flag any quirks (info/link redirects,
           secure-encoded fields, type disagreements between Kinoko and the IDB).
           Match the depth of the Mob.wz pass — see docs/mob-wz.md."
})
```

The agent returns a structured report; the parent thread then:

1. Reviews the proposed TS model — keep / trim fields to what the project actually
   needs (no purely-decorative IDB fields with no future use).
2. Writes the typed model files: `src/<area>/<Xxx>Info.ts` +
   `<Xxx>InfoService.ts` + any supporting class / enum (`<Xxx>Attack.ts`,
   `<Xxx>SkillRef.ts`, etc.). Use the `Mob*` files as the style template.
3. Writes `docs/<x>-wz.md` (mirror the section structure of `docs/mob-wz.md`).
4. Adds the persistent memory entry under
   `.claude/projects/<project>/memory/<x>-wz-attributes.md` and indexes it in
   `MEMORY.md`.
5. Runs `npx vitest` + `tsc --noEmit` to confirm nothing breaks. (The expansion
   is additive — existing call sites just keep reading the fields they already
   had.)

## Standard subsystem map

| Subsystem | Kinoko provider package | Likely client struct | WZ image-id convention |
| --- | --- | --- | --- |
| Item (equip) | `provider/item/EquipTemplate` | `CItemInfo` / `CEquipItemInfo` | `Item.wz/Equip/<cat>/<id:D8>.img` |
| Item (bundle) | `provider/item/BundleTemplate` | `CItemInfo` | `Item.wz/Consume/<cat>/<id:D8>.img` |
| Skill | `provider/skill/SkillTemplate` | `CSkillInfo` | `Skill.wz/<job:D3>.img/skill/<id:D7>` |
| Mob | `provider/mob/MobTemplate` | `CMobTemplate` | `Mob.wz/<id:D7>.img` *(done)* |
| Map / Field | `provider/map/MapInfo` | `CField` / `CMapTemplate` | `Map.wz/Map/Map<prefix>/<id:D9>.img` |
| NPC | `provider/npc/NpcTemplate` | `CNpcTemplate` | `Npc.wz/<id:D7>.img` |
| Reactor | `provider/reactor/ReactorTemplate` | `CReactorTemplate` | `Reactor.wz/<id:D7>.img` |
| Quest | `provider/quest/QuestInfo` (+ Act, Check) | `CQuestInfo` | `Quest.wz/{Act,Check,QuestInfo,Say}.img/<id>` |
| Character (avatar) | `provider/character/CharacterData` (+ AvatarData) | `CAvatar` / `CharacterStat` | `Character.wz/<cat>/<id:D8>.img` |

(Add to this table as subsystems get mapped.)

## Privacy rules (hard)

- Never print, quote, or commit absolute local file paths from `CLAUDE.local.md`
  (IDA_IDB, DISASM_*, V83_CLIENT_ROOT, etc.).
- Never write the private project name into the report, the docs, or the model.
- Never paste raw decompiled C++ blocks into committed files — paraphrase, extract
  field names + numeric constants.
- Kinoko upstream relative paths ARE public and fine to include.

## Verify before handing back

- The report covers both server-validated AND client-only fields, clearly
  flagged.
- Every collection node has its own sub-table (per-attack, per-skill, per-frame,
  per-foothold, per-portal, per-reward, …) — not just a one-line entry.
- Integer constants for any enumerated field are listed (moveAbility 0–4 style).
- File-path recommendations match the existing `src/<area>/`
  conventions (Character / Map / Net / UI / Render / Wz).
- After the parent thread implements: `npx vitest` + `tsc --noEmit` both pass;
  a sanity log on one known id dumps the parsed fields.
