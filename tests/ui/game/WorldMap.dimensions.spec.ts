/**
 * Diagnostic: verify all hardcoded constants in WorldMap.ts against real NX data.
 * Run with: npx vitest run tests/ui/game/WorldMap.dimensions.spec.ts
 * Requires: MAPLECLAUDE_NX_DIR env pointing at wz_client/
 */
import { describe, it, expect } from 'vitest';
import { WzPackage } from '../../../src/wz/WzPackage.js';
import { WzImage } from '../../../src/wz/WzImage.js';
import { WzProperty } from '../../../src/wz/WzProperty.js';
import { WzCanvas } from '../../../src/wz/WzCanvas.js';
import { WzVector } from '../../../src/wz/WzVector.js';

const nxDir = process.env.MAPLECLAUDE_NX_DIR ?? '';

/** Helper: read a canvas child's width/height/origin from a WZ property. */
function canvasInfo(parent: WzProperty, name: string): { w: number; h: number; ox: number; oy: number } | null {
  // NOTE: Get() is direct-child only — slash paths need GetItem().
  const node = parent.GetItem(name);
  if (!(node instanceof WzCanvas)) return null;
  let ox = 0, oy = 0;
  const prop = node.Property;
  if (prop) {
    const o = prop.Get('origin');
    if (o instanceof WzVector) { ox = o.X; oy = o.Y; }
  }
  return { w: node.Width, h: node.Height, ox, oy };
}

describe.skipIf(!nxDir)('WorldMap NX data diagnostics', () => {
  const mapWz = WzPackage.Open(`${nxDir}/Map.nx`);
  const uiWz = WzPackage.Open(`${nxDir}/UI.nx`);

  it('WorldMap010 BaseImg/0 dimensions', () => {
    const wm = getWorldMap('010');
    expect(wm).not.toBeNull();
    const base = canvasInfo(wm!, 'BaseImg/0');
    expect(base).not.toBeNull();
    console.log('BaseImg/0:', base);
    // Victoria base should be 640x470 with origin (320,235) per prior NX dump
    expect(base!.w).toBe(640);
    expect(base!.h).toBe(470);
    expect(base!.ox).toBe(320);
    expect(base!.oy).toBe(235);
  });

  it('WorldMap010 MapList spot count', () => {
    const wm = getWorldMap('010');
    const mapList = wm?.Get('MapList');
    expect(mapList).toBeInstanceOf(WzProperty);
    const count = Object.keys((mapList as WzProperty).Items).length;
    console.log('MapList count:', count);
    expect(count).toBe(97); // Victoria spots
  });

  it('UIWindow2.img/WorldMap border slice dimensions', () => {
    const wmNode = uiWz.GetItem('UIWindow2.img/WorldMap');
    expect(wmNode).toBeInstanceOf(WzProperty);
    const border = (wmNode as WzProperty).Get('Border');
    expect(border).toBeInstanceOf(WzProperty);

    const expectedDims: Record<number, { w: number; h: number }> = {
      0: { w: 64, h: 27 },  // TL corner
      1: { w: 1,  h: 27 },  // Left edge
      2: { w: 64, h: 27 },  // TR corner
      3: { w: 64, h: 1 },   // Top edge
      4: { w: 64, h: 1 },   // Bottom edge
      5: { w: 64, h: 27 },  // BL corner
      6: { w: 1,  h: 27 },  // Right edge
      7: { w: 64, h: 27 },  // BR corner
    };

    for (let i = 0; i < 8; i++) {
      const info = canvasInfo(border as WzProperty, String(i));
      console.log(`Border/${i}:`, info);
      expect(info).not.toBeNull();
      expect(info!.w).toBe(expectedDims[i].w);
      expect(info!.h).toBe(expectedDims[i].h);
    }
  });

  it('UIWindow2.img/WorldMap/title dimensions', () => {
    const wmNode = uiWz.GetItem('UIWindow2.img/WorldMap');
    const title = canvasInfo(wmNode as WzProperty, 'title');
    console.log('title:', title);
    expect(title).not.toBeNull();
    // Title should be around 57x15 centered in the border
    expect(title!.w).toBeGreaterThan(0);
    expect(title!.h).toBeGreaterThan(0);
  });

  it('MapHelper marker dimensions', () => {
    for (let t = 0; t < 4; t++) {
      const node = mapWz.GetItem(`MapHelper.img/worldMap/mapImage/${t}`);
      if (node instanceof WzCanvas) {
        console.log(`marker ${t}: ${node.Width}x${node.Height}`);
        expect(node.Width).toBeGreaterThan(0);
        expect(node.Height).toBeGreaterThan(0);
      }
    }
  });

  it('Check WorldMap border loads from UI.nx (critical path)', () => {
    const wmNode = uiWz.GetItem('UIWindow2.img/WorldMap');
    expect(wmNode).toBeInstanceOf(WzProperty);
    const border = (wmNode as WzProperty).Get('Border');
    expect(border).toBeInstanceOf(WzProperty);
    for (let i = 0; i < 8; i++) {
      const node = (border as WzProperty).Get(String(i));
      expect(node).toBeInstanceOf(WzCanvas);
    }
  });

  it('Verify world-wide WorldMap.img (root map) loads', () => {
    const root = mapWz.GetItem('WorldMap/WorldMap.img');
    expect(root).toBeTruthy();
    const base = root instanceof WzImage ? canvasInfo(root.Root, 'BaseImg/0') : null;
    console.log('WorldMap.img BaseImg/0:', base);
  });

  it('Log first MapList entry structure for Victoria', () => {
    const wm = getWorldMap('010');
    const mapList = wm?.Get('MapList');
    if (mapList instanceof WzProperty) {
      const keys = Object.keys(mapList.Items);
      const first = mapList.Get(keys[0]);
      if (first instanceof WzProperty) {
        const spot = first.Get('spot');
        const type = first.Get('type');
        const mapNo = first.Get('mapNo');
        console.log('First MapList entry:', {
          type: type,
          spot: spot instanceof WzVector ? { x: spot.X, y: spot.Y } : spot,
          mapNo: mapNo instanceof WzProperty ? Object.keys(mapNo.Items).map(k => mapNo.Get(k)) : mapNo,
        });
      }
    }
  });

  function getWorldMap(name: string): WzProperty | null {
    const path = `WorldMap/WorldMap${name}.img`;
    const item = mapWz.GetItem(path);
    if (item instanceof WzImage) return item.Root;
    if (item instanceof WzProperty) return item;
    return null;
  }
});
