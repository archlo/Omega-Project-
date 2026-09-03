import { PacketRouter } from '../session/PacketRouter.js';
export interface CashShopCashAmount {
    nexonCash: number;
    maplePoint: number;
    prepaidNxCash: number;
}
export interface CashShopGachaponResult {
    isSuccess: boolean;
    itemSn: bigint | null;
    count: number | null;
}
export interface OneADayPrevItem {
    date: number;
    sn: number;
    originalSn: number;
}
export interface CashShopOneADayResult {
    itemDate: number;
    itemSn: number;
    count: number;
    prevItems: OneADayPrevItem[];
}
export interface CashShopTransferWorldResult {
    result: number;
    birthDate: number;
    worldNames: string[];
}
export interface CashShopGiftMateInfoResult {
    success: boolean;
    ssn2: number | null;
    commoditySn: number | null;
    giveTo: string | null;
    text: string | null;
    characterDataPayload: Uint8Array;
}
/** Discriminated union for every CCashShop::OnCashItemResult sub-action
 *  (decompile/499370.c — 54-way switch on leading byte). Each member
 *  carries the exact fields the real client decodes for that sub-action.
 *  Buffers marked "raw" (e.g. GW_CashItemInfo, GW_GiftList) expose the
 *  opaque struct bytes for consumers that need them. */
export type CashItemResult = {
    subAction: 0x54;
    itemId: number;
    sn: number;
    remainCount: number;
} | {
    subAction: 0x58;
    itemCount: number;
    items: Uint8Array;
    trunkCount: number;
    characterSlotCount: number;
    buyCharacterCount: number;
    characterCount: number;
} | {
    subAction: 0x59;
    reason: number;
} | {
    subAction: 0x5A;
    giftCount: number;
    gifts: Uint8Array;
} | {
    subAction: 0x5B;
    reason: number;
} | {
    subAction: 0x5C;
    wishlist: number[];
} | {
    subAction: 0x5D;
    reason: number;
} | {
    subAction: 0x62;
    wishlist: number[];
} | {
    subAction: 0x63;
    reason: number;
} | {
    subAction: 0x64;
    itemBytes: Uint8Array;
} | {
    subAction: 0x65;
    reason: number;
    itemId?: number;
    subReason?: number;
} | {
    subAction: 0x66;
    itemCount: number;
    items: Uint8Array;
    totalMaplePointGiven: number;
    inventorySlotCount: number;
    inventorySlots: Uint8Array;
    mesoAmount: number;
} | {
    subAction: 0x68;
    receiverName: string;
    itemCount: number;
    items: Uint8Array;
    maplePointCost: number;
} | {
    subAction: 0x69;
    reason: number;
} | {
    subAction: 0x6B;
    receiverName: string;
    itemId: number;
    quantity: number;
    nxCost: number;
} | {
    subAction: 0x6C;
    reason: number;
} | {
    subAction: 0x6D;
    invType: number;
    newSlotCount: number;
} | {
    subAction: 0x6E;
    reason: number;
} | {
    subAction: 0x6F;
    trunkCount: number;
} | {
    subAction: 0x70;
    reason: number;
} | {
    subAction: 0x71;
    characterSlotCount: number;
} | {
    subAction: 0x72;
    reason: number;
} | {
    subAction: 0x73;
    buyCharacterCount: number;
} | {
    subAction: 0x74;
    reason: number;
} | {
    subAction: 0x75;
    bodyPartIndex: number;
    daysAdded: number;
} | {
    subAction: 0x76;
    reason: number;
} | {
    subAction: 0x77;
    position: number;
    itemBytes: Uint8Array;
} | {
    subAction: 0x78;
    reason: number;
} | {
    subAction: 0x79;
    itemBytes: Uint8Array;
} | {
    subAction: 0x7A;
    reason: number;
} | {
    subAction: 0x7B;
    snBytes: Uint8Array;
} | {
    subAction: 0x7C;
    reason: number;
} | {
    subAction: 0x7D;
    snBytes: Uint8Array;
} | {
    subAction: 0x96;
    snBytes: Uint8Array;
    maplePointAmount: number;
} | {
    subAction: 0x97;
    reason: number;
} | {
    subAction: 0x98;
    itemBytes: Uint8Array;
    receiverName: string;
    itemId: number;
    quantity: number;
} | {
    subAction: 0x99;
    reason: number;
    itemId?: number;
} | {
    subAction: 0x9A;
    itemCount: number;
    items: Uint8Array;
    v2: number;
} | {
    subAction: 0x9B;
    reason: number;
    itemId?: number;
} | {
    subAction: 0x9C;
    receiverName: string;
    itemId: number;
    u1: number;
    u2: number;
    nxCost: number;
} | {
    subAction: 0x9D;
    reason: number;
    itemId?: number;
} | {
    subAction: 0x9E;
    count: number;
    itemSnBytes: Uint8Array;
} | {
    subAction: 0x9F;
    reason: number;
    itemId?: number;
} | {
    subAction: 0xA2;
    itemBytes: Uint8Array;
    receiverName: string;
    itemId: number;
    quantity: number;
} | {
    subAction: 0xA3;
    reason: number;
    itemId?: number;
} | {
    subAction: 0xAA;
    itemBytes: Uint8Array;
} | {
    subAction: 0xAF;
    key: number;
    available: boolean;
} | {
    subAction: 0xB0;
    reason: number;
} | {
    subAction: 0xB3;
    itemBytes: Uint8Array;
} | {
    subAction: 0xB5;
    itemBytes: Uint8Array;
} | {
    subAction: 0xB6;
    reason: number;
} | {
    subAction: 0xB7;
    snBytes: Uint8Array;
    remain: number;
    isCashItem: boolean;
    itemBytes: Uint8Array | null;
    v10: number;
    v11: number;
} | {
    subAction: 0xB8;
    reason: number;
} | {
    subAction: 0xB9;
    b1: number;
    b2: number;
    discarded1: number;
    discarded2: number;
    randomItemLostItemId: number;
    randomItemLostNumber: number;
    itemBytes: Uint8Array | null;
} | {
    subAction: 0xBA;
    reason: number;
} | {
    subAction: 0xBB;
    snBytes: Uint8Array;
    maplePointAmount: number;
} | {
    subAction: 0xBC;
    reason: number;
};
/** CCashShop::OnPacket (decompile/4997E0.c) — each opcode has its own
 *  independent payload shape; no shared subtype byte across opcodes
 *  (384/CashItemResult is its own internal 54-way sub-dispatch mapped
 *  against decompile/499370.c). */
export declare class CashShopHandlers {
    onChargeParamResult: ((nexonClubId: string) => void) | null;
    onQueryCashResult: ((amount: CashShopCashAmount) => void) | null;
    onCashItemResult: ((args: CashItemResult) => void) | null;
    onPurchaseExpChanged: ((value: number) => void) | null;
    onGiftMateInfoResult: ((args: CashShopGiftMateInfoResult) => void) | null;
    onCheckDuplicatedIDResult: ((name: string, result: number) => void) | null;
    onCheckNameChangePossibleResult: ((result: number, birthDate: number) => void) | null;
    onCheckTransferWorldPossibleResult: ((args: CashShopTransferWorldResult) => void) | null;
    onGachaponStampResult: ((success: boolean, stampCount: number | null) => void) | null;
    onCashItemGachaponResult: ((args: CashShopGachaponResult) => void) | null;
    onOneADay: ((args: CashShopOneADayResult) => void) | null;
    onNoticeFreeCashItem: (() => void) | null;
    clear(): void;
    register(router: PacketRouter): void;
    private _handleQueryCashResult;
    private _handleCashItemResult;
    /** Decode the rest of the packet given the sub-action byte previously read.
     *  Every decode pattern is verified against the decompiled C++ body listed
     *  in the dispatch (decompile/499370.c → decompile/XXXX.c per callee). */
    private _decodeCashItemSubAction;
    private _handleGiftMateInfoResult;
    private _handleCheckDuplicatedID;
    private _handleCheckNameChangePossible;
    private _handleCheckTransferWorldPossible;
    private _handleGachaponStampResult;
    private _handleCashItemGachaponResult;
    private _handleOneADay;
}
//# sourceMappingURL=CashShopHandlers.d.ts.map