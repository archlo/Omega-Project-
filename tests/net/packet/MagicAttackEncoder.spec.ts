import { describe, it, expect } from 'vitest';
import { InHeader } from '../../../src/net/packet/OpCodes.js';
import { InPacket } from '../../../src/net/packet/InPacket.js';
import { MagicAttackEncoder, MagicAttackTarget } from '../../../src/net/packet/MagicAttackEncoder.js';

describe('MagicAttackEncoder', () => {
  it('encodes the extra 16-byte DR-check block and dwInit/Crc32 pair', () => {
    const blob = MagicAttackEncoder.Encode(7, 0, 6, 0, 0, [], 1, { skillId: 2121001, combatOrders: 1, crc: 5 });
    const r = new InPacket(blob);
    r.readShort(); r.readByte(); // header, fieldKey
    r.skip(8); r.readByte(); // dr0, dr1, mask
    r.skip(8); // dr2, dr3
    expect(r.readInt()).toBe(2121001); // skillId
    expect(r.readByte()).toBe(1); // combatOrders
    r.skip(8); // dwKey, Crc32
    expect(Array.from(r.readBytes(16))).toEqual(new Array(16).fill(0)); // DR check
    r.skip(8); // dwInit, Crc32
    expect(r.readInt()).toBe(5); // crc
    r.skip(4); // 2nd GetCrC
  });

  it('writes keyDown only when provided', () => {
    const withKeyDown = MagicAttackEncoder.Encode(0, 0, 6, 0, 0, [], 1, { keyDown: 777 });
    const without = MagicAttackEncoder.Encode(0, 0, 6, 0, 0, [], 1, {});
    expect(withKeyDown.length).toBe(without.length + 4);
  });

  it('flag is always 0', () => {
    const blob = MagicAttackEncoder.Encode(0, 0, 6, 0, 0, [], 1, {});
    const r = new InPacket(blob);
    r.readShort(); r.readByte(); r.skip(8); r.readByte(); r.skip(8 + 4 + 1 + 8 + 16 + 8 + 8);
    expect(r.readByte()).toBe(0); // flag
  });

  it('writes the dragon boolean and coords only when dragon is set', () => {
    const targets: MagicAttackTarget[] = [];
    const withDragon = MagicAttackEncoder.Encode(0, 0, 6, 7, 8, targets, 1, { dragon: { x: 11, y: 22 } });
    const r = new InPacket(withDragon);
    r.readShort(); r.readByte(); r.skip(8); r.readByte(); r.skip(8 + 4 + 1 + 8 + 16 + 8 + 8);
    r.readByte(); // flag
    r.skip(2); // actionAndDir
    r.skip(4 + 1 + 1 + 8); // GETCRC32Svr, attackActionType, attackSpeed, tAttackTime, dwID
    expect(r.readShort()).toBe(7); // userX
    expect(r.readShort()).toBe(8); // userY
    expect(r.readByte()).toBe(1); // dragon present
    expect(r.readShort()).toBe(11);
    expect(r.readShort()).toBe(22);
    expect(r.remaining).toBe(0);

    const without = MagicAttackEncoder.Encode(0, 0, 6, 7, 8, targets, 1, {});
    const r2 = new InPacket(without);
    r2.readShort(); r2.readByte(); r2.skip(8); r2.readByte(); r2.skip(8 + 4 + 1 + 8 + 16 + 8 + 8);
    r2.readByte(); r2.skip(2); r2.skip(4 + 1 + 1 + 8);
    r2.readShort(); r2.readShort();
    expect(r2.readByte()).toBe(0); // dragon absent
    expect(r2.remaining).toBe(0);
  });

  it('throws on damage length mismatch', () => {
    const targets: MagicAttackTarget[] = [
      { mobId: 5, hitX: 0, hitY: 0, delay: 0, damage: [1, 2] },
    ];
    expect(() => MagicAttackEncoder.Encode(0, 0, 6, 0, 0, targets, 1)).toThrow();
  });
});
