# CUIEnchantDlg / CUIKarmaDlg / CUIUnreleaseDlg — Implementation Reference

## CUIEnchantDlg (Potential Scroll)
- Inherits CUniqueModeless (modeless dialog)
- `PutItem(item, pos, ti)` — place item to enchant
- Uses opcode for potential scroll system
- Has item slot, scroll slot, result display

## CUIKarmaDlg (Karma Scissors)
- Inherits CUniqueModeless
- Constructor takes `COutPacket` — pre-built packet
- `PutItem(item, pos, ti)` — place item to remove karma
- WZ: `UI/UIWindow2.img/KarmaDlg/backgrnd`
- Has: `m_pSelectedItem`, `m_uiToolTip`
- Button sends pre-built packet on confirm

## CUIUnreleaseDlg (Item Unrelease)
- Inherits CUniqueModeless
- `PutItem(item, pos, ti)` — place item to un-release
- WZ: `UI/UIWindow2.img/UnreleaseDlg/backgrnd`
- Has: `m_pSelectedItem`, `m_uiToolTip`
- Reverses item release (returns scrolls to normal state)
