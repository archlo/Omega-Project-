import type { WzImage } from './WzImage.js';
export declare class WzSound {
    private _parent;
    private _offset;
    private _audioBytes;
    private _durationMs;
    constructor(_parent: WzImage, _offset: number);
    get DurationMs(): number;
    get AudioBytes(): Uint8Array;
    private _ensureLoaded;
}
//# sourceMappingURL=WzSound.d.ts.map