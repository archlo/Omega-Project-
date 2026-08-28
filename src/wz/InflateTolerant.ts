import * as pako from 'pako';
import { WzReaderException } from './WzReaderException.js';

/**
 * Some WZ/NX canvases store a zlib stream without the trailing Adler-32
 * checksum, so `pako.inflate()` never reaches Z_STREAM_END and silently
 * returns `undefined` even though every input byte was consumed and fully
 * decoded. Drive `pako.Inflate` manually and recover the decoded bytes from
 * its internal buffers in that case.
 */
export function inflateTolerant(compressed: Uint8Array): Uint8Array {
  const inflator = new pako.Inflate() as pako.Inflate & {
    ended: boolean;
    chunks: Uint8Array[];
    strm: { output: Uint8Array; next_out: number };
  };
  inflator.push(compressed, true);
  if (inflator.err) {
    throw new WzReaderException(`zlib inflate failed: ${inflator.msg}`);
  }
  if (inflator.ended) {
    return inflator.result as Uint8Array;
  }
  const strm = inflator.strm;
  const chunks = [...inflator.chunks, strm.output.subarray(0, strm.next_out)];
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const c of chunks) {
    out.set(c, pos);
    pos += c.length;
  }
  return out;
}
