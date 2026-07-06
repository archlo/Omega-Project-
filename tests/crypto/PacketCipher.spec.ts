import { describe, it, expect } from 'vitest';
import { PacketCipher } from '../../src/net/crypto/PacketCipher.js';

function newDeterministicBuffer(length: number, seed: number): Uint8Array {
  const rng = new (class {
    private s = seed;
    next() { this.s = (this.s * 1103515245 + 12345) & 0x7fffffff; return this.s; }
  })();
  const buf = new Uint8Array(length);
  for (let i = 0; i < length; i++) buf[i] = rng.next() & 0xFF;
  return buf;
}

describe('PacketCipher', () => {
  const gameVersion = 95;

  const payloadLengths = [1, 15, 100, 1456, 2000];

  for (const payloadLen of payloadLengths) {
    it(`buildHeader XORs payload length with send sentinel (len=${payloadLen})`, () => {
      const iv = new Uint8Array([0x11, 0x22, 0x33, 0x44]);
      const header = new Uint8Array(4);
      PacketCipher.BuildHeader(payloadLen, iv, header);

      const serverVersion = ((header[0] ^ iv[2]) & 0xFF) | (((header[1] ^ iv[3]) & 0xFF) << 8);
      expect(serverVersion).toBe(gameVersion);

      const serverLen = ((header[0] ^ header[2]) & 0xFF) | (((header[1] ^ header[3]) & 0xFF) << 8);
      expect(serverLen).toBe(payloadLen);
    });
  }

  // The server stamps ITS packets with the opposite sentinel from what the
  // client sends with (0xFFFF - version, not version) — that's the whole
  // point of having two distinct sentinels. ParseHeader is only ever used
  // on incoming (server-built) packets, so it must check against that
  // recv sentinel, not the client's own send sentinel.
  const recvSentinel = 0xFFFF - gameVersion;

  for (const payloadLen of payloadLengths) {
    it(`parseHeader decodes server-built header (len=${payloadLen})`, () => {
      const iv = new Uint8Array([0x11, 0x22, 0x33, 0x44]);
      const rawSeq = ((iv[2] & 0xFF) | ((iv[3] & 0xFF) << 8)) ^ recvSentinel;
      const dataLen = payloadLen ^ rawSeq;
      const header = new Uint8Array([
        rawSeq & 0xFF, (rawSeq >> 8) & 0xFF,
        dataLen & 0xFF, (dataLen >> 8) & 0xFF,
      ]);

      const result = PacketCipher.ParseHeader(header, iv);
    expect(result.valid).toBe(true);
    expect(result.payloadLength).toBe(payloadLen);
    });
  }

  it('parseHeader rejects a header built with the send sentinel (would desync if accepted)', () => {
    const iv = new Uint8Array([0x11, 0x22, 0x33, 0x44]);
    const header = new Uint8Array(4);
    PacketCipher.BuildHeader(100, iv, header);
    const result = PacketCipher.ParseHeader(header, iv);
    expect(result.valid).toBe(false);
  });

  it('parseHeader rejects mismatched iv', () => {
    const iv = new Uint8Array([0x11, 0x22, 0x33, 0x44]);
    const otherIv = new Uint8Array([0x99, 0xAA, 0xBB, 0xCC]);
    const rawSeq = ((iv[2] & 0xFF) | ((iv[3] & 0xFF) << 8)) ^ recvSentinel;
    const dataLen = 100 ^ rawSeq;
    const header = new Uint8Array([
      rawSeq & 0xFF, (rawSeq >> 8) & 0xFF,
      dataLen & 0xFF, (dataLen >> 8) & 0xFF,
    ]);

    const result = PacketCipher.ParseHeader(header, otherIv);
    expect(result.valid).toBe(false);
  });

  it('parseHeader rejects short input', () => {
    const iv = new Uint8Array([0x11, 0x22, 0x33, 0x44]);
    const shortHeader = new Uint8Array([1, 2, 3]);
    const result = PacketCipher.ParseHeader(shortHeader, iv);
    expect(result.valid).toBe(false);
  });

  const roundTripLengths = [1, 15, 100, 1500, 4096];

  for (const length of roundTripLengths) {
    it(`encrypt then decrypt round-trips with synced IVs (len=${length})`, () => {
      const sendIv = new Uint8Array([0xAB, 0xCD, 0xEF, 0x01]);
      const recvIv = new Uint8Array([0xAB, 0xCD, 0xEF, 0x01]);
      const original = newDeterministicBuffer(length, length);
      const wire = new Uint8Array(original);

      PacketCipher.EncryptBody(wire, sendIv);
      PacketCipher.DecryptBody(wire, recvIv);

      expect(wire).toEqual(original);
    });
  }

  it('encryptBody advances iv', () => {
    const iv = new Uint8Array([0xAB, 0xCD, 0xEF, 0x01]);
    const ivBefore = new Uint8Array(iv);
    const data = newDeterministicBuffer(50, 7);
    PacketCipher.EncryptBody(data, iv);
    expect(iv).not.toEqual(ivBefore);
  });

  it('decryptBody advances iv', () => {
    const iv = new Uint8Array([0xAB, 0xCD, 0xEF, 0x01]);
    const ivBefore = new Uint8Array(iv);
    const data = newDeterministicBuffer(50, 7);
    PacketCipher.DecryptBody(data, iv);
    expect(iv).not.toEqual(ivBefore);
  });

  it('two sequential packets keep IVs in sync', () => {
    const sendIv = new Uint8Array([0xAB, 0xCD, 0xEF, 0x01]);
    const recvIv = new Uint8Array([0xAB, 0xCD, 0xEF, 0x01]);
    const packet1 = newDeterministicBuffer(100, 1);
    const packet2 = newDeterministicBuffer(200, 2);

    const wire1 = new Uint8Array(packet1);
    const wire2 = new Uint8Array(packet2);

    PacketCipher.EncryptBody(wire1, sendIv);
    PacketCipher.EncryptBody(wire2, sendIv);
    PacketCipher.DecryptBody(wire1, recvIv);
    PacketCipher.DecryptBody(wire2, recvIv);

    expect(wire1).toEqual(packet1);
    expect(wire2).toEqual(packet2);
    expect(sendIv).toEqual(recvIv);
  });
});
