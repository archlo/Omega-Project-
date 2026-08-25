import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Container, Sprite } from 'pixi.js';
import { WzPackage } from '../../src/wz/WzPackage.js';
import { WzCanvas } from '../../src/wz/WzCanvas.js';
import { WzProperty } from '../../src/wz/WzProperty.js';
import { FieldScene } from '../../src/map/FieldScene.js';
import { GameCamera } from '../../src/map/GameCamera.js';

const nxDir = process.env.MAPLECLAUDE_NX_DIR ?? 'wz_client';
const mapPath = join(nxDir, 'Map.nx');

// Texture-less loader shim: hands back origin-carrying fake sprites so
// LoadAnimation builds real frame lists from the NX canvases.
const stubLoader = {
  Load: () => ({
    Texture: {} as never,
    OriginX: 0,
    OriginY: 0,
    Width: 10,
    Height: 10,
    width: 10,
    height: 10,
    ToPixi: () => new Sprite(),
  }),
  LoadAnimation(node: unknown): unknown {
    // Mirror WzTextureLoader.LoadAnimation's frame walk with fake sprites.
    if (node instanceof WzCanvas) return { FrameCount: 1, Draw: () => new Sprite() };
    const frames = typeof (node as { Get?: unknown })?.Get === 'function'
      ? (() => {
        let n = 0;
        const p = node as { Get(k: string): unknown };
        while (p.Get(String(n)) instanceof WzCanvas) n++;
        return n;
      })()
      : 0;
    return frames > 0 ? { FrameCount: frames, Draw: () => new Sprite() } : null;
  },
} as any;

function makeScene(): FieldScene {
  const mapWz = WzPackage.Open(mapPath);
  return new FieldScene(mapWz, stubLoader, new GameCamera());
}

describe.skipIf(!existsSync(mapPath))('FieldScene map composition (real Map.nx)', () => {
  it('loads tiles and objs for Henesys (100000000)', () => {
    const scene = makeScene();
    scene.Load(100000000);
    expect(scene.LoadedMapId).toBe(100000000);
    const anyTile = (scene as any)._tileLayers.some((l: unknown[]) => l.length > 0);
    const anyObj = (scene as any)._objLayers.some((l: unknown[]) => l.length > 0);
    expect(anyTile).toBe(true);
    expect(anyObj).toBe(true);
  });

  it('renders animated tiles from Tile/<tS>.img/<u>/<no> frame containers', () => {
    const mapWz = WzPackage.Open(mapPath);
    // 1) Collect distinct tS values actually referenced by maps (TS reader).
    const tsUsed = new Map<string, number>(); // tS -> a map id using it
    const mapDir = mapWz.GetItem('Map');
    if (!(mapDir instanceof WzProperty)) return;
    for (const [, dirVal] of Object.entries(mapDir.Items ?? {})) {
      if (!(dirVal instanceof WzProperty)) continue;
      for (const [imgName, imgVal] of Object.entries(dirVal.Items ?? {})) {
        if (!imgName.endsWith('.img')) continue;
        for (let l = 0; l < 8; l++) {
          const lp = (imgVal as WzProperty).Get(String(l));
          if (!(lp instanceof WzProperty)) continue;
          const info = lp.Get('info');
          const tS = info instanceof WzProperty ? (info.Get('tS') as string | null) : null;
          if (typeof tS === 'string' && !tsUsed.has(tS)) {
            tsUsed.set(tS, parseInt(imgName.replace('.img', ''), 10));
            break;
          }
        }
      }
    }
    expect(tsUsed.size).toBeGreaterThan(20);

    // 2) A tS is "animated" when some referenced u/no node is a frame
    //    container instead of a canvas.
    let animatedTs: string | null = null;
    for (const tS of tsUsed.keys()) {
      const tileImg = mapWz.GetItem(`Tile/${tS}.img`);
      if (!(tileImg instanceof WzProperty)) continue;
      for (const [, uNode] of Object.entries(tileImg.Items ?? {})) {
        if (!(uNode instanceof WzProperty)) continue;
        for (const [noName, noNode] of Object.entries(uNode.Items ?? {})) {
          if (/^\d+$/.test(noName) && noNode instanceof WzProperty) {
            animatedTs = tS; // frame container, not a canvas → animated tile
            break;
          }
        }
        if (animatedTs) break;
      }
      if (animatedTs) break;
    }

    // 3) Load one map using that tS and assert its tiles came out animated.
    expect(animatedTs, 'no animated tile set found among used tS values').toBeTruthy();
    const scene = makeScene();
    scene.Load(tsUsed.get(animatedTs!)!);
    let animatedTiles = 0;
    for (const layer of (scene as any)._tileLayers as { anim: { FrameCount: number } }[][]) {
      animatedTiles += layer.filter((t) => t.anim && t.anim.FrameCount > 1).length;
    }
    expect(animatedTiles, `map ${tsUsed.get(animatedTs!)} uses ${animatedTs} but resolved no animated tiles`).toBeGreaterThan(0);
  });

  it('sorts objs by z sub-key then Y within a layer', () => {
    const scene = makeScene();
    scene.Load(100000000);
    for (const layer of (scene as any)._objLayers as { info: { Z: number; Y: number } }[][]) {
      for (let i = 1; i < layer.length; i++) {
        const prev = layer[i - 1].info;
        const cur = layer[i].info;
        expect(prev.Z < cur.Z || (prev.Z === cur.Z && prev.Y <= cur.Y)).toBe(true);
      }
    }
  });

  it('does not double-load obj layers into the MapScene backdrop', () => {
    const mapWz = WzPackage.Open(mapPath);
    const scene = new FieldScene(mapWz, stubLoader, new GameCamera());
    scene.Load(100000000);
    // FieldScene disables MapScene's own obj pass — objects live only in
    // _objLayers now.
    expect((scene as any)._mapScene._layer0Objects.length).toBe(0);
  });
});
