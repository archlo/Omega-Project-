/**
 * Some WZ/NX canvases store a zlib stream without the trailing Adler-32
 * checksum, so `pako.inflate()` never reaches Z_STREAM_END and silently
 * returns `undefined` even though every input byte was consumed and fully
 * decoded. Drive `pako.Inflate` manually and recover the decoded bytes from
 * its internal buffers in that case.
 */
export declare function inflateTolerant(compressed: Uint8Array): Uint8Array;
//# sourceMappingURL=InflateTolerant.d.ts.map