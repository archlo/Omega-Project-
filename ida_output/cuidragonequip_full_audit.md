# CUIDragonEquip Full Audit — IDA Decompilation Findings

Generated: 2026-07-11

## Class Structure

**CUIDragonEquip** inherits CWnd (NOT CUIWnd). Singleton via `TSingleton<CUIDragonEquip>`.

### Constructor (0x7a3f30)
- `CWnd::CWnd(this)` — plain CWnd
- `CWnd::CreateWnd(this, lLeft, lTop, 151, 172, 10, 1, nullptr, 1, Origin_LT)` — 151×172 window
- Has: `m_uiToolTip`

### GetBodyPartFromPoint (0x7a38c0)
- 4 slots in `ms_aRegion[0..3]`
- Each slot is 32×32
- Returns `slotIndex + 1000` (body parts 1000-1003)
- Returns -1 if no hit

### ms_aRegion Init (0xb0d750)
Slot positions computed from `EqSlotInfo::GetX/Y` with type=2:
- X offset = 10, Y offset = 22
- Slot 0: (GetX(0,2), GetY(1,2)) = (10, 55)
- Slot 1: (GetX(1,2), GetY(2,2)) = (43, 88)
- Slot 2: (GetX(2,2), GetY(1,2)) = (76, 55)
- Slot 3: (GetX(3,2), GetY(2,2)) = (109, 88)

## Key Findings

1. **151×172 window** — slides in from LEFT of CUIEquip
2. **4 dragon equip slots** — body parts 1000-1003
3. **EqSlotInfo type=2** — different offset than character equip (type=0)
4. **No buttons** — just slots, closed via CUIEquip::ToggleDragonEquip
