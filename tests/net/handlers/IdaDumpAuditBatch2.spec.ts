import { describe, it, expect } from 'vitest';
import { PacketRouter } from '../../../src/net/session/PacketRouter.js';
import { FieldHandlers } from '../../../src/net/handlers/FieldHandlers.js';
import { OutHeader } from '../../../src/net/packet/OpCodes.js';
import { OutPacket } from '../../../src/net/packet/OutPacket.js';
import { InPacket } from '../../../src/net/packet/InPacket.js';
import { AvatarCodec } from '../../../src/net/handlers/AvatarCodec.js';
import { AvatarLook } from '../../../src/domain/AvatarLook.js';

function dispatch(router: PacketRouter, payload: Uint8Array): void {
  router.dispatch(new InPacket(payload), null as any);
}

function setup() {
  const router = new PacketRouter();
  const fh = new FieldHandlers();
  fh.register(router);
  return { router, fh };
}

describe('Second batch resolved by chasing delegate decode functions', () => {
  it('ForcedStatSet decodes only the fields whose mask bit is set', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onForcedStatSet = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.ForcedStatSet);
    // str(0x1) + luk(0x8) + mad(0x40) + speedMax(0x1000) only.
    const mask = 0x1 | 0x8 | 0x40 | 0x1000;
    p.writeInt(mask);
    p.writeShort(11); // str
    p.writeShort(22); // luk
    p.writeShort(33); // mad
    p.writeByte(44); // speedMax
    dispatch(router, p.toArray());
    expect(captured).toEqual({ mask, str: 11, luk: 22, mad: 33, speedMax: 44 });
  });

  it('ForcedStatSet decodes all 13 fields when every bit is set', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onForcedStatSet = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.ForcedStatSet);
    const mask = 0x1FFF;
    p.writeInt(mask);
    for (let i = 0; i < 10; i++) p.writeShort(i + 1); // str..eva
    p.writeByte(11); p.writeByte(12); p.writeByte(13); // speed, jump, speedMax
    dispatch(router, p.toArray());
    expect(captured).toEqual({
      mask, str: 1, dex: 2, int: 3, luk: 4, pad: 5, pdd: 6, mad: 7, mdd: 8, acc: 9, eva: 10,
      speed: 11, jump: 12, speedMax: 13,
    });
  });

  it('ForcedStatReset / OpenFullClientDownloadLink / ClearAvatarMegaphone / CancelNameChangebyOther / AskWhetherUsePamsSong fire with no fields', () => {
    const cases = [
      [OutHeader.ForcedStatReset, 'onForcedStatReset'],
      [OutHeader.OpenFullClientDownloadLink, 'onOpenFullClientDownloadLink'],
      [OutHeader.ClearAvatarMegaphone, 'onClearAvatarMegaphone'],
      [OutHeader.CancelNameChangebyOther, 'onCancelNameChangebyOther'],
      [OutHeader.AskWhetherUsePamsSong, 'onAskWhetherUsePamsSong'],
    ] as const;
    for (const [header, cb] of cases) {
      const { router, fh } = setup();
      let fired = false;
      (fh as any)[cb] = () => { fired = true; };
      const p = OutPacket.Of(header);
      dispatch(router, p.toArray());
      expect(fired).toBe(true);
    }
  });

  it('ShopLinkResult decodes a byte', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onShopLinkResult = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.ShopLinkResult);
    p.writeByte(1);
    dispatch(router, p.toArray());
    expect(captured).toEqual({ resultCode: 1 });
  });

  it('ImitatedNPCData decodes a count-prefixed list of {templateId, name, AvatarLook}', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onImitatedNPCData = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.ImitatedNPCData);
    p.writeByte(1);
    p.writeInt(9300000);
    p.writeString('imitated');
    const look = new AvatarLook();
    look.gender = 1; look.skin = 2; look.face = 21002; look.hair = 31040;
    AvatarCodec.EncodeAvatarLook(p, look);
    dispatch(router, p.toArray());
    expect(captured.entries).toHaveLength(1);
    expect(captured.entries[0].templateId).toBe(9300000);
    expect(captured.entries[0].name).toBe('imitated');
    expect(captured.entries[0].avatarLook.gender).toBe(1);
    expect(captured.entries[0].avatarLook.face).toBe(21002);
  });

  it('ImitatedNPCData decodes zero entries', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onImitatedNPCData = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.ImitatedNPCData);
    p.writeByte(0);
    dispatch(router, p.toArray());
    expect(captured).toEqual({ entries: [] });
  });

  it('LimitedNPCDisableInfo decodes a count-prefixed list of plain template ids', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onLimitedNPCDisableInfo = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.LimitedNPCDisableInfo);
    p.writeByte(2); p.writeInt(9300000); p.writeInt(9300001);
    dispatch(router, p.toArray());
    expect(captured).toEqual({ templateIds: [9300000, 9300001] });
  });

  it('WildHunterInfo decodes a packed byte + 5 captured mob ids', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onWildHunterInfo = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.WildHunterInfo);
    p.writeByte(12);
    for (let i = 0; i < 5; i++) p.writeInt(500000 + i);
    dispatch(router, p.toArray());
    expect(captured).toEqual({ packedByte: 12, capturedMobIds: [500000, 500001, 500002, 500003, 500004] });
  });

  it('DisallowedDeliveryQuestList decodes two ints', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onDisallowedDeliveryQuestList = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.DisallowedDeliveryQuestList);
    p.writeInt(1); p.writeInt(2);
    dispatch(router, p.toArray());
    expect(captured).toEqual({ field1: 1, field2: 2 });
  });
});
