import { WzCanvas } from './WzCanvas.js';
import { NxProperty } from './NxProperty.js';
/** NX-backed WzCanvas: bitmap data is stored pre-decompressed as raw BGRA8888. */
export class NxCanvas extends WzCanvas {
    _file;
    _node;
    _img;
    _info = null;
    _bgra = null;
    _nxProperty = null;
    constructor(file, node, img) {
        super(img, 0);
        this._file = file;
        this._node = node;
        this._img = img;
    }
    _ensureInfo() {
        if (this._info === null) {
            this._info = this._file.ReadBitmapInfo(this._node);
        }
        return this._info;
    }
    get Width() { return this._ensureInfo().width; }
    get Height() { return this._ensureInfo().height; }
    get Format() { return 2; }
    get FormatScale() { return 0; }
    get Property() {
        if (this._nxProperty === null) {
            this._nxProperty = new NxProperty(this._file, this._node, this._img);
        }
        return this._nxProperty;
    }
    DecodeBgra() {
        if (this._bgra === null) {
            const info = this._ensureInfo();
            const raw = this._file.GetBitmapBgra(info.id, info.width * info.height * 4);
            const out = new Uint8Array(info.width * info.height * 4);
            const len = Math.min(raw.length, out.length);
            for (let i = 0; i + 3 < len; i += 4) {
                out[i + 0] = raw[i + 2]; // R
                out[i + 1] = raw[i + 1]; // G
                out[i + 2] = raw[i + 0]; // B
                out[i + 3] = raw[i + 3]; // A
            }
            this._bgra = out;
        }
        return this._bgra;
    }
}
//# sourceMappingURL=NxCanvas.js.map