import type { WzPackage } from '../wz/WzPackage.js';
import { WzProperty } from '../wz/WzProperty.js';
import { WzCanvas } from '../wz/WzCanvas.js';
import { WzImage } from '../wz/WzImage.js';

export class SkillInfo {
  // --- Core fields ---
  MaxLevel = 1;
  Passive = false;
  Icon: WzCanvas | null = null;
  MpCon: number[] = [];
  Cooltime: number[] = [];
  BuffTime: number[] = [];

  // --- Metadata (from LoadSkill) ---
  Name = '';
  Description = '';
  SkillType = 0;
  Weapon = 0;
  SubWeapon = 0;
  Invisible = false;
  UpButtonDisabled = false;
  DefaultMasterLev = 0;
  CombatOrders = false;
  TimeLimited = 0;
  MobCode = 0;
  PsdSkill = 0;
  AttackElemAttr = 0;
  ContinuousEffect = false;
  DelayFrame = -1;
  HoldFrame = -1;
  SpecialAction = 0;
  PrepareAction = -1;
  PrepareTime = 0;
  SkillLVData = false;

  // --- UOL paths (effect animations) ---
  EffectUOL = '';
  ScreenEffectUOL = '';
  AffectedUOL = '';
  SpecialAffectedUOL = '';
  PrepareUOL = '';
  KeyDownUOL = '';
  KeyDownEndUOL = '';
  HitRootUOL = '';
  BallUOL = '';
  FlipBallUOL = '';
  MobUOL = '';
  TileUOL = '';
  AfterimageUOL = '';
  SpecialUOL = '';
  SummonedUOL = '';
  FinishUOL = '';
  HitUOLs: string[] = [];
  ActionCodes: number[] = [];

  // --- Passive skill offsets (per-level stat bonuses) ---
  PsdOffsets: Map<number, AdditionPsdData> = new Map();

  // --- Level data ---
  Common: SkillLevelDataCommon | null = null;

  // --- Canvas icons ---
  Icon0: WzCanvas | null = null;   // apCanvas[0]
  Icon1: WzCanvas | null = null;   // apCanvas[1]
  Icon2: WzCanvas | null = null;   // apCanvas[2]

  MpConAt(level: number): number    { return SkillInfo._at(this.MpCon, level); }
  CooltimeAt(level: number): number { return SkillInfo._at(this.Cooltime, level); }
  BuffTimeAt(level: number): number { return SkillInfo._at(this.BuffTime, level); }

  private static _at(a: number[], level: number): number {
    return level >= 1 && level <= a.length ? a[level - 1] : 0;
  }
}

export class AdditionPsdData {
  nWeapon = 0;
  nAttack = 0;
  nMagicAttack = 0;
  nDef = 0;
  nHP = 0;
  nMP = 0;
  nProp = 0;
}

export class SkillLevelDataCommon {
  SkillType = 0;
  Weapon = 0;
  SubWeapon = 0;
  Attack = 0;
  MagicAttack = 0;
  Def = 0;
  HP = 0;
  MP = 0;
  ACC = 0;
  EVA = 0;
  Speed = 0;
  Jump = 0;
  MpCon = 0;
  HpCon = 0;
  Duration = 0;
  Cooltime = 0;
  X = 0;
  Y = 0;
  AttackCount = 0;
  TargetCount = 0;
  Damage = 0;
  Prop = 0;
  MobCount = 0;
  Summons: number[] = [];
  LTDamage = 0;
  Force = 0;
}

export class MobSkillEntry {
  SkillID = 0;
  Levels: MobSkillLevelData[] = [];
}

export class MobSkillLevelData {
  Level = 0;
  Effect = 0;
  Hp = 0;
  Mp = 0;
  Prop = 0;
  Count = 0;
  Sp = 0;
  Ta = 0;
  Duration = 0;
  Interval = 0;
  X = 0;
  Y = 0;
  BuffTime = 0;
  Damage = 0;
  AttackCount = 0;
  TargetCount = 0;
  MobCount = 0;
  ItemID = 0;
  Summons: number[] = [];
  EffectUOL = '';
  HitUOL = '';
  MobUOL = '';
  AffectedUOL = '';
  TileUOL = '';
}

export class ItemSkillEntry {
  SkillID = 0;
  Levels: ItemSkillLevelData[] = [];
}

export class ItemSkillLevelData {
  ConMP = 0;
  Duration = 0;
  Interval = 0;
  Prop = 0;
  X = 0;
  Y = 0;
  MobUOL = '';
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
  private readonly _mobSkillCache = new Map<number, MobSkillEntry | null>();
  private readonly _itemSkillCache = new Map<number, ItemSkillEntry | null>();

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

  GetMobSkill(mobSkillId: number): MobSkillEntry | null {
    const cached = this._mobSkillCache.get(mobSkillId);
    if (cached !== undefined) return cached;

    const wz = this._skillWz();
    if (!wz) { this._mobSkillCache.set(mobSkillId, null); return null; }

    let entry: MobSkillEntry | null = null;
    try {
      entry = this._loadMobSkill(wz, mobSkillId);
    } catch (ex) {
      console.debug(`GetMobSkill load failed for ${mobSkillId}`, ex);
    }
    this._mobSkillCache.set(mobSkillId, entry);
    return entry;
  }

  GetItemSkill(itemSkillId: number): ItemSkillEntry | null {
    const cached = this._itemSkillCache.get(itemSkillId);
    if (cached !== undefined) return cached;

    const wz = this._skillWz();
    if (!wz) { this._itemSkillCache.set(itemSkillId, null); return null; }

    let entry: ItemSkillEntry | null = null;
    try {
      entry = this._loadItemSkill(wz, itemSkillId);
    } catch (ex) {
      console.debug(`GetItemSkill load failed for ${itemSkillId}`, ex);
    }
    this._itemSkillCache.set(itemSkillId, entry);
    return entry;
  }

  private static _readActions(action: WzProperty | null): string[] {
    if (!action) return [];
    const list: string[] = [];
    for (const [, v] of Object.entries(action.Items)) {
      if (typeof v === 'string' && v.length > 0) list.push(v);
    }
    return list;
  }

  // -------------------------------------------------------------------------
  // Main skill loader — mirrors CSkillInfo::LoadSkill (0x706680)
  // -------------------------------------------------------------------------
  private _load(skillId: number): SkillInfo | null {
    const wz = this._skillWz();
    if (!wz) return null;
    const node = SkillInfoService._skillNode(wz, skillId);
    if (!(node instanceof WzProperty)) return null;

    const info = new SkillInfo();
    info.Passive = SkillInfoService._readInt(node.Get('psd')) !== 0;
    const icon = node.Get('icon');
    if (icon instanceof WzCanvas) info.Icon = icon;

    // --- Name + description (via labeled_string pattern) ---
    info.Name = SkillInfoService._readStr(node.Get('name'));
    info.Description = SkillInfoService._readStr(node.Get('desc'));

    // --- Scalar fields (StringPool IDs in OG, direct WZ names here) ---
    info.SkillType = SkillInfoService._readInt(node.Get('skillType'));
    info.PsdSkill = SkillInfoService._readInt(node.Get('psdSkill'));
    info.Weapon = SkillInfoService._readInt(node.Get('weapon'));
    info.SubWeapon = SkillInfoService._readInt(node.Get('subWeapon'));
    info.Invisible = SkillInfoService._readInt(node.Get('invisible')) !== 0;
    info.UpButtonDisabled = SkillInfoService._readInt(node.Get('upButtonDisabled')) !== 0;
    info.DefaultMasterLev = SkillInfoService._readInt(node.Get('defaultMasterLev'));
    info.CombatOrders = SkillInfoService._readInt(node.Get('combatOrders')) !== 0;
    info.TimeLimited = SkillInfoService._readInt(node.Get('timeLimited'));
    info.MobCode = SkillInfoService._readInt(node.Get('mobCode'));
    info.ContinuousEffect = SkillInfoService._readInt(node.Get('continuous')) !== 0;

    // --- Passive skill offsets (psdSkill sub-tree) ---
    if (info.PsdSkill) {
      const psdNode = node.Get('psdSkill');
      if (psdNode instanceof WzProperty) {
        this._loadPsdOffsets(psdNode, info);
      }
    }

    // --- Action array (action name → code) ---
    const actionNode = node.Get('action');
    if (actionNode instanceof WzProperty) {
      info.ActionCodes = SkillInfoService._readActionCodes(actionNode);
    }

    // --- Special action ---
    const specialActionNode = node.Get('specialAction');
    if (specialActionNode instanceof WzProperty) {
      const first = specialActionNode.Get('0');
      if (typeof first === 'string') {
        info.SpecialAction = SkillInfoService._actionCodeFromName(first);
      }
    }

    // --- Delay/hold ---
    const delayNode = node.Get('delay');
    if (delayNode instanceof WzProperty) {
      info.DelayFrame = SkillInfoService._readInt(delayNode.Get('delay'));
      info.HoldFrame = SkillInfoService._readInt(delayNode.Get('hold'));
    }

    // --- Attack element attribute ---
    info.AttackElemAttr = SkillInfoService._readElementAttr(node.Get('elemAttr'));

    // --- UOL strings (effect animation paths) ---
    info.EffectUOL = SkillInfoService._readStr(node.Get('effect'));
    info.ScreenEffectUOL = SkillInfoService._readStr(node.Get('screen'));
    info.AffectedUOL = SkillInfoService._readStr(node.Get('affected'));
    info.SpecialAffectedUOL = SkillInfoService._readStr(node.Get('specialAffected'));
    info.KeyDownUOL = SkillInfoService._readStr(node.Get('keyDown'));
    info.KeyDownEndUOL = SkillInfoService._readStr(node.Get('keyDownEnd'));
    info.MobUOL = SkillInfoService._readStr(node.Get('mob'));
    info.TileUOL = SkillInfoService._readStr(node.Get('tile'));
    info.AfterimageUOL = SkillInfoService._readStr(node.Get('afterimage'));
    info.SpecialUOL = SkillInfoService._readStr(node.Get('special'));
    info.SummonedUOL = SkillInfoService._readStr(node.Get('summoned'));
    info.FinishUOL = SkillInfoService._readStr(node.Get('finish'));

    // --- Ball UOL ---
    const ballNode = node.Get('ball');
    if (ballNode instanceof WzProperty) {
      info.BallUOL = SkillInfoService._readStr(ballNode.Get('0'));
      info.BallUOL = SkillInfoService._readStr(ballNode); // root ball UOL
    }

    // --- Flip ball UOL ---
    const flipBallNode = node.Get('flipBall');
    if (flipBallNode instanceof WzProperty) {
      info.FlipBallUOL = SkillInfoService._readStr(flipBallNode);
    }

    // --- Hit UOLs ---
    const hitNode = node.Get('hit');
    if (hitNode instanceof WzProperty) {
      info.HitRootUOL = SkillInfoService._readStr(hitNode);
      const count = SkillInfoService._countProps(hitNode);
      for (let i = 0; i < count; i++) {
        const hitItem = hitNode.Get(i.toString());
        if (hitItem) info.HitUOLs.push(SkillInfoService._readStr(hitItem));
      }
    }

    // --- Canvas icons (apCanvas[0..2]) ---
    const icon0 = node.Get('icon');
    if (icon0 instanceof WzCanvas) info.Icon0 = icon0;
    const icon1 = node.Get('icon1');
    if (icon1 instanceof WzCanvas) info.Icon1 = icon1;
    const icon2 = node.Get('icon2');
    if (icon2 instanceof WzCanvas) info.Icon2 = icon2;

    // --- Prepare UOL (from psdSkill.prepare) ---
    if (info.PsdSkill) {
      const psdNode = node.Get('psdSkill');
      if (psdNode instanceof WzProperty) {
        info.PrepareUOL = SkillInfoService._readStr(psdNode.Get('prepare'));
        info.PrepareAction = SkillInfoService._actionCodeFromName(
          SkillInfoService._readStr(psdNode.Get('action'))
        );
        info.PrepareTime = SkillInfoService._readInt(psdNode.Get('time'));
      }
    }

    // --- Level data (common per-level stats) ---
    const commonNode = node.Get('common');
    if (commonNode instanceof WzProperty) {
      info.MaxLevel = Math.max(1, SkillInfoService._readInt(commonNode.Get('maxLevel')));
      info.Common = this._loadLevelDataCommon(commonNode);
    }

    // --- Level-specific data (mp, cooltime, buff time) ---
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
    }

    // --- SkillLVData flag ---
    const charLevelNode = node.Get('charLevelData');
    if (charLevelNode instanceof WzProperty) {
      info.SkillLVData = SkillInfoService._readInt(charLevelNode.Get('skillLVData')) !== 0;
    }

    return info;
  }

  // -------------------------------------------------------------------------
  // Passive skill offsets — mirrors psdSkill iteration in LoadSkill
  // -------------------------------------------------------------------------
  private _loadPsdOffsets(psdNode: WzProperty, info: SkillInfo): void {
    for (const [key] of Object.entries(psdNode.Items)) {
      const skillId = parseInt(key);
      if (isNaN(skillId)) continue;
      const subNode = psdNode.Get(key);
      if (!(subNode instanceof WzProperty)) continue;

      const psd = new AdditionPsdData();
      psd.nWeapon = SkillInfoService._readInt(subNode.Get('weapon'));
      psd.nAttack = SkillInfoService._readInt(subNode.Get('attack'));
      psd.nMagicAttack = SkillInfoService._readInt(subNode.Get('magicAttack'));
      psd.nDef = SkillInfoService._readInt(subNode.Get('def'));
      psd.nHP = SkillInfoService._readInt(subNode.Get('hp'));
      psd.nMP = SkillInfoService._readInt(subNode.Get('mp'));
      psd.nProp = SkillInfoService._readInt(subNode.Get('prop'));
      info.PsdOffsets.set(skillId, psd);
    }
  }

  // -------------------------------------------------------------------------
  // Level data common — mirrors LoadLevelDataCommon
  // -------------------------------------------------------------------------
  private _loadLevelDataCommon(commonNode: WzProperty): SkillLevelDataCommon {
    const c = new SkillLevelDataCommon();
    c.SkillType = SkillInfoService._readInt(commonNode.Get('skillType'));
    c.Weapon = SkillInfoService._readInt(commonNode.Get('weapon'));
    c.SubWeapon = SkillInfoService._readInt(commonNode.Get('subWeapon'));
    c.Attack = SkillInfoService._readInt(commonNode.Get('attack'));
    c.MagicAttack = SkillInfoService._readInt(commonNode.Get('magicAttack'));
    c.Def = SkillInfoService._readInt(commonNode.Get('def'));
    c.HP = SkillInfoService._readInt(commonNode.Get('hp'));
    c.MP = SkillInfoService._readInt(commonNode.Get('mp'));
    c.ACC = SkillInfoService._readInt(commonNode.Get('acc'));
    c.EVA = SkillInfoService._readInt(commonNode.Get('eva'));
    c.Speed = SkillInfoService._readInt(commonNode.Get('speed'));
    c.Jump = SkillInfoService._readInt(commonNode.Get('jump'));
    c.MpCon = SkillInfoService._readInt(commonNode.Get('mpCon'));
    c.HpCon = SkillInfoService._readInt(commonNode.Get('hpCon'));
    c.Duration = SkillInfoService._readInt(commonNode.Get('duration'));
    c.Cooltime = SkillInfoService._readInt(commonNode.Get('cooltime'));
    c.X = SkillInfoService._readInt(commonNode.Get('x'));
    c.Y = SkillInfoService._readInt(commonNode.Get('y'));
    c.AttackCount = SkillInfoService._readInt(commonNode.Get('attackCount'));
    c.TargetCount = SkillInfoService._readInt(commonNode.Get('targetCount'));
    c.Damage = SkillInfoService._readInt(commonNode.Get('damage'));
    c.Prop = SkillInfoService._readInt(commonNode.Get('prop'));
    c.MobCount = SkillInfoService._readInt(commonNode.Get('mobCount'));
    c.Summons = SkillInfoService._readIntArray(commonNode.Get('summons'));
    c.LTDamage = SkillInfoService._readInt(commonNode.Get('ltDamage'));
    c.Force = SkillInfoService._readInt(commonNode.Get('force'));
    return c;
  }

  // -------------------------------------------------------------------------
  // Mob skill loader — mirrors CSkillInfo::LoadMobSkill
  // -------------------------------------------------------------------------
  private _loadMobSkill(wz: WzPackage, mobSkillId: number): MobSkillEntry | null {
    // Mob skills are in Skill.wz/MobSkill.img/<id>/skill/<level>
    const mobSkillNode = SkillInfoService._getWzNode(wz, `MobSkill.img/${mobSkillId}`);
    if (!mobSkillNode) return null;

    const entry = new MobSkillEntry();
    entry.SkillID = mobSkillId;

    // Enumerate level children
    for (const [levelKey] of Object.entries(mobSkillNode.Items)) {
      const level = parseInt(levelKey);
      if (isNaN(level)) continue;
      const levelNode = mobSkillNode.Get(levelKey);
      if (!(levelNode instanceof WzProperty)) continue;

      const ld = new MobSkillLevelData();
      ld.Level = level;
      ld.Effect = SkillInfoService._readInt(levelNode.Get('effect'));
      ld.Hp = SkillInfoService._readInt(levelNode.Get('hp'));
      ld.Mp = SkillInfoService._readInt(levelNode.Get('mp'));
      ld.Prop = SkillInfoService._readInt(levelNode.Get('prop'));
      ld.Count = SkillInfoService._readInt(levelNode.Get('count'));
      ld.Sp = SkillInfoService._readInt(levelNode.Get('sp'));
      ld.Ta = SkillInfoService._readInt(levelNode.Get('ta'));
      ld.Duration = SkillInfoService._readInt(levelNode.Get('duration'));
      ld.Interval = SkillInfoService._readInt(levelNode.Get('interval'));
      ld.X = SkillInfoService._readInt(levelNode.Get('x'));
      ld.Y = SkillInfoService._readInt(levelNode.Get('y'));
      ld.BuffTime = SkillInfoService._readInt(levelNode.Get('buffTime'));
      ld.Damage = SkillInfoService._readInt(levelNode.Get('damage'));
      ld.AttackCount = SkillInfoService._readInt(levelNode.Get('attackCount'));
      ld.TargetCount = SkillInfoService._readInt(levelNode.Get('targetCount'));
      ld.MobCount = SkillInfoService._readInt(levelNode.Get('mobCount'));
      ld.ItemID = SkillInfoService._readInt(levelNode.Get('itemID'));
      ld.Summons = SkillInfoService._readIntArray(levelNode.Get('summons'));
      ld.EffectUOL = SkillInfoService._readStr(levelNode.Get('effect'));
      ld.HitUOL = SkillInfoService._readStr(levelNode.Get('hit'));
      ld.MobUOL = SkillInfoService._readStr(levelNode.Get('mob'));
      ld.AffectedUOL = SkillInfoService._readStr(levelNode.Get('affected'));
      ld.TileUOL = SkillInfoService._readStr(levelNode.Get('tile'));
      entry.Levels.push(ld);
    }

    entry.Levels.sort((a, b) => a.Level - b.Level);
    return entry;
  }

  // -------------------------------------------------------------------------
  // Item skill loader — mirrors CSkillInfo::LoadItemSkill
  // -------------------------------------------------------------------------
  private _loadItemSkill(wz: WzPackage, itemSkillId: number): ItemSkillEntry | null {
    // Item skills are in Skill.wz/ItemSkill.img/<id>/level/<level>
    const itemSkillNode = SkillInfoService._getWzNode(wz, `ItemSkill.img/${itemSkillId}`);
    if (!itemSkillNode) return null;

    const entry = new ItemSkillEntry();
    entry.SkillID = itemSkillId;

    for (const [levelKey] of Object.entries(itemSkillNode.Items)) {
      const level = parseInt(levelKey);
      if (isNaN(level)) continue;
      const levelNode = itemSkillNode.Get(levelKey);
      if (!(levelNode instanceof WzProperty)) continue;

      const ld = new ItemSkillLevelData();
      ld.ConMP = SkillInfoService._readInt(levelNode.Get('conMP'));
      ld.Duration = 1000 * SkillInfoService._readInt(levelNode.Get('time'));
      ld.Interval = 1000 * SkillInfoService._readInt(levelNode.Get('interval'));
      ld.Prop = SkillInfoService._readInt(levelNode.Get('prop'));
      ld.X = SkillInfoService._readInt(levelNode.Get('x'));
      ld.Y = SkillInfoService._readInt(levelNode.Get('y'));

      // Mob UOL path: "Skill/ItemSkill.img/{id}/level/{level}/mob"
      const mobNode = levelNode.Get('mob');
      if (mobNode) {
        ld.MobUOL = `Skill/ItemSkill.img/${itemSkillId}/level/${level}/mob`;
      }

      entry.Levels.push(ld);
    }

    entry.Levels.sort((a, b) => a.ConMP - b.ConMP);
    return entry;
  }

  // -------------------------------------------------------------------------
  // GetSkillLevel — mirrors CSkillInfo::GetSkillLevel with morph switch
  // -------------------------------------------------------------------------
  GetSkillLevel(skillId: number, morph?: number): number {
    // Special-case skill IDs that depend on morph value
    if (SkillInfoService._isMorphSkill(skillId)) {
      switch (morph) {
        case 0x41: return 2;
        case 0x42: return 3;
        case 0x43: return 4;
        default: return 1;
      }
    }
    return 0;
  }

  private static _isMorphSkill(skillId: number): boolean {
    // From GetSkillLevel: special IDs handled by morph switch
    // 1066, 1067, 20001066, 20001067, 20011066, 20011067, 30001066, 30001067
    return skillId === 1066 || skillId === 1067
      || skillId === 20001066 || skillId === 20001067
      || skillId === 20011066 || skillId === 20011067
      || skillId === 30001066 || skillId === 30001067;
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------
  private static _actionCodeFromName(name: string): number {
    // Maps action name strings to numeric codes used by the animation system.
    // OG uses get_action_code_from_name; codes are sequential 0-N.
    const ACTION_NAMES = [
      'swingO1','swingO2','swingO3','swingOF','swingT1','swingT2','swingT3','swingTF',
      'stabO1','stabO2','stabOF','stabT1','stabT2','stabTF','swingP1','swingP2',
      'stabO3','stabB1','stabB2','swingB1','swingB2','swingB3','swingB4',
      'swingS1','swingS2','swingS3','swingS4','swingS5','swingS6','swingS7','swingS8',
      'swingC1','swingC2','stabS1','stabS2','stabS3','stabS4','stabS5','stabS6','stabS7','stabS8',
      'swingW1','swingW2','swingW3','swingW4',
      'swingWH1','swingWH2','swingWH3','swingWH4','swingWH5','swingWH6','swingWH7','swingWH8',
      'stabD1','stabD2','swingD1','swingD2','swingD3','swingD4',
      'swingJ1','swingJ2','swingJ3','swingJ4','swingL1','swingL2','swingR1','swingR2',
      'swingF1','swingF2','swingF3','swingF4','stabJ1','stabJ2','stabJ3','stabJ4',
      'swingP3','swingT4','swingT5','swingT6','swingC3','swingC4','swingC5','swingC6','swingC7','swingC8',
      'stabC1','stabC2','stabC3','swingR3','swingR4','swingL3','swingL4',
      'swingB5','swingB6','swingB7','swingB8','swingB9','swingB10','swingB11','swingB12',
      'swingO4','swingO5','swingO6','swingO7','swingO8','swingT7','swingT8',
      'swingJ5','swingJ6','swingJ7','swingJ8','stabJ5','stabJ6','stabJ7','stabJ8',
    ];
    const idx = ACTION_NAMES.indexOf(name);
    return idx >= 0 ? idx : 0;
  }

  private static _readActionCodes(actionNode: WzProperty): number[] {
    const codes: number[] = [];
    for (const [, v] of Object.entries(actionNode.Items)) {
      if (typeof v === 'string') {
        const code = SkillInfoService._actionCodeFromName(v);
        if (code >= 0) codes.push(code);
      }
    }
    return codes;
  }

  private static _readElementAttr(v: unknown): number {
    if (typeof v === 'string') {
      const map: Record<string, number> = {
        'fire': 1, 'ice': 2, 'light': 3, 'poison': 4,
        'holy': 5, 'darkness': 6, 'none': 0,
      };
      return map[v.toLowerCase()] ?? 0;
    }
    return SkillInfoService._readInt(v);
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

  private static _getWzNode(wz: WzPackage, path: string): WzProperty | null {
    const item = wz.GetItem(path);
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

  private static _readStr(v: unknown): string {
    if (typeof v === 'string') return v;
    return '';
  }

  private static _readIntArray(v: unknown): number[] {
    if (!(v instanceof WzProperty)) return [];
    const arr: number[] = [];
    for (const [, val] of Object.entries(v.Items)) {
      arr.push(SkillInfoService._readInt(val));
    }
    return arr;
  }

  private static _countProps(node: WzProperty): number {
    return Object.keys(node.Items).length;
  }
}
