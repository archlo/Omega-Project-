# CUIQuestTimer — Full Implementation Reference

## Class Structure
- Quest timer display (countdown for timed quests)
- Has nested `CUIQuestTimerAction` sub-panel

## CUIQuestTimer
- `OnMoveWnd` (0x835480) — 136 bytes, reposition timer
- `SetVisible` (0x835510) — show/hide timer
- `SetScreenMode` (0x835560) — 220 bytes, handle screen mode change
- `Draw` (0x835700) — 782 bytes, render timer with countdown text

## CUIQuestTimerAction
- `OnCreate` (0x8352c0) — stub (3 bytes)
- `OnMouseMove` (0x8352d0) — 73 bytes, hover detection
- `IsMyAddon` (0x835320) — 18 bytes, check if child window
- `SetVisible` (0x835340) — 66 bytes, show/hide
- `OnMoveWnd` (0x835400) — 125 bytes, reposition

## Key Fields
- `m_pQuestTimerAction` — ZRef<CUIQuestTimerAction>
- Timer countdown value
- Quest ID reference
