/**
 * OG: Shanda crypto — 3-pass byte shuffle.
 * Ported verbatim from server's shanda.ts (Kinoko reference).
 * The encrypt/decrypt functions are exact copies of the server implementation.
 */

function rollLeft(value: number, shift: number): number {
  const overflow = ((value >>> 0) << (shift % 8)) >>> 0;
  return ((overflow & 0xff) | (overflow >>> 8)) & 0xff;
}

function rollRight(value: number, shift: number): number {
  const overflow = ((value >>> 0) << 8) >>> (shift % 8);
  return ((overflow & 0xff) | (overflow >>> 8)) & 0xff;
}

export class ShandaCrypto {
  static Encrypt(data: Uint8Array): void {
    const length = data.length;
    for (let i = 0; i < 3; i++) {
      let a = 0;
      for (let j = length; j > 0; j--) {
        let c = data[length - j];
        c = rollLeft(c, 3);
        c = (c + j) & 0xff;
        c ^= a;
        a = c;
        c = rollRight(a, j);
        c = (c ^ 0xff) & 0xff;
        c = (c + 0x48) & 0xff;
        data[length - j] = c;
      }
      a = 0;
      for (let j = length; j > 0; j--) {
        let c = data[j - 1];
        c = rollLeft(c, 4);
        c = (c + j) & 0xff;
        c ^= a;
        a = c;
        c ^= 0x13;
        c = rollRight(c, 3);
        data[j - 1] = c;
      }
    }
  }

  static Decrypt(data: Uint8Array): void {
    const length = data.length;
    for (let i = 0; i < 3; i++) {
      let a = 0;
      let b = 0;
      for (let j = length; j > 0; j--) {
        let c = data[j - 1];
        c = rollLeft(c, 3);
        c ^= 0x13;
        a = c;
        c ^= b;
        c = (c - j) & 0xff;
        c = rollRight(c, 4);
        b = a;
        data[j - 1] = c;
      }
      a = 0;
      b = 0;
      for (let j = length; j > 0; j--) {
        let c = data[length - j];
        c = (c - 0x48) & 0xff;
        c = (c ^ 0xff) & 0xff;
        c = rollLeft(c, j);
        a = c;
        c ^= b;
        c = (c - j) & 0xff;
        c = rollRight(c, 3);
        b = a;
        data[length - j] = c;
      }
    }
  }
}
