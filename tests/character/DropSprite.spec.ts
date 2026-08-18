import { describe, it, expect } from 'vitest';
import { DropSprite } from '../../src/character/DropSprite.js';

// OG: CAnimationDisplayer::ABSORBITEM::Update (0x441650) — pickup flight
// 700ms; X/Y lerp linearly drop→target; arc term 11488774560*(v16-350)²>>45
// (40 at the ends, 0 mid-flight) lifts the drop 40px at the halfway point;
// alpha holds 255 until 420ms then fades 255→63 over the last 280ms.
describe('DropSprite.StartAbsorb', () => {
  it('finishes after 700ms, landing on the target on the last animated tick', () => {
    const drop = new DropSprite(1, false, 2000000, { x: 0, y: 0 }, { x: 0, y: 0 }, false);
    drop.Position = { x: 100, y: 100 };
    drop.StartAbsorb(() => ({ x: 200, y: 0 }));

    // 699ms is the last tick that updates position (OG: v16 >= 700 finishes
    // before recomputing). x = (200*699 + 100*(700-699))/700 = 199.857.
    drop.Update(0.699);
    expect(drop.Finished).toBe(false);
    expect(drop.Position.x).toBeCloseTo(199.857, 1);
    // y = linear_y(699) + arc(699) - 40; arc = 39.78, linear_y = 0.143 → ≈ 0
    expect(drop.Position.y).toBeCloseTo(0, 0);

    drop.Update(0.001); // total 700ms → finishes, no further position update
    expect(drop.Finished).toBe(true);
  });

  it('follows the 40px mid-flight arc (rises at the halfway point)', () => {
    const drop = new DropSprite(2, false, 2000000, { x: 0, y: 0 }, { x: 0, y: 0 }, false);
    drop.Position = { x: 0, y: 100 };
    drop.StartAbsorb(() => ({ x: 200, y: 100 }));

    // 350ms = exact mid-flight: arc term = 0, -40 offset lifts the drop.
    drop.Update(0.35);
    expect(drop.Finished).toBe(false);
    expect(drop.Position.x).toBeCloseTo(100, 1); // linear midpoint
    expect(drop.Position.y).toBeCloseTo(100 - 40, 1); // lifted 40px
  });

  it('holds full alpha for the first 420ms then fades toward 63/255 by 700ms', () => {
    const drop = new DropSprite(3, false, 2000000, { x: 0, y: 0 }, { x: 0, y: 0 }, false);
    drop.Position = { x: 0, y: 0 };
    drop.StartAbsorb(() => ({ x: 100, y: 0 }));

    drop.Update(0.42); // at exactly 420ms alpha is still 255
    expect(drop.Finished).toBe(false);
    expect((drop as any)._alpha).toBeCloseTo(1, 3);

    // 500ms (v16=500): alpha = (192*(420-500)/280 + 255)/255 ≈ 200/255
    drop.Update(0.08);
    expect((drop as any)._alpha).toBeCloseTo(200 / 255, 3);

    // 699ms (last animated tick): alpha = (floor(192*(420-699)/280) + 255)/255
    drop.Update(0.199);
    const v16 = 699;
    const expectedAlpha = (Math.floor((192 * (420 - v16)) / 280) + 255) / 255;
    expect((drop as any)._alpha).toBeCloseTo(expectedAlpha, 5);

    drop.Update(0.001); // 700ms → finishes
    expect(drop.Finished).toBe(true);
  });

  it('tracks a moving target each tick rather than a fixed snapshot', () => {
    const drop = new DropSprite(4, false, 2000000, { x: 0, y: 0 }, { x: 0, y: 0 }, false);
    drop.Position = { x: 0, y: 0 };
    let targetX = 100;
    drop.StartAbsorb(() => ({ x: targetX, y: 0 }));
    drop.Update(0.3); // v16 = 300ms
    targetX = 300; // target moved after the absorb started
    drop.Update(0.3); // v16 = 600ms — still < 700ms, position recomputed vs new target
    expect(drop.Finished).toBe(false);
    // linear lerp at 600/700ms toward the CURRENT target (300)
    expect(drop.Position.x).toBeCloseTo(300 * (600 / 700), 1);
    drop.Update(0.1); // total 700ms → finishes
    expect(drop.Finished).toBe(true);
  });
});
