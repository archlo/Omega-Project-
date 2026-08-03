import { describe, expect, it } from 'vitest';
import { SummonedLook } from '../../src/character/SummonedLook.js';

describe('SummonedLook movement state', () => {
  it('transitions each path element and retains unknown numeric actions', () => {
    const summon = new SummonedLook(1, 2, summonSkillId());
    (summon as any)._anims = new Map([
      ['stand', [{}]], ['move', [{}]], ['fly', [{}]],
    ]);

    summon.ReplayMove({
      originX: 0, originY: 0, originVx: 0, originVy: 0,
      elements: [
        { attr: 0, x: 10, y: 0, vx: 0, vy: 0, fh: 0, moveAction: 2, elapse: 100 },
        { attr: 20, x: 10, y: 0, vx: 0, vy: 0, fh: 0, moveAction: 42, elapse: 0 },
      ],
    } as any);

    expect(summon.CurrentAction).toBe('move');
    summon.Update(0.1);
    expect(summon.MoveAction).toBe(42);
    expect(summon.CurrentAction).toBe('move');
  });

  it('uses the v95 move-action raw-action mapping', () => {
    const summon = new SummonedLook(1, 2,  summonSkillId());
    summon.SetMoveAction((6 << 1) | 1);
    expect(summon.MoveAction).toBe(13);
    expect(summon.FacingLeft).toBe(true);
  });

  it('replays a packet path without treating it as an absolute teleport', () => {
    const summon = new SummonedLook(1, 2, summonSkillId());
    summon.Position = { x: 10, y: 20 };
    summon.ReplayMove({
      originX: 100,
      originY: 200,
      originVx: 0,
      originVy: 0,
      elements: [],
    });
    expect(summon.Position).toEqual({ x: 10, y: 20 });
  });
});

function summonSkillId(): number { return 1000000; }
