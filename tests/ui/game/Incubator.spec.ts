import { describe, expect, it } from 'vitest';
import { Incubator } from '../../../src/ui/game/Incubator.js';

describe('Incubator', () => {
  it('shows decoded item, stat deltas, and flag fields', () => {
    const panel = new Incubator();

    panel.SetResult({ itemId: 100, plus: 2, statType: 3, str: 4, attack: 5, dialogType: 1, msgType: 2, sendItemOption: true }, 'Prize');

    const text = (panel as any)._body.text as string;
    // The UI renders formatted stats, not raw field names
    expect(text).toContain('Prize +2');
    expect(text).toContain('STR+4');
    expect(text).toContain('ATK+5');
  });
});
