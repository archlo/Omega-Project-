export interface NxNodeView {
    index: number;
    nameId: number;
    childIndex: number;
    childCount: number;
    type: number;
    dataOffset: number;
}
/**
 * Reader for the NX (PKG4) asset container format: a flat node table plus
 * separate string / bitmap / audio blob tables, used as a faster alternative
 * to WZ for the same asset tree shape.
 *
 * Two modes:
 *  - Eager (`new NxFile(buffer)`): the whole file is already in memory.
 *  - Lazy (`NxFile.OpenLazy(path)`): only the header + node table + string
 *    table are fetched via HTTP Range requests at open time (tens of MB for
 *    even the largest base files, instead of downloading the full multi-GB
 *    body). Bitmap/audio blob bytes — the vast majority of file size — are
 *    fetched per-asset, on first access, via a blocking Range request. This
 *    keeps every existing caller's synchronous API (GetBitmapBgra,
 *    GetAudioBytes, ...) unchanged; only the data source moved from "already
 *    in memory" to "fetched on demand".
 */
export declare class NxFile {
    static readonly Magic = 877087568;
    private readonly _buf;
    private readonly _dv;
    private readonly _path;
    private readonly _nodeOffset;
    private readonly _nodeCount;
    private readonly _stringOffset;
    private readonly _stringCount;
    private readonly _bitmapOffset;
    private readonly _bitmapCount;
    private readonly _audioOffset;
    private readonly _audioCount;
    private readonly _nodeBuf;
    private readonly _stringCache;
    private readonly _bitmapOffsets;
    private readonly _audioOffsets;
    static Open(path: string): NxFile;
    /**
     * Opens without downloading the file body — only metadata is fetched
     * eagerly. No existence pre-check: callers (WzPackage.OpenAsync/Open)
     * already resolved the path, and the first Range read below will fail
     * with a clear error if it's somehow wrong — an extra HEAD request here
     * just adds a redundant round-trip against the same URL.
     */
    static OpenLazy(path: string): NxFile;
    constructor(buffer: ArrayBuffer | null, path?: string | null);
    get NodeCount(): number;
    /** Reads an exact byte range from whichever backing store is active. */
    private _readRange;
    private _checkRange;
    private _preloadStrings;
    GetNode(index: number): NxNodeView;
    GetChildren(node: NxNodeView): NxNodeView[];
    GetString(id: number): string;
    ReadInt64(node: NxNodeView): bigint;
    ReadDouble(node: NxNodeView): number;
    ReadStringId(node: NxNodeView): number;
    ReadVector(node: NxNodeView): {
        x: number;
        y: number;
    };
    ReadBitmapInfo(node: NxNodeView): {
        id: number;
        width: number;
        height: number;
    };
    ReadAudioInfo(node: NxNodeView): {
        id: number;
        length: number;
    };
    /**
     * Decompresses a bitmap blob to raw BGRA8888 pixel bytes. `decompressedSize`
     * must be `width * height * 4` — NX stores bitmaps as raw LZ4 blocks (no
     * frame header, no embedded uncompressed-size field), so the decompressor
     * needs the target size up front; the caller already knows it from the
     * canvas node's width/height fields.
     */
    GetBitmapBgra(id: number, decompressedSize: number): Uint8Array;
    /** Returns the raw audio blob bytes (typically a complete WAV file). */
    GetAudioBytes(id: number, length: number): Uint8Array;
}
//# sourceMappingURL=NxFile.d.ts.map