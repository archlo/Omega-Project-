# CUIItem Full IDA Audit — Complete OG Function Map + Implementation Gap Analysis

## Function Map (27 functions, all in 0x7CBAF0–0x7CE2A8 range)

| # | Function | Addr | Size | TS Status |
|---|----------|------|------|-----------|
| 1 | `CUIItem::CUIItem()` | 0x7cce00 | 0x145 (325) | Partial |
| 2 | `CUIItem::~CUIItem()` | 0x7cbc80 | 0x16f (367) | Missing |
| 3 | `CUIItem::SetItemTI(long)` | 0x7cbac0 | 0x2e (46) | Missing (uses TAB_TO_INVTYPE mapping) |
| 4 | `CUIItem::ItemTI_2_TabIndex(long)` | 0x7cbaf0 | 0x1e (30) | Missing (INVTYPE_TO_TAB) |
| 5 | `CUIItem::OnGather()` | 0x7cbb40 | 0x2f (47) | Callback wired |
| 6 | `CUIItem::OnSort()` | 0x7cbb70 | 0x2f (47) | Callback wired |
| 7 | `CUIItem::Toggle()` | 0x7cbba0 | 0x64 (100) | **Bug: OG destroys + recreates** |
| 8 | `CUIItem::SetTryToReleaseItem(int,long)` | 0x7cbc10 | 0x32 (50) | Partial (missing cursor) |
| 9 | `CUIItem::ChangeTab(long)` | 0x7cbc50 | 0x22 (34) | Partial |
| 10 | `TSingleton<CUIItem>::~TSingleton()` | 0x7cbb10 | 0xb (11) | N/A |
| 11 | `CUIItem::~CUIItem()` | 0x7cbc80 | 0x16f (367) | Missing |
| 12 | `CUIItem::GetRTTI()` | 0x7cbdf0 | 0x6 (6) | N/A (C++ RTTI) |
| 13 | `CUIItem::IsKindOf(CRTTI*)` | 0x7cbe10 | 0x25 (37) | N/A (C++ RTTI) |
| 14 | `CUIItem::OnDestroy()` | 0x7cbe40 | 0x42 (66) | Missing |
| 15 | `CUIItem::GetItemSlotRect(long,RECT*)` | 0x7cbe90 | 0x11c (284) | **Bug: extended math wrong** |
| 16 | `CUIItem::`vector deleting destructor'` | 0x7cbfb0 | 0x20 (32) | N/A |
| 17 | `CUIItem::OnDropMoney()` | 0x7cbfd0 | 0x242 (578) | Callback wired |
| 18 | `CUIItem::GetSlotPositionFromPoint(long,long)` | 0x7cc220 | 0xd6 (214) | Present |
| 19 | `CUIItem::ItemRelease(long,GW_ItemSlotBase**)` | 0x7cc300 | 0x1e5 (485) | **Missing** |
| 20 | `CUIItem::OnButtonClicked(uint)` | 0x7cc4f0 | 0xa0 (160) | Present |
| 21 | `CUIItem::OnMouseButton(uint,uint,long,long)` | 0x7cc590 | 0x500 (1280) | **Incomplete** |
| 22 | `CUIItem::OnMouseMove(long,long)` | 0x7cca90 | 0x200 (512) | Present |
| 23 | `CUIItem::SetArrangeButton(long,long)` | 0x7ccc90 | 0xf9 (249) | Present |
| 24 | `CUIItem::_GetBackgroundUOL()` | 0x7ccd90 | 0x69 (105) | Missing |
| 25 | `CUIItem::CUIItem()` | 0x7cce00 | 0x145 (325) | See above |
| 26 | `CUIItem::Draw(tagRECT*)` | 0x7ccf50 | 0x976 (2422) | **Incomplete** |
| 27 | `CUIItem::SetLastestGetItemEffect()` | 0x7cd8d0 | 0x9d8 (2520) | **Missing** |

---

## Constructor Deep Analysis (0x7cce00)

```cpp
CUIItem::CUIItem() {
  // Base: CUIWnd(this, nReserved1=0, nReserved2=5, nReserved3=150, nReserved4=6, nID=1, 0, 0)
  CUIWnd::CUIWnd(this, 0, 5, 150, 6, 1, 0, 0);
  
  // Singleton setup
  TSingleton<CUIItem>::ms_pInstance = this;
  
  // Three vtables (IGObj, IUIMsgHandler, ZRefCounted)
  this->vftable_IGObj = &CUIItem::vftable_IGObj;
  this->vftable_IUIMsgHandler = &CUIItem::vftable_IUIMsgHandler;
  this->vftable_ZRefCounted = &CUIItem::vftable_ZRefCounted;
  
  // Null all control pointers
  m_pTab.p = nullptr;           // +0xB08 CCtrlTab
  m_pSBItem.p = nullptr;        // +0xB10 CCtrlScrollBar
  m_pBtArrange.p = nullptr;     // +0xB18 CCtrlOriginButton
  m_pBtExtend.p = nullptr;      // +0xB20 CCtrlOriginButton
  m_pBtCashShop.p = nullptr;    // +0xB28 CCtrlOriginButton
  
  // Null image font + canvas refs
  m_pImgFontNumber.m_pInterface = nullptr;           // +0xB2C
  m_pCanvasDisabled.m_pInterface = nullptr;           // +0xB30
  m_pLastestItemTabEffectLayer.m_pInterface = nullptr; // +0xB34
  m_pLastestItemSlotEffectLayer.m_pInterface = nullptr; // +0xB38
  
  m_nLastestGetItemID = 0;  // +0xB3C
  
  // Layout manager zero-init
  m_lm.m_pWnd = nullptr;
  m_lm.m_nOffsetX = 0;
  m_lm.m_nOffsetY = 0;
  m_lm.m_aLayer.a = nullptr;
  m_lm.m_aButton.a = nullptr;
  
  // Read expanded state from config
  m_bExtended = CConfig::GetInventoryExpanded();
  m_nBtCloseX = m_bExtended ? 574 : 150;
  
  // Create window with position saving (key=10)
  CUIWnd::CreateUIWndPosSaved(this, m_bExtended ? 594 : 172, 293, 10);
  
  // Set initial tab (m_nOption + 1)
  SetItemTI(m_nOption + 1);
  
  m_nLastestGetItemID = 0;
  m_nLastestGetItemPos = 0;
}
```

### Constructor Key Findings
1. **CUIWnd params**: `(0, 5, 150, 6, 1, 0, 0)` — NOT x,y,w,h directly. These are CUIWnd-specific reserved params.
2. **No CLayoutMan::Init call** — m_lm is zero-initialized inline, not via Init(). This is different from ChatBar which calls `CLayoutMan::Init`.
3. **SetItemTI(m_nOption + 1)** — initial tab from window option, not hardcoded to 0.
4. **CreateUIWndPosSaved(key=10)** — position persisted with key 10 in localStorage.
5. **m_nBtCloseX**: 574 (extended) vs 150 (collapsed) — close button X position.

---

## Toggle Deep Analysis (0x7cbba0)

```cpp
void CUIItem::Toggle() {
  m_bExtended = !m_bExtended;
  CConfig::SetInventoryExpanded(m_bExtended);
  CWnd::Destroy(this);  // ← DESTROYS THE ENTIRE WINDOW
  int w = m_bExtended ? 594 : 172;
  m_nBtCloseX = m_bExtended ? 574 : 150;
  CUIWnd::CreateUIWndPosSaved(this, w, 293, 10);  // ← RECREATES IT
}
```

### CRITICAL BUG: Current TS `_setExtended` does NOT destroy/recreate
The OG Toggle **destroys the entire CWnd and recreates it**. This means:
- All child controls (tabs, scrollbar, buttons) are destroyed and re-created
- The window position is re-loaded from saved state
- Any transient state (tooltip, effects) is cleared

**Current TS code** just toggles `_extended` and calls `_rebuild()`. This is fundamentally wrong — the OG destroys and recreates the entire window.

---

## SetArrangeButton Deep Analysis (0x7ccc90)

```cpp
void CUIItem::SetArrangeButton(int nTI, int nState) {
  m_anSortBtState[nTI] = nState;
  if (nTI == m_nItemTI) {  // Only update if it's the ACTIVE tab
    if (nState == 0) {
      // Add BtGather button (WZ: UI/UIWindow2.img/Item/BtGather, nId=0x7D3)
      m_pBtArrange = CLayoutMan::AddButton(&m_lm, "UI/UIWindow2.img/Item/BtGather", 0x7D3, 0, 0, nullptr);
    } else if (nState == 1) {
      // Add BtSort button (WZ: UI/UIWindow2.img/Item/BtSort, nId=0x7D4)
      m_pBtArrange = CLayoutMan::AddButton(&m_lm, "UI/UIWindow2.img/Item/BtSort", 0x7D4, 0, 0, nullptr);
    }
  }
}
```

### Key Findings
1. **Dynamic button creation** — OG doesn't toggle visibility, it DESTROYS and RECREATES the button via CLayoutMan::AddButton
2. **WZ paths confirmed**: `UI/UIWindow2.img/Item/BtGather` and `UI/UIWindow2.img/Item/BtSort`
3. **Button IDs**: 0x7D3 (Gather), 0x7D4 (Sort) — matches OnButtonClicked switch
4. **Only updates if active tab** — m_anSortBtState stores per-tab state, but UI only updates for current tab

---

## GetItemSlotRect Deep Analysis (0x7cbe90)

```cpp
int CUIItem::GetItemSlotRect(int nSlotPosition, tagRECT *pRc) {
  CharacterData *p = CWvsContext::GetCharacterData();
  ZRef<GW_ItemSlotBase> *a = p->aaItemSlot[m_nItemTI].a;
  if (a) a = a[-1].p;  // Get count from array header
  
  if (!m_bExtended) {
    // Collapsed: only show slots in range [m_nFirstPosition, m_nFirstPosition+24)
    // (24 = 4 cols × 6 rows)
    if (nSlotPosition < m_nFirstPosition || nSlotPosition >= m_nFirstPosition + 24)
      if (nSlotPosition >= a) { SetRectEmpty(pRc); return 0; }
  }
  
  // Calculate grid cell
  int offset = nSlotPosition - m_nFirstPosition;
  int row = offset / 4;
  int col = offset % 4;
  
  if (m_bExtended) {
    // Extended: col += 4 * (row / 6), row %= 6
    // This maps to 2 blocks of 4 cols × 6 rows
    if (row >= 6) {
      int block = row / 6;
      row %= 6;
      col += 4 * block;
    }
  }
  
  SetRect(pRc, 36*col + 10, 35*row + 51, 36*col + 42, 35*row + 83);
  return 1;
}
```

### CRITICAL BUG: Extended grid is 8 cols (2 blocks of 4), NOT 16 cols (4 blocks of 4)
- `col += 4 * (row / 6)` means max col = 4 + 4 = **8 columns**
- Current TS has `FULL_COLS = 16` which is WRONG
- OG extended = 8 cols × 6 rows = **48 slots per page** (not 96)
- But total extended slots could be more if there are multiple pages

### Layout Constants (confirmed from decompilation)
- **GRID_X** = 10 (SetRect left offset)
- **GRID_Y** = 51 (SetRect top offset)
- **SLOT_W** = 32 (42 - 10)
- **SLOT_H** = 32 (83 - 51)
- **SLOT_STEP_X** = 36 (36 * col)
- **SLOT_STEP_Y** = 35 (35 * row)
- **COLS** = 4 (collapsed)
- **FULL_COLS** = 8 (extended, 2 blocks of 4)
- **ROWS** = 6

---

## OnButtonClicked Deep Analysis (0x7cc4f0)

```cpp
void CUIItem::OnButtonClicked(unsigned int nId) {
  switch (nId) {
    case 0x7D2: OnDropMoney(); break;         // BtCoin — drop meso
    case 0x7D3: OnGather(); break;            // BtGather — gather items
    case 0x7D4: OnSort(); break;              // BtSort — sort items
    case 0x7D5:                               // BtFull — expand
    case 0x7D6: Toggle(); break;              // BtSmall — collapse
    case 0x7D7:                               // BtCashshop
      int v2 = 0;
      switch (m_nItemTI) {
        case 1: v2 = 50200093; break;  // Equip → 50200093
        case 2: v2 = 50200094; break;  // Use → 50200094
        case 4: v2 = 50200095; break;  // Setup → 50200095
      }
      // Store cash shop subId at CWvsContext+4147*4
      *((DWORD*)CWvsContext::ms_pInstance + 4147) = v2;
      CWvsContext::SendMigrateToShopRequest(0);
      break;
    default: CUIWnd::OnButtonClicked(nId); break;
  }
}
```

### Button ID Map (confirmed)
| ID | Hex | Button | Action |
|----|-----|--------|--------|
| 2002 | 0x7D2 | BtCoin | OnDropMoney |
| 2003 | 0x7D3 | BtGather | OnGather |
| 2004 | 0x7D4 | BtSort | OnSort |
| 2005 | 0x7D5 | BtFull | Toggle (expand) |
| 2006 | 0x7D6 | BtSmall | Toggle (collapse) |
| 2007 | 0x7D7 | BtCashshop | Cash Shop migrate |

### Cash Shop SubIds (confirmed)
- Equip tab (TI=1) → 50200093
- Use tab (TI=2) → 50200094
- Setup tab (TI=4) → 50200095
- Etc (TI=3) and Cash (TI=5) → 0 (disabled)

---

## SetTryToReleaseItem Deep Analysis (0x7cbc10)

```cpp
void CUIItem::SetTryToReleaseItem(int bTryToReleaseItem, int nReleaseUItemPos) {
  m_bTryToReleaseItem = bTryToReleaseItem;
  m_nReleaseUItemPos = nReleaseUItemPos;
  if (bTryToReleaseItem)
    CInputSystem::SetCursorState(14);  // ← CURSOR CHANGE!
  else
    CInputSystem::SetCursorState(0);   // ← Back to normal cursor
}
```

### Bug: TS doesn't change cursor
The OG sets cursor state 14 (release/scissors cursor) when entering release mode, and cursor 0 (normal) when exiting. Current TS code has a comment about this but doesn't implement it.

---

## ChangeTab Deep Analysis (0x7cbc50)

```cpp
void CUIItem::ChangeTab(int nTab) {
  CCtrlTab::SetTab(m_pTab.p, nTab);
  SetTryToReleaseItem(0, -1);  // Clear release mode on tab change
}
```

### Simple but important — tab change always clears release mode.

---

## Missing Functions (Critical)

### OnCreate (NOT FOUND in IDA — likely inlined or inherited from CUIWnd)
The constructor calls `CUIWnd::CUIWnd()` then `CreateUIWndPosSaved()`. The actual control creation (tabs, scrollbar, buttons) likely happens inside `CreateUIWndPosSaved` or in a separate `OnCreate` that's been inlined. The ChatBar audit showed `OnCreate` as a separate function with 113K chars — CUIItem may have had its creation logic merged into the constructor by the optimizer.

### OnChildNotify (NOT FOUND — likely inlined)
Referenced at 0x4d5b60 from search_text results. The function exists but may have been inlined or have a different signature than expected. Key behavior from session summary: nId=2000/param1=500→tab change; nId=2001/param1=300..320→scroll; param1=101→tooltip; param1=100→click.

### ItemRelease (0x7cc300, 0x1e5 bytes) — NOT IMPLEMENTED
Full item release flow: white scrolls, karma scissors, etc. The TS has `onItemRelease` callback but the OG has a 485-byte function that handles the complete flow internally.

### SetLastestGetItemEffect (0x7cd8d0, 0x9d8 bytes) — NOT IMPLEMENTED
2520-byte function for the "new item" glow effect. The TS has partial `_updateEffects` but the OG function is massive and handles tab effects, slot effects, and timing.

### Draw (0x7ccf50, 0x976 bytes) — INCOMPLETE
2422-byte draw function. The TS has `_rebuildGrid` which handles slot rendering, but the OG Draw function handles:
- Background rendering (collapsed/extended)
- Tab rendering with WZ assets
- Scrollbar positioning
- Meso display
- Title text
- All slot backgrounds, icons, quantities
- Grade frames
- Disabled overlays
- Active use-slot indicator

---

## Implementation Gaps Summary

### CRITICAL (functional correctness)
1. **Toggle destroys/recreates** — TS just toggles flag + rebuilds. OG destroys entire window and recreates.
2. **Extended grid = 8 cols, not 16** — `col += 4 * (row / 6)` means 2 blocks of 4.
3. **SetTryToReleaseItem cursor** — OG changes cursor to state 14, TS doesn't.
4. **SetArrangeButton recreates buttons** — OG destroys old button and creates new via CLayoutMan::AddButton. TS just toggles visibility.

### HIGH (missing OG features)
5. **ItemRelease function** — Full 485-byte release flow not implemented.
6. **SetLastestGetItemEffect** — 2520-byte new-item effect system not implemented.
7. **Draw function** — 2422-byte draw function partially implemented.
8. **OnChildNotify** — Tab/scroll/tooltip routing not fully implemented.
9. **_GetBackgroundUOL** — Background UOL path resolution not implemented.

### MEDIUM (behavioral differences)
10. **Constructor SetItemTI(m_nOption + 1)** — Initial tab from window option, not hardcoded.
11. **CreateUIWndPosSaved(key=10)** — Position saved with key 10, TS uses 'MiniMapWndPos'.
12. **m_nBtCloseX** — Dynamic close button X (574 extended, 150 collapsed).
13. **m_anSortBtState[6]** — Per-tab arrange state array (6 elements, not 5).

### LOW (cosmetic/minor)
14. **TSingleton destructor** — N/A in TS.
15. **RTTI functions** — N/A in TS.
16. **vector deleting destructor** — N/A in TS.
