import { WzReader } from './WzReader.js';
export class WzSound {
    _parent;
    _offset;
    _audioBytes = null;
    _durationMs = 0;
    constructor(_parent, _offset) {
        this._parent = _parent;
        this._offset = _offset;
    }
    get DurationMs() { this._ensureLoaded(); return this._durationMs; }
    get AudioBytes() { this._ensureLoaded(); return this._audioBytes; }
    _ensureLoaded() {
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
//# sourceMappingURL=WzSound.js.map