# Cash Shop Server Handler Roadmap

## Implemented (shopServer.ts)

Action bytes verified against kinoko `CashItemRequestType.java` + client `Enums.ts` (both agree):

| Action | Name | OG Function | Status |
|--------|------|-------------|--------|
| 0 | LoadLocker | `CCashShop::OnPacket 0x58` | ✅ Done |
| 1 | LoadWish | `OnSetWish` (load) | ✅ Done |
| 2 | Buy | `OnBuy` (to locker) | ✅ Done |
| 3 | Gift | `OnGift` | ✅ Done |
| 5 | SetWish | `OnSetWish` (save) | ✅ Done |
| 6 | IncSlotCount | `OnIncSlotCount` | ✅ Done |
| 7 | IncTrunkCount | `OnIncTrunkCount` | ✅ Done |
| 8 | IncCharSlotCount | `OnIncCharacterSlotCount` | ✅ Done |
| 9 | IncBuyCharCount | `OnIncBuyCharacterCount` | ✅ Done |
| 10 | EnableEquipSlotExt | — | ✅ Done |
| 11 | CancelPurchase | — | ✅ Done (stub) |
| 12 | ConfirmPurchase | — | ✅ Done (stub) |
| 13 | Destroy | `OnDestroy` | ✅ Done |
| 14 | MoveLtoS | `OnMoveCashItemLtoS` | ✅ Done |
| 15 | MoveStoL | `OnMoveCashItemStoL` | ✅ Done |
| 16 | Expire | `OnExpire` | ✅ Done |
| 17 | Use | `OnUseCouponSelectDlg` | ✅ Done (reject) |
| 18 | StatChange | — | ✅ Done (stub) |
| 19 | SkillChange | — | ✅ Done (stub) |
| 20 | SkillReset | — | ✅ Done (stub) |
| 21 | DestroyPetItem | — | ✅ Done (stub) |
| 22 | SetPetName | — | ✅ Done (stub) |
| 23 | SetPetLife | — | ✅ Done (stub) |
| 24 | SetPetSkill | — | ✅ Done (stub) |
| 25 | SetItemName | — | ✅ Done (stub) |
| 26 | SendMemo | — | ✅ Done (stub) |
| 27 | QueryCash | `OnQueryCash` | ✅ Done |
| 28 | Rebate | `OnRebate` | ✅ Done |
| 29 | UseCoupon | `OnUseCouponSelectDlg` | ✅ Done (reject) |
| 30 | GiftCoupon | `OnGiftCouponSelectDlg` | ✅ Done (reject) |
| 31 | Couple | `OnCouple` | ✅ Done (stub) |
| 32 | BuyPackage | `OnBuyPackage` | ✅ Done |
| 33 | GiftPackage | `OnGiftPackage` | ✅ Done |
| 44 | PurchaseRecord | `GetCashPurchaseRecord` | ✅ Done |

## Previously-fixed bugs

- **Action byte mismatches (fixed 2026-09-07)**: Client `GameSender.ts` had hardcoded wrong bytes for EnableEquipSlotExt (wrote 14, should be 10), Destroy (wrote 15, should be 13), and Rebate (wrote 17, should be 28). Server `shopServer.ts` had wrong action checks (EnableEquipSlotExt checked 12, Destroy checked 15), and Expire/Destroy/Rebate handlers read `readLong()` but client sends `writeInt()` (4 bytes, not 8). All fixed.
- **Dead code**: The old `if (action === 14 || action === 15)` catch-all at line ~402 intercepted both MoveLtoS and MoveStoL + Destroy. Now each action has its own handler.

## Client-side TODO (from cashshop-audit.md)

| Gap | Impact | Priority |
|-----|--------|----------|
| Commodity.img not parsed client-side | Category tabs use invented prefix model | Medium |
| Category.img not loaded | Sub-category labels wrong | Low |
| Job-variant backgrounds (backgrnd1..5) | Cosmetic | Low |
| CashItem/0..3 coin icons | Cosmetic | Low |
| CapsLock preview toggle | Feature | Low |
| One-a-day countdown WZ digits | Cosmetic | Low |
| Search price-band filtering | Feature | Medium |
| Gift dialog BtBuddy/BtGuild/BtHide | Feature | Medium |
| Name-change dialog WZ chrome | Cosmetic | Low |
| World-transfer dialog WZ chrome | Cosmetic | Low |
| Coupon input visuals | Feature | Low |
| Purchase-record limit gating | Feature | Medium |
