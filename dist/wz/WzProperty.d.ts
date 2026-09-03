import type { WzImage } from './WzImage.js';
export declare class WzProperty {
    private _parent;
    private _offset;
    private _items;
    private _endPosition;
    constructor(parent: WzImage, offset: number, items?: Record<string, unknown>);
    get Items(): Record<string, unknown>;
    get EndPosition(): number;
    Get(key: string): unknown;
    GetItem(path: string): unknown;
    private _readItems;
    private static _readExtendedProperty;
}
//# sourceMappingURL=WzProperty.d.ts.map