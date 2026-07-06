import type { WzPackage } from '../wz/WzPackage.js';
import { WzProperty } from '../wz/WzProperty.js';
import { WzCanvas } from '../wz/WzCanvas.js';
import { WzImage } from '../wz/WzImage.js';

export class SkillInfo {
  MaxLevel = 1;
  Passive = false;
  Icon: WzCanvas | null = null;
  MpCon: number[] = [];
  Cooltime: number[] = [];
  BuffTime: number[] = [];

  MpConAt(level: number): number    { return SkillInfo._at(this.MpCon, level); }
  CooltimeAt(level: number): number { return SkillInfo._at(this.Cooltime, level); }
  BuffTimeAt(level: number): number { return SkillInfo._at(this.BuffTime, level); }

  private static _at(a: number[], level: number): number {
    return level >= 1 && level <= a.length ? a[level - 1] : 0;
  }
}

export class SkillCastInfo {
  Actions: string[] = [];
  Effect: unknown = null;
  Effect0: unknown = null;
  Screen: unknown = null;
  Hit: unknown = null;
  KeyDown: unknown = null;
  Ball: unknown = null;
}

export class SkillInfoService {
  private readonly _skillWz: () => WzPackage | null;
  private readonly _cache = new Map<number, SkillInfo | null>();
  private readonly _idsByRoot = new Map<number, number[]>();
  private readonly _bookIcons = new Map<number, WzCanvas | null>();
  private readonly _castCache = new Map<number, SkillCastInfo | null>();

  constructor(skillWz: () => WzPackage | null) {
    this._skillWz = skillWz;
  }

  Get(skillId: number): SkillInfo | null {
    const cached = this._cache.get(skillId);
    if (cached !== undefined) return cached;
    let info: SkillInfo | null = null;
    try {
      info = this._load(skillId);
    } catch (ex) {
      console.debug(`SkillInfo load failed for ${skillId}`, ex);
    }
    this._cache.set(skillId, info);
    return info;
  }

  EnumerateSkillIds(root: number): number[] {
    const cached = this._idsByRoot.get(root);
    if (cached) return cached;
    const wz = this._skillWz();
    if (!wz) return [];

    try {
      const jobNode = SkillInfoService._jobItem(wz, root, 'skill');
      if (!(jobNode instanceof WzProperty)) return [];
      const ids: number[] = [];
      for (const [key, value] of Object.entries(jobNode.Items)) {
        const id = parseInt(key);
        if (isNaN(id)) continue;
        if (value instanceof WzProperty && SkillInfoService._readInt(value.Get('invisible')) !== 0) continue;
        ids.push(id);
      }
      ids.sort((a, b) => a - b);
      this._idsByRoot.set(root, ids);
      return ids;
    } catch (ex) {
      console.debug(`EnumerateSkillIds failed for root ${root}`, ex);
      return [];
    }
  }

  GetBookIcon(root: number): WzCanvas | null {
    const cached = this._bookIcons.get(root);
    if (cached !== undefined) return cached;
    const wz = this._skillWz();
    if (!wz) return null;

    let icon: WzCanvas | null = null;
    try {
      const item = SkillInfoService._jobItem(wz, root, 'info/icon');
      if (item instanceof WzCanvas) icon = item;
    } catch (ex) {
      console.debug(`GetBookIcon failed for root ${root}`, ex);
    }
    this._bookIcons.set(root, icon);
    return icon;
  }

  GetCastInfo(skillId: number): SkillCastInfo | null {
    const cached = this._castCache.get(skillId);
    if (cached !== undefined) return cached;
    const wz = this._skillWz();
    if (!wz) return null;

    let info: SkillCastInfo | null = null;
    try {
      const node = SkillInfoService._skillNode(wz, skillId);
      if (node) {
        info = new SkillCastInfo();
        info.Actions = SkillInfoService._readActions(node.Get('action') as WzProperty | null);
        info.Effect  = node.Get('effect');
        info.Effect0 = node.Get('effect0');
        info.Screen  = node.Get('screen');
        info.Hit     = node.Get('hit');
        info.KeyDown = node.Get('keyDown');
        info.Ball    = node.Get('ball');
      }
    } catch (ex) {
      console.debug(`GetCastInfo failed for ${skillId}`, ex);
    }
    this._castCache.set(skillId, info);
    return info;
  }

  private static _readActions(action: WzProperty | null): string[] {
    if (!action) return [];
    const list: string[] = [];
    for (const [, v] of Object.entries(action.Items)) {
      if (typeof v === 'string' && v.length > 0) list.push(v);
    }
    return list;
  }

  private _load(skillId: number): SkillInfo | null {
    const wz = this._skillWz();
    if (!wz) return null;
    const node = SkillInfoService._skillNode(wz, skillId);
    if (!(node instanceof WzProperty)) return null;

    const info = new SkillInfo();
    info.Passive = SkillInfoService._readInt(node.Get('psd')) !== 0;
    const icon = node.Get('icon');
    if (icon instanceof WzCanvas) info.Icon = icon;

    const levels = node.Get('level');
    if (levels instanceof WzProperty) {
      const n = Object.keys(levels.Items).length;
      info.MaxLevel = Math.max(1, n);
      const mp: number[] = [];
      const cd: number[] = [];
      const bt: number[] = [];
      for (let lv = 1; lv <= n; lv++) {
        const lp = levels.Get(lv.toString());
        if (!(lp instanceof WzProperty)) continue;
        mp.push(SkillInfoService._readInt(lp.Get('mpCon')));
        cd.push(SkillInfoService._readInt(lp.Get('cooltime')));
        bt.push(SkillInfoService._readInt(lp.Get('time')));
      }
      info.MpCon = mp;
      info.Cooltime = cd;
      info.BuffTime = bt;
    } else {
      const common = node.Get('common');
      if (common instanceof WzProperty) {
        info.MaxLevel = Math.max(1, SkillInfoService._readInt(common.Get('maxLevel')));
      }
    }

    return info;
  }

  private static _d3(n: number): string { return n.toString().padStart(3, '0'); }
  private static _d7(n: number): string { return n.toString().padStart(7, '0'); }

  private static _jobItem(wz: WzPackage, job: number, tail: string): unknown {
    return wz.GetItem(`${SkillInfoService._d3(job)}.img/${tail}`)
      ?? wz.GetItem(`${job}.img/${tail}`);
  }

  private static _skillNode(wz: WzPackage, skillId: number): WzProperty | null {
    const job = Math.floor(skillId / 10000);
    const item = wz.GetItem(`${SkillInfoService._d3(job)}.img/skill/${SkillInfoService._d7(skillId)}`)
      ?? wz.GetItem(`${job}.img/skill/${skillId}`);
    return item instanceof WzProperty ? item : null;
  }

  private static _readInt(v: unknown): number {
    if (typeof v === 'number') return v;
    if (typeof v === 'bigint') return Number(v);
    if (typeof v === 'string') {
      const n = parseInt(v);
      return isNaN(n) ? 0 : n;
    }
    return 0;
  }
}
