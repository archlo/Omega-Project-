import { describe, expect, it } from 'vitest';
import { TombstoneEffect } from '../../src/character/TombstoneEffect.js';
import { WzTextureLoader } from '../../src/render/WzTextureLoader.js';

// OG: CUser::OnSetDead @0x8E4250 — the tomb is created at (x, y-600) then
// dropped to the character's ground point (x, y) over 440ms:
//   RelMove(bDyingNow, x, y - 600)          place up in the sky
//   RelMove(bDyingNow, x, y, now + 440)     linear fall to the ground
describe('TombstoneEffect sky-to-ground drop', () => {
  function tombAt(x: number, y: number): TombstoneEffect {
    const t = new TombstoneEffect(null, null, new WzTextureLoader(), null);
    t.Spawn({ x, y });
    return t;
  }

  it('starts 600px above the character ground point', () => {
    const t = tombAt(100, 300);
    // no WZ frames → it lands immediately; verify the recorded drop endpoints
    expect(t['_landingY']).toBe(300);
    expect(t['_fallFromY']).toBe(-300);
    expect(t['_world'].y).toBe(300); // landed (empty fall frames)
  });

  it('interpolates the tomb world-y from y-600 down to y over 440ms', () => {
    const t = tombAt(100, 300);
    // rewind to the falling state with a long fall frame so it stays airborne
    (t as any)._fellDown = false;
    (t as any)._fallElapsedMs = 0;
    (t as any)._world.y = (t as any)._fallFromY;
    (t as any)._fallFrames = [{ delayMs: 1e9 }];

    t.Update(0.22); // 220ms → halfway
    expect((t as any)._world.y).toBeCloseTo(0);

    t.Update(0.22); // 440ms → on the ground, still falling (frame not done)
    expect((t as any)._world.y).toBe(300);

    t.Update(0.5); // position clamped to the ground
    expect((t as any)._world.y).toBe(300);
  });

  it('lands on the ground point exactly when the fall completes', () => {
    const t = tombAt(100, 300);
    (t as any)._fellDown = false;
    (t as any)._fallElapsedMs = 0;
    (t as any)._world.y = (t as any)._fallFromY;
    (t as any)._fallFrames = [{ delayMs: 100 }];

    t.Update(0.1); // 100ms → falls to ground, then frame delay elapses → land
    expect(t.Landed).toBe(true);
    expect((t as any)._world.y).toBe(300);
  });
});