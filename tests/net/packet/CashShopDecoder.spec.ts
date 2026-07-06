import { describe, it, expect } from 'vitest';
import { OutPacket } from '../../../src/net/packet/OutPacket.js';
import { InPacket } from '../../../src/net/packet/InPacket.js';
import { CashShopDecoder } from '../../../src/net/packet/CashShopDecoder.js';

function toPacket(p: OutPacket): InPacket {
  return new InPacket(p.toArray());
}

function writeEmptyCharacterData(p: OutPacket): void {
  p.writeLong(0n); // flag (no sections)
  p.writeByte(0); // combatOrders
  p.writeByte(0); // hasRemoveSn = false
}

describe('CashShopDecoder', () => {
  it('DecodeITC decodes CharacterData + CITC::LoadData fields', () => {
    const p = OutPacket.Raw();
    writeEmptyCharacterData(p);
    p.writeString('nexonClub1');
    p.writeInt(5000); // registerFeeMeso
    p.writeInt(3); // commissionRate
    p.writeInt(1000); // commissionBase
    p.writeInt(60); // auctionDurationMin
    p.writeInt(1440); // auctionDurationMax
    p.writeLong(123456789n); // serverTime FILETIME
    const args = CashShopDecoder.DecodeITC(toPacket(p));
    expect(args.nexonClubId).toBe('nexonClub1');
    expect(args.registerFeeMeso).toBe(5000);
    expect(args.commissionRate).toBe(3);
    expect(args.commissionBase).toBe(1000);
    expect(args.auctionDurationMin).toBe(60);
    expect(args.auctionDurationMax).toBe(1440);
    expect(args.serverTime).toBe(123456789n);
    expect(args.characterData.flag).toBe(0n);
  });

  it('decodeModifiedCommodity reads only flagged fields, in fixed order', () => {
    const p = OutPacket.Raw();
    const flags = 0x1 | 0x2 | 0x400 | 0x10000; // ITEMID, COUNT, ONSALE, PACKAGESN
    p.writeInt(flags);
    p.writeInt(2000001); // itemId
    p.writeShort(5); // count
    p.writeByte(1); // onSale
    p.writeByte(2); // packageSn count
    p.writeInt(111); p.writeInt(222);
    const m = CashShopDecoder.decodeModifiedCommodity(toPacket(p));
    expect(m).toEqual({
      flags,
      itemId: 2000001,
      count: 5,
      onSale: true,
      packageSnList: [111, 222],
    });
  });

  it('DecodeCashShop decodes full structure with empty sub-lists', () => {
    const p = OutPacket.Raw();
    writeEmptyCharacterData(p);
    p.writeByte(1); // cashShopAuthorized
    p.writeString('club2'); // nexonClubId
    // SetSaleInfo
    p.writeInt(0); // notSaleCount
    p.writeShort(0); // modifiedCount
    p.writeByte(0); // discountCount
    p.writeBytes(new Uint8Array(0x438)); // aBest raw
    p.writeShort(0); // stock count
    p.writeShort(0); // limitGoods count
    p.writeShort(0); // zeroGoods count
    p.writeByte(0); // eventOn
    p.writeInt(200); // highestCharacterLevelInAccount
    const args = CashShopDecoder.DecodeCashShop(toPacket(p));
    expect(args.cashShopAuthorized).toBe(true);
    expect(args.nexonClubId).toBe('club2');
    expect(args.notSaleSNs).toEqual([]);
    expect(args.modifiedCommodities).toEqual([]);
    expect(args.discountRates).toEqual([]);
    expect(args.best).toHaveLength(0x438);
    expect(args.stock).toHaveLength(0);
    expect(args.eventOn).toBe(false);
    expect(args.highestCharacterLevelInAccount).toBe(200);
  });

  it('DecodeCashShop skips nexonClubId when not authorized', () => {
    const p = OutPacket.Raw();
    writeEmptyCharacterData(p);
    p.writeByte(0); // cashShopAuthorized = false
    p.writeInt(0); p.writeShort(0); p.writeByte(0); // empty SetSaleInfo
    p.writeBytes(new Uint8Array(0x438));
    p.writeShort(0); p.writeShort(0); p.writeShort(0);
    p.writeByte(1); // eventOn
    p.writeInt(50);
    const args = CashShopDecoder.DecodeCashShop(toPacket(p));
    expect(args.cashShopAuthorized).toBe(false);
    expect(args.nexonClubId).toBe('');
    expect(args.eventOn).toBe(true);
  });

  it('DecodeCashShop decodes notSaleSNs, a modified commodity, a discount rate, and non-empty stock/limit/zero blocks', () => {
    const p = OutPacket.Raw();
    writeEmptyCharacterData(p);
    p.writeByte(0);
    p.writeInt(2); p.writeInt(1001); p.writeInt(1002); // notSaleSNs
    p.writeShort(1); // modifiedCount
    p.writeInt(5005); p.writeInt(0x4); p.writeInt(9999); // sn, flags=PRICE, price
    p.writeByte(1); p.writeByte(2); p.writeByte(3); p.writeByte(50); // discountCount=1, category, index, rate
    p.writeBytes(new Uint8Array(0x438));
    p.writeShort(2); p.writeBytes(new Uint8Array(8 * 2)); // stock
    p.writeShort(1); p.writeBytes(new Uint8Array(104 * 1)); // limitGoods
    p.writeShort(3); p.writeBytes(new Uint8Array(68 * 3)); // zeroGoods
    p.writeByte(0); p.writeInt(0);
    const args = CashShopDecoder.DecodeCashShop(toPacket(p));
    expect(args.notSaleSNs).toEqual([1001, 1002]);
    expect(args.modifiedCommodities).toEqual([{ sn: 5005, data: { flags: 0x4, price: 9999 } }]);
    expect(args.discountRates).toEqual([{ category: 2, index: 3, rate: 50 }]);
    expect(args.stock).toHaveLength(16);
    expect(args.limitGoods).toHaveLength(104);
    expect(args.zeroGoods).toHaveLength(204);
  });
});
