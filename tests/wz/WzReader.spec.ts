import { describe, it, expect } from 'vitest';
import { WzBuffer } from '../../src/wz/WzBuffer.js';
import { WzCrypto } from '../../src/wz/WzCrypto.js';
import { WzReader } from '../../src/wz/WzReader.js';
import type { WzImage } from '../../src/wz/WzImage.js';

function buf(...bytes: number[]): WzBuffer {
  return new WzBuffer(new Uint8Array(bytes).buffer);
}

describe('WzReader', () => {
  describe('ReadCompressedInt', () => {
    it('returns small positive value directly', () => {
      const b = buf(0x00, 0x7F, 0x01, 0x05, 0x40);
      expect(WzReader.ReadCompressedInt(b)).toBe(0);
      expect(WzReader.ReadCompressedInt(b)).toBe(127);
      expect(WzReader.ReadCompressedInt(b)).toBe(1);
      expect(WzReader.ReadCompressedInt(b)).toBe(5);
      expect(WzReader.ReadCompressedInt(b)).toBe(64);
    });

    it('returns small negative value directly', () => {
      // -1 (0xFF), -2 (0xFE), -3 (0xFD) — no sentinel: all fit in sbyte
      const b = buf(0xFF, 0xFE, 0xFD);
      expect(WzReader.ReadCompressedInt(b)).toBe(-1);
      expect(WzReader.ReadCompressedInt(b)).toBe(-2);
      expect(WzReader.ReadCompressedInt(b)).toBe(-3);
    });

    it('reads int32 for -128 sentinel', () => {
      // -128 sentinel (0x80) followed by int32 LE (0x12345678)
      const b = buf(0x80, 0x78, 0x56, 0x34, 0x12);
      expect(WzReader.ReadCompressedInt(b)).toBe(0x12345678);
    });
  });

  describe('ReadString', () => {
    it('returns empty string for length 0 byte', () => {
      const b = buf(0x00);
      const crypto = WzCrypto.CreateEmpty();
      expect(WzReader.ReadString(b, crypto)).toBe('');
    });

    it('reads ASCII string for negative length', () => {
      const crypto = WzCrypto.CreateEmpty();
      // Pre-encrypt "Hello" using CryptAscii with empty key (mask=0, rolling 0xAA)
      const plain = new TextEncoder().encode('Hello');
      crypto.CryptAscii(plain); // now 'H'→0xEB, 'e'→0xCE, 'l'→0xC0, 'l'→0xC1, 'o'→0xC1
      // length=-5 as sbyte = 0xFB
      const b = buf(0xFB, ...plain);
      expect(WzReader.ReadString(b, crypto)).toBe('Hello');
    });

    it('reads UTF-16 string for positive length', () => {
      // length=3 (3 chars = 6 bytes), positive means Unicode
      // "ABC" UTF-16LE = 0x41,0x00,0x42,0x00,0x43,0x00
      // With empty crypto: mask=0, CryptUnicode XORs with rolling 0xAAAA
      // 'A': 0x41^0xAA=0xEB, 0x00^0xAA=0xAA
      // 'B': 0x42^0xAB=0xE9, 0x00^0xAA=0xAA
      // 'C': 0x43^0xAC=0xEF, 0x00^0xAA=0xAA ... wait that's wrong. Let me recalculate.
      // mask starts at 0xAAAA.
      // For 'A' (0x41,0x00): data[0]^mask[0]^(0xAAAA&0xFF)=0x41^0^0xAA=0xEB, data[1]^mask[1]^(0xAAAA>>8)=0x00^0^0xAA=0xAA
      // mask becomes 0xAAAB
      // For 'B' (0x42,0x00): data[0]^mask[0]^(0xAAAB&0xFF)=0x42^0^0xAB=0xE9, data[1]^mask[1]^(0xAAAB>>8)=0x00^0^0xAA=0xAA
      // mask becomes 0xAAAC
      // For 'C' (0x43,0x00): data[0]^mask[0]^(0xAAAC&0xFF)=0x43^0^0xAC=0xEF, data[1]^mask[1]^(0xAAAC>>8)=0x00^0^0xAA=0xAA
      const encrypted = new Uint8Array([0xEB, 0xAA, 0xE9, 0xAA, 0xEF, 0xAA]);
      const b2 = buf(0x03, ...encrypted);
      const crypto = WzCrypto.CreateEmpty();
      expect(WzReader.ReadString(b2, crypto)).toBe('ABC');
    });

    it('reads ASCII for length -128 sentinel', () => {
      const crypto = WzCrypto.CreateEmpty();
      const plain = new TextEncoder().encode('Hello');
      crypto.CryptAscii(plain);
      // -128 sentinel (0x80) + int32 length=5 + encrypted data
      const b = buf(0x80, 0x05, 0x00, 0x00, 0x00, ...plain);
      expect(WzReader.ReadString(b, crypto)).toBe('Hello');
    });

    it('reads Unicode for length 127 sentinel', () => {
      // length=127 sentinel = 0x7F, then int32 length=3, then 6 bytes
      const crypto = WzCrypto.CreateEmpty();
      const encrypted = new Uint8Array([0xEB, 0xAA, 0xE9, 0xAA, 0xEF, 0xAA]); // "ABC" XOR rolling 0xAAAA
      const b = buf(0x7F, 0x03, 0x00, 0x00, 0x00, ...encrypted);
      expect(WzReader.ReadString(b, crypto)).toBe('ABC');
    });

    it('GMS key CryptAscii round-trip with ReadString', () => {
      const crypto = WzCrypto.CreateGms();
      const original = 'Hello';
      const encoded = new TextEncoder().encode(original);
      // Encrypt the data as the WZ file would
      crypto.CryptAscii(encoded);
      // Prepend length byte (-5 = 0xFB as sbyte)
      const b = buf(0xFB, ...encoded);
      // Reading should decrypt and give back original
      expect(WzReader.ReadString(b, crypto)).toBe(original);
    });
  });
});
