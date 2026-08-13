import { describe, expect, it, vi } from 'vitest';
import { MobLook } from '../../src/character/MobLook.js';
import { WzImage } from '../../src/wz/WzImage.js';
import { WzProperty } from '../../src/wz/WzProperty.js';
import { WzCanvas } from '../../src/wz/WzCanvas.js';

describe('MobLook anchors', () => {
  it('falls back to the old placeholder head position without WZ frames', () => {
    const mob = new MobLook(1, 100100);
    mob.Position = { x: 30, y: 200 };

    expect(mob.HeadPosition).toEqual({ x: 30, y: 150 });
  });

  it('uses the current WZ frame top when available', () => {
    const mob = new MobLook(1, 100100);
    mob.Position = { x: 30, y: 200 };
    (mob as any)._anims.set(0, [{ sprite: { Lt: { x: -20, y: -83 }, Rb: { x: 40, y: 5 }, OriginX: 0, OriginY: 0, Width: 60, Height: 88 }, delayMs: 100 }]);

    expect(mob.HeadPosition).toEqual({ x: 40, y: 117 });
  });

  it('mirrors the frame center when facing left', () => {
    const mob = new MobLook(1, 100100);
    mob.Position = { x: 30, y: 200 };
    (mob as any)._anims.set(0, [{ sprite: { Lt: { x: -20, y: -83 }, Rb: { x: 40, y: 5 }, OriginX: 0, OriginY: 0, Width: 60, Height: 88 }, delayMs: 100 }]);
    mob.SetFacing(true);

    expect(mob.HeadPosition).toEqual({ x: 20, y: 117 });
  });

  it('follows the info/link redirect when the template img has no animation states', () => {
    // Template 100000 (0100000.img) only carries info/link = "0100100" — its
    // stand/move/hit/die states live in the linked 0100100.img (Snail).
    const loader = {
      Load: (raw: WzCanvas) => ({ raw, Width: 37, Height: 26, OriginX: 18, OriginY: 26 }),
    } as any;

    const stubWz = {
      GetItem: (path: string) => {
        if (path === '0100000.img') {
          const img = new WzImage(null as any, 0);
          (img as any)._root = new WzProperty(null as any, 0, { info: new WzProperty(null as any, 0, { link: '0100100' }) });
          return img;
        }
        if (path === '0100100.img') {
          const img = new WzImage(null as any, 0);
          (img as any)._root = new WzProperty(null as any, 0, {
            info: new WzProperty(null as any, 0, {}),
            stand: new WzProperty(null as any, 0, { '0': new WzCanvas(null as any, 0) }),
            move: new WzProperty(null as any, 0, { '0': new WzCanvas(null as any, 0) }),
          });
          return img;
        }
        return null;
      },
    };

    const mob = new MobLook(1, 100000);
    mob.Load(loader, stubWz as any);

    expect((mob as any)._loaded).toBe(true);
    // stand + move states loaded from the linked img
    expect((mob as any)._anims.size).toBe(2);
  });

  it('leaves _loaded false when the link target is also missing animation states', () => {
    const loader = { Load: (raw: WzCanvas) => ({ raw, Width: 37, Height: 26, OriginX: 18, OriginY: 26 }) } as any;
    const stubWz = {
      GetItem: (path: string) => {
        if (path === '0100000.img') {
          const img = new WzImage(null as any, 0);
          (img as any)._root = new WzProperty(null as any, 0, { info: new WzProperty(null as any, 0, { link: '0100999' }) });
          return img;
        }
        return null;
      },
    };

    const mob = new MobLook(1, 100000);
    mob.Load(loader, stubWz as any);

    expect((mob as any)._loaded).toBe(false);
    expect((mob as any)._anims.size).toBe(0);
  });

  it('RevealLabel shows the HP bar + name tag only once', () => {
    const mob = new MobLook(1, 100100);
    expect((mob as any)._showLabel).toBe(false);

    mob.RevealLabel();
    expect((mob as any)._showLabel).toBe(true);

    const updateSpy = vi.spyOn(mob as any, '_updateDisplay');
    mob.RevealLabel();
    expect(updateSpy).not.toHaveBeenCalled();
  });
});
