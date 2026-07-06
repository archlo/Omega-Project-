import { describe, it, expect } from 'vitest';
import { InHeader } from '../../../src/net/packet/OpCodes.js';
import { InPacket } from '../../../src/net/packet/InPacket.js';
import { MeleeAttackEncoder, MeleeTarget } from '../../../src/net/packet/MeleeAttackEncoder.js';

describe('MeleeAttackEncoder', () => {
  it('encodes two mobs one hit matching upstream order', () => {
    const targets: MeleeTarget[] = [
      { mobId: 0x1001, hitX: 100, hitY: 200, delay: 0, damage: [47] },
      { mobId: 0x1002, hitX: 150, hitY: 200, delay: 0, damage: [63] },
    ];
    const blob = MeleeAttackEncoder.Encode(7, 0x8000, 6, 90, 200, targets, 1);
    const r = new InPacket(blob);

    expect(r.readShort()).toBe(InHeader.UserMeleeAttack);
    expect(r.readByte()).toBe(7);
    r.skip(8);
    const mask = r.readByte();
    expect(mask & 0xF).toBe(1);
    expect((mask >> 4) & 0xF).toBe(2);
    r.skip(8 + 4 + 1 + 4 + 4 + 4 + 4 + 1 + 2 + 4 + 1 + 1 + 4 + 4);
    expect(r.readInt()).toBe(0x1001); r.skip(4);
    expect(r.readShort()).toBe(100); expect(r.readShort()).toBe(200);
    r.skip(4); expect(r.readShort()).toBe(0);
    expect(r.readInt()).toBe(47); r.skip(4);
    expect(r.readInt()).toBe(0x1002); r.skip(4);
    expect(r.readShort()).toBe(150); expect(r.readShort()).toBe(200);
    r.skip(4); expect(r.readShort()).toBe(0);
    expect(r.readInt()).toBe(63); r.skip(4);
    expect(r.readShort()).toBe(90); expect(r.readShort()).toBe(200);
    expect(r.remaining).toBe(0);
  });

  it('encodes no targets as valid whiff', () => {
    const blob = MeleeAttackEncoder.Encode(3, 0, 6, 10, 20, [], 1);
    const r = new InPacket(blob);
    expect(r.readShort()).toBe(InHeader.UserMeleeAttack);
    expect(r.readByte()).toBe(3);
    r.skip(8);
    expect((r.readByte() >> 4) & 0xF).toBe(0);
  });

  it('encodes multi-hit damage values', () => {
    const targets: MeleeTarget[] = [
      { mobId: 5, hitX: 0, hitY: 0, delay: 0, damage: [11, 22, 33] },
    ];
    const blob = MeleeAttackEncoder.Encode(0, 0, 6, 0, 0, targets, 3);
    const r = new InPacket(blob);
    r.readShort(); r.readByte(); r.skip(8);
    expect(r.readByte() & 0xF).toBe(3);
    r.skip(8 + 4 + 1 + 4 + 4 + 4 + 4 + 1 + 2 + 4 + 1 + 1 + 4 + 4);
    expect(r.readInt()).toBe(5);
    r.skip(4 + 2 + 2 + 2 + 2 + 2);
    expect(r.readInt()).toBe(11);
    expect(r.readInt()).toBe(22);
    expect(r.readInt()).toBe(33);
  });

  it('throws on damage length mismatch', () => {
    const targets: MeleeTarget[] = [
      { mobId: 5, hitX: 0, hitY: 0, delay: 0, damage: [11, 22] },
    ];
    expect(() => MeleeAttackEncoder.Encode(0, 0, 6, 0, 0, targets, 1)).toThrow();
  });

  it('writes skillId, combatOrders, and crc when provided', () => {
    const blob = MeleeAttackEncoder.Encode(7, 0, 6, 0, 0, [], 1, 0, { skillId: 1001005, combatOrders: 3, crc: 999 });
    const r = new InPacket(blob);
    r.readShort(); r.readByte();
    r.skip(8); r.readByte();
    r.skip(8);
    expect(r.readInt()).toBe(1001005); // skillId
    expect(r.readByte()).toBe(3); // combatOrders
    r.skip(8); // dwKey, Crc32
    expect(r.readInt()).toBe(999); // crc
  });

  it('writes the reactor-hit byte only when reactorHit is set', () => {
    const withReactor = MeleeAttackEncoder.Encode(7, 0, 6, 0, 0, [], 1, 0, { reactorHit: true });
    const without = MeleeAttackEncoder.Encode(7, 0, 6, 0, 0, [], 1, 0, {});
    expect(withReactor.length).toBe(without.length + 1);
  });

  it('writes keyDown only when provided', () => {
    const withKeyDown = MeleeAttackEncoder.Encode(7, 0, 6, 0, 0, [], 1, 0, { keyDown: 500 });
    const without = MeleeAttackEncoder.Encode(7, 0, 6, 0, 0, [], 1, 0, {});
    expect(withKeyDown.length).toBe(without.length + 4);
  });

  it('encodes per-target hitAction and foreActionAndDir', () => {
    const targets: MeleeTarget[] = [
      { mobId: 5, hitX: 1, hitY: 2, delay: 0, damage: [10], hitAction: 9, foreActionAndDir: 0x81 },
    ];
    const blob = MeleeAttackEncoder.Encode(0, 0, 6, 0, 0, targets, 1);
    const r = new InPacket(blob);
    r.readShort(); r.readByte(); r.skip(8); r.readByte(); r.skip(8 + 4 + 1 + 4 + 4 + 4 + 4 + 1 + 2 + 4 + 1 + 1 + 4 + 4);
    expect(r.readInt()).toBe(5); // mobId
    expect(r.readByte()).toBe(9); // hitAction
    expect(r.readByte()).toBe(0x81); // foreActionAndDir
  });

  it('mesoExplosion switches per-target damage encoding and appends a global drops block', () => {
    const targets: MeleeTarget[] = [
      { mobId: 5, hitX: 0, hitY: 0, delay: 0, damage: [11, 22, 33] },
    ];
    const blob = MeleeAttackEncoder.Encode(0, 0, 6, 7, 8, targets, 1, 0, {
      mesoExplosion: { drops: [100, 200], dropExplodeDelay: 250 },
    });
    const r = new InPacket(blob);
    r.readShort(); r.readByte(); r.skip(8); r.readByte(); r.skip(8 + 4 + 1 + 4 + 4 + 4 + 4 + 1 + 2 + 4 + 1 + 1 + 4 + 4);
    expect(r.readInt()).toBe(5); // mobId
    r.skip(2); // hitAction, foreActionAndDir
    r.skip(2); // frameIdx, calcDamageStatIndex
    r.skip(4 + 4); // hitX, hitY, 2 extra shorts
    expect(r.readByte()).toBe(3); // attackCount (no damagePerMob check in this mode)
    expect(r.readInt()).toBe(11);
    expect(r.readInt()).toBe(22);
    expect(r.readInt()).toBe(33);
    r.skip(4); // CMob::GetCrc
    expect(r.readShort()).toBe(7); // userX
    expect(r.readShort()).toBe(8); // userY
    expect(r.readByte()).toBe(2); // drop count
    expect(r.readInt()).toBe(100); r.skip(1);
    expect(r.readInt()).toBe(200); r.skip(1);
    expect(r.readShort()).toBe(250); // dropExplodeDelay
    expect(r.remaining).toBe(0);
  });

  it('grenade option appends x/y after userX/userY, before mesoExplosion drops', () => {
    const blob = MeleeAttackEncoder.Encode(0, 0, 6, 7, 8, [], 1, 0, {
      grenade: { x: 11, y: 22 },
      mesoExplosion: { drops: [], dropExplodeDelay: 0 },
    });
    const r = new InPacket(blob);
    r.readShort(); r.readByte(); r.skip(8); r.readByte(); r.skip(8 + 4 + 1 + 4 + 4 + 4 + 4 + 1 + 2 + 4 + 1 + 1 + 4 + 4);
    expect(r.readShort()).toBe(7); // userX
    expect(r.readShort()).toBe(8); // userY
    expect(r.readShort()).toBe(11); // grenadeX
    expect(r.readShort()).toBe(22); // grenadeY
    expect(r.readByte()).toBe(0); // drop count
    expect(r.readShort()).toBe(0); // dropExplodeDelay
    expect(r.remaining).toBe(0);
  });
});
