import { WzProperty } from '../wz/WzProperty.js';
import { WzImage } from '../wz/WzImage.js';
import { WzPackage } from '../wz/WzPackage.js';

const GameVersion = 95;
let _constantCrc: number | null = null;

const Table = [
  0, 0x04C11DB7, 0x09823B6E, 0x0D4326D9, 0x130476DC, 0x17C56B6B,
  0x1A864DB2, 0x1E475005, 0x2608EDB8, 0x22C9F00F, 0x2F8AD6D6,
  0x2B4BCB61, 0x350C9B64, 0x31CD86D3, 0x3C8EA00A, 0x384FBDBD,
  0x4C11DB70, 0x48D0C6C7, 0x4593E01E, 0x4152FDA9, 0x5F15ADAC,
  0x5BD4B01B, 0x569796C2, 0x52568B75, 0x6A1936C8, 0x6ED82B7F,
  0x639B0DA6, 0x675A1011, 0x791D4014, 0x7DDC5DA3, 0x709F7B7A,
  0x745E66CD, 0x9823B6E0, 0x9CE2AB57, 0x91A18D8E, 0x95609039,
  0x8B27C03C, 0x8FE6DD8B, 0x82A5FB52, 0x8664E6E5, 0xBE2B5B58,
  0xBAEA46EF, 0xB7A96036, 0xB3687D81, 0xAD2F2D84, 0xA9EE3033,
  0xA4AD16EA, 0xA06C0B5D, 0xD4326D90, 0xD0F37027, 0xDDB056FE,
  0xD9714B49, 0xC7361B4C, 0xC3F706FB, 0xCEB42022, 0xCA753D95,
  0xF23A8028, 0xF6FB9D9F, 0xFBB8BB46, 0xFF79A6F1, 0xE13EF6F4,
  0xE5FFEB43, 0xE8BCCD9A, 0xEC7DD02D, 0x34867077, 0x30476DC0,
  0x3D044B19, 0x39C556AE, 0x278206AB, 0x23431B1C, 0x2E003DC5,
  0x2AC12072, 0x128E9DCF, 0x164F8078, 0x1B0CA6A1, 0x1FCDBB16,
  0x018AEB13, 0x054BF6A4, 0x0808D07D, 0x0CC9CDCA, 0x7897AB07,
  0x7C56B6B0, 0x71159069, 0x75D48DDE, 0x6B93DDDB, 0x6F52C06C,
  0x6211E6B5, 0x66D0FB02, 0x5E9F46BF, 0x5A5E5B08, 0x571D7DD1,
  0x53DC6066, 0x4D9B3063, 0x495A2DD4, 0x44190B0D, 0x40D816BA,
  0xACA5C697, 0xA864DB20, 0xA527FDF9, 0xA1E6E04E, 0xBFA1B04B,
  0xBB60ADFC, 0xB6238B25, 0xB2E29692, 0x8AAD2B2F, 0x8E6C3698,
  0x832F1041, 0x87EE0DF6, 0x99A95DF3, 0x9D684044, 0x902B669D,
  0x94EA7B2A, 0xE0B41DE7, 0xE4750050, 0xE9362689, 0xEDF73B3E,
  0xF3B06B3B, 0xF771768C, 0xFA325055, 0xFEF34DE2, 0xC6BCF05F,
  0xC27DEDE8, 0xCF3ECB31, 0xCBFFD686, 0xD5B88683, 0xD1799B34,
  0xDC3ABDED, 0xD8FBA05A, 0x690CE0EE, 0x6DCDFD59, 0x608EDB80,
  0x644FC637, 0x7A089632, 0x7EC98B85, 0x738AAD5C, 0x774BB0EB,
  0x4F040D56, 0x4BC510E1, 0x46863638, 0x42472B8F, 0x5C007B8A,
  0x58C1663D, 0x558240E4, 0x51435D53, 0x251D3B9E, 0x21DC2629,
  0x2C9F00F0, 0x285E1D47, 0x36194D42, 0x32D850F5, 0x3F9B762C,
  0x3B5A6B9B, 0x0315D626, 0x07D4CB91, 0x0A97ED48, 0x0E56F0FF,
  0x1011A0FA, 0x14D0BD4D, 0x19939B94, 0x1D528623, 0xF12F560E,
  0xF5EE4BB9, 0xF8AD6D60, 0xFC6C70D7, 0xE22B20D2, 0xE6EA3D65,
  0xEBA91BBC, 0xEF68060B, 0xD727BBB6, 0xD3E6A601, 0xDEA580D8,
  0xDA649D6F, 0xC423CD6A, 0xC0E2D0DD, 0xCDA1F604, 0xC960EBB3,
  0xBD3E8D7E, 0xB9FF90C9, 0xB4BCB610, 0xB07DABA7, 0xAE3AFBA2,
  0xAAFBE615, 0xA7B8C0CC, 0xA379DD7B, 0x9B3660C6, 0x9FF77D71,
  0x92B45BA8, 0x9675461F, 0x8832161A, 0x8CF30BAD, 0x81B02D74,
  0x857130C3, 0x5D8A9099, 0x594B8D2E, 0x5408ABF7, 0x50C9B640,
  0x4E8EE645, 0x4A4FFBF2, 0x470CDD2B, 0x43CDC09C, 0x7B827D21,
  0x7F436096, 0x7200464F, 0x76C15BF8, 0x68860BFD, 0x6C47164A,
  0x61043093, 0x65C52D24, 0x119B4BE9, 0x155A565E, 0x18197087,
  0x1CD86D30, 0x029F3D35, 0x065E2082, 0x0B1D065B, 0x0FDC1BEC,
  0x3793A651, 0x3352BBE6, 0x3E119D3F, 0x3AD08088, 0x2497D08D,
  0x2056CD3A, 0x2D15EBE3, 0x29D4F654, 0xC5A92679, 0xC1683BCE,
  0xCC2B1D17, 0xC8EA00A0, 0xD6AD50A5, 0xD26C4D12, 0xDF2F6BCB,
  0xDBEE767C, 0xE3A1CBC1, 0xE760D676, 0xEA23F0AF, 0xEEE2ED18,
  0xF0A5BD1D, 0xF464A0AA, 0xF9278673, 0xFDE69BC4, 0x89B8FD09,
  0x8D79E0BE, 0x803AC667, 0x84FBDBD0, 0x9ABC8BD5, 0x9E7D9662,
  0x933EB0BB, 0x97FFAD0C, 0xAFB010B1, 0xAB710D06, 0xA6322BDF,
  0xA2F33668, 0xBCB4666D, 0xB8757BDA, 0xB5365D03, 0xB1F740B4,
] as const;

// TODO_AUDIT.md 145th pass: confirmed dead code — CRC is computed during
// CWvsPhysicalSpace2D::Load (0xA18AA0) as a rolling hash of physics
// constants + map geometry in the OG binary, but the final stored value
// at m_dwCRC (offset 0xC4) is NEVER READ by any code path outside Load.
// CField::GetCrc (0x9033A0) also has zero xrefs. This is leftover
// infrastructure from a server CRC-verification scheme that v95's client
// no longer consumes. Keep as reference; no callers to wire.

const PhysicsKeys = [
  "walkForce", "walkSpeed", "walkDrag", "slipForce", "slipSpeed", "floatDrag1",
  "floatCoefficient", "swimForce", "swimSpeed", "flyForce", "flySpeed", "gravityAcc",
  "fallSpeed", "jumpSpeed", "maxFriction", "minFriction", "swimSpeedDec", "flyJumpDec",
] as const;

function step(r: number, b: number): number {
  const x = (r >>> 24) & 0xFF;
  return Table[((b ^ x) & 0xFF) >>> 0] ^ (r << 8);
}

function crcInt(data: number, init: number): number {
  let r = init >>> 0;
  data = data | 0;
  r = step(r, data);
  r = step(r, data >> 8);
  r = step(r, data >> 16);
  r = step(r, data >> 24);
  return r | 0;
}

function crcByte(data: number, init: number): number {
  return step(init >>> 0, data) | 0;
}

function crcLong(data: bigint, init: number): number {
  let r = init >>> 0;
  for (let s = 0n; s < 64n; s += 8n) {
    r = step(r, Number((data >> s) & 0xFFn));
  }
  return r | 0;
}

function crcStr(s: string, init: number): number {
  let r = init >>> 0;
  for (let i = 0; i < s.length; i++) {
    r = step(r, s.charCodeAt(i) & 0xFF);
  }
  return r | 0;
}

// TODO_AUDIT.md Hundred-and-sixteenth pass: OG GetConstantCRC (0xa12cd0)
// does `*(_QWORD*)buf = (__int64)dWalkForce` (raw 8-byte bit-copy) then
// GetCrc32(buf, 4, ...) — hashing only the low 4 bytes of the IEEE-754 double.
// The previous crcInt(readDouble(...)) did `data | 0` (integer truncation),
// which is wrong for almost every WZ physics constant (e.g. 800.0 =
// 0x4089000000000000; low 4 bytes = 0x00000000; truncated = 800).
const _f64Buf = new Float64Array(1);
const _f64View = new DataView(_f64Buf.buffer);

function doubleToLow32(v: number): number {
  _f64Buf[0] = v;
  return _f64View.getInt32(0, true);
}

function constantCrc(mapWz: WzPackage): number {
  if (_constantCrc !== null) return _constantCrc;
  const physicsItem = mapWz.GetItem("Physics.img") ?? mapWz.GetItem("Map/Physics.img");
  const physics = physicsItem instanceof WzImage ? physicsItem.Root : null;
  let crc = crcInt(GameVersion, 0);
  for (const key of PhysicsKeys) {
    crc = crcInt(doubleToLow32(readDouble(physics, key)), crc);
  }
  _constantCrc = crc;
  return crc;
}

function computeSpace2D(constant: number, mapImg: WzProperty): number {
  let crc = constant;

  const fhRoot = mapImg.Get("foothold");
  if (fhRoot instanceof WzProperty) {
    for (const [, layerVal] of Object.entries(fhRoot.Items)) {
      if (!(layerVal instanceof WzProperty)) continue;
      for (const [, groupVal] of Object.entries(layerVal.Items)) {
        if (!(groupVal instanceof WzProperty)) continue;
        for (const [snKey, fhVal] of Object.entries(groupVal.Items)) {
          if (!(fhVal instanceof WzProperty)) continue;
          crc = crcInt(readInt(fhVal, "x1"), crc);
          crc = crcInt(readInt(fhVal, "y1"), crc);
          crc = crcInt(readInt(fhVal, "x2"), crc);
          crc = crcInt(readInt(fhVal, "y2"), crc);
          crc = crcInt(readInt(fhVal, "drag"), crc);
          crc = crcInt(readInt(fhVal, "force"), crc);
          crc = crcInt(readInt(fhVal, "forbidFallDown"), crc);
          crc = crcInt(readInt(fhVal, "cantThrough"), crc);
          crc = crcInt(readInt(fhVal, "prev"), crc);
          crc = crcInt(readInt(fhVal, "next"), crc);
          crc = crcInt(parseIntKey(snKey), crc);
        }
      }
    }
  }

  const lrRoot = mapImg.Get("ladderRope");
  if (lrRoot instanceof WzProperty) {
    for (const [snKey, lrVal] of orderByIntKey(lrRoot)) {
      if (!(lrVal instanceof WzProperty)) continue;
      crc = crcInt(parseIntKey(snKey), crc);
      crc = crcInt(readInt(lrVal, "l"), crc);
      crc = crcInt(readInt(lrVal, "uf"), crc);
      crc = crcInt(readInt(lrVal, "x"), crc);
      crc = crcInt(readInt(lrVal, "y1"), crc);
      crc = crcInt(readInt(lrVal, "y2"), crc);
      crc = crcInt(readInt(lrVal, "page"), crc);
    }
  }

  return crc;
}

function computePortalList(mapId: number, mapImg: WzProperty): number {
  let crc = crcInt(mapId, 0);
  const pRoot = mapImg.Get("portal");
  if (!(pRoot instanceof WzProperty)) return crc;
  for (const [, pVal] of orderByIntKey(pRoot)) {
    if (!(pVal instanceof WzProperty)) continue;
    crc = crcStr(readStr(pVal, "pn"), crc);
    crc = crcInt(readInt(pVal, "pt"), crc);
    const x = readInt(pVal, "x") >>> 0;
    const y = readInt(pVal, "y") >>> 0;
    const pos = BigInt(x) | (BigInt(y) << 32n);
    crc = crcLong(pos, crc);
    crc = crcInt(readInt(pVal, "hRange", 100), crc);
    crc = crcInt(readInt(pVal, "vRange", 100), crc);
    crc = crcInt(readInt(pVal, "tm"), crc);
    crc = crcStr(readStr(pVal, "tn"), crc);
    crc = crcInt(readInt(pVal, "delay"), crc);
    crc = crcByte(readInt(pVal, "onlyOnce") !== 0 ? 1 : 0, crc);
    crc = crcInt(readInt(pVal, "verticalImpact"), crc);
    crc = crcInt(readInt(pVal, "horizontalImpact"), crc);
  }
  return crc;
}

function orderByIntKey(node: WzProperty): [string, unknown][] {
  const entries = Object.entries(node.Items);
  entries.sort((a, b) => parseIntKey(a[0]) - parseIntKey(b[0]));
  return entries;
}

function readInt(node: WzProperty | null, key: string, def = 0): number {
  if (!node) return def;
  const val = node.Get(key);
  if (typeof val === 'number') return val;
  if (typeof val === 'bigint') return Number(val);
  return def;
}

function readDouble(node: WzProperty | null, key: string): number {
  if (!node) return 0;
  const val = node.Get(key);
  if (typeof val === 'number') return val;
  if (typeof val === 'bigint') return Number(val);
  return 0;
}

function readStr(node: WzProperty | null, key: string): string {
  if (!node) return '';
  const val = node.Get(key);
  return typeof val === 'string' ? val : '';
}

function parseIntKey(s: string): number {
  const v = parseInt(s, 10);
  return isNaN(v) ? 0 : v;
}

export function compute(mapId: number, mapImg: WzProperty, mapWz: WzPackage): number {
  let crc = computeSpace2D(constantCrc(mapWz), mapImg) ^ computePortalList(mapId, mapImg);

  const info = mapImg.Get("info");
  if (info instanceof WzProperty) {
    crc = crcInt(readInt(info, "town") !== 0 ? 1 : 0, crc);
    crc = crcInt(readInt(info, "swim") !== 0 ? 1 : 0, crc);
    crc = crcInt(readInt(info, "fly") !== 0 ? 1 : 0, crc);
    crc = crcInt(readInt(info, "personalShop") !== 0 ? 1 : 0, crc);
    crc = crcInt(readInt(info, "phase"), crc);
  }
  return crc;
}
