import { PacketCipher } from '../crypto/PacketCipher.js';

const textDecoder = new TextDecoder('ascii');

export interface HandshakeInfo {
  version: number;
  patch: string;
  sendIv: Uint8Array;
  recvIv: Uint8Array;
  locale: number;
}

export class HandshakeReader {
  static TryRead(buffer: Uint8Array): { info: HandshakeInfo; consumed: number } | null {
    if (buffer.length < 2) return null;
    const bodyLen = (buffer[0] | (buffer[1] << 8)) << 16 >> 16;
    if (bodyLen < 7) throw new Error(`Handshake body length ${bodyLen} is too small`);
    if (buffer.length < 2 + bodyLen) return null;
    const body = buffer.subarray(2, 2 + bodyLen);
    let pos = 0;
    const version = (body[pos] | (body[pos + 1] << 8)) << 16 >> 16;
    pos += 2;
    const patchLen = (body[pos] | (body[pos + 1] << 8)) << 16 >> 16;
    pos += 2;
    if (patchLen < 0 || pos + patchLen + 4 + 4 + 1 > bodyLen) {
      throw new Error(`Handshake patch length ${patchLen} is malformed`);
    }
    const patch = textDecoder.decode(body.subarray(pos, pos + patchLen));
    pos += patchLen;
    const sendIv = new Uint8Array(body.subarray(pos, pos + 4));
    pos += 4;
    const recvIv = new Uint8Array(body.subarray(pos, pos + 4));
    pos += 4;
    const locale = body[pos];
    if (version !== PacketCipher.GameVersion) {
      throw new Error(`Handshake reports version ${version}, expected v95 (${PacketCipher.GameVersion})`);
    }
    return { info: { version, patch, sendIv, recvIv, locale }, consumed: 2 + bodyLen };
  }
}
