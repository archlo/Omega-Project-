# CUIGameMenu Full Audit — IDA Decompilation Findings

Generated: 2026-07-11

## Class Structure

**CUIGameMenu** inherits CUIWnd. Singleton via `TSingleton<CUIGameMenu>`.

### Constructor (0x7eeb40)
- Standard CUIWnd initialization

### OnCreate (0x7eed60)
Creates 6 menu buttons with 25px vertical spacing:

| Index | nId | WZ Path | Position | Action |
|-------|-----|---------|----------|--------|
| 0 | 1000 | `UI/StatusBar2.img/mainBar/System/BtChannel` | (8, 20) | Channel change |
| 1 | 1001 | `UI/StatusBar2.img/mainBar/System/BtKeySetting` | (8, 45) | Key settings |
| 2 | 1002 | `UI/StatusBar2.img/mainBar/System/BtGameOption` | (8, 70) | Game options |
| 3 | 1003 | `UI/StatusBar2.img/mainBar/System/BtSystemOption` | (8, 95) | System options |
| 4 | 1004 | StringPool(0x180C) | (8, 120) | Unknown (StringPool) |
| 5 | 1005 | `UI/StatusBar2.img/mainBar/System/BtGameQuit` | (8, 145) | Game quit |

State:
- `m_bSelValid = 1` (selection enabled)
- `m_nCurSel = 0` (current selection index)
- `m_nResult = -1` (no result yet)
- Fade-in: alpha set to 255 via `IWzVector2D::RelMove`

### OnButtonClicked (0x7ee380)
- **nId 1000-1005**: Sets `m_nResult = nId - 1000` (0-5) and `SetRet(1)` (OK)
- **nId 1**: `SetRet(1)` — OK
- **nId 2**: `SetRet(2)` — Cancel
- **nId 8**: `SetRet(8)` — Special return

### Other Methods
- `OnKey` (0x7ee660, 0x148) — keyboard navigation
- `OnChildNotify` (0x7ee7b0, 0x57) — child control notifications
- `HitTest` (0x7ee440, 0x5) — hit test (simple)
- `ResetButtonState` (0x7ee510, 0x41) — reset button hover states

## Key Findings for Implementation

1. **Menu items**: 6 buttons, 25px spacing, all under `UI/StatusBar2.img/mainBar/System/`
2. **Button IDs**: 1000-1005 map directly to menu indices 0-5
3. **Result system**: `m_nResult` holds the selected menu item (0-5), `SetRet` signals completion
4. **Fade-in**: Alpha animation on open
5. **StringPool(0x180C)**: Used for one button (likely "Alliance" or similar — needs StringPool lookup)
