import { AesUserKey } from './AesUserKey.js';
import * as aesjs from 'aes-js';

const BlockSize = 16;
const FirstChunkSize = 0x5B0;
const SubsequentChunkSize = 0x5B4;

const AES_KEY = new Uint8Array(AesUserKey.ToArray());

function FillBlock(block: Uint8Array, iv: Uint8Array): void {
  for (let i = 0; i < block.length; i += iv.length) {
    block.set(iv, i);
  }
}

export class MapleCrypto {
  /**
   * OG: AES::transform — XOR-encrypt data with AES-expanded IV.
   * Creates a FRESH AES-ECB instance per block to avoid any state leak.
   */
  static Crypt(data: Uint8Array, iv: Uint8Array): void {
    if (iv.length !== 4) throw new Error('iv must be exactly 4 bytes');
    if (data.length === 0) return;
    let remaining = data.length;
    let chunkLimit = FirstChunkSize;
    let offset = 0;
    const block = new Uint8Array(BlockSize);
    while (remaining > 0) {
      FillBlock(block, iv);
      const chunkLen = remaining < chunkLimit ? remaining : chunkLimit;
      for (let i = offset; i < offset + chunkLen; i++) {
        const blockIndex = (i - offset) % BlockSize;
        if (blockIndex === 0) {
          const ecb = new aesjs.ModeOfOperation.ecb(AES_KEY);
          const encrypted = ecb.encrypt(block);
          block.set(encrypted);
        }
        data[i] ^= block[blockIndex];
      }
      offset += chunkLen;
      remaining -= chunkLen;
      chunkLimit = SubsequentChunkSize;
    }
  }
}
