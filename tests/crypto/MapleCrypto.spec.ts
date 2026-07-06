import { describe, it, expect } from 'vitest';
import { MapleCrypto } from '../../src/net/crypto/MapleCrypto.js';

function newDeterministicBuffer(length: number, seed: number): Uint8Array {
  const rng = new (class {
    private s = seed;
    next() { this.s = (this.s * 1103515245 + 12345) & 0x7fffffff; return this.s; }
  })();
  const buf = new Uint8Array(length);
  for (let i = 0; i < length; i++) buf[i] = rng.next() & 0xFF;
  return buf;
}

describe('MapleCrypto', () => {
  const lengths = [1, 15, 16, 17, 100, 1455, 1456, 1457, 2916, 4096];

  for (const len of lengths) {
    it(`crypt is symmetric with same iv for length ${len}`, () => {
      const iv = new Uint8Array([0xAB, 0xCD, 0xEF, 0x01]);
      const original = newDeterministicBuffer(len, len);
      const working = new Uint8Array(original);
      MapleCrypto.Crypt(working, iv);
      MapleCrypto.Crypt(working, iv);
      expect(working).toEqual(original);
    });
  }

  it('crypt does not mutate iv', () => {
    const iv = new Uint8Array([0xAB, 0xCD, 0xEF, 0x01]);
    const snapshot = new Uint8Array(iv);
    const data = newDeterministicBuffer(100, 1);
    MapleCrypto.Crypt(data, iv);
    expect(iv).toEqual(snapshot);
  });

  it('crypt empty buffer is a no-op', () => {
    const iv = new Uint8Array([0xAB, 0xCD, 0xEF, 0x01]);
    const empty = new Uint8Array(0);
    MapleCrypto.Crypt(empty, iv);
    expect(empty).toHaveLength(0);
  });

  it('crypt rejects wrong iv length', () => {
    const data = new Uint8Array(100);
    expect(() => MapleCrypto.Crypt(data, new Uint8Array([1, 2, 3]))).toThrow();
    expect(() => MapleCrypto.Crypt(data, new Uint8Array([1, 2, 3, 4, 5]))).toThrow();
  });

  it('crypt different ivs produce different ciphertext', () => {
    const iv1 = new Uint8Array([0xAB, 0xCD, 0xEF, 0x01]);
    const iv2 = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
    const data1 = newDeterministicBuffer(100, 1);
    const data2 = new Uint8Array(data1);
    MapleCrypto.Crypt(data1, iv1);
    MapleCrypto.Crypt(data2, iv2);
    expect(data1).not.toEqual(data2);
  });

  it('crypt changes buffer for non-trivial payload', () => {
    const iv = new Uint8Array([0xAB, 0xCD, 0xEF, 0x01]);
    const original = newDeterministicBuffer(100, 1);
    const working = new Uint8Array(original);
    MapleCrypto.Crypt(working, iv);
    expect(working).not.toEqual(original);
  });
});
