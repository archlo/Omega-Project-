function rotateLeft(x: number, y: number): number {
  const tmp = (x & 0xFF) << (y % 8);
  return ((tmp & 0xFF) | (tmp >>> 8)) & 0xFF;
}

function rotateRight(x: number, y: number): number {
  const tmp = ((x & 0xFF) << 8) >>> (y % 8);
  return ((tmp & 0xFF) | (tmp >>> 8)) & 0xFF;
}

export class ShandaCrypto {
  static Encrypt(data: Uint8Array): void {
    for (let pass = 0; pass < 3; pass++) {
      let a = data.length;
      let b = 0;
      for (let j = 0; j < data.length; j++) {
        b ^= (a + rotateLeft(data[j], 3)) & 0xFF;
        data[j] = (0x47 - rotateRight(b, a)) & 0xFF;
        a--;
      }
      a = data.length;
      b = 0;
      for (let j = data.length - 1; j >= 0; j--) {
        b ^= (a + rotateLeft(data[j], 4)) & 0xFF;
        data[j] = rotateRight((b ^ 0x13) & 0xFF, 3);
        a--;
      }
    }
  }

  static Decrypt(data: Uint8Array): void {
    for (let pass = 0; pass < 3; pass++) {
      let a = data.length;
      let b = 0;
      for (let j = data.length - 1; j >= 0; j--) {
        const c = (rotateLeft(data[j], 3) ^ 0x13) & 0xFF;
        data[j] = rotateRight(((b ^ c) - a) & 0xFF, 4);
        b = c;
        a--;
      }
      a = data.length;
      b = 0;
      for (let j = 0; j < data.length; j++) {
        const c = rotateLeft((~(data[j] - 0x48)) & 0xFF, a);
        data[j] = rotateRight(((b ^ c) - a) & 0xFF, 3);
        b = c;
        a--;
      }
    }
  }
}
