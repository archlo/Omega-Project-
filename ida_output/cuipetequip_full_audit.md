# CUIPetEquip Full Audit — IDA Decompilation Findings

Generated: 2026-07-11

## Class Structure

**CUIPetEquip** inherits CWnd (NOT CUIWnd). Singleton via `TSingleton<CUIPetEquip>`.

### Constructor (0x7a4920)
- `CWnd::CWnd(this)` — plain CWnd, not CUIWnd
- `CWnd::CreateWnd(this, lLeft, lTop, 167, 201, 10, 1, nullptr, 1, Origin_LT)` — 167×201 window
- Has: `m_uiToolTip` (CUIToolTip), `m_pBtHide` (hide button), `m_pBtPets[3]` (pet select buttons), `m_pImgFontNumber` (image font)

### OnButtonClicked (0x7a7e10)
- **2000**: `CUIEquip::TogglePetEquip(TSingleton<CUIEquip>)` — close pet panel
- **2001-2003** (0x7D1-0x7D3): Sets `m_nPetIndex = nId - 2001` (0-2) — switch pet

### GetPetEquipFromPoint (0x7a39b0)
- Hit test for pet equip slots (body parts 14, 21-28, 30-37, 38-45)
- Returns 1-based slot index or 0 if no hit

### Key Methods
- `OnCreate` (0x7a9ff0, 0x56d) — creates buttons and layout
- `Draw` (0x7a5fb0, 0x5e6) — renders pet equip grid
- `OnMouseMove` (0x7a4f50, 0x3c8) — tooltip on hover
- `OnMouseButton` (0x7a65a0, 0xce8) — click handling (drag system)
- `SetPetConsumeItem` (0x7a9330, 0x38a) — set HP consume item
- `SetPetConsumeMPItem` (0x7a96c0, 0x38a) — set MP consume item

## Key Findings

1. **Plain CWnd** — not CUIWnd, so no position saving or standard CUIWnd behavior
2. **167×201 window** positioned at (CUIEquip.left+183, CUIEquip.top+103)
3. **3 pet selection buttons** (nId 2001-2003) — switch between pet 0/1/2
4. **Close button** (nId 2000) — calls back to CUIEquip::TogglePetEquip
5. **Pet equip slots**: Body parts 14, 21-28 (pet 0), 30-37 (pet 1), 38-45 (pet 2)
