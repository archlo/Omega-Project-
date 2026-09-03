# CUISysOpt Full Audit — IDA Decompilation Findings

Generated: 2026-07-11

## Class Structure

**CUISysOpt** inherits CUIWnd. Singleton via `TSingleton<CUISysOpt>`.

### OnChildNotify (0x969820)
Control routing via `nId` and `param1`:

**param1=200 (CheckBox toggle)**:
| nId | Control | Action |
|-----|---------|--------|
| 0x3F2 (1010) | m_pCBScreen800 | Set checked=1, m_pCBScreen1024=0 |
| 0x3F3 (1011) | m_pCBScreen1024 | Set checked=1, m_pCBScreen800=0 |
| 0x3F5 (1013) | m_pCBFullScreen | Set checked=1, m_pCBWindowed=0 |
| 0x3F6 (1014) | m_pCBWindowed | Set checked=1, m_pCBFullScreen=0 |
| 0x3F7 (1015) | m_pCBMinimapNormalMode | Set checked=1, m_pCBMinimapSimpleMode=0 |
| 0x3F8 (1016) | m_pCBMinimapSimpleMode | Set checked=1, m_pCBMinimapNormalMode=0 |

**param1=600 (ComboBox select)**:
- nId=1005: `m_sysOptCur.nSysOpt_ScreenShot = m_pCBScreenShot->m_nSelect`
- nId=1012: `m_sysOptCur.nSysOpt_MobInfo = m_pCBMobInfo->m_nSelect`

**param1=700**: Calls `GetSysOptFromCtrl`
**param1=100**: Routes to `OnButtonClicked(nId)`

Always calls `CConfig::ApplySysOpt(&m_sysOptCur, 0)` after any change.

### Key Methods
- `OnCreate` (0x978010, 0xcf5) — creates all controls
- `SetCtrlFromSysOpt` (0x969150, 0x146) — loads settings into controls
- `GetSysOptFromCtrl` (0x9692a0, 0xd3) — reads controls into settings
- `SetRet` (0x969980, 0x74) — set dialog result
- `HitTest` (0x968760, 0x31) — hit test

## Control IDs (from OnChildNotify)
- 1010 (0x3F2): Screen 800 checkbox
- 1011 (0x3F3): Screen 1024 checkbox
- 1013 (0x3F5): Fullscreen checkbox
- 1014 (0x3F6): Windowed checkbox
- 1015 (0x3F7): Minimap normal mode checkbox
- 1016 (0x3F8): Minimap simple mode checkbox
- 1005: Screenshot combo box
- 1012: Mob info combo box
- 1000-1004, 1006-1011, 1013-1020: Various other settings (from OnCreate)

## Key Findings for Implementation

1. **Resolution toggle**: 800×600 vs 1024×768 (mutually exclusive checkboxes)
2. **Display mode**: Fullscreen vs Windowed (mutually exclusive)
3. **Minimap mode**: Normal vs Simple (mutually exclusive)
4. **Settings applied live**: `CConfig::ApplySysOpt` called on every change
5. **Settings structure**: `m_sysOptCur` holds all current settings
