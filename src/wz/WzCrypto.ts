import * as aesjs from 'aes-js';
import { WzConstants } from './WzConstants.js';

// aes-js is CJS-only with `module.exports = aesjs` (no static named exports).
// Under bundlers (Vite/esbuild) `import * as aesjs` resolves fine, but under
// Node's native ESM loader (tsx, ts-node, `node --experimental-`) the
// cjs-module-lexer can't see named exports through that assignment pattern,
// so `aesjs.ModeOfOperation` comes back undefined there. Unwrap `.default`
// when present so both environments work.
const ModeOfOperation: typeof aesjs.ModeOfOperation =
  (aesjs as unknown as { default?: typeof aesjs }).default?.ModeOfOperation ?? aesjs.ModeOfOperation;

export class WzCrypto {
  private static readonly BatchSize = 1024;

  private _aes: aesjs.ModeOfOperation.ecb | null;
  private _expandedIv: Uint8Array;
  private _mask: Uint8Array = new Uint8Array(0);

  static CreateGms(): WzCrypto {
    return new WzCrypto(WzConstants.WzGmsIv);
  }

  static CreateEmpty(): WzCrypto {
    return new WzCrypto(WzConstants.WzEmptyIv);
  }

  private constructor(iv: Uint8Array) {
    if (iv.length !== 4) {
      throw new Error(`WZ IV must be exactly 4 bytes (got ${iv.length})`);
    }

    const isEmpty = iv[0] === 0 && iv[1] === 0 && iv[2] === 0 && iv[3] === 0;
    if (isEmpty) {
      this._aes = null;
      this._expandedIv = new Uint8Array(16);
      return;
    }

    const trimmedKey = new Uint8Array(32);
    for (let i = 0; i < 128; i += 4) {
      trimmedKey[i / 4] = WzConstants.AesUserKey[i];
    }

    this._expandedIv = new Uint8Array(16);
    for (let i = 0; i < 16; i += iv.length) {
      this._expandedIv.set(iv, i);
    }

    this._aes = new ModeOfOperation.ecb(trimmedKey);
  }

  CryptAscii(data: Uint8Array): void {
    this._ensureMaskSize(data.length);
    let mask = 0xAA;
    for (let i = 0; i < data.length; i++) {
      data[i] = data[i] ^ this._mask[i] ^ mask;
      mask = (mask + 1) & 0xFF;
    }
  }

  CryptUnicode(data: Uint8Array): void {
    this._ensureMaskSize(data.length);
    let mask = 0xAAAA;
    for (let i = 0; i < data.length; i += 2) {
      data[i] = data[i] ^ this._mask[i] ^ (mask & 0xFF);
      data[i + 1] = data[i + 1] ^ this._mask[i + 1] ^ ((mask >> 8) & 0xFF);
      mask = (mask + 1) & 0xFFFF;
    }
  }

  private _ensureMaskSize(size: number): void {
    if (this._mask.length >= size) {
      return;
    }

    const newSize = (Math.floor(size / WzCrypto.BatchSize) + 1) * WzCrypto.BatchSize;
    const newMask = new Uint8Array(newSize);

    if (this._aes) {
      const iv = this._expandedIv;
      let prev = new Uint8Array(iv);
      for (let offset = 0; offset < newSize; offset += 16) {
        prev = new Uint8Array(this._aes.encrypt(prev));
        newMask.set(prev, offset);
      }
    }

    this._mask = newMask;
  }
}
