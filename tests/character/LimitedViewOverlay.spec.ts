import { describe, expect, it } from 'vitest';
import { LimitedViewOverlay } from '../../src/character/LimitedViewOverlay.js';

describe('LimitedViewOverlay', () => {
  it('shows for one or more view points and hides for none', () => {
    const overlay = new LimitedViewOverlay();
    overlay.onResize(1024, 768);
    overlay.draw([{ x: 100, y: 100 }, { x: 200, y: 200 }]);
    expect(overlay.container.visible).toBe(true);

    overlay.draw([]);
    expect(overlay.container.visible).toBe(false);
  });
});
