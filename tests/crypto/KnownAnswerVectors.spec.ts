import { describe, it, expect } from 'vitest';
import { PacketCipher } from '../../src/net/crypto/PacketCipher.js';
import { MapleCrypto } from '../../src/net/crypto/MapleCrypto.js';
import { ShandaCrypto } from '../../src/net/crypto/ShandaCrypto.js';
import { IgCipher } from '../../src/net/crypto/IgCipher.js';
import { WzCrypto } from '../../src/wz/WzCrypto.js';

/**
 * Known-answer test vectors for all crypto components.
 *
 * These are NOT derived from OG C++ — they are computed by running the
 * implementation on a fixed input and recording the output. They serve as
 * regression guards: if someone changes the algorithm (even subtly), these
 * tests will catch it.
 *
 * True OG-known-answer vectors require a separate reference implementation
 * (original v95 client binary or server source) — these are placeholders
 * until such vectors are obtained.
 */

describe('PacketCipher known-answer vectors', () => {
  it('BuildHeader produces expected output', () => {
    const iv = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
    const header = new Uint8Array(4);
    PacketCipher.BuildHeader(100, iv, header);
    expect([...header]).toEqual([0x09, 0x78, 0x6d, 0x78]);
  });

  // BuildHeader stamps with the client's send sentinel (version); ParseHeader
  // validates against the server's recv sentinel (0xFFFF - version) since
  // it's only ever used on incoming, server-built packets. They are NOT
  // supposed to round-trip directly — that would mean we'd accept a header
  // we built ourselves as if the server sent it, which silently breaks
  // detection of a desynced/garbage stream.
  it('BuildHeader output is rejected by ParseHeader (different sentinel, different direction)', () => {
    const iv = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
    const header = new Uint8Array(4);
    PacketCipher.BuildHeader(100, iv, header);
    const result = PacketCipher.ParseHeader(header, iv);
    expect(result.valid).toBe(false);
  });

  it('ParseHeader accepts a header built with the recv sentinel', () => {
    const iv = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
    const recvSentinel = 0xFFFF - PacketCipher.GameVersion;
    const rawSeq = ((iv[2] & 0xFF) | ((iv[3] & 0xFF) << 8)) ^ recvSentinel;
    const dataLen = 100 ^ rawSeq;
    const header = new Uint8Array([
      rawSeq & 0xFF, (rawSeq >> 8) & 0xFF,
      dataLen & 0xFF, (dataLen >> 8) & 0xFF,
    ]);
    const result = PacketCipher.ParseHeader(header, iv);
    expect(result.valid).toBe(true);
    expect(result.payloadLength).toBe(100);
  });

  it('ParseHeader rejects wrong IV (sentinel mismatch)', () => {
    const header = new Uint8Array([0x09, 0x78, 0x6d, 0x78]);
    const wrongIv = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
    const result = PacketCipher.ParseHeader(header, wrongIv);
    expect(result.valid).toBe(false);
  });
});

describe('ShandaCrypto known-answer vectors', () => {
  it('Encrypt produces expected output', () => {
    const data = new Uint8Array([0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4A]);
    ShandaCrypto.Encrypt(data);
    expect([...data]).toEqual([0x9b, 0x25, 0xe0, 0x7d, 0xee, 0x36, 0x11, 0xaa, 0xe5, 0x1c]);
  });

  it('Encrypt+Decrypt recovers original', () => {
    const original = new Uint8Array([0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4A]);
    const working = new Uint8Array(original);
    ShandaCrypto.Encrypt(working);
    ShandaCrypto.Decrypt(working);
    expect([...working]).toEqual([...original]);
  });
});

describe('IgCipher known-answer vectors', () => {
  it('InnoHash produces expected output', () => {
    const iv = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
    IgCipher.InnoHash(iv);
    expect([...iv]).toEqual([0xdd, 0xef, 0x64, 0x61]);
  });

  it('InnoHash is deterministic', () => {
    const a = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
    const b = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
    IgCipher.InnoHash(a);
    IgCipher.InnoHash(b);
    expect([...a]).toEqual([...b]);
  });
});

describe('MapleCrypto known-answer vectors', () => {
  it('Crypt produces non-trivial output', () => {
    const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    const iv = new Uint8Array([0xAB, 0xCD, 0xEF, 0x01]);
    MapleCrypto.Crypt(data, iv);
    // Output should differ from input (actual values depend on AES-128 key)
    expect([...data]).not.toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  });

  it('Crypt is self-inverse with same IV', () => {
    const original = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    const data = new Uint8Array(original);
    const iv = new Uint8Array([0xAB, 0xCD, 0xEF, 0x01]);
    MapleCrypto.Crypt(data, iv);
    MapleCrypto.Crypt(data, iv);
    expect([...data]).toEqual([...original]);
  });
});

describe('WzCrypto known-answer vectors', () => {
  it('Empty key CryptAscii produces expected output', () => {
    const c = WzCrypto.CreateEmpty();
    const data = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]);
    c.CryptAscii(data);
    expect([...data]).toEqual([0xe2, 0xce, 0xc0, 0xc1, 0xc1]);
  });

  it('GMS key CryptAscii differs from empty-key output', () => {
    const cGms = WzCrypto.CreateGms();
    const cEmpty = WzCrypto.CreateEmpty();
    const dataGms = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]);
    const dataEmpty = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]);
    cGms.CryptAscii(dataGms);
    cEmpty.CryptAscii(dataEmpty);
    expect([...dataGms]).not.toEqual([...dataEmpty]);
  });

  it('GMS key CryptAscii is self-inverse', () => {
    const c = WzCrypto.CreateGms();
    const original = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]);
    const data = new Uint8Array(original);
    c.CryptAscii(data);
    c.CryptAscii(data);
    expect([...data]).toEqual([...original]);
  });
});
