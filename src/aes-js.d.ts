declare module 'aes-js' {
  export namespace ModeOfOperation {
    class ecb {
      constructor(key: Uint8Array);
      encrypt(plaintext: Uint8Array): Uint8Array;
      decrypt(ciphertext: Uint8Array): Uint8Array;
    }
  }
  export default { ModeOfOperation };
}
