import { describe, expect, it, vi } from 'vitest';
import { GameStage } from '../../src/stages/GameStage.js';
import { SecondaryStat } from '../../src/character/SecondaryStat.js';
import * as CUserLocal from '../../src/character/CUserLocal.js';

// OG: CUIStatDetail::GetCriticalProp (0x861BF0) — the ability panel's critical
// row. The CTS SharpEyes value is packed (critRate<<8 | critDamageMax); weapon
// AND katana ItemOption niCr feed ApplyWeaponOption; combo-ability and Evan
// props come from skill records.
describe('ability panel critical pipeline (GetCriticalProp 1:1)', () => {
  it('getSharpEyesCritRate shifts the packed CTS value >> 8, clamped [0,100]', () => {
    const ss = new SecondaryStat();
    // decode path is packet-driven; set via the internal map through a fake entry
    (ss as any)._buff.sharpEyes = (10 << 8) + 20;
    expect(ss.getSharpEyesCritRate()).toBe(10);
    (ss as any)._buff.sharpEyes = (200 << 8);
    expect(ss.getSharpEyesCritRate()).toBe(100);
    (ss as any)._buff.sharpEyes = 0;
    expect(ss.getSharpEyesCritRate()).toBe(0);
  });

  function makeSecondaryStat(buff: Record<string, number> = {}): any {
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
      getAranCombo: () => buff.aranCombo ?? 0,
      buff: { morph: 0, sharpEyes: buff.sharpEyes ?? 0, thornsEffect: buff.thornsEffect ?? 0, swallowCritical: buff.swallowCritical ?? 0, craft: buff.craft ?? 0 },
    };
  }

  it('wires weapon + katana option crit and sharp eyes into the detail panel', async () => {
    const { StatDetailInfo } = await import('../../src/ui/game/StatDetailInfo.js');

    const optionLoaderData = (cr: number) => ({
      aLevelData: [{ nLevel: 0, niCr: cr, niCDr: 0, niDAMr: 0, nBoss: 0, nIgnoreTargetDEF: 0 }],
    });

    const stage: any = Object.create(GameStage.prototype);
    const detail = new StatDetailInfo(null as any, null, null, null);
    stage._statDetailInfo = detail;
    stage._stats = {
      str: 4, dex: 4, intStat: 4, luk: 4,
      baseStr: 4, baseDex: 4, baseInt: 4, baseLuk: 4,
      maxHp: 50, maxMp: 5,
      SetDerivedStats: vi.fn(),
    };
    stage._job = 400;
    stage._forcedStat = { str: 0, dex: 0, int: 0, luk: 0, speed: 0, jump: 0 };
    stage._masteryFromSkills = 0;
    stage._isRidingTamingMob = false;
    stage._player = { AvatarLook: { hairEquip: new Map() } };
    stage._equipStats = new Map();
    stage._itemIcons = { LoadAttr: () => undefined };
    stage._skillRecords = [];
    stage._skillWz = null;
    stage._physics = { SetStats: vi.fn(), SetShoePhysics: vi.fn(), SetLadderRestrictions: vi.fn() };

    const slots: any[] = [
      { itemId: 1472000, bodyPart: 11 },   // claw (weapon slot)
      { itemId: 1342000, bodyPart: 10 },   // katana
    ];
    stage._equip = { equippedSlots: () => slots, equippedWeaponItemId: 1472000 };
    stage.game = { fieldHandlers: { secondaryStat: makeSecondaryStat({ sharpEyes: (12 << 8) }) } };

    // weapon pass: slot 11 options → niCr 7
    stage._equipStats.set(11, {
      incStr: 0, incDex: 0, incInt: 0, incLuk: 0, incMhp: 0, incMmp: 0,
      incPad: 0, incMad: 0, incAcc: 0, incEva: 0, incPdd: 0, incMdd: 0,
      incSpeed: 0, incJump: 0, level: 0,
      option1: 0, option2: 0, option3: 0,
    });
    // Give the weapon real options by overriding _computeWeaponOption behavior:
    // call applyWeaponOption directly with a loader (mirrors _computeWeaponOption).
    const loader = (id: number) => (id === 500 ? optionLoaderData(7) : id === 600 ? optionLoaderData(5) : null);
    stage._itemOptionLoader = { loadItemOption: loader, loadSocketOption: () => null };
    stage._equipStats.get(11)!.option1 = 500;
    stage._equipStats.set(10, {
      incStr: 0, incDex: 0, incInt: 0, incLuk: 0, incMhp: 0, incMmp: 0,
      incPad: 0, incMad: 0, incAcc: 0, incEva: 0, incPdd: 0, incMdd: 0,
      incSpeed: 0, incJump: 0, level: 0,
      option1: 600, option2: 0, option3: 0,
    });

    stage._syncStatDetailInputs();

    // OG GetCriticalProp: weapon pass (niCr 7) + katana pass (niCr 5) accumulate
    expect(CUserLocal.weaponCritProb).toBe(12);
    expect(stage._statDetailInfo._weaponOptionCritical).toBe(12);
    // packed sharp eyes wired raw; getCriticalProp does the >>8
    expect(stage._statDetailInfo._sharpEyesCrit).toBe((12 << 8));
    // crit = base 5 + weapon/katana 12 + max(sharpEyes 12, thorns 0) = 29
    expect(detail.getCriticalProp()).toBe(29);
  });

  it('combo-ability contribution uses X = min(LevelData.X, combo/10), times Y', async () => {
    const { WzProperty } = await import('../../src/wz/WzProperty.js');
    const stage: any = Object.create(GameStage.prototype);
    stage._job = 2110; // aran branch
    stage._skillRecords = [{ skillId: 21110000, level: 10 }];
    stage.game = { fieldHandlers: { secondaryStat: makeSecondaryStat({ aranCombo: 55 }) } };
    const lvNode = new WzProperty(null as any, 0, { x: 8, y: 3 });
    const skillNode = new WzProperty(null as any, 0, { 'level/10': lvNode });
    stage._skillWz = { GetItem: () => skillNode };
    // combo 55 → floor(55/10)=5 < X=8 → X=5; crit += min(100, 5*3)=15
    expect(stage._computeComboAbilityCritical()).toBe(15);
  });

  it('base critical prop follows get_critical_skill_level weapon-type table', async () => {
    const { WzProperty } = await import('../../src/wz/WzProperty.js');
    const makeLvNode = () => new WzProperty(null as any, 0, { prop: 42 });
    const mkSkillWz = () => ({
      GetItem: () => new WzProperty(null as any, 0, { 'level/1': makeLvNode() }),
    });
    const mkStage = (job: number, weaponId: number | null): any => {
      const s: any = Object.create(GameStage.prototype);
      s._job = job;
      s._equip = { equippedWeaponItemId: weaponId };
      s._skillRecords = [{ skillId: -1, level: 1 }]; // patched per case below
      s._skillLevelValueForTest = true;
      return s;
    };
    // Archer + bow → 3000001; learned level 1 prop = 42
    const archer = mkStage(300, 1452000);
    archer._skillRecords = [{ skillId: 3000001, level: 1 }];
    archer._skillWz = mkSkillWz();
    expect(archer._computeBaseCriticalProp()).toBe(42);
    // Cygnus archer + bow → 13000000 (not learned → 0)
    const wb = mkStage(1300, 1452000);
    wb._skillRecords = [{ skillId: 3000001, level: 1 }];
    wb._skillWz = mkSkillWz();
    expect(wb._computeBaseCriticalProp()).toBe(0);
    // Cygnus archer learning the WindBreaker skill gets its prop
    wb._skillRecords = [{ skillId: 13000000, level: 1 }];
    expect(wb._computeBaseCriticalProp()).toBe(42);
    // Assassin + claw → 4100001; unarmed warrior → 0
    const sin = mkStage(400, 1472000);
    sin._skillRecords = [{ skillId: 4100001, level: 1 }];
    sin._skillWz = mkSkillWz();
    expect(sin._computeBaseCriticalProp()).toBe(42);
    const bare = mkStage(100, null);
    bare._skillRecords = [];
    bare._skillWz = mkSkillWz();
    expect(bare._computeBaseCriticalProp()).toBe(0);
  });
});
