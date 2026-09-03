export declare class PacketCipher {
    static GameVersion: number;
    static HeaderSize: number;
    static BuildHeader(payloadLen: number, iv: Uint8Array, destination: Uint8Array): void;
    static ParseHeader(header: Uint8Array, iv: Uint8Array): {
        valid: boolean;
        payloadLength: number;
    };
    static EncryptBody(body: Uint8Array, iv: Uint8Array): void;
    static DecryptBody(body: Uint8Array, iv: Uint8Array): void;
}
//# sourceMappingURL=PacketCipher.d.ts.map