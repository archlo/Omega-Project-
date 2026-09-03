import { WzReaderException } from './WzReaderException.js';
export class WzBuffer {
    _buffer;
    _dv;
    _pos;
    constructor(_buffer, initialPosition = 0) {
        this._buffer = _buffer;
        this._dv = new DataView(_buffer);
        this._pos = initialPosition;
    }
    get Position() { return this._pos; }
    set Position(v) { this._pos = v; }
    get Length() { return this._buffer.byteLength; }
    _ensure(size) {
        if (this._pos + size > this._buffer.byteLength) {
            throw new WzReaderException(`WzBuffer underflow: need ${size} bytes at pos ${this._pos}, have ${this._buffer.byteLength - this._pos}`);
        }
    }
    ReadByte() {
        this._ensure(1);
        const v = this._dv.getUint8(this._pos);
        this._pos++;
        return v;
    }
    ReadSByte() {
        this._ensure(1);
        const v = this._dv.getInt8(this._pos);
        this._pos++;
        return v;
    }
    ReadShort() {
        this._ensure(2);
        const v = this._dv.getInt16(this._pos, true);
        this._pos += 2;
        return v;
    }
    ReadUShort() {
        this._ensure(2);
        const v = this._dv.getUint16(this._pos, true);
        this._pos += 2;
        return v;
    }
    ReadInt() {
        this._ensure(4);
        const v = this._dv.getInt32(this._pos, true);
        this._pos += 4;
        return v;
    }
    ReadLong() {
        this._ensure(8);
        const v = this._dv.getBigInt64(this._pos, true);
        this._pos += 8;
        return v;
    }
    ReadFloat() {
        this._ensure(4);
        const v = this._dv.getFloat32(this._pos, true);
        this._pos += 4;
        return v;
    }
    ReadDouble() {
        this._ensure(8);
        const v = this._dv.getFloat64(this._pos, true);
        this._pos += 8;
        return v;
    }
    ReadBytes(count) {
        if (count < 0)
            count = 0;
        this._ensure(count);
        const buf = new Uint8Array(count);
        if (count > 0) {
            const src = new Uint8Array(this._buffer, this._pos, count);
            buf.set(src);
            this._pos += count;
        }
        return buf;
    }
}
//# sourceMappingURL=WzBuffer.js.map