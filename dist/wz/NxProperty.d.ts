import type { WzImage } from './WzImage.js';
import { WzProperty } from './WzProperty.js';
import { NxFile, type NxNodeView } from './NxFile.js';
/**
 * NX-backed WzProperty. NX type 1 (int64) is returned as `bigint` to match
 * WzProperty's `case 20`, which existing consumers already normalize via
 * `typeof v === 'bigint' ? Number(v) : v`.
 */
export declare class NxProperty extends WzProperty {
    private readonly _file;
    private readonly _node;
    private readonly _img;
    private _itemsCache;
    constructor(file: NxFile, node: NxNodeView, img: WzImage);
    get Items(): Record<string, unknown>;
    private _toValue;
}
//# sourceMappingURL=NxProperty.d.ts.map