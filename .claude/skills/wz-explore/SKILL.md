---
name: wz-explore
description: Use when the user wants to see what nodes / fields / actions a WZ subsystem can contain, or which entries have a specific optional capability — phrases like "what nodes does X have", "which mobs have a `jump` node", "all possible nodes for a mob", "what action nodes can a mob have", "find every item with a `req` block", "show me every field under one mob", "what optional fields exist on a skill", "enumerate the WZ structure of Y". Drives the `nx-tools/nxtools.py` / `nx-tools/nxdump.mjs` CLI to surface the NX/WZ structure. Triggers ONLY for *read-only* exploration; for gap auditing against what the client reads use `wz-gap-audit`, for implementing missing capabilities use `wz-gap-implement`, for a full typed-model sweep use `wz-subsystem-research`.
---

# wz-explore

Quick, read-only WZ exploration. Answers questions like:

- "What action nodes can a mob have?"
- "Which mobs have a `jump` node?"
- "What does the `info` block of mob 100100 contain?"
- "Find every `skill\d+` node in the Empress Cygnus mob."

Backed by two tools in `nx-tools/`:

- `nxtools.py` — full-featured Python CLI (`ls` / `get` / `dump` / `shell` /
  `export` / `wz2nx`). Requires `pip install lz4 Pillow`.
- `nxdump.mjs` — dependency-free Node PKG4 reader that dumps a subtree as
  indented text (names, types, canvas dims). Prefer it when you want a quick
  plain-text tree and don't need the Python deps.

Data lives in `wz_client/` — every package has both `.nx` (PKG4) and `.wz`
(PKG1); **always read the `.nx` file**. Paths are slash-separated and may be
deep (e.g. `Mob.nx/100100.img/info/level`).

## When NOT to use

- Comparing WZ contents against what the client reads → `wz-gap-audit`.
- Implementing the discovered missing nodes → `wz-gap-implement`.
- Full sweep producing a typed model + docs/ page → `wz-subsystem-research`.
- Editing the WZ reader code itself (`src/wz/`) → `wz-reader`.
- Single-symbol disasm lookup → `ida-lookup`.

## Prerequisites

- Python: `pip install lz4 Pillow` (only needed for `nxtools.py`).
- `nxdump.mjs` needs nothing — just Node.
- No env vars required. The client uses `MAPLECLAUDE_WZ_DIR` /
  `MAPLECLAUDE_NX_DIR` to locate `wz_client/`, but this skill takes an
  explicit file path, so the default `wz_client/<Package>.nx` works.

## Commands

### `nxtools.py` (Python — rich output, JSON available)

```bash
python nx-tools/nxtools.py info <file>              # header stats
python nx-tools/nxtools.py ls <file.nx> [path]      # direct children + types + canvas dims
python nx-tools/nxtools.py get <file.nx> <path>     # one node's value (repr)
python nx-tools/nxtools.py dump <file.nx> [path]    # recursive tree (default depth 3)
python nx-tools/nxtools.py dump <file.nx> <path> --json   # recursive tree as JSON (depth 6)
python nx-tools/nxtools.py export <file.nx> <path> <out> # bitmap→PNG, audio→mp3
python nx-tools/nxtools.py shell <file.nx>          # interactive browser
```

| Command | Purpose | Typical use |
|---------|---------|-------------|
| `ls`    | Direct children + types + canvas dims | "What are the top-level nodes of mob 100100?" |
| `get`   | One node's value | "What is `info/level` for this mob?" |
| `dump`  | Recursive tree (with `--json`, includes primitive values) | "Give me every field of one mob's `info` block." |
| `shell` | Interactive browser with `tree` / `find <substr>` / `cd` / `get` | "Which mobs have `jump`?" / "Find every `skill\d+` node." |

`nxtools.py shell` supports: `ls [name]`, `cd <name|..>`, `get <name>`,
`tree [depth]`, `find <substr>`, `export <name> <file>`, `info`, `exit`.

### `nxdump.mjs` (Node — plain text)

```bash
node nx-tools/nxdump.mjs <file.nx> <path/with/slashes> [depth]
```

Example:

```bash
node nx-tools/nxdump.mjs wz_client/Mob.nx 0100100.img/info 3
```

(Entry ids are zero-padded to the subsystem's width — mobs to 7 digits:
`0100100.img`, items to 8: `1000000.img`. `ls` the root to see the padding.)

Emits indented lines like `level  [1] int=1` / `body  [5] bmp 150x200 (3)`.
The default depth is 3; pass a larger number for deep trees.

## Standard workflow

When the user asks "what does X have" or "which Y has Z", do this:

1. **Pick the right command.**
   - "what fields does ENTRY have" → `ls` or `dump --json`
   - "one field value" → `get`
   - "which entries have FIELD" → `nxtools.py shell` + `find <substr>`
     (or `dump` a subtree and scan the tree text)
   - "find every node matching PATTERN" → `find` in the shell, or
     `dump` the containing subtree and scan

2. **Run it via Bash.** `nxtools.py` reads the file directly — no build
   step, no dotnet chatter. Example:

   ```bash
   python nx-tools/nxtools.py ls wz_client/Mob.nx 0100100.img 2>$null
   python nx-tools/nxtools.py dump wz_client/Mob.nx 0100100.img/info --json 2>$null
   ```

   (On PowerShell use `2>$null`; on bash `2>/dev/null`.)

3. **Summarise the output for the user.** Show the *counts* and *interesting
   outliers*, not the raw blob. `ls` already shows child counts; `dump --json`
   gives the recursive shape with values. For "which entries have X", give the
   count and a short sample of matches.

4. **Cross-reference the server + the IDB sparingly.** This skill stops at
   "here's what the WZ has". If the user wants the *runtime semantics* of a
   discovered field, hand off to `ida-lookup` for the C++ usage, or grep our
   own server's loader at `C:\Users\jorge\OneDrive\Desktop\server\src\provider\<subsystem>\<X>Template.ts`
   (e.g. `mob/MobTemplate.ts`, `skill/SkillInfo.ts`, `item/ItemTemplate.ts`)
   for how the server validates the field.

## Output expectations

- Be terse. One paragraph + a small table beats a wall of JSON.
- Include the node count so the reader sees the denominator.
- For a subtree dump, surface 10–30 rows max; fold the long tail into a
  "+N more" line if needed.
- Quote the raw output only when the user explicitly wants it.

## Notes

- Both tools are read-only for exploration (`nxtools.py` `set`/`import`
  exist for deliberate edits — don't use them for exploration). Safe to
  invoke without user confirmation.
- `nxtools.py` path matching is case-sensitive; `find` in the shell matches
  case-insensitively on node names.
- For one-off node lookups that don't need cross-entry stats, use `ls` /
  `get` / `nxdump.mjs` rather than a full `dump` to keep wall-clock time low.
