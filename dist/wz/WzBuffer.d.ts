export declare class WzBuffer {
    private _buffer;
    private _dv;
    private _pos;
    constructor(_buffer: ArrayBuffer, initialPosition?: number);
    get Position(): number;
    set Position(v: number);
    get Length(): number;
    private _ensure;
    ReadByte(): number;
    ReadSByte(): number;
    ReadShort(): number;
    ReadUShort(): number;
    ReadInt(): number;
    ReadLong(): bigint;
    ReadFloat(): number;
    ReadDouble(): number;
    ReadBytes(count: number): Uint8Array;
}
//# sourceMappingURL=WzBuffer.d.ts.map