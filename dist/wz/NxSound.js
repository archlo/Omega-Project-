import { WzSound } from './WzSound.js';
/** NX-backed WzSound: audio blob is a complete WAV file; duration is read from its header. */
export class NxSound extends WzSound {
    _file;
    _node;
    _bytes = null;
    _nxDurationMs = 0;
    _loaded = false;
    constructor(file, node, img) {
        super(img, 0);
        this._file = file;
        this._node = node;
    }
    get AudioBytes() {
        this._nxEnsureLoaded();
        return this._bytes;
    }
    get DurationMs() {
        this._nxEnsureLoaded();
        return this._nxDurationMs;
    }
    _nxEnsureLoaded() {
        if (this._loaded) {
            return;
        }
        const info = this._file.ReadAudioInfo(this._node);
        this._bytes = this._file.GetAudioBytes(info.id, info.length);
        this._nxDurationMs = NxSound._wavDurationMs(this._bytes);
        this._loaded = true;
    }
    static _wavDurationMs(data) {
        if (data.length < 44) {
            return 0;
        }
        const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
        if (dv.getUint32(0, false) !== 0x52494646 /* RIFF */ || dv.getUint32(8, false) !== 0x57415645 /* WAVE */) {
            return 0;
        }
        let offset = 12;
        let sampleRate = 0;
        let channels = 0;
        let bitsPerSample = 0;
        let dataSize = 0;
        while (offset + 8 <= data.length) {
            const chunkId = dv.getUint32(offset, false);
            const chunkSize = dv.getUint32(offset + 4, true);
            if (chunkId === 0x666D7420 /* "fmt " */) {
                channels = dv.getUint16(offset + 10, true);
                sampleRate = dv.getUint32(offset + 12, true);
                bitsPerSample = dv.getUint16(offset + 22, true);
            }
            else if (chunkId === 0x64617461 /* "data" */) {
                dataSize = chunkSize;
            }
            offset += 8 + chunkSize + (chunkSize % 2);
        }
        if (sampleRate === 0 || channels === 0 || bitsPerSample === 0 || dataSize === 0) {
            return 0;
        }
        return Math.round((dataSize / (sampleRate * channels * (bitsPerSample / 8))) * 1000);
    }
}
//# sourceMappingURL=NxSound.js.map