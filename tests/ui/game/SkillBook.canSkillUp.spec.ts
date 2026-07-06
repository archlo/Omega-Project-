import { describe, it, expect } from 'vitest';
import { SkillBook, SkillRow } from '../../../src/ui/game/SkillBook.js';

// TODO_AUDIT.md Sixty-fifth pass: CUISkill::CanSkillUp/GetMaxSkillDegreeSP/
// GetMySkillDegreeSP (decompile 0x84a930/0x84a870) — the real per-job-tier,
// level-capped SP gate. Job IDs below are chosen purely to exercise the
// decompiled `get_job_level`/`get_job_change_level` formula's branches
// (job % 100 === 0 -> degree 1; else job % 10 + 2 -> degree 2/3/4), not
// asserted to be any particular real-game job name.
describe('SkillBook.canSkillUp', () => {
  it('job % 1000 === 0 can never skill up (Beginner/Noblesse-style exclusion)', () => {
    const sb = new SkillBook();
    expect(sb.canSkillUp(10000001)).toBe(false); // job 1000
  });

  it('Evan-beginner (job 2001) can never skill up', () => {
    const sb = new SkillBook();
    expect(sb.canSkillUp(20010001)).toBe(false);
  });

  it('degree-2 (job % 10 === 0, job % 100 !== 0) gate: mySP < 3*level - 89', () => {
    const sb = new SkillBook();
    sb.characterLevel = 30; // degree-2 cap = 3*30-89 = 1
    // Degree-1 cap at level 30 = 3*(30-10)+1 = 61 — satisfy it fully so this
    // test isolates the degree-2-own-tier check from the cross-tier catch-up.
    const deg1Maxed = new SkillRow(1000001, 'deg1 skill', 61, 61, false);
    sb.setSkills([deg1Maxed, new SkillRow(1100001, 'deg2 skill', 0, 20, false)]); // job 110
    expect(sb.canSkillUp(1100001)).toBe(true); // mySP=0 < 1

    sb.setSkills([deg1Maxed, new SkillRow(1100001, 'deg2 skill', 1, 20, false)]);
    expect(sb.canSkillUp(1100001)).toBe(false); // mySP=1, not < 1
  });

  it('degree 2 requires the degree-1 tier to already be at its SP cap', () => {
    const sb = new SkillBook();
    sb.characterLevel = 50;
    // Degree-1 (job % 100 === 0, e.g. job 100) cap = 3*(30-10)+1 = 61.
    sb.setSkills([
      new SkillRow(1000001, 'deg1 skill', 5, 20, false), // job 100, only 5 SP spent (< 61 cap)
      new SkillRow(1100001, 'deg2 skill', 0, 20, false), // job 110
    ]);
    expect(sb.canSkillUp(1100001)).toBe(false); // blocked: degree-1 catch-up not satisfied
  });

  it('allows degree 2 once the degree-1 catch-up requirement is met', () => {
    const sb = new SkillBook();
    sb.characterLevel = 50;
    sb.setSkills([
      new SkillRow(1000001, 'deg1 skill', 61, 61, false), // job 100, fully at cap
      new SkillRow(1100001, 'deg2 skill', 0, 20, false),
    ]);
    expect(sb.canSkillUp(1100001)).toBe(true);
  });
});
