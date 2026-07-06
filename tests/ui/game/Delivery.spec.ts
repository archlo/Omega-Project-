import { describe, expect, it } from 'vitest';
import { Delivery } from '../../../src/ui/game/Delivery.js';

describe('Delivery', () => {
  it('shows decoded disallowed quest fields', () => {
    const panel = new Delivery({} as any, null, null);

    panel.SetDisallowedQuestList(123, 456);
    panel.draw();

    expect(panel.isVisible).toBe(true);
    expect((panel as any)._noticeLine).toBe('Disallowed quests: 123 456');
  });
});
