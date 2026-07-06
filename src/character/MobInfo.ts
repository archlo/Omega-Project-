import type { MobAttack } from './MobAttack.js';
import type { MobSkillRef } from './MobSkillRef.js';

export interface MobSpeakEntry {
  action: number;
  lines: string[];
}

export class MobInfo {
  TemplateId        = 0;
  Level             = 1;
  Exp               = 0;

  MaxHp             = 1;
  MaxMp             = 0;
  Pad               = 0;
  Pdr               = 0;
  Mad               = 0;
  Mdr               = 0;
  Acc               = 0;
  Eva               = 0;
  HpRecovery        = 0;
  MpRecovery        = 0;
  FixedDamage       = 0;

  RemoveAfter       = 0;
  DropItemPeriod    = 0;

  MoveAbility       = 1;
  Speed             = 0;
  FlySpeed          = 0;
  Fly               = false;
  ChaseSpeed        = 0;

  BodyAttack        = false;
  Pushed            = 0;
  Undead            = false;
  Boss              = false;
  NoFlip            = false;
  OnlyNormalAttack  = false;
  DamagedByMob      = false;
  PickUp            = false;
  CannotEvade       = false;
  SelfDestruction   = false;
  FirstSelfDestruction = false;
  Invincible        = false;
  Disable           = false;
  NotAttack         = false;
  FirstAttack       = false;

  HpTagColor        = 0;
  HpTagBgColor      = 0;
  HpGaugeHide       = false;
  UpperMostLayer    = false;
  WeaponID          = 0;
  AngerGauge        = false;
  ChargeCount       = 0;

  Category          = 0;
  EscortType        = 0;
  MobSpeciesCode    = '';

  Attacks           = new Map<number, MobAttack>();
  Skills            = new Map<number, MobSkillRef>();
  DamagedElemAttr   = new Map<string, string>();
  DamagedBySkill    = new Set<number>();
  Revives: number[] = [];
  SpeakEntries: MobSpeakEntry[] = [];

  get IsStay(): boolean { return this.MoveAbility === 0; }
  get IsFly(): boolean  { return this.MoveAbility === 4 || this.Fly; }
  get IsJump(): boolean { return this.MoveAbility === 3; }
}
