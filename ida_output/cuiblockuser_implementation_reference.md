# CUIBlockUser — Full Implementation Reference

## Constructor
- Inherits CDialog (modal dialog)
- `CDialog::CDialog(this)`
- Has: `m_pBtOK`, `m_pBtCancel`, `m_pEditInput`, `m_uiToolTip`

## OnCreate (0x96f300) — 3166 bytes
- Creates block/unblock dialog
- Loads WZ: `UI/UIWindow2.img/BlockUser/backgrnd`
- Creates edit input for character name
- Creates OK/Cancel buttons

## OnButtonClicked (0x978d50)
- **nId=1000**: Block — `SetResult()` + `SetRet(1)`
- **nId=1001-1002**: Cancel — `SetRet(2)`
- **nId=1**: OK — `SetRet(1)`
- **nId=2**: Cancel — `SetRet(2)`
- **nId=8**: Special — `SetRet(8)`

## SetResult (0x970150)
- Reads character name from edit control
- Processes block/unblock result

## Draw (0x96ff40) — 522 bytes
- Renders dialog with input field and buttons

## Key Fields
- `m_pBtOK`, `m_pBtCancel` — dialog buttons
- `m_pEditInput` — character name input
- `m_uiToolTip` — tooltip
