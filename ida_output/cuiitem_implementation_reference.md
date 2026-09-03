# CUIItem — Full Implementation Reference

## Constructor (from AGENTS.md prior audit)
- Inherits CUIWnd
- `CUIWnd(this, 1, 5, 162, 6, 1, 0, 0)` — same as CUIEquip base
- Tab swap: `TAB_TO_INVTYPE = [1,2,4,3,5]` — visual tabs 0-4 map to server inv types
- `INVTYPE_TO_TAB` reverse mapping

## Extended Grid
- Normal: 4 cols × 6 rows = 24 slots
- Extended: 8 cols × 6 rows = 48 slots (2 blocks of 4)
- `FULL_COLS = 8` (not 16)
- Slot size: 32×32

## OnButtonClicked
- **0x7D2 (2000)**: Drop money
- **0x7D3 (2001)**: Gather items
- **0x7D4 (2002)**: Sort items
- **0x7D5/0x7D6 (2003/2004)**: Toggle extended/collapsed
- **0x7D7 (2005)**: Cash Shop

## Item Release Flow
- `setTryToReleaseItem(1, slot)` — enter release mode
- Click equip slot → `onItemRelease(usePos, equipPos)` callback
- `GameSender.ItemReleaseRequest(usePos, equipPos)` — opcode 0x61

## CashShop SubIds
- Equip→50200093, Use→50200094, Setup→50200095

## Arrange Button
- Single toggle: `SetArrangeButton` swaps between BtGather (state 0) and BtSort (state 1)
