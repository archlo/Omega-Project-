import type { WzPackage } from '../wz/WzPackage.js';
import { WzImage } from '../wz/WzImage.js';
import { WzProperty } from '../wz/WzProperty.js';
import { WzCanvas } from '../wz/WzCanvas.js';
import { WzVector } from '../wz/WzVector.js';
import { MobInfo, type MobSpeakEntry } from './MobInfo.js';
import { MobAttack } from './MobAttack.js';
import { MobSkillRef } from './MobSkillRef.js';
import { MobSkillType } from './MobSkillType.js';

export class MobInfoService {
  private readonly _mobWz: WzPackage | null;
  private readonly _cache = new Map<number, MobInfo>();

  constructor(mobWz: WzPackage | null) { this._mobWz = mobWz; }

  Get(templateId: number): MobInfo {
    const cached = this._cache.get(templateId);
    if (cached) return cached;
    const info = this._parse(templateId) ?? (() => { const m = new MobInfo(); m.TemplateId = templateId; return m; })();
    this._cache.set(templateId, info);
    return info;
  }

  private _parse(templateId: number): MobInfo | null {
    if (!this._mobWz) return null;
    const img = this._mobWz.GetItem(`${templateId.toString().padStart(7, '0')}.img`);
    if (!(img instanceof WzImage)) return null;
    let root = img.Root;

    const link = root.GetItem('info/link');
    if (typeof link === 'string') {
      const linkId = parseInt(link);
      const linked = this._mobWz.GetItem(`${linkId.toString().padStart(7, '0')}.img`);
      if (linked instanceof WzImage) {
        root = linked.Root;
      }
    }

    const info = root.GetItem('info');
    if (!(info instanceof WzProperty)) return null;

    let flySpeed = MobInfoService._readInt(info, 'flySpeed');
    if (flySpeed === 0) flySpeed = MobInfoService._readInt(info, 'fs');

    const attacks = new Map<number, MobAttack>();
    for (const [key, value] of Object.entries(root.Items)) {
      if (!key.startsWith('attack')) continue;
      const idxStr = key.substring('attack'.length);
      if (idxStr.length === 0) continue;
      const attackNumber = parseInt(idxStr, 16);
      if (isNaN(attackNumber)) continue;
      if (!(value instanceof WzProperty)) continue;
      const atkInfo = value.GetItem('info');
      if (!(atkInfo instanceof WzProperty)) continue;
      const attackIndex = attackNumber - 1;
      const ma = new MobAttack();
      ma.AttackIndex   = attackIndex;
      ma.SkillId       = MobInfoService._readInt(atkInfo, 'disease');
      ma.SkillLevel    = MobInfoService._readInt(atkInfo, 'level');
      ma.ConMp         = MobInfoService._readInt(atkInfo, 'conMP');
      ma.MpBurn        = MobInfoService._readInt(atkInfo, 'mpBurn');
      ma.Magic         = MobInfoService._readBool(atkInfo, 'magic');
      ma.DeadlyAttack  = MobInfoService._readBool(atkInfo, 'deadlyAttack');
      ma.BulletNumber  = Math.max(1, MobInfoService._readInt(atkInfo, 'bulletNumber', 1));
      ma.BulletSpeed   = MobInfoService._readInt(atkInfo, 'bulletSpeed');
      ma.MagicElemAttr = MobInfoService._readInt(atkInfo, 'magicElemAttr');
      ma.JumpAttack    = MobInfoService._readBool(atkInfo, 'jump');
      ma.KnockBack     = MobInfoService._readBool(atkInfo, 'knockBack');
      ma.AttackAfter   = MobInfoService._readInt(atkInfo, 'attackAfter');
      ma.EffectAfter   = MobInfoService._readInt(atkInfo, 'effectAfter');
      ma.Tremble       = MobInfoService._readBool(atkInfo, 'tremble');
      ma.Rush          = MobInfoService._readBool(atkInfo, 'rush');
      ma.HitAttach     = MobInfoService._readBool(atkInfo, 'hitAttach');
      ma.FacingAttach  = MobInfoService._readBool(atkInfo, 'facingAttach');
      ma.Effect        = MobInfoService._readStr(atkInfo, 'effect');
      ma.Hit           = MobInfoService._readStr(atkInfo, 'hit');
      ma.Ball          = MobInfoService._readStr(atkInfo, 'ball');
      ma.AreaWarning   = MobInfoService._readStr(atkInfo, 'areaWarning');
      ma.HitRect       = MobInfoService._readHitRect(value);
      attacks.set(attackIndex, ma);
    }

    const skills = new Map<number, MobSkillRef>();
    const skillRoot = info.GetItem('skill');
    if (skillRoot instanceof WzProperty) {
      for (const [, sv] of Object.entries(skillRoot.Items)) {
        if (!(sv instanceof WzProperty)) continue;
        const skId = MobInfoService._readInt(sv, 'skill');
        const slv  = MobInfoService._readInt(sv, 'level');
        if (skId === 0) continue;
        const type = MobInfoService._isMobSkillType(skId) ? skId as MobSkillType : MobSkillType.Unknown;
        skills.set(skId, new MobSkillRef(type, skId, slv));
      }
    }

    const elemAttr = new Map<string, string>();
    const ea = info.Get('elemAttr');
    if (typeof ea === 'string' && ea.length >= 2) {
      for (let i = 0; i + 1 < ea.length; i += 2) {
        elemAttr.set(ea[i], ea[i + 1]);
      }
    }

    const damagedBySkill = new Set<number>();
    const dbs = info.GetItem('damagedBySelectedSkill');
    if (dbs instanceof WzProperty) {
      for (const [, v] of Object.entries(dbs.Items)) {
        const id = typeof v === 'number' ? v : typeof v === 'bigint' ? Number(v) : 0;
        if (id !== 0) damagedBySkill.add(id);
      }
    }

    const revives: number[] = [];
    const rv = info.GetItem('revive');
    if (rv instanceof WzProperty) {
      for (const [, v] of Object.entries(rv.Items)) {
        const id = typeof v === 'number' ? v : typeof v === 'bigint' ? Number(v) : 0;
        if (id !== 0) revives.push(id);
      }
    }

    const speakEntries: MobSpeakEntry[] = [];
    const speakRoot = root.Get('speak');
    if (speakRoot instanceof WzProperty) {
      for (const [, sv] of Object.entries(speakRoot.Items)) {
        if (!(sv instanceof WzProperty)) continue;
        const sAction = MobInfoService._readInt(sv, 'action');
        const speechNode = sv.Get('speech');
        const lines: string[] = [];
        if (speechNode instanceof WzProperty) {
          for (const [, line] of Object.entries(speechNode.Items)) {
            if (typeof line === 'string') lines.push(line);
          }
        }
        if (lines.length > 0) speakEntries.push({ action: sAction, lines });
      }
    }

    const m = new MobInfo();
    m.TemplateId           = templateId;
    m.Level                = MobInfoService._readInt(info, 'level', 1);
    m.Exp                  = MobInfoService._readInt(info, 'exp');
    m.MaxHp                = Math.max(1, MobInfoService._readInt(info, 'maxHP', 1));
    m.MaxMp                = MobInfoService._readInt(info, 'maxMP');
    m.Pad                  = MobInfoService._readInt(info, 'PADamage');
    m.Pdr                  = MobInfoService._readInt(info, 'PDRate');
    m.Mad                  = MobInfoService._readInt(info, 'MADamage');
    m.Mdr                  = MobInfoService._readInt(info, 'MDRate');
    m.Acc                  = MobInfoService._readInt(info, 'acc');
    m.Eva                  = MobInfoService._readInt(info, 'eva');
    m.HpRecovery           = MobInfoService._readInt(info, 'hpRecovery');
    m.MpRecovery           = MobInfoService._readInt(info, 'mpRecovery');
    m.FixedDamage          = MobInfoService._readInt(info, 'fixedDamage');
    m.RemoveAfter          = MobInfoService._readInt(info, 'removeAfter');
    m.DropItemPeriod       = MobInfoService._readInt(info, 'dropItemPeriod');
    m.MoveAbility          = MobInfoService._readInt(info, 'moveAbility', 1);
    m.Speed                = MobInfoService._readInt(info, 'speed');
    m.FlySpeed             = flySpeed;
    m.Fly                  = MobInfoService._readBool(info, 'fly');
    m.ChaseSpeed           = MobInfoService._readInt(info, 'chaseSpeed');
    m.BodyAttack           = MobInfoService._readBool(info, 'bodyAttack');
    m.Pushed               = MobInfoService._readInt(info, 'pushed');
    m.Undead               = MobInfoService._readBool(info, 'undead');
    m.Boss                 = MobInfoService._readBool(info, 'boss');
    m.NoFlip               = MobInfoService._readBool(info, 'noFlip');
    m.OnlyNormalAttack     = MobInfoService._readBool(info, 'onlyNormalAttack');
    m.DamagedByMob         = MobInfoService._readBool(info, 'damagedByMob');
    m.PickUp               = MobInfoService._readBool(info, 'pickUp');
    m.CannotEvade          = MobInfoService._readBool(info, 'cannotEvade');
    m.SelfDestruction      = MobInfoService._readBool(info, 'selfDestruction');
    m.FirstSelfDestruction = MobInfoService._readBool(info, 'firstSelfDestruction');
    m.Invincible           = MobInfoService._readBool(info, 'invincible');
    m.Disable              = MobInfoService._readBool(info, 'disable');
    m.NotAttack            = MobInfoService._readBool(info, 'notAttack');
    m.FirstAttack          = MobInfoService._readBool(info, 'firstAttack');
    m.HpTagColor           = MobInfoService._readInt(info, 'hpTagColor');
    m.HpTagBgColor         = MobInfoService._readInt(info, 'hpTagBgcolor');
    m.HpGaugeHide          = MobInfoService._readBool(info, 'hpTagHide');
    m.UpperMostLayer       = MobInfoService._readBool(info, 'upperMostLayer');
    m.WeaponID             = MobInfoService._readInt(info, 'weaponID');
    m.AngerGauge           = MobInfoService._readBool(info, 'angerGauge');
    m.ChargeCount          = MobInfoService._readInt(info, 'chargeCount');
    m.Category             = MobInfoService._readInt(info, 'category');
    m.EscortType           = MobInfoService._readInt(info, 'escortType');
    m.MobSpeciesCode       = MobInfoService._readStr(info, 'mobSpeciesCode');
    m.Attacks              = attacks;
    m.Skills               = skills;
    m.DamagedElemAttr      = elemAttr;
    m.DamagedBySkill       = damagedBySkill;
    m.Revives              = revives;
    m.SpeakEntries         = speakEntries;
    return m;
  }

  private static _readInt(p: WzProperty, key: string, def = 0): number {
    const v = p.Get(key);
    if (typeof v === 'number') return v;
    if (typeof v === 'bigint') return Number(v);
    return def;
  }

  private static _readBool(p: WzProperty, key: string): boolean { return MobInfoService._readInt(p, key) !== 0; }

  private static _readStr(p: WzProperty, key: string): string {
    const v = p.Get(key);
    return typeof v === 'string' ? v : '';
  }

  // TODO_AUDIT.md Thirty-fourth pass: real attack-frame hit rect lives as
  // `lt`/`rb` vectors directly on the attack node's frame-0 child (sibling
  // of `info`, not inside it) — confirmed live against wz_client/Mob.nx
  // (e.g. 8800000.img/attack1/0: lt=-175,-65 rb=180,0).
  private static _readHitRect(attackNode: WzProperty): { ltx: number; lty: number; rbx: number; rby: number } | null {
    const frame0 = attackNode.Get('0');
    let prop: WzProperty | null = null;
    if (frame0 instanceof WzCanvas) prop = frame0.Property;
    else if (frame0 instanceof WzProperty) prop = frame0;
    if (!prop) return null;
    const lt = prop.Get('lt');
    const rb = prop.Get('rb');
    if (!(lt instanceof WzVector) || !(rb instanceof WzVector)) return null;
    return { ltx: lt.X, lty: lt.Y, rbx: rb.X, rby: rb.Y };
  }

  private static _isMobSkillType(v: number): boolean {
    return v === 100 || v === 101 || v === 102 || v === 103 || v === 104 ||
      v === 110 || v === 111 || v === 112 || v === 113 || v === 114 || v === 115 ||
      v === 120 || v === 121 || v === 122 || v === 123 || v === 124 || v === 125 ||
      v === 126 || v === 127 || v === 128 || v === 129 || v === 130 || v === 131 ||
      v === 132 || v === 133 || v === 134 || v === 135 || v === 136 || v === 137 ||
      v === 140 || v === 141 || v === 142 || v === 143 || v === 144 || v === 145 ||
      v === 150 || v === 151 || v === 152 || v === 153 || v === 154 || v === 155 ||
      v === 156 || v === 157 || v === 158 ||
      v === 160 || v === 161 || v === 162 ||
      v === 200 || v === 201;
  }
}
