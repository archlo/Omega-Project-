import { describe, expect, it, vi } from 'vitest';
import { GameStage } from '../../src/stages/GameStage.js';

// OG: CUserLocal recalculates the character stat window from base stats +
// equipment every time equips/AP/buffs change. The main StatsInfo panel shows
// `formatStat(base, total)` = "base (+bonus)", so `_stats.str` must be the
// TOTAL (base + equip) while `_stats.baseStr` stays the raw server base.
describe('GameStage stat window sync (equip bonuses affect displayed stats)', () => {
  function makeSecondaryStat(): any {
    return {
      getBasicStatUp: () => 0,
      getBuffPAD: () => 0, getBuffMAD: () => 0,
      getBuffACC: () => 0, getBuffEVA: () => 0, getBuffPDD: () => 0, getBuffMDD: () => 0,
      getTempSpeed: () => 0, getTempJump: () => 0,
      getMagicGuardReduction: () => 0, getPowerGuardReduction: () => 0,
      getMesoGuardReduction: () => 0, getHolySymbolExpRate: () => 0,
      getSharpEyesCritRate: () => 0, getStanceRate: () => 0,
      getShadowPartnerDamageRate: () => 0, getHyperBodyHpMultiplier: () => 0,
      getHyperBodyMpMultiplier: () => 0,
      buff: { morph: 0 },
    };
  }

  function makeStats(): any {
    return {
      str: 4, dex: 4, intStat: 4, luk: 4,
      baseStr: 4, baseDex: 4, baseInt: 4, baseLuk: 4,
      maxHp: 50, maxMp: 5,
      SetDerivedStats: vi.fn(),
    };
  }

  function makeStage(equipIncStr: number): any {
    const stats = makeStats();
    const statDetailInfo = { Inputs: { jobId: 0 } };
    const stage: any = Object.create(GameStage.prototype);
    stage._statDetailInfo = statDetailInfo;
    stage._stats = stats;
    stage._job = 0;
    stage._forcedStat = { str: 0, dex: 0, int: 0, luk: 0, speed: 0, jump: 0 };
    stage._masteryFromSkills = 0;
    stage._isRidingTamingMob = false;
    stage._player = { AvatarLook: { hairEquip: new Map() } };
    stage._equipStats = new Map();
    stage._equip = {
      equippedSlots: () => [{ itemId: 1040000, bodyPart: 5 }],
      equippedWeaponItemId: null,
    };
    stage._itemIcons = { LoadAttr: () => undefined };
    stage.game = { fieldHandlers: { secondaryStat: makeSecondaryStat() } };
    stage._physics = { SetStats: vi.fn(), SetShoePhysics: vi.fn(), SetLadderRestrictions: vi.fn() };
    return stage;
  }

  it('writes the equip-inclusive total back into _stats.str (base stays separate)', () => {
    const stage = makeStage(0);
    stage._equipStats.set(5, { incStr: 10, incDex: 0, incInt: 0, incLuk: 0 });
    stage._equip.equippedSlots = () => [{ itemId: 1040000, bodyPart: 5 }];

    stage._syncStatDetailInputs();

    // base 4 + equip 10 = total 14
    expect(stage._stats.str).toBe(14);
    expect(stage._stats.baseStr).toBe(4);
    expect(stage._statDetailInfo.Inputs.str).toBe(14);
  });

  it('keeps total === base when nothing is equipped', () => {
    const stage = makeStage(0);
    stage._equip.equippedSlots = () => [];

    stage._syncStatDetailInputs();

    expect(stage._stats.str).toBe(4);
    expect(stage._stats.baseStr).toBe(4);
    expect(stage._stats.dex).toBe(4);
  });
});
