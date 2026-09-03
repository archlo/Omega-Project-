# Project rules — TS MapleStory v95 client reimplementation

This project reimplements the v95 MapleStory client in TypeScript/PixiJS,
reverse-engineered from `Maplestory95.exe.i64` (IDA Pro database) against
the real game data in `wz_client/`. The rules below govern the
self-directed audit (`IDA_INDEX.md` sweep → `TODO_AUDIT.md` findings) and
the implementation work that follows it. They were established during the
audit/implementation sessions and apply to all future work in this repo.

## Investigation

- **Trace to the real root cause, never stop at a surface-level decompile.**
  Use `idautils.CodeRefsTo`/xrefs to find actual callers/triggers before
  scoping a fix. Verify claims against the decompile or the real WZ data —
  don't trust a class/method name to mean what it sounds like (the
  "`CUIVegaResultPopup` lesson": it sounded like a direct opcode handler,
  but its only callers were inside an unrelated window's own `Draw`).
- **Don't skip any item, regardless of size.** Every `IDA_INDEX.md` batch
  entry gets a written finding before being checked off — including
  compiler-generated/native-looking entries (`_dynamic_initializer_for_*`,
  `Ztl_*`, `Z*`-prefixed STL/COM wrappers). A one-sentence
  confirmed-moot/confirmed-covered/confirmed-gap note is enough for
  genuinely trivial entries, but it must exist.
- **The same no-skip discipline applies to *implementing*, not just
  finding.** Don't wave off a finding as "too big, leave it as a TODO"
  without first decompiling the real trigger/sender/wire-shape and
  checking WZ presence. Several findings that looked large at a glance
  (`CSetGuildMarkDlg`, `CMessageBoxPool`, `CField_Massacre`,
  chair/sitting) turned out fully shippable once given real decompile
  rigor instead of being assumed too big.
- **When hunting for a WZ asset path** (property, canvas/sprite, vector,
  layer), trace the `bstr`/`Ztl_bstr_t` argument into the
  `IWzResMan::GetObjectA`/`PcCreateObject<...>` call — that's the single
  chokepoint nearly every WZ load goes through. If the argument is a
  literal `_bstr_t::_bstr_t(...)`, the path is fully recoverable. If it's
  `StringPool::GetBSTR(id)`, the *path itself* is indirected — but that's
  the OG binary's own resolution convention, not a constraint on this
  client (which loads packages by literal name already). Cross-check
  against the real WZ data directly before concluding something is
  unrecoverable (see the `CTips` correction: assumed StringPool-blocked
  from the decompile alone, corrected after opening `Etc/Tips.img`
  directly and finding the actual content fully literal).
- **Always load `.nx` files, never raw `.wz`.** `wz_client/` has both per
  package; `.nx` is the already-decrypted/converted format this client's
  own `WzPackage.OpenBase` prefers.
- **Verify WZ presence before scoping "too big" or "not yet checked"
  findings.** Open the real package with this client's own `WzPackage`
  reader and check literal key names/values (e.g. `info/fieldType`,
  `seat`, `speak`) rather than guessing from the class name or relying on
  the OG's own (possibly StringPool-blocked) path-resolution logic.

## Implementation

- **A feature with zero `src/` presence gets a new file**, not bolted
  onto an unrelated existing one.
- **Ship the verified-portable subset; document what's deliberately
  skipped — don't guess.** When part of a feature depends on
  unrecoverable data (StringPool text, an unconfirmed enum mapping), ship
  the part that's confirmed and explicitly note what's deferred and why.
- **Whole-system absences AND deliberately-reduced partial scopes both
  need an explicit "TODO, not implemented" note**, with whatever real
  spec was already extracted (other case values, the blocking
  dependency, etc.) — not folded silently into the writeup for the part
  that *did* ship. Each unimplemented piece should be easy to find and
  act on later without re-deriving it from scratch.

## Verification

- **Run `tsc --noEmit` after every edit to `src/`, no matter how small**
  (a one-line enum addition counts). Run the full `vitest` suite too
  whenever `src/` or `tests/` actually changed.
- **Skip the test run only for pure documentation passes** — when only
  `TODO_AUDIT.md`/`STATUS.md`/`IDA_INDEX.md` changed and no code/test
  file did.

## Documentation

- **Every audit-driven code fix gets an inline comment** naming the
  `TODO_AUDIT.md` pass it came from (e.g. `// TODO_AUDIT.md Eighty-first
  pass: ...`), not just a log entry in the audit file.
- **`TODO_AUDIT.md` is append-to-top** (newest pass first). Corrections to
  an earlier pass's finding are inserted in place under that finding, not
  re-stated at the top, so the history of "what we believed and why it
  changed" stays attached to the original claim.
- **`STATUS.md`** gets a short bullet for every shipped fix, cross-referencing
  the `TODO_AUDIT.md` pass.
