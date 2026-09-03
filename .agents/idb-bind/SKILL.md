---
name: idb-bind
description: Use when you need the v95 IDA database (the ida-pro/idalib MCP) to decompile/look up an original-client function but it may be unavailable — busy/locked by another IDA GUI or idalib session, or the MCP server is disconnected. Binds the database, or waits in the background until it frees and then continues. Owns the canonical procedure for binding the locked .i64 (free check, background wait, copy-to-temp fallback, alignment verification). Never prints or commits the local .i64 path.
---

# idb-bind

The authoritative v95 client reverse-engineering source is the live IDA Pro
database exposed through the `ida-pro/idalib` MCP server. It has demangled names
(`CUIStat::Draw`), StringPool resolution, struct offsets, and on-demand
decompilation — strictly higher fidelity than the static text dumps that
[disasm-lookup] reads.

Two distinct things can stop you from using it. Diagnose which one before acting:

1. **MCP server disconnected** — the `ida_*` tools are not
   present at all (a tool search for `ida_decompile_function` returns no match). This is an MCP
   *connection*, not a file lock. You cannot fix it from a tool — ask the user
   to (re)start the `ida-pro/idalib` MCP server, then retry. The watcher below does
   **not** help here.
2. **Database busy / locked** — the tools exist but `ida_open_database` fails with
   "Failed to open database" because the IDA GUI or another idalib session holds an
   exclusive lock on the `.i64`. This is what the watcher and copy-to-temp trick
   are for.

## The path (never commit it)

The `.i64` path lives in the gitignored `CLAUDE.local.md` as `IDA_IDB`. Read it
from there at runtime and pass it as an argument. Never hard-code it in a committed
file, and never print it into a PR/commit/issue. Translated values (coordinates,
offsets, formulas) may land in committed TS; the path and filenames may not.

## Procedure

1. **Confirm the MCP is connected.** `ida_open_database` / `ida_list_databases` must
   respond. If they return a connection error → failure mode 1: tell the user to restart
   the idalib MCP server and stop here.

2. **Check the lock.** Run the watcher (path from `CLAUDE.local.md`):
   ```powershell
   & ".claude/skills/idb-bind/idb-watch.ps1" -Path "<IDA_IDB>" -Mode Check
   ```
   `IDB_STATUS=FREE` (exit 0) → go to step 4. `IDB_STATUS=LOCKED` (exit 2) → step 3.

3. **Wait in the background until it frees, then get re-invoked.** Launch the
   watcher in Wait mode as a background Bash job (`run_in_background: true`); the
   harness re-invokes you when it exits, so keep working on other tasks meanwhile —
   do not poll:
   ```powershell
   & ".claude/skills/idb-bind/idb-watch.ps1" -Path "<IDA_IDB>" -Mode Wait -IntervalSeconds 20
   ```
   It exits 0 (`IDB_STATUS=FREE`) the moment the other session releases the file.
   (`-TimeoutSeconds N` to bound the wait; 0 = forever.)

4. **Bind.** Prefer opening the real database when it is free:
   ```
   ida_open_database(file_path="<IDA_IDB>", database_id="v95", run_auto_analysis=false)
   ```
   then `ida_wait_for_analysis(database="v95")`. If it must run while the GUI still holds
   a *shared* (read-only) lock, fall back to the copy-to-temp trick — copy the `.i64` to
   `$env:TEMP\v95_<purpose>.i64` and open the copy (the legacy `.idb` will not load in
   idalib 9.x; always use `.i64`).

5. **Verify alignment before trusting any address.** `ida_decompile_function 0x602140` must
   show `result->left = 66 * (nIdx % 5) + 23` (`CUIChannelSelect::GetRect`). If it does
   not, the addresses are stale — re-derive symbols by name via `ida_list_functions` /
   `ida_list_names` rather than by hard-coded address.

6. **When done**, leave the session open for follow-ups, or `ida_close_database(database="v95")`
   if you started it solely for a one-off lookup and the user may want the GUI back.

## Privacy

Same rules as [disasm-lookup]: never paste the `.i64` path, filenames, or any
private project name into committed files, PR bodies, commits, or issues. Run
`git diff` before committing and abort if any path fragment appears.

## Known follow-ups that need this skill

- **Stat detail window** (`src/ui/game/StatDetailInfo.ts`): the live IDB dropped mid-port, so
  the detail rows are best-effort. Revisit `CUIStatDetail::Draw` (≈`0x8625f0`) for
  the exact DrawText (x,y) per row and `CUIStatDetail::GetCriticalProp`
  (≈`0x861bf0`) for the crit formula. See [[stat-window-cuistat]].
