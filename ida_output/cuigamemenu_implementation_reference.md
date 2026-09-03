# CUIGameMenu — Full Implementation Reference

## OnCreate (0x7eed60) — Menu Button Layout
6 buttons at 25px vertical spacing:

| Index | nId | WZ Path | Y Position | Action |
|-------|-----|---------|------------|--------|
| 0 | 1000 | `UI/StatusBar2.img/mainBar/System/BtChannel` | 20 | Channel change |
| 1 | 1001 | `UI/StatusBar2.img/mainBar/System/BtKeySetting` | 45 | Key settings |
| 2 | 1002 | `UI/StatusBar2.img/mainBar/System/BtGameOption` | 70 | Game options |
| 3 | 1003 | `UI/StatusBar2.img/mainBar/System/BtSystemOption` | 95 | System options |
| 4 | 1004 | StringPool(0x180C) | 120 | Alliance/special |
| 5 | 1005 | `UI/StatusBar2.img/mainBar/System/BtGameQuit` | 145 | Game quit |

All buttons: `CreateCtrl_2(pBtMenu, this, nId, 8, y, 0, &paramButton)`

## OnButtonClicked (0x7ee380)
- **nId 1000-1005**: `m_nResult = nId - 1000` (0-5) + `SetRet(1)` (OK)
- **nId 1**: `SetRet(1)` — OK
- **nId 2**: `SetRet(2)` — Cancel
- **nId 8**: `SetRet(8)` — Special return

## State
- `m_bSelValid = 1` — selection enabled
- `m_nCurSel = 0` — current selection index
- `m_nResult = -1` — no result yet
- Fade-in: alpha set to 255 via `IWzVector2D::RelMove`

## Key Methods
- `OnKey` (0x7ee660) — keyboard navigation (up/down arrows)
- `OnChildNotify` (0x7ee7b0) — child control notifications
- `HitTest` (0x7ee440) — hit test
- `ResetButtonState` (0x7ee510) — reset button hover states
