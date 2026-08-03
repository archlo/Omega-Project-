import { describe, expect, it } from 'vitest';
import { Foothold } from '../../src/map/Foothold.js';
import { VecCtrlUser } from '../../src/map/VecCtrlUser.js';
import { RemoteMoveReplay } from '../../src/character/RemoteMoveReplay.js';
import { NpcLook } from '../../src/character/NpcLook.js';
import { EmployeeLook } from '../../src/character/EmployeeLook.js';
import { SummonedLook } from '../../src/character/SummonedLook.js';
import { DragonLook } from '../../src/character/DragonLook.js';
import { Pet } from '../../src/character/Pet.js';

function foothold(): Foothold {
  const fh = new Foothold();
  fh.Id = 1;
  fh.X1 = 0; fh.Y1 = 100;
  fh.X2 = 100; fh.Y2 = 200;
  fh.InitVectors();
  return fh;
}

function path() {
  return {
    originX: 0, originY: 100, originVx: 100, originVy: 0,
    elements: [{
      attr: 0, x: 100, y: 999, vx: 100, vy: 0, fh: 1,
      moveAction: 1, elapse: 1000, fhFallStart: 0, xOffset: 0, yOffset: 0, stat: 0,
    }],
  } as any;
}

describe('passive foothold movement', () => {
  it('keeps an active user on a sloped foothold and falls after its edge', () => {
    const fh = foothold();
    const ctrl = new VecCtrlUser();
    ctrl.SetPos(50, 150);
    ctrl.SetV(100, 0);
    ctrl.SetFh(fh.Id, fh, null, null);

    ctrl.UpdateActive(100, [fh]);
    // CVecCtrl stores velocity along the foothold, so world X advances by
    // 100 * unitX * 0.1 on this 45-degree slope.
    expect(ctrl.Pos.x).toBeCloseTo(55);
    expect(ctrl.Pos.y).toBeCloseTo(155);

    ctrl.SetV(10000, 0);
    ctrl.UpdateActive(100, [fh]);
    expect(ctrl.IsFloating).toBe(true);
    expect(ctrl.FhId).toBe(0);
  });

  it('transitions an active user through a linked foothold', () => {
    const first = foothold();
    const second = new Foothold();
    second.Id = 2;
    second.X1 = 100; second.Y1 = 200;
    second.X2 = 200; second.Y2 = 200;
    second.Prev = first.Id;
    first.Next = second.Id;
    first.InitVectors();
    second.InitVectors();

    const ctrl = new VecCtrlUser();
    ctrl.SetPos(95, 195);
    ctrl.SetV(100, 0);
    ctrl.SetInput(1, 0);
    ctrl.SetFh(first.Id, first, null, second);
    ctrl.UpdateActive(100, [first, second]);

    expect(ctrl.FhId).toBe(2);
    expect(ctrl.Pos.x).toBe(100);
    expect(ctrl.Pos.y).toBe(200);
  });

  it('uses foothold-relative velocity and exact endpoint transitions', () => {
    const first = foothold();
    const second = new Foothold();
    second.Id = 2;
    second.X1 = 100; second.Y1 = 200;
    second.X2 = 200; second.Y2 = 200;
    first.Next = second.Id;
    second.Prev = first.Id;
    first.InitVectors();
    second.InitVectors();

    const ctrl = new VecCtrlUser();
    ctrl.SetInput(1, 0);
    ctrl.SetPos(99, 199);
    ctrl.SetV(125, 0);
    ctrl.SetFh(first.Id, first, null, second);
    ctrl.UpdateActive(30, [first, second]);

    expect(ctrl.FhId).toBe(2);
    expect(ctrl.Pos.x).toBeGreaterThanOrEqual(100);
    expect(ctrl.Pos.y).toBe(200);
  });

  it('moves on a ladder at walk speed times three and clamps to its ends', () => {
    const ctrl = new VecCtrlUser();
    ctrl.SetLadderOrRope({ x: 50, y1: 100, y2: 200 });
    ctrl.SetInput(0, 1);
    ctrl.SetPos(0, 190);
    ctrl.UpdateActive(30, []);

    expect(ctrl.Pos.x).toBe(50);
    expect(ctrl.Pos.y).toBe(200);
    expect(ctrl.Vy).toBe(375);
  });

  it('replays normal path elements with foothold projection', () => {
    const replay = new RemoteMoveReplay();
    const position = { x: 0, y: 100 };
    replay.SetFootholds([foothold()]);
    replay.SetPath(path(), position);

    replay.Update(0.5, position);
    expect(position.x).toBeCloseTo(50);
    expect(position.y).toBeCloseTo(150);
    expect(replay.Update(0.5, position)).toBe(true);
    expect(position).toEqual({ x: 100, y: 200 });
    expect(replay.Update(0.1, position)).toBe(false);
  });

  it('gives every passive entity the same replay contract', () => {
    const fh = foothold();
    const entities = [
      new NpcLook(1000000),
      new EmployeeLook(1, 2),
      new SummonedLook(1, 2, 1000),
      new DragonLook(2),
      new Pet(5000000, 2),
    ];

    for (const entity of entities) {
      entity.SetFootholds([fh]);
      entity.ReplayMove(path());
      entity.Update(0.5);
      expect(entity.Position.x).toBeCloseTo(50);
      expect(entity.Position.y).toBeCloseTo(150);
    }
  });
});
