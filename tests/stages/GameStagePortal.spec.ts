import { describe, expect, it, vi } from 'vitest';
import { GameStage } from '../../src/stages/GameStage.js';
import { Portal } from '../../src/map/Portal.js';
import { Foothold } from '../../src/map/Foothold.js';
import { InHeader } from '../../src/net/packet/OpCodes.js';
import { InPacket } from '../../src/net/packet/InPacket.js';
import { OutPacket } from '../../src/net/packet/OutPacket.js';

// Decode a TransferField packet's portal-name field (skips the 2-byte opcode
// and the 1-byte fieldKey, then reads the int targetMap, then the string).
function sentPortalName(packet: OutPacket): string {
  const p = new InPacket(packet.toArray());
  p.readShort();       // opcode
  p.readByte();        // fieldKey
  p.readInt();         // targetMap
  return p.readString(); // portal name
}

// OG: CUserLocal::HandleUpKeyDown (0x919E50) — pressing Up on a portal must
// trigger the field transfer (or script-portal request). Verified against the
// live IDB: FindPortal(x, y, 20) picks the first non-type-0 portal within
// (x±20, y±50); nTMap == 999999999 → script (7/8/11) or town portal; same-map
// non-changable → in-map teleport; else cross-field TransferField. Types 4/5
// (IsChangable) are exempt from the sound/teleport branch.
function makeStage(opts: { portals: Portal[]; pos: { x: number; y: number }; fieldKey?: number }): any {
  const stage: any = Object.create(GameStage.prototype);
  stage._isFieldTransferring = false;
  stage._fieldKey = opts.fieldKey ?? 7;
  stage._field = {
    Portals: Object.fromEntries(opts.portals.map((p) => [p.Index, p])),
    LoadedMapId: 100000000,
  };
  stage._physics = {
    Position: opts.pos,
    Grounded: true,
    IsImmovable: false,
  };
  stage._player = { IsPlayingOneTimeAction: false };
  stage.game = {
    session: { send: vi.fn() },
  };
  return stage;
}

function portal(partial: Partial<Portal> & { Index: number }): Portal {
  const p = new Portal();
  Object.assign(p, { Type: 1, TargetMap: 2000000, TargetPortal: 'sp' }, partial);
  return p;
}

describe('GameStage HandleUpKeyDown portal trigger (OG 0x919E50)', () => {
  it('sends TransferField for a cross-field portal under the Up key', () => {
    const stage = makeStage({
      portals: [portal({ Index: 0, Name: 'in05', X: 100, Y: 200, TargetMap: 30000, TargetPortal: 'out00' })],
      pos: { x: 105, y: 195 },
    });
    stage._handleUpKeyDown();
    expect(stage.game.session.send).toHaveBeenCalledTimes(1);
    const packet = stage.game.session.send.mock.calls[0][0];
    expect(packet.header).toBe(InHeader.UserTransferFieldRequest);
    // OG sends the CURRENT portal's own name (sName/pn), not the target portal
    // name — the server does getPortalByName(sName) on the current field.
    expect(sentPortalName(packet)).toBe('in05');
  });

  it('ignores type-0 (start point) portals', () => {
    const stage = makeStage({
      portals: [portal({ Index: 0, Type: 0, X: 100, Y: 200, TargetMap: 30000 })],
      pos: { x: 100, y: 200 },
    });
    stage._handleUpKeyDown();
    expect(stage.game.session.send).not.toHaveBeenCalled();
  });

  it('does nothing when no portal is within the ±20 x / ±50 y rect', () => {
    const stage = makeStage({
      portals: [portal({ Index: 0, X: 100, Y: 200, TargetMap: 30000 })],
      pos: { x: 140, y: 200 }, // dx = 40 > 20
    });
    stage._handleUpKeyDown();
    expect(stage.game.session.send).not.toHaveBeenCalled();
  });

  it('sends UserPortalScriptRequest (112) for script portals 7/8/11 with nTMap 999999999', () => {
    for (const type of [7, 8, 11]) {
      const stage = makeStage({
        portals: [portal({ Index: 0, Type: type, X: 50, Y: 100, TargetMap: 999999999 })],
        pos: { x: 50, y: 100 },
      });
      stage._handleUpKeyDown();
      expect(stage.game.session.send).toHaveBeenCalledTimes(1);
      const packet = stage.game.session.send.mock.calls[0][0];
      expect(packet.header).toBe(InHeader.UserPortalScriptRequest);
    }
  });

  it('does not fire when immovable, airborne, or mid-one-time-action', () => {
    const portals = [portal({ Index: 0, X: 50, Y: 100, TargetMap: 30000 })];
    const pos = { x: 50, y: 100 };

    const immovable = makeStage({ portals, pos });
    immovable._physics.IsImmovable = true;
    immovable._handleUpKeyDown();
    expect(immovable.game.session.send).not.toHaveBeenCalled();

    const airborne = makeStage({ portals, pos });
    airborne._physics.Grounded = false;
    airborne._handleUpKeyDown();
    expect(airborne.game.session.send).not.toHaveBeenCalled();

    const attacking = makeStage({ portals, pos });
    attacking._player.IsPlayingOneTimeAction = true;
    attacking._handleUpKeyDown();
    expect(attacking.game.session.send).not.toHaveBeenCalled();
  });

  it('sets _isFieldTransferring so the proximity auto-touch does not double-fire', () => {
    const stage = makeStage({
      portals: [portal({ Index: 0, X: 100, Y: 200, TargetMap: 30000 })],
      pos: { x: 105, y: 195 },
    });
    stage._handleUpKeyDown();
    expect(stage._isFieldTransferring).toBe(true);
  });

  it('uses the foothold line through a portal at a ladder-adjacent position (y within ±50)', () => {
    const stage = makeStage({
      portals: [portal({ Index: 0, X: 100, Y: 500, TargetMap: 30000 })],
      pos: { x: 100, y: 460 }, // dy = 40 ≤ 50
    });
    stage._handleUpKeyDown();
    expect(stage.game.session.send).toHaveBeenCalledTimes(1);
  });

  it('sends a TransferField for a same-map teleport portal on Up (field id == target)', () => {
    const stage = makeStage({
      portals: [portal({ Index: 0, Name: 'hp00', X: 100, Y: 200, TargetMap: 100000000, TargetPortal: 'hp00_1' })],
      pos: { x: 105, y: 195 },
    });
    stage._handleUpKeyDown();
    expect(stage.game.session.send).toHaveBeenCalledTimes(1);
    expect(stage.game.session.send.mock.calls[0][0].header).toBe(InHeader.UserTransferFieldRequest);
    expect(sentPortalName(stage.game.session.send.mock.calls[0][0])).toBe('hp00');
  });
});

// OG: CPortalList::RestorePortal (0x6AD3C0) puts ONLY types 3/9/12/13 into
// m_aPortal_Collision; CUserLocal::CheckPortal_Collision (from Update) tests
// those every frame. Type 3 auto-transfers; type 9 sends the script request
// (opcode 112) with a delay/onlyOnce gate. Types 1/2/4/5/7/8/10/11 are NOT
// auto-touched — they require the Up key.
describe('GameStage CheckPortal_Collision auto-touch (OG 0x919A10 / 0x6AD3C0)', () => {
  function touchStage(opts: { portals: Portal[]; pos: { x: number; y: number } }): any {
    const stage: any = Object.create(GameStage.prototype);
    stage._isFieldTransferring = false;
    stage._fieldKey = 7;
    stage._field = {
      Portals: Object.fromEntries(opts.portals.map((p) => [p.Index, p])),
      SetActiveHiddenPortal: vi.fn(),
      LoadedMapId: 100000000,
    };
    stage._physics = { Position: opts.pos };
    stage.game = { session: { send: vi.fn() } };
    return stage;
  }

  it('auto-transfers on touch for a type-3 portal', () => {
    const stage = touchStage({
      portals: [portal({ Index: 0, Name: 'in05', Type: 3, X: 100, Y: 200, TargetMap: 30000, TargetPortal: 'out00' })],
      pos: { x: 105, y: 195 },
    });
    stage._checkPortalTouch();
    expect(stage.game.session.send).toHaveBeenCalledTimes(1);
    const packet = stage.game.session.send.mock.calls[0][0];
    expect(packet.header).toBe(InHeader.UserTransferFieldRequest);
    expect(sentPortalName(packet)).toBe('in05');
  });

  it('does NOT auto-touch type-1/2/4/5/6/10/11 portals (Up key only)', () => {
    for (const type of [1, 2, 4, 5, 6, 10, 11]) {
      const stage = touchStage({
        portals: [portal({ Index: 0, Type: type, X: 100, Y: 200, TargetMap: 30000 })],
        pos: { x: 105, y: 195 },
      });
      stage._checkPortalTouch();
      expect(stage.game.session.send, `type ${type} must not auto-touch`).not.toHaveBeenCalled();
    }
  });

  it('sends the script-portal request (112) for a type-9 portal on touch', () => {
    const stage = touchStage({
      portals: [portal({ Index: 0, Type: 9, X: 100, Y: 200, TargetMap: 999999999, Delay: 500 })],
      pos: { x: 105, y: 195 },
    });
    stage._checkPortalTouch();
    expect(stage.game.session.send).toHaveBeenCalledTimes(1);
    expect(stage.game.session.send.mock.calls[0][0].header).toBe(InHeader.UserPortalScriptRequest);
  });

  it('gates a type-9 script portal by delay (does not fire again within the cooldown)', () => {
    const stage = touchStage({
      portals: [portal({ Index: 0, Type: 9, X: 100, Y: 200, TargetMap: 999999999, Delay: 500 })],
      pos: { x: 105, y: 195 },
    });
    stage._checkPortalTouch();
    expect(stage.game.session.send).toHaveBeenCalledTimes(1);
    // Immediate second frame — still inside the 500ms gate.
    stage._checkPortalTouch();
    expect(stage.game.session.send).toHaveBeenCalledTimes(1);
  });

  it('onlyOnce type-9 portal does not re-fire after leaving and re-entering', () => {
    const stage = touchStage({
      portals: [portal({ Index: 0, Type: 9, X: 100, Y: 200, TargetMap: 999999999, Delay: 0, OnlyOnce: true })],
      pos: { x: 105, y: 195 },
    });
    stage._checkPortalTouch();
    expect(stage.game.session.send).toHaveBeenCalledTimes(1);
    // Reset the time gate so onlyOnce is the only remaining check.
    stage._portalCooldownUntil = 0;
    stage._checkPortalTouch();
    expect(stage.game.session.send).toHaveBeenCalledTimes(1); // still once
  });
});

// Sanity: the helper portal defaults are walkable type 1 — keep a flat
// foothold imported so the module compiles without unused-import warnings.
describe('GameStage portal helper imports', () => {
  it('Foothold is available for future collision tests', () => {
    const fh = new Foothold();
    fh.Id = 1; fh.X1 = 0; fh.Y1 = 0; fh.X2 = 100; fh.Y2 = 0;
    fh.InitVectors();
    expect(fh.Length).toBe(100);
  });
});
