import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, it, expect, afterAll } from 'vitest';
import { WzPackage } from '../../src/wz/WzPackage.js';
import { WzProperty } from '../../src/wz/WzProperty.js';
import { WzImage } from '../../src/wz/WzImage.js';
import { WzDirectory } from '../../src/wz/WzDirectory.js';
import { WzVector } from '../../src/wz/WzVector.js';
import { NxFile } from '../../src/wz/NxFile.js';

// Hand-built minimal PKG4 (NX) buffer with one "Test.img" containing:
//   num: int64 42
//   name: string "hello"
//   vec: vector (10, 20)
//   nested: { inner: int64 7 }
function buildNxFixture(): ArrayBuffer {
  const strings = ['', 'Test.img', 'num', 'name', 'hello', 'vec', 'nested', 'inner'];

  const headerSize = 52;
  const nodeCount = 7;
  const nodeOffset = headerSize;
  const nodesSize = nodeCount * 20;
  const stringTableOffset = nodeOffset + nodesSize;
  const stringTableSize = strings.length * 8;
  const stringDataStart = stringTableOffset + stringTableSize;

  // Compute per-string byte offsets.
  const stringOffsets: number[] = [];
  let cursor = stringDataStart;
  for (const s of strings) {
    stringOffsets.push(cursor);
    cursor += 2 + Buffer.byteLength(s, 'utf-8');
  }
  const total = cursor;

  const buf = new ArrayBuffer(total);
  const dv = new DataView(buf);

  // Header
  dv.setUint32(0, NxFile.Magic, true);
  dv.setUint32(4, nodeCount, true);
  dv.setBigUint64(8, BigInt(nodeOffset), true);
  dv.setUint32(16, strings.length, true);
  dv.setBigUint64(20, BigInt(stringTableOffset), true);
  dv.setUint32(28, 0, true); // bitmapCount
  dv.setBigUint64(32, 0n, true); // bitmapOffset
  dv.setUint32(40, 0, true); // audioCount
  dv.setBigUint64(44, 0n, true); // audioOffset

  // Nodes: [nameId(u32), childIndex(u32), childCount(u16), type(u16), data(8 bytes)]
  const writeNode = (index: number, nameId: number, childIndex: number, childCount: number, type: number, writeData: (off: number) => void) => {
    const off = nodeOffset + index * 20;
    dv.setUint32(off, nameId, true);
    dv.setUint32(off + 4, childIndex, true);
    dv.setUint16(off + 8, childCount, true);
    dv.setUint16(off + 10, type, true);
    writeData(off + 12);
  };

  writeNode(0, 0, 1, 1, 0, () => {}); // root -> Test.img
  writeNode(1, 1, 2, 4, 0, () => {}); // Test.img -> num, name, vec, nested
  writeNode(2, 2, 0, 0, 1, (off) => dv.setBigInt64(off, 42n, true)); // num
  writeNode(3, 3, 0, 0, 3, (off) => dv.setUint32(off, 4, true)); // name -> stringId 4 "hello"
  writeNode(4, 5, 0, 0, 4, (off) => { dv.setInt32(off, 10, true); dv.setInt32(off + 4, 20, true); }); // vec
  writeNode(5, 6, 6, 1, 0, () => {}); // nested -> inner
  writeNode(6, 7, 0, 0, 1, (off) => dv.setBigInt64(off, 7n, true)); // inner

  // String table + data
  for (let i = 0; i < strings.length; i++) {
    dv.setBigUint64(stringTableOffset + i * 8, BigInt(stringOffsets[i]), true);
    const off = stringOffsets[i];
    const bytes = Buffer.from(strings[i], 'utf-8');
    dv.setUint16(off, bytes.length, true);
    new Uint8Array(buf, off + 2, bytes.length).set(bytes);
  }

  return buf;
}

describe('NxFile', () => {
  it('reads header, nodes, and strings', () => {
    const file = new NxFile(buildNxFixture());
    expect(file.NodeCount).toBe(7);

    const root = file.GetNode(0);
    expect(root.childCount).toBe(1);
    const children = file.GetChildren(root);
    expect(file.GetString(children[0].nameId)).toBe('Test.img');
  });
});

describe('WzPackage with NX backing', () => {
  const tmpFile = path.join(os.tmpdir(), `mapleclaude-nx-test-${process.pid}.nx`);
  fs.writeFileSync(tmpFile, Buffer.from(buildNxFixture()));

  afterAll(() => {
    fs.rmSync(tmpFile, { force: true });
  });

  it('opens a PKG4 file and exposes WzDirectory/WzImage/WzProperty-compatible tree', () => {
    const pkg = WzPackage.Open(tmpFile);

    expect(pkg.Root).toBeInstanceOf(WzDirectory);
    const img = pkg.Root.Items['Test.img'];
    expect(img).toBeInstanceOf(WzImage);

    const root = (img as WzImage).Root;
    expect(root).toBeInstanceOf(WzProperty);
    expect(root.Get('num')).toBe(42n);
    expect(root.Get('name')).toBe('hello');

    const vec = root.Get('vec');
    expect(vec).toBeInstanceOf(WzVector);
    expect((vec as WzVector).X).toBe(10);
    expect((vec as WzVector).Y).toBe(20);

    const nested = root.Get('nested');
    expect(nested).toBeInstanceOf(WzProperty);
    expect((nested as WzProperty).Get('inner')).toBe(7n);
  });

  it('resolves nested paths via GetItem', () => {
    const pkg = WzPackage.Open(tmpFile);
    expect(pkg.GetItem('Test.img/num')).toBe(42n);
    expect(pkg.GetItem('Test.img/nested/inner')).toBe(7n);
  });
});
