import * as fs from 'node:fs';

const isNode = typeof process !== 'undefined' && !!process.versions?.node;

const CHUNK_SIZE = 8 * 1024 * 1024;   // 8 MB per Range request
const MAX_PARALLEL = 6;                // concurrent Range fetches
const SMALL_FILE_THRESHOLD = 32 * 1024 * 1024; // files < 32 MB: single fetch

export type ProgressCallback = (path: string, received: number, total: number) => void;

export function fileExists(path: string): boolean {
  if (isNode) return fs.existsSync(path);
  return _syncHEAD(path);
}

/** Reads an exact byte range without downloading the whole file. Async (fetch). */
export async function readRangeBytesAsync(path: string, start: number, length: number): Promise<ArrayBuffer> {
  if (length <= 0) return new ArrayBuffer(0);
  if (isNode) {
    const fd = fs.openSync(path, 'r');
    try {
      const buf = Buffer.alloc(length);
      fs.readSync(fd, buf, 0, length, start);
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    } finally {
      fs.closeSync(fd);
    }
  }
  const res = await fetch(path, { headers: { Range: `bytes=${start}-${start + length - 1}` } });
  if (res.status !== 206 && res.status !== 200) throw new Error(`Range fetch failed ${path} [${start}-${start + length - 1}]: ${res.status}`);
  return res.arrayBuffer();
}

/** Reads an exact byte range without downloading the whole file. Sync (blocking XHR/fs). */
export function readRangeBytesSync(path: string, start: number, length: number): ArrayBuffer {
  if (length <= 0) return new ArrayBuffer(0);
  if (isNode) {
    const fd = fs.openSync(path, 'r');
    try {
      const buf = Buffer.alloc(length);
      fs.readSync(fd, buf, 0, length, start);
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    } finally {
      fs.closeSync(fd);
    }
  }
  // Synchronous XHR cannot use responseType 'arraybuffer' (browsers throw
  // InvalidAccessError: "The response type cannot be changed for synchronous
  // requests"). Fall back to the classic binary-safe-text trick instead.
  const xhr = new XMLHttpRequest();
  xhr.open('GET', path, false);
  xhr.overrideMimeType('text/plain; charset=x-user-defined');
  xhr.setRequestHeader('Range', `bytes=${start}-${start + length - 1}`);
  xhr.send();
  if (xhr.status !== 206 && xhr.status !== 200) throw new Error(`Range fetch failed ${path} [${start}-${start + length - 1}]: ${xhr.status}`);
  const text = xhr.responseText;
  if (!text) throw new Error(`Empty range response for ${path} [${start}-${start + length - 1}]`);
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i) & 0xFF;
  return bytes.buffer;
}

export async function readFileBytesAsync(path: string, onProgress?: ProgressCallback): Promise<ArrayBuffer> {
  if (isNode) {
    const buf = fs.readFileSync(path);
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }
  return _fetchChunked(path, onProgress);
}

export function readFileBytesSync(path: string): ArrayBuffer {
  if (isNode) {
    const buf = fs.readFileSync(path);
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }
  // Use `responseType: 'arraybuffer'` rather than the old `responseText` +
  // char-by-char decode approach: sync XHR's `responseText` silently comes
  // back truncated/empty past an internal string-size ceiling for large
  // files (confirmed by an earlier session for files in the hundreds-of-MB
  // range — see STATUS.md), which corrupted WZ loads with no error raised.
  // `arraybuffer` has no such limit and needs no manual byte decoding.
  const xhr = new XMLHttpRequest();
  xhr.open('GET', path, false);
  xhr.responseType = 'arraybuffer';
  xhr.send();
  if (xhr.status < 200 || xhr.status >= 300) throw new Error(`Failed to fetch ${path}`);
  const response = xhr.response as ArrayBuffer;
  if (!response) throw new Error(`Empty response body for ${path}`);
  return response;
}

async function _fetchChunked(url: string, onProgress?: ProgressCallback): Promise<ArrayBuffer> {
  const head = await fetch(url, { method: 'HEAD' });
  if (head.status === 404) throw new Error(`File not found: ${url}`);
  if (!head.ok) throw new Error(`Failed to HEAD ${url}: ${head.status}`);
  const total = Number(head.headers.get('Content-Length')) || 0;
  const acceptsRanges = head.headers.get('Accept-Ranges') !== 'none';

  // Small files or no Content-Length: single streaming fetch.
  if (!acceptsRanges || total === 0 || total <= SMALL_FILE_THRESHOLD) {
    return _fetchStream(url, total, onProgress);
  }

  // Large files: parallel Range requests.
  const chunkCount = Math.ceil(total / CHUNK_SIZE);
  const out = new Uint8Array(total);
  let received = 0;

  // Process chunks in batches of MAX_PARALLEL.
  for (let batch = 0; batch < chunkCount; batch += MAX_PARALLEL) {
    const batchEnd = Math.min(batch + MAX_PARALLEL, chunkCount);
    await Promise.all(
      Array.from({ length: batchEnd - batch }, (_, i) => {
        const idx = batch + i;
        const start = idx * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE - 1, total - 1);
        return _fetchRange(url, start, end).then(chunk => {
          out.set(new Uint8Array(chunk), start);
          received += chunk.byteLength;
          onProgress?.(url, received, total);
        });
      })
    );
  }
  return out.buffer;
}

async function _fetchRange(url: string, start: number, end: number): Promise<ArrayBuffer> {
  const res = await fetch(url, { headers: { Range: `bytes=${start}-${end}` } });
  // Must be exactly 206 Partial Content. A 200 OK here means the server (or an
  // intermediary proxy/CDN) ignored the Range header and returned the FULL file
  // body instead of just [start,end] — accepting that (the old `res.ok` check
  // did, since 200 is also "ok") would write the whole file's bytes at offset
  // `start` into the assembly buffer via `out.set(...)` in `_fetchChunked`,
  // silently corrupting every chunk after the first instead of throwing.
  if (res.status !== 206) throw new Error(`Range fetch failed ${url} [${start}-${end}]: expected 206, got ${res.status}`);
  return res.arrayBuffer();
}

async function _fetchStream(url: string, total: number, onProgress?: ProgressCallback): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  if (!onProgress || !response.body) return response.arrayBuffer();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    onProgress(url, received, total);
  }
  const out = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.length; }
  return out.buffer;
}

function _syncHEAD(path: string): boolean {
  const xhr = new XMLHttpRequest();
  xhr.open('HEAD', path, false);
  try { xhr.send(); } catch { return false; }
  return xhr.status >= 200 && xhr.status < 300;
}
