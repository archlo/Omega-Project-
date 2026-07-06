import { describe, expect, it } from 'vitest';
import { LogoutGift } from '../../../src/ui/game/LogoutGift.js';

describe('LogoutGift', () => {
  it('opens and closes the trigger-only gift notice', () => {
    const panel = new LogoutGift();

    panel.Open();

    expect(panel.isVisible).toBe(true);
    expect(panel.handleMouseButton(344 + 150, 184 + 86, true)).toBe(true);
    expect(panel.isVisible).toBe(false);
  });
});
