import { describe, expect, it } from 'vitest';
import { WildHunterInfo } from '../../../src/ui/game/WildHunterInfo.js';

describe('WildHunterInfo', () => {
  it('shows decoded packed byte and captured mob ids', () => {
    const panel = new WildHunterInfo();

    panel.SetInfo(7, [1, 2, 3, 4, 5]);

    const text = (panel as any)._body.text as string;
    expect(text).toContain('Packed: 7');
    expect(text).toContain('1, 2, 3, 4, 5');
    expect(panel.isVisible).toBe(true);
  });
});
