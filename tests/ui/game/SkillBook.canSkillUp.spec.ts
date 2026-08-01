import { describe, it, expect } from 'vitest';
import { SkillBook, SkillRow } from '../../../src/ui/game/SkillBook.js';

// OG CUISkill::CanSkillUp — per-job-tier, level-capped SP gate.
// get_job_level: job%10 + 2 → degree 2/3/4 for non-beginner jobs.
// Both job 100 and 110 map to degree 2 (100%10=0, 110%10=0, 0+2=2).
describe('SkillBook.canSkillUp', () => {
  it('beginner jobs always allowed', () => {
    const sb = new SkillBook();
    sb.sp = 5;
    expect(sb.canSkillUp(10000001)).toBe(true);
  });

  it('Evan-beginner always allowed', () => {
    const sb = new SkillBook();
    sb.sp = 5;
    expect(sb.canSkillUp(20010001)).toBe(true);
  });

  it('degree-2 SP cap: mySP < 3*level - 89', () => {
    const sb = new SkillBook();
    sb.characterLevel = 30; // cap = 3*30-89 = 1
    // Job 110 = degree 2 (110%10=0, 0+2=2)
    sb.setSkills([new SkillRow(1100001, 'skill', 0, 20, false)]);
    expect(sb.canSkillUp(1100001)).toBe(true); // 0 < 1

    sb.setSkills([new SkillRow(1100001, 'skill', 1, 20, false)]);
    expect(sb.canSkillUp(1100001)).toBe(false); // 1 < 1 is false
  });

  it('degree-3 SP cap: mySP < 3*level - 209', () => {
    const sb = new SkillBook();
    sb.characterLevel = 80; // cap = 3*80-209 = 31
    // Job 111 = degree 3 (111%10=1, 1+2=3)
    sb.setSkills([new SkillRow(1110001, 'skill', 0, 20, false)]);
    expect(sb.canSkillUp(1110001)).toBe(true); // 0 < 31

    sb.setSkills([new SkillRow(1110001, 'skill', 31, 20, false)]);
    expect(sb.canSkillUp(1110001)).toBe(false); // 31 < 31 is false
  });

  it('cross-tier: SP cap check per tier (no cross-tier blocking in canSkillUp)', () => {
    const sb = new SkillBook();
    sb.characterLevel = 80;
    // Job 111 = degree 3, SP cap = 3*80-209 = 31
    // canSkillUp only checks current tier SP cap, not cross-tier
    sb.setSkills([new SkillRow(1110001, 'skill', 0, 20, false)]);
    expect(sb.canSkillUp(1110001)).toBe(true); // 0 < 31

    sb.setSkills([new SkillRow(1110001, 'skill', 31, 20, false)]);
    expect(sb.canSkillUp(1110001)).toBe(false); // 31 < 31 is false
  });
});
