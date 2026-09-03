# CUIToolTip Full 1:1 OG Implementation Plan

## Overview
Rewrite `ToolTip.ts`, `ItemTooltip.ts`, and `TooltipAssets.ts` to be 1:1 with the OG `CUIToolTip` class (2632 bytes, 47 functions). The current TS implementation covers ~20% of the OG functionality.

## IDA Audit Summary

### Struct Layout (2632 bytes)
- +0x004: m_nToolTipType (0=None, 1=Normal, 4=Equip, 5=Bundle, 6=Pet, 7=Skill, 8=Ring, 11=Macro)
- +0x008: m_nHeight, +0x00C: m_nWidth
- +0x010: m_pLayer (IWzGr2DLayer), +0x014: m_pLayerAdditional
- +0x018: m_nLastX, +0x01C: m_nLastY
- +0x020: m_nLineNo (32 entries)
- +0x024: m_aLineInfo[32] (36 bytes each)
- +0x4A4: m_nLineSeparated
- +0x4A8: m_nOptionLineNo (32 entries)
- +0x4AC: m_aOptionLineInfo[32]
- +0x92C-0x994: 28 IWzFont pointers
- +0x998: m_pCanvasEquip_ReqItem[6][2] (Can/Cannot)
- +0x9C8: m_pNumberCan, +0x9CC: m_pNumberCannot (IWzProperty)
- +0x9D0: m_pCanvasEquip_JobItem[6][2]
- +0xA00: m_pCanvasDot[3]
- +0xA0C: m_pCanvasEquip_GrowthItem[4][2]
- +0xA2C: m_pNumberGrowthEnable, +0xA30: m_pNumberGrowthDisable
- +0xA34: m_pCanvasEquip_Durability[2][2]
- +0xA44: m_bIngoreWeddingInfo

### CLineInfo (36 bytes)
- +0x00: m_nWidth, +0x04: m_nHeight, +0x08: m_nType
- +0x0C: m_sContext (string), +0x10: m_nAlign
- +0x14: m_bMulti, +0x18: m_nSubType
- +0x1C: m_sSubContext (string), +0x20: m_bUseDotImage

## Gaps Identified

### ToolTip.ts — Missing Functions
| Function | OG Addr | Priority | Notes |
|----------|---------|----------|-------|
| DrawTextSepartedLine | 0x894a40 | CRITICAL | Word-wrap multi-line text, returns height |
| DrawItemTitle | 0x88ccb0 | HIGH | Title with star/icon |
| DrawCanvasIcon | 0x882200 | HIGH | Draw WZ canvas at position with alpha |
| DrawTextEquip_Req | 0x88d710 | HIGH | Equip requirement row (Can/Cannot label + digit) |
| DrawTextEquip_Req_Level | 0x88dab0 | HIGH | Level requirement row |
| PrintValue | 0x891230 | HIGH | Stat value with type-based formatting (0=+%d, 1=%d, 2=%d%%) |
| DrawItemReqJob | 0x880fc0 | HIGH | Job requirement strip (6 job icons) |
| DrawReqSkill | 0x88b320 | MED | Required skills display |
| AddOptionInfo | 0x88bda0 | MED | Option line with sub-type |
| DrawOptionInfo | 0x88bf80 | MED | Draw all option lines |
| DrawDiscount_Info | 0x88dec0 | MED | Discount price display |
| DrawDiscount_Rate | 0x889d80 | MED | Discount rate display |
| DrawLimitInfo | 0x888be0 | MED | Limited goods info |
| DrawNpcShopLimitedItemInfo | 0x891530 | LOW | NPC shop time-limited items |
| DrawITCSaleInfo | 0x88e6a0 | LOW | ITC sale info |
| MakePreviewPetNameTag | 0x8873b0 | MED | Pet name tag preview |
| GetPetDeadDate | 0x889540 | MED | Pet death date check |
| GetItemName | 0x8899b0 | HIGH | Item name + description type |
| GetItemExpireDate | 0x889310 | HIGH | Expiry date formatting |
| MakingLimitInfo | 0x888370 | LOW | Build limit info strings |
| AddToolTip_SetItem | 0x8a4d10 | MED | Set item bonus display |
| SetToolTip_ItemOption | 0x891c80 | HIGH | Item option/potential (50+ option IDs) |
| SetToolTip_SetItem_Basic | 0x8a14b0 | MED | Set item tier data population |

### ItemTooltip.ts — Missing Features
| Feature | Notes |
|---------|-------|
| Growth item rendering | 4 canvas states (enabled/disabled, top/bottom) |
| Durability bar rendering | 2 canvas states (normal/critical) |
| Cash item label | StringPool 5897, font type 14, centered |
| SetToolTip_Equip_Basic | Full stat line rendering via AddInfoEx |
| SetToolTip_Bundle | Complete consumable tooltip flow |
| SetToolTip_Skill | Skill tooltip with level/desc/req skills |
| SetToolTip_Pet | Pet tooltip with death/donator/expiry |
| SetToolTip_Ring | Ring tooltip with partner/friend/spouse |
| SetToolTip_MacroSysSkill | Macro system skill tooltip |
| SetToolTip_SlotInc | Slot increase tooltip |
| SetToolTip_EquipExt | Equipment extension tooltip |
| SetToolTip_Equip2 | Alternative equip tooltip |
| SetToolTip_Package | Package/commodity tooltip |
| SetToolTip_WorldMap | World map tooltip |
| SetToolTip_PartyAdver | Party advertisement tooltip |
| SetToolTip_PartyQuestRankString | Party quest ranking tooltip |
| SetToolTip_String2 | Multi-param string tooltip |
| SetToolTip_String_MultiLine | Multi-line string tooltip |

### Font Colors — Corrected from IDA
| Type | OG Color | Current TS | Fix Needed |
|------|----------|------------|------------|
| HL_White | 0xFFFFFF | 0xFFFFFF | OK |
| HL_Gold | 0xFFCC00 | 0xFFD700 | YES |
| HL_Orange | 0xFF8C00 | 0xFFA500 | YES |
| HL_Gray | 0xBCBCBC | 0x808080 | YES |
| HL_Green | 0x00FF00 | 0x00FF00 | OK |
| HL_Blue | 0x0096FF | 0x00BFFF | YES |
| HL_Violet | 0xFF00FF | 0x9400D3 | YES |
| HL_Green2 | 0x00FF80 | 0x32CD32 | YES |
| HL_Excellent | 0x00FFFF | 0xFFD700 | YES |
| HL_Special | 0xFFEEFF | 0xFF69B4 | YES |
| Gen_White | 0xFFFFFF | 0xFFFFFF | OK |
| Gen_Gray | 0xBCBCBC | 0x808080 | YES |
| Gen_Gray2 | 0x777777 | 0xA0A0A0 | YES |
| Gen_Red | 0xFF7155 | 0xFF0000 | YES |
| Gen_Orange | 0xFF8C00 | 0xFFA500 | YES |
| Gen_Gold | 0xFFCC00 | 0xFFD700 | YES |
| Gen_Purple | 0x9966FF | 0x9400D3 | YES |
| Gen_Green | 0x00FF00 | 0x00FF00 | OK |
| Gen_Yellow | 0xFFFF00 | 0xFFFF00 | OK |
| Gen_Blue | 0x00AAFF | 0x00BFFF | YES |
| Gen_Unknown | 0x00FF80 | 0xC0C0C0 | YES |

### Tooltip Width by Type
| Type | ID | Width |
|------|----|-------|
| Equip | 4 | 236 |
| Bundle | 5 | dynamic (min 290) |
| Pet | 6 | 290 |
| Skill | 7 | 320 |
| Ring | 8 | 236 |
| Macro | 11 | 290 |

## Implementation Phases

**Status: Phases 1-10 COMPLETE. Remaining: Phase 11 (wire into GameStage) + Phase 12 (TooltipAssets).**

### Phase 1: Fix Font Colors + Add Missing CLineInfo Fields ✅
- Correct all 28 font colors to OG values
- Add `lineSeparated` tracking to LineInfo
- Fix `_initCanvas` to use OG bg color `0x0C0C16` (already correct)

### Phase 2: Add Core Drawing Helpers ✅
- `drawTextSepartedLine(x1, x2, y, text, fontType, maxH)` — word-wrap, returns rendered height
- `drawItemTitle(y, title, starCount)` — title with star icon
- `drawCanvasIcon(x, y, canvas)` — blit WZ canvas with alpha
- `drawTextEquipReq(x, y, label, value, met)` — Can/Cannot label + digit
- `drawTextEquipReqLevel(x, y, level, met)` — Level requirement row
- `printValue(x, y, value, label, type)` — stat with formatting (0=+%d, 1=%d, 2=%d%%)
- `drawItemReqJob(x, y, jobId)` — 6 job icons strip
- `getItemName(itemId)` — resolve name + description type
- `getItemExpireDate(ft)` — format expiry date

### Phase 3: Add Data Population Functions ✅
- `addOptionInfo(type, text, subType)` — option line
- `drawOptionInfo()` — render all option lines
- `drawDiscountInfo(y, originalPrice, currentPrice)` — discount display
- `drawDiscountRate(y, originalPrice, currentPrice)` — rate display
- `drawLimitInfo(y, limitArray)` — limited goods
- `makingLimitInfo(goodsInfo)` — build limit strings
- `addItemToolTip(x, y, pe)` — set item display
- `setItemToolTipBasic(setItemInfo)` — set tier data

### Phase 4: Add Equip Tooltip (SetToolTip_Equip_Basic) ✅
- Category header (weapon type / item type)
- Attack speed line
- Durability line
- All stat lines via PrintValue (STR/DEX/INT/LUK/MaxHP/MaxMP/PAD/MAD/PDD/MDD/ACC/EVA/Craft/Speed/Jump/Knockback)
- Prevent Slip / Support Warm
- RUC (upgrade slots) with enchantCategory gate

### Phase 5: Add Equip Visual (DrawToolTip_Equip) ✅
- Item icon at (10, line2_y+72)
- Requirement rows with Can/Cannot labels
- Job strip
- Cash label (StringPool 5897, font type 14)
- Growth item rendering (4 canvas states)
- Durability bar rendering

### Phase 6: Add SetToolTip_Equip Master Dispatcher ✅
- Full equip tooltip with all 18 parameters
- Trade option description building
- Expiry date handling
- Item description
- Protection border colors
- Discount/limit/ITC sale info
- Set item bonus display

### Phase 7: Add SetToolTip_Bundle ✅
- Consumable tooltip with 21 parameters
- nCashDescOffset accumulator
- Marriage ring display
- Karma scissors handling
- New Year card special handling

### Phase 8: Add SetToolTip_Skill ✅
- Skill tooltip with level info
- Required skills display
- Special skill branches (swallow/dice/Wild Hunter)

### Phase 9: Add SetToolTip_Pet + SetToolTip_Ring ✅
- Pet tooltip with death/donator/expiry
- Ring tooltip with partner/friend/spouse + ring image

### Phase 10: Add Remaining SetToolTip_* Functions ✅
- SetToolTip_MacroSysSkill
- SetToolTip_SlotInc
- SetToolTip_EquipExt
- SetToolTip_Equip2
- SetToolTip_Package
- SetToolTip_WorldMap
- SetToolTip_PartyAdver
- SetToolTip_PartyQuestRankString
- SetToolTip_String2
- SetToolTip_String_MultiLine

### Phase 11: Update ItemTooltip.ts ✅ (partial — dispatchers added, GameStage wiring pending)
- Wire all new ToolTip methods
- Fix equip rendering to use OG flow
- Add pet stats, ring stats, skill stats
- Fix font colors in ItemTooltip

### Phase 12: Update TooltipAssets.ts
- Add any missing WZ asset paths
- Verify Can/Cannot digit sprites
- Add job label sprites
- Add growth/durability sprites

## StringPool Reference (All IDs)
| ID | Hex | Purpose |
|----|-----|---------|
| 1455 | 0x5AF | Font face name |
| 1456 | 0x5B0 | Font name for HL fonts |
| 6693 | 0x1A25 | IWzFont::Create path |
| 2052 | 0x804 | m_pNumberCan WZ path |
| 2053 | 0x805 | m_pNumberCannot WZ path |
| 2056-2061 | 0x808-0x80D | Canvas sub-item keys |
| 717-723 | 0x2CD-0x2D3 | Dot/job item keys |
| 5897 | 0x1709 | Cash item label |
| 6820 | 0x1AC4 | Growth disabled text |
| 6753 | 0x1A61 | STR |
| 6705 | 0x1A31 | DEX |
| 6722 | 0x1A42 | INT |
| 6730 | 0x1A4A | LUK |
| 6719 | 0x1A3F | MaxHP |
| 6733 | 0x1A4D | MaxMP |
| 674-682 | 0x2A2-0x2AA | PAD-Mump |
| 684 | 0x2AC | Knockback |
| 685 | 0x2AD | RUC |
| 686 | 0x2AE | Prevent Slip |
| 687 | 0x2AF | Support Warm |
| 6028 | 0x178C | Positive format +d |
| 6029 | 0x178D | Negative format %d |
| 5820 | 0x16BC | Set item tier header |
| 5821 | 0x16BD | Skill bonus format |
| 6124 | 0x17EC | Special set effect |
| 6698 | 0x1A2A | Weapon category format |
| 673 | 0x2A1 | Attack speed format |
| 6669 | 0x1A0D | Durability format |
| 688 | 0x2B0 | Donator format |
| 689 | 0x2B1 | Couple ring partner |
| 690 | 0x2B2 | Friendship ring friend |
| 691 | 0x2B3 | Current skill level |
| 692 | 0x2B4 | Next skill level |
| 3894 | 0xF3A | Master level format |
| 5219 | 0x1463 | Linked character format |
| 5490 | 0x1572 | Time-limited expiry |
| 4236 | 0x108C | Wedding ring spouse |
| 4237 | 0x108D | Marriage ring format |
| 2771 | 0xAD3 | Ring image WZ property |
| 2090 | 0x82A | Dead pet string |
| 594 | 0x252 | Slot increase (non-equip) |
| 597 | 0x255 | Slot increase (equip) |
| 598 | 0x256 | Slot increase (special) |
| 5237 | 0x1475 | Expired text |
| 5238 | 0x1476 | Expires format |
| 6720 | 0x1A40 | Item description title |
| 5874-5879 | 0x16F2-0x16F7 | Protection type texts |
| 5898-5901 | 0x170A-0x170D | Swallow buff stats |
| 6252 | 0x186C | Swallow critical |
| 6310-6370 | 0x18A6-0x18E2 | Dice buff types |
| 6357 | 0x18D5 | Wild Hunter mob header |
| 6677 | 0x1A15 | Damage meter format |
| 5822-5826 | 0x16BE-0x16C2 | Duration format strings |
| 4353 | 0x1101 | Separator text |
| 16897 | 0x4201 | WZ UOL path format |
