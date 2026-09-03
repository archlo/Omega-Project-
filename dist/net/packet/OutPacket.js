const textEncoder = new TextEncoder();
export class OutPacket {
    _buffer;
    _position = 0;
    constructor(initialCapacity = 32) {
        this._buffer = new Uint8Array(initialCapacity);
    }
    static Raw(capacity = 32) {
        return new OutPacket(capacity);
    }
    static Of(header) {
        const p = new OutPacket(32);
        p.writeShort(header);
        return p;
    }
    get size() { return this._position; }
    get header() {
        return this._position >= 2
            ? (this._buffer[0] | (this._buffer[1] << 8)) << 16 >> 16
            : 0;
    }
    writeByte(value) {
        this.ensureCapacity(1);
        this._buffer[this._position++] = value & 0xFF;
    }
    writeSByte(value) {
        this.writeByte(value);
    }
    writeShort(value) {
        this.ensureCapacity(2);
        this._buffer[this._position++] = value & 0xFF;
        this._buffer[this._position++] = (value >>> 8) & 0xFF;
    }
    writeUShort(value) {
        this.writeShort(value);
    }
    writeInt(value) {
        this.ensureCapacity(4);
        this._buffer[this._position++] = value & 0xFF;
        this._buffer[this._position++] = (value >>> 8) & 0xFF;
        this._buffer[this._position++] = (value >>> 16) & 0xFF;
        this._buffer[this._position++] = (value >>> 24) & 0xFF;
    }
    writeUInt(value) {
        this.writeInt(value);
    }
    writeLong(value) {
        this.ensureCapacity(8);
        for (let i = 0; i < 8; i++) {
            this._buffer[this._position++] = Number((value >> BigInt(i * 8)) & BigInt(0xFF));
        }
    }
    writeFloat(value) {
        this.ensureCapacity(4);
        const buf = new DataView(new ArrayBuffer(4));
        buf.setFloat32(0, value, true);
        for (let i = 0; i < 4; i++)
            this._buffer[this._position++] = buf.getUint8(i);
    }
    writeDouble(value) {
        this.ensureCapacity(8);
        const buf = new DataView(new ArrayBuffer(8));
        buf.setFloat64(0, value, true);
        for (let i = 0; i < 8; i++)
            this._buffer[this._position++] = buf.getUint8(i);
    }
    writeBytes(bytes) {
        if (bytes.length === 0)
            return;
        this.ensureCapacity(bytes.length);
        this._buffer.set(bytes, this._position);
        this._position += bytes.length;
    }
    writeString(value) {
        value ??= '';
        const bytes = textEncoder.encode(value);
        if (bytes.length > 32767)
            throw new Error('string too long for length-prefixed encoding');
        this.ensureCapacity(2 + bytes.length);
        this.writeShort(bytes.length);
        this.writeBytes(bytes);
    }
    writeStringFixed(value, length) {
        if (length < 0)
            throw new Error('length must be >= 0');
        value ??= '';
        this.ensureCapacity(length);
        const bytes = textEncoder.encode(value);
        const copyLen = Math.min(bytes.length, length);
        this._buffer.set(bytes.subarray(0, copyLen), this._position);
        for (let i = copyLen; i < length; i++) {
            this._buffer[this._position + i] = 0;
        }
        this._position += length;
    }
    toArray() {
        return new Uint8Array(this._buffer.buffer, 0, this._position);
    }
    asSpan() {
        return this._buffer.subarray(0, this._position);
    }
    ensureCapacity(needed) {
        const required = this._position + needed;
        if (required <= this._buffer.length)
            return;
        const newLen = Math.max(required, this._buffer.length * 2);
        const grown = new Uint8Array(newLen);
        grown.set(this._buffer.subarray(0, this._position));
        this._buffer = grown;
    }
}
//# sourceMappingURL=OutPacket.js.map