import type { WzImage } from './WzImage.js';
import { WzCanvas } from './WzCanvas.js';
import { WzProperty } from './WzProperty.js';
import { NxFile, type NxNodeView } from './NxFile.js';
import { NxProperty } from './NxProperty.js';

/** NX-backed WzCanvas: bitmap data is stored pre-decompressed as raw BGRA8888. */
export class NxCanvas extends WzCanvas {
  private readonly _file: NxFile;
  private readonly _node: NxNodeView;
  private readonly _img: WzImage;
  private _info: { id: number; width: number; height: number } | null = null;
  private _bgra: Uint8Array | null = null;
  private _nxProperty: WzProperty | null = null;

  constructor(file: NxFile, node: NxNodeView, img: WzImage) {
    super(img, 0);
    this._file = file;
    this._node = node;
    this._img = img;
  }

  private _ensureInfo(): { id: number; width: number; height: number } {
    if (this._info === null) {
      this._info = this._file.ReadBitmapInfo(this._node);
    }
    return this._info;
  }

  override get Width(): number { return this._ensureInfo().width; }
  override get Height(): number { return this._ensureInfo().height; }
  override get Format(): number { return 2; }
  override get FormatScale(): number { return 0; }

  override get Property(): WzProperty {
    if (this._nxProperty === null) {
      this._nxProperty = new NxProperty(this._file, this._node, this._img);
    }
    return this._nxProperty;
  }

  override DecodeBgra(): Uint8Array {
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
