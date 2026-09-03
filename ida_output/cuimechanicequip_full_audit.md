# CUIMechanicEquip Full Audit — IDA Decompilation Findings

Generated: 2026-07-11

## Class Structure

**CUIMechanicEquip** inherits CWnd (NOT CUIWnd). Singleton via `TSingleton<CUIMechanicEquip>`.

### Constructor (0x7a3da0)
- `CWnd::CWnd(this)` — plain CWnd
- `CWnd::CreateWnd(this, lLeft, lTop, 151, 172, 10, 1, nullptr, 1, Origin_LT)` — 151×172 window
- Has: `m_uiToolTip`

### GetBodyPartFromPoint (0x7a3870)
- 5 slots in `ms_aRegion[0..4]`
- Each slot is 32×32
- Returns `slotIndex + 1100` (body parts 1100-1104)
- Returns -1 if no hit

### ms_aRegion Init (0xb0d6d0)
Slot positions computed from `EqSlotInfo::GetX/Y` with type=3:
- X offset = 12, Y offset = 22
- 5 slots using various (nXpt, nYpt) combinations

## Key Findings

1. **151×172 window** — slides in from LEFT of CUIEquip (same size as dragon)
2. **5 mechanic equip slots** — body parts 1100-1104
3. **EqSlotInfo type=3** — X offset 12 (vs 10 for char equip, 10 for dragon)
4. **No buttons** — just slots, closed via CUIEquip::ToggleMechanicEquip
