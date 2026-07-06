import { describe, it, expect } from 'vitest';
import { ShandaCrypto } from '../../src/net/crypto/ShandaCrypto.js';

function newDeterministicBuffer(length: number, seed: number): Uint8Array {
  const rng = new (class {
    private s = seed;
    next() { this.s = (this.s * 1103515245 + 12345) & 0x7fffffff; return this.s; }
  })();
  const buf = new Uint8Array(length);
  for (let i = 0; i < length; i++) buf[i] = rng.next() & 0xFF;
  return buf;
}

describe('ShandaCrypto', () => {
  const lengths = [0, 1, 15, 16, 17, 100, 1500, 4096];

  for (const len of lengths) {
    it(`encrypt then decrypt round-trips for length ${len}`, () => {
      const original = newDeterministicBuffer(len, len);
      const working = new Uint8Array(original);
      ShandaCrypto.Encrypt(working);
      ShandaCrypto.Decrypt(working);
      expect(working).toEqual(original);
    });
  }

  it('encrypt changes input for non-trivial payloads', () => {
    const original = newDeterministicBuffer(16, 42);
    const working = new Uint8Array(original);
    ShandaCrypto.Encrypt(working);
    expect(working).not.toEqual(original);
  });

  it('empty buffer is a no-op', () => {
    const empty = new Uint8Array(0);
    ShandaCrypto.Encrypt(empty);
    ShandaCrypto.Decrypt(empty);
    expect(empty).toHaveLength(0);
  });
});
