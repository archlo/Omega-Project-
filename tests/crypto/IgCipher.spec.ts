import { describe, it, expect } from 'vitest';
import { IgCipher, Shuffle } from '../../src/net/crypto/IgCipher.js';

describe('IgCipher', () => {
  it('InnoHash mutates iv in place', () => {
    const iv = new Uint8Array([0xF2, 0x53, 0x50, 0xC6]);
    const snapshot = new Uint8Array(iv);
    IgCipher.InnoHash(iv);
    expect(iv).not.toEqual(snapshot);
    expect(iv).toHaveLength(4);
  });

  it('InnoHash is deterministic for a given seed', () => {
    const iv1 = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
    const iv2 = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
    IgCipher.InnoHash(iv1);
    IgCipher.InnoHash(iv2);
    expect(iv1).toEqual(iv2);
  });

  it('InnoHash distinct seeds diverge', () => {
    const iv1 = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
    const iv2 = new Uint8Array([0xFF, 0xFF, 0xFF, 0xFF]);
    IgCipher.InnoHash(iv1);
    IgCipher.InnoHash(iv2);
    expect(iv1).not.toEqual(iv2);
  });

  it('shuffle table has 256 distinct byte entries', () => {
    expect(Shuffle).toHaveLength(256);
    const distinct = new Set(Shuffle);
    expect(distinct.size).toBe(256);
    expect(Math.min(...Shuffle)).toBe(0);
    expect(Math.max(...Shuffle)).toBe(255);
  });

  it('InnoHash can iterate 1000 times without throwing', () => {
    const iv = new Uint8Array([0xF2, 0x53, 0x50, 0xC6]);
    for (let i = 0; i < 1000; i++) {
      IgCipher.InnoHash(iv);
    }
    expect(iv).toHaveLength(4);
  });
});
