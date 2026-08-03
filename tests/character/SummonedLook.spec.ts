import { describe, expect, it } from 'vitest';
import { SummonedLook } from '../../src/character/SummonedLook.js';

describe('SummonedLook movement state', () => {
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
