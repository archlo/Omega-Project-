export declare class WzCrypto {
    private static readonly BatchSize;
    private _aes;
    private _expandedIv;
    private _mask;
    static CreateGms(): WzCrypto;
    static CreateEmpty(): WzCrypto;
    private constructor();
    CryptAscii(data: Uint8Array): void;
    CryptUnicode(data: Uint8Array): void;
    private _ensureMaskSize;
}
//# sourceMappingURL=WzCrypto.d.ts.map