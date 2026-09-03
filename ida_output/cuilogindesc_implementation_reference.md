# CUILoginDesc — Full Implementation Reference

## Constructor (0x5f0040)
- Plain CWnd, `CWnd::CWnd(this)`
- `m_pLogin` — CLogin pointer
- Minimal setup

## OnCreate (0x5f0280)
- Creates description panel for login screen
- Loads WZ assets for login background

## Key Methods
- `Draw` (0x5ee530) — stub (5 bytes)
- `Update` (0x5ee540) — stub (5 bytes)
- `Delete` (0x5ee550) — cleanup (13 bytes)
- `OnSetFocus` (0x5f01b0) — no-op
- `OnActivate` (0x5f01c0) — no-op
- `HitTest` (0x5f01d0) — no-op (returns 0)
