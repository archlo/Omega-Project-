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

// OG OnDropEnterField: tCreateTime = now + delay — the drop waits in state 0
// at its source, then tosses; FadingOut (trade-blocked) tosses, then is
// removed on landing; explosive no-own drops use the 1.8x duration scale.
describe('DropSprite enter states', () => {
  it('holds at the source for the enter delay, then tosses', () => {
    const drop = new DropSprite(10, false, 2000000, { x: 0, y: 0 }, { x: 0, y: 500 }, true,
      null, undefined, false, null, 200, false);
    expect((drop as any)._state).toBe(0);
    drop.Update(0.1);
    expect(drop.Finished).toBe(false);
    expect(drop.Position).toEqual({ x: 0, y: 0 });
    expect((drop as any)._state).toBe(0);
    drop.Update(0.1); // 200ms elapsed → toss begins
    expect((drop as any)._state).toBe(1);
  });

  it('starts tossing immediately with no delay', () => {
    const drop = new DropSprite(11, false, 2000000, { x: 0, y: 0 }, { x: 0, y: 500 }, true);
    expect((drop as any)._state).toBe(1);
  });

  it('vanishes on landing when flagged (FadingOut)', () => {
    const drop = new DropSprite(12, false, 2000000, { x: 0, y: 490 }, { x: 0, y: 500 }, true,
      null, undefined, true, null, 0, false);
    for (let i = 0; i < 200 && !drop.Finished; i++) drop.Update(0.016);
    expect(drop.Finished).toBe(true);
  });

  it('keeps bobbing after landing when not flagged', () => {
    const drop = new DropSprite(13, false, 2000000, { x: 0, y: 490 }, { x: 0, y: 500 }, true,
      null, undefined, false, null, 0, false);
    for (let i = 0; i < 200 && !drop.Finished; i++) drop.Update(0.016);
    expect(drop.Finished).toBe(false);
    expect((drop as any)._state).toBe(3);
  });

  it('uses the explosive duration scale for ownType 3', () => {
    const normal = new DropSprite(14, false, 2000000, { x: 0, y: 0 }, { x: 0, y: 500 }, true,
      null, undefined, false, null, 0, false);
    const explosive = new DropSprite(15, false, 2000000, { x: 0, y: 0 }, { x: 0, y: 500 }, true,
      null, undefined, false, null, 0, true);
    expect((explosive as any)._tEnd).toBeGreaterThan((normal as any)._tEnd);
    expect((normal as any)._tEnd).toBeLessThanOrEqual(1000);
    expect((explosive as any)._tEnd).toBeLessThanOrEqual(1800);
  });

  it('uses the faster explosive rise velocity in the toss', () => {
    const mk = (explosive: boolean) => new DropSprite(16, false, 2000000, { x: 0, y: 0 }, { x: 0, y: 2000 }, true,
      null, undefined, false, null, 0, explosive);
    const normal = mk(false);
    const explosive = mk(true);
    normal.Update(0.1);
    explosive.Update(0.1);
    // y = y1 - vy*t + 400t² — higher vy throws higher (smaller y).
    expect(explosive.Position.y).toBeLessThan(normal.Position.y);
  });

  it('fires onTossStart once when the toss begins (after any delay)', () => {
    let calls = 0;
    const delayed = new DropSprite(17, false, 2000000, { x: 0, y: 0 }, { x: 0, y: 500 }, true,
      null, undefined, false, null, 200, false);
    delayed.onTossStart = () => { calls++; };
    delayed.Update(0.1);
    expect(calls).toBe(0);
    delayed.Update(0.1);
    expect(calls).toBe(1);
    delayed.Update(0.5);
    expect(calls).toBe(1);

    let now = 0;
    const instant = new DropSprite(18, false, 2000000, { x: 0, y: 0 }, { x: 0, y: 500 }, true);
    instant.onTossStart = () => { now++; };
    instant.Update(0.016);
    expect(now).toBe(1);
  });
});
