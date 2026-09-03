# StringPool Audit

## IDA-confirmed behavior

The v95 client has an embedded StringPool table with 6883 entries. It exposes:

- `StringPool::GetString(id)` for narrow strings.
- `StringPool::GetStringW(id)` for wide strings.
- `StringPool::GetBSTR(id)` for WZ/resource paths.

The client decodes strings from embedded `ms_aString` and `ms_aKey` tables using a per-entry seed and rotated XOR key. `NoSound.img` is an external WZ/toolchain representation, not the required source for the original client.

The TypeScript resolver supports both sources:

1. External `NoSound.img` when exposed by a WZ package.
2. IDA-extracted v95 tooltip strings as the embedded-table fallback.

## Currently wired

- Equip tooltip labels and stat strings.
- Bundle, pet, ring, and skill tooltip strings.
- Set-effect headers and skill-bonus strings.
- Item-option, limit, expiry, and date strings.
- Master-level and skill-special strings.
- `%d`, `%s`, `%f`, `%u`, and `%%` formatting.
- Verified tooltip canvas and WZ resource paths.

Main files:

- `src/localization/StringPoolService.ts`
- `src/localization/StringPoolIds.ts`
- `src/ui/game/ItemTooltip.ts`
- `src/ui/game/ToolTip.ts`

## Remaining integrations

### Packet notices

- `GameStage.ts:2989`: marriage result codes still drop canned StringPool notices.
- `PacketArgs.ts:211+`: several result-code messages remain comments/placeholders.

### Pet dismissal messages

`GameStage.ts:6148` still needs StringPool IDs:

- `0x18C`: pet released.
- `0x18D`: pet ran away.
- `0x18E`: pet dismissed.
- `0x18A9`: pet summoned by another character.

### Map help messages

`GameStage.ts:4854` tracks help-message count but does not resolve `MapString/help/0`, `help/1`, and related entries.

### Boss pet crown/resource path

`CharInfo.ts:669-676` still uses a fallback for the BSTR resource path referenced by StringPool `0x125B`.

### Keyboard display names

`GameStage.ts:4453-4477` manually maps virtual-key names instead of using the original StringPool display strings.

### NPC phrases

`NpcLook.ts:13`, `137`, and `166` still use hardcoded/common phrases for StringPool IDs `0x1A2F-0x1A36`.

### Battle-record dialogs

`BattleRecord.ts:193` still needs the OG confirmation text referenced by StringPool `0x1900`.

### General UI notices

Additional StringPool integrations remain for:

- Trade errors.
- Inventory and item-use failures.
- Marriage messages.
- Channel/world migration notices.
- Quest and NPC messages.
- Other converted UI windows that still use English literals.

### BSTR resource paths

`GetBSTR()` is also used for indirect WZ paths. Remaining resource-path work includes item/effect, pet/death, map, NPC, and other subsystem-specific paths not yet routed through the shared resolver.

## Recommended order

1. Packet result notices.
2. Map help/tutorial messages.
3. Pet dismissal and marriage messages.
4. Boss-pet and other BSTR resource paths.
5. NPC and battle-record strings.
6. Remaining UI-window literals.

## Verification

- `npx tsc --noEmit` passes.
- Full test suite passes: 158 files, 1354 tests.
