import { AesUserKey } from './AesUserKey.js';
import * as aesjs from 'aes-js';

const BlockSize = 16;
const FirstChunkSize = 0x5B0;
const SubsequentChunkSize = 0x5B4;

let aesKey: Uint8Array | null = null;
let ecb: aesjs.ModeOfOperation.ecb | null = null;

function getAesKey(): Uint8Array {
  if (!aesKey) {
    aesKey = new Uint8Array(AesUserKey.ToArray());
  }
  return aesKey;
}

function getEcb(): aesjs.ModeOfOperation.ecb {
  if (!ecb) {
    ecb = new aesjs.ModeOfOperation.ecb(getAesKey());
  }
  return ecb;
}

function EncryptBlockInPlace(block: Uint8Array): void {
  const encrypted = getEcb().encrypt(block);
  block.set(encrypted);
}

function FillBlock(block: Uint8Array, iv: Uint8Array): void {
  for (let i = 0; i < block.length; i += iv.length) {
    block.set(iv, i);
  }
}

export class MapleCrypto {
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
          EncryptBlockInPlace(block);
        }
        data[i] ^= block[blockIndex];
      }
      offset += chunkLen;
      remaining -= chunkLen;
      chunkLimit = SubsequentChunkSize;
    }
  }
}
