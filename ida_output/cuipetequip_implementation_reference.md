# CUIPetEquip — Full Implementation Reference

## Constructor (0x7a4920)
- Plain `CWnd`, NOT CUIWnd
- `CWnd::CreateWnd(this, lLeft, lTop, 167, 201, 10, 1, nullptr, 1, Origin_LT)` — 167×201
- Has: `m_uiToolTip` (CUIToolTip), `m_pBtHide` (Button), `m_pBtPets[3]` (3 pet tabs), `m_pImgFontNumber` (image font)

## OnButtonClicked (0x7a7e10)
- **2000**: `CUIEquip::TogglePetEquip(TSingleton<CUIEquip>)` — close panel
- **2001-2003**: `m_nPetIndex = nId - 2001` (0-2) — switch pet, invalidate

## GetPetEquipFromPoint (0x7a39b0)
- Iterates slots for current pet index
- Body parts: pet 0 = 14/21-28/46, pet 1 = 30-37/47, pet 2 = 38-45/48
- Universal: 24/25/29
- Returns 1-based slot index or 0

## OnMouseButton (0x7a65a0)
- msg == 513 (WM_LBUTTONDOWN):
  1. `GetPetEquipFromPoint(rx, ry)` → slot
  2. Validate: not cash shop, HP > 0, 500ms cooldown
  3. Get item from `CharacterData::GetItem(p, TI, -bodyPart)`
  4. Create drag layer (same pattern as CUIEquip)
  5. `CDraggableItem(layer, TI, slot, 0, this)` — drag with pet TI
  6. `CWndMan::BeginDragDrop(...)`
  7. `play_ui_sound(0x75E)` — equip sound

## OnMouseMove (0x7a4f50)
- Same tooltip pattern as CUIEquip
- Uses `SetToolTip_Equip` / `SetToolTip_Equip2` for item comparison

## Draw (0x7a5fb0)
- Renders pet equip grid for current `m_nPetIndex`
- Draws slot backgrounds, equipped items, disabled states
- Pet consume slots (HP/MP) rendered separately

## SetPetConsumeItem (0x7a9330) / SetPetConsumeMPItem (0x7a96c0)
- Sets HP/MP consume item for auto-feed
- Sends packet to server with item info

## Key Differences from CUIEquip
- Uses `CWnd` not `CUIWnd` — no position saving, no standard CUIWnd behavior
- 167×201 window (vs 184×304 for CUIEquip)
- Positioned at (CUIEquip.left + 183, CUIEquip.top + 103)
- Pet slots use TI (tab index) for pet number (0, 1, 2)
- Universal slots (24/25/29) visible for all pets
