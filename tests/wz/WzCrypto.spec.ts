import { describe, it, expect } from 'vitest';
import { WzCrypto } from '../../src/wz/WzCrypto.js';

describe('WzCrypto', () => {
  describe('CreateEmpty', () => {
    it('returns crypto with null aes (zero mask)', () => {
      const c = WzCrypto.CreateEmpty();
      const data = new Uint8Array([0x41, 0x42, 0x43]);
      // With empty key, mask is all zeros, so CryptAscii is just XOR with rolling 0xAA
      // mask=0, rolling maskByte starts at 0xAA
      // 0x41 ^ 0 ^ 0xAA = 0xEB, maskByte -> 0xAB
      // 0x42 ^ 0 ^ 0xAB = 0xE9, maskByte -> 0xAC
      // 0x43 ^ 0 ^ 0xAC = 0xEF, maskByte -> 0xAD
      c.CryptAscii(data);
      expect([...data]).toEqual([0xEB, 0xE9, 0xEF]);
      // Double crypt = identity
      c.CryptAscii(data);
      expect([...data]).toEqual([0x41, 0x42, 0x43]);
    });

    it('CryptUnicode with empty key XORs rolling 0xAAAA', () => {
      const c = WzCrypto.CreateEmpty();
      const data = new Uint8Array([0x41, 0x00, 0x42, 0x00]);
      // mask=0, so each byte pair gets XOR with 0xAAAA, then roll
      // 'A\x00': 0x41^0xAA=0xEB, 0x00^0xAA=0xAA → mask becomes 0xAAAB
      // 'B\x00': 0x42^0xAB=0xE9, 0x00^0xAA=0xAA
      c.CryptUnicode(data);
      expect(data[0]).toBe(0xEB); expect(data[1]).toBe(0xAA);
      expect(data[2]).toBe(0xE9); expect(data[3]).toBe(0xAA);
      c.CryptUnicode(data);
      expect([...data]).toEqual([0x41, 0x00, 0x42, 0x00]);
    });
  });

  describe('CreateGms', () => {
    it('returns crypto with non-null aes', () => {
      const c = WzCrypto.CreateGms();
      // Crypt with GMS key should change data
      const data = new Uint8Array(32);
      const copy = new Uint8Array(data);
      c.CryptAscii(data);
      // With GMS AES key, mask is non-zero, so data should differ from rolling 0xAA
      const rollingOnly = new Uint8Array(32);
      let mask = 0xAA;
      for (let i = 0; i < 32; i++) { rollingOnly[i] = 0 ^ mask; mask = (mask + 1) & 0xFF; }
      expect(data).not.toEqual(copy);
      expect(data).not.toEqual(rollingOnly);
    });

    it('CryptAscii is self-inverse', () => {
      const c = WzCrypto.CreateGms();
      const original = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]);
      const copy = new Uint8Array(original);
      c.CryptAscii(copy);
      c.CryptAscii(copy);
      expect(copy).toEqual(original);
    });

    it('CryptUnicode is self-inverse', () => {
      const c = WzCrypto.CreateGms();
      const original = new Uint8Array([0x48, 0x00, 0x65, 0x00, 0x6C, 0x00, 0x6C, 0x00, 0x6F, 0x00]);
      const copy = new Uint8Array(original);
      c.CryptUnicode(copy);
      c.CryptUnicode(copy);
      expect(copy).toEqual(original);
    });

    it('mask is reused across calls (same mask[0..n] each time)', () => {
      const c = WzCrypto.CreateGms();
      const block1 = new Uint8Array(16);
      const block2 = new Uint8Array(16);
      c.CryptAscii(block1);
      c.CryptAscii(block2);
      // Mask is generated once: both calls use mask[0..15], so identical blocks encrypt identically
      expect(block1).toEqual(block2);
    });
  });

  describe('empty key edge cases', () => {
    it('zero-length input is no-op', () => {
      const c = WzCrypto.CreateGms();
      const empty = new Uint8Array(0);
      c.CryptAscii(empty);
      expect(empty).toHaveLength(0);
    });

    it('large buffer length mask is generated', () => {
      const c = WzCrypto.CreateGms();
      const data = new Uint8Array(2048);
      const copy = new Uint8Array(data);
      c.CryptAscii(data);
      expect(data).not.toEqual(copy);
      c.CryptAscii(data);
      expect(data).toEqual(copy);
    });
  });
});
