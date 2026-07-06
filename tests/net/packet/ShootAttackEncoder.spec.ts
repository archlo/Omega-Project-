import { describe, it, expect } from 'vitest';
import { InHeader } from '../../../src/net/packet/OpCodes.js';
import { InPacket } from '../../../src/net/packet/InPacket.js';
import { ShootAttackEncoder, ShootAttackTarget } from '../../../src/net/packet/ShootAttackEncoder.js';

describe('ShootAttackEncoder', () => {
  it('encodes skillId, keyDown, exJablin, bulletPosition, and ball coordinates', () => {
    const targets: ShootAttackTarget[] = [
      { mobId: 0x3001, hitX: 1, hitY: 2, delay: 3, damage: [50] },
    ];
    const blob = ShootAttackEncoder.Encode(7, 0x8000, 6, 500, 90, 200, 10, 20, targets, 1, 1, {
      exJablin: 1, skillId: 3121004, keyDown: 1000,
    });
    const r = new InPacket(blob);

    expect(r.readShort()).toBe(InHeader.UserShootAttack);
    expect(r.readByte()).toBe(7); // fieldKey
    r.skip(8); r.readByte(); // dr0, dr1, mask
    r.skip(8); // dr2, dr3
    expect(r.readInt()).toBe(3121004); // skillId
    r.skip(1 + 8); // combatOrders, dwKey, Crc32
    r.skip(8); // crc pair
    expect(r.readInt()).toBe(1000); // keyDown (explicit, not auto-derived from skillId)
    expect(r.readByte()).toBe(1); // flag
    expect(r.readByte()).toBe(1); // exJablin
    expect(r.readUShort()).toBe(0x8000); // actionAndDir
    r.skip(4 + 1); // GETCRC32Svr, attackActionType
    expect(r.readByte() & 0xF).toBe(6); // attackSpeed
    r.skip(8); // tAttackTime, dwID
    expect(r.readShort()).toBe(500); // bulletPosition
    r.skip(2 + 1); // pnCashItemPos, nShootRange0a
    expect(r.readInt()).toBe(0x3001); // target mobId
    r.skip(2 + 2); // hitAction, foreActionAndDir, frameIdx, calcDamageStatIndex
    expect(r.readShort()).toBe(1); expect(r.readShort()).toBe(2); // hitX, hitY
    r.skip(4); // 2 extra shorts
    expect(r.readShort()).toBe(3); // delay
    expect(r.readInt()).toBe(50); // damage
    r.skip(4); // CMob::GetCrc
    expect(r.readShort()).toBe(90); expect(r.readShort()).toBe(200); // userX, userY
    expect(r.readShort()).toBe(10); expect(r.readShort()).toBe(20); // ballStartX, ballStartY
    expect(r.remaining).toBe(0);
  });

  it('writes bulletItemId only when provided', () => {
    const withBullet = ShootAttackEncoder.Encode(0, 0, 6, 0, 0, 0, 0, 0, [], 1, 0, { bulletItemId: 2070000 });
    const without = ShootAttackEncoder.Encode(0, 0, 6, 0, 0, 0, 0, 0, [], 1, 0, {});
    expect(withBullet.length).toBe(without.length + 4);
  });

  it('writes wildHunterBodyRelMoveY only when provided', () => {
    const withWH = ShootAttackEncoder.Encode(0, 0, 6, 0, 0, 0, 0, 0, [], 1, 0, { wildHunterBodyRelMoveY: 5 });
    const without = ShootAttackEncoder.Encode(0, 0, 6, 0, 0, 0, 0, 0, [], 1, 0, {});
    expect(withWH.length).toBe(without.length + 2);
  });

  it('writes reserveSpark only when provided', () => {
    const withSpark = ShootAttackEncoder.Encode(0, 0, 6, 0, 0, 0, 0, 0, [], 1, 0, { reserveSpark: 1000 });
    const without = ShootAttackEncoder.Encode(0, 0, 6, 0, 0, 0, 0, 0, [], 1, 0, {});
    expect(withSpark.length).toBe(without.length + 4);
  });

  it('packs reduceCount into the high nibble of attackSpeed', () => {
    const blob = ShootAttackEncoder.Encode(0, 0, 6, 0, 0, 0, 0, 0, [], 1, 0, { reduceCount: 2 });
    const r = new InPacket(blob);
    r.readShort(); r.readByte(); r.skip(8); r.readByte(); r.skip(8 + 4 + 1 + 8 + 8);
    r.readByte(); // flag
    r.readByte(); // exJablin
    r.skip(2); // actionAndDir
    r.skip(4 + 1); // GETCRC32Svr, attackActionType
    const speed = r.readByte();
    expect(speed & 0xF).toBe(6);
    expect((speed >> 4) & 0xF).toBe(2);
  });

  it('throws on damage length mismatch', () => {
    const targets: ShootAttackTarget[] = [
      { mobId: 5, hitX: 0, hitY: 0, delay: 0, damage: [1, 2] },
    ];
    expect(() => ShootAttackEncoder.Encode(0, 0, 6, 0, 0, 0, 0, 0, targets, 1)).toThrow();
  });
});
