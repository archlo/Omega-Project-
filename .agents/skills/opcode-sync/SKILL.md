---
name: opcode-sync
description: Use when the v95 opcode reference changes or `src/net/packet/OpCodes.ts` needs its InHeader/OutHeader enums regenerated or audited. Triggers on phrases like "sync opcodes", "regen opcodes", "OpCodes.ts is out of date", or after re-deriving opcodes from the v95 dump. The enums are pinned to the v95 reverse-engineering dump (`Maplestory95.exe_export_for_ai/generated/packet_handlers.json`), NOT to Kinoko.
---

# opcode-sync

`src/net/packet/OpCodes.ts` holds the `InHeader` (client→server) and
`OutHeader` (server→client) enums. Values are pinned to the v95
reverse-engineering dump, and `tests/net/packet/OpCodes.spec.ts` asserts every
named entry still matches it — so a "let me re-order this" PR can never
accidentally change a wire value.

## Reference source (the ground truth)

- `C:\Users\jorge\OneDrive\Desktop\Maplestory95.exe_export_for_ai\generated\packet_handlers.json`
  — the v95 packet handler dump (server→client `OutHeader` values).
- `C:\Users\jorge\OneDrive\Desktop\Maplestory95.exe_export_for_ai\generated\master_report.json`
  — cross-check companion.
- `src/net/packet/OpCodes.ts` header comment names the exact dump path the
  values are pinned against.

Our own server repo (`C:\Users\jorge\OneDrive\Desktop\server`) is a second
cross-check for which opcodes it emits/receives, but the **numeric values come
from the v95 dump**, not from the server or from Kinoko.

## How to regen

There is no generator tool (`tools/gen-opcodes` doesn't exist in this repo).
Regen is manual: read the named opcode from the dump JSON, then edit the enum
member in `src/net/packet/OpCodes.ts`. Keep numeric values in ascending groups
with the existing comments.

## Audit the diff

```powershell
git diff src/net/packet/OpCodes.ts
```

Look for:

- **Renames**: update the enum member; then fix any `GameSender` / handler
  call-sites that reference the old name.
- **Removed opcodes**: handler files in `src/net/handlers/` may now dispatch
  on a dead value. Search and remove.
- **Inserted opcodes**: if the underlying numeric value shifted, downstream
  switches don't break (we use named enum members), but a sanity check that
  the value matches the dump is wise.

## Verify

```powershell
tsc --noEmit
npx vitest tests/net/packet/OpCodes.spec.ts
```

`OpCodes.spec.ts` asserts the known pinned values; if a value changed in the
dump, update that test **in the same commit** as the enum change.

## Hand-off

If an opcode change forces a protocol flow rewrite, use `client-packet-author`
(C→S) / `server-packet-mirror` (S→C) to cascade the handler updates.
