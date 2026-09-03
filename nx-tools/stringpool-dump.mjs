// Dump decrypted v95 client StringPool entries straight from the exe image.
// Usage: node stringpool-dump.mjs <exe> <id> [id...]
// Algorithm (IDA: StringPool::GetString / Key::Key / rotatel / Decode):
//   entry = ms_aString[id]            (table VA 0xC5A878, 4-byte ptrs)
//   seed   = signed char entry[0]
//   cipher = entry[1..] up to NUL
//   key    = ms_aKey (VA 0xB98830, 16 bytes) rotated LEFT by `seed` bits
//            (byte-rot by (seed>>3)%16, then bit-rot by seed&7)
//   out[j] = cipher[j] ^ rotatedKey[j % 16], unless equal -> keep cipher byte
import { readFileSync } from 'node:fs';

const [, , exePath, ...ids] = process.argv;
const buf = readFileSync(exePath);
const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

// --- PE: build VA -> file offset map ---
const peOff = dv.getUint32(0x3c, true);
const numSections = dv.getUint16(peOff + 6, true);
const optSize = dv.getUint16(peOff + 20, true);
const imageBase = dv.getUint32(peOff + 24 + 28, true); // PE32
const secStart = peOff + 24 + optSize;
const sections = [];
for (let i = 0; i < numSections; i++) {
  const o = secStart + i * 40;
  const vSize = dv.getUint32(o + 8, true);
  const vAddr = dv.getUint32(o + 12, true);
  const rSize = dv.getUint32(o + 16, true);
  const rAddr = dv.getUint32(o + 20, true);
  sections.push({ vAddr, vSize, rAddr, rSize });
}
function vaToOff(va) {
  const rva = va - imageBase;
  for (const s of sections) {
    if (rva >= s.vAddr && rva < s.vAddr + Math.max(s.vSize, s.rSize)) {
      return s.rAddr + (rva - s.vAddr);
    }
  }
  throw new Error(`va ${va.toString(16)} not mapped`);
}

const MS_ASTRING = 0xc5a878;
const MS_AKEY = 0xb98830;

function rotlKey(key, seed) {
  const k = Uint8Array.from(key);
  const size = 16;
  const byteShift = Number((BigInt(seed) >> 3n) % BigInt(size));
  const bitShift = seed & 7;
  if (byteShift) {
    const tmp = new Uint8Array(size);
    for (let i = 0; i < size; i++) tmp[i] = k[(i + byteShift) % size];
    k.set(tmp);
  }
  if (bitShift) {
    const carry = k[0] >> (8 - bitShift);
    for (let i = 0; i < size - 1; i++) {
      k[i] = ((k[i] << bitShift) | (k[i + 1] >> (8 - bitShift))) & 0xff;
    }
    k[size - 1] = ((k[size - 1] << bitShift) | carry) & 0xff;
  }
  return k;
}

function decode(id) {
  const ptrOff = vaToOff(MS_ASTRING + id * 4);
  const strVa = dv.getUint32(ptrOff, true);
  if (!strVa) return null;
  const strOff = vaToOff(strVa);
  const seed = dv.getInt8(strOff) >>> 0; // movsx then treated unsigned
  const cipher = [];
  for (let i = strOff + 1; buf[strOff + 1 + cipher.length] !== 0 && cipher.length < 512; i++) {
    cipher.push(buf[strOff + 1 + cipher.length]);
  }
  const key = rotlKey(
    Array.from(buf.subarray(vaToOff(MS_AKEY), vaToOff(MS_AKEY) + 16)),
    seed,
  );
  let out = '';
  for (let j = 0; j < cipher.length; j++) {
    const k = key[j % 16];
    out += cipher[j] === k ? String.fromCharCode(cipher[j]) : String.fromCharCode(cipher[j] ^ k);
  }
  return out;
}

for (const idStr of ids) {
  const id = Number(idStr);
  console.log(`${id} (0x${id.toString(16)}): ${JSON.stringify(decode(id))}`);
}
