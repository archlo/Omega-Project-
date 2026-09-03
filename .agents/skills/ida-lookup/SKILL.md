---
name: ida-lookup
description: Use when the user wants a single v95 client class, function, struct, or constant looked up — phrases like "look into the IDB", "look into the IDB for X", "reference the IDB", "look up CXxx", "look in the idb", "check the IDB for", "investigate it with the idb", "look into how the v95 client does X", "look into the proper IDB implementation", "find the function that does Y", "decompile CUI[X]", "the IDB for the proper [Y]", or anywhere the user implies "go ask the IDA database what the real client does here". Drives the live `ida-pro/idalib` MCP via `idb-bind`, runs the standard `ida_list_functions` → `ida_decompile_function` → `ida_get_xrefs_*` recipe, and surfaces a paraphrased answer with translated constants / coordinates / formulas — never the .i64 path, never raw decompiled C++ blocks pasted into committed files. Triggers ONLY for single-symbol queries; NOT for full WZ subsystem sweeps (use `wz-subsystem-research`) and NOT for full UI screen rebuilds (use `authentic-ui-rebuild`, which itself calls into this skill).
---

# ida-lookup

The workhorse skill for "look it up in the IDB". The live IDA database exposed via the
`ida-pro/idalib` MCP server is the authoritative source for the original v95 client's
behavior — demangled C++ names, on-demand decompilation, StringPool resolution, struct
offsets, xrefs. Most user prompts in this project reach for it.

This skill owns the **single-symbol query** path. Two adjacent skills handle the broader cases:

- `wz-subsystem-research` — full subsystem sweep (20+ fields across an entire WZ subsystem).
- `authentic-ui-rebuild` — full UI screen reconstruction; that skill calls into this one for
  each `CUI*` class it needs.

## Procedure

### 1. Ensure the MCP session is live

Delegate to the `idb-bind` skill. It handles:

- MCP-disconnected (server not running) — asks the user to restart it.
- Database-locked (GUI / other idalib session holds the `.i64`) — background-waits, or
  copies to a temp file as fallback.
- Alignment check — verifies `ida_decompile_function 0x602140 → CUIChannelSelect::GetRect` (the canonical
  alignment anchor for v95).

Never hard-code the `.i64` path; `idb-bind` reads it from `CLAUDE.local.md`.

### 2. Resolve the symbol

Match the resolver to the kind of lookup:

| You have | Use |
| --- | --- |
| A class/function name (e.g. `CUIStat::Draw`) | `ida_list_functions` with a filter, or `ida_decompile_function` by name |
| A name prefix (e.g. `CMob::`, `CDrop`) | `ida_list_functions` with `filter_pattern` (regex prefix) |
| A string literal it touches (e.g. `"moveAbility"`, a StringPool key) | `ida_find_code_by_string` (string → caller), or `ida_get_strings` |
| A struct shape | `ida_list_structures` / `ida_get_structure` |
| An address you already know | `ida_decompile_function <addr>` directly |
| "Who calls X" | `ida_get_xrefs_to <addr>` |
| "What does X call" | `ida_get_xrefs_from <addr>` |

For unknown areas, `ida_get_database_info` at session start can be a useful map.

### 3. Decompile + read

- `ida_decompile_function <addr>` for the function body.
- For long functions, `ida_disassemble_function <addr>` first to scope; then decompile
  only the relevant part (saves tokens).
- For loops over WZ keys, the literal string constants in the decompile output ARE the WZ
  key list — extract them.
- For state machines, follow the `switch (state)` constants and pair them with the relevant
  enum.
- For many independent lookups, batch them with `ida_batch`.

### 4. Surface the answer — paraphrased

The output the user sees must be **conceptual + translated values**, never raw C++ blocks
pasted into committed files. Acceptable forms:

- "`CUIChannelSelect::GetRect` lays out the channel grid as `left = 66 * (idx % 5) + 23`,
  `top = 28 * (idx / 5) + 17`. Width 66, height 28."
- "`CMob::OnDead` plays the `die1` action, then schedules removal after `removeAfter` ms
  (default 0 = immediate)."
- "WZ keys read by `CSkillInfo::LoadFromXml`: `time`, `mpCon`, `hpCon`, `damage`,
  `mastery`, `range`, `cooltime`, `prop`, …"

NOT acceptable in committed files / PR bodies / commit messages:

- Verbatim C++ decompile blocks.
- The `.i64` filename or any path fragment from `CLAUDE.local.md`.
- Function addresses if they would let someone re-derive the binary identity (a rough
  address as a stale anchor for future re-derivation is OK in chat; not in committed code).
- Any private-project token documented in `pr-privacy-guard.local` (it owns the
  authoritative list; consult that skill instead of duplicating it here).

### 5. Verify alignment before the user acts

If the user is about to edit code based on a numeric value from the lookup (a coordinate, a
formula constant, an opcode), re-run the alignment anchor:

```
ida_decompile_function 0x602140 → CUIChannelSelect::GetRect with left = 66 * (nIdx % 5) + 23
```

If alignment is off, the addresses have shifted — re-derive the target by NAME via
`ida_list_functions`, not by hard-coded address.

## Common v95 class naming cheat-sheet

The IDB has demangled C++ names. Common prefixes the user references:

| Prefix | What it is | Examples |
| --- | --- | --- |
| `CUI*` | UI screens / dialogs | `CUIStat`, `CUIChannelSelect`, `CUIUserInfo`, `CUIChat`, `CUIGameMenu`, `CUIQuestInfo`, `CUISkill`, `CUIChannelShift`, `CUISysOpt`, `CUITombstone`, `CUIRevive`, `CUIUserList` |
| `CField`, `CFieldMan` | Current map runtime + global field manager | scrolling, foothold lookup, BGM swap |
| `CMob*` | Monster runtime + template | `CMob`, `CMobPool`, `CMobTemplate`, `CMobSoundMan` |
| `CNpc*` | NPC runtime + template + dialog | `CNpc`, `CNpcPool`, `CNpcTemplate`, `CNpcLook`, `CUtilDlgEx` |
| `CDrop*` | Ground drops | `CDropPool`, `CDrop` |
| `CUserLocal`, `CUserRemote` | Local and remote player avatars | input, network, hit/die, emotion |
| `CAvatar*` | Avatar rendering | `CAvatar`, `CAvatarLook`, `CCharLook` |
| `COutPacket`, `CInPacket` | Packet I/O | encode/decode buffers |
| `CSkillInfo`, `CSkillMan` | Skill data + skill state | per-character skill levels, cast info |
| `CQuestInfo`, `CQuestMan` | Quest data + active record | available / in-progress / complete |
| `CWvsContext` | Singleton global game state | login → world → channel → field |
| `CFuncKey*` | Key configuration | `CFuncKey`, `CFuncKeyManager` |

Use this as a fast guess for `ida_list_functions` / `ida_list_names` prefix queries.

## Privacy rules (hard)

- Never print the `.i64` path or any `CLAUDE.local.md` path fragment.
- Never include any of the private-reference tokens enumerated in
  `pr-privacy-guard.local` (it owns the authoritative forbidden-token list) in chat
  output the user might paste to GitHub.
- Never paste raw decompiled C++ verbatim into a committed file. Translated values
  (numbers, formulas, WZ key lists, enum constants) are fine.
- The `Kinoko upstream` repo at `https://github.com/iw2d/kinoko` IS public — relative paths
  inside it are fine to reference in committed text.

## When the IDB is unreachable

If `idb-bind` returns "MCP disconnected" and the user cannot restart the server right now,
fall back to `disasm-lookup` (static text dumps) and clearly flag the answer as
lower-fidelity. Static dumps lack demangled names and don't update with new analysis.

## Verification

Before returning a value the user will commit:

1. Alignment anchor passed (`CUIChannelSelect::GetRect` decompile matches).
2. The reported numeric values appear in the decompiled output (don't paraphrase numbers
   you didn't see).
3. The paraphrased answer doesn't leak any forbidden token.

## Related skills

- `idb-bind` — owns the MCP / database binding mechanics; this skill assumes it.
- `disasm-lookup` — fallback to static text dumps when the live IDB is unavailable.
- `wz-subsystem-research` — for full subsystem sweeps (20+ fields).
- `authentic-ui-rebuild` — for full UI screen rebuilds; calls into this skill per `CUI*`.
- `pr-privacy-guard.local` — the canonical forbidden-token list.
