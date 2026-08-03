import { describe, expect, it } from 'vitest';
import { MovePath, VecCtrl } from '../../src/map/VecCtrl.js';
import { MovePathAttr } from '../../src/net/protocol/Enums.js';
import type { MoveElement } from '../../src/net/packet/MovePathEncoder.js';

function element(overrides: Partial<MoveElement>): MoveElement {
  return {
    attr: MovePathAttr.Normal, x: 0, y: 0, vx: 0, vy: 0, fh: 0,
    fhFallStart: 0, xOffset: 0, yOffset: 0, stat: 0, moveAction: 0, elapse: 30,
    ...overrides,
  };
}

describe('MovePath passive advancement', () => {
  it('keeps progress across the 30/33 ms update cadence', () => {
    const path = new MovePath();
    path.OriginX = 0;
    path.Elements = [element({ x: 100, elapse: 100 })];

    const at30 = path.CalcPassivePos(0, 0, 0, 0, 0, 30);
    const at63 = path.CalcPassivePos(at30.x, at30.y, at30.vx, at30.vy, 0, 63);

    expect(at30.x).toBeGreaterThan(0);
    expect(at63.x).toBeGreaterThan(at30.x);
    expect(path.IsComplete).toBe(false);
  });

  it('consumes queued elements at their boundaries without replaying the queue', () => {
    const path = new MovePath();
    path.Elements = [
      element({ x: 30, elapse: 30 }),
      element({ attr: MovePathAttr.Teleport, x: 500, y: 20, fh: 7, elapse: 33 }),
    ];

    const first = path.CalcPassivePos(0, 0, 0, 0, 0, 30);
    expect(first.x).toBe(30);
    expect(first.fh).toBe(0);
    expect(path.IsComplete).toBe(false);

    const beforeTeleport = path.CalcPassivePos(first.x, first.y, first.vx, first.vy, first.fh, 45);
    expect(beforeTeleport.x).toBe(30);
    expect(beforeTeleport.y).toBe(0);

    const afterTeleport = path.CalcPassivePos(beforeTeleport.x, beforeTeleport.y, beforeTeleport.vx, beforeTeleport.vy, beforeTeleport.fh, 63);
    expect(afterTeleport).toMatchObject({ x: 500, y: 20, fh: 7 });
    expect(path.IsComplete).toBe(true);
    expect(path.CurrentAttr).toBe(MovePathAttr.Teleport);
    expect(path.CurrentElementIndex).toBe(1);
  });

  it('uses jump velocity for the whole jump element and preserves flying-block metadata', () => {
    const path = new MovePath();
    path.Elements = [element({ attr: MovePathAttr.Jump, vx: 100, vy: -50, elapse: 30 })];
    const jump = path.CalcPassivePos(0, 0, 0, 0, 0, 30);
    expect(jump).toMatchObject({ x: 3, y: -1.5, vx: 100, vy: -50 });

    const flying = new MovePath();
    flying.Elements = [element({
      attr: MovePathAttr.FlyingBlock, x: 100, y: 40, vx: 20, vy: 10, elapse: 30,
      fhFallStart: 12, xOffset: 4, yOffset: 5, stat: 3,
    })];
    const result = flying.CalcPassivePos(0, 0, 0, 0, 0, 30);
    expect(result).toMatchObject({ x: 100, y: 40, vx: 20, vy: 10 });
    expect(flying.LastFhFallStart).toBe(12);
    expect(flying.LastStat).toBe(3);
    expect(flying.LastOffset).toEqual({ x: 4, y: 5 });
  });

  it('reports completion through VecCtrl and applies the current action metadata', () => {
    const ctrl = new VecCtrl();
    ctrl.SetMovePath(0, 0, 0, 0, [element({ x: 10, elapse: 30, moveAction: 6 })]);
    expect(ctrl.UpdatePassive(0.03, 30)).toBe(true);
    expect(ctrl.Pos.x).toBe(10);
    expect(ctrl.MoveAction).toBe(6);
  });
});
