# CCSWnd Sub-Windows Full IDA Audit

## All 8 sub-windows decompiled, 29/29 functions extracted

## CCSWnd_Char (Character Preview)

### OnCreate
- Gets character data from CWvsContext
- Creates tab control for outfit tabs
- Creates scrollbar for outfit list
- Loads number font via StringPool 0x50E (1294)

### Draw
- Gets character data
- Uses `FONT_BASIC_BLACK` and `FONT_NO_BLACK` fonts
- Draws character name, job, level
- Renders character preview via CAvatar
- Handles cash shop authorization state

### OnTabChanged
- Switches between outfit categories (equip, cash, etc.)
- Updates character appearance

### Update
- Updates character animation (stand, walk, etc.)
- Handles weather effects

## CCSWnd_Locker (Storage)

### OnCreate
- Creates scrollbar at job-dependent X position:
  - Cygnus (job/1000==1): X=5
  - Aran (job/100==21): X=6
  - Legendary (job/1000==3): X=9
  - Normal: X=0
- Scrollbar at (X, 229), size (29, 67), nWheelRange=208
- Loads background from WZ

## CCSWnd_Inventory (Inventory)

### Draw
- Gets character data
- Iterates inventory slots (m_nItemTI)
- Draws item icons from GW_ItemSlotBase
- Handles selected item highlighting
- Shows item count/quantity

## CCSWnd_Tab (Category Tabs)

### OnCreate
- Creates horizontal tab control
- Loads tab canvases from WZ

## CCSWnd_List (Item List)

### GetPlateRect
- Returns plate rectangle for each item position
- 10 plates per page (2 columns × 5 rows)

## CCSWnd_Best (Best Items)

### Draw
- Renders best seller items
- Uses CS_BEST array (9 categories × 2 genders × 5 items)
- Draws item icons, names, prices

## CCSWnd_Status (Status Bar)

### OnCreate
- Creates scrollbar at job-dependent position
- Loads number font via StringPool 0x50E
- Loads background from WZ
- Has Charge/Check/Coupon/Exit buttons

## CCSWnd_ItemSearch (Item Search)

### OnCreate
- Creates search input field
- Creates search/cancel buttons
- Creates price filter
- Loads PopUp canvases for search results

## Key Differences from Current Implementation

1. **CCSWnd_Locker scrollbar**: Job-dependent X position (0/5/6/9)
2. **CCSWnd_Char**: Tab control for outfit categories, scrollbar for outfit list
3. **CCSWnd_Inventory**: Shows actual equipped items from CharacterData
4. **CCSWnd_Best**: Uses CS_BEST array, not just commodity list
5. **CCSWnd_Status**: Number font for NX display (StringPool 0x50E)
6. **CCSWnd_ItemSearch**: Full search UI with price filter

## Files saved
- `ida_output/ccswnd_*_clean.txt` — all decompiled functions
