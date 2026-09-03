# CUIQuestInfo — Full Implementation Reference

## OnButtonClicked (0x8345c0) — Category Filter + View State

**nId 3000-3999: Category filter SET (bitmask OR)**
- `byteIndex = (nId - 3000) / 8`
- `bitIndex = (nId + 72) & 7`
- `m_abOption[byteIndex] |= (1 << bitIndex)`
- Calls `ResetInfo(1)`

**nId 4000-4999: Category filter CLEAR (bitmask AND NOT)**
- Same formula but: `m_abOption[byteIndex] &= ~(1 << bitIndex)`

**nId 5000: View state = pending**
- `SetQuestViewState_ToOption(0)`
- Updates `CWvsContext+4245`

**nId 5001: View state = complete**
- `SetQuestViewState_ToOption(1)`

## Key Methods
- `OnCreate` (0x827600) — creates category buttons from `CQuestMan::m_asQuestCategoryName`
- `Draw` (0x82a780) — renders quest list with categories
- `LoadData` (0x832d40) — loads quests from `CQuestMan`
- `ResetInfo` (0x8343c0) — refreshes quest list display
- `SetButton` (0x821330) — updates button states
- `ToggleCategory` (0x821d50) — category expand/collapse
- `IsMinimizedCategory` (0x821b70) — check if collapsed
- `GetQuestIdxFromMousePos` (0x821980) — hit test
- `SetSelect` (0x82c220) — select a quest
- `ShowQuestInfoDetail` (0x831b00) — show detail panel
- `OnTabChanged` (0x8351d0) — tab change
- `InsertQuestInfo` (0x832690) — insert quest into list
- `GetQuestDesc` (0x82d360) — get description
- `GetQuestSummary` (0x82d570) — get summary
- `MarkQuestAsRead` (0x82a730) — mark as read
- `IsWorthlessQuest` (0x8223b0) — check if worthless
- `GetQuestState` (0x822270) — completion state
- `TryShowRecentlyUpdatedQuest` (0x832020) — auto-show
- `TryShowSuitableLevelQuest` (0x832090) — level-appropriate

## CUIQuestInfoDetail (nested)
- `OnCreate` (0x830dd0), `Draw` (0x8248c0), `SetNPC` (0x82fd70)
- `SetLayout` (0x823020), `SetGauge_SeriesQuest` (0x825760)
- `MarkNpcLocation_InWorldMap` (0x823240)
- `MarkMobLocation_InWorldMap` (0x823340)
- `MarkMapLocation_InWorldMap` (0x823480)
