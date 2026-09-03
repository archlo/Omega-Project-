# Cash Shop Full Audit — TS Client vs OG v95 IDB

Generated: 2026-08-21. All addresses from live IDB decompiles of CCashShop / CCSWnd_*.

## Architecture difference (root cause of most gaps)

**OG**: `CCashShop::CCashShop @0x4938B0` calls `CWvsContext::LoadCommodity @0x9FA230`
→ `load_commodity @0x49BCD0` which parses **`Etc.wz/Commodity.img` client-side** (12,318
entries: SN(0xB0D)/ItemId/Count/Price/Bonus/Priority/Period/Gender/OnSale + optional
MaplePoint/Meso/PBcash/PBpoint/PBgift/Limit fields via StringPool 0xB0D..0xB19, 0xC60..0xC64)
plus `Etc.wz/CashPackage.img` (StringPool 0xB66). The server SetCashShop packet only sends
*modifications* (`DecodeStock/LimitGoods/ZeroGoods`, best table, discount rates).

**TS**: builds the whole commodity list from server `modifiedCommodities` and invents
categories from itemId prefixes (`_getCategoryFromItemId`). No Commodity.img read →
no authentic category/categorySub model → tabs/sub-tabs/page filtering can't be 1:1.

**Category model**: `load_category @0x49C1C0` parses **`Etc.wz/Category.img`** (33 rows:
`Category`(SP 0x1A2E) + `CategorySub`(SP 0x598) + `Name`(SP 1433)) into
`CS_CATEGORY{ nCategory, nCategorySub, sName, nStart=-1, nCount, nNotAvailableCount }`.
`GetCategoryIndex @0x47E590` returns the [start,count) range of subcategory rows for a tab;
`GetCategorySubIndex @0x47E5E0`; `OnChangedCategorySub @0x47DBF0` swaps the OneADay window
in/out (categorySub==2 of category 1); pages are groups of 10 plates
(`ChangeCategorySub @0x4C98F0`: `(nCount - nNotAvailableCount + 9) / 10` page count).

### Fix plan (structural)
New `src/domain/CashCommodityTable.ts`:
1. Parse `Etc.nx/Commodity.img` → `Map<sn, CSCommodity>`.
2. Parse `Etc.nx/Category.img` → `CS_CATEGORY[]`.
3. `CashShopStage.onSetCashShop` starts from the WZ table, overlays server modified data,
   assigns commodities to category rows exactly like OG (per-SN category mapping),
   then sorts by priority.

## Asset gaps (UI.nx/CashShop.img exists — verified tree)

| Asset | OG use | TS state |
|---|---|---|
| `Base/backgrnd1..5` | job-variant backgrounds (Init picks by job: SP 0x53E/0x53F/0x540/0x1970/0x1A72/0x1A73) | NOT loaded — always `backgrnd` |
| `Base/Preview/{0,1,2}` 212×165 | preview panel per job class | loaded ✓ |
| `Base/PreviewOnOff/{On,Off}` | avatar-control toggle (CapsLock, `CCashShop::OnKey @0x47F7C0`) | loaded but toggle not wired to CapsLock |
| `CSTab/Tab/1..9` 508×78 strips | ONE strip per selected tab (Draw @0x4C68A0 draws `m_pCanvasTab[m_nTab]`) | loaded ✓ — verify drawn as full strip |
| `CSGift/backgrnd` 266×169, `backgrnd1` 473×169, `BtBuddy/BtGuild/BtHide` | gift dialog chrome | NOT loaded — Graphics fallback |
| `CSChangeName/Base` + `BtCheck` | name-change dialog | NOT loaded — fallback |
| `CSTransferWorld/Base` | world-transfer dialog | NOT loaded — fallback |
| `CashItem/0..3` 13×13 | NX coin icon tiers on price rows | NOT loaded — price is text `"N NX"` |
| `PrepaidCashItem/0` 16×14 | prepaid NX icon | NOT loaded |
| `CSList/Base` 200×80 plate | item plate | loaded ✓ |
| `CSList/BtRemove`, `BtReserve` | wishlist/remove buttons | NOT loaded |
| `CSNotice/0..4` | notice dialogs | NOT loaded |
| `PicturePlate/*` (NoItem, HowTo…) | empty-page / help plates | NOT loaded — empty grid shows nothing |
| `GuideWords/0..3` | search hint words | NOT loaded |
| `CSIcon/0,1`, `NewItem/0..3` | list badges | NOT loaded (CSEffect hot/new/sale ARE loaded) |
| `CSMemberShop/*` | member shop | absent |

## Logic gaps (function → IDB → TS)

### RESOLVED this session
- **Category assignment cracked**: `LoadData @0x492EA0` derives each commodity's
  category from its SN digits: `category = sn/10000000 % 10`,
  `categorySub = sn/100000 % 100`, then groups rows (`nStart/nCount/nNotAvailableCount`)
  in Category.img order, throws on unmapped (cat,sub), randomly distributes
  [80000000..89999999] on-sale items into rows, per-row sorts by `CommMoreFunc`.
  → TS `_rebuildCommodities` now sets category/categorySub from SN digits; grid filters tabs by it.
- **`OnChangedSortType @0x481810` decoded**: per-row selection sort over ON-SALE entries;
  mode 0 = priority asc, 1 = price DESC, 2 = SN asc; then re-runs OnChangedCategorySub.
  → TS `SetSortType()` + `_applySortType()`.
- **`IsUsableItemCheckFirst @0x486820` decoded**: (1) Evan-only dragon boxes
  5620006/5620007/5620008 blocked for non-Evan (SP 0x162A) → ported to `_isCommodityUsable`;
  (2) 562xxxx restricted by job/subJob except those three (SP 0x1764) — needs nSubJob, NOT ported;
  (3) mastery books via `IsUsableMasteryBookItem @0x485B90` fail → SP 0x16CA(skillName);
  explorer-beginner /10000==109 special case SP 0x16CD — not ported.

### RESOLVED in follow-up round
- **LoadData row model** (`@0x492EA0`): full port — Category.img-order grouping +
  random distribution of the [80000000..89999999] on-sale window into non-empty rows
  (`_applyCategoryRows()`; runs only when the WZ commodity table is loaded, every SN mapped).
- **CapsLock preview toggle** (`OnKey @0x47F7C0`, VK_CAPS=20) → `onKeyPress('CapsLock')`.
- **BGM** (Init StringPool 1290 = `Sound.wz/BgmUI.img/ShopBgm`) → PlayLoop on stage enter.
- **Wishlist add/remove** (`OnSetWish @0x4837D0` / `OnRemoveWish @0x483960`) → `AddToWish/RemoveWish`
  + W / Shift+W on the selected plate; sends the whole 10-slot list via sub-action 5.
- **Locker rebate** (`OnRebateLockerItem @0x485840`) → clicking a locker cell sends sub-action 17.
- **GoToCommoditySN** (`CCSWnd_Best::GoToCommoditySN @0x4C6DC0`) → best-panel click jumps to tab/page/plate.
- **Job-variant backgrounds** (Init @0x484920): Base/backgrnd..backgrnd5 loaded; `_selectBackground()`
  picks Cygnus→1 / Aran→4 / Evan→5 / Legendary(1000s)→3 / else 0 on SetCashShop.
- **Empty page**: PicturePlate/NoItem drawn when the current tab has no items.
- **Sub-category strip** (`ChangeSubCategory @0x4C6530` / `ChangeCategorySub @0x4C98F0`):
  Category.img names under the tab strip; click-to-select filters the grid by
  categorySub (active only when the WZ commodity table is loaded).

| OG function | Address | TS state |
|---|---|---|
| `ProcessBuy @0x4936B0` routing | fixed this session (couple/package/SN-window/special IDs + YesNo gate) | ✓ |
| `IsBuyableCommodity @0x4872F0` | level/fame checks exist; failure Notice strings (SP 0x23F/0x16C5/0x16C6 formats) not formatted | partial |
| One-a-day YesNo gate (sn/100000==210 ‖ sn==5640000, SP 0x15C4) | added this session | ✓ |
| `OnKey @0x47F7C0` CapsLock toggles avatar control | NOT wired | ✗ |
| BGM `PlayBGM(StringPool 1290)` in Init | NOT played | ✗ |
| `format_integer` + status layout (DrawRectangle value-wells at (120,{11,25,40}) 107×11; right-align x=220; NexonCash/Prepaid FONT_NO_BLACK y9/y23, **MaplePoint FONT_NO_RED y38**) | TS draws plain text, no commas, no wells | ✗ → fixed below |
| `CCSWnd_Tab::Draw` full-strip canvases + selector id 1000 (CreateCtrl_2 …, 8 items) | strips loaded; sub-category dropdown labels (Category.img names) missing | partial |
| `CCSWnd_List::ChangePage @0x4CFC70` / `SetPlateNo @0x4C9B40` | TS paging approximated | partial |
| Wishlist UI (`OnSetWish @0x4837D0`, `OnRemoveWish @0x483960`, `GiftWishItem @0x491FA0`, `FindWishList @0x482CD0`) | data arrays only, NO click-to-add/remove UI | ✗ |
| `OnChangedSortType @0x481810` sorting modes | absent | ✗ |
| `GoTo @0x47E6F0` / `CCSWnd_Best::GoToCommoditySN @0x4C6DC0` (best-panel jump) | absent | ✗ |
| `UpdateStock/ChangeLimitGoodsState/IsZeroGoods/IsLimitGoodsRemain` | tables decoded, timers not ticked | partial |
| Avatar buy flow (`OnBuyAvatar @0x48D030`, `SendBuyAvatarPacket @0x4854F0`) | stubbed | ✗ |
| `IsUsableItem* @0x485E80/0x486820/0x486B20` validation + strings | basic checks only | partial |
| Purchase record (`RequestCashPurchaseRecord @0x4823C0`, m_mPurchaseRecord map) | status message only | partial |
| Locker rebate (`OnRebateLockerItem @0x485840`) | absent | ✗ |
| Trunk/slot counters (`m_nTrunkCount`, `OnIncTrunkCount @0x48DC70`, `OnExItemSlot @0x48D890`) | packets sent, counts not tracked/rendered | partial |

## Status bar exact spec (CCSWnd_Status::Draw @0x4CBCD0)

```
values = format_integer(v, groupThousands=true)
wells: rect(120, 11, 107, 11), rect(120, 25, 107, 11), rect(120, 40, 107, 11)  color 0xFF3F3FF5-ish (-789259)
NexonCash  : DrawTextA(220 - width, 9,  FONT_NO_BLACK)
PrepaidNX  : DrawTextA(220 - width, 23, FONT_NO_BLACK)
MaplePoint : DrawTextA(220 - width, 38, FONT_NO_RED)
buttons y=13 (BtCharge/BtCheck/BtCoupon/BtExit)
```

## Already correct (verified vs IDB)
- All 8 CreateWnd rects (char/locker/inventory/tab/list/best/status/itemSearch) match `Init @0x484920`.
- Plate geometry 200×80, col step 206, row step 81, 2×5 per page.
- Best panel 90-entry × 12-byte decode; locker 55-byte cash-item structs; stock/limit/zero record sizes (8/104/68).
- ProcessBuy special-ID routing + YesNo gate (this session).
