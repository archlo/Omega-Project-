# CUIEquip — Full Implementation Reference

## OnMouseButton (0x7a72b0) — Left-Click Drag Initiation

**msg == 513 (WM_LBUTTONDOWN):**
1. `GetBodyPartFromPoint(rx, ry)` → slot index (0 = no hit)
2. If no slot hit → `ClearToolTip` + return
3. Validate: not in cash shop, HP > 0, 500ms cooldown since last request
4. Get `CharacterData` from `CWvsContext`
5. Try get item at slot: `CharacterData::GetItem(p, 1, -100 - slot)` (cash equip)
   - If null: try `CharacterData::GetItem(p, 1, -slot)` (normal equip)
6. If no item in slot → `ClearToolTip` + return
7. Check `is_evan_dragon_riding_item(itemId)` → if true, block drag
8. Create drag layer:
   - `IWzGr2D::CreateLayer(...)` — new graphics layer
   - `CItemInfo::GetItemIcon(...)` — get item icon canvas
   - `IWzGr2DLayer::InsertCanvas(...)` — insert icon into layer
   - `Putcolor(0x80FFFFFF)` — semi-transparent (ghost) effect
   - `Putorigin(...)` — set origin to parent layer
   - `RelMove(rx - cx - 16, ry - cy + 16)` — position at cursor offset
9. Create `CDraggableItem(layer, 1, slotIndex, 0, this)` — drag object
10. `CWndMan::BeginDragDrop(...)` — start drag operation
11. `play_ui_sound(StringPool(0x75E))` — play equip pickup sound
12. Release all COM references

## OnMouseMove (0x7a7780) — Hover Tooltip

1. Get `CharacterData`, call `GetBodyPartFromPoint(rx, ry)`
2. Get equipped item: `CharacterData::GetItem(p, 1, -BodyPartFromPoint)`
3. Get comparison item: `CharacterData::GetItem(p, 1, -100 - BodyPartFromPoint)`
4. **Slot 10 special**: If job beginner with nSubJob==1 && job/10 != 43 → StringPool tooltip (0x1731)
5. **Normal tooltip**:
   - If comparison item exists: `SetToolTip_Equip2` (side-by-side comparison)
   - If only main item: `SetToolTip_Equip` (single item tooltip)
   - If no item: `ClearToolTip`
6. Set cursor to state 5 (hand cursor) when hovering equipped item

## OnTogglePetEquip (0x7a43b0) — Pet Panel Slide Animation

1. If `m_pUIPetEquip` exists (currently shown):
   - Get pet panel layer position (`get_rx`, `get_ry`)
   - Get layer origin (`Getorigin`)
   - Reset origin to empty (`put_origin(vtEmpty)`)
   - Calculate target X: `GetAbsLeft() + 183`
   - Store `m_nToggleTime = abs(currentX - targetX)`
   - Schedule animation: `RelMove(targetX, GetAbsTop() + 103, currentTime + toggleTime)`
   - Set `m_bPetEquipShown = 1`
2. If pet panel doesn't exist → create it via `CUIPetEquip(lLeft, lTop)`

## ShowItemReleaseEffect (0x7a9a50) — Release Visual Effect

1. Get slot position from `m_sEqSlotInfo[slotIndex]`
2. Build UOL path: `aUiUiwindow2Img_418` (39 wide chars — `UI/UIWindow2.img/ItemRelease/effect`)
3. Load animation layer: `CAnimationDisplayer::LoadLayer(uol, 0, lt, x, y, parentLayer, 1, 255, 0)`
4. Stop animation: `Animate(GA_STOP, ...)`
5. Register as one-time: `CAnimationDisplayer::RegisterOneTimeAnimation(layer, 0, nullptr)`

## Draw (0x7aa560) — Main Render Loop

1. `CWnd::Draw(this, pRect)` — base class
2. Get `CharacterData` from `CWvsContext`
3. Get canvas via `CWnd::GetCanvas`
4. **Disable slots** based on conditions:
   - Slot 10 (Shield): if job 14 series AND no sub-weapon
   - Slot 6 (Overall): if job 105 series AND no bottomwear
   - Slots 18-20 (Android/Belt/Shoulder): if no novice skill 1004
   - Slot 10: if beginner AND nSubJob==1 AND job/10 != 43
5. **Slot render loop**: for each slot 1 to `(m_bExpanded ? 59 : 58)`:
   - Get item from `CharacterData::GetItem(p, 1, -slotIndex)`
   - Check disabled/expired state
   - If item exists:
     - `CItemInfo::CalcEquipItemQuality` — get quality grade
     - `CItemInfo::DrawGradeFrame` — draw grade border
     - `CItemInfo::DrawItemIconForSlot` — draw item icon
   - If disabled/expired: `SetSlotDisable(canvas, slotIndex)` — gray out
6. After loop: update level-gated button state (level >= 50)

## GetBodyPartFromPoint (0x7a3ce0) — Hit Test

```
for slot 0 to (m_bExpanded ? 59 : 58):
  get slot rect from m_sEqSlotInfo[slot] (or dword_C6EA20 defaults if collapsed && slot >= 58)
  if nX < rx < nX+32 AND nY < ry < nY+32:
    return slot + 1  // 1-based
return 0  // no hit
```

## OnButtonClicked (0x7a7e50) — Button Router

| nId | Action |
|-----|--------|
| 0xBB8 (3000) | `SendMigrateToShopRequest(ctx, 0)` — Cash Shop (sets nMapId=50200052) |
| 0xBB9 (3001) | `ToggleDragonEquip(this)` — Evan dragon panel |
| 0xBBA (3002) | `TogglePetEquip(this)` — Pet equip panel |
| 0xBBB (3003) | `ToggleMechanicEquip(this)` — Mechanic mech suit |
| default | `CUIWnd::OnButtonClicked(this, nId)` |

## EqSlotInfo Coordinate System

**GetX(nXpt, nType)**: nType 0/2→+10, nType 1→+11, nType 3→+12
- Formula: `nXpt * 33 + offset` (32px slot + 1px gap)
- nXpt < 0 → 1024 (hidden)

**GetY(nYpt, nType)**: nType 0→+27, nType 1→+37, nType 2/3→+22
- Formula: `nYpt * 33 + offset`
- nYpt < 0 → 768 (hidden)

## Key WZ Paths (from ShowItemReleaseEffect)
- `UI/UIWindow2.img/ItemRelease/effect` — release animation
- All slot backgrounds loaded via `CUIWnd` base class from `UIWindow2.img`
