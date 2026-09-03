# CUISendGift / CUISendGifts / CUIReceiveGift — Implementation Reference

## CUISendGift
- Inherits CDialog (modal)
- Constructor: `CDialog::CDialog(this)` + creates OK/Cancel buttons
- WZ: StringPool(0xC4E) — dialog background
- Has: `m_pBtOK`, `m_pBtCancel`, `m_pEditReceiver`, `m_pEditContent1`, `m_pEditContent2`, `m_sReceiver`, `m_sContent`, `m_pLayerMessage`
- `SetReceiver(name)` — set recipient name
- `GetResult(name, text)` — get dialog result (recipient + message)
- Used for cash shop gift sending

## CUISendGifts
- Inherits CUIWnd
- Gift list panel showing friends/guild members
- Has: `FRIEND` and `GUILD` nested structs
- `OnChildNotify` (74 bytes) — child control notifications
- `GetMemberIDFromPoint(rx, ry, pt, bGuild)` — hit test for member list (153 bytes)
- `SetScrollBar` — scroll through member list (245 bytes)
- `ZArray<FRIEND>` and `ZArray<GUILD>` — member arrays

## CUIReceiveGift
- Inherits CDialog (modal)
- Gift receive dialog
- Shows received gift info
- Has OK button to accept
