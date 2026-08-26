import { describe, expect, it } from 'vitest';
import { WorldMap } from '../../../src/ui/game/WorldMap.js';
import { WzPackage } from '../../../src/wz/WzPackage.js';
import { WzTextureLoader } from '../../../src/render/WzTextureLoader.js';

const nxDir = process.env.MAPLECLAUDE_NX_DIR ?? '';

describe.skipIf(!nxDir)('WorldMap (real Map.nx)', () => {
  it('opens the deepest world map for field 100000000 (Henesys)', () => {
    const mapWz = WzPackage.Open(`${nxDir}/Map.nx`);
    const map = new WorldMap(new WzTextureLoader(), mapWz);

    map.openForField(100000000);
    expect(map.isVisible).toBe(true);
    // Victoria lists 97 spots (real Map.nx count).
    expect((map as any)._spots.length).toBe(97);
    // Spots carry Henesys 100000000 in mapNo.
    const hen = (map as any)._spots.filter((s: { mapNo: number[] }) => s.mapNo.includes(100000000));
    expect(hen.length).toBeGreaterThan(0);
  });

  it('draws the base canvas and markers without throwing', () => {
    const mapWz = WzPackage.Open(`${nxDir}/Map.nx`);
    const map = new WorldMap(new WzTextureLoader(), mapWz);
    map.openForField(100000000);
    expect(() => map.draw()).not.toThrow();
    expect((map as any)._baseCanvas).toBeTruthy();
    expect((map as any)._markers.filter((m: unknown) => !!m).length).toBeGreaterThan(0);
  });

  it('drills into the Sleepywood sub-map via a Victoria link', () => {
    const mapWz = WzPackage.Open(`${nxDir}/Map.nx`);
    const map = new WorldMap(new WzTextureLoader(), mapWz);
    map.openForField(100000000);
    const links = (map as any)._links as { linkMap: string }[];
    expect(links.length).toBe(3);
    const sleepy = links.find((l) => l.linkMap.includes('WorldMap011'));
    expect(sleepy).toBeTruthy();
    map.navigateTo(sleepy!.linkMap);
    expect((map as any)._spots.length).toBeGreaterThan(0);
  });

  it('falls back to the whole-world WorldMap.img for unmapped fields (Free Market)', () => {
    const mapWz = WzPackage.Open(`${nxDir}/Map.nx`);
    const map = new WorldMap(new WzTextureLoader(), mapWz);
    // Free Market rooms aren't listed by any regional WorldMap###.img.
    map.openForField(910000000);
    expect(map.isVisible).toBe(true);
    expect((map as any)._baseCanvas).toBeTruthy();
    expect((map as any)._spots.length).toBeGreaterThan(0);
  });
});
