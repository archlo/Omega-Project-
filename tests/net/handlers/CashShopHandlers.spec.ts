import { describe, it, expect, beforeEach } from 'vitest';
import { PacketRouter } from '../../../src/net/session/PacketRouter.js';
import { CashShopHandlers } from '../../../src/net/handlers/CashShopHandlers.js';
import { OutHeader } from '../../../src/net/packet/OpCodes.js';
import { OutPacket } from '../../../src/net/packet/OutPacket.js';
import { InPacket } from '../../../src/net/packet/InPacket.js';
import type { CashItemResult } from '../../../src/net/handlers/CashShopHandlers.js';

function dispatchPayload(router: PacketRouter, opcode: number, payload: Uint8Array): void {
  const buf = new Uint8Array(2 + payload.length);
  buf[0] = opcode & 0xFF;
  buf[1] = (opcode >> 8) & 0xFF;
  buf.set(payload, 2);
  router.dispatch(new InPacket(buf), null as any);
}

describe('CashShopHandlers', () => {
  let router: PacketRouter;
  let handlers: CashShopHandlers;

  beforeEach(() => {
    router = new PacketRouter();
    handlers = new CashShopHandlers();
    handlers.register(router);
  });

  it('ChargeParamResult decodes Nexon Club ID string', () => {
    const values: string[] = [];
    handlers.onChargeParamResult = (nexonClubId) => values.push(nexonClubId);

    const p = OutPacket.Raw();
    p.writeString('jorge');
    dispatchPayload(router, OutHeader.CashShopChargeParamResult, p.toArray());

    expect(values).toEqual(['jorge']);
  });

  describe('CashItemResult sub-action decode', () => {
    it('0x54 LimitGoodsCountChanged: Decode4×3 (itemId, sn, remainCount)', () => {
      const values: CashItemResult[] = [];
      handlers.onCashItemResult = (args) => values.push(args);

      const p = OutPacket.Raw();
      p.writeByte(0x54);
      p.writeInt(100);
      p.writeInt(200);
      p.writeInt(300);
      dispatchPayload(router, OutHeader.CashShopCashItemResult, p.toArray());

      expect(values).toEqual([{ subAction: 0x54, itemId: 100, sn: 200, remainCount: 300 }]);
    });

    it('0x58 LoadLockerDone: Decode2(count) + buffer(55×count) + 4×Decode2', () => {
      const values: CashItemResult[] = [];
      handlers.onCashItemResult = (args) => values.push(args);

      const p = OutPacket.Raw();
      p.writeByte(0x58);
      p.writeShort(2);
      for (let i = 0; i < 110; i++) p.writeByte(i & 0xFF);
      p.writeShort(10); // trunkCount
      p.writeShort(20); // characterSlotCount
      p.writeShort(30); // buyCharacterCount
      p.writeShort(40); // characterCount
      dispatchPayload(router, OutHeader.CashShopCashItemResult, p.toArray());

      expect(values).toHaveLength(1);
      const r = values[0];
      if (r.subAction !== 0x58) { expect.fail(); return; }
      expect(r.itemCount).toBe(2);
      expect(r.items.length).toBe(110);
      expect(r.trunkCount).toBe(10);
      expect(r.characterSlotCount).toBe(20);
      expect(r.buyCharacterCount).toBe(30);
      expect(r.characterCount).toBe(40);
    });

    it('0x64 BuyDone: readBytes(55) single item buffer', () => {
      const values: any[] = [];
      handlers.onCashItemResult = (args) => values.push(args);

      const p = OutPacket.Raw();
      p.writeByte(0x64);
      for (let i = 0; i < 55; i++) p.writeByte(i);
      dispatchPayload(router, OutHeader.CashShopCashItemResult, p.toArray());

      expect(values).toHaveLength(1);
      expect(values[0].subAction).toBe(0x64);
      expect(values[0].itemBytes).toBeDefined();
      expect(values[0].itemBytes.length).toBe(55);
      expect(values[0].itemBytes[0]).toBe(0);
      expect(values[0].itemBytes[54]).toBe(54);
    });

    it('0x65 BuyFailed with reason + conditional Decode4', () => {
      const values: CashItemResult[] = [];
      handlers.onCashItemResult = (args) => values.push(args);

      const p = OutPacket.Raw();
      p.writeByte(0x65);
      p.writeByte(30);
      p.writeInt(999);
      dispatchPayload(router, OutHeader.CashShopCashItemResult, p.toArray());

      expect(values).toHaveLength(1);
      const r = values[0];
      if (r.subAction !== 0x65) { expect.fail(); return; }
      expect(r.reason).toBe(30);
      expect(r.itemId).toBe(999);
    });

    it('0x59 simple failed: Decode1 reason', () => {
      const values: CashItemResult[] = [];
      handlers.onCashItemResult = (args) => values.push(args);

      const p = OutPacket.Raw();
      p.writeByte(0x59);
      p.writeByte(3);
      dispatchPayload(router, OutHeader.CashShopCashItemResult, p.toArray());

      expect(values).toEqual([{ subAction: 0x59, reason: 3 }]);
    });

    it('0x6B GiftDone: DecodeStr, Decode4, Decode2, Decode4', () => {
      const values: CashItemResult[] = [];
      handlers.onCashItemResult = (args) => values.push(args);

      const p = OutPacket.Raw();
      p.writeByte(0x6B);
      p.writeString('Recv');
      p.writeInt(100200);
      p.writeShort(5);
      p.writeInt(3300);
      dispatchPayload(router, OutHeader.CashShopCashItemResult, p.toArray());

      expect(values).toEqual([{ subAction: 0x6B, receiverName: 'Recv', itemId: 100200, quantity: 5, nxCost: 3300 }]);
    });

    it('0x66 UseCouponDone: Decode1 + buffers + Decode4s', () => {
      const values: any[] = [];
      handlers.onCashItemResult = (args) => values.push(args);

      const p = OutPacket.Raw();
      p.writeByte(0x66);
      p.writeByte(1);
      for (let i = 0; i < 55; i++) p.writeByte(i);
      p.writeInt(500);  // totalMaplePointGiven
      p.writeInt(2);    // inventorySlotCount
      for (let i = 0; i < 16; i++) p.writeByte(i);
      p.writeInt(1000); // mesoAmount
      dispatchPayload(router, OutHeader.CashShopCashItemResult, p.toArray());

      expect(values).toHaveLength(1);
      expect(values[0].subAction).toBe(0x66);
      expect(values[0].itemCount).toBe(1);
      expect(values[0].items.length).toBe(55);
      expect(values[0].totalMaplePointGiven).toBe(500);
      expect(values[0].inventorySlotCount).toBe(2);
      expect(values[0].inventorySlots.length).toBe(16);
      expect(values[0].mesoAmount).toBe(1000);
    });

    it('0xAF PurchaseRecord: Decode4 + Decode1', () => {
      const values: CashItemResult[] = [];
      handlers.onCashItemResult = (args) => values.push(args);

      const p = OutPacket.Raw();
      p.writeByte(0xAF);
      p.writeInt(42);
      p.writeByte(1);
      dispatchPayload(router, OutHeader.CashShopCashItemResult, p.toArray());

      expect(values).toEqual([{ subAction: 0xAF, key: 42, available: true }]);
    });

    it('0xB7 CashGachaponOpenDone: buffer8 + Decode4 + Decode1 + conditional buffer55 + Decode4 + Decode1', () => {
      const values: any[] = [];
      handlers.onCashItemResult = (args) => values.push(args);

      const p = OutPacket.Raw();
      p.writeByte(0xB7);
      for (let i = 0; i < 8; i++) p.writeByte(i);
      p.writeInt(10);   // remain
      p.writeByte(1);   // isCashItem
      for (let i = 0; i < 55; i++) p.writeByte(0xFF);
      p.writeInt(77);   // v10
      p.writeByte(88);  // v11
      dispatchPayload(router, OutHeader.CashShopCashItemResult, p.toArray());

      expect(values).toHaveLength(1);
      expect(values[0].subAction).toBe(0xB7);
      expect(values[0].snBytes).toBeDefined();
      expect(values[0].snBytes.length).toBe(8);
      expect(values[0].remain).toBe(10);
      expect(values[0].isCashItem).toBe(true);
      expect(values[0].itemBytes.length).toBe(55);
      expect(values[0].v10).toBe(77);
      expect(values[0].v11).toBe(88);
    });

    it('default fallback reads Decode1', () => {
      const values: any[] = [];
      handlers.onCashItemResult = (args) => values.push(args);

      const p = OutPacket.Raw();
      p.writeByte(0xFF); // unknown sub-action
      p.writeByte(7);
      dispatchPayload(router, OutHeader.CashShopCashItemResult, p.toArray());

      expect(values).toHaveLength(1);
      expect(values[0].subAction).toBe(0xFF);
      expect(values[0].reason).toBe(7);
    });
  });

  it('GiftMateInfoResult failure consumes success byte only', () => {
    const values: any[] = [];
    handlers.onGiftMateInfoResult = (args) => values.push(args);

    const p = OutPacket.Raw();
    p.writeByte(0);
    dispatchPayload(router, OutHeader.CashShopGiftMateInfoResult, p.toArray());

    expect(values).toEqual([{
      success: false,
      ssn2: null,
      commoditySn: null,
      giveTo: null,
      text: null,
      characterDataPayload: new Uint8Array(0),
    }]);
  });

  it('GiftMateInfoResult success decodes confirmed prefix and preserves CharacterData tail', () => {
    const values: any[] = [];
    handlers.onGiftMateInfoResult = (args) => values.push(args);

    const characterDataTail = new Uint8Array([1, 2, 3, 4, 5]);
    const p = OutPacket.Raw();
    p.writeByte(1);
    p.writeInt(111);
    p.writeInt(222);
    p.writeString('Recipient');
    p.writeString('Enjoy!');
    p.writeBytes(characterDataTail);
    dispatchPayload(router, OutHeader.CashShopGiftMateInfoResult, p.toArray());

    expect(values).toHaveLength(1);
    expect(values[0].success).toBe(true);
    expect(values[0].ssn2).toBe(111);
    expect(values[0].commoditySn).toBe(222);
    expect(values[0].giveTo).toBe('Recipient');
    expect(values[0].text).toBe('Enjoy!');
    expect(Array.from(values[0].characterDataPayload)).toEqual(Array.from(characterDataTail));
  });

  it('QueryCashResult decodes the three OG cash balances', () => {
    const values: any[] = [];
    handlers.onQueryCashResult = (amount) => values.push(amount);

    const p = OutPacket.Raw();
    p.writeInt(100);
    p.writeInt(200);
    p.writeInt(300);
    dispatchPayload(router, OutHeader.CashShopQueryCashResult, p.toArray());

    expect(values).toEqual([{ nexonCash: 100, maplePoint: 200, prepaidNxCash: 300 }]);
  });

  it('NoticeFreeCashItem has no payload', () => {
    let count = 0;
    handlers.onNoticeFreeCashItem = () => count++;

    dispatchPayload(router, OutHeader.CashShopNoticeFreeCashItem, new Uint8Array(0));

    expect(count).toBe(1);
  });
});
