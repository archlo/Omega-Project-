# CUISkill Full IDA Audit — OG 1:1 Reference

## Struct Layout (size=3040, inherits CUIWnd)

```
+0000  CUIWnd                     (base class, 0xB08 bytes)
+0B08  TSingleton<CUISkill>       (singleton pointer)
+0B08  ZArray<long>               m_aSkillRoot          — skill root IDs per tab
+0B0C  ZRef<CCtrlTab>             m_pTab                — tab control
+0B14  ZRef<CCtrlScrollBar>       m_pSBSkill            — scrollbar
+0B1C  ZRef<CCtrlButton>[4]       m_apBtUp              — 4 SP-up buttons
+0B3C  ZRef<CCtrlOriginButton>    m_pBtOpenMacroSkill   — macro button (0x7E7)
+0B44  SKILLROOT                  m_SkillRootVisible    — visible skill root
+0B54  IWzCanvas[2]               m_pCanvasSkill        — skill slot canvases (skill0, skill1)
+0B5C  IWzCanvas                  m_pCanvasRecommendSkill — recommend canvas
+0B60  IWzCanvas                  m_pCanvasLine         — separator line canvas
+0B64  IWzFont                    m_pFont               — font (FONT_SMALL_GRAY)
+0B68  IWzFont                    m_pFontBonus          — font bonus (FONT_SMALL_GRAY)
+0B6C  IWzFont                    m_pFontBookName       — book name font (FONT_SMALL_WHITE)
+0B70  IWzFont                    m_pFontNo             — number font (FONT_NO_BLACK)
+0B74  int                        m_nMouseOver          — hover index (-1 = none)
+0B78  int                        m_bTip                — show tip flag
+0B7C  IWzGr2DLayer[3]            m_pLayerTip           — 3 tip layers
+0B88  int                        m_nMacroUIState       — 0=hidden, 1=visible
+0B8C  ZRef<CUIMacroSys>          m_pUIMacroSys         — macro system
+0B94  int                        m_nTabOption          — tab option (0=normal, 1=extend)
+0B98  int                        m_bDualRogueSkillWarning
+0B9C  ZRef<CCtrlOriginButton>[5] m_pBtSkillGuide       — 5 skill guide buttons
+0BC4  ZRef<CWndSkillGuide>       m_pWndSkillGuide      — skill guide window
+0BCC  CLayoutMan                 m_lm                  — layout manager
```

## Constructor: CUISkill(int bTip, int nTabOption) @ 0x850690

- Calls `CUIWnd::CUIWnd(this, 3, 5, 153, 6, 1, 0, 0)` — creates window at type 3, z-order 5
- **Window size**: 174×281 (from `CreateUIWndPosSaved(this, 174, 281, 10)`)
- Position saved with localStorage key 10
- **Fonts**:
  - `m_pFont` = `get_basic_font(FONT_SMALL_GRAY)`
  - `m_pFontBonus` = `get_basic_font(FONT_SMALL_GRAY)`
  - `m_pFontBookName` = `get_basic_font(FONT_SMALL_WHITE)`
  - `m_pFontNo` = `get_basic_font(FONT_NO_BLACK)`

## OnCreate @ 0x851520 — WZ Loading

### Controls created:
1. **CLayoutMan::Init** — layout manager
2. **CUIMacroSys** — created at `(absLeft+174, absTop)`, shown/hidden based on `m_nMacroUIState`
3. **CCtrlTab** (m_pTab) — id=2000, position=(8,10), size=(154,20), nTabSpace=1, bDrawBaseImage=0
4. **CCtrlScrollBar** (m_pSBSkill) — id=2001, position=(1,8), size=(93,155), nWheelRange=146
5. **4x CCtrlButton** (m_apBtUp[0..3]) — UOL=`UI/UIWindow2.img/Skill/main/BtSpUp`, positions Y=113,153,193,233 (step 40), x=135
6. **CCtrlOriginButton** (m_pBtOpenMacroSkill) — UOL=`UI/UIWindow2.img/Skill/main/BtMacro`, id=0x7E7 (2023)

### WZ canvases loaded:
- `m_pCanvasSkill[0]` ← `UI/UIWindow2.img/Skill/main/skill0`
- `m_pCanvasSkill[1]` ← `UI/UIWindow2.img/Skill/main/skill1`
- `m_pCanvasRecommendSkill` ← `UI/UIWindow2.img/Skill/main/recommend/0`
- `m_pCanvasLine` ← `UI/UIWindow2.img/Skill/main/line`

### Tab images (from SetTabItems):
- Normal tab: `UI/UIWindow2.img/Skill/main/Tab/DualTab/disabled`
- Selected tab: `UI/UIWindow2.img/Skill/main/Tab/DualTab/enabled`

### Initialization sequence:
1. `CCtrlTab::SetTab(m_pTab, m_nOption)` — set initial tab
2. `SetSkillRootList()` — populate skill root list
3. `ResetInfo()` — calls GetSkillRootVisible(1), SetTabItems, SetScrollBar, SetButtons, InvalidateRect
4. If `m_nTabOption == 1`, set tab to last
5. If `m_bTip`, call `CreateTip()`

## SetScrollBar @ 0x84b1c0

```
if (has tabs && GetSkillRootVisible(0) != null)
  skillCount = skillRoot->aSkill.a->count
  if (skillCount > 0)
    scrollbar.range = skillCount - 4  // 4 visible rows
  else
    scrollbar.range = 0  // actually -3, which wraps to 0 via unsigned
else
  scrollbar.range = 0
```

**Key insight**: 4 visible rows at a time (scrollbar range = total - 4).

## SetButtons @ 0x84b220

- If no tabs, hide all 4 buttons: `SetButton(i, 0, 0)` for i=0..3
- Gets current tab's SP count (tab 0 = novice_skill_point, tab 1+ = ExtendSP or nSP)
- Iterates 4 visible rows starting at `m_pSBSkill->m_nCurPos`
- For each visible skill: checks `bUpButtonDisabled`, `nSP > 0`, `GetSkillLevelUpState == 1`
- Calls `SetButton(idx, 1, enabled)` to show/enable, or `SetButton(idx, 0, 0)` to hide

## SetButton @ 0x84a0a0

```
m_apBtUp[nIdx].SetShow(bShow)
m_apBtUp[nIdx].SetEnable(bEnable)
```

## OnChildNotify @ 0x852160

- **nId=2001** (scrollbar), **param1=0x12C..0x130** (300..304): `ResetInfo()` — scroll changed
- **nId=2000** (tab), **param1=500**: `OnTabChanged(param2)` — tab changed
- **param1=100**: `OnButtonClicked(nId)` — button click

## OnTabChanged @ 0x84bfa0

```
m_nOption = nTab
CUIToolTip::ClearToolTip()
GetSkillRootVisible(1)  // reload
SetScrollBar()
SetButtons()
InvalidateRect()
```

## OnButtonClicked @ 0x851480

- **nId 2010..2013** (2010-2013): `OnSkillLevelUpButton(nId - 2010)` — SP up buttons 0-3
- **nId 2023** (0x7E7): `ShiftMacroUIState()` — macro toggle
- **nId 3001..3004**: `OpenSkillGuide(nId - 3000)` — skill guide buttons

## GetSkillIndexFromPoint @ 0x84b390

Hit testing for skill grid:
- Iterates from `m_nCurPos` (scroll offset)
- **Icon hit rect**: left=13, top= startY-31, right=45, bottom= startY+1
- **Full row hit rect**: left=10, top= startY-34, right=149, bottom= startY
- startY starts at **127**, increments by **40** per row
- Stops at **287** (4 rows: 127, 167, 207, 247)

## OnMouseMove @ 0x84b660

- Calls `GetSkillIndexFromPoint(rx, ry, 0)` — full row hit test
- If hover index changed: update `m_nMouseOver`, `InvalidateRect()`
- Shows skill tooltip via `CUIToolTip::SetToolTip_Skill()`

## ResetInfo @ 0x8514f0

```
GetSkillRootVisible(1)  // reload
SetTabItems()
SetScrollBar()
SetButtons()
InvalidateRect()
```

## ShiftMacroUIState @ 0x84a040

```
m_nMacroUIState = !m_nMacroUIState
if (now hidden): SetShow(0), SetEnable(0)
if (now visible): SetShow(1), SetEnable(1)
CUIMacroSys::ResetInfo()
```

## CreateTip @ 0x84fdd0

Creates 3 balloon tip layers using `UIHelper::MakeBalloonTip()`:
- **Tip 0**: StringPool IDs 0x10F5-0x10F8 (4 lines), position=(97, 14), type=1
- **Tip 1**: StringPool IDs 4345-4348 (4 lines), position=(147, 119), type=2
- **Tip 2**: StringPool IDs 4349-4352 (4 lines), position=(100, 271), type=0

## OnSkillLevelUpButton @ 0x84d660

Master skill level-up handler:
1. Checks: admin/manager/tester bypass, HP > 0, 500ms cooldown
2. Gets skill entry at `nIdx + m_pSBSkill->m_nCurPos`
3. Checks `GetSkillLevelUpState == 1` and `!bUpButtonDisabled`
4. Admin/manager/tester → skip all checks, send directly
5. For dual jobs: `CanSkillUpDualJob()` → notice dialog if fail
6. For normal jobs: `CanSkillUp()` → notice dialog if fail
7. Dual rogue warning dialog (first time, skills 4000000/4001002/4001003/4001334)
8. SP cap check: `GetMySkillDegreeSP` vs `GetMaxSkillDegreeSP` → YesNo dialog
9. Sends `CWvsContext::SendSkillUpRequest(nSkillID)`

## Destroy @ 0x84a660

- Removes from `CWvsContext` window array
- Releases all WZ resources, fonts, canvases, layers
- Releases macro system, skill guide, buttons, scrollbar, tab

## Key OG Coordinates Summary

| Element | X | Y | W | H |
|---------|---|---|---|---|
| Window | — | — | 174 | 281 |
| Tab control | 8 | 10 | 154 | 20 |
| Scrollbar | 1 | 8 | 93 | 155 |
| SP Up button 0 | 135 | 113 | — | — |
| SP Up button 1 | 135 | 153 | — | — |
| SP Up button 2 | 135 | 193 | — | — |
| SP Up button 3 | 135 | 233 | — | — |
| Macro button | 0 | 0 (via LayoutMan) | — | — |
| Skill row start Y | — | 127 | — | — |
| Skill row step | — | +40 | — | — |
| Skill row end Y | — | 287 | — | — |
| Icon hit rect | 13 | y-31 | 32 | 32 |
| Row hit rect | 10 | y-34 | 139 | 34 |

## WZ Paths

| Path | Purpose |
|------|---------|
| `UI/UIWindow2.img/Skill/main/backgrnd` | Background (via CUIWnd base) |
| `UI/UIWindow2.img/Skill/main/skill0` | Skill slot canvas (normal) |
| `UI/UIWindow2.img/Skill/main/skill1` | Skill slot canvas (selected) |
| `UI/UIWindow2.img/Skill/main/recommend/0` | Recommend skill canvas |
| `UI/UIWindow2.img/Skill/main/line` | Separator line |
| `UI/UIWindow2.img/Skill/main/BtSpUp` | SP up button (4 instances) |
| `UI/UIWindow2.img/Skill/main/BtMacro` | Macro toggle button |
| `UI/UIWindow2.img/Skill/main/Tab/DualTab/disabled` | Normal tab image |
| `UI/UIWindow2.img/Skill/main/Tab/DualTab/enabled` | Selected tab image |

## Button IDs

| ID | Purpose |
|----|---------|
| 2000 | Tab control |
| 2001 | Scrollbar |
| 2010 | SP up button 0 |
| 2011 | SP up button 1 |
| 2012 | SP up button 2 |
| 2013 | SP up button 3 |
| 2023 (0x7E7) | Macro toggle |
| 3001 | Skill guide 1 |
| 3002 | Skill guide 2 |
| 3003 | Skill guide 3 |
| 3004 | Skill guide 4 |
