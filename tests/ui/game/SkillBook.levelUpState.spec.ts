import { describe, it, expect } from 'vitest';
import { SkillBook, SkillRow, isSkillNeedMasterLevel, isNonslotSkill } from '../../../src/ui/game/SkillBook.js';
import { SkillInfo } from '../../../src/character/SkillInfoService.js';

// OG CWvsContext::GetSkillLevelUpState (0x9D5A40) — the three-state machine
// that drives the skill slot canvas (skill0/skill1), icon (apCanvas[state+hover])
// and SP-Up button enable:
//   0  = required skill level not met
//  -1  = master-level-locked OR already at max level
//   1  = can level up
describe('SkillBook.getSkillLevelUpState', () => {
  it('returns 1 when no requirements and below max', () => {
    const sb = new SkillBook();
    sb.setSkills([new SkillRow(1100001, 'skill', 3, 20, false)]);
    expect(sb.getSkillLevelUpState(sb['_findSkill'](1100001)!)).toBe(1);
  });

  it('returns -1 when the skill is already maxed', () => {
    const sb = new SkillBook();
    sb.setSkills([new SkillRow(1100001, 'skill', 20, 20, false)]);
    expect(sb.getSkillLevelUpState(sb['_findSkill'](1100001)!)).toBe(-1);
  });

  it('returns 0 when a required skill has not reached its level', () => {
    const sb = new SkillBook();
    sb.setSkills([
      new SkillRow(1100001, 'skill', 0, 20, false),
      new SkillRow(1100002, 'requires 1100001', 0, 20, false),
    ]);
    // 1100002 requires 1100001 at level 1 in the real WZ; inject the dependency.
    const info = new SkillInfo();
    info.RequiredSkills.set(1100001, 1);
    (sb as any).skillService = { Get: (id: number) => (id === 1100002 ? info : null) };
    const skill = sb['_findSkill'](1100002)!;
    expect(sb.getSkillLevelUpState(skill)).toBe(0);
    sb.setSkills([new SkillRow(1100002, 'skill', 0, 20, false), new SkillRow(1100001, 'req', 1, 20, false)]);
    expect(sb.getSkillLevelUpState(sb['_findSkill'](1100002)!)).toBe(1);
  });

  it('returns -1 for a master-level-locked 4th-job skill when master book unused', () => {
    const sb = new SkillBook();
    // Job 112 = 4th-job warrior → needs a master level (job % 10 == 2).
    sb.setSkills([new SkillRow(1121001, '4th job', 1, 30, false, 1)]);
    const state = sb.getSkillLevelUpState(sb['_findSkill'](1121001)!);
    // masterLevel(1) <= level(1) → locked.
    expect(state).toBe(-1);
  });
});

// OG is_skill_need_master_level @ 0x47CCB0.
describe('isSkillNeedMasterLevel', () => {
  it('4th-job explorer skills need a master level', () => {
    expect(isSkillNeedMasterLevel(1121001)).toBe(true);
    expect(isSkillNeedMasterLevel(2121001)).toBe(true);
    expect(isSkillNeedMasterLevel(3121001)).toBe(true);
    expect(isSkillNeedMasterLevel(4121001)).toBe(true);
  });

  it('beginner / 1st-job skills do not need a master level', () => {
    expect(isSkillNeedMasterLevel(10000001)).toBe(false);
    expect(isSkillNeedMasterLevel(1001001)).toBe(false);
    expect(isSkillNeedMasterLevel(2001001)).toBe(false);
  });

  it('exempted master-book skills are ignored (is_ignore_master_level_for_common)', () => {
    expect(isSkillNeedMasterLevel(3220010)).toBe(false);
    expect(isSkillNeedMasterLevel(3220009)).toBe(false);
    expect(isSkillNeedMasterLevel(3120010)).toBe(false);
    expect(isSkillNeedMasterLevel(2120009)).toBe(false);
  });

  it('Evan special skills need a master level', () => {
    expect(isSkillNeedMasterLevel(22111001)).toBe(true);
    expect(isSkillNeedMasterLevel(22141002)).toBe(true);
    expect(isSkillNeedMasterLevel(22140000)).toBe(true);
  });
});

// OG is_nonslot_skill @ 0x849B90.
describe('isNonslotSkill', () => {
  it('accepts normal draggable skills', () => {
    expect(isNonslotSkill(1100001)).toBe(false);
    expect(isNonslotSkill(2001001)).toBe(false);
    expect(isNonslotSkill(3101001)).toBe(false);
  });

  it('rejects the documented nonslot skill ids', () => {
    expect(isNonslotSkill(4321000)).toBe(true);
    expect(isNonslotSkill(1066)).toBe(true);
    expect(isNonslotSkill(1067)).toBe(true);
    expect(isNonslotSkill(20001066)).toBe(true);
    expect(isNonslotSkill(20001067)).toBe(true);
    expect(isNonslotSkill(20011066)).toBe(true);
    expect(isNonslotSkill(20011067)).toBe(true);
    expect(isNonslotSkill(30001066)).toBe(true);
    expect(isNonslotSkill(30001067)).toBe(true);
    expect(isNonslotSkill(33001002)).toBe(true);
  });
});
