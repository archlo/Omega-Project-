# CUIStat Full IDA Audit — OG 1:1 Reference

## Struct Layout (size=3008, inherits CUIWnd)

```
+0000  CUIWnd                     (base class)
+0B08  TSingleton<CUIStat>
+0B08  ZRef<CCtrlOriginButton>[6] m_pBtApUp       — HP/MP/STR/DEX/INT/LUK up buttons
+0B38  ZRef<CCtrlOriginButton>[3] m_pBtAutoApUp    — Auto AP分配 buttons (3 modes)
+0B50  ZRef<CUIStatDetail>       m_pUIStatDetail   — detail window
+0B58  IWzFont                   m_pFont           — FONT_SMALL_GRAY
+0B5C  IWzFont                   m_pFontNo         — FONT_SMALL_GRAY
+0B60  CToolTipHelper            m_ttHelper        — tooltip helper
+0B80  IWzFont                   m_pFontCategory   — category font
+0B84  IWzProperty               m_pStatJob        — job stat property
+0B88  int                       m_bTip            — show tip flag
+0B8C  IWzGr2DLayer[4]           m_pLayerTip       — 4 tip layers
+0B9C  IWzCanvas[4]              m_apCanvasDisabled — disabled state canvases
+0BAC  CLayoutMan                m_lm              — layout manager
```

## Constructor: CUIStat(int bTip) @ 0x867750

- `CUIWnd::CUIWnd(this, 2, 5, 150, 6, 1, 0, 0)`
- **Window size**: 172×337 (from `CreateUIWndPosSaved(this, 172, 337, 10)`)
- Position saved with localStorage key 10
- **Fonts**:
  - `m_pFont` = `get_basic_font(FONT_SMALL_GRAY)`
  - `m_pFontNo` = `get_basic_font(FONT_SMALL_GRAY)`

## OnCreate @ 0x867b90 — WZ Loading + Controls

### WZ Path: `UI/UIWindow2.img/Stat/main`

### Buttons created via CLayoutMan::AddButton:

| Button | UOL | ID (hex) | ID (dec) | Purpose |
|--------|-----|----------|----------|---------|
| HP Up | `BtHpUp` | 0x7D0 | 2000 | HP+1 |
| MP Up | `BtMpUp` | 0x7D1 | 2001 | MP+1 |
| STR Up | `BtStrUp` | 0x7D2 | 2002 | STR+1 |
| DEX Up | `BtDexUp` | 0x7D3 | 2003 | DEX+1 |
| INT Up | `BtIntUp` | 0x7D4 | 2004 | INT+1 |
| LUK Up | `BtLukUp` | 0x7D5 | 2005 | LUK+1 |
| Detail | `BtDetailOpen` | 0x7D6 | 2006 | Toggle detail window |
| Auto | `BtAuto` | 0x7D7 | 2007 | Auto AP分配 (mode 1) |
| Auto1 | `BtAuto1` | 0x7D8 | 2008 | Auto AP分配 (mode 1) |
| Auto2 | `BtAuto2` | 0x7D9 | 2009 | Auto AP分配 (mode 0) |

### Initialization sequence:
1. `CLayoutMan::Init(&m_lm, this, 0, 0)`
2. Create 6 AP Up buttons (BtHpUp through BtLukUp)
3. Create 3 Auto AP buttons (BtAuto, BtAuto1, BtAuto2) with tooltips via StringPool 1988/1989/1990
4. Create Detail toggle button (BtDetailOpen)
5. `RestoreButtons()` — show/hide based on job
6. `EnableApUpButton()` — enable/disable based on AP
7. Load tooltip helper via StringPool 1993
8. If `m_nOption == 1`: create CUIStatDetail at (absLeft+172, absTop+90)
9. If `m_bTip`: `CreateTip()`
10. Load disabled canvases: `UI/UIWindow2.img/Stat/main/Disabled/<statName>` for each stat

### Disabled canvases loaded:
- Loop over `CUIStat::ms_aStatName` array (4 stat names)
- Each loaded from `UI/UIWindow2.img/Stat/main/Disabled/<name>`

## OnButtonClicked @ 0x868610

| ID | Action |
|----|--------|
| 0x7D0 (2000) | `SendAbilityUpRequest(0x800)` — HP |
| 0x7D1 (2001) | `SendAbilityUpRequest(0x2000)` — MP |
| 0x7D2 (2002) | `SendAbilityUpRequest(0x40)` — STR |
| 0x7D3 (2003) | `SendAbilityUpRequest(0x80)` — DEX |
| 0x7D4 (2004) | `SendAbilityUpRequest(0x100)` — INT |
| 0x7D5 (2005) | `SendAbilityUpRequest(0x200)` — LUK |
| 0x7D6 (2006) | `ToggleDetail()` — toggle detail window |
| 0x7D7 (2007) | `AutoApUp(1)` — auto AP分配 mode 1 |
| 0x7D8 (2008) | `AutoApUp(1)` — auto AP分配 mode 1 |
| 0x7D9 (2009) | `AutoApUp(0)` — auto AP分配 mode 0 |

## EnableApUpButton @ 0x861860

- If `nAP == 0`: disable all 6 AP up buttons + 3 auto buttons
- If `nLevel < 20`: disable STR/DEX buttons (indices 2-3)
- Auto button visibility logic:
  - Job category 8 or 9 (Aran/Mercedes): show BtAuto1 (index 1)
  - Job == 500 (Evan): show BtAuto (index 0)
  - Others: show BtAuto2 (index 2)

## RestoreButtons @ 0x861aa0

- If job is beginner (job%1000==0) or Evans (job==2001) AND level <= 10:
  - Hide all 6 AP up buttons + 3 auto buttons
- Otherwise: show all

## ResetInfo @ 0x862380

```
RestoreButtons()
EnableApUpButton()
InvalidateRect()
if (m_pUIStatDetail) InvalidateRect(m_pUIStatDetail)
```

## ToggleDetail @ 0x8684e0

- If detail exists: Destroy it, set m_nOption=0
- If detail doesn't exist: Create CUIStatDetail at (absLeft+172, absTop+90), set m_nOption=1

## OnMouseMove @ 0x8649d0

- EXP tooltip: if mouse in rect (55, 138, 55+109, 138+13):
  - Shows "EXP: current / needed" via StringPool 0x1A37
  - Uses `CUIToolTip::SetToolTip_String`
- Otherwise: `CToolTipHelper::CheckAndShow` for stat tooltips
  - Beginner/Evans level <= 10: tooltip type 8
  - Others: tooltip type 0

## CreateTip @ 0x866530

- Creates 4 balloon tip layers via `UIHelper::MakeBalloonTip`
- StringPool IDs and positions from the decompilation

## CUIStatDetail (separate class)

- Created at (absLeft+172, absTop+90) — to the right of main stat window
- Toggle via BtDetailOpen (id 0x7D6)

## Key OG Coordinates

| Element | X | Y | Notes |
|---------|---|---|-------|
| Window | — | — | 172×337 |
| AP Up buttons | via LayoutMan | via LayoutMan | 6 buttons |
| Auto AP buttons | via LayoutMan | via LayoutMan | 3 buttons |
| Detail toggle | via LayoutMan | via LayoutMan | 1 button |
| Detail window | +172 from main | +90 from main | CUIStatDetail |
| EXP tooltip area | 55 | 138 | 109×13 |

## SendAbilityUpRequest bitmask values

| Stat | Bitmask |
|------|---------|
| STR | 0x40 |
| DEX | 0x80 |
| INT | 0x100 |
| LUK | 0x200 |
| HP | 0x800 |
| MP | 0x2000 |

## WZ Paths

| Path | Purpose |
|------|---------|
| `UI/UIWindow2.img/Stat/main` | Base WZ path |
| `UI/UIWindow2.img/Stat/main/BtHpUp` | HP up button |
| `UI/UIWindow2.img/Stat/main/BtMpUp` | MP up button |
| `UI/UIWindow2.img/Stat/main/BtStrUp` | STR up button |
| `UI/UIWindow2.img/Stat/main/BtDexUp` | DEX up button |
| `UI/UIWindow2.img/Stat/main/BtIntUp` | INT up button |
| `UI/UIWindow2.img/Stat/main/BtLukUp` | LUK up button |
| `UI/UIWindow2.img/Stat/main/BtAuto` | Auto AP button |
| `UI/UIWindow2.img/Stat/main/BtAuto1` | Auto AP button 1 |
| `UI/UIWindow2.img/Stat/main/BtAuto2` | Auto AP button 2 |
| `UI/UIWindow2.img/Stat/main/BtDetailOpen` | Detail toggle |
| `UI/UIWindow2.img/Stat/main/Disabled/<stat>` | Disabled stat canvases |
