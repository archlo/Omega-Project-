export interface HandshakeInfo {
    version: number;
    patch: string;
    sendIv: Uint8Array;
    recvIv: Uint8Array;
    locale: number;
}
export declare class HandshakeReader {
    static TryRead(buffer: Uint8Array): {
        info: HandshakeInfo;
        consumed: number;
    } | null;
}
//# sourceMappingURL=HandshakeReader.d.ts.map