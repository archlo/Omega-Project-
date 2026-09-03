export declare class InPacket {
    private _data;
    private _position;
    get position(): number;
    get remaining(): number;
    get length(): number;
    get data(): Uint8Array;
    constructor(data: Uint8Array);
    peekByte(): number;
    peekShort(): number;
    readByte(): number;
    readSByte(): number;
    readBool(): boolean;
    readShort(): number;
    readUShort(): number;
    readInt(): number;
    readUInt(): number;
    readLong(): bigint;
    readFloat(): number;
    readDouble(): number;
    readBytes(count: number): Uint8Array;
    readString(length?: number): string;
    skip(count: number): void;
    rewind(): void;
    Clone(): InPacket;
    private ensureRemaining;
}
//# sourceMappingURL=InPacket.d.ts.map