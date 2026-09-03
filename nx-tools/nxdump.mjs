// Minimal NX PKG4 reader — dumps a subtree (names, types, canvas dims).
// Usage: node nxdump.mjs <File.nx> <path/with/slashes> [depth]
import { readFileSync } from 'node:fs';

const [, , file, path = '', depthArg = '3'] = process.argv;
const maxDepth = parseInt(depthArg);
const buf = readFileSync(file);
const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

if (buf.toString('ascii', 0, 4) !== 'PKG4') { console.error('not PKG4'); process.exit(1); }
const nodeCount = dv.getUint32(4, true);
const nodeOff = Number(dv.getBigUint64(8, true));
const strCount = dv.getUint32(16, true);
const strOff = Number(dv.getBigUint64(20, true));

// string table
const strs = new Array(strCount);
for (let i = 0; i < strCount; i++) {
  const off = Number(dv.getBigUint64(strOff + i * 8, true));
  const len = dv.getUint16(off, true);
  strs[i] = buf.toString('utf8', off + 2, off + 2 + len);
}

function node(id) {
  const o = nodeOff + id * 20;
  return {
    o,
    name: strs[dv.getUint32(o, true)],
    firstChild: dv.getUint32(o + 4, true),
    count: dv.getUint16(o + 8, true),
    type: dv.getUint16(o + 10, true),
  };
}
function val(n) {
  const o = n.o + 12;
  switch (n.type) {
    case 1: return `int=${Number(dv.getBigInt64(o, true))}`;
    case 2: return `dbl=${dv.getFloat64(o, true)}`;
    case 3: return `str="${strs[dv.getUint32(o, true)]}"`;
    case 4: return `vec=(${dv.getInt32(o, true)},${dv.getInt32(o + 4, true)})`;
    case 5: return `bmp ${dv.getUint16(o + 4, true)}x${dv.getUint16(o + 6, true)}`;
    case 6: return `audio`;
    default: return '';
  }
}
function childByName(n, name) {
  for (let i = 0; i < n.count; i++) {
    const c = node(n.firstChild + i);
    if (c.name === name) return c;
  }
  return null;
}

let cur = node(0);
for (const part of path.split('/').filter(Boolean)) {
  const next = childByName(cur, part);
  if (!next) { console.error(`missing: ${part}`); process.exit(1); }
  cur = next;
}

function dump(n, depth, indent) {
  const v = val(n);
  console.log(`${indent}${n.name}  [${n.type}]${v ? ' ' + v : ''}${n.count ? ` (${n.count})` : ''}`);
  if (depth >= maxDepth) return;
  for (let i = 0; i < n.count; i++) dump(node(n.firstChild + i), depth + 1, indent + '  ');
}
dump(cur, 0, '');
