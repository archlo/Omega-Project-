import { InPacket } from './InPacket.js';
import { ModifiedCommodity, SetITCArgs, SetCashShopArgs } from '../../domain/CashShopData.js';
export declare class CashShopDecoder {
    static DecodeITC(p: InPacket): SetITCArgs;
    static decodeModifiedCommodity(p: InPacket): ModifiedCommodity;
    private static decodeSaleInfo;
    static DecodeCashShop(p: InPacket): SetCashShopArgs;
    static decodeBestArray(raw: Uint8Array): {
        category: number;
        gender: number;
        sn: number;
    }[];
}
//# sourceMappingURL=CashShopDecoder.d.ts.map