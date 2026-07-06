import type { WzProperty } from '../wz/WzProperty.js';

export class ObjInfo {
  Os = '';
  L0 = '';
  L1 = '';
  L2 = '';
  X = 0;
  Y = 0;
  Z = 0;
  Flip = false;

  static From(entry: WzProperty): ObjInfo {
    const o: ObjInfo = {
      Os: (entry.Get('oS') as string) ?? '',
      L0: (entry.Get('l0') as string) ?? '',
      L1: (entry.Get('l1') as string) ?? '',
      L2: (entry.Get('l2') as string) ?? '',
      X: ObjInfo._readInt(entry, 'x'),
      Y: ObjInfo._readInt(entry, 'y'),
      Z: ObjInfo._readInt(entry, 'z'),
      Flip: ObjInfo._readInt(entry, 'f') !== 0,
    };
    return o;
  }

  private static _readInt(p: WzProperty, key: string): number {
    const v = p.Get(key);
    if (typeof v === 'number') return v;
    if (typeof v === 'bigint') return Number(v);
    return 0;
  }
}
