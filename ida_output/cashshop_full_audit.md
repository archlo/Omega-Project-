# CCashShop Full IDA Audit — OG 1:1 Reference

## Struct Layout (size=15216, inherits CStage)

```
+0000  CStage                     (base class)
+0018  int                        m_bIsOneADay
+001C  int                        m_bCashShopRequestSent
+0020  int[2]                     m_nNexonCash (secure)
+002C  int[2]                     m_nMaplePoint (secure)
+0038  int[2]                     m_nPrepaidNXCash (secure)
+0044  int                        m_bCashShopAuthorized
+0048  ZArray<CS_CATEGORY>        m_aCategory
+004C  ZArray<CS_STOCK>           m_aStock
+0050  ZArray<CS_LIMITGOODS>      m_aLimitGoods
+0054  CS_BEST[9][2][5]           m_aBest
+048C  ZArray<GW_CashItemInfo>    m_aCashItemInfo
+0490  int                        m_nTrunkCount
+0494  int                        m_nCharacterSlotCount
+0498  int                        m_nBuyCharacterCount
+049C  int                        m_nCharacterCount
+04A0  ZXString<char>             m_sNexonClubID
+04A4  ZXString<char>             m_sNexonClubIDToShow
+04A8  int[10]                    m_nWishList
+04D0  int                        m_nWishBuyOrGift
+04D4  int                        m_bRemoveWish
+04D8  ZArray<long>               m_aAvatarBuy
+04DC  ZArray<long>               m_aAvatarBuyDone
+04E0  int                        m_nAvatarBuyIdx
+04E4  unsigned int               m_dwAvatarPurchaseOption
+04E8  int                        m_bWearPackage
+04EC  int                        m_bMigrateFromWishItem
+04F0  int                        m_nCommSN
+04F4  ZXString<char>             m_sGiveTo
+04FC  int                        m_nCurSortType
+0500  int                        m_bEventOn
+0504  int                        m_nHighestCharacterLevelInThisAccount
+0508  ZArray<CS_ZEROGOODS>       m_aZeroGoods
+050C  ZArray<ZXString<char>>     m_aSendGifts
+0510  int                        m_nGiftsIdx
+0514  int                        m_bGifts
+0518  int                        m_nSpentNXCash
+051C  ZXString<char>             m_sSentItem
+0520  ZArray<ZXString<char>>     m_aSendGiftsDone
+0524  CCashShop::SENDGIFT        m_sg
+0530  ZArray<ZXString<char>>     m_asWorldName
+0534  CUICashItemGachapon *      m_pUICashItemGachapon
+0538  CUICashGachapon *          m_pUICashGachapon
+053C  int                        m_nCurCategory
+0540  int                        m_nCurCategorySub
+0544  int                        m_nCurPage
+0548  CCSWnd_Char                m_wndChar
+????  CCSWnd_Locker              m_wndLocker
+????  CCSWnd_Inventory           m_wndInventory
+????  CCSWnd_Tab                 m_wndTab
+????  CCSWnd_List                m_wndList
+????  CCSWnd_Best                m_wndBest
+????  CCSWnd_Status              m_wndStatus (Charge/Check/Coupon/Exit buttons)
+????  CCSWnd_ItemSearch          m_wndItemSearch
+????  ZList<CS_COMMODITY_EX>     m_lCommSearchResult
+????  IWzGr2DLayer               m_pLayer
```

## Sub-windows (from ctor @ 0x4938b0)

| Window | Purpose |
|--------|---------|
| CCSWnd_Char | Character preview |
| CCSWnd_Locker | Storage/locker |
| CCSWnd_Inventory | Inventory display |
| CCSWnd_Tab | Category tabs |
| CCSWnd_List | Item list (10 per page) |
| CCSWnd_Best | Best sellers |
| CCSWnd_Status | Status bar (Charge/Check/Coupon/Exit) |
| CCSWnd_ItemSearch | Item search |

## Constructor: CCashShop(CInPacket&) @ 0x4938b0

- Inherits CStage (not CUIWnd — this is a full stage, not a panel)
- Creates all 8 sub-windows
- Initializes cash amounts to 0
- Sets m_nTrunkCount = -1

## Init @ 0x484920

1. ClearFieldUI
2. Reset cash amounts (NexonCash, MaplePoint, PrepaidNXCash)
3. Set m_nCurCategory = 1, m_nCurCategorySub = 0, m_nCurPage = 0
4. Clear wish list (10 slots)
5. Load character data
6. Initialize user preview
7. Load WZ assets for cash shop background

## LoadData @ 0x492ea0

1. Decode m_bCashShopAuthorized from packet
2. Decode m_sNexonClubID
3. Load commodity data from WZ
4. Build category list from m_aCategory
5. Decode stock, limit goods, zero goods
6. Initialize best sellers

## GoTo @ 0x47e6f0

```
OnChangedCategory(nCategory)
OnChangedCategorySub(nCategorySub)
OnChangedPage(nNo / 10)
CCSWnd_List::SetCursorToPlate(nNo % 10)
```

## GetCategoryIndex @ 0x47e590

Iterates m_aCategory to find start index and count for a given category.

## OnBuy @ 0x48e530 (20K chars)

Master purchase dispatcher — checks commodity type and routes to:
- OnBuyNormal (normal items)
- OnBuyPackage (packages)
- OnBuyAvatar (avatar items)
- OnBuyCouple (couple items)
- OnBuyFriendship (friendship items)
- OnBuyNameChange (name change)
- OnBuySlotInc (slot expansion)
- OnBuyTransferWorldItem (world transfer)

## OnCashItemRes* handlers

| Handler | Purpose |
|---------|---------|
| OnCashItemResBuyDone | Purchase success |
| OnCashItemResBuyFailed | Purchase failure |
| OnCashItemResBuyNormalDone | Normal purchase success |
| OnCashItemResBuyNormalFailed | Normal purchase failure |
| OnCashItemResBuyPackageDone | Package purchase success |
| OnCashItemResBuyPackageFailed | Package purchase failure |
| OnCashItemResGiftDone | Gift success |
| OnCashItemResGiftFailed | Gift failure |
| OnCashItemResDestroyDone | Item destroy success |
| OnCashItemResDestroyFailed | Item destroy failure |
| OnCashItemResEnableEquipSlotExtDone | Slot extension success |
| OnCashItemResExpireDone | Item expire |
| OnCashItemResFreeCashItemDone | Free cash item |
| OnCashItemResIncTrunkCountDone | Trunk expansion |
| OnCashItemResIncCharacterSlotCountDone | Character slot expansion |
| OnCashItemResIncSlotCountDone | Inventory slot expansion |
| OnCashItemResChangeMaplePointDone | Maple Point change |
| OnCashItemResCashGachaponCopyDone | Gachapon copy success |
| OnCashItemResCashGachaponOpenDone | Gachapon open success |
| OnCashItemResNameChangeDone | Name change success |
| OnCashItemResTransferWorldDone | World transfer success |
| OnCashItemResCoupleDone | Couple item success |
| OnCashItemResFriendShipDone | Friendship item success |
| OnCashItemResGiftCouponDone | Gift coupon success |

## IsBuyableCommodity @ 0x4872f0

Checks if a commodity can be purchased — validates stock, limit goods, zero goods, price.

## IsUsableItem @ 0x485e80 (18K chars)

Validates if a cash item can be used by the current character — checks job, level, gender, etc.

## NoticeFailReason @ 0x495bc0 (15K chars)

Displays error messages for failed purchases with specific reason codes.

## Key WZ Paths

| Path | Purpose |
|------|---------|
| `CashShop.img` | Cash shop background |
| `Commodity.img` | Item definitions |
| `Category.img` | Category definitions |

## Key Packet Operations

| Operation | Opcode |
|-----------|--------|
| BuyRequest | Cash shop buy |
| GiftRequest | Cash shop gift |
| WishListRequest | Wish list management |
| SearchRequest | Item search |
| LockerRequest | Locker operations |
| MigrateFromCashShop | Return to game |

## 37/37 core functions decompiled

All files saved to `ida_output/cashshop_*_clean.txt`.
