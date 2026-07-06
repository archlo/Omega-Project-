import { describe, it, expect } from 'vitest';
import { PacketRouter } from '../../../src/net/session/PacketRouter.js';
import { FieldHandlers } from '../../../src/net/handlers/FieldHandlers.js';
import { OutHeader } from '../../../src/net/packet/OpCodes.js';
import { OutPacket } from '../../../src/net/packet/OutPacket.js';
import { InPacket } from '../../../src/net/packet/InPacket.js';

function dispatchPayload(router: PacketRouter, payload: Uint8Array): void {
  router.dispatch(new InPacket(payload), null as any);
}

// OG: CUserRemote::OnAttack (live IDA decompile, Maplestory95.exe.i64
// 0x95a670) — common-case decode only.
describe('UserAttack (211-214)', () => {
  function buildCommonAttack(opcode: number, opts: { targetCount: number; damagePerMob: number; skillId: number; ballStart?: boolean }): OutPacket {
    const p = OutPacket.Of(opcode);
    p.writeInt(3001); // charId
    p.writeByte((opts.targetCount << 4) | opts.damagePerMob);
    p.writeByte(50); // level
    p.writeByte(opts.skillId !== 0 ? 1 : 0); // slv
    if (opts.skillId !== 0) p.writeInt(opts.skillId);
    p.writeByte(0); // flag
    p.writeShort(0x8005); // facingLeft=1, action=5
    p.writeByte(4); // actionSpeed
    p.writeByte(0); // mastery
    p.writeInt(2070000); // bulletItemId
    for (let i = 0; i < opts.targetCount; i++) {
      p.writeInt(9000000 + i); // mobId
      p.writeByte(1); // hitAction
      for (let j = 0; j < opts.damagePerMob; j++) {
        p.writeByte(0); // per-hit byte
        p.writeInt(100 + j); // damage
      }
    }
    if (opts.ballStart) {
      p.writeShort(150);
      p.writeShort(250);
    }
    return p;
  }

  it('decodes a melee attack with 2 targets, 1 hit each', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onUserAttack = (a) => captured = a;

    const p = buildCommonAttack(OutHeader.MeleeAttack, { targetCount: 2, damagePerMob: 1, skillId: 1001004 });
    dispatchPayload(router, p.toArray());

    expect(captured.charId).toBe(3001);
    expect(captured.attackType).toBe('melee');
    expect(captured.skillId).toBe(1001004);
    expect(captured.facingLeft).toBe(true);
    expect(captured.action).toBe(5);
    expect(captured.targets).toEqual([
      { mobId: 9000000, hitAction: 1, damage: [100] },
      { mobId: 9000001, hitAction: 1, damage: [100] },
    ]);
    expect(captured.ballStart).toBeUndefined();
  });

  it('decodes a shoot attack with ballStart', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onUserAttack = (a) => captured = a;

    const p = buildCommonAttack(OutHeader.ShootAttack, { targetCount: 1, damagePerMob: 2, skillId: 3001003, ballStart: true });
    dispatchPayload(router, p.toArray());

    expect(captured.attackType).toBe('shoot');
    expect(captured.targets).toEqual([{ mobId: 9000000, hitAction: 1, damage: [100, 101] }]);
    expect(captured.ballStart).toEqual({ x: 150, y: 250 });
  });

  it('decodes a no-skill (basic) attack with skillId 0', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onUserAttack = (a) => captured = a;

    const p = buildCommonAttack(OutHeader.BodyAttack, { targetCount: 1, damagePerMob: 1, skillId: 0 });
    dispatchPayload(router, p.toArray());

    expect(captured.attackType).toBe('body');
    expect(captured.skillId).toBe(0);
    expect(captured.targets).toHaveLength(1);
  });

  it('skips targets with mobId 0', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onUserAttack = (a) => captured = a;

    const p = OutPacket.Of(OutHeader.MagicAttack);
    p.writeInt(3001);
    p.writeByte((1 << 4) | 1);
    p.writeByte(50);
    p.writeByte(0);
    p.writeByte(0);
    p.writeShort(5);
    p.writeByte(4);
    p.writeByte(0);
    p.writeInt(0);
    p.writeInt(0); // mobId 0 -> no hitAction/damage follows
    dispatchPayload(router, p.toArray());

    expect(captured.attackType).toBe('magic');
    expect(captured.targets).toEqual([]);
  });
});
