import * as aesjs from 'aes-js';
import { IgCipher } from '../src/net/crypto/IgCipher.js';
import { MapleCrypto } from '../src/net/crypto/MapleCrypto.js';

const AES_KEY = new Uint8Array([
  0x13, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00,
  0x06, 0x00, 0x00, 0x00, 0xB4, 0x00, 0x00, 0x00,
  0x1B, 0x00, 0x00, 0x00, 0x0F, 0x00, 0x00, 0x00,
  0x33, 0x00, 0x00, 0x00, 0x52, 0x00, 0x00, 0x00,
]);

// Test 1: AES-ECB of a known block
const testBlock = new Uint8Array([0x52, 0x30, 0x78, 0x61, 0x52, 0x30, 0x78, 0x61, 0x52, 0x30, 0x78, 0x61, 0x52, 0x30, 0x78, 0x61]);
const ecb = new aesjs.ModeOfOperation.ecb(AES_KEY);
const encrypted = ecb.encrypt(testBlock);
console.log('AES-ECB test:');
console.log('Input:    ', Array.from(testBlock).map(b => b.toString(16).padStart(2, '0')).join(' '));
console.log('Encrypted:', Array.from(encrypted).map(b => b.toString(16).padStart(2, '0')).join(' '));

// Test 2: morphIV test (IgCipher.InnoHash)
const iv = new Uint8Array([0x52, 0x30, 0x78, 0x61]);
IgCipher.InnoHash(iv);
console.log('\nmorphIV test:');
console.log('Input:   52 30 78 61');
console.log('Morphed:', Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(' '));

// Test 3: Full MapleCrypto.Crypt + InnoHash
const iv2 = new Uint8Array([0x52, 0x30, 0x78, 0x61]);
const data = new Uint8Array(32);
for (let i = 0; i < 32; i++) data[i] = i;
MapleCrypto.Crypt(data, iv2);
IgCipher.InnoHash(iv2);
console.log('\nFull transform test:');
console.log('Data:    ', Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' '));
console.log('IV after:', Array.from(iv2).map(b => b.toString(16).padStart(2, '0')).join(' '));
