# CUIStatusBar (ChatBar) Full IDA Decompilation — All Functions

## Key Insight: No Separate CUIChatBar Class
The chat bar is **integrated into CUIStatusBar**. There is no standalone CUIChatBar class in the v95 client.

## CUIStatusBar Struct Layout (6496 bytes)

### Chat-specific fields:
- +0x128: m_uiToolTip (CUIToolTip, 2632 bytes)
- +0xAE8: m_uiItemToolTip (CUIToolTip, 2632 bytes)
- +0x1518: m_ptItemToolTipClicked (POINT)
- +0x1520: m_pBtITC (ZRef<CCtrlButton>)
- +0x1528: m_pBtMenu (ZRef<CCtrlOriginButton>)
- +0x1530: m_pBtSystem (ZRef<CCtrlButton>)
- +0x1538: m_pBtMin (ZRef<CCtrlOriginButton>)
- +0x1540: m_pBtMax (ZRef<CCtrlOriginButton>)
- +0x1548: m_pBtEquipKey (ZRef<CCtrlOriginButton>)
- +0x1550: m_pBtInvenKey (ZRef<CCtrlOriginButton>)
- +0x1558: m_pBtStatKey (ZRef<CCtrlOriginButton>)
- +0x1560: m_pBtSkillKey (ZRef<CCtrlOriginButton>)
- +0x1568: m_pBtWhisper (ZRef<CCtrlOriginButton>)
- +0x1570: m_pScrChatLog (ZRef<CCtrlScrollBar>)
- +0x1578: m_pEditChatInput (ZRef<CCtrlEdit>)
- +0x1580: m_pCBChatTarget (ZRef<CCtrlComboBox>)
- +0x1588: m_paramComboBox (CCtrlComboBox::CREATEPARAM, 84 bytes)
- +0x15DC: m_paramEdit (CCtrlEdit::CREATEPARAM, 60 bytes)
- +0x1618: m_nChatTarget (int) — current chat target (0-8)
- +0x161C: m_nCurPtY (int) — drag Y position
- +0x1620: m_bDragChatWnd (int) — is dragging chat resize
- +0x1624: m_pLayerTempEXP (ZComPtr<IWzGr2DLayer>)
- +0x1628: m_pFont (ZComPtr<IWzFont>)
- +0x162C: m_pFontJobTitle (ZComPtr<IWzFont>)
- +0x1630: m_pFontDimGreen (ZComPtr<IWzFont>)
- +0x1634: m_pFontWhite (ZComPtr<IWzFont>)
- +0x1638: m_pFontChatLog[27] (ZComPtr<IWzFont>, 108 bytes) — 27 font slots
- +0x16A4: m_pFontJobCategory (ZComPtr<IWzFont>)
- +0x16A8: m_pImgFontLevelNo (ZComPtr<IWzProperty>)
- +0x16AC: m_pImgFontMemo (ZComPtr<IWzProperty>)
- +0x16B0: m_nScrWidth (int)
- +0x16B4: m_dwLastScrolled (DWORD) — timestamp of last scroll
- +0x16B8: m_sWhisperTarget (ZXString<char>)
- +0x16BC: m_lsWhisperCandidate (ZList<ZXString<char>>, 20 bytes)
- +0x16D0: m_GaugeHP (CGauge, 24 bytes)
- +0x16E8: m_GaugeMP (CGauge, 24 bytes)
- +0x1700: m_GaugeEXP (CGauge, 24 bytes)
- +0x1718: m_GougeNo (CBitmapStrNumber, 68 bytes)
- +0x1760: m_dEXPNo (double)
- +0x1768: m_sFriendGroupTarget (ZXString<char>)
- +0x176C: m_chatHelper (CChatHelper, 44 bytes)
- +0x1798: m_floatNotice (CFloatNotice, 12 bytes)
- +0x17A4: m_quizPanel (CFloatNotice, 12 bytes)
- +0x17B0: m_itemMsg (CFloatNotice, 12 bytes)
- +0x17BC: m_pLayerNoticeMsg (ZComPtr<IWzGr2DLayer>)
- +0x17C0: m_pLayerChatLog (ZComPtr<IWzGr2DLayer>)
- +0x17C4: m_pLayerChatBar (ZComPtr<IWzGr2DLayer>)
- +0x17C8: m_pLayerSkin (ZComPtr<IWzGr2DLayer>)
- +0x17CC: m_pLayerGaugeText (ZComPtr<IWzGr2DLayer>)
- +0x17D0: m_pLayerChatSpace (ZComPtr<IWzGr2DLayer>)
- +0x17D4: m_pLayerChatSpace2 (ZComPtr<IWzGr2DLayer>)
- +0x17D8: m_pLayerChatEnter (ZComPtr<IWzGr2DLayer>)
- +0x17DC: m_pLayerChatCover (ZComPtr<IWzGr2DLayer>)
- +0x17E0: m_pLayerButtonAni[4] (ZComPtr<IWzGr2DLayer>, 16 bytes)
- +0x17F0: m_bButtonAniPlayTime[4] (int, 16 bytes)
- +0x1800: m_nChatWndHeight (int) — current chat window height
- +0x1804: m_nChatWndType (int) — 0=init, 1=minimal, 2=expanded, 3=full
- +0x1808: m_nChatWndLineVisible (int) — visible lines count
- +0x180C: m_ptChatWnd (POINT) — chat window position
- +0x1814: m_bDoNotAskTarget (int)
- +0x1818: m_nPastHP (int) — previous HP for flash
- +0x181C: m_nPastMP (int) — previous MP for flash
- +0x1820: m_tLastUpdateSkillCooltime (DWORD)
- +0x1824: m_QuickSlot (CQuickSlot, 244 bytes)
- +0x1918: m_lm (CLayoutMan, 20 bytes)
- +0x192C: m_apBtChatFilter[6] (ZRef<CCtrlOriginButton>, 48 bytes) — 6 filter buttons
- +0x195C: m_dwChatFilterFlag (DWORD) — active filter flags

## CChatLog Struct (52 bytes)

- +0x00: vtable/ZRefCounted
- +0x0C: m_sChat (ZXString<unsigned short>) — chat text (UTF-16)
- +0x10: _ZtlSecureTear_m_nType (int, secured) — chat type
- +0x14: _ZtlSecureTear_m_nType_CS (int) — security cookie
- +0x18: m_nBack (int)
- +0x1C: m_nChannelID (int) — -1 if not channel-specific
- +0x20: m_bWhisperIcon (int) — show whisper icon
- +0x24: m_bFirstLine (int) — is first line of message
- +0x28: m_pItem (ZRef<GW_ItemSlotBase>) — attached item (for item messages)

## Chat Window Types (m_nChatWndType)

| Type | Height | Lines | Y Position | Scrollbar | Description |
|------|--------|-------|------------|-----------|-------------|
| 0 | 0 | 0 | N/A | No | Initial (no chat visible) |
| 1 | 24 | 1 | 518 | Hidden | Minimal |
| 2 | 24 | 1 | 492 | Hidden | Expanded (whisper mode) |
| 3 | 26-489 | 2-37 | 515-height | Visible | Full (configurable) |

**Height calculation**: `m_nChatWndLineVisible = height / 13`, if `height % 13 == 0` then `height += 2`

## Chat Targets (m_nChatTarget)

| Value | Target | StringPool | Description |
|-------|--------|------------|-------------|
| 0 | Friends | 0x324 | All online friends |
| 1 | Friend Group | 0x327 | Group from friend list |
| 2 | Party | 0x323 | Party members |
| 3 | Expedition | 0x189C | Expedition members |
| 4 | Guild | 0x326 | Guild members |
| 5 | Alliance | 0x1896 | Alliance members |
| 6 | Couple | — | Marriage partner |
| 7 | Whisper | — | Direct whisper |
| 8 | All/Map | 0x322 | Normal map chat |

**Tab cycling order**: [0→6(alliance), 1→2(party), 2→3(buddy), 3→4(guild), 4→5(expedition), 5→whisper, 6→1(whisper direct), 7→8(find), 8→0(all)]

## Chat Log Types (m_nType)

| Value | Color | Description |
|-------|-------|-------------|
| 0 | 0 (white) | System/normal |
| 1 | 0 | Whisper (received) |
| 2 | 0 | Party chat |
| 3 | 0 | Buddy chat |
| 4 | 0 | Guild chat |
| 5 | 0 | Alliance chat |
| 6 | 0 | Group chat |
| 7-10 | 0 | Other |
| 11 | -1325400065 | Blue |
| 12 | 0 | System message (filtered out) |
| 13 | -1328879617 | Light blue |
| 14 | -855654435 | Item whisper |
| 15 | -570549 | Orange |
| 16 | -570440192 | Item pickup |
| 18 | 743250605 | Green |
| 19 | varies | Channel-specific (yellow if channel, white if -1) |
| 20 | -2130748327 | White |
| 21 | -570440192 | Same as 16 |
| 22-23 | -6697933 | Yellow |

**Filtered**: Types 12-24 are "filtered" (pass through filter checks).

## Filter Flags (m_dwChatFilterFlag)

| Value | Filter | Button ID |
|-------|--------|-----------|
| 0x00 | All (none filtered) | 0x3F6 |
| 0x08 | Buddy | 0x3F7 |
| 0x04 | Guild | 0x3F8 |
| 0x10 | Alliance | 0x3F9 |
| 0x20 | Expedition | 0x3FA |
| 0x4000000 | System | 0x3FB |

**IsFiltered logic**: Passes if `!flag` OR `type >= 12 && type <= 24` OR `(1 << type) & flag != 0`

## Button IDs (OnButtonClicked)

| ID | Action |
|----|--------|
| 0x3E8 | Cash Shop (SendMigrateToShopRequest) |
| 0x3E9 | ITC (SendMigrateToITCRequest) |
| 0x3EA | Key Config (UI_ShortCut) |
| 0x3EB | Chat Type 1 (minimal) |
| 0x3EC | Chat Type 3 (full) |
| 0x3ED | Buddy List (UI_Toggle 5) |
| 0x3EE | Quick Slot Toggle |
| 0x3EF | Menu (UI_Menu) |
| 0x3F0 | Whisper Target (SetChatTarget 7) |
| 0x3F1 | Claim (SendClaim) |
| 0x3F5 | Channel Shift |
| 0x3F6 | Filter: All (flag = 0) |
| 0x3F7 | Filter: Buddy (flag ^= 8) |
| 0x3F8 | Filter: Guild (flag ^= 4) |
| 0x3F9 | Filter: Alliance (flag ^= 0x10) |
| 0x3FA | Filter: Expedition (flag ^= 0x20) |
| 0x3FB | Filter: System (flag ^= 0x4000000) |
| 2000 | Stat Window (UI_Toggle 1) |
| 0x7D1 | Equip Window (UI_Toggle 0) |
| 0x7D2 | Inventory (UI_Toggle 2) |
| 0x7D3 | Skill Window (UI_Toggle 3) |
| 0x7D4 | Quest/Character Info |
| 0x7D5 | Guild (UI_Toggle 6) |

## WZ Paths (from OnCreate)

- `UI/StatusBar2.img/mainBar/chatSpace` — chat background (small)
- `UI/StatusBar2.img/mainBar/chatSpace2` — chat background (large)
- `UI/StatusBar2.img/mainBar/chatEnter` — chat input area
- `UI/StatusBar2.img/mainBar/chatCover` — chat cover overlay
- `UI/StatusBar2.img/mainBar/chatTarget/all` — combo: all
- `UI/StatusBar2.img/mainBar/chatTarget/friend` — combo: friend
- `UI/StatusBar2.img/mainBar/chatTarget/party` — combo: party
- `UI/StatusBar2.img/mainBar/chatTarget/guild` — combo: guild
- `UI/StatusBar2.img/chat/tapBar` — filter bar background
- `UI/StatusBar2.img/chat/tapBarOver` — filter bar hover
- `UI/StatusBar2.img/chat/Tap/0` through `Tap/5` — 6 filter buttons
- `UI/StatusBar.img/base/chatTarget` — legacy chat target combo

## CChatHelper Struct (44 bytes)

- +0x00: vtable
- +0x04: m_asHistory (ZArray<ZXString<char>>) — chat history (max 8)
- +0x08: m_asRecent (ZArray<ZXString<char>>) — recent messages (max 4 for spam)
- +0x0C: m_dwLastChecked (DWORD)
- +0x10: m_dwMutedTime (DWORD)
- +0x14: m_nChatIndex (int)
- +0x18: m_nHistoryIndex (int, -1 = not using history)
- +0x1C: m_bUseHistory (int)
- +0x20: m_dwChatTimeStamp[4] (DWORD[4])

## CChatHelper Constants

- History max: 8 entries
- Spam detection: 4 identical messages → 30000ms mute
- Mute duration: 2800ms (0xAF0) after spam
- Spam window: 2000ms (0x7D0) between identical messages
- Recent check interval: 30000ms (0x7530)

## Decompiled Functions (42 total)

### Core Chat (14)
1. `CUIStatusBar::OnCreate` (0x87B5F0) — 14252 bytes — Full WZ setup
2. `CUIStatusBar::ChatLogDraw` (0x877B40) — 7943 bytes — Renders chat log
3. `CUIStatusBar::SetChatType` (0x879C00) — 2221 bytes — Changes chat mode
4. `CUIStatusBar::ChatLogAdd` (0x87AEC0) — 1258 bytes — Adds chat entry
5. `CUIStatusBar::OnKey` (0x87FDE0) — 1473 bytes — Keyboard handler
6. `CUIStatusBar::OnMouseButton` (0x8803F0) — 176 bytes — Mouse handler
7. `CUIStatusBar::OnButtonClicked` (0x880540) — 528 bytes — Button click handler
8. `CUIStatusBar::OnChildNotify` (0x8804A0) — 155 bytes — Child notification
9. `CUIStatusBar::SetChatTarget` (0x87FD30) — 146 bytes — Sets chat target
10. `CUIStatusBar::StartChat` (0x87A4B0) — 98 bytes — Focuses chat input
11. `CUIStatusBar::EndChat` (0x87A520) — 30 bytes — Unfocuses chat input
12. `CUIStatusBar::ChangeChatWndSize` (0x87A540) — 612 bytes — Resizes chat window
13. `CUIStatusBar::MakeCtrlEdit` (0x870BA0) — 1109 bytes — Creates edit/combo controls
14. `CUIStatusBar::_ResetChatBarPos` (0x86DC30) — 522 bytes — Resets chat bar position

### Chat Log Management (5)
15. `CUIStatusBar::_RefreshChatLog` (0x879B70) — 134 bytes — Refreshes chat display
16. `CUIStatusBar::_GetFilteredChatLogCount` (0x86DE40) — 82 bytes — Counts filtered logs
17. `CUIStatusBar::GetChatLog` (0x8775A0) — 974 bytes — Gets chat log array
18. `CUIStatusBar::ConvertWhisperToNormal` (0x8771C0) — 982 bytes — Converts whisper format
19. `CUIStatusBar::CChatLog::IsFiltered` (0x86CD30) — 97 bytes — Checks filter

### Whisper System (6)
20. `CUIStatusBar::GetWhisperTarget` (0x4D97C0) — 41 bytes — Gets whisper target
21. `CUIStatusBar::SetWhisperTarget` (0x871830) — 131 bytes — Sets whisper target
22. `CUIStatusBar::SetWhisperTargetFromCandidate` (0x532150) — 207 bytes — Sets from list
23. `CUIStatusBar::AddWhisperCandidate` (0x879A50) — 280 bytes — Adds to candidate list
24. `CUIStatusBar::ChangeWhisperTarget` (0x87EDA0) — 894 bytes — Dialog to change target
25. `CUIStatusBar::ChangeGroupWhisperTarget` (0x87F120) — 624 bytes — Group whisper dialog

### Message Sending (3)
26. `CUIStatusBar::SendGroupMessage` (0x87F7F0) — 1316 bytes — Sends to group
27. `CUIStatusBar::SendCoupleMessage` (0x87B3E0) — 514 bytes — Sends to spouse
28. `CUIStatusBar::SendClaim` (0x877970) — 121 bytes — Sends claim

### UI Interactions (5)
29. `CUIStatusBar::TryBeginWhisper` (0x87F390) — 1106 bytes — Click whisper icon
30. `CUIStatusBar::TryBeginShowItemInfo` (0x86FBF0) — 532 bytes — Hover item in chat
31. `CUIStatusBar::TryBeginChangeChatWnd` (0x86CE70) — 70 bytes — Start drag resize
32. `CUIStatusBar::TryShowMemoListDlg` (0x8779F0) — 335 bytes — Show memo list
33. `CUIStatusBar::TryUseTempExp` (0x870AA0) — 252 bytes — Use temp EXP

### Filter & Display (4)
34. `CUIStatusBar::_SetFilterButton` (0x86CF80) — 165 bytes — Updates filter buttons
35. `CUIStatusBar::EnableButtons` (0x86CF10) — 99 bytes — Enables/disables buttons
36. `CUIStatusBar::ToggleMaxMinButton` (0x86CEC0) — 67 bytes — Toggle min/max buttons
37. `CUIStatusBar::ProcessToolTip` (0x873140) — 1090 bytes — Shows tooltip on hover

### Status Display (3)
38. `CUIStatusBar::SetStatusValue` (0x873590) — 1979 bytes — Draws level/job/name
39. `CUIStatusBar::SetNumberValue` (0x873D50) — 1336 bytes — Draws HP/MP/EXP bars
40. `CUIStatusBar::FloatNotice` (0x86D430) — 122 bytes — Shows floating notice

### CChatHelper (5)
41. `CChatHelper::CChatHelper` (0x4AA4C0) — 41 bytes — Constructor
42. `CChatHelper::HistoryAdd` (0x4AA090) — 276 bytes — Adds to history
43. `CChatHelper::HistoryUp` (0x4AA230) — 139 bytes — Navigate up
44. `CChatHelper::HistoryDown` (0x4AA2C0) — 141 bytes — Navigate down
45. `CChatHelper::TryChat` (0x4AA550) — 894 bytes — Spam check + send

### Other (2)
46. `CUIStatusBar::HitTest` (0x86D500) — 312 bytes — Hit test for controls
47. `CUIStatusBar::GetEmotionKey` (0x8706E0) — 945 bytes — Parses emotion commands

### Constructor/Destructor (2)
48. `CUIStatusBar::CUIStatusBar` (0x8767C0) — 1147 bytes — Constructor
49. `CUIStatusBar::~CUIStatusBar` (0x871A80) — 1361 bytes — Destructor
