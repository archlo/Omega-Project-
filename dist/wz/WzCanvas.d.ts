import type { WzImage } from './WzImage.js';
import type { WzBuffer } from './WzBuffer.js';
import type { WzCrypto } from './WzCrypto.js';
import { WzProperty } from './WzProperty.js';
export declare class WzCanvas {
    private _parent;
    private _offset;
    private _headerRead;
    private _property;
    private _decodedBgra;
    private _width;
    private _height;
    private _format;
    private _formatScale;
    private _dataStartOffset;
    private _dataLength;
    get Width(): number;
    get Height(): number;
    get Format(): number;
    get FormatScale(): number;
    get Property(): WzProperty;
    constructor(parent: WzImage, offset: number);
    DecodeBgra(): Uint8Array;
    private _ensureDecodedHeader;
    static _readChildren(parent: WzImage, buf: WzBuffer, crypto: WzCrypto, items: Record<string, unknown>): void;
    private static _readChildValue;
    private static _readExtendedProperty;
    private static _convertToBgra;
    private static _expandFromScaled;
}
//# sourceMappingURL=WzCanvas.d.ts.map