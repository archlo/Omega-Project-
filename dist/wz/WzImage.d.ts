import type { WzPackage } from './WzPackage.js';
import type { WzBuffer } from './WzBuffer.js';
import type { WzCrypto } from './WzCrypto.js';
import { WzProperty } from './WzProperty.js';
export declare class WzImage {
    private _parent;
    private _root;
    readonly Offset: number;
    constructor(parent: WzPackage, offset: number);
    get Package(): WzPackage;
    get Crypto(): WzCrypto;
    GetBuffer(offset: number): WzBuffer;
    get Root(): WzProperty;
    GetItem(path: string): unknown;
}
//# sourceMappingURL=WzImage.d.ts.map