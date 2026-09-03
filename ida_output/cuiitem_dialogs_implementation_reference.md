# CUIItemProtector / CUIItemUpgrade / CUIItemMaker — Implementation Reference

## CUIItemProtector
- Inherits CUniqueModeless (modeless dialog)
- Constructor: `(COutPacket, nProtectDay)` — takes pre-built packet + protection duration
- WZ: `UI/UIWindow2.img/ItemProtector/backgrnd`
- Has: `m_pBtCancel`, `m_pBtProtect`, `m_pSelectedItem`, `m_uiToolTip`, `m_oPacket`, `m_lm` (CLayoutMan)
- `PutItem(item, pos, ti)` — place item to protect (96 bytes)
- `Draw` — renders item + protect button (239 bytes)
- `OnCreate` — creates buttons and layout (360 bytes)

## CUIItemUpgrade
- Inherits CUniqueModeless
- Constructor: `(COutPacket, nType, nPOS)` — takes packet + upgrade type + position
- Has: `m_uiToolTip`, item slots, result display
- `PutItem(item, pos, ti)` — place item to upgrade (163 bytes)
- `ShowResult` — show upgrade result animation (191 bytes)
- `Update` — animation/update loop (233 bytes)
- `OnMouseMove` — tooltip on hover (207 bytes)

## CUIItemMaker
- Inherits CUIWnd
- `SetItemSlotRect` — compute recipe slot positions (263 bytes)
- `Clear(RECIPE_SLOT)` — clear a recipe slot (106 bytes)
- Has recipe slots for crafting system
- `OnCreate` — creates crafting UI with multiple item slots
- `Draw` — renders recipe grid and crafted item result
