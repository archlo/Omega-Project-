import { describe, it, expect } from 'vitest';
import { SkillBook, SkillRow } from '../../../src/ui/game/SkillBook.js';

// OG CUISkill::SetTabItems — the Aran/Cygnus skill-guide launchers (button ids
// 3001-3004) are real CCtrlOriginButton controls created via
// CLayoutMan::AddButton with the Tab/AranButton/BtN path, one per tab-strip slot
// the character hasn't unlocked (numTabs < 5). Clicking one calls
// OpenSkillGuide(grade = slot index) which opens CWndSkillGuide.
describe('SkillBook guide buttons', () => {
  it('builds 4 guide-button containers on construction', () => {
    const sb = new SkillBook();
    expect(sb['_guideBtns'].length).toBe(4);
  });

  it('shows guide buttons for the unlocked Aran slots (numTabs < 5)', () => {
    const sb = new SkillBook();
    // Aran beginner skills → 1 tab (tab index 0). Guide buttons occupy slots 1-4.
    sb.setSkills([new SkillRow(2000000, 'Aran Beginner', 1, 10, false)]);
    sb['_isAranJob'] = true;
    sb['_refreshGuideButtons'](1);
    const visible = sb['_guideBtns'].map((g) => g.container.visible);
    expect(visible).toEqual([true, true, true, true]);
  });

  it('hides guide buttons when the tab strip is full', () => {
    const sb = new SkillBook();
    sb.setSkills([
      new SkillRow(1000000, 'Beginner', 1, 10, false),
      new SkillRow(1001001, '1st', 1, 10, false),
      new SkillRow(1002001, '2nd', 1, 10, false),
      new SkillRow(1003001, '3rd', 1, 10, false),
      new SkillRow(1004001, '4th', 1, 10, false),
    ]);
    sb['_refreshGuideButtons'](5);
    const visible = sb['_guideBtns'].map((g) => g.container.visible);
    expect(visible).toEqual([false, false, false, false]);
  });

  it('hides guide buttons for non-Aran jobs', () => {
    const sb = new SkillBook();
    sb.setSkills([new SkillRow(1000000, 'Beginner', 1, 10, false)]);
    sb['_refreshGuideButtons'](1);
    const visible = sb['_guideBtns'].map((g) => g.container.visible);
    expect(visible).toEqual([false, false, false, false]);
  });

  it('fires onSkillGuide with the grade when a guide button is clicked', () => {
    const sb = new SkillBook();
    sb.setSkills([new SkillRow(2000000, 'Aran Beginner', 1, 10, false)]);
    sb['_isAranJob'] = true;
    sb['_refreshGuideButtons'](1);
    sb.isVisible = true;
    const fired: number[] = [];
    sb.onSkillGuide = (grade) => fired.push(grade);
    const btn = sb['_guideBtns'][0];
    const x = sb.container.x + btn.container.x + 5;
    const y = sb.container.y + btn.container.y + 5;
    sb.handleMouseButton(x, y, true);
    expect(fired).toEqual([1]);
  });

  it('does not fire onSkillGuide for hidden guide buttons', () => {
    const sb = new SkillBook();
    sb.setSkills([new SkillRow(2000000, 'Aran Beginner', 1, 10, false)]);
    // Non-Aran job → guide buttons stay hidden.
    sb['_refreshGuideButtons'](1);
    const fired: number[] = [];
    sb.onSkillGuide = (grade) => fired.push(grade);
    const btn = sb['_guideBtns'][0];
    const x = sb.container.x + btn.container.x + 5;
    const y = sb.container.y + btn.container.y + 5;
    sb.handleMouseButton(x, y, true);
    expect(fired).toEqual([]);
  });
});
