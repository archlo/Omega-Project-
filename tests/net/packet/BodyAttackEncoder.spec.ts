import { describe, it, expect } from 'vitest';
import { InHeader } from '../../../src/net/packet/OpCodes.js';
import { InPacket } from '../../../src/net/packet/InPacket.js';
import { BodyAttackEncoder, BodyAttackTarget } from '../../../src/net/packet/BodyAttackEncoder.js';

describe('BodyAttackEncoder', () => {
  it('encodes a single target matching the OG field order', () => {
    const targets: BodyAttackTarget[] = [
      { mobId: 0x2001, hitX: 10, hitY: 20, delay: 5, damage: [99], hitAction: 1, foreActionAndDir: 2 },
    ];
    const blob = BodyAttackEncoder.Encode(7, 0x8000, 6, 90, 200, targets, 1, 0, { skillId: 4341002, combatOrders: 2, crc: 42 });
    const r = new InPacket(blob);

    expect(r.readShort()).toBe(InHeader.UserBodyAttack);
    expect(r.readByte()).toBe(7); // fieldKey
    r.skip(8); // dr0, dr1
    const mask = r.readByte();
    expect(mask & 0xF).toBe(1);
    expect((mask >> 4) & 0xF).toBe(1);
    r.skip(8); // dr2, dr3
    expect(r.readInt()).toBe(4341002); // skillId
    expect(r.readByte()).toBe(2); // combatOrders
    r.skip(8); // dwKey, Crc32
    expect(r.readInt()).toBe(42); // crc
    r.skip(4); // 2nd GetCrC
    expect(r.readByte()).toBe(0); // flag
    expect(r.readUShort()).toBe(0x8000); // actionAndDir
    r.skip(4 + 1); // GETCRC32Svr, nAttackActionType
    expect(r.readByte()).toBe(6); // attackSpeed
    r.skip(8); // tAttackTime, dwID

    expect(r.readInt()).toBe(0x2001); // mobId
    expect(r.readByte()).toBe(1); // hitAction
    expect(r.readByte()).toBe(2); // foreActionAndDir
    r.skip(2); // frameIdx, calcDamageStatIndex
    expect(r.readShort()).toBe(10); expect(r.readShort()).toBe(20);
    r.skip(4); // 2 extra shorts
    expect(r.readShort()).toBe(5); // delay
    expect(r.readInt()).toBe(99); // damage
    r.skip(4); // CMob::GetCrc

    expect(r.readShort()).toBe(90); // userX
    expect(r.readShort()).toBe(200); // userY
    expect(r.remaining).toBe(0);
  });

  it('defaults skillId/combatOrders/crc to 0 with no options', () => {
    const blob = BodyAttackEncoder.Encode(0, 0, 6, 0, 0, []);
    const r = new InPacket(blob);
    r.readShort(); r.readByte(); r.skip(8 + 1 + 8);
    expect(r.readInt()).toBe(0); // skillId
    expect(r.readByte()).toBe(0); // combatOrders
  });

  it('throws on damage length mismatch', () => {
    const targets: BodyAttackTarget[] = [
      { mobId: 5, hitX: 0, hitY: 0, delay: 0, damage: [1, 2] },
    ];
    expect(() => BodyAttackEncoder.Encode(0, 0, 6, 0, 0, targets, 1)).toThrow();
  });
});
