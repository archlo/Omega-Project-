import { ShandaCrypto } from './ShandaCrypto.js';
import { MapleCrypto } from './MapleCrypto.js';
import { IgCipher } from './IgCipher.js';

const GameVersion = 95;
const HeaderSize = 4;
const SendSentinel = GameVersion;
const RecvSentinel = 0xFFFF - GameVersion;

export class PacketCipher {
  static GameVersion = GameVersion;
  static HeaderSize = HeaderSize;

  static BuildHeader(payloadLen: number, iv: Uint8Array, destination: Uint8Array): void {
    if (iv.length < 4) throw new Error('iv must be at least 4 bytes');
    if (destination.length < HeaderSize) throw new Error('destination must be at least 4 bytes');
    const rawSeq = ((iv[2] & 0xFF) | ((iv[3] & 0xFF) << 8)) ^ SendSentinel;
    const dataLen = payloadLen ^ rawSeq;
    destination[0] = rawSeq & 0xFF;
    destination[1] = (rawSeq >>> 8) & 0xFF;
    destination[2] = dataLen & 0xFF;
    destination[3] = (dataLen >>> 8) & 0xFF;
  }

  static ParseHeader(header: Uint8Array, iv: Uint8Array): { valid: boolean; payloadLength: number } {
    if (header.length < HeaderSize || iv.length < 4) return { valid: false, payloadLength: 0 };
    const rawSeq = ((header[0] & 0xFF) | ((header[1] & 0xFF) << 8));
    const sentinel = rawSeq ^ ((iv[2] & 0xFF) | ((iv[3] & 0xFF) << 8));
    if (sentinel !== RecvSentinel) return { valid: false, payloadLength: 0 };
    const length = rawSeq ^ ((header[2] & 0xFF) | ((header[3] & 0xFF) << 8));
    return { valid: true, payloadLength: length };
  }

  static EncryptBody(body: Uint8Array, iv: Uint8Array): void {
    ShandaCrypto.Encrypt(body);
    MapleCrypto.Crypt(body, iv);
    IgCipher.InnoHash(iv);
  }

  static DecryptBody(body: Uint8Array, iv: Uint8Array): void {
    MapleCrypto.Crypt(body, iv);
    ShandaCrypto.Decrypt(body);
    IgCipher.InnoHash(iv);
  }
}
