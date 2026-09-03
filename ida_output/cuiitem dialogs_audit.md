# CUIItemProtector / CUIItemUpgrade / CUIItemMaker Audit

Generated: 2026-07-11

## CUIItemProtector
- Inherits CUniqueModeless (modeless dialog)
- Constructor: Takes `COutPacket` + `nProtectDay`
- WZ: `UI/UIWindow2.img/ItemProtector/backgrnd`
- Has: `m_pBtCancel`, `m_pBtProtect`, `m_pSelectedItem`, `m_uiToolTip`, `m_oPacket`
- `PutItem(item)` — place item to protect
- `Draw` — renders item + protect button

## CUIItemUpgrade
- Inherits CUniqueModeless
- Constructor: Takes `COutPacket` + `nType` + `nPOS`
- Has: `m_uiToolTip`, item slots
- `PutItem(item)` — place item to upgrade
- `ShowResult` — show upgrade result
- `Update` — animation/update loop

## CUIItemMaker
- Inherits CUIWnd
- `SetItemSlotRect` — compute recipe slot positions
- `Clear(RECIPE_SLOT)` — clear a recipe slot
- Has recipe slots for crafting system
