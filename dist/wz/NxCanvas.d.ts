import type { WzImage } from './WzImage.js';
import { WzCanvas } from './WzCanvas.js';
import { WzProperty } from './WzProperty.js';
import { NxFile, type NxNodeView } from './NxFile.js';
/** NX-backed WzCanvas: bitmap data is stored pre-decompressed as raw BGRA8888. */
export declare class NxCanvas extends WzCanvas {
    private readonly _file;
    private readonly _node;
    private readonly _img;
    private _info;
    private _bgra;
    private _nxProperty;
    constructor(file: NxFile, node: NxNodeView, img: WzImage);
    private _ensureInfo;
    get Width(): number;
    get Height(): number;
    get Format(): number;
    get FormatScale(): number;
    get Property(): WzProperty;
    DecodeBgra(): Uint8Array;
}
//# sourceMappingURL=NxCanvas.d.ts.map