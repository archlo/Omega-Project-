import { describe, it, expect } from 'vitest';
import { AvatarCodec } from '../../src/net/handlers/AvatarCodec.js';
import { AvatarLook } from '../../src/domain/AvatarLook.js';
import { BodyPartSlot } from '../../src/domain/BodyPartSlot.js';
import { OutPacket } from '../../src/net/packet/OutPacket.js';
import { InPacket } from '../../src/net/packet/InPacket.js';

describe('AvatarCodec', () => {
  it('encode/decode round-trips', () => {
    const look = new AvatarLook();
    look.gender = 1;
    look.skin = 2;
    look.face = 21002;
    look.hair = 31040 + 3;
    look.weaponStickerId = 0;
    look.hairEquip.set(BodyPartSlot.Cap, 1002000);
    look.hairEquip.set(BodyPartSlot.Clothes, 1041006);
    look.hairEquip.set(BodyPartSlot.Pants, 1061008);
    look.hairEquip.set(BodyPartSlot.Shoes, 1072005);
    look.hairEquip.set(BodyPartSlot.Weapon, 1302000);
    look.unseenEquip.set(BodyPartSlot.Cap, 1003000);
    look.petIds[0] = 5000001;

    const p = OutPacket.Raw();
    AvatarCodec.EncodeAvatarLook(p, look);
    const bytes = p.toArray();

    const r = new InPacket(bytes);
    const decoded = AvatarCodec.DecodeAvatarLook(r);
    expect(decoded.gender).toBe(look.gender);
    expect(decoded.skin).toBe(look.skin);
    expect(decoded.face).toBe(look.face);
    expect(decoded.hair).toBe(look.hair);
    expect(decoded.weaponStickerId).toBe(look.weaponStickerId);
    const expectedEquip = new Map(look.hairEquip);
    expect(decoded.hairEquip).toEqual(expectedEquip);
    const expectedUnseen = new Map(look.unseenEquip);
    expect(decoded.unseenEquip).toEqual(expectedUnseen);
    expect(decoded.petIds).toEqual(look.petIds);
    expect(r.remaining).toBe(0);
  });
});
