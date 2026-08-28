import { describe, it, expect } from 'vitest';
import { WzCanvas } from '../../src/wz/WzCanvas.js';

describe('WzCanvas', () => {
  describe('_convertToBgra', () => {
    // Access the private static method via bracket notation for testing
    const convertToBgra = (WzCanvas as any)._convertToBgra;

    it('format 1 (AYBGR1555-scale) produces correct pixel for one pixel', () => {
      // Format 1: 2 bytes per source pixel
      // Pixel format: A=high>>4, B=low&0x0F, G=low>>4, R=high&0x0F
      // Each channel multiplied by 0x11 to scale 0..15 -> 0..255
      // For raw bytes [0x34, 0x12]:
      //   low=0x34, high=0x12
      //   R = (0x12 & 0x0F) * 0x11 = 2 * 0x11 = 0x22
      //   G = ((0x34 >> 4) & 0x0F) * 0x11 = 3 * 0x11 = 0x33
      //   B = (0x34 & 0x0F) * 0x11 = 4 * 0x11 = 0x44
      //   A = ((0x12 >> 4) & 0x0F) * 0x11 = 1 * 0x11 = 0x11
      const raw = new Uint8Array([0x34, 0x12]);
      const result = convertToBgra(raw, 1, 1, 1, 0);
      expect(result).toHaveLength(4);
      expect(result[0]).toBe(0x22); // R
      expect(result[1]).toBe(0x33); // G
      expect(result[2]).toBe(0x44); // B
      expect(result[3]).toBe(0x11); // A
    });

    it('format 2 (BGRA8888) swaps R and B channels', () => {
      // Format 2: 4 bytes per source pixel, stored as BGRA
      // raw pixel: [B=0xBB, G=0xGG, R=0xRR, A=0xAA]
      // output:    [R=0xRR, G=0xGG, B=0xBB, A=0xAA]
      const raw = new Uint8Array([0x10, 0x20, 0x30, 0xFF]);
      const result = convertToBgra(raw, 1, 1, 2, 0);
      expect(result).toHaveLength(4);
      expect(result[0]).toBe(0x30); // R
      expect(result[1]).toBe(0x20); // G
      expect(result[2]).toBe(0x10); // B
      expect(result[3]).toBe(0xFF); // A
    });

    it('format 513 (RGB565-scale) produces opaque pixels', () => {
      // Format 513: 2 bytes per source pixel, RGB565
      // pixel = lo | (hi << 8)
      // R = ((pixel >> 11) & 0x1F) * 255/31
      // G = ((pixel >> 5) & 0x3F) * 255/63
      // B = (pixel & 0x1F) * 255/31
      // A = 0xFF
      // For [0xE0, 0x07]: lo=0xE0, hi=0x07
      // pixel = 0xE0 | (0x07 << 8) = 0xE0 | 0x0700 = 0x07E0
      // R = ((0x07E0 >> 11) & 0x1F) = 0x00 → R = 0
      // G = ((0x07E0 >> 5) & 0x3F) = 0x3F → G = 0x3F * 255/63 = 255
      // B = (0x07E0 & 0x1F) = 0x00 → B = 0
      const raw = new Uint8Array([0xE0, 0x07]);
      const result = convertToBgra(raw, 1, 1, 513, 0);
      expect(result).toHaveLength(4);
      expect(result[0]).toBeCloseTo(0, 0);   // R
      expect(result[1]).toBe(255);            // G
      expect(result[2]).toBeCloseTo(0, 0);   // B
      expect(result[3]).toBe(0xFF);           // A
    });

    it('format 1 with scale 1 expands 1x1 to 2x2', () => {
      // FormatScale=1 means scale=2, so 1x1 source -> 2x2 dest
      const raw = new Uint8Array([0x34, 0x12]); // 1 source pixel
      const result = convertToBgra(raw, 2, 2, 1, 1);
      expect(result).toHaveLength(2 * 2 * 4); // 16 bytes
      // All 4 destination pixels should be identical to the single source pixel
      for (let i = 0; i < 4; i++) {
        expect(result[i * 4 + 0]).toBe(0x22); // R
        expect(result[i * 4 + 1]).toBe(0x33); // G
        expect(result[i * 4 + 2]).toBe(0x44); // B
        expect(result[i * 4 + 3]).toBe(0x11); // A
      }
    });

    it('format 2 with 2 pixels produces correct BGRA output', () => {
      const raw = new Uint8Array([
        0x10, 0x20, 0x30, 0xFF, // pixel 0: B=0x10 G=0x20 R=0x30 A=0xFF
        0xAA, 0xBB, 0xCC, 0x80, // pixel 1: B=0xAA G=0xBB R=0xCC A=0x80
      ]);
      const result = convertToBgra(raw, 2, 1, 2, 0);
      expect(result).toHaveLength(8);
      expect(result[0]).toBe(0x30); expect(result[1]).toBe(0x20);
      expect(result[2]).toBe(0x10); expect(result[3]).toBe(0xFF);
      expect(result[4]).toBe(0xCC); expect(result[5]).toBe(0xBB);
      expect(result[6]).toBe(0xAA); expect(result[7]).toBe(0x80);
    });

    it('format 2 produces all-zero for black pixel', () => {
      const raw = new Uint8Array([0x00, 0x00, 0x00, 0xFF]); // black opaque
      const result = convertToBgra(raw, 1, 1, 2, 0);
      expect(result[0]).toBe(0); expect(result[1]).toBe(0);
      expect(result[2]).toBe(0); expect(result[3]).toBe(0xFF);
    });

    it('format 513 with white pixel', () => {
      // RGB565 white: R=31, G=63, B=31
      // pixel = (31 << 11) | (63 << 5) | 31 = 0xF800 | 0x07E0 | 0x001F = 0xFFFF
      const raw = new Uint8Array([0xFF, 0xFF]);
      const result = convertToBgra(raw, 1, 1, 513, 0);
      expect(result[0]).toBe(255); // R=31 → 255/31*31=255
      expect(result[1]).toBe(255); // G=63 → 255/63*63=255
      expect(result[2]).toBe(255); // B=31 → 255/31*31=255
      expect(result[3]).toBe(0xFF);
    });

    it('throws for unknown format', () => {
      const raw = new Uint8Array(1);
      expect(() => convertToBgra(raw, 1, 1, 999, 0)).toThrow('not implemented');
    });
  });
});
