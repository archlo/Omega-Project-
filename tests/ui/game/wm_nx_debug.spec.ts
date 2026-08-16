import { describe, it } from 'vitest';
import { WorldMap } from '../../../src/ui/game/WorldMap.js';
import { WzPackage } from '../../../src/wz/WzPackage.js';
import { WzImage } from '../../../src/wz/WzImage.js';
import { WzProperty } from '../../../src/wz/WzProperty.js';

const nxDir = process.env.MAPLECLAUDE_NX_DIR ?? '';

describe.skipIf(!nxDir)('wm real nx debug', () => {
  it('traces', async () => {
    const mapWz = await WzPackage.OpenBaseAsync(nxDir, 'Map');
    const root = mapWz.Root;
    console.log('root items:', Object.keys(root.Items).filter((k) => k.toLowerCase().includes('world')).slice(0, 20));
    const wm = root.GetItem('WorldMap');
    console.log('root WorldMap?', !!wm, 'ctor', (wm as any)?.constructor?.name);
    if (wm) {
      console.log('WorldMap items:', Object.keys((wm as any).Items).slice(0, 10));
      const img = (wm as any).GetItem('WorldMap010.img');
      console.log('WorldMap/WorldMap010.img via dir:', !!img, 'ctor', img?.constructor?.name);
    }
    const gi = mapWz.GetItem('WorldMap/WorldMap010.img');
    console.log('getItem WorldMap010.img:', !!gi, 'isImg?', gi instanceof WzImage, 'ctor', (gi as any)?.constructor?.name);
    if (!(gi instanceof WzImage)) return;
    const root = gi.Root;
    console.log('root children:', Object.keys(root.Items).slice(0, 10));
    const ml = root.Get('MapList');
    console.log('MapList?', ml instanceof WzProperty, 'keys', ml instanceof WzProperty ? Object.keys(ml.Items).slice(0, 5) : '');
    if (ml instanceof WzProperty) {
      const it0 = ml.Get('0');
      console.log('MapList/0?', it0 instanceof WzProperty, 'keys', it0 instanceof WzProperty ? Object.keys(it0.Items) : '');
      if (it0 instanceof WzProperty) {
        const mn = it0.Get('mapNo');
        console.log('mapNo?', mn instanceof WzProperty);
        if (mn instanceof WzProperty) {
          console.log('mapNo keys', Object.keys(mn.Items).slice(0, 8));
          console.log('mapNo[0]', mn.Get('0'), typeof mn.Get('0'));
        }
      }
    }
    const bi = root.GetItem('BaseImg/0');
    console.log('BaseImg/0:', !!bi, 'ctor', (bi as any)?.constructor?.name);

    const map: any = new WorldMap(undefined, mapWz);
    const deepest = map._findDeepestWorldMap(100000000);
    console.log('deepest?', !!deepest);
    map.openForField(100000000);
    console.log('after open: spots', map._spots.length, 'links', map._links.length, 'base', !!map._baseCanvas, 'origin', JSON.stringify(map._mainOrigin));
  });
});
