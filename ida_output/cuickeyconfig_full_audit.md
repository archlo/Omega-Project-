# CUIKeyConfig Full Audit — IDA Decompilation Findings

Generated: 2026-07-11

## Class Structure

**CUIKeyConfig** inherits CUIWnd. Singleton via `TSingleton<CUIKeyConfig>`.

### Constructor (0x7d9700)
- Creates with standard CUIWnd init
- Initializes key mapping state

### OnCreate (0x7dc5d0)
- `CLayoutMan::Init(&m_lm, this, 0, 0)`
- `CUIWnd::OnCreate(this, pData)` (base)
- Creates 5 buttons via `CLayoutMan::AddButton`:
  - `UI/UIWindow2.img/KeyConfig/BtOK` — nId=1 (OK, saves + closes)
  - `UI/UIWindow2.img/KeyConfig/BtCancel` — nId=2 (Cancel, closes)
  - `UI/UIWindow2.img/KeyConfig/BtDefault` — nId=0x7D0 (2000, default mapping)
  - `UI/UIWindow2.img/KeyConfig/BtDelete` — nId=0x7D1 (2001, clear all)
  - `UI/UIWindow2.img/KeyConfig/BtQuickSlot` — nId=0x7D2 (2002, quickslot config)
- Loads `StringPool(0x50E)` as `m_pImgFontNumber` — image font for key slot numbers
- Creates key icon layers for each function key slot
- Calls `CalcKeyIconPosInfo` to compute key positions

### OnButtonClicked (0x7ddd90)
- **1 (OK)**: `CFuncKeyMappedMan::SaveFuncKeyMap` + `CQuickslotKeyMappedMan::SaveQuickslotKeyMap` + `UI_Close(5)`
- **2 (Cancel)**: `InvalidateRect(StatusBar)` + `UI_Close(5)`
- **0x7D0 (2000, Default)**: Confirm dialog → `DefaultFuncKeyMap` + `DefaultQuickslotKeyMap` + `ReDrawQuickslot`
- **0x7D1 (2001, Delete)**: Confirm dialog → `memset(0)` clear all + `ResetPaletteItems` + invalidate
- **0x7D2 (2002, QuickSlot)**: `OnQuickslotKeyConf`

### Key Methods
- `CalcKeyIconPosInfo` (0x7d83d0, 0x6d1) — computes key icon positions
- `DrawKeys` (0x7da030, 0x4b0) — renders keyboard keys
- `DrawFuncKeyMapped` (0x7da4e0, 0xe24) — renders mapped function keys
- `DrawKeyPalette` (0x7d99f0, 0x635) — renders key palette
- `TryBeginDragFuncKeyMappedIcon` (0x7db310, 0xf6c) — drag start for key remapping
- `HitTest` (0x7d8ac0, 0x82) — hit test for key slots
- `GetShortCutIndexByPos` (0x7d8270, 0xaf) — get shortcut index from position
- `GetShortCutPos` (0x7d8320, 0x28) — get shortcut position
- `OnMouseMove` (0x7d90d0, 0x1a1) — tooltip on hover
- `ReDrawKeyPalette` (0x7dd930, 0xce) — refresh palette
- `CompareValidateFuncKeyMappedInfo` (0x7d9370, 0x390) — validate key config
- `OnQuickslotKeyConf` (0x7d9280, 0xe2) — quickslot config

### CNoticeDlg (nested class)
- Confirmation dialog for default/delete actions
- `OnCreate` (0x7dc280), `OnButtonClicked` (0x7d8350), `OnChildNotify` (0x7dda00)
- `SetToolTipInNotice` (0x7dc430) — tooltip setup

### OnDestroy (0x7ddf60)
- Cleans up layout manager and button resources

## Key Findings for Implementation

1. **Button IDs**: 1=OK, 2=Cancel, 2000=Default, 2001=Delete, 2002=QuickSlot
2. **WZ paths**: All under `UI/UIWindow2.img/KeyConfig/`
3. **Image font**: StringPool(0x50E) for slot numbers
4. **Key mapping save**: Uses `CFuncKeyMappedMan::SaveFuncKeyMap` and `CQuickslotKeyMappedMan::SaveQuickslotKeyMap`
5. **Default reset**: Clears with `memset(0)` on the key mapped array
6. **Drag system**: Full drag-and-drop for key remapping via `TryBeginDragFuncKeyMappedIcon`
