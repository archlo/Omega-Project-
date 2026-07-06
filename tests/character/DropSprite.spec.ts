import { describe, it, expect } from 'vitest';
import { DropSprite } from '../../src/character/DropSprite.js';

// TODO_AUDIT.md Twenty-fourth pass: StartAbsorb/.Finished existed with zero
// callers — every drop pickup vanished instantly instead of animating
// toward the picker. Wired in GameStage._onDropLeave for self-pickups
// (CDropPool::OnDropLeaveField, decompile/511e20.c, leaveType 2/3/5).
describe('DropSprite.StartAbsorb', () => {
  it('eases toward the target and sets Finished once the duration elapses', () => {
    const drop = new DropSprite(1, false, 2000000, { x: 0, y: 0 }, { x: 0, y: 0 }, false);
    drop.Position = { x: 100, y: 100 };
    drop.StartAbsorb(() => ({ x: 200, y: 0 }));
    expect(drop.Finished).toBe(false);

    drop.Update(0.2); // halfway through the 0.4s absorb duration
    expect(drop.Finished).toBe(false);
    // quadratic ease-in: at t=0.5, eased = 0.25, so x should be 25% of the way
    expect(drop.Position.x).toBeCloseTo(100 + (200 - 100) * 0.25, 1);

    drop.Update(0.3); // pushes total well past 0.4s
    expect(drop.Finished).toBe(true);
    expect(drop.Position.x).toBeCloseTo(200, 1);
    expect(drop.Position.y).toBeCloseTo(0, 1);
  });

  it('tracks a moving target each tick rather than a fixed snapshot', () => {
    const drop = new DropSprite(2, false, 2000000, { x: 0, y: 0 }, { x: 0, y: 0 }, false);
    drop.Position = { x: 0, y: 0 };
    let targetX = 100;
    drop.StartAbsorb(() => ({ x: targetX, y: 0 }));
    drop.Update(0.39);
    targetX = 300; // target moved after the absorb started
    drop.Update(0.39);
    expect(drop.Finished).toBe(true);
    expect(drop.Position.x).toBeCloseTo(300, 1);
  });
});
