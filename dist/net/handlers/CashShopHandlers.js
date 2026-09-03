import { OutHeader } from '../packet/OpCodes.js';
/** CCashShop::OnPacket (decompile/4997E0.c) — each opcode has its own
 *  independent payload shape; no shared subtype byte across opcodes
 *  (384/CashItemResult is its own internal 54-way sub-dispatch mapped
 *  against decompile/499370.c). */
export class CashShopHandlers {
    onChargeParamResult = null;
    onQueryCashResult = null;
    onCashItemResult = null;
    onPurchaseExpChanged = null;
    onGiftMateInfoResult = null;
    onCheckDuplicatedIDResult = null;
    onCheckNameChangePossibleResult = null;
    onCheckTransferWorldPossibleResult = null;
    onGachaponStampResult = null;
    onCashItemGachaponResult = null;
    onOneADay = null;
    onNoticeFreeCashItem = null;
    clear() {
        this.onChargeParamResult = null;
        this.onQueryCashResult = null;
        this.onCashItemResult = null;
        this.onPurchaseExpChanged = null;
        this.onGiftMateInfoResult = null;
        this.onCheckDuplicatedIDResult = null;
        this.onCheckNameChangePossibleResult = null;
        this.onCheckTransferWorldPossibleResult = null;
        this.onGachaponStampResult = null;
        this.onCashItemGachaponResult = null;
        this.onOneADay = null;
        this.onNoticeFreeCashItem = null;
    }
    register(router) {
        router.register(OutHeader.CashShopChargeParamResult, (p, s) => this.onChargeParamResult?.(p.readString()));
        router.register(OutHeader.CashShopQueryCashResult, (p, s) => this._handleQueryCashResult(p));
        router.register(OutHeader.CashShopCashItemResult, (p, s) => this._handleCashItemResult(p));
        router.register(OutHeader.CashShopPurchaseExpChanged, (p, s) => this.onPurchaseExpChanged?.(p.readByte()));
        router.register(OutHeader.CashShopGiftMateInfoResult, (p, s) => this._handleGiftMateInfoResult(p));
        router.register(OutHeader.CashShopCheckDuplicatedIDResult, (p, s) => this._handleCheckDuplicatedID(p));
        router.register(OutHeader.CashShopCheckNameChangePossibleResult, (p, s) => this._handleCheckNameChangePossible(p));
        router.register(OutHeader.CashShopCheckTransferWorldPossibleResult, (p, s) => this._handleCheckTransferWorldPossible(p));
        router.register(OutHeader.CashShopGachaponStampResult, (p, s) => this._handleGachaponStampResult(p));
        router.register(OutHeader.CashShopCashItemGachaponResultA, (p, s) => this._handleCashItemGachaponResult(p));
        router.register(OutHeader.CashShopCashItemGachaponResultB, (p, s) => this._handleCashItemGachaponResult(p));
        router.register(OutHeader.CashShopOneADay, (p, s) => this._handleOneADay(p));
        router.register(OutHeader.CashShopNoticeFreeCashItem, (p, s) => this.onNoticeFreeCashItem?.());
    }
    _handleQueryCashResult(p) {
        const nexonCash = p.readInt();
        const maplePoint = p.readInt();
        const prepaidNxCash = p.readInt();
        this.onQueryCashResult?.({ nexonCash, maplePoint, prepaidNxCash });
    }
    _handleCashItemResult(p) {
        // CCashShop::OnCashItemResult (decompile/499370.c) — 54-way switch.
        const subAction = p.readByte();
        this.onCashItemResult?.(this._decodeCashItemSubAction(subAction, p));
    }
    /** Decode the rest of the packet given the sub-action byte previously read.
     *  Every decode pattern is verified against the decompiled C++ body listed
     *  in the dispatch (decompile/499370.c → decompile/XXXX.c per callee). */
    _decodeCashItemSubAction(sa, p) {
        switch (sa) {
            case 0x54: { // LimitGoodsCountChanged (decompile/493F30.c)
                const itemId = p.readInt();
                const sn = p.readInt();
                const remainCount = p.readInt();
                return { subAction: sa, itemId, sn, remainCount };
            }
            case 0x58: { // LoadLockerDone (decompile/494CB0.c)
                const itemCount = p.readShort();
                const items = itemCount > 0 ? p.readBytes(55 * itemCount) : new Uint8Array(0);
                const trunkCount = p.readShort();
                const characterSlotCount = p.readShort();
                const buyCharacterCount = p.readShort();
                const characterCount = p.readShort();
                return { subAction: sa, itemCount, items, trunkCount, characterSlotCount, buyCharacterCount, characterCount };
            }
            case 0x59: // LoadLockerFailed (decompile/4964F0.c)
            case 0x5B: // LoadGiftFailed (decompile/496960.c)
            case 0x5D: // LoadWishFailed (decompile/496990.c)
            case 0x63: // SetWishFailed (decompile/4969C0.c)
            case 0x69: // UseCouponFailed (decompile/496F90.c)
            case 0x6C: // GiftFailed (decompile/497210.c)
            case 0x6E: // IncSlotCountFailed (decompile/497390.c)
            case 0x70: // IncTrunkCountFailed (decompile/4973D0.c)
            case 0x72: // IncCharacterSlotCountFailed (decompile/497410.c)
            case 0x74: // IncBuyCharacterCountFailed (decompile/497450.c)
            case 0x76: // EnableEquipSlotExtFailed (decompile/4976F0.c)
            case 0x78: // MoveLtoSFailed (decompile/497730.c)
            case 0x7A: // MoveStoLFailed (decompile/497920.c)
            case 0x7C: // DestroyFailed (decompile/497950.c)
            case 0x97: // RebateFailed (decompile/497AD0.c)
            case 0xB0: // PurchaseRecordFailed (decompile/494070.c)
            case 0xB6: // TransferWorldFailed (decompile/498370.c)
            case 0xB8: // CashGachaponOpenFailed (decompile/4962B0.c)
            case 0xBA: // CashGachaponCopyFailed (decompile/4962F0.c)
            case 0xBC: // ChangeMaplePointFailed (decompile/495910.c)
                return { subAction: sa, reason: p.readByte() };
            case 0x5A: { // LoadGiftDone (decompile/496520.c)
                const giftCount = p.readShort();
                const gifts = giftCount > 0 ? p.readBytes(98 * giftCount) : new Uint8Array(0);
                return { subAction: sa, giftCount, gifts };
            }
            case 0x5C: // LoadWishDone (decompile/494020.c) — 10 int32 SNs
            case 0x62: { // SetWishDone (decompile/494D60.c)
                const wishlist = [];
                for (let i = 0; i < 10; i++)
                    wishlist.push(p.readInt());
                return { subAction: sa, wishlist };
            }
            case 0x64: // BuyDone (decompile/494DD0.c)
            case 0xAA: // FreeCashItemDone (decompile/494880.c)
            case 0x79: // MoveStoLDone (decompile/4948D0.c)
            case 0xB3: // NameChangeResBuyDone (decompile/495600.c)
            case 0xB5: // TransferWorldDone (decompile/495710.c)
                return { subAction: sa, itemBytes: p.readBytes(55) };
            case 0x65: { // BuyFailed (decompile/4969F0.c)
                const reason = p.readByte();
                let itemId;
                if (reason === 29 || reason === 30)
                    itemId = p.readInt();
                let subReason;
                if (reason === 68)
                    subReason = p.readByte();
                return { subAction: sa, reason, itemId, subReason };
            }
            case 0x66: { // UseCouponDone (decompile/498670.c)
                const itemCount = p.readByte();
                const items = itemCount > 0 ? p.readBytes(55 * itemCount) : new Uint8Array(0);
                const totalMaplePointGiven = p.readInt();
                const inventorySlotCount = p.readInt();
                const inventorySlots = inventorySlotCount > 0 ? p.readBytes(8 * inventorySlotCount) : new Uint8Array(0);
                const mesoAmount = p.readInt();
                return { subAction: sa, itemCount, items, totalMaplePointGiven, inventorySlotCount, inventorySlots, mesoAmount };
            }
            case 0x68: { // GiftCouponDone (decompile/498E10.c)
                const receiverName = p.readString();
                const itemCount = p.readByte();
                const items = itemCount > 0 ? p.readBytes(55 * itemCount) : new Uint8Array(0);
                const maplePointCost = p.readInt();
                return { subAction: sa, receiverName, itemCount, items, maplePointCost };
            }
            case 0x6B: { // GiftDone (decompile/497050.c)
                const receiverName = p.readString();
                const itemId = p.readInt();
                const quantity = p.readShort();
                const nxCost = p.readInt();
                return { subAction: sa, receiverName, itemId, quantity, nxCost };
            }
            case 0x6D: { // IncSlotCountDone (decompile/497270.c)
                const invType = p.readByte();
                const newSlotCount = p.readShort();
                return { subAction: sa, invType, newSlotCount };
            }
            case 0x6F: // IncTrunkCountDone (decompile/494ED0.c)
                return { subAction: sa, trunkCount: p.readShort() };
            case 0x71: // IncCharacterSlotCountDone (decompile/494F70.c)
                return { subAction: sa, characterSlotCount: p.readShort() };
            case 0x73: // IncBuyCharacterCountDone (decompile/495000.c)
                return { subAction: sa, buyCharacterCount: p.readShort() };
            case 0x75: { // EnableEquipSlotExtDone (decompile/497490.c)
                const bodyPartIndex = p.readShort();
                const daysAdded = p.readShort();
                return { subAction: sa, bodyPartIndex, daysAdded };
            }
            case 0x77: { // MoveLtoSDone (decompile/495050.c)
                const position = p.readShort();
                const itemBytes = p.readBytes(p.remaining);
                return { subAction: sa, position, itemBytes };
            }
            case 0x7B: // DestroyDone (decompile/495250.c)
            case 0x7D: // ExpireDone (decompile/497760.c)
                return { subAction: sa, snBytes: p.readBytes(8) };
            case 0x96: { // RebateDone (decompile/497980.c)
                const snBytes = p.readBytes(8);
                const maplePointAmount = p.readInt();
                return { subAction: sa, snBytes, maplePointAmount };
            }
            case 0x98: { // CoupleDone (decompile/497B70.c)
                const itemBytes = p.readBytes(55);
                const receiverName = p.readString();
                const itemId = p.readInt();
                const quantity = p.readShort();
                return { subAction: sa, itemBytes, receiverName, itemId, quantity };
            }
            case 0x99: // CoupleFailed (decompile/497D20.c)
            case 0x9B: // BuyPackageFailed (decompile/496D40.c)
            case 0x9D: // GiftPackageFailed (decompile/496F20.c)
            case 0x9F: // BuyNormalFailed (decompile/497B00.c)
            case 0xA3: { // FriendShipFailed (decompile/497F40.c)
                const reason = p.readByte();
                let itemId;
                if (reason === 29 || reason === 30)
                    itemId = p.readInt();
                return { subAction: sa, reason, itemId };
            }
            case 0x9A: { // BuyPackageDone (decompile/496B60.c)
                const itemCount = p.readByte();
                const items = itemCount > 0 ? p.readBytes(55 * itemCount) : new Uint8Array(0);
                const v2 = p.readShort();
                return { subAction: sa, itemCount, items, v2 };
            }
            case 0x9C: { // GiftPackageDone (decompile/496DC0.c)
                const receiverName = p.readString();
                const itemId = p.readInt();
                const u1 = p.readShort();
                const u2 = p.readShort();
                const nxCost = p.readInt();
                return { subAction: sa, receiverName, itemId, u1, u2, nxCost };
            }
            case 0x9E: { // BuyNormalDone (decompile/495310.c)
                const count = p.readInt();
                const itemSnBytes = count > 0 ? p.readBytes(8 * count) : new Uint8Array(0);
                return { subAction: sa, count, itemSnBytes };
            }
            case 0xA2: { // FriendShipDone (decompile/497D90.c)
                const itemBytes = p.readBytes(55);
                const receiverName = p.readString();
                const itemId = p.readInt();
                const quantity = p.readShort();
                return { subAction: sa, itemBytes, receiverName, itemId, quantity };
            }
            case 0xAF: { // PurchaseRecord (decompile/495B50.c)
                const key = p.readInt();
                const available = p.readByte() !== 0;
                return { subAction: sa, key, available };
            }
            case 0xB7: { // CashGachaponOpenDone (decompile/494AC0.c)
                const snBytes = p.readBytes(8);
                const remain = p.readInt();
                const isCashItem = p.readByte() !== 0;
                const itemBytes = isCashItem ? p.readBytes(55) : null;
                const v10 = p.readInt();
                const v11 = p.readByte();
                return { subAction: sa, snBytes, remain, isCashItem, itemBytes, v10, v11 };
            }
            case 0xB9: { // CashGachaponCopyDone (decompile/494B90.c)
                const b1 = p.readByte();
                const b2 = p.readByte();
                const discarded1 = p.readInt();
                const discarded2 = p.readInt();
                const randomItemLostItemId = p.readInt();
                const randomItemLostNumber = p.readInt();
                const itemBytes = (b1 && b2) ? p.readBytes(55) : null;
                return { subAction: sa, b1, b2, discarded1, discarded2, randomItemLostItemId, randomItemLostNumber, itemBytes };
            }
            case 0xBB: { // ChangeMaplePointDone (decompile/498520.c)
                const snBytes = p.readBytes(8);
                const maplePointAmount = p.readInt();
                return { subAction: sa, snBytes, maplePointAmount };
            }
            default:
                return { subAction: sa, reason: p.readByte() };
        }
    }
    _handleGiftMateInfoResult(p) {
        const success = p.readByte() !== 0;
        if (!success) {
            this.onGiftMateInfoResult?.({
                success,
                ssn2: null,
                commoditySn: null,
                giveTo: null,
                text: null,
                characterDataPayload: new Uint8Array(0),
            });
            return;
        }
        const ssn2 = p.readInt();
        const commoditySn = p.readInt();
        const giveTo = p.readString();
        const text = p.readString();
        const characterDataPayload = p.readBytes(p.remaining);
        this.onGiftMateInfoResult?.({ success, ssn2, commoditySn, giveTo, text, characterDataPayload });
    }
    _handleCheckDuplicatedID(p) {
        const name = p.readString();
        const result = p.readSByte();
        this.onCheckDuplicatedIDResult?.(name, result);
    }
    _handleCheckNameChangePossible(p) {
        p.readInt(); // characterId — discarded by the real client too
        const result = p.readSByte();
        const birthDate = p.readUInt();
        this.onCheckNameChangePossibleResult?.(result, birthDate);
    }
    _handleCheckTransferWorldPossible(p) {
        p.readInt(); // characterId — discarded by the real client too
        const result = p.readSByte();
        const birthDate = p.readInt();
        const hasWorldList = p.readByte() !== 0;
        const worldNames = [];
        if (hasWorldList) {
            const worldCount = p.readInt();
            for (let i = 0; i < worldCount; i++)
                worldNames.push(p.readString());
        }
        this.onCheckTransferWorldPossibleResult?.({ result, birthDate, worldNames });
    }
    _handleGachaponStampResult(p) {
        const success = p.readByte() !== 0;
        const stampCount = success ? p.readInt() : null;
        this.onGachaponStampResult?.(success, stampCount);
    }
    _handleCashItemGachaponResult(p) {
        const subType = p.readByte();
        if (subType === 0xC1) {
            const itemSn = p.readLong();
            const count = p.readInt();
            p.skip(0x37); // TODO_AUDIT.md Hundred-and-fifty-sixth pass: GW_CashItemInfo — 55-byte raw struct confirmed via OG decompile/495820.c (OnCashItemGachaponResult): DecodeBuffer(iPacket, v11, 0x37u). Not decoded field-by-field; identical to the Move-to-Locker path (decompile/4948D0.c).
            this.onCashItemGachaponResult?.({ isSuccess: true, itemSn, count });
        }
        else {
            this.onCashItemGachaponResult?.({ isSuccess: false, itemSn: null, count: null });
        }
    }
    _handleOneADay(p) {
        const itemDate = p.readInt();
        const itemSn = p.readInt();
        const count = p.readInt();
        const prevItems = [];
        for (let i = 0; i < count; i++) {
            const date = p.readInt();
            const sn = p.readInt();
            const originalSn = p.readInt();
            prevItems.push({ date, sn, originalSn });
        }
        this.onOneADay?.({ itemDate, itemSn, count, prevItems });
    }
}
//# sourceMappingURL=CashShopHandlers.js.map