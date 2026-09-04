import { describe, expect, it, vi } from 'vitest';
import { InPacket } from '../../src/net/packet/InPacket.js';
import { InHeader } from '../../src/net/packet/OpCodes.js';
import { GameStage } from '../../src/stages/GameStage.js';

// OG reactor flow (live IDB: OnReactorChangeState 0x6ccd60, OnReactorMove
// 0x6cd110, FindHitReactor 0x6cd4e0):
// - Move decodes an ABSOLUTE position (RelMove target), not a delta.
// - ChangeState carries absolute x/y + hit-start delay + proper event idx +
//   state-end window; the stage forwards all of them to the look.
// - Hits land only inside the CURRENT canvas lt/rb box past the state-end
//   window — never the legacy ±25/50 guess.

function makeStage(): any {
  const stage: any = Object.create(GameStage.prototype);
  stage._reactors = new Map();
  stage.game = { session: { send: vi.fn(), isConnected: true } };
  return stage;
}

function fakeReactor(box: { left: number; top: number; right: number; bottom: number } | null, hittable = true) {
  return {
    ObjId: 7001,
    Position: { x: 500, y: 400 },
    ApplyChangeState: vi.fn(),
    IsHittable: () => hittable,
    HitRect: () => box,
  };
}

describe('GameStage reactor flow', () => {
  it('applies Move as an absolute position', () => {
    const stage = makeStage();
    const r = fakeReactor(null);
    stage._reactors.set(7001, r);
    stage._onReactorMove({ objId: 7001, dx: 1234, dy: 567 });
    expect(r.Position).toEqual({ x: 1234, y: 567 });
  });

  it('forwards the full ChangeState record to the look', () => {
    const stage = makeStage();
    const r = fakeReactor(null);
    stage._reactors.set(7001, r);
    stage._onReactorChangeState({
      objId: 7001, state: 2, x: 100, y: 200,
      aniDelay: 150, properEventIdx: -2, stateEndDeciseconds: 5,
    });
    expect(r.ApplyChangeState).toHaveBeenCalledWith(2, {
      hitDelayMs: 150,
      properEventIdx: -2,
      stateEndMs: 500,
    });
    expect(r.Position).toEqual({ x: 100, y: 200 });
  });

  it('hits inside the canvas lt/rb box, not the legacy guess', () => {
    const stage = makeStage();
    // Box (490..510, 380..400); legacy ±25/50 box would be (475..525, 350..400).
    const r = fakeReactor({ left: 490, top: 380, right: 510, bottom: 400 });
    stage._reactors.set(7001, r);
    // Attack rect overlapping the legacy box but missing the real one.
    stage._hitReactorsInRect(470, 480, 340, 370, 0);
    expect(stage.game.session.send).not.toHaveBeenCalled();
    // Attack rect overlapping the real box.
    stage._hitReactorsInRect(495, 600, 385, 500, 0);
    expect(stage.game.session.send).toHaveBeenCalledTimes(1);
    const out = stage.game.session.send.mock.calls[0][0];
    const p = new InPacket(out.toArray());
    expect(p.readShort()).toBe(InHeader.UserHitReactor);
    expect(p.readInt()).toBe(7001);
  });

  it('skips reactors inside the state-end window', () => {
    const stage = makeStage();
    const r = fakeReactor({ left: 490, top: 380, right: 510, bottom: 400 }, false);
    stage._reactors.set(7001, r);
    stage._hitReactorsInRect(495, 600, 385, 500, 0);
    expect(stage.game.session.send).not.toHaveBeenCalled();
  });
});
