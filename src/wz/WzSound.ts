import type { WzImage } from './WzImage.js';
import type { WzBuffer } from './WzBuffer.js';
import type { WzCrypto } from './WzCrypto.js';
import { WzReader } from './WzReader.js';

export class WzSound {
  private _audioBytes: Uint8Array | null = null;
  private _durationMs = 0;

  constructor(
    private _parent: WzImage,
    private _offset: number,
  ) {}

  get DurationMs(): number { this._ensureLoaded(); return this._durationMs; }
  get AudioBytes(): Uint8Array { this._ensureLoaded(); return this._audioBytes!; }

  private _ensureLoaded(): void {
    if (this._audioBytes !== null) {
      return;
    }

    const buf = this._parent.GetBuffer(this._offset);
    const crypto = this._parent.Crypto;

    WzReader.ReadStringBlock(this._parent, buf, crypto);
    buf.Position++;
    const dataLength = WzReader.ReadCompressedInt(buf);
    this._durationMs = WzReader.ReadCompressedInt(buf);
    buf.Position += 82;
    this._audioBytes = buf.ReadBytes(dataLength);
  }
}
