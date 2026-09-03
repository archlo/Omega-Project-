export declare class OutPacket {
    private _buffer;
    private _position;
    private constructor();
    static Raw(capacity?: number): OutPacket;
    static Of(header: number): OutPacket;
    get size(): number;
    get header(): number;
    writeByte(value: number): void;
    writeSByte(value: number): void;
    writeShort(value: number): void;
    writeUShort(value: number): void;
    writeInt(value: number): void;
    writeUInt(value: number): void;
    writeLong(value: bigint): void;
    writeFloat(value: number): void;
    writeDouble(value: number): void;
    writeBytes(bytes: Uint8Array): void;
    writeString(value?: string | null): void;
    writeStringFixed(value: string | null | undefined, length: number): void;
    toArray(): Uint8Array;
    asSpan(): Uint8Array;
    private ensureCapacity;
}
//# sourceMappingURL=OutPacket.d.ts.map