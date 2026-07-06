import { describe, expect, it } from 'vitest';
import { SkillGuide } from '../../../src/ui/game/SkillGuide.js';

describe('SkillGuide', () => {
  it('opens and closes via Escape', () => {
    const guide = new SkillGuide();
    guide.Open();
    expect(guide.isVisible).toBe(true);
    expect(guide.onKeyPress('Escape')).toBe(true);
    expect(guide.isVisible).toBe(false);
  });
});
