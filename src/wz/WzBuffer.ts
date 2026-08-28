import { WzReaderException } from './WzReaderException.js';

export class WzBuffer {
  private _dv: DataView;
  private _pos: number;

  constructor(
    private _buffer: ArrayBuffer,
    initialPosition = 0,
  ) {
    this._dv = new DataView(_buffer);
    this._pos = initialPosition;
  }

  get Position(): number { return this._pos; }
  set Position(v: number) { this._pos = v; }

  get Length(): number { return this._buffer.byteLength; }

  private _ensure(size: number): void {
    if (this._pos + size > this._buffer.byteLength) {
      throw new WzReaderException(
        `WzBuffer underflow: need ${size} bytes at pos ${this._pos}, have ${this._buffer.byteLength - this._pos}`,
      );
    }
  }

  ReadByte(): number {
    this._ensure(1);
    const v = this._dv.getUint8(this._pos);
    this._pos++;
    return v;
  }

  ReadSByte(): number {
    this._ensure(1);
    const v = this._dv.getInt8(this._pos);
    this._pos++;
    return v;
  }

  ReadShort(): number {
    this._ensure(2);
    const v = this._dv.getInt16(this._pos, true);
    this._pos += 2;
    return v;
  }

  ReadUShort(): number {
    this._ensure(2);
    const v = this._dv.getUint16(this._pos, true);
    this._pos += 2;
    return v;
  }

  ReadInt(): number {
    this._ensure(4);
    const v = this._dv.getInt32(this._pos, true);
    this._pos += 4;
    return v;
  }

  ReadLong(): bigint {
    this._ensure(8);
    const v = this._dv.getBigInt64(this._pos, true);
    this._pos += 8;
    return v;
  }

  ReadFloat(): number {
    this._ensure(4);
    const v = this._dv.getFloat32(this._pos, true);
    this._pos += 4;
    return v;
  }

  ReadDouble(): number {
    this._ensure(8);
    const v = this._dv.getFloat64(this._pos, true);
    this._pos += 8;
    return v;
  }

  ReadBytes(count: number): Uint8Array {
    if (count < 0) count = 0;
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
