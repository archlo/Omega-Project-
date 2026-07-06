import { describe, expect, it } from 'vitest';
import { MobLook } from '../../src/character/MobLook.js';

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
});
