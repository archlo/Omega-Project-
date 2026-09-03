import type { WzPackage } from './WzPackage.js';
import { WzImage } from './WzImage.js';
export declare class WzDirectory {
    private _parent;
    private _offset;
    private _items;
    constructor(parent: WzPackage, offset: number);
    get Items(): Record<string, WzDirectory | WzImage>;
    GetItem(path: string): unknown;
    private _readDirectory;
    private _readDescrambledOffset;
}
//# sourceMappingURL=WzDirectory.d.ts.map