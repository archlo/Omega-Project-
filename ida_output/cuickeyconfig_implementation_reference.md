# CUIKeyConfig — Full Implementation Reference

## Constructor (0x7d9700)
- Inherits CUIWnd
- Standard CUIWnd initialization

## OnCreate (0x7dc5d0) — 4559 bytes
- `CLayoutMan::Init(&m_lm, this, 0, 0)`
- `CUIWnd::OnCreate(this, pData)` (base)
- Creates 5 buttons via `CLayoutMan::AddButton`:

| WZ Path | nId | Position |
|---------|-----|----------|
| `UI/UIWindow2.img/KeyConfig/BtOK` | 1 | OK button |
| `UI/UIWindow2.img/KeyConfig/BtCancel` | 2 | Cancel button |
| `UI/UIWindow2.img/KeyConfig/BtDefault` | 2000 | Default mapping |
| `UI/UIWindow2.img/KeyConfig/BtDelete` | 2001 | Clear all |
| `UI/UIWindow2.img/KeyConfig/BtQuickSlot` | 2002 | Quick slot config |

- Loads `StringPool(0x50E)` as `m_pImgFontNumber` — slot numbers
- Creates key icon layers for each function key slot
- Calls `CalcKeyIconPosInfo` to compute key positions

## OnButtonClicked (0x7ddd90)
| nId | Action |
|-----|--------|
| 1 | `SaveFuncKeyMap` + `SaveQuickslotKeyMap` + `UI_Close(5)` |
| 2 | `InvalidateRect(StatusBar)` + `UI_Close(5)` |
| 2000 | Confirm → `DefaultFuncKeyMap` + `DefaultQuickslotKeyMap` + `ReDrawQuickslot` |
| 2001 | Confirm → `memset(0)` clear all + `ResetPaletteItems` + invalidate |
| 2002 | `OnQuickslotKeyConf` |

## Key Methods
- `CalcKeyIconPosInfo` (0x7d83d0) — computes key icon positions
- `DrawKeys` (0x7da030) — renders keyboard keys
- `DrawFuncKeyMapped` (0x7da4e0) — renders mapped function keys
- `DrawKeyPalette` (0x7d99f0) — renders key palette
- `TryBeginDragFuncKeyMappedIcon` (0x7db310) — drag start for key remap
- `HitTest` (0x7d8ac0) — hit test for key slots
- `OnMouseMove` (0x7d90d0) — tooltip on hover
- `ReDrawKeyPalette` (0x7dd930) — refresh palette
- `CompareValidateFuncKeyMappedInfo` (0x7d9370) — validate config

## CNoticeDlg (nested class)
- Confirmation dialog for default/delete actions
- `OnCreate` (0x7dc280), `OnButtonClicked` (0x7d8350), `OnChildNotify` (0x7dda00)
