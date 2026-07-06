import { CharacterData } from './CharacterData.js';

/** CS_COMMODITY::DecodeModifiedData (decompile/A06F80.c calls it; field
 *  shapes cross-verified against kinoko-main's ModifiedCommodity.encode,
 *  kinoko-main/src/main/java/kinoko/server/cashshop/ModifiedCommodity.java).
 *  Field presence is gated by `flags`; read order is fixed and does NOT
 *  follow bit-value order (see CashShopDecoder.decodeModifiedCommodity). */
export interface ModifiedCommodity {
  flags: number;
  itemId?: number;
  count?: number;
  priority?: number;
  price?: number;
  bonus?: boolean;
  period?: number;
  reqPop?: number;
  reqLevel?: number;
  maplePoint?: number;
  meso?: number;
  forPremiumUser?: boolean;
  gender?: number;
  onSale?: boolean;
  classField?: number;
  limit?: number;
  pbCash?: number;
  pbPoint?: number;
  pbGift?: number;
  packageSnList?: number[];
}

export interface ModifiedCommodityEntry { sn: number; data: ModifiedCommodity; }
export interface DiscountRateEntry { category: number; index: number; rate: number; }

/** CITC::LoadData (decompile/574A60.c). */
export interface SetITCArgs {
  characterData: CharacterData;
  nexonClubId: string;
  registerFeeMeso: number;
  commissionRate: number;
  commissionBase: number;
  auctionDurationMin: number;
  auctionDurationMax: number;
  serverTime: bigint;
}

/** CCashShop::CCashShop + CCashShop::LoadData + CWvsContext::SetSaleInfo
 *  (decompile/4938B0.c, 492EA0.c, A06F80.c). `best`/`stock`/`limitGoods`/
 *  `zeroGoods` are exposed as raw bytes: CS_BEST is a fixed 1080-byte table
 *  (90 * {category:int, gender:int, commoditySn:int}); CS_STOCK/CS_LIMITGOODS/
 *  CS_ZEROGOODS are opaque fixed-size records (8/104/68 bytes respectively)
 *  with no field-level info recoverable from this call site, and kinoko-main
 *  never populates any of them either. */
export interface SetCashShopArgs {
  characterData: CharacterData;
  cashShopAuthorized: boolean;
  nexonClubId: string;
  notSaleSNs: number[];
  modifiedCommodities: ModifiedCommodityEntry[];
  discountRates: DiscountRateEntry[];
  best: Uint8Array;
  stock: Uint8Array;
  limitGoods: Uint8Array;
  zeroGoods: Uint8Array;
  eventOn: boolean;
  highestCharacterLevelInAccount: number;
}
