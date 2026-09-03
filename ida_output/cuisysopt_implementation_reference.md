# CUISysOpt — Full Implementation Reference

## OnChildNotify (0x969820) — Control Routing

**param1=200 (CheckBox toggle):**
| nId | Control | Action |
|-----|---------|--------|
| 0x3F2 (1010) | m_pCBScreen800 | checked=1, m_pCBScreen1024=0 |
| 0x3F3 (1011) | m_pCBScreen1024 | checked=1, m_pCBScreen800=0 |
| 0x3F5 (1013) | m_pCBFullScreen | checked=1, m_pCBWindowed=0 |
| 0x3F6 (1014) | m_pCBWindowed | checked=1, m_pCBFullScreen=0 |
| 0x3F7 (1015) | m_pCBMinimapNormalMode | checked=1, m_pCBMinimapSimpleMode=0 |
| 0x3F8 (1016) | m_pCBMinimapSimpleMode | checked=1, m_pCBMinimapNormalMode=0 |

**param1=600 (ComboBox select):**
- nId=1005: `m_sysOptCur.nSysOpt_ScreenShot = m_pCBScreenShot->m_nSelect`
- nId=1012: `m_sysOptCur.nSysOpt_MobInfo = m_pCBMobInfo->m_nSelect`

**param1=700**: `GetSysOptFromCtrl()`
**param1=100**: Routes to `OnButtonClicked(nId)`

Always: `CConfig::ApplySysOpt(&m_sysOptCur, 0)`

## Control IDs
- 1010: Screen 800 checkbox
- 1011: Screen 1024 checkbox
- 1013: Fullscreen checkbox
- 1014: Windowed checkbox
- 1015: Minimap normal mode checkbox
- 1016: Minimap simple mode checkbox
- 1005: Screenshot combo box
- 1012: Mob info combo box
