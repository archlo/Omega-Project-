export declare class MapleCrypto {
    /**
     * OG: AES::transform — XOR-encrypt data with AES-expanded IV.
     * Creates a FRESH AES-ECB instance per block to avoid any state leak.
     */
    static Crypt(data: Uint8Array, iv: Uint8Array): void;
}
//# sourceMappingURL=MapleCrypto.d.ts.map