import { BackType } from './BackType.js';
import type { WzProperty } from '../wz/WzProperty.js';

export class BackInfo {
  Bs = '';
  No = 0;
  X = 0;
  Y = 0;
  Rx = 0;
  Ry = 0;
  Cx = 0;
  Cy = 0;
  Type: BackType = BackType.Normal;
  Front = false;
  Animated = false;
  Alpha = 255;
  Flip = false;

  static From(entry: WzProperty): BackInfo {
    return {
      Bs: (entry.Get('bS') as string) ?? '',
      No: BackInfo._readInt(entry, 'no'),
      X: BackInfo._readInt(entry, 'x'),
      Y: BackInfo._readInt(entry, 'y'),
      Rx: BackInfo._readInt(entry, 'rx'),
      Ry: BackInfo._readInt(entry, 'ry'),
      Cx: BackInfo._readInt(entry, 'cx'),
      Cy: BackInfo._readInt(entry, 'cy'),
      Type: BackInfo._readInt(entry, 'type') as BackType,
      Front: BackInfo._readInt(entry, 'front') !== 0,
      Animated: BackInfo._readInt(entry, 'ani') !== 0,
      Alpha: Math.max(0, Math.min(255, BackInfo._readInt(entry, 'a', 255))),
      Flip: BackInfo._readInt(entry, 'f') !== 0,
    };
  }

  private static _readInt(p: WzProperty, key: string, fallback = 0): number {
    const v = p.Get(key);
    if (typeof v === 'number') return v;
    if (typeof v === 'bigint') return Number(v);
    return fallback;
  }
}
