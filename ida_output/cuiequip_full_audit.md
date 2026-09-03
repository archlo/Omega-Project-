# CUIEquip Full Audit — IDA Decompilation Findings

Generated: 2026-07-11

## Class Structure

**CUIEquip** inherits CUIWnd. Singleton via `TSingleton<CUIEquip>`.

### Constructor (0x7a8cf0)
- `CUIWnd(this, 1, 5, 162, 6, 1, 0, 0)` — type=1, nType=5, nWidth=162, nHeight=6, bShow=1
- Initializes: `m_pUIMechanicEquip`, `m_pUIDragonEquip`, `m_pUIPetEquip`, `m_pBtPetEquipShow` all null
- `m_ewi.m_bExpanded` loaded from `CWvsContext+4179` (saved expand state)
- `CUIWnd::CreateUIWndPosSaved(this, 184, 304, 10)` — position saved to localStorage key 10

### Fields (from decompile)
- `+0B08` `m_pUIMechanicEquip` — ZRef<CUIEquip> (mechanic mech suit panel)
- `+0B0C` `m_pUIDragonEquip` — ZRef (Evan dragon panel)
- `+0B10` `m_pUIPetEquip` — ZRef (pet equip panel)
- `+0B14` `m_pBtPetEquipShow` — ZRef<CCtrlOriginButton> (toggle button)
- `+0B18` `m_pBtMechanic` — ZRef<CCtrlOriginButton>
- `+0B1C` `m_nBtCloseX` = 162
- `+0B20` `m_pImgFontNumber` — ZRef (font for slot numbers)
- `+0B24` `m_lm` — CLayoutMan
- `+0B28` `m_ewi` — CExpandableWndInfo
  - `+0B28` `m_bExpanded` — int (0=collapsed/normal, 1=expanded/pet view)
  - `+0B2C` `m_ptCursorRel` — POINT (cursor tracking)
  - `+0B34` `FakePtr2` — used for level-gated button state

### CExpandableWndInfo::m_sEqSlotInfo (static)
Array of `EqSlotInfo { nX, nY }` — 2D slot positions for each body part.

**EqSlotInfo::GetX(nXpt, nType)**:
- nType 0/2: offset=10, nType 1: offset=11, nType 3: offset=12
- Formula: `nXpt * 33 + offset` (32px slot + 1px gap)
- nXpt < 0 → return 1024 (hidden/offscreen)

**EqSlotInfo::GetY(nYpt, nType)**:
- nType 0: offset=27, nType 1: offset=37, nType 2/3: offset=22
- Formula: `nYpt * 33 + offset`
- nYpt < 0 → return 768 (hidden/offscreen)

**Slot size**: 32×32 pixels per slot.

### Slot Layout (computed from dynamic initializer)
Using body part index → (nXpt, nYpt, nType):

| Slot | Body Part | nXpt | nYpt | nType | X | Y |
|------|-----------|------|------|-------|---|---|
| 1 | Hat | 1 | 0 | 0 | 43 | 27 |
| 2 | Face | 1 | 1 | 0 | 43 | 60 |
| 3 | Eye Decoration | 1 | 2 | 0 | 43 | 93 |
| 4 | Ear Decoration | 3 | 2 | 0 | 109 | 93 |
| 5 | Topwear | 1 | 3 | 0 | 43 | 126 |
| 6 | Overall | 0 | 2 | 0 | 10 | 93 |
| 7 | Shoes | 0 | 3 | 0 | 10 | 126 |
| 8 | Bottomwear | 0 | 4 | 0 | 10 | 159 |
| 9 | Weapon | 2 | 1 | 2 | 76 | 60 |
| 10 | Shield | 3 | 3 | 0 | 109 | 126 |
| 11 | Cape | 4 | 3 | 0 | 142 | 126 |
| 12 | Ring 1 | 3 | 4 | 0 | 109 | 159 |
| 13 | Ring 2 | 4 | 4 | 0 | 142 | 159 |
| 14 | Ring 3 | 0 | 5 | 0 | 10 | 192 |
| 15 | Ring 4 | 1 | 5 | 0 | 43 | 192 |
| 16 | Pendant | 2 | 2 | 0 | 76 | 93 |
| 17 | Mount | 0 | 6 | 0 | 10 | 225 |
| 18 | Android Heart | -1 | -1 | 0 | 1024 | 768 (hidden) |
| 19 | Belt | -1 | -1 | 0 | 1024 | 768 (hidden) |
| 20 | Shoulder | -1 | -1 | 0 | 1024 | 768 (hidden) |

Slots 21-48 use default (v2,v3) = hidden positions (used for expanded pet equip slots).
Slots 49-58: additional expanded slots with computed positions.

### Slot Disable Logic (Draw)
Slots are disabled (grayed out) based on conditions:
- **Slot 10** (Shield): Disabled if equipped item is job 14 (0xE0000 series) AND no sub-weapon
- **Slot 6** (Overall): Disabled if equipped item is job 105 (0x69000 series) AND no bottomwear
- **Slots 18-20** (Android/Belt/Shoulder): Disabled if character lacks novice skill 1004
- **Slot 10** (Shield): Also disabled if job/1000 == 0 (beginner) AND nSubJob == 1 AND job/10 != 43

### Draw (0x7aa560)
1. Calls `CWnd::Draw(this, pRect)` (base)
2. Gets `CharacterData` from `CWvsContext`
3. Gets canvas via `CWnd::GetCanvas`
4. Disables specific slots per job/class rules
5. Iterates slots 1 to `(m_bExpanded ? 59 : 58)`:
   - Gets equipped item from `CharacterData::GetItem(p, 1, -slotIndex)`
   - If item exists: draws grade frame + item icon via `CItemInfo::DrawGradeFrame` / `CItemInfo::DrawItemIconForSlot`
   - If slot disabled or expired: calls `SetSlotDisable` to gray it out
6. After loop: updates level-gated button state (level >= 50 check)

### OnButtonClicked (0x7a7e50)
- **0xBB8** (3000): `SendMigrateToShopRequest(ctx, 0)` — Cash Shop button (sets nMapId=50200052)
- **0xBB9** (3001): `ToggleDragonEquip(this)` — Evan dragon panel toggle
- **0xBBA** (3002): `TogglePetEquip(this)` — Pet equip panel toggle
- **0xBBB** (3003): `ToggleMechanicEquip(this)` — Mechanic mech suit toggle
- Default: `CUIWnd::OnButtonClicked(this, nId)`

### GetBodyPartFromPoint (0x7a3ce0)
- Iterates slots 0 to `(m_bExpanded ? 59 : 58)`
- For each slot: checks if point (rx,ry) is within slot rect (nX, nY, nX+32, nY+32)
- Returns 1-based slot index if hit, 0 if no hit
- Uses `dword_C6EA20` (default positions) when collapsed and slot >= 58

### OnMouseMove (0x7a7780)
1. Gets `CharacterData`, calls `GetBodyPartFromPoint(rx, ry)`
2. Gets item at slot: `CharacterData::GetItem(p, 1, -BodyPartFromPoint)` (negative index = equipped)
3. Gets item at "comparison" slot: `CharacterData::GetItem(p, 1, -100 - BodyPartFromPoint)`
4. **Slot 10 special case**: If job is beginner with nSubJob==1 and job/10 != 43, shows StringPool tooltip (0x1731)
5. **Normal tooltip flow**:
   - If item exists at comparison slot: `CUIToolTip::SetToolTip_Equip2` (shows comparison)
   - If only main item: `CUIToolTip::SetToolTip_Equip` (single item tooltip)
   - If no item: `CUIToolTip::ClearToolTip`
6. Sets cursor to state 5 (hand cursor) when hovering equipped item

### OnMouseButton (0x7a72b0)
- Handles left-click on equip slots
- Gets `GetBodyPartFromPoint(rx, ry)` for hit slot
- If slot has item: initiates drag via `CDraggableItem` system
- If empty slot: does nothing
- Right-click: opens context menu (not fully decompiled yet)

### TogglePetEquip (0x7a43b0)
- Toggles `m_ewi.m_bExpanded` between 0 and 1
- Creates/destroys `CUIPetEquip` panel
- Updates button text/state

### ToggleDragonEquip (0x7a7c40)
- Creates/destroys `CUIDragonEquip` panel

### ToggleMechanicEquip (0x7a7af0)
- Creates/destroys `CUIMechanicEquip` panel

### OnDestroy (0x7a54c0)
- Cleans up sub-panels (pet, dragon, mechanic)
- Calls `CUIWnd::OnDestroy`

### Update (0x7a5570)
- Minimal: just calls base update

## Key Findings for Implementation

1. **Slot positions are COMPUTED**, not hardcoded — `EqSlotInfo::GetX/Y` formulas determine all positions
2. **32×32 slot size** with 1px gap between slots
3. **Expanded mode** adds ~24 more slots (pet equipment) below the main grid
4. **Cash Shop button** is ID 0xBB8, not a fixed position — it's a `CCtrlOriginButton`
5. **Level gate**: some UI elements only show when level >= 50
6. **Job-based slot disable**: shield/overall slots grayed out based on job class
7. **Tooltip comparison**: shows equipped item vs cursor item when hovering
8. **Drag system**: `CDraggableItem` handles all equip/unequip drag operations (already implemented in TS)
