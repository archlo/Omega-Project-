# Cash Shop Full Audit — 2026-09-02 (current tree)

Live audit of the cash-shop surface on **both** sides of the wire. Client = `C:\Users\jorge\OneDrive\Desktop\ts`, Server = `C:\Users\jorge\OneDrive\Desktop\server`. Every v95 claim below was re-decompiled this session from the IDB; kinoko numbers cross-checked against `kinoko-main/.../CashItemRequestType.java` and `CashShopHandler.java`.

## TL;DR — the cash shop is NOT wired to v95 end-to-end

Three independent layer defects stack up so that ordinary purchases cannot complete:

1. **Sub-action numbering on C→S 275 does not match v95 or kinoko.** The TS client + server invented a numbering (MoveLtoS=6/7, IncSlot=10/11, Rebate=17, …) that disagrees with the authoritative table (14/15, 6/7, 28, …). Client and server agree *with each other*, so it "works" locally, but it is not the protocol the real client/server speaks.
2. **The Buy body is internally desynced even in the local numbering.** Client `CashShopBuy` writes `[3][int sn]`; server action-3 reads `int discard + int sn + short qty`. Neither matches v95 `[3][byte][int payment][int sn][byte oneADay][int eventSN]`.
3. **Buy/gift responses use the wrong result sub-action.** Server `sendBuyResult` emits `0x03`; the client decoder has no 0x03 case and only understands the v95 `0x64 BuyDone` (55-byte item) / `0x65 BuyFailed`, which the server never sends. So a successful purchase never delivers the item to the client.

## 1. Authoritative v95 C→S sub-action table (opcode 275 = CashShopCashItemRequest)

Decoded from the real client send functions this session. Kinoko enum matches v95 exactly.

| Request | v95 sub | kinoko | TS client sender | TS server case | verdict |
|---|---|---|---|---|---|
| WebShopOrderGetList | 0 | WebShopOrderGetList(0) | — | — | n/a |
| LoadLocker | (see note) | LoadLocker(1) | `CashShopLoadLocker` → **0** (`GameSender.ts:2397`) | action **0** | MISMATCH (see note) |
| LoadWish | (see note) | LoadWIsh(2) | `CashShopLoadWish` → **2** (`:2411`) | action **2** | ok on 2 |
| Buy | 3 | Buy(3) | `CashShopBuy(sn)` → **3** `[int]` (`:2418`) | action 3 reads `int+int+short` | **body mismatch** |
| Gift | 4 | Gift(4) | `CashShopSendGift` → 4 (`:833`) | action 4 | ok (fields) |
| SetWish | 5 | SetWish(5) | `CashShopSetWish` → 5 (`:2426`) | action 2‖5 | ok |
| IncSlotCount | 6 (0x06) | IncSlotCount(6) | `CashShopIncSlotCount` → **10** (`:2467`) | action **10** | MISMATCH |
| IncTrunkCount | 7 (0x07) | IncTrunkCount(7) | `CashShopIncTrunkCount` → **11** (`:2475`) | action **11** | MISMATCH |
| IncCharSlotCount | 8 (0x08) | IncCharSlotCount(8) | `CashShopIncCharSlotCount` → **12** (`:2482`) | missing | MISMATCH |
| IncBuyCharCount | 9 | IncBuyCharCount(9) | `CashShopIncBuyCharCount` → **13** (`:2489`) | missing | MISMATCH |
| EnableEquipSlotExt | 10 | EnableEquipSlotExt(10) | `CashShopEnableEquipSlotExt` → **14** (`:2496`) | missing | MISMATCH |
| MoveLtoS | 14 (0x0E) | MoveLtoS(14) | `CashShopMoveLtoS` → **6** (`:2434`) | action **6** | MISMATCH |
| MoveStoL | 15 (0x0F) | MoveStoL(15) | `CashShopMoveStoL` → **7** (`:2442`) | action **7** | MISMATCH |
| Rebate | 28 (0x1C) | Rebate(28) | `CashShopRebate` → **17** (`:2521`) | missing | MISMATCH |
| BuyPackage | 32 | BuyPackage(32) | `CashShopBuyPackage` → **19** (`:2538`) | missing | MISMATCH |
| GiftPackage | 33 | GiftPackage(33) | `CashShopGiftPackage` → **33** (`:2549`) | action 33 | ok (fields) |
| BuyNormal | 34 | BuyNormal(34) | `CashShopBuyNormal` → **21** (`:2560`) | missing | MISMATCH |
| Friendship | 37 | Friendship(37) | `CashShopFriendShip` → **22** (`:2569`) | missing | MISMATCH |
| PurchaseRecord | 44 (0x2C) | PurchaseRecord(44) | `CashShopPurchaseRecord` → **44** (`:2587`) | action 44 | ok |
| BuyNameChange | 50 (0x32) | BuyNameChange(50) | `CashShopNameChange` → **29** (`:2630`) | missing | MISMATCH |
| BuyTransferWorld | 53 (0x35) | BuyTransferWorld(53) | `CashShopTransferWorld` → **31** (`:2646`) | missing | MISMATCH |
| GetMaplePoint/QueryCash | — | GetMaplePoint(27) | `CashShopQueryCash` → **27** (`:2604`) | action 27 | ok (on 27) |
| ApplyWishListEvent | 35 (0x23) | ApplyWishListEvent(35) | — | — | n/a |

> LoadLocker note: kinoko has LoadLocker(1) with no separate LoadGift; the real v95 locker/gift/wish *load* requests must be read from their own send functions (not yet decompiled this pass) — the numbers here (0/1/2) are flagged as unverified rather than asserted.

**Fix:** renumber the TS `GameSender` cash senders and the `shopServer.handleCashItemRequest` cases to the table above (kinoko-faithful). This is a contained mechanical change; update the server tests that encode the old numbers.

## 2. Buy body — v95 truth vs both sides

`CCashShop::OnBuy @0x48E530` (decompiled this session) tail:
```
Encode1(3);                          // sub-action 3 (Buy)
Encode1(v11 == 2);                   // byte: MaplePoint-only flag
Encode4(v11);                        // dwOption = payment type (1 NX, 2 MaplePoint, 4 prepaid)
Encode4(nCommSN);                    // commodity SN
Encode1(m_bRequestBuyOneADay);       // byte
Encode4(nEventSN);                   // zero-good event SN
```
Kinoko `CashShopHandler` Buy case decodes the same 5 fields after the sub-action byte.

- **Client** `GameSender.ts:2418` sends only `[3][int sn]` — drops payment/oneADay/eventSN.
- **Server** `shopServer.ts:261-263` reads `int discard + int sn + short qty` — a 10-byte body that the client never sends, so the SN lookup reads past the real SN.
- **CashShopStage `_processBuy` (:4150-4248)** also routes many kinds through plain `CashShopBuy` (char sale :4196, default :4248) and never passes the payment type chosen in `_confirmBuyPaymentType` (:2552-2577) — that selector is cosmetic (see §5 B1).

**Fix:** client `CashShopBuy(sn, paymentType, oneADay?, eventSN?)` → `[3][byte][int][int][byte][int]`; server action 3 reads the same 5 fields; thread `_confirmBuyPaymentType` through.

## 3. Response sub-actions — server emits what the client never decodes

- Server `sendBuyResult` (`shopServer.ts:526-536`) writes `CASH_SHOP_CASH_ITEM_RESULT` + **`0x03`** + reason byte. v95 result sub-actions for a buy are `0x64 BuyDone` (=kinoko `Buy_Done` 100=0x64, carries a 55-byte `GW_CashItemInfo`) and `0x65 BuyFailed` (reason). Client decoder (`CashShopHandlers.ts`) has 0x64/0x65/0x68/0x6B/0x9A/0x9C/0x9E/0xA2 cases but **no 0x03** → default reads a single reason byte, and the success path never appends the bought item to the locker/inventory.
- `giftCommodity` likewise reports through `sendBuyResult(0x03)` instead of `Gift_Done 0x6B` / `GiftPackage_Done 0x9C`.

**Fix:** server emits kinoko `buyDone(cashItemInfo)` (0x64 + 55-byte), `buyPackageDone` (0x9A), `giftDone` (0x6B), `giftPackageDone` (0x9C), `fail(Buy_Failed, reason)` (0x65) per the v95 `OnCashItemRes*` decoders already implemented client-side.

## 4. Inventory-type mismatch in slot-expansion gating

`CashShopStage._invUsedSlots` maps 1→Consume,2→Install,3→Etc,4→Cash (off-by-one vs the real Equip=1,Consume=2,Install=3,Etc=4), so the Equip-expansion button (:3642, sends invType 1) checks the Consume tab's fill and the 96-cap never gates the actual target tab. Server `InventoryType.ts` uses the real mapping.

## 5. Client-stage behavioral issues (CashShopStage.ts, all line-verified)

### A — user-visible
- **A1 Buy-failure leaves `_buyPending` stuck**: the `0x65` failure group (:4441-4456) resets only `_stoLRequestSent`; `_buyPending` (set at :4138) is cleared only by success or the second failure group. Once the server correctly returns `0x65` (fix §3), every rejected buy will lock further purchases.
- **A2 `w`/`W` wish handler precedes text inputs**: the wish toggle at :2848 runs before coupon (:2868), gift (:2883) and search text handlers — typing a "w" in any cash-shop text field triggers wishlist add/remove.
- **A4 preview avatar never hides on "preview off"**: the `_charLook.container` is added every frame while `_previewEnabled` (:1369-1377) and only removed in `onExit` — CapsLock (:2843) / char-window click (:3508) flip the flag but nothing removes the sprite.
- **A5 locker click both selects and instantly `MoveLtoS`** (:3267 selects, :3607 immediately moves) — the rebate-on-selected flow (:3664) can't target an item still in the locker.
- **A6 status-message bar is clipped and never expires**: drawn at `STATUS_Y+STATUS_H+4 = 590` height 20 on a 600-high frame; no fade/timer, so failures persist as stale off-screen text.

### B — incomplete-but-plumbed
- **B1 payment-type selector cosmetic**: `_confirmBuyPaymentType` (:2552-2577) never reaches any sender; gender rules disagree between `_isCommodityUsable` (0=any) and the plates (`0=male`); `onSaleFlag` hardcoded 0 (:786).
- **B2 gift buddy/guild list modes dead** — `buddyNames`/`guildNames` never assigned; `_giftRecords` write-only; no claim path.
- **B3 one-a-day countdown fabricated** to 23:59:59 (:650-655); `args.itemDate` unused; `_oneADayMode` never read.
- **B4 Check (PurchaseRecord) and Charge are stubs** (:3282-3291); `onChargeParamResult` message-only.
- **B5 name-change pre-check (`CheckNameChange` sub 28) never called**; dialog sends sub 29 directly (:4076-4079).
- **B6 discount-rate keys built on itemId-prefix category then overwritten by SN-digit category** (:767 vs :843) — discounts attach to wrong rows.
- **B7 `SetSortType`/`_applySortType` dead** (no callers; `_applyCategoryRows` comparator ignores `_sortType`).

### C — cosmetic/deferred
Duplicate SetPlateNo JSDoc (:1199-1212); stale "Tab 9 = One-a-Day" comment (:941); write-only fields `_outfitTab/_outfitScrollbar`, `_plateStatePressed/Disabled`, `_discountBonus/Line/Total`, `_bgNameChangeNotice`, `_plateStateFocus`; two overlapping best-panel click handlers; buy/gift dead-zone y∈[46,50); balances not re-queried after purchase; pervasive hardcoded English instead of OG StringPool notices.

## 6. Opcode-85 (UserConsumeCashItemUseRequest) findings (channel, `CashItemHandler.ts`)

- **Vega** (`GameSender.ts:968-979`) writes `[short][int …]` with the timestamp **last**, but the server header read is `int ts, short pos, int itemId` → garbage itemId → `dispose()`. Only opcode-85 sender not opening with `int ts`.
- **ItemProtector (506) / avatar-megaphone (507) / Vega (561)** prefixes have **no `CashItemType`** band (`CashItemType.ts:14-29`) → `dispose()` at :32.
- **Karma (552) and Hammer (557)** match exactly (`handleKarmaScissors`/`handleViciousHammer`) — verified OK.

## 7. Server tests that will need updating

`server/test/server/shop/cashShop.test.ts`, `cashShopInventory.test.ts` encode the old sub-action numbers and the 0x03 result; add a buy round-trip test asserting the v95 body + 0x64 response once §2/§3 land.

## Suggested order
1. §2 + §3 buy path (client body + server decode + server 0x64/0x65 responses) — unblocks ordinary purchases.
2. §1 renumber C→S sub-actions to the v95/kinoko table.
3. §5 A1/A2/A4/A5/A6 client bugs.
4. §6 opcode-85 Vega/protector/megaphone bands.
5. §5 B1-B7 + §4.
