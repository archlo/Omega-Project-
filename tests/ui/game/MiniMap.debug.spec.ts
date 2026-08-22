import { describe, it, expect } from 'vitest';
import { MiniMap } from '../../../src/ui/game/MiniMap.js';
import { WzTextureLoader } from '../../../src/render/WzTextureLoader.js';

describe('expanded title debug', () => {
  it('draws expanded street+map names', () => {
    const mm = new MiniMap(new WzTextureLoader(), null, null) as any;
    mm._mapName = 'Henesys';
    mm._streetName = 'Heneseys Market';
    mm._mapId = 100000000;
    mm._mode = 1;
    mm._content.removeChildren();
    const frame = mm._frameFor(false);
    console.log('buttonsWidth=', mm._buttonsWidth(), 'nwW=', frame.nwW);
    mm._drawTitle({ x: 4, y: 4, width: 210, height: 112 }, frame.nwW, frame.titleH);
    const texts = (mm._content.children as any[]).filter(c => c.text !== undefined).map(c => c.text);
    console.log('TEXTS=', JSON.stringify(texts));
    expect(texts.length).toBeGreaterThan(0);
  });
});