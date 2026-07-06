import { describe, expect, it } from 'vitest';
import { WorldMap } from '../../../src/ui/game/WorldMap.js';

describe('WorldMap', () => {
  it('clicks map-transfer rows through the panel input path', () => {
    const map = new WorldMap();
    let selected = 0;
    map.onTeleportToMap = (mapId) => { selected = mapId; };

    map.OpenMapTransfer([100000000, 200000000]);
    expect(map.handleMouseButton(31, 49, true)).toBe(true);

    expect(selected).toBe(100000000);
    expect(map.isVisible).toBe(false);
  });
});
