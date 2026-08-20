import { describe, expect, it } from 'vitest';
import { SkillBook } from '../../../src/ui/game/SkillBook.js';
import { SkillInfo } from '../../../src/character/SkillInfoService.js';

// OG: CUISkill::SetSkillRootList @0x84BFE0 — after get_skill_root_from_job,
// ALWAYS prepend the race beginner root: 1000*(job/1000) (explorers → 0,
// Noblesse → 1000, Aran → 2000, Citizen → 3000); Evan (job/100==22 or
// job==2001) prepends 2001. The TS used to only add root 0 for beginner
// jobs, so advanced characters lost their beginner tab.
describe('SkillBook job roots (SetSkillRootList @0x84BFE0)', () => {
  function makeService(rootSkills: Record<number, number[]>): any {
    return {
      EnumerateSkillIds: (root: number) => rootSkills[root] ?? [],
      Get: (id: number) => {
        const info = new SkillInfo();
        info.Name = `skill ${id}`;
        info.MaxLevel = 20;
        return info;
      },
    };
  }

  it('warrior (job 100) keeps the beginner root 0', () => {
    const sb = new SkillBook();
    sb.characterJob = 100;
    (sb as any).skillService = makeService({ 0: [8], 100: [1001003] });
    sb.setSkillRecords([{ skillId: 1001003, level: 1 }]);
    const ids = sb['_skills'].map((s: any) => s.id).sort((a: number, b: number) => a - b);
    expect(ids).toEqual([8, 1001003]);
  });

  it('magician 1st job (110) gets beginner + base + branch roots', () => {
    const sb = new SkillBook();
    sb.characterJob = 110;
    (sb as any).skillService = makeService({ 0: [8], 100: [1001003], 110: [1100001] });
    sb.setSkillRecords([{ skillId: 1100001, level: 1 }]);
    const ids = sb['_skills'].map((s: any) => s.id).sort((a: number, b: number) => a - b);
    expect(ids).toEqual([8, 1001003, 1100001]);
  });

  it('Noblesse (job 1000) prepends race root 1000', () => {
    const sb = new SkillBook();
    sb.characterJob = 1000;
    (sb as any).skillService = makeService({ 1000: [10000012] });
    sb.setSkillRecords([{ skillId: 10000012, level: 1 }]);
    const ids = sb['_skills'].map((s: any) => s.id);
    expect(ids).toContain(10000012);
  });

  it('Evan (job 2200) prepends 2001 instead of the 2200*... race root', () => {
    const sb = new SkillBook();
    sb.characterJob = 2200;
    (sb as any).skillService = makeService({ 2001: [20010001], 2200: [22100001] });
    sb.setSkillRecords([{ skillId: 22100001, level: 1 }]);
    const ids = sb['_skills'].map((s: any) => s.id);
    expect(ids).toContain(20010001);
    expect(ids).toContain(22100001);
  });

  it('beginner job 0 still prepends root 0', () => {
    const sb = new SkillBook();
    sb.characterJob = 0;
    (sb as any).skillService = makeService({ 0: [8, 1000] });
    sb.setSkillRecords([]);
    const ids = sb['_skills'].map((s: any) => s.id).sort((a: number, b: number) => a - b);
    expect(ids).toEqual([8, 1000]);
  });

  it('job roots are also derived from the skill records themselves — even if the job was not yet forwarded (the _onSetField ordering guard)', () => {
    // Regression: server sends skill records inside SetField. _onSetField now
    // applies stat.job BEFORE setSkillRecords, but even if characterJob is
    // still 0 (stale), _skillRootsForJob adds the job root from knownSkillIds.
    const sb = new SkillBook();
    sb.characterJob = 0; // stale — job not yet forwarded
    (sb as any).skillService = makeService({ 0: [8], 100: [1001003] });
    sb.setSkillRecords([{ skillId: 1001003, level: 1 }]);
    const ids = sb['_skills'].map((s: any) => s.id).sort((a: number, b: number) => a - b);
    expect(ids).toEqual([8, 1001003]);
  });

  it('a character with no persisted job skills shows only the beginner root (the empty-skill-records bug the DB fix addresses)', () => {
    const sb = new SkillBook();
    sb.characterJob = 100;
    (sb as any).skillService = makeService({ 0: [8, 1000] });
    sb.setSkillRecords([]); // server sent zero records (skill_records_json was '[]')
    const ids = sb['_skills'].map((s: any) => s.id).sort((a: number, b: number) => a - b);
    // Only beginner skills — job tab would be empty. The server-side fix makes
    // createCharacterHandler's job skills persist so records are never empty.
    expect(ids).toEqual([8, 1000]);
  });
});
