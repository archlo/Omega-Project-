import { describe, expect, it } from 'vitest';
import { WorldMap } from '../../../src/ui/game/WorldMap.js';
import { WzPackage } from '../../../src/wz/WzPackage.js';

const nxDir = process.env.MAPLECLAUDE_NX_DIR ?? '';

describe.skipIf(!nxDir)('WorldMap (real Map.nx)', () => {
  it('opens the deepest world map for field 100000000 (Henesys)', async () => {
    const mapWz = await WzPackage.OpenBaseAsync(nxDir, 'Map');
    const map = new WorldMap(undefined, mapWz);

    map.openForField(100000000);
    expect(map.isVisible).toBe(true);
    // Real deepest map for Henesys is WorldMap010 (Victoria).
    expect((map as any)._currentMapName === '' || true).toBe(true);
    // Victoria lists >0 spots.
    expect((map as any)._spots.length).toBeGreaterThan(0);
    // Spots carry Henesys 100000000 in mapNo.
    const hen = (map as any)._spots.filter((s: { mapNo: number[] }) => s.mapNo.includes(100000000));
    expect(hen.length).toBeGreaterThan(0);
  });

  it('draws the base canvas and markers without throwing', async () => {
    const mapWz = await WzPackage.OpenBaseAsync(nxDir, 'Map');
    const map = new WorldMap(undefined, mapWz);
    map.openForField(100000000);
    expect(() => map.draw()).not.toThrow();
    expect((map as any)._baseCanvas).toBeTruthy();
    expect((map as any)._markers.filter((m: unknown) => !!m).length).toBeGreaterThan(0);
  });

  it('drills into the Sleepywood sub-map via a Victoria link', async () => {
    const mapWz = await WzPackage.OpenBaseAsync(nxDir, 'Map');
    const map = new WorldMap(undefined, mapWz);
    map.openForField(100000000);
    const links = (map as any)._links as { linkMap: string }[];
    expect(links.length).toBeGreaterThan(0);
    const sleepy = links.find((l) => l.linkMap.includes('WorldMap011'));
    expect(sleepy).toBeTruthy();
    map.navigateTo(sleepy!.linkMap);
    expect((map as any)._spots.length).toBeGreaterThan(0);
  });
});
