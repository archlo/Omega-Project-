import { describe, it, expect } from 'vitest';
import { WzConstants } from '../../src/wz/WzConstants.js';

describe('WzConstants', () => {
  it('AesUserKey is 128 bytes', () => {
    expect(WzConstants.AesUserKey).toHaveLength(128);
  });

  it('WzGmsIv is exactly 4 bytes', () => {
    expect(WzConstants.WzGmsIv).toHaveLength(4);
    expect([...WzConstants.WzGmsIv]).toEqual([0x4D, 0x23, 0xC7, 0x2B]);
  });

  it('WzEmptyIv is all zeros', () => {
    expect(WzConstants.WzEmptyIv).toHaveLength(4);
    expect([...WzConstants.WzEmptyIv]).toEqual([0, 0, 0, 0]);
  });

  it('WzOffsetConstant is correct', () => {
    expect(WzConstants.WzOffsetConstant).toBe(0x581C3F6D);
  });

  describe('version hash (from WzPackage._computeVersionHash)', () => {
    // The formula is: for each digit char in version string:
    //   hash = (hash * 32) + charCode + 1
    // We verify known values by replicating the algorithm.

    function computeVersionHash(version: number): number {
      let hash = 0;
      const str = version.toString();
      for (let i = 0; i < str.length; i++) {
        hash = (hash * 32) + str.charCodeAt(i) + 1;
      }
      return hash >>> 0;
    }

    it('v0 -> 49', () => {
      // "0".charCodeAt(0) = 48, hash = (0*32) + 48 + 1 = 49
      expect(computeVersionHash(0)).toBe(49);
    });

    it('v1 -> 50', () => {
      // '1'.charCodeAt(0) = 49
      // hash = (0 * 32) + 49 + 1 = 50
      expect(computeVersionHash(1)).toBe(50);
    });

    it('v95 -> 1910', () => {
      // '9'.charCodeAt(0) = 57, hash = (0*32)+57+1 = 58
      // '5'.charCodeAt(1) = 53, hash = (58*32)+53+1 = 58*32+54 = 1856+54 = 1910
      expect(computeVersionHash(95)).toBe(1910);
    });

    it('v95 header byte matches WzPackage check', () => {
      // computedHeader = 0xFF ^ ((hash>>24)&0xFF) ^ ((hash>>16)&0xFF) ^ ((hash>>8)&0xFF) ^ (hash&0xFF)
      const hash = computeVersionHash(95); // 0x776
      const header = 0xFF
        ^ ((hash >> 24) & 0xFF)
        ^ ((hash >> 16) & 0xFF)
        ^ ((hash >> 8) & 0xFF)
        ^ (hash & 0xFF);
      expect(hash).toBe(1910);
      // 0x776: byte0=0x76, byte1=0x07, byte2=0x00, byte3=0x00
      // header = 0xFF ^ 0x00 ^ 0x00 ^ 0x07 ^ 0x76 = 0xFF ^ 0x71 = 0x8E
      expect(header).toBe(0x8E);
    });
  });
});
