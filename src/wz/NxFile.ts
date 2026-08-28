import { fileExists, readFileBytesSync, readRangeBytesSync } from './FileIO.js';
import { lz4Decompress } from './Lz4.js';
import { WzReaderException } from './WzReaderException.js';

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
export class NxFile {
  static readonly Magic = 0x34474B50; // "PKG4" little-endian

  private readonly _buf: ArrayBuffer | null;
  private readonly _dv: DataView | null;
  private readonly _path: string | null;

  private readonly _nodeOffset: number;
  private readonly _nodeCount: number;
  private readonly _stringOffset: number;
  private readonly _stringCount: number;
  private readonly _bitmapOffset: number;
  private readonly _bitmapCount: number;
  private readonly _audioOffset: number;
  private readonly _audioCount: number;

  private readonly _nodeBuf: DataView;
  private readonly _stringCache: (string | undefined)[];
  private readonly _bitmapOffsets: number[] | null = null;
  private readonly _audioOffsets: number[] | null = null;

  static Open(path: string): NxFile {
    if (!fileExists(path)) {
      throw new Error(`NX file not found: ${path}`);
    }
    return new NxFile(readFileBytesSync(path));
  }

  /**
   * Opens without downloading the file body — only metadata is fetched
   * eagerly. No existence pre-check: callers (WzPackage.OpenAsync/Open)
   * already resolved the path, and the first Range read below will fail
   * with a clear error if it's somehow wrong — an extra HEAD request here
   * just adds a redundant round-trip against the same URL.
   */
  static OpenLazy(path: string): NxFile {
    return new NxFile(null, path);
  }

  constructor(buffer: ArrayBuffer | null, path: string | null = null) {
    this._buf = buffer;
    this._dv = buffer ? new DataView(buffer) : null;
    this._path = path;

    const hdrBuf = this._readRange(0, 52, 'PKG4 header');
    const hdr = new DataView(hdrBuf);

    const magic = hdr.getUint32(0, true);
    if (magic !== NxFile.Magic) {
      throw new WzReaderException(`PKG4 header missing (got 0x${magic.toString(16)})`);
    }

    this._nodeCount = hdr.getUint32(4, true);
    this._nodeOffset = Number(hdr.getBigUint64(8, true));
    this._stringCount = hdr.getUint32(16, true);
    this._stringOffset = Number(hdr.getBigUint64(20, true));
    this._bitmapCount = hdr.getUint32(28, true);
    this._bitmapOffset = Number(hdr.getBigUint64(32, true));
    this._audioCount = hdr.getUint32(40, true);
    this._audioOffset = Number(hdr.getBigUint64(44, true));

    this._nodeBuf = new DataView(this._readRange(this._nodeOffset, this._nodeCount * 20, 'node table'));
    this._stringCache = new Array(this._stringCount);

    if (this._buf === null) {
      // Lazy mode: pull the offset tables now (small — 8 bytes/entry) and the
      // whole string blob in one shot (strings are cheap; bitmap/audio blobs
      // are the expensive part and stay lazy).
      if (this._bitmapCount > 0) {
        const bv = new DataView(this._readRange(this._bitmapOffset, this._bitmapCount * 8, 'bitmap offset table'));
        this._bitmapOffsets = [];
        for (let i = 0; i < this._bitmapCount; i++) this._bitmapOffsets.push(Number(bv.getBigUint64(i * 8, true)));
      }
      if (this._audioCount > 0) {
        const av = new DataView(this._readRange(this._audioOffset, this._audioCount * 8, 'audio offset table'));
        this._audioOffsets = [];
        for (let i = 0; i < this._audioCount; i++) this._audioOffsets.push(Number(av.getBigUint64(i * 8, true)));
      }
      this._preloadStrings();
    } else {
      this._checkRange(this._stringOffset, this._stringCount * 8, 'string offset table');
      this._checkRange(this._bitmapOffset, this._bitmapCount * 8, 'bitmap offset table');
      this._checkRange(this._audioOffset, this._audioCount * 8, 'audio offset table');
    }
  }

  get NodeCount(): number {
    return this._nodeCount;
  }

  /** Reads an exact byte range from whichever backing store is active. */
  private _readRange(offset: number, length: number, what = 'range'): ArrayBuffer {
    if (this._buf !== null) {
      this._checkRange(offset, length, what);
      return this._buf.slice(offset, offset + length);
    }
    return readRangeBytesSync(this._path!, offset, length);
  }

  private _checkRange(offset: number, length: number, what: string): void {
    if (this._buf === null) return;
    if (offset < 0 || length < 0 || offset + length > this._buf.byteLength) {
      throw new WzReaderException(`NX ${what} out of bounds: offset ${offset}, length ${length}, file size ${this._buf.byteLength}`);
    }
  }

  private _preloadStrings(): void {
    if (this._stringCount === 0) return;
    const tv = new DataView(this._readRange(this._stringOffset, this._stringCount * 8, 'string offset table'));
    const offsets: number[] = new Array(this._stringCount);
    for (let i = 0; i < this._stringCount; i++) offsets[i] = Number(tv.getBigUint64(i * 8, true));

    const minOff = Math.min(...offsets);
    const nexts = [this._nodeOffset, this._bitmapOffset, this._audioOffset].filter(o => o > this._stringOffset);
    const blockEnd = nexts.length > 0 ? Math.min(...nexts) : minOff + this._stringCount * 400;
    const size = Math.max(blockEnd - minOff, this._stringCount * 4);

    const blobBuf = this._readRange(minOff, size, 'string blob');
    const blobView = new DataView(blobBuf);
    const blobBytes = new Uint8Array(blobBuf);
    const dec = new TextDecoder('utf-8');

    for (let i = 0; i < this._stringCount; i++) {
      const local = offsets[i] - minOff;
      if (local < 0 || local + 2 > blobBuf.byteLength) { this._stringCache[i] = ''; continue; }
      const len = blobView.getUint16(local, true);
      if (local + 2 + len > blobBuf.byteLength) { this._stringCache[i] = ''; continue; }
      this._stringCache[i] = dec.decode(blobBytes.subarray(local + 2, local + 2 + len));
    }
  }

  GetNode(index: number): NxNodeView {
    if (index < 0 || index >= this._nodeCount) {
      throw new WzReaderException(`NX node index out of range: ${index}`);
    }
    const off = index * 20;
    return {
      index,
      nameId: this._nodeBuf.getUint32(off, true),
      childIndex: this._nodeBuf.getUint32(off + 4, true),
      childCount: this._nodeBuf.getUint16(off + 8, true),
      type: this._nodeBuf.getUint16(off + 10, true),
      dataOffset: off + 12,
    };
  }

  GetChildren(node: NxNodeView): NxNodeView[] {
    if (node.childIndex < 0 || node.childIndex + node.childCount > this._nodeCount) {
      throw new WzReaderException(`NX node children out of range: index ${node.childIndex}, count ${node.childCount}`);
    }
    const result: NxNodeView[] = new Array(node.childCount);
    for (let i = 0; i < node.childCount; i++) {
      result[i] = this.GetNode(node.childIndex + i);
    }
    return result;
  }

  GetString(id: number): string {
    if (id < 0 || id >= this._stringCount) {
      throw new WzReaderException(`NX string id out of range: ${id}`);
    }
    const cached = this._stringCache[id];
    if (cached !== undefined) {
      return cached;
    }
    // Eager mode only — lazy mode preloads every string at open time.
    const dv = this._dv!;
    const tableOff = this._stringOffset + id * 8;
    const strOff = Number(dv.getBigUint64(tableOff, true));
    this._checkRange(strOff, 2, 'string length prefix');
    const len = dv.getUint16(strOff, true);
    this._checkRange(strOff + 2, len, 'string data');
    const bytes = new Uint8Array(this._buf!, strOff + 2, len);
    const str = new TextDecoder('utf-8').decode(bytes);
    this._stringCache[id] = str;
    return str;
  }

  // Node-data reads (int/double/vector/etc.) are tiny (<=16 bytes) and always
  // sit inside the already-loaded node table, so these stay unconditional —
  // no extra fetch needed even in lazy mode.
  ReadInt64(node: NxNodeView): bigint {
    return this._nodeBuf.getBigInt64(node.dataOffset, true);
  }

  ReadDouble(node: NxNodeView): number {
    return this._nodeBuf.getFloat64(node.dataOffset, true);
  }

  ReadStringId(node: NxNodeView): number {
    return this._nodeBuf.getUint32(node.dataOffset, true);
  }

  ReadVector(node: NxNodeView): { x: number; y: number } {
    return {
      x: this._nodeBuf.getInt32(node.dataOffset, true),
      y: this._nodeBuf.getInt32(node.dataOffset + 4, true),
    };
  }

  ReadBitmapInfo(node: NxNodeView): { id: number; width: number; height: number } {
    return {
      id: this._nodeBuf.getUint32(node.dataOffset, true),
      width: this._nodeBuf.getUint16(node.dataOffset + 4, true),
      height: this._nodeBuf.getUint16(node.dataOffset + 6, true),
    };
  }

  ReadAudioInfo(node: NxNodeView): { id: number; length: number } {
    return {
      id: this._nodeBuf.getUint32(node.dataOffset, true),
      length: this._nodeBuf.getUint32(node.dataOffset + 4, true),
    };
  }

  /**
   * Decompresses a bitmap blob to raw BGRA8888 pixel bytes. `decompressedSize`
   * must be `width * height * 4` — NX stores bitmaps as raw LZ4 blocks (no
   * frame header, no embedded uncompressed-size field), so the decompressor
   * needs the target size up front; the caller already knows it from the
   * canvas node's width/height fields.
   */
  GetBitmapBgra(id: number, decompressedSize: number): Uint8Array {
    if (id < 0 || id >= this._bitmapCount) {
      throw new WzReaderException(`NX bitmap id out of range: ${id}`);
    }
    const bmpOff = this._bitmapOffsets ? this._bitmapOffsets[id] : Number(this._dv!.getBigUint64(this._bitmapOffset + id * 8, true));
    const lenBuf = this._readRange(bmpOff, 4, 'bitmap length prefix');
    const len = new DataView(lenBuf).getUint32(0, true);
    const dataBuf = this._readRange(bmpOff + 4, len, 'bitmap data');
    return lz4Decompress(new Uint8Array(dataBuf), decompressedSize);
  }

  /** Returns the raw audio blob bytes (typically a complete WAV file). */
  GetAudioBytes(id: number, length: number): Uint8Array {
    if (id < 0 || id >= this._audioCount) {
      throw new WzReaderException(`NX audio id out of range: ${id}`);
    }
    const dataOff = this._audioOffsets ? this._audioOffsets[id] : Number(this._dv!.getBigUint64(this._audioOffset + id * 8, true));
    return new Uint8Array(this._readRange(dataOff, length, 'audio data'));
  }
}
