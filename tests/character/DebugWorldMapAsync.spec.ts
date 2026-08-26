import { describe, expect, it } from 'vitest';
import { WzPackage } from '../../src/wz/WzPackage.js';

const nxDir = process.env.MAPLECLAUDE_NX_DIR ?? 'wz_client';

describe('debug: async Map.nx worldmap probes', () => {
  it('OpenBaseAsync resolves WorldMap props like the sync loader', async () => {
    const mapWz = await WzPackage.OpenBaseAsync(nxDir, 'Map');
    const p010 = mapWz.GetItem('WorldMap/WorldMap010.img');
    console.log('WorldMap010.img type:', p010?.constructor?.name);
    const helper = mapWz.GetItem('MapHelper.img/worldMap/mapImage/0');
    console.log('marker type:', helper?.constructor?.name);
    expect(p010).toBeTruthy();
  });
});
