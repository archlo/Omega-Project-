# CUIQuestInfo Full Audit — IDA Decompilation Findings

Generated: 2026-07-11

## Class Structure

**CUIQuestInfo** inherits CUIWnd. Singleton via `TSingleton<CUIQuestInfo>`.
Has a nested **CUIQuestInfoDetail** sub-panel for quest detail view.

### Constructor (0x8271e0)
- Standard CUIWnd initialization

### OnCreate (0x827600)
- Very large function (0x1BB0 = 7088 bytes)
- Creates category buttons dynamically from `CQuestMan::m_asQuestCategoryName`
- Loads WZ resources for quest list rendering

### OnButtonClicked (0x8345c0)
Button ID ranges:
- **3000-3999**: Category filter SET buttons (bitmask toggles on)
  - `byteIndex = (nId - 3000) / 8`
  - `bitIndex = (nId + 72) & 7`
  - Sets bit in `m_abOption` array
- **4000-4999**: Category filter CLEAR buttons (bitmask toggles off)
  - Same formula but clears bit with `&= ~(1 << bit)`
- **5000**: Quest view state = pending (SetQuestViewState_ToOption(0))
- **5001**: Quest view state = complete (SetQuestViewState_ToOption(1))
- Updates `CWvsContext+4245` with option state
- Also refreshes `CUIQuestDelivery` if open

### Key Methods
- `Draw` (0x82a780, 0x18a4) — renders quest list
- `LoadData` (0x832d40, 0x167f) — loads quest data from CQuestMan
- `ResetInfo` (0x8343c0, 0x1fd) — refreshes quest list display
- `SetButton` (0x821330, 0xae) — updates button states
- `ToggleCategory` (0x821d50, 0x4f) — category expand/collapse
- `IsMinimizedCategory` (0x821b70, 0x53) — check if category collapsed
- `GetQuestIdxFromMousePos` (0x821980, 0xbe) — hit test for quest items
- `SetSelect` (0x82c220, 0xe3) — select a quest
- `ShowQuestInfoDetail` (0x831b00, 0x1cd) — show detail panel
- `OnTabChanged` (0x8351d0, 0x88) — tab change handler
- `OnChildNotify` (0x835260, 0x5e) — child control notifications
- `InsertQuestInfo` (0x832690, 0x6a9) — insert quest into list
- `GetQuestDesc` (0x82d360, 0x210) — get quest description
- `GetQuestSummary` (0x82d570, 0x2c0) — get quest summary
- `MarkQuestAsRead` (0x82a730, 0x46) — mark quest as read
- `IsMarkedAsRead` (0x821da0, 0x18) — check if quest read
- `IsWorthlessQuest` (0x8223b0, 0xce) — check if quest is worthless
- `GetQuestState` (0x822270, 0x86) — get quest completion state
- `TryShowRecentlyUpdatedQuest` (0x832020) — auto-show updated quests
- `TryShowSuitableLevelQuest` (0x832090) — auto-show level-appropriate quests

### CUIQuestInfoDetail (nested)
- `OnCreate` (0x830dd0, 0xa2c) — detail panel setup
- `Draw` (0x8248c0, 0xea0) — detail rendering
- `OnMouseButton` (0x823ef0, 0x23f) — click handling
- `OnMouseMove` (0x826bd0, 0x60d) — hover/tooltip
- `SetNPC` (0x82fd70, 0x105f) — NPC display
- `SetLayout` (0x823020, 0x21a) — layout computation
- `SetGauge_SeriesQuest` (0x825760, 0x1098) — progress gauge
- `SetTimer` (0x829c50, 0x91c) — quest timer display
- `DrawTimeText` (0x826800, 0x3c1) — time text rendering
- `MarkNpcLocation_InWorldMap` (0x823240) — NPC marker on world map
- `MarkMobLocation_InWorldMap` (0x823340) — mob marker on world map
- `MarkMapLocation_InWorldMap` (0x823480) — map marker on world map

### Static State
- `ms_lQuestRead` — ZList of read quest IDs (dynamic init at 0xb0e7b0)

## Key Findings for Implementation

1. **Category filter is bitmask-based**: Each category has a bit in `m_abOption` byte array
2. **Button IDs**: 3000+ for filter set, 4000+ for filter clear, 5000/5001 for view state
3. **Quest state**: Tracked via `CQuestMan` and `CWvsContext`
4. **Detail panel**: Separate CUIQuestInfoDetail with NPC/mob/map markers
5. **Read tracking**: Uses static `ms_lQuestRead` list
6. **Auto-show**: Recently updated and suitable-level quests auto-display
