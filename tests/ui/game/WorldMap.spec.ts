import { describe, expect, it } from 'vitest';
import { WorldMap } from '../../../src/ui/game/WorldMap.js';
import { WzImage } from '../../../src/wz/WzImage.js';
import { WzProperty } from '../../../src/wz/WzProperty.js';
import { WzCanvas } from '../../../src/wz/WzCanvas.js';
import type { WzPackage } from '../../../src/wz/WzPackage.js';

function sprite(originX = 0, originY = 0, width = 20, height = 20) {
  return {
    OriginX: originX,
    OriginY: originY,
    Width: width,
    Height: height,
    NewSprite: () => ({ anchor: { set: () => {} }, x: 0, y: 0, scale: {} }),
  };
}

// Base canvas origin (320,235) matches the real v95 WorldMap/WorldMap###.img
// BaseImg/0 canvases. Marker width (20) is the real mapImage/0 size.
const loader: any = { Load: () => sprite(320, 235, 20, 20) };

function mapImage(root: Record<string, unknown>): WzImage {
  const img = new WzImage(null as any, 0);
  (img as any)._root = new WzProperty(null as any, 0, root);
  return img;
}

function mapListItem(spotX: number, spotY: number, type: number, mapNo: number[]): WzProperty {
  return new WzProperty(null as any, 0, {
    spot: { X: spotX, Y: spotY },
    type,
    mapNo: new WzProperty(null as any, 0, Object.fromEntries(mapNo.map((m, i) => [String(i), m]))),
  });
}

function packageOf(images: Record<string, WzImage>): WzPackage {
  return { GetItem: (path: string) => images[path] ?? null } as unknown as WzPackage;
}

function canvas(): WzCanvas {
  return new WzCanvas(null as any, 0) as any;
}

function linkNode(linkMap: string): WzProperty {
  return new WzProperty(null as any, 0, {
    link: new WzProperty(null as any, 0, {
      linkImg: canvas(),
      linkMap,
    }),
    toolTip: `go ${linkMap}`,
  });
}

describe('WorldMap (CWorldMapDlg)', () => {
  it('clicks map-transfer rows through the panel input path', () => {
    const map = new WorldMap();
    let selected = 0;
    map.onTeleportToMap = (mapId) => { selected = mapId; };

    map.OpenMapTransfer([100000000, 200000000]);
    expect(map.handleMouseButton(31, 49, true)).toBe(true);

    expect(selected).toBe(100000000);
    expect(map.isVisible).toBe(false);
  });

  describe('openForField / GetDeepestWorldMap', () => {
    function worldMapPackage() {
      return packageOf({
        'WorldMap/WorldMap000.img': mapImage({
          BaseImg: new WzProperty(null as any, 0, { '0': canvas() }),
          MapList: new WzProperty(null as any, 0, {
            '0': mapListItem(-175, -155, 3, [0, 10000, 20000]),
          }),
          info: new WzProperty(null as any, 0, {}),
        }),
        'WorldMap/WorldMap010.img': mapImage({
          BaseImg: new WzProperty(null as any, 0, { '0': canvas() }),
          MapList: new WzProperty(null as any, 0, {
            '0': mapListItem(-78, 73, 0, [100000000]),
            '1': mapListItem(40, 120, 1, [104000000]),
          }),
          MapLink: new WzProperty(null as any, 0, {
            '0': linkNode('WorldMap011'),
          }),
          info: new WzProperty(null as any, 0, {}),
        }),
        'WorldMap/WorldMap011.img': mapImage({
          BaseImg: new WzProperty(null as any, 0, { '0': canvas() }),
          MapList: new WzProperty(null as any, 0, {
            '0': mapListItem(-30, 50, 2, [105000000]),
          }),
          info: new WzProperty(null as any, 0, {}),
        }),
        'WorldMap/WorldMap140.img': mapImage({
          BaseImg: new WzProperty(null as any, 0, { '0': canvas() }),
          MapList: new WzProperty(null as any, 0, {
            '0': mapListItem(0, 0, 0, [999999999]),
          }),
          info: new WzProperty(null as any, 0, {}),
        }),
      });
    }

    it('resolves the deepest regional map containing the field', () => {
      const map = new WorldMap(loader, worldMapPackage());
      map.openForField(100000000);
      expect(map.isVisible).toBe(true);
      // WorldMap010 holds field 100000000; spot 0 at (-78, 73) → nX=-78+320=242,
      // nY=73+235=308; marker origin pixel lands at (nX+13, nY+24)=(255,332).
      expect(map.handleMouseButton(242 + 13, 308 + 24, true)).toBe(true);
    });

    it('uses the fallback probe (WorldMap140-142) when no named map holds the field', () => {
      const map = new WorldMap(loader, worldMapPackage());
      map.openForField(999999999);
      expect(map.isVisible).toBe(true);
      // Spot 0 at (0,0) → nX=320, nY=235 → origin pixel at (333,259).
      expect(map.handleMouseButton(320 + 13, 235 + 24, true)).toBe(true);
    });

    it('falls back to an empty map when nothing contains the field', () => {
      const map = new WorldMap(loader, worldMapPackage());
      map.openForField(123456789);
      expect(map.isVisible).toBe(true);
      expect(map.handleMouseButton(400, 300, true)).toBe(true);
    });

    it('skips reload when the same field is re-opened', () => {
      const map = new WorldMap(loader, worldMapPackage());
      map.openForField(100000000);
      map.openForField(100000000);
      expect(map.isVisible).toBe(true);
    });
  });

  describe('link navigation', () => {
    function pkg() {
      return packageOf({
        'WorldMap/WorldMap010.img': mapImage({
          BaseImg: new WzProperty(null as any, 0, { '0': canvas() }),
          MapList: new WzProperty(null as any, 0, {
            '0': mapListItem(-78, 73, 0, [100000000]),
          }),
          MapLink: new WzProperty(null as any, 0, {
            '0': linkNode('WorldMap011'),
          }),
          info: new WzProperty(null as any, 0, {}),
        }),
        'WorldMap/WorldMap011.img': mapImage({
          BaseImg: new WzProperty(null as any, 0, { '0': canvas() }),
          MapList: new WzProperty(null as any, 0, {
            '0': mapListItem(-30, 50, 2, [105000000]),
          }),
          info: new WzProperty(null as any, 0, {}),
        }),
      });
    }

    it('fires onNavigateToMap and drills into the linked map on link click', () => {
      const map = new WorldMap(loader, pkg());
      let nav: string | null = null;
      map.onNavigateToMap = (name) => { nav = name; };
      map.openForField(100000000);

      // Link image is origin-anchored at the base origin (320+13, 235+24)=(333,259)
      // and drawn from its stubbed sprite origin (320,235) size 20x20 → rect (13..33,24..44).
      expect(map.handleMouseButton(20, 30, true)).toBe(true);
      expect(nav).toBe('WorldMap011');

      // After navigating to WorldMap011, clicking its spot selects it (no teleport).
      // Spot 0 at (-30,50) → nX=290, nY=285 → origin pixel at (303,309).
      expect(map.handleMouseButton(290 + 13, 285 + 24, true)).toBe(true);
    });
  });
});
