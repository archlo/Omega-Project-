const textDecoder = new TextDecoder('ascii');

export class InPacket {
  private _data: Uint8Array;
  private _position = 0;

  get position(): number { return this._position; }
  get remaining(): number { return this._data.length - this._position; }
  get length(): number { return this._data.length; }
  get data(): Uint8Array { return this._data; }

  constructor(data: Uint8Array) {
    this._data = new Uint8Array(data);
  }

  peekByte(): number {
    this.ensureRemaining(1);
    return this._data[this._position];
  }

  peekShort(): number {
    this.ensureRemaining(2);
    return (this._data[this._position] | (this._data[this._position + 1] << 8)) << 16 >> 16;
  }

  readByte(): number {
    this.ensureRemaining(1);
    return this._data[this._position++];
  }

  readSByte(): number {
    const v = this.readByte();
    return v >= 128 ? v - 256 : v;
  }

  readBool(): boolean {
    return this.readByte() !== 0;
  }

  readShort(): number {
    this.ensureRemaining(2);
    const v = (this._data[this._position] | (this._data[this._position + 1] << 8)) << 16 >> 16;
    this._position += 2;
    return v;
  }

  readUShort(): number {
    return this.readShort() & 0xFFFF;
  }

  readInt(): number {
    this.ensureRemaining(4);
    const v = (this._data[this._position] |
      (this._data[this._position + 1] << 8) |
      (this._data[this._position + 2] << 16) |
      (this._data[this._position + 3] << 24));
    this._position += 4;
    return v;
  }

  readUInt(): number {
    return this.readInt() >>> 0;
  }

  readLong(): bigint {
    this.ensureRemaining(8);
    let v = BigInt(0);
    for (let i = 0; i < 8; i++) {
      v |= BigInt(this._data[this._position + i]) << BigInt(i * 8);
    }
    this._position += 8;
    return v;
  }

  readFloat(): number {
    this.ensureRemaining(4);
    const buf = new DataView(this._data.buffer, this._data.byteOffset + this._position, 4);
    const v = buf.getFloat32(0, true);
    this._position += 4;
    return v;
  }

  readDouble(): number {
    this.ensureRemaining(8);
    const buf = new DataView(this._data.buffer, this._data.byteOffset + this._position, 8);
    const v = buf.getFloat64(0, true);
    this._position += 8;
    return v;
  }

  readBytes(count: number): Uint8Array {
    if (count < 0) throw new Error('count must be >= 0');
    this.ensureRemaining(count);
    const copy = new Uint8Array(this._data.buffer, this._data.byteOffset + this._position, count);
    this._position += count;
    return new Uint8Array(copy);
  }

  readString(length?: number): string {
    if (length === undefined) {
      const len = this.readShort();
      if (len < 0) throw new Error(`InPacket.readString: negative length ${len}`);
      this.ensureRemaining(len);
      const s = textDecoder.decode(this._data.subarray(this._position, this._position + len));
      this._position += len;
      return s;
    }
    if (length < 0) throw new Error('length must be >= 0');
    this.ensureRemaining(length);
    const slice = this._data.subarray(this._position, this._position + length);
    this._position += length;
    const nul = slice.indexOf(0);
    return textDecoder.decode(nul >= 0 ? slice.subarray(0, nul) : slice);
  }

  skip(count: number): void {
    if (count < 0) throw new Error('count must be >= 0');
    this.ensureRemaining(count);
    this._position += count;
  }

  rewind(): void {
    this._position = 0;
  }

  Clone(): InPacket {
    return new InPacket(this._data);
  }

  private ensureRemaining(count: number): void {
    if (this.remaining < count) {
      throw new Error(
        `InPacket: tried to read ${count} bytes but only ${this.remaining} remain (pos=${this._position}, len=${this._data.length})`);
    }
  }
}
