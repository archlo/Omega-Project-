import { describe, it, expect } from 'vitest';
import { MiniMap } from '../../../src/ui/game/MiniMap.js';
import { WzTextureLoader } from '../../../src/render/WzTextureLoader.js';

// OG SetLayer @0x8011A0: mode 1 (normal pane) draws NO title text at all;
// mode 0 (big) draws street + map names with white + shadow passes.
describe('expanded title', () => {
  it('draws NO title text in mode 1 (OG SetLayer rule)', () => {
    const mm = new MiniMap(new WzTextureLoader(), null, null) as any;
    mm._mapName = 'Henesys';
    mm._streetName = 'Heneseys Market';
    mm._mapId = 100000000;
    mm._mode = 1;
    mm._content.removeChildren();
    const frame = mm._frameFor(false);
    mm._drawTitle({ x: 4, y: 4, width: 210, height: 112 }, frame.nwW, frame.titleH);
    const texts = (mm._content.children as any[]).filter((c) => c.text !== undefined);
    expect(texts.length).toBe(0);
  });

  it('draws expanded street+map names in mode 0 (white + shadow passes)', () => {
    const mm = new MiniMap(new WzTextureLoader(), null, null) as any;
    mm._mapName = 'Henesys';
    mm._streetName = 'Heneseys Market';
    mm._mode = 0;
    mm._content.removeChildren();
    const frame = mm._frameFor(false);
    mm._drawTitle({ x: 4, y: 4, width: 228, height: 112 }, frame.nwW, frame.titleH);
    const texts = (mm._content.children as any[]).filter((c) => c.text !== undefined);
    // street x2 (white+shadow) + map x2 (white+shadow)
    expect(texts.length).toBe(4);
    const contents = texts.map((t) => t.text);
    expect(contents).toContain('Henesys');
    expect(contents).toContain('Heneseys Market');
    // White pass at (9,21), shadow pass at (8,20) relative to the window.
    const streetTexts = texts.filter((t) => t.text === 'Heneseys Market');
    expect(streetTexts.map((t) => t.x - 4).sort()).toEqual([8, 9]);
    expect(streetTexts.map((t) => t.y - 4).sort()).toEqual([20, 21]);
  });
});
