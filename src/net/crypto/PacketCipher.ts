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

  // OG: AES::createPacketHeader — server writes header in BIG-ENDIAN byte order.
  // a = ((iv[3] | (iv[2]<<8)) ^ mapleVersion), b = a ^ (len_swapped)
  // header = [a_hi, a_lo, b_hi, b_lo]
  static BuildHeader(payloadLen: number, iv: Uint8Array, destination: Uint8Array): void {
    if (iv.length < 4) throw new Error('iv must be at least 4 bytes');
    if (destination.length < HeaderSize) throw new Error('destination must be at least 4 bytes');
    // OG: a = (iv[3] | (iv[2]<<8)) ^ mapleVersion (mapleVersion is byte-swapped 95 = 0x5F00)
    // But the client's SendSentinel = 95, and the IV convention is that
    // the client's IV bytes are already in the server's expected order.
    // The server reads: a = (iv[3] | (iv[2]<<8)) ^ 0x5F00
    // The client must write: a = (iv[3] | (iv[2]<<8)) ^ 0x5F00
    // which is equivalent to: a = ((iv[2]<<8) | iv[3]) ^ ((95>>8)&0xFF | (95<<8)&0xFF00)
    // Simplified: a = ((iv[2] << 8) | iv[3]) ^ 0x5F00
    const a = (((iv[2] & 0xFF) << 8) | (iv[3] & 0xFF)) ^ (((GameVersion >> 8) & 0xFF) | ((GameVersion << 8) & 0xFF00));
    const lenSwapped = ((payloadLen << 8) & 0xFF00) | ((payloadLen >>> 8) & 0xFF);
    const b = a ^ lenSwapped;
    // OG: header = [a_hi, a_lo, b_hi, b_lo] — big-endian
    destination[0] = (a >>> 8) & 0xFF;
    destination[1] = a & 0xFF;
    destination[2] = (b >>> 8) & 0xFF;
    destination[3] = b & 0xFF;
  }

  // OG: AES::parseHeader — server reads header in BIG-ENDIAN byte order.
  // a = (header[0]<<8 | header[1]), sentinel = a ^ (iv[2]<<8 | iv[3])
  // Must equal 0xFFFF - mapleVersion = 0xA0FF
  static ParseHeader(header: Uint8Array, iv: Uint8Array): { valid: boolean; payloadLength: number } {
    if (header.length < HeaderSize || iv.length < 4) return { valid: false, payloadLength: 0 };
    // OG: a = (header[0]<<8 | header[1]) — big-endian
    const a = ((header[0] & 0xFF) << 8) | (header[1] & 0xFF);
    // OG: sentinel = a ^ (iv[2]<<8 | iv[3]) — must equal 0xFFFF - byte_swapped(95)
    const ivWord = ((iv[2] & 0xFF) << 8) | (iv[3] & 0xFF);
    const sentinel = a ^ ivWord;
    const mapleVersionSwapped = ((GameVersion >> 8) & 0xFF) | ((GameVersion << 8) & 0xFF00);
    const expectedSentinel = 0xFFFF - mapleVersionSwapped;
    if (sentinel !== expectedSentinel) return { valid: false, payloadLength: 0 };
    // OG: b = (header[2]<<8 | header[3]), length = a ^ b (byte-swapped back)
    const b = ((header[2] & 0xFF) << 8) | (header[3] & 0xFF);
    const lenSwapped = a ^ b;
    const length = ((lenSwapped >>> 8) & 0xFF) | ((lenSwapped & 0xFF) << 8);
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
