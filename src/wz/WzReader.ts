import type { WzImage } from './WzImage.js';
import type { WzBuffer } from './WzBuffer.js';
import type { WzCrypto } from './WzCrypto.js';
import { WzReaderException } from './WzReaderException.js';

export class WzReader {
  static ReadCompressedInt(buffer: WzBuffer): number {
    const first = buffer.ReadSByte();
    return first === -128 ? buffer.ReadInt() : first;
  }

  static ReadString(buffer: WzBuffer, crypto: WzCrypto): string {
    let length = buffer.ReadSByte();
    if (length < 0) {
      if (length === -128) {
        length = buffer.ReadInt();
      } else {
        length = -length;
      }
      if (length > 0) {
        const data = buffer.ReadBytes(length);
        crypto.CryptAscii(data);
        return new TextDecoder('ascii').decode(data);
      }
    } else if (length > 0) {
      if (length === 127) {
        length = buffer.ReadInt();
      }
      if (length > 0) {
        const byteLen = length * 2;
        const data = buffer.ReadBytes(byteLen);
        crypto.CryptUnicode(data);
        return new TextDecoder('utf-16le').decode(data);
      }
    }
    return '';
  }

  static ReadStringBlock(parent: WzImage, buffer: WzBuffer, crypto: WzCrypto): string {
    const stringType = buffer.ReadByte();
    switch (stringType) {
      case 0x00:
      case 0x73:
        return WzReader.ReadString(buffer, crypto);

      case 0x01:
      case 0x1B: {
        const stringOffset = buffer.ReadInt();
        const saved = buffer.Position;
        buffer.Position = parent.Offset + stringOffset;
        const result = WzReader.ReadString(buffer, crypto);
        buffer.Position = saved;
        return result;
      }

      default:
        throw new WzReaderException(`Unknown string block type: 0x${stringType.toString(16)}`);
    }
  }
}
