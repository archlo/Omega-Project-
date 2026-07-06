import { describe, it, expect, beforeEach } from 'vitest';
import { PacketRouter } from '../../../src/net/session/PacketRouter.js';
import { EventHandlers } from '../../../src/net/handlers/EventHandlers.js';
import { OutHeader } from '../../../src/net/packet/OpCodes.js';
import { OutPacket } from '../../../src/net/packet/OutPacket.js';
import { InPacket } from '../../../src/net/packet/InPacket.js';

function dispatchPayload(router: PacketRouter, opcode: number, payload: Uint8Array): void {
  const buf = new Uint8Array(2 + payload.length);
  buf[0] = opcode & 0xFF;
  buf[1] = (opcode >> 8) & 0xFF;
  buf.set(payload, 2);
  router.dispatch(new InPacket(buf), null as any);
}

describe('EventHandlers', () => {
  let router: PacketRouter;
  let handlers: EventHandlers;

  beforeEach(() => {
    router = new PacketRouter();
    handlers = new EventHandlers();
    handlers.register(router);
  });

  // CField_SnowBall::OnSnowBallState (decompile/560AB0.c). First packet
  // since field load (bFirst) additionally carries 3 trailing Decode2s.
  it('SnowBallState decodes the first-packet shape with trailing damage fields', () => {
    const values: any[] = [];
    handlers.onSnowBallState = (args) => values.push(args);

    const p = OutPacket.Raw();
    p.writeByte(0); // state
    p.writeInt(100); // snowman[0] hp
    p.writeInt(200); // snowman[1] hp
    p.writeShort(10); p.writeByte(1); // snowball[0] pos
    p.writeShort(20); p.writeByte(2); // snowball[1] pos
    p.writeShort(5); // damage to snowball
    p.writeShort(6); p.writeShort(7); // damage to each snowman
    dispatchPayload(router, OutHeader.SnowBallState, p.toArray());

    expect(values).toEqual([{
      state: 0,
      snowManHp: [100, 200],
      snowBallPos: [{ a: 10, b: 1 }, { a: 20, b: 2 }],
      firstPacketDamage: { snowBall: 5, snowMan: [6, 7] },
    }]);
  });

  it('SnowBallState omits the trailing damage fields on subsequent packets', () => {
    const values: any[] = [];
    handlers.onSnowBallState = (args) => values.push(args);

    const first = OutPacket.Raw();
    first.writeByte(0); first.writeInt(100); first.writeInt(200);
    first.writeShort(10); first.writeByte(1);
    first.writeShort(20); first.writeByte(2);
    first.writeShort(5); first.writeShort(6); first.writeShort(7);
    dispatchPayload(router, OutHeader.SnowBallState, first.toArray());

    const second = OutPacket.Raw();
    second.writeByte(1); second.writeInt(90); second.writeInt(200);
    second.writeShort(11); second.writeByte(1);
    second.writeShort(21); second.writeByte(2);
    dispatchPayload(router, OutHeader.SnowBallState, second.toArray());

    expect(values).toHaveLength(2);
    expect(values[1].firstPacketDamage).toBeNull();
  });

  it('resetFieldState makes the next SnowBallState packet treated as first again', () => {
    const values: any[] = [];
    handlers.onSnowBallState = (args) => values.push(args);

    const first = OutPacket.Raw();
    first.writeByte(0); first.writeInt(100); first.writeInt(200);
    first.writeShort(10); first.writeByte(1);
    first.writeShort(20); first.writeByte(2);
    first.writeShort(5); first.writeShort(6); first.writeShort(7);
    dispatchPayload(router, OutHeader.SnowBallState, first.toArray());

    handlers.resetFieldState();

    dispatchPayload(router, OutHeader.SnowBallState, first.toArray());

    expect(values).toHaveLength(2);
    expect(values[1].firstPacketDamage).toEqual({ snowBall: 5, snowMan: [6, 7] });
  });

  // CField_SnowBall::OnSnowBallHit (decompile/5619D0.c).
  it('SnowBallHit decodes side + x + y', () => {
    const values: any[] = [];
    handlers.onSnowBallHit = (args) => values.push(args);

    const p = OutPacket.Raw();
    p.writeByte(1);
    p.writeShort(123);
    p.writeShort(456);
    dispatchPayload(router, OutHeader.SnowBallHit, p.toArray());

    expect(values).toEqual([{ side: 1, x: 123, y: 456 }]);
  });

  // CField_SnowBall::OnSnowBallMsg (decompile/562040.c).
  it('SnowBallMsg decodes team + msgType', () => {
    const values: any[] = [];
    handlers.onSnowBallMsg = (args) => values.push(args);

    const p = OutPacket.Raw();
    p.writeByte(1);
    p.writeByte(3);
    dispatchPayload(router, OutHeader.SnowBallMsg, p.toArray());

    expect(values).toEqual([{ team: 1, msgType: 3 }]);
  });

  // CField_SnowBall::OnSnowBallTouch (decompile/560510.c) — reads nothing.
  it('SnowBallTouch carries no packet data', () => {
    let count = 0;
    handlers.onSnowBallTouch = () => count++;

    dispatchPayload(router, OutHeader.SnowBallTouch, new Uint8Array(0));

    expect(count).toBe(1);
  });

  // Coconut/Ariant/GuildBoss — no confirmed field shape yet; only raw
  // remaining payload is exposed until the handler body is decompiled.
  // decompile export (confirmed by grepping function_index.txt); only the
  // raw remaining payload is exposed.
  it('Coconut, Ariant, and GuildBoss opcodes expose raw remaining payload (unconfirmed field shape)', () => {
    const scoreValues: any[] = [];
    const hitValues: any[] = [];
    const msgValues: any[] = [];
    const ariantValues: any[] = [];
    const healerValues: any[] = [];
    const pulleyValues: any[] = [];
    handlers.onCoconutScore = (a) => scoreValues.push(a);
    handlers.onCoconutHit = (a) => hitValues.push(a);
    handlers.onCoconutMsg = (a) => msgValues.push(a);
    handlers.onAriantArenaResult = (a) => ariantValues.push(a);
    handlers.onGuildBossHealerMove = (a) => healerValues.push(a);
    handlers.onGuildBossPulleyState = (a) => pulleyValues.push(a);

    const payload = new Uint8Array([1, 2, 3, 4]);
    dispatchPayload(router, OutHeader.CoconutScore, payload);
    dispatchPayload(router, OutHeader.CoconutHit, payload);
    dispatchPayload(router, OutHeader.CoconutMsg, payload);
    dispatchPayload(router, OutHeader.AriantArenaResult, payload);
    dispatchPayload(router, OutHeader.GuildBossHealerMove, payload);
    dispatchPayload(router, OutHeader.GuildBossPulleyState, payload);

    expect(Array.from(scoreValues[0].rawPayload)).toEqual([1, 2, 3, 4]);
    expect(Array.from(hitValues[0].rawPayload)).toEqual([1, 2, 3, 4]);
    expect(Array.from(msgValues[0].rawPayload)).toEqual([1, 2, 3, 4]);
    expect(Array.from(ariantValues[0].rawPayload)).toEqual([1, 2, 3, 4]);
    expect(Array.from(healerValues[0].rawPayload)).toEqual([1, 2, 3, 4]);
    expect(Array.from(pulleyValues[0].rawPayload)).toEqual([1, 2, 3, 4]);
  });
});
