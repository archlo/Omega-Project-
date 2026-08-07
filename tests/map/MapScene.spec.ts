import { describe, expect, it } from 'vitest';
import { Texture, BufferImageSource } from 'pixi.js';
import { MapScene } from '../../src/map/MapScene.js';
import { WzSprite } from '../../src/render/WzSprite.js';
import { BackInfo } from '../../src/map/BackInfo.js';
import { BackType } from '../../src/map/BackType.js';

// Seamless auto-scroll loop for moving backgrounds (HMoveA/B, VMoveA/B).
// OG CMapLoadable::MakeGrid lays tiles at `bx + i*period` and animates the
// layer offset; tiles must slide continuously and never snap back a period.
function spriteOf(width: number, height: number): WzSprite {
  const src = new BufferImageSource({
    data: new Uint8Array(width * height * 4),
    width,
    height,
  });
  return new WzSprite(new Texture(src));
}

function hmoveBackdrop(cx: number): BackInfo {
  const info = new BackInfo();
  info.Bs = 'grassySoil'; info.No = 1; info.Type = BackType.HMoveA;
  info.X = 0; info.Y = 200; info.Cx = cx; info.Cy = 0;
  return info;
}

function makeScene(): MapScene {
  const scene = new MapScene(null as any, null as any);
  (scene as any).ParallaxEnabled = true;
  (scene as any)._screenW = 800;
  (scene as any)._screenH = 600;
  return scene;
}

describe('MapScene auto-scroll seamless loop', () => {
  it('HMoveA cloud tiles slide continuously with no period snap', () => {
    const scene = makeScene() as any;
    scene._backgrounds = [{ info: hmoveBackdrop(128), sprite: spriteOf(128, 64), anim: null }];

    let prevXs: number[] = [];
    for (let t = 0; t < 400; t++) {
      scene.update(1000 / 60); // ~0.5px scroll per frame at 30px/s
      scene._rebuildDisplay();
      const xs = scene.container.children.map((c: any) => c.x as number).sort((a, b) => a - b);
      if (prevXs.length) {
        for (let i = 0; i < xs.length; i++) {
          const prev = prevXs[i];
          if (prev === undefined) continue;
          const delta = xs[i] - prev;
          // ~0.5px continuous slide, or exactly one period for a newly-entered tile.
          const continuous = Math.abs(delta + 0.5) < 0.01;
          const wrappedIn = Math.abs(delta - (128 - 0.5)) < 0.01;
          expect(continuous || wrappedIn, `tile ${i} snapped (d=${delta}) at t=${t}`).toBe(true);
        }
      }
      prevXs = xs;
    }
  });

  it('tile positions keep the viewport covered across many wraps', () => {
    const scene = makeScene() as any;
    scene._backgrounds = [{ info: hmoveBackdrop(128), sprite: spriteOf(128, 64), anim: null }];

    for (let t = 0; t < 400; t++) {
      scene.update(1000 / 60);
      scene._rebuildDisplay();
      const xs = scene.container.children.map((c: any) => c.x as number).sort((a, b) => a - b);
      const left = xs[0];
      const right = xs[xs.length - 1] + 128;
      expect(left, `left gap at t=${t}`).toBeLessThanOrEqual(0);
      expect(right, `right gap at t=${t}`).toBeGreaterThanOrEqual(800);
    }
  });

  it('HMoveB scrolls right instead of left', () => {
    const scene = makeScene() as any;
    const info = hmoveBackdrop(128);
    info.Type = BackType.HMoveB;
    scene._backgrounds = [{ info, sprite: spriteOf(128, 64), anim: null }];
    scene._rebuildDisplay();
    const before = scene.container.children.map((c: any) => c.x as number).sort((a, b) => a - b);
    scene.update(1000 / 60);
    scene._rebuildDisplay();
    const after = scene.container.children.map((c: any) => c.x as number).sort((a, b) => a - b);
    expect(after[0]).toBeGreaterThan(before[0]);
  });
});
