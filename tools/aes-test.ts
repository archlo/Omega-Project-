// AES-256-ECB cross-verification test
// Run with: npx tsx tools/aes-test.ts
// Compare output with server running the same test

import * as aesjs from 'aes-js';
import * as crypto from 'crypto';

const AES_KEY = new Uint8Array([
  0x13, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00,
  0x06, 0x00, 0x00, 0x00, 0xB4, 0x00, 0x00, 0x00,
  0x1B, 0x00, 0x00, 0x00, 0x0F, 0x00, 0x00, 0x00,
  0x33, 0x00, 0x00, 0x00, 0x52, 0x00, 0x00, 0x00,
]);

// Test1: Encrypt a known16-byte block
const testBlock = new Uint8Array([
  0xf2, 0x53, 0x50, 0xc6, 0xf2, 0x53, 0x50, 0xc6,
  0xf2, 0x53, 0x50, 0xc6, 0xf2, 0x53, 0x50, 0xc6,
]);

// aes-js
const ecb1 = new aesjs.ModeOfOperation.ecb(AES_KEY);
const aesJsResult = ecb1.encrypt(testBlock);

// Node crypto
const cipher = crypto.createCipheriv('aes-256-ecb', Buffer.from(AES_KEY), null);
const nodeResult = cipher.update(Buffer.from(testBlock));

console.log('Input:      ', Array.from(testBlock).map(b => b.toString(16).padStart(2,'0')).join(' '));
console.log('aes-js:     ', Array.from(aesJsResult).map(b => b.toString(16).padStart(2,'0')).join(' '));
console.log('Node crypto:', Array.from(nodeResult).map(b => b.toString(16).padStart(2,'0')).join(' '));
console.log('Match:', Buffer.from(aesJsResult).equals(nodeResult));

// Test2: Chain — encrypt result again
const ecb2 = new aesjs.ModeOfOperation.ecb(AES_KEY);
const aesJsChain = ecb2.encrypt(aesJsResult);
const cipher2 = crypto.createCipheriv('aes-256-ecb', Buffer.from(AES_KEY), null);
const nodeChain = cipher2.update(nodeResult);

console.log('\nChain test:');
console.log('aes-js:     ', Array.from(aesJsChain).map(b => b.toString(16).padStart(2,'0')).join(' '));
console.log('Node crypto:', Array.from(nodeChain).map(b => b.toString(16).padStart(2,'0')).join(' '));
console.log('Match:', Buffer.from(aesJsChain).equals(nodeChain));

// Test3: Full MapleCrypto.Crypt simulation with both implementations
function mapleCryptAesJs(data: Uint8Array, iv: Uint8Array): void {
  const BlockSize = 16;
  let remaining = data.length;
  let chunkLimit = 0x5B0;
  let offset = 0;
  const block = new Uint8Array(BlockSize);
  while (remaining > 0) {
    for (let i = 0; i < BlockSize; i += iv.length) block.set(iv, i);
    const chunkLen = remaining < chunkLimit ? remaining : chunkLimit;
    for (let i = offset; i < offset + chunkLen; i++) {
      const blockIndex = (i - offset) % BlockSize;
      if (blockIndex === 0) {
        const ecb = new aesjs.ModeOfOperation.ecb(AES_KEY);
        block.set(ecb.encrypt(block));
      }
      data[i] ^= block[blockIndex];
    }
    offset += chunkLen;
    remaining -= chunkLen;
    chunkLimit = 0x5B4;
  }
}

function mapleCryptNode(data: Buffer, iv: Buffer): void {
  const cipher = crypto.createCipheriv('aes-256-ecb', Buffer.from(AES_KEY), null);
  const blockLength = 1460;
  let currentBlockLength = 1456;
  const ivCopy = Buffer.alloc(16);
  for (let i = 0; i < 16; i++) ivCopy[i] = iv[i % 4];
  for (let i = 0; i < data.length; ) {
    const block = Math.min(data.length - i, currentBlockLength);
    let xorKey = ivCopy.slice();
    for (let j = 0; j < block; j++) {
      if (j % 16 === 0) xorKey = cipher.update(xorKey);
      data[i + j] ^= xorKey[j % 16];
    }
    i += block;
    currentBlockLength = blockLength;
  }
}

// Test with a small payload (like a real packet)
const iv = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
const testData1 = new Uint8Array(30);
for (let i = 0; i < 30; i++) testData1[i] = i;
const testData2 = Buffer.from(testData1);

mapleCryptAesJs(testData1, iv);
mapleCryptNode(testData2, Buffer.from(iv));

console.log('\nFull MapleCrypto.Crypt test (30 bytes):');
console.log('aes-js: ', Array.from(testData1).map(b => b.toString(16).padStart(2,'0')).join(' '));
console.log('Node:   ', Array.from(testData2).map(b => b.toString(16).padStart(2,'0')).join(' '));
console.log('Match:', Buffer.from(testData1).equals(testData2));
