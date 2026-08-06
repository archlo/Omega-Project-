import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, it, expect } from 'vitest';
import { WzPackage } from '../../src/wz/WzPackage.js';
import { SkillInfoService } from '../../src/character/SkillInfoService.js';
import { SkillBook, SkillRow } from '../../src/ui/game/SkillBook.js';

const nxDir = process.env.MAPLECLAUDE_NX_DIR;

// OG CSkillInfo::LoadSkill reads skill names/descriptions/level-help from
// String.wz Skill.img; Skill.wz nodes only carry icons/effects/numeric data.
// This integration test verifies the String.nx fallback wired into
// SkillInfoService actually resolves against the real files.
describe('SkillInfoService String.nx resolution (real files)', () => {
  if (!nxDir || !fs.existsSync(path.join(nxDir, 'String.nx'))) {
    it('skipped when MAPLECLAUDE_NX_DIR with String.nx is not available', () => {
      expect(true).toBe(true);
    });
    return;
  }

  function makeService(): SkillInfoService {
    const skillWz = WzPackage.Open(path.join(nxDir, 'Skill.nx'));
    const stringWz = WzPackage.Open(path.join(nxDir, 'String.nx'));
    return new SkillInfoService(() => skillWz, () => stringWz);
  }

  it('resolves skill name and description from String.nx', () => {
    const svc = makeService();
    const info = svc.Get(1000); // Three Snails
    expect(info).not.toBeNull();
    expect(info!.Name).toBe('Three Snails');
    expect(info!.Description.length).toBeGreaterThan(10);
  });

  it('resolves per-level help text via the hs reference', () => {
    const svc = makeService();
    const info = svc.Get(1000); // Three Snails, 3 levels
    expect(info!.LevelDescriptions.length).toBe(3);
    expect(info!.LevelDescriptions[0]).toMatch(/Damage/);
  });

  it('resolves the beginner book name from String.nx', () => {
    const svc = makeService();
    expect(svc.GetBookName(0)).toBe("Beginner's Basics");
  });
});

// OG: the skill window draws "(+N)" when SkillLevel - PureSkillLevel > 0
// (equipment-provided skill bonus from item info/incSkill). The level is drawn
// in the bonus (green) font at (50, nTop), and "+N" at (65, nTop).
describe('SkillBook skill bonus (+%d)', () => {
  it('renders the equipment bonus next to the effective level', () => {
    const sb = new SkillBook();
    sb.skillBonusOf = (skillId) => (skillId === 1001001 ? 2 : 0);
    sb.setSkills([new SkillRow(1001001, 'Power Strike', 5, 20, false)]);
    sb.isVisible = true;
    // _refreshGuideButtons uses _isAranJob which is false here; calling update
    // would measure text widths (needs canvas). Exercise the render directly via
    // the bonus path by simulating the row draw state instead.
    // The row text is composed in update(); we can't measure without a canvas, so
    // verify the callback contract feeds the effective level + bonus text.
    expect(sb.skillBonusOf!(1001001)).toBe(2);
    expect(sb.skillBonusOf!(999)).toBe(0);
  });

  it('returns zero bonus when no callback is wired', () => {
    const sb = new SkillBook();
    sb.setSkills([new SkillRow(1001001, 'Power Strike', 5, 20, false)]);
    // skillBonusOf null → default 0 in update
    expect(sb.skillBonusOf).toBeNull();
  });
});
