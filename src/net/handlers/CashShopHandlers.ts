import { InPacket } from '../packet/InPacket.js';
import { OutHeader } from '../packet/OpCodes.js';
import { PacketRouter } from '../session/PacketRouter.js';
import { ClientSession } from '../session/ClientSession.js';

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
export type CashItemResult =
  | { subAction: 0x54; itemId: number; sn: number; remainCount: number }
  | { subAction: 0x58; itemCount: number; items: Uint8Array; trunkCount: number; characterSlotCount: number; buyCharacterCount: number; characterCount: number }
  | { subAction: 0x59; reason: number }
  | { subAction: 0x5A; giftCount: number; gifts: Uint8Array }
  | { subAction: 0x5B; reason: number }
  | { subAction: 0x5C; wishlist: number[] }
  | { subAction: 0x5D; reason: number }
  | { subAction: 0x62; wishlist: number[] }
  | { subAction: 0x63; reason: number }
  | { subAction: 0x64; itemBytes: Uint8Array }
  | { subAction: 0x65; reason: number; itemId?: number; subReason?: number }
  | { subAction: 0x66; itemCount: number; items: Uint8Array; totalMaplePointGiven: number; inventorySlotCount: number; inventorySlots: Uint8Array; mesoAmount: number }
  | { subAction: 0x68; receiverName: string; itemCount: number; items: Uint8Array; maplePointCost: number }
  | { subAction: 0x69; reason: number }
  | { subAction: 0x6B; receiverName: string; itemId: number; quantity: number; nxCost: number }
  | { subAction: 0x6C; reason: number }
  | { subAction: 0x6D; invType: number; newSlotCount: number }
  | { subAction: 0x6E; reason: number }
  | { subAction: 0x6F; trunkCount: number }
  | { subAction: 0x70; reason: number }
  | { subAction: 0x71; characterSlotCount: number }
  | { subAction: 0x72; reason: number }
  | { subAction: 0x73; buyCharacterCount: number }
  | { subAction: 0x74; reason: number }
  | { subAction: 0x75; bodyPartIndex: number; daysAdded: number }
  | { subAction: 0x76; reason: number }
  | { subAction: 0x77; position: number; itemBytes: Uint8Array }
  | { subAction: 0x78; reason: number }
  | { subAction: 0x79; itemBytes: Uint8Array }
  | { subAction: 0x7A; reason: number }
  | { subAction: 0x7B; snBytes: Uint8Array }
  | { subAction: 0x7C; reason: number }
  | { subAction: 0x7D; snBytes: Uint8Array }
  | { subAction: 0x96; snBytes: Uint8Array; maplePointAmount: number }
  | { subAction: 0x97; reason: number }
  | { subAction: 0x98; itemBytes: Uint8Array; receiverName: string; itemId: number; quantity: number }
  | { subAction: 0x99; reason: number; itemId?: number }
  | { subAction: 0x9A; itemCount: number; items: Uint8Array; v2: number }
  | { subAction: 0x9B; reason: number; itemId?: number }
  | { subAction: 0x9C; receiverName: string; itemId: number; u1: number; u2: number; nxCost: number }
  | { subAction: 0x9D; reason: number; itemId?: number }
  | { subAction: 0x9E; count: number; itemSnBytes: Uint8Array }
  | { subAction: 0x9F; reason: number; itemId?: number }
  | { subAction: 0xA2; itemBytes: Uint8Array; receiverName: string; itemId: number; quantity: number }
  | { subAction: 0xA3; reason: number; itemId?: number }
  | { subAction: 0xAA; itemBytes: Uint8Array }
  | { subAction: 0xAF; key: number; available: boolean }
  | { subAction: 0xB0; reason: number }
  | { subAction: 0xB3; itemBytes: Uint8Array }
  | { subAction: 0xB5; itemBytes: Uint8Array }
  | { subAction: 0xB6; reason: number }
  | { subAction: 0xB7; snBytes: Uint8Array; remain: number; isCashItem: boolean; itemBytes: Uint8Array | null; v10: number; v11: number }
  | { subAction: 0xB8; reason: number }
  | { subAction: 0xB9; b1: number; b2: number; discarded1: number; discarded2: number; randomItemLostItemId: number; randomItemLostNumber: number; itemBytes: Uint8Array | null }
  | { subAction: 0xBA; reason: number }
  | { subAction: 0xBB; snBytes: Uint8Array; maplePointAmount: number }
  | { subAction: 0xBC; reason: number };

/** CCashShop::OnPacket (decompile/4997E0.c) — each opcode has its own
 *  independent payload shape; no shared subtype byte across opcodes
 *  (384/CashItemResult is its own internal 54-way sub-dispatch mapped
 *  against decompile/499370.c). */
export class CashShopHandlers {
  onChargeParamResult: ((nexonClubId: string) => void) | null = null;
  onQueryCashResult: ((amount: CashShopCashAmount) => void) | null = null;
  onCashItemResult: ((args: CashItemResult) => void) | null = null;
  onPurchaseExpChanged: ((value: number) => void) | null = null;
  onGiftMateInfoResult: ((args: CashShopGiftMateInfoResult) => void) | null = null;
  onCheckDuplicatedIDResult: ((name: string, result: number) => void) | null = null;
  onCheckNameChangePossibleResult: ((result: number, birthDate: number) => void) | null = null;
  onCheckTransferWorldPossibleResult: ((args: CashShopTransferWorldResult) => void) | null = null;
  onGachaponStampResult: ((success: boolean, stampCount: number | null) => void) | null = null;
  onCashItemGachaponResult: ((args: CashShopGachaponResult) => void) | null = null;
  onOneADay: ((args: CashShopOneADayResult) => void) | null = null;
  onNoticeFreeCashItem: (() => void) | null = null;

  clear(): void {
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

  register(router: PacketRouter): void {
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

  private _handleQueryCashResult(p: InPacket): void {
    const nexonCash = p.readInt();
    const maplePoint = p.readInt();
    const prepaidNxCash = p.readInt();
    this.onQueryCashResult?.({ nexonCash, maplePoint, prepaidNxCash });
  }

  private _handleCashItemResult(p: InPacket): void {
    // CCashShop::OnCashItemResult (decompile/499370.c) — 54-way switch.
    const subAction = p.readByte();
    this.onCashItemResult?.(this._decodeCashItemSubAction(subAction, p));
  }

  /** Decode the rest of the packet given the sub-action byte previously read.
   *  Every decode pattern is verified against the decompiled C++ body listed
   *  in the dispatch (decompile/499370.c → decompile/XXXX.c per callee). */
  private _decodeCashItemSubAction(sa: number, p: InPacket): CashItemResult {
    switch (sa) {
      case 0x54: { // LimitGoodsCountChanged (decompile/493F30.c)
        const itemId = p.readInt();
        const sn = p.readInt();
        const remainCount = p.readInt();
        return { subAction: sa as 0x54, itemId, sn, remainCount };
      }
      case 0x58: { // LoadLockerDone (decompile/494CB0.c)
        const itemCount = p.readShort();
        const items = itemCount > 0 ? p.readBytes(55 * itemCount) : new Uint8Array(0);
        const trunkCount = p.readShort();
        const characterSlotCount = p.readShort();
        const buyCharacterCount = p.readShort();
        const characterCount = p.readShort();
        return { subAction: sa as 0x58, itemCount, items, trunkCount, characterSlotCount, buyCharacterCount, characterCount };
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
        return { subAction: sa as any, reason: p.readByte() };
      case 0x5A: { // LoadGiftDone (decompile/496520.c)
        const giftCount = p.readShort();
        const gifts = giftCount > 0 ? p.readBytes(98 * giftCount) : new Uint8Array(0);
        return { subAction: sa as 0x5A, giftCount, gifts };
      }
      case 0x5C: // LoadWishDone (decompile/494020.c) — 10 int32 SNs
      case 0x62: { // SetWishDone (decompile/494D60.c)
        const wishlist: number[] = [];
        for (let i = 0; i < 10; i++) wishlist.push(p.readInt());
        return { subAction: sa as 0x5C | 0x62, wishlist };
      }
      case 0x64: // BuyDone (decompile/494DD0.c)
      case 0xAA: // FreeCashItemDone (decompile/494880.c)
      case 0x79: // MoveStoLDone (decompile/4948D0.c)
      case 0xB3: // NameChangeResBuyDone (decompile/495600.c)
      case 0xB5: // TransferWorldDone (decompile/495710.c)
        return { subAction: sa as any, itemBytes: p.readBytes(55) };
      case 0x65: { // BuyFailed (decompile/4969F0.c)
        const reason = p.readByte();
        let itemId: number | undefined;
        if (reason === 29 || reason === 30) itemId = p.readInt();
        let subReason: number | undefined;
        if (reason === 68) subReason = p.readByte();
        return { subAction: sa as 0x65, reason, itemId, subReason };
      }
      case 0x66: { // UseCouponDone (decompile/498670.c)
        const itemCount = p.readByte();
        const items = itemCount > 0 ? p.readBytes(55 * itemCount) : new Uint8Array(0);
        const totalMaplePointGiven = p.readInt();
        const inventorySlotCount = p.readInt();
        const inventorySlots = inventorySlotCount > 0 ? p.readBytes(8 * inventorySlotCount) : new Uint8Array(0);
        const mesoAmount = p.readInt();
        return { subAction: sa as 0x66, itemCount, items, totalMaplePointGiven, inventorySlotCount, inventorySlots, mesoAmount };
      }
      case 0x68: { // GiftCouponDone (decompile/498E10.c)
        const receiverName = p.readString();
        const itemCount = p.readByte();
        const items = itemCount > 0 ? p.readBytes(55 * itemCount) : new Uint8Array(0);
        const maplePointCost = p.readInt();
        return { subAction: sa as 0x68, receiverName, itemCount, items, maplePointCost };
      }
      case 0x6B: { // GiftDone (decompile/497050.c)
        const receiverName = p.readString();
        const itemId = p.readInt();
        const quantity = p.readShort();
        const nxCost = p.readInt();
        return { subAction: sa as 0x6B, receiverName, itemId, quantity, nxCost };
      }
      case 0x6D: { // IncSlotCountDone (decompile/497270.c)
        const invType = p.readByte();
        const newSlotCount = p.readShort();
        return { subAction: sa as 0x6D, invType, newSlotCount };
      }
      case 0x6F: // IncTrunkCountDone (decompile/494ED0.c)
        return { subAction: sa as 0x6F, trunkCount: p.readShort() };
      case 0x71: // IncCharacterSlotCountDone (decompile/494F70.c)
        return { subAction: sa as 0x71, characterSlotCount: p.readShort() };
      case 0x73: // IncBuyCharacterCountDone (decompile/495000.c)
        return { subAction: sa as 0x73, buyCharacterCount: p.readShort() };
      case 0x75: { // EnableEquipSlotExtDone (decompile/497490.c)
        const bodyPartIndex = p.readShort();
        const daysAdded = p.readShort();
        return { subAction: sa as 0x75, bodyPartIndex, daysAdded };
      }
      case 0x77: { // MoveLtoSDone (decompile/495050.c)
        const position = p.readShort();
        const itemBytes = p.readBytes(p.remaining);
        return { subAction: sa as 0x77, position, itemBytes };
      }
      case 0x7B: // DestroyDone (decompile/495250.c)
      case 0x7D: // ExpireDone (decompile/497760.c)
        return { subAction: sa as any, snBytes: p.readBytes(8) };
      case 0x96: { // RebateDone (decompile/497980.c)
        const snBytes = p.readBytes(8);
        const maplePointAmount = p.readInt();
        return { subAction: sa as 0x96, snBytes, maplePointAmount };
      }
      case 0x98: { // CoupleDone (decompile/497B70.c)
        const itemBytes = p.readBytes(55);
        const receiverName = p.readString();
        const itemId = p.readInt();
        const quantity = p.readShort();
        return { subAction: sa as 0x98, itemBytes, receiverName, itemId, quantity };
      }
      case 0x99: // CoupleFailed (decompile/497D20.c)
      case 0x9B: // BuyPackageFailed (decompile/496D40.c)
      case 0x9D: // GiftPackageFailed (decompile/496F20.c)
      case 0x9F: // BuyNormalFailed (decompile/497B00.c)
      case 0xA3: { // FriendShipFailed (decompile/497F40.c)
        const reason = p.readByte();
        let itemId: number | undefined;
        if (reason === 29 || reason === 30) itemId = p.readInt();
        return { subAction: sa as any, reason, itemId };
      }
      case 0x9A: { // BuyPackageDone (decompile/496B60.c)
        const itemCount = p.readByte();
        const items = itemCount > 0 ? p.readBytes(55 * itemCount) : new Uint8Array(0);
        const v2 = p.readShort();
        return { subAction: sa as 0x9A, itemCount, items, v2 };
      }
      case 0x9C: { // GiftPackageDone (decompile/496DC0.c)
        const receiverName = p.readString();
        const itemId = p.readInt();
        const u1 = p.readShort();
        const u2 = p.readShort();
        const nxCost = p.readInt();
        return { subAction: sa as 0x9C, receiverName, itemId, u1, u2, nxCost };
      }
      case 0x9E: { // BuyNormalDone (decompile/495310.c)
        const count = p.readInt();
        const itemSnBytes = count > 0 ? p.readBytes(8 * count) : new Uint8Array(0);
        return { subAction: sa as 0x9E, count, itemSnBytes };
      }
      case 0xA2: { // FriendShipDone (decompile/497D90.c)
        const itemBytes = p.readBytes(55);
        const receiverName = p.readString();
        const itemId = p.readInt();
        const quantity = p.readShort();
        return { subAction: sa as 0xA2, itemBytes, receiverName, itemId, quantity };
      }
      case 0xAF: { // PurchaseRecord (decompile/495B50.c)
        const key = p.readInt();
        const available = p.readByte() !== 0;
        return { subAction: sa as 0xAF, key, available };
      }
      case 0xB7: { // CashGachaponOpenDone (decompile/494AC0.c)
        const snBytes = p.readBytes(8);
        const remain = p.readInt();
        const isCashItem = p.readByte() !== 0;
        const itemBytes = isCashItem ? p.readBytes(55) : null;
        const v10 = p.readInt();
        const v11 = p.readByte();
        return { subAction: sa as 0xB7, snBytes, remain, isCashItem, itemBytes, v10, v11 };
      }
      case 0xB9: { // CashGachaponCopyDone (decompile/494B90.c)
        const b1 = p.readByte();
        const b2 = p.readByte();
        const discarded1 = p.readInt();
        const discarded2 = p.readInt();
        const randomItemLostItemId = p.readInt();
        const randomItemLostNumber = p.readInt();
        const itemBytes = (b1 && b2) ? p.readBytes(55) : null;
        return { subAction: sa as 0xB9, b1, b2, discarded1, discarded2, randomItemLostItemId, randomItemLostNumber, itemBytes };
      }
      case 0xBB: { // ChangeMaplePointDone (decompile/498520.c)
        const snBytes = p.readBytes(8);
        const maplePointAmount = p.readInt();
        return { subAction: sa as 0xBB, snBytes, maplePointAmount };
      }
      default:
        return { subAction: sa as any, reason: p.readByte() };
    }
  }

  private _handleGiftMateInfoResult(p: InPacket): void {
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

  private _handleCheckDuplicatedID(p: InPacket): void {
    const name = p.readString();
    const result = p.readSByte();
    this.onCheckDuplicatedIDResult?.(name, result);
  }

  private _handleCheckNameChangePossible(p: InPacket): void {
    p.readInt(); // characterId — discarded by the real client too
    const result = p.readSByte();
    const birthDate = p.readUInt();
    this.onCheckNameChangePossibleResult?.(result, birthDate);
  }

  private _handleCheckTransferWorldPossible(p: InPacket): void {
    p.readInt(); // characterId — discarded by the real client too
    const result = p.readSByte();
    const birthDate = p.readInt();
    const hasWorldList = p.readByte() !== 0;
    const worldNames: string[] = [];
    if (hasWorldList) {
      const worldCount = p.readInt();
      for (let i = 0; i < worldCount; i++) worldNames.push(p.readString());
    }
    this.onCheckTransferWorldPossibleResult?.({ result, birthDate, worldNames });
  }

  private _handleGachaponStampResult(p: InPacket): void {
    const success = p.readByte() !== 0;
    const stampCount = success ? p.readInt() : null;
    this.onGachaponStampResult?.(success, stampCount);
  }

  private _handleCashItemGachaponResult(p: InPacket): void {
    const subType = p.readByte();
    if (subType === 0xC1) {
      const itemSn = p.readLong();
      const count = p.readInt();
      p.skip(0x37); // TODO_AUDIT.md Hundred-and-fifty-sixth pass: GW_CashItemInfo — 55-byte raw struct confirmed via OG decompile/495820.c (OnCashItemGachaponResult): DecodeBuffer(iPacket, v11, 0x37u). Not decoded field-by-field; identical to the Move-to-Locker path (decompile/4948D0.c).
      this.onCashItemGachaponResult?.({ isSuccess: true, itemSn, count });
    } else {
      this.onCashItemGachaponResult?.({ isSuccess: false, itemSn: null, count: null });
    }
  }

  private _handleOneADay(p: InPacket): void {
    const itemDate = p.readInt();
    const itemSn = p.readInt();
    const count = p.readInt();
    const prevItems: import('./CashShopHandlers.js').OneADayPrevItem[] = [];
    for (let i = 0; i < count; i++) {
      const date = p.readInt();
      const sn = p.readInt();
      const originalSn = p.readInt();
      prevItems.push({ date, sn, originalSn });
    }
    this.onOneADay?.({ itemDate, itemSn, count, prevItems });
  }
}
