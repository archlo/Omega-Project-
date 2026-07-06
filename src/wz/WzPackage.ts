import { fileExists, readFileBytesAsync, readFileBytesSync, type ProgressCallback } from './FileIO.js';
import { WzBuffer } from './WzBuffer.js';
import { WzCrypto } from './WzCrypto.js';
import { WzDirectory } from './WzDirectory.js';
import { WzReaderException } from './WzReaderException.js';
import { NxFile } from './NxFile.js';
import { NxDirectory } from './NxDirectory.js';

export class WzPackage {
  private static readonly Pkg1Magic = 0x31474B50;

  private _buffer: ArrayBuffer;
  private _crypto: WzCrypto;
  private _root: WzDirectory | null = null;
  private _nxFile: NxFile | null;

  public readonly Start: number;
  public readonly VersionHash: number;

  private constructor(buffer: ArrayBuffer, crypto: WzCrypto, start: number, versionHash: number, nxFile: NxFile | null = null) {
    this._buffer = buffer;
    this._crypto = crypto;
    this.Start = start;
    this.VersionHash = versionHash;
    this._nxFile = nxFile;
  }

  get Crypto(): WzCrypto { return this._crypto; }

  get Root(): WzDirectory {
    if (this._root === null) {
      this._root = this._nxFile !== null
        ? new NxDirectory(this._nxFile, this._nxFile.GetNode(0), this)
        : new WzDirectory(this, this.Start + 2);
    }
    return this._root;
  }

  GetItem(path: string): unknown {
    return this.Root.GetItem(path);
  }

  GetBuffer(offset: number): WzBuffer {
    return new WzBuffer(this._buffer, offset);
  }

  /**
   * Async: opens `${dir}/${baseName}.nx` if present, else `.wz`.
   * `.nx` is preferred: it's the already-decrypted/converted format, while
   * `.wz` requires the real GMS AES key+IV to decrypt — this v95 leak's
   * `.wz` files don't decrypt with the standard GMS IV (confirmed: directory
   * parsing is correct, AES primitive is correct, but string decryption
   * still produces garbage), so falling back to `.wz` only works if someone
   * later supplies the real IV for this build.
   */
  static async OpenBaseAsync(dir: string, baseName: string, gameVersion = 95, onProgress?: ProgressCallback): Promise<WzPackage> {
    const nxPath = `${dir}/${baseName}.nx`;
    const wzPath = `${dir}/${baseName}.wz`;
    if (await _existsAsync(nxPath)) return WzPackage.OpenAsync(nxPath, gameVersion, onProgress);
    return WzPackage.OpenAsync(wzPath, gameVersion, onProgress);
  }

  /** Sync: opens `${dir}/${baseName}.nx` if present, else `.wz`. See OpenBaseAsync for why .nx is preferred. */
  static OpenBase(dir: string, baseName: string, gameVersion = 95): WzPackage {
    const nxPath = `${dir}/${baseName}.nx`;
    if (fileExists(nxPath)) return WzPackage.Open(nxPath, gameVersion);
    return WzPackage.Open(`${dir}/${baseName}.wz`, gameVersion);
  }

  /**
   * Async open — does not block the main thread.
   * `.nx` files open lazily (`NxFile.OpenLazy`): only header/node/string
   * metadata is fetched (tens of MB even for the largest base files), not
   * the whole multi-GB body — bitmap/audio blobs are fetched per-asset on
   * first access instead. `.wz` still needs its full encrypted body upfront.
   */
  static async OpenAsync(path: string, gameVersion = 95, onProgress?: ProgressCallback): Promise<WzPackage> {
    if (path.toLowerCase().endsWith('.nx')) {
      const nxFile = NxFile.OpenLazy(path);
      onProgress?.(path, 1, 1);
      return new WzPackage(new ArrayBuffer(0), WzCrypto.CreateEmpty(), 0, 0, nxFile);
    }
    const buffer = await readFileBytesAsync(path, onProgress);
    return WzPackage._fromBuffer(buffer, path, gameVersion);
  }

  /** Synchronous open — blocks the main thread. `.nx` still opens lazily; see OpenAsync. */
  static Open(path: string, gameVersion = 95): WzPackage {
    if (!fileExists(path)) {
      throw new Error(`WZ/NX file not found: ${path}`);
    }
    if (path.toLowerCase().endsWith('.nx')) {
      return new WzPackage(new ArrayBuffer(0), WzCrypto.CreateEmpty(), 0, 0, NxFile.OpenLazy(path));
    }
    const buffer = readFileBytesSync(path);
    return WzPackage._fromBuffer(buffer, path, gameVersion);
  }

  private static _fromBuffer(buffer: ArrayBuffer, path: string, gameVersion: number): WzPackage {
    const probe = new WzBuffer(buffer);

    const magic = probe.ReadInt();
    if (magic === NxFile.Magic) {
      return new WzPackage(buffer, WzCrypto.CreateEmpty(), 0, 0, new NxFile(buffer));
    }
    if (magic !== WzPackage.Pkg1Magic) {
      throw new WzReaderException(`PKG1/PKG4 header missing at start of ${path} (got 0x${magic.toString(16)})`);
    }

    probe.ReadLong();
    const start = probe.ReadInt();

    probe.Position = start;
    const versionHeader = probe.ReadUShort();
    const versionHash = WzPackage._computeVersionHash(gameVersion);
    const computedHeader = 0xFF
      ^ ((versionHash >> 24) & 0xFF)
      ^ ((versionHash >> 16) & 0xFF)
      ^ ((versionHash >> 8) & 0xFF)
      ^ (versionHash & 0xFF);

    if (versionHeader !== computedHeader) {
      throw new WzReaderException(
        `Version hash mismatch for ${path}: header 0x${versionHeader.toString(16)}, expected 0x${computedHeader.toString(16)} for v${gameVersion}`
      );
    }

    return new WzPackage(buffer, WzCrypto.CreateGms(), start, versionHash);
  }

  private static _computeVersionHash(version: number): number {
    let hash = 0;
    const str = version.toString();
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 32) + str.charCodeAt(i) + 1;
    }
    return hash >>> 0;
  }
}

async function _existsAsync(path: string): Promise<boolean> {
  if (typeof fetch === 'undefined') return fileExists(path);
  try {
    const r = await fetch(path, { method: 'HEAD' });
    return r.ok;
  } catch {
    return false;
  }
}
