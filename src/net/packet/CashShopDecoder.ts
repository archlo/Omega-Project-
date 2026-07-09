import { InPacket } from './InPacket.js';
import { CharacterDataDecoder } from './CharacterDataDecoder.js';
import {
  ModifiedCommodity, ModifiedCommodityEntry, DiscountRateEntry, SetITCArgs, SetCashShopArgs,
} from '../../domain/CashShopData.js';

// kinoko-main/src/main/java/kinoko/server/cashshop/CommodityFlag.java
const CommodityFlag = {
  ITEMID: 0x1, COUNT: 0x2, PRICE: 0x4, BONUS: 0x8, PRIORITY: 0x10, PERIOD: 0x20,
  MAPLEPOINT: 0x40, MESO: 0x80, FORPREMIUMUSER: 0x100, COMMODITYGENDER: 0x200,
  ONSALE: 0x400, CLASS: 0x800, LIMIT: 0x1000, PBCASH: 0x2000, PBPOINT: 0x4000,
  PBGIFT: 0x8000, PACKAGESN: 0x10000, REQPOP: 0x20000, REQLEV: 0x40000,
} as const;

export class CashShopDecoder {
  // CITC::LoadData (decompile/574A60.c).
  static DecodeITC(p: InPacket): SetITCArgs {
    const characterData = CharacterDataDecoder.Decode(p);
    const nexonClubId = p.readString();
    const registerFeeMeso = p.readInt();
    const commissionRate = p.readInt();
    const commissionBase = p.readInt();
    const auctionDurationMin = p.readInt();
    const auctionDurationMax = p.readInt();
    const serverTime = p.readLong();
    return { characterData, nexonClubId, registerFeeMeso, commissionRate, commissionBase, auctionDurationMin, auctionDurationMax, serverTime };
  }

  // CS_COMMODITY::DecodeModifiedData. Read order is fixed by the OG if-chain
  // and does not follow bit value order — see ModifiedCommodity.encode in
  // kinoko-main for the authoritative order this mirrors.
  static decodeModifiedCommodity(p: InPacket): ModifiedCommodity {
    const flags = p.readInt();
    const has = (bit: number) => (flags & bit) !== 0;
    const m: ModifiedCommodity = { flags };
    if (has(CommodityFlag.ITEMID)) m.itemId = p.readInt();
    if (has(CommodityFlag.COUNT)) m.count = p.readShort();
    if (has(CommodityFlag.PRIORITY)) m.priority = p.readByte();
    if (has(CommodityFlag.PRICE)) m.price = p.readInt();
    if (has(CommodityFlag.BONUS)) m.bonus = p.readByte() !== 0;
    if (has(CommodityFlag.PERIOD)) m.period = p.readShort();
    if (has(CommodityFlag.REQPOP)) m.reqPop = p.readShort();
    if (has(CommodityFlag.REQLEV)) m.reqLevel = p.readShort();
    if (has(CommodityFlag.MAPLEPOINT)) m.maplePoint = p.readInt();
    if (has(CommodityFlag.MESO)) m.meso = p.readInt();
    if (has(CommodityFlag.FORPREMIUMUSER)) m.forPremiumUser = p.readByte() !== 0;
    if (has(CommodityFlag.COMMODITYGENDER)) m.gender = p.readByte();
    if (has(CommodityFlag.ONSALE)) m.onSale = p.readByte() !== 0;
    if (has(CommodityFlag.CLASS)) m.classField = p.readByte();
    if (has(CommodityFlag.LIMIT)) m.limit = p.readByte();
    if (has(CommodityFlag.PBCASH)) m.pbCash = p.readShort();
    if (has(CommodityFlag.PBPOINT)) m.pbPoint = p.readShort();
    if (has(CommodityFlag.PBGIFT)) m.pbGift = p.readShort();
    if (has(CommodityFlag.PACKAGESN)) {
      const count = p.readByte();
      m.packageSnList = Array.from({ length: count }, () => p.readInt());
    }
    return m;
  }

  // CWvsContext::SetSaleInfo (decompile/A06F80.c).
  private static decodeSaleInfo(p: InPacket): { notSaleSNs: number[]; modifiedCommodities: ModifiedCommodityEntry[]; discountRates: DiscountRateEntry[] } {
    const notSaleCount = p.readInt();
    const notSaleSNs = notSaleCount > 0 ? Array.from({ length: notSaleCount }, () => p.readInt()) : [];
    const modifiedCount = p.readShort();
    const modifiedCommodities: ModifiedCommodityEntry[] = [];
    for (let i = 0; i < modifiedCount; i++) {
      const sn = p.readInt();
      modifiedCommodities.push({ sn, data: CashShopDecoder.decodeModifiedCommodity(p) });
    }
    const discountCount = p.readByte();
    const discountRates: DiscountRateEntry[] = [];
    for (let i = 0; i < discountCount; i++) {
      discountRates.push({ category: p.readByte(), index: p.readByte(), rate: p.readByte() });
    }
    return { notSaleSNs, modifiedCommodities, discountRates };
  }

  // CCashShop::CCashShop + CCashShop::LoadData (decompile/4938B0.c, 492EA0.c).
  static DecodeCashShop(p: InPacket): SetCashShopArgs {
    const characterData = CharacterDataDecoder.Decode(p);
    const cashShopAuthorized = p.readByte() !== 0;
    const nexonClubId = cashShopAuthorized ? p.readString() : '';
    const { notSaleSNs, modifiedCommodities, discountRates } = CashShopDecoder.decodeSaleInfo(p);
    const best = p.readBytes(0x438); // 90 * {category:int, gender:int, commoditySn:int}
    const stockCount = p.readShort();
    const stock = stockCount > 0 ? p.readBytes(8 * stockCount) : new Uint8Array(0);
    const limitGoodsCount = p.readShort();
    const limitGoods = limitGoodsCount > 0 ? p.readBytes(104 * limitGoodsCount) : new Uint8Array(0);
    const zeroGoodsCount = p.readShort();
    const zeroGoods = zeroGoodsCount > 0 ? p.readBytes(68 * zeroGoodsCount) : new Uint8Array(0);
    const eventOn = p.readByte() !== 0;
    const highestCharacterLevelInAccount = p.readInt();
    return {
      characterData, cashShopAuthorized, nexonClubId, notSaleSNs, modifiedCommodities, discountRates,
      best, stock, limitGoods, zeroGoods, eventOn, highestCharacterLevelInAccount,
    };
  }

  // Decode the CS_BEST array: 1080 bytes = 90 entries of {category:int32, gender:int32, commoditySn:int32}
  static decodeBestArray(raw: Uint8Array): { category: number; gender: number; sn: number }[] {
    if (raw.length !== 0x438) {
      console.warn(`decodeBestArray: expected 0x438 bytes, got ${raw.length}`);
    }
    const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
    const entries: { category: number; gender: number; sn: number }[] = [];
    const count = Math.floor(raw.length / 12);
    for (let i = 0; i < count; i++) {
      const off = i * 12;
      entries.push({
        category: view.getInt32(off, true),
        gender: view.getInt32(off + 4, true),
        sn: view.getInt32(off + 8, true),
      });
    }
    return entries;
  }
}
