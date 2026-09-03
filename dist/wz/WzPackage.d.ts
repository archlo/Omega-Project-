import { type ProgressCallback } from './FileIO.js';
import { WzBuffer } from './WzBuffer.js';
import { WzCrypto } from './WzCrypto.js';
import { WzDirectory } from './WzDirectory.js';
export declare class WzPackage {
    private static readonly Pkg1Magic;
    private _buffer;
    private _crypto;
    private _root;
    private _nxFile;
    readonly Start: number;
    readonly VersionHash: number;
    private constructor();
    get Crypto(): WzCrypto;
    get Root(): WzDirectory;
    GetItem(path: string): unknown;
    GetBuffer(offset: number): WzBuffer;
    /**
     * Async: opens `${dir}/${baseName}.nx` if present, else `.wz`.
     * `.nx` is preferred: it's the already-decrypted/converted format, while
     * `.wz` requires the real GMS AES key+IV to decrypt — this v95 leak's
     * `.wz` files don't decrypt with the standard GMS IV (confirmed: directory
     * parsing is correct, AES primitive is correct, but string decryption
     * still produces garbage), so falling back to `.wz` only works if someone
     * later supplies the real IV for this build.
     */
    static OpenBaseAsync(dir: string, baseName: string, gameVersion?: number, onProgress?: ProgressCallback): Promise<WzPackage>;
    /** Sync: opens `${dir}/${baseName}.nx` if present, else `.wz`. See OpenBaseAsync for why .nx is preferred. */
    static OpenBase(dir: string, baseName: string, gameVersion?: number): WzPackage;
    /**
     * Async open — does not block the main thread.
     * `.nx` files open lazily (`NxFile.OpenLazy`): only header/node/string
     * metadata is fetched (tens of MB even for the largest base files), not
     * the whole multi-GB body — bitmap/audio blobs are fetched per-asset on
     * first access instead. `.wz` still needs its full encrypted body upfront.
     */
    static OpenAsync(path: string, gameVersion?: number, onProgress?: ProgressCallback): Promise<WzPackage>;
    /** Synchronous open — blocks the main thread. `.nx` still opens lazily; see OpenAsync. */
    static Open(path: string, gameVersion?: number): WzPackage;
    private static _fromBuffer;
    private static _computeVersionHash;
}
//# sourceMappingURL=WzPackage.d.ts.map