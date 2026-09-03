import type { WzImage } from './WzImage.js';
import { WzSound } from './WzSound.js';
import { NxFile, type NxNodeView } from './NxFile.js';
/** NX-backed WzSound: audio blob is a complete WAV file; duration is read from its header. */
export declare class NxSound extends WzSound {
    private readonly _file;
    private readonly _node;
    private _bytes;
    private _nxDurationMs;
    private _loaded;
    constructor(file: NxFile, node: NxNodeView, img: WzImage);
    get AudioBytes(): Uint8Array;
    get DurationMs(): number;
    private _nxEnsureLoaded;
    private static _wavDurationMs;
}
//# sourceMappingURL=NxSound.d.ts.map