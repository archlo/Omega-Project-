import { InPacket } from './InPacket.js';
import { InventoryItem } from '../../domain/InventoryItem.js';
export declare class ItemDecoder {
    static Decode(p: InPacket): InventoryItem;
    private static _decodeEquip;
    private static _isRechargeable;
}
//# sourceMappingURL=ItemDecoder.d.ts.map