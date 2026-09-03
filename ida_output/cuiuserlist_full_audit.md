# CUIUserList Full IDA Audit — OG 1:1 Reference

## Struct Layout (size=3260, inherits CUIWnd)

```
+0000  CUIWnd
+0B08  TSingleton<CUIUserList>
+0B08  ZXString<char>           m_sLocationInfo
+0B0C  ZRef<CCtrlTab>           m_pTab              — tab control (6 tabs)
+0B14  ZRef<CCtrlScrollBar>     m_pSB               — scrollbar
+0B1C  int                      m_nCurTab           — current tab index
+0B20  ZRef<CCtrlButton>[6]     m_pBtGuild_Dynamic  — guild action buttons
+0B50  ZRef<CCtrlButton>[15]    m_pBtAlliance_Dynamic — alliance action buttons
+0BC8  int                      m_nItem
+0BCC  int                      m_nViewItem
+0BD0  int                      m_nToggleTime
+0BD4  tagRECT                  rcOnlineCount
+0BE4  tagRECT                  rcOfflineCount
+0BF4  tagRECT                  rcTotalCount
+0C04  tagRECT[5]               rcAlliance
+0C54  int                      m_bGuildGradeShown
+0C58  int                      m_bAllianceGradeShown
+0C5C  unsigned int             m_dwCurCID
+0C60  ZXString<char>           m_sCurGroup
+0C64  CTabFriend *             m_pTabFriend
+0C68  CTabParty *              m_pTabParty
+0C6C  CTabGuild *              m_pTabGuild
+0C70  CTabGuildAlliance *      m_pTabGuildAlliance
+0C74  CWndGuildGrade *         m_pWndGuildGrade
+0C78  CTabBlackList *          m_pTabBlackList
+0C7C  TabExpedition *          m_pTabExpedition
+0C80  IWzFont                  m_pFontWhite
+0C84  IWzFont                  m_pFontBlack
+0C88  IWzFont                  m_pFontGray
+0C8C  IWzFont                  m_pFontGray_B5
+0C90  IWzFont                  m_pFontGray_77
+0C94  IWzFont                  m_pFontGroupName
+0C98  IWzFont                  m_pFontBlocked
+0C9C  IWzFont                  m_pFontOnline
+0CA0  IWzFont                  m_pFontOffline
+0CA4  IWzFont                  m_pFontLocation
+0CA8  CLayoutMan               m_lm
```

## Constructor: CUIUserList(int nDefaultTab) @ 0x8d0b70

- `CUIWnd::CUIWnd(this, 7, 5, 244, 7, 1, 0, 0)`
- **Window size**: 264×382 (from `CreateUIWndPosSaved(this, 264, 382, 10)`)
- Position saved with localStorage key 10
- Default tab from parameter
- **10 fonts**: White, Black, Gray, Gray_B5, Gray_77, GroupName, Blocked, Online, Offline, Location

## Tab Structure (6 tabs)

| Index | Tab | Class | Buttons |
|-------|-----|-------|---------|
| 0 | Friend | CTabFriend | 15 buttons (m_pBtFriend[15]), button 13 hidden |
| 1 | Party | CTabParty | 9 buttons (m_pBtParty[9]) |
| 2 | Expedition | TabExpedition | Controls activated on tab |
| 3 | Guild | CTabGuild | 13 buttons (m_pBtGuild[13]) |
| 4 | Alliance | CTabGuildAlliance | 11 buttons (m_pBtGuildAlliance[11]) |
| 5 | BlackList | CTabBlackList | 2 buttons (m_pBtBlackList[2]) |

## Scrollbar (SetScrollBar @ 0x8b7920)

| Tab | X | Y | Height | Scroll formula |
|-----|---|---|--------|----------------|
| 0 (Friend) | 243 | 115 | varies (m_nListHeight) | range = (0 + 20*nViewItem - listHeight) / 20 + 2 |
| 1 (Party) | 243 | 60 | 225 | range = 0 (no scroll) |
| 3 (Guild) | 243 | 100 | 185 | range = (105 + 20*nViewItem - 185) / 20 + 2 |
| 4 (Alliance) | 243 | 100 | 185 | range = (105 + 20*nViewItem - 185) / 20 + 2 |
| 5 (BlackList) | 243 | 60 | 228 | range = (27 + 20*nViewItem - 228) / 20 + 2 |
| Other | 243 | -1000 | 0 | hidden |

- **Wheel range**: 235
- **Row height**: 20px per item
- **Scrollbar id**: 2000

## OnTabChanged @ 0x8dc580

| Tab | Action |
|-----|--------|
| 0 | Hide guild grade, delete alliance notice |
| 1, 5 | Hide guild grade, hide alliance grade, release guild/alliance notice layers |
| 2 | Hide guild grade, delete guild notice, release alliance notice |
| 3 | Hide alliance grade, release alliance notice |
| 4 | Hide guild grade, delete guild notice |
| All | ResetInfo(), m_dwCurCID = 0 |

## OnChildNotify @ 0x8dc6e0

- **nId=2001, param1=500**: Tab changed → OnTabChanged(param2)
- **nId=2207, param1=101, param2=1**: Party tooltip (StringPool 0x1656)
- **nId=2000, param1=300-304**: Scroll changed → DestroyGuildButton(-1), DestroyAllianceButton(-1), InvalidateRect
- **param1=100**: Button click → OnButtonClicked(nId)

## SetButton @ 0x8b76e0

Hides ALL buttons first, then shows only current tab's buttons:
- Tab 0: Show 15 Friend buttons (except button 13)
- Tab 1: Show 9 Party buttons
- Tab 3: Show 13 Guild buttons
- Tab 4: Show 11 GuildAlliance buttons
- Tab 5: Show 2 BlackList buttons

## OnButtonClicked @ 0x8da370

Routes to all 6 tab OnButtonClicked methods, then:
- **nId=1000**: Destroy CWndGuildBoard singleton

## ResetInfo @ 0x8dbf60

1. Hide expedition controls
2. Load data for current tab:
   - Tab 0: CTabFriend::LoadData
   - Tab 1: CTabParty::LoadData
   - Tab 2: Activate expedition controls
   - Tab 3: CTabGuild::LoadData + invalidate guild grade
   - Tab 4: CTabGuildAlliance::LoadData + load alliance grade
   - Tab 5: CTabBlackList::LoadData
3. SetScrollBar(0), SetButton()
4. DestroyGuildButton(-1), DestroyAllianceButton(-1)
5. InvalidateRect

## WZ Path: `UI/UIWindow2.img/UserList/Main`

## OnCreate @ 0x8db080 (25K chars, headless IDA dump)

### Controls created:
1. **CLayoutMan::Init** — layout manager
2. **Tab control**: id=2001, position=(8,9), width=250, 6 tab items loaded via `AddItem_Canvas` with normal/selected list canvases
3. **Scrollbar**: `CCtrlScrollBar` created
4. **10 fonts** via `get_basic_font`:
   - FONT_DODOOMCHE_11_WHITE — white text
   - FONT_DODOOMCHE_11_BLACK — black text
   - FONT_DODOOMCHE_11_GRAY90 — gray text (90% opacity)
   - Plus 7 more fonts (Gray_B5, Gray_77, GroupName, Blocked, Online, Offline, Location)
5. **Tab canvases**: Normal and selected list canvases loaded for each tab
6. **6 tab objects created**: CTabFriend, CTabParty, CTabGuild, CTabGuildAlliance, CTabBlackList, TabExpedition

## Draw (delegated to tabs)

Draw creates 3 canvases and delegates to tab-specific Draw:
- Canvas 1 (pCanvasList): sized by tab's m_nLineWidth × m_nListHeight
- Canvas 2 (pCanvasRest): 0x108 (264) × 0x17E (382)
- Calls CTabFriend::Draw(pCanvas, pCanvasList, pCanvasRest) for tab 0

Location info drawn using StringPool IDs 1771/1772 + CItemInfo::GetMapString.

## Key Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| Row height | 20px | Per-item height in list |
| Scrollbar X | 243 | Fixed X position |
| Wheel range | 235 | Scroll wheel range |
| Button id 1000 | Guild board | Destroy guild board |
| nId 2001 + param1 500 | Tab changed | Routes to OnTabChanged |
| nId 2000 + param1 300-304 | Scroll | Refreshes buttons |
| nId 2207 + param1 101 | Party tooltip | StringPool 0x1656 |
