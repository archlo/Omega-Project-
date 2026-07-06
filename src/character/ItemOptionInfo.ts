import type { WzPackage } from '../wz/WzPackage.js';
import type { WzProperty } from '../wz/WzProperty.js';

export interface ItemOptionLevelData {
  prob: number;
  time: number;
  niSTR: number; niDEX: number; niINT: number; niLUK: number;
  niHP: number; niMP: number;
  niMaxHP: number; niMaxMP: number;
  niACC: number; niEVA: number;
  niSpeed: number; niJump: number;
  niPAD: number; niMAD: number; niPDD: number; niMDD: number;
  niSTRr: number; niDEXr: number; niINTr: number; niLUKr: number;
  niMaxHPr: number; niMaxMPr: number;
  niACCr: number; niEVAr: number;
  niPADr: number; niMADr: number; niPDDr: number; niMDDr: number;
  niCr: number; niCDr: number; niMAMr: number;
  niSkill: number; niAllSkill: number;
  nRecoveryHP: number; nRecoveryMP: number; nRecoveryUP: number;
  nMPConReduce: number; nMPConRestore: number;
  nIgnoreTargetDEF: number; nIgnoreDAM: number; nIgnoreDAMr: number;
  niDAMr: number; nDAMReflect: number;
  nAttackType: number;
  niMesoProb: number; niRewardProb: number;
  nLevel: number;
  nBoss: number;
}

export interface ItemOptionEntry {
  nItemOptionID: number;
  nReqLevel: number;
  nOptionType: number;
  aLevelData: ItemOptionLevelData[];
}

export interface SocketOptionLevelData {
  niSTR: number; niDEX: number; niINT: number; niLUK: number;
  niMaxHP: number; niMaxMP: number;
  niACC: number; niEVA: number;
  niSpeed: number; niJump: number;
  niPAD: number; niMAD: number; niPDD: number; niMDD: number;
}

export interface SocketOptionEntry {
  nSocketOptionID: number;
  aLevelData: SocketOptionLevelData[];
}

function I(p: WzProperty, key: string): number {
  const v = p.Get(key);
  return typeof v === 'number' ? v : 0;
}

function loadItemOptionLevelData(lv: WzProperty): ItemOptionLevelData {
  return {
    prob: I(lv, 'prob'),
    time: I(lv, 'time'),
    niSTR: I(lv, 'str'), niDEX: I(lv, 'dex'), niINT: I(lv, 'int'), niLUK: I(lv, 'luk'),
    niHP: I(lv, 'hp'), niMP: I(lv, 'mp'),
    niMaxHP: I(lv, 'mhp'), niMaxMP: I(lv, 'mmp'),
    niACC: I(lv, 'acc'), niEVA: I(lv, 'eva'),
    niSpeed: I(lv, 'speed'), niJump: I(lv, 'jump'),
    niPAD: I(lv, 'pad'), niMAD: I(lv, 'mad'), niPDD: I(lv, 'pdd'), niMDD: I(lv, 'mdd'),
    niSTRr: I(lv, 'strR'), niDEXr: I(lv, 'dexR'), niINTr: I(lv, 'intR'), niLUKr: I(lv, 'lukR'),
    niMaxHPr: I(lv, 'mhpR'), niMaxMPr: I(lv, 'mmpR'),
    niACCr: I(lv, 'accR'), niEVAr: I(lv, 'evaR'),
    niPADr: I(lv, 'padR'), niMADr: I(lv, 'madR'), niPDDr: I(lv, 'pddR'), niMDDr: I(lv, 'mddR'),
    niCr: I(lv, 'cr'), niCDr: I(lv, 'cdr'), niMAMr: I(lv, 'mamR'),
    niSkill: I(lv, 'skill'), niAllSkill: I(lv, 'allSkill'),
    nRecoveryHP: I(lv, 'recoverHP'), nRecoveryMP: I(lv, 'recoverMP'), nRecoveryUP: I(lv, 'recoverUP'),
    nMPConReduce: I(lv, 'mpConReduce'), nMPConRestore: I(lv, 'mpConRestore'),
    nIgnoreTargetDEF: I(lv, 'ignoreTargetDEF'), nIgnoreDAM: I(lv, 'ignoreDAM'), nIgnoreDAMr: I(lv, 'ignoreDAMr'),
    niDAMr: I(lv, 'damR'), nDAMReflect: I(lv, 'damReflect'),
    nAttackType: I(lv, 'attackType'),
    niMesoProb: I(lv, 'mesoProb'), niRewardProb: I(lv, 'rewardProb'),
    nLevel: I(lv, 'level'),
    nBoss: I(lv, 'boss'),
  };
}

function loadSocketOptionLevelData(lv: WzProperty): SocketOptionLevelData {
  return {
    niSTR: I(lv, 'str'), niDEX: I(lv, 'dex'), niINT: I(lv, 'int'), niLUK: I(lv, 'luk'),
    niMaxHP: I(lv, 'mhp'), niMaxMP: I(lv, 'mmp'),
    niACC: I(lv, 'acc'), niEVA: I(lv, 'eva'),
    niSpeed: I(lv, 'speed'), niJump: I(lv, 'jump'),
    niPAD: I(lv, 'pad'), niMAD: I(lv, 'mad'), niPDD: I(lv, 'pdd'), niMDD: I(lv, 'mdd'),
  };
}

export class ItemOptionLoader {
  private _optionCache = new Map<number, ItemOptionEntry | null>();
  private _socketCache = new Map<number, SocketOptionEntry | null>();

  constructor(private _itemWz: WzPackage | null) {}

  loadItemOption(nItemOptionID: number): ItemOptionEntry | null {
    let cached = this._optionCache.get(nItemOptionID);
    if (cached !== undefined) return cached;
    const entry = this._loadItemOption(nItemOptionID);
    this._optionCache.set(nItemOptionID, entry);
    return entry;
  }

  loadSocketOption(nSocketOptionID: number): SocketOptionEntry | null {
    let cached = this._socketCache.get(nSocketOptionID);
    if (cached !== undefined) return cached;
    const entry = this._loadSocketOption(nSocketOptionID);
    this._socketCache.set(nSocketOptionID, entry);
    return entry;
  }

  private _loadItemOption(nItemOptionID: number): ItemOptionEntry | null {
    if (!this._itemWz) return null;
    const node = this._itemWz.GetItem(`ItemOption/${nItemOptionID.toString().padStart(6, '0')}`);
    if (!node || typeof node !== 'object' || Array.isArray(node)) return null;
    const p = node as WzProperty;
    const nReqLevel = I(p, 'reqLevel');
    const nOptionType = I(p, 'optionType');
    const levelProp = p.Get('level');
    if (!levelProp || typeof levelProp !== 'object' || Array.isArray(levelProp)) {
      return { nItemOptionID, nReqLevel, nOptionType, aLevelData: [] };
    }
    const levels: ItemOptionLevelData[] = [];
    const lvObj = levelProp as Record<string, unknown>;
    for (let i = 0; ; i++) {
      const lv = lvObj[String(i)] as WzProperty | undefined;
      if (!lv || typeof lv !== 'object') break;
      levels.push(loadItemOptionLevelData(lv));
    }
    return { nItemOptionID, nReqLevel, nOptionType, aLevelData: levels };
  }

  private _loadSocketOption(nSocketOptionID: number): SocketOptionEntry | null {
    if (!this._itemWz) return null;
    const node = this._itemWz.GetItem(`SocketOption/${nSocketOptionID.toString().padStart(6, '0')}`);
    if (!node || typeof node !== 'object' || Array.isArray(node)) return null;
    const p = node as WzProperty;
    const levelProp = p.Get('level');
    if (!levelProp || typeof levelProp !== 'object' || Array.isArray(levelProp)) {
      return { nSocketOptionID, aLevelData: [] };
    }
    const levels: SocketOptionLevelData[] = [];
    const lvObj = levelProp as Record<string, unknown>;
    for (let i = 0; ; i++) {
      const lv = lvObj[String(i)] as WzProperty | undefined;
      if (!lv || typeof lv !== 'object') break;
      levels.push(loadSocketOptionLevelData(lv));
    }
    return { nSocketOptionID, aLevelData: levels };
  }
}
