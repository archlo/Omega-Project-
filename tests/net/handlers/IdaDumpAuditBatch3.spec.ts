import { describe, it, expect } from 'vitest';
import { PacketRouter } from '../../../src/net/session/PacketRouter.js';
import { FieldHandlers } from '../../../src/net/handlers/FieldHandlers.js';
import { OutHeader } from '../../../src/net/packet/OpCodes.js';
import { OutPacket } from '../../../src/net/packet/OutPacket.js';
import { InPacket } from '../../../src/net/packet/InPacket.js';

function dispatch(router: PacketRouter, payload: Uint8Array): void {
  router.dispatch(new InPacket(payload), null as any);
}

function setup() {
  const router = new PacketRouter();
  const fh = new FieldHandlers();
  fh.register(router);
  return { router, fh };
}

describe('Third batch resolved by chasing per-pool switch tables', () => {
  it('HontaleTimer decodes flag + byte value', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onHontaleTimer = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.HontaleTimer);
    p.writeByte(1); p.writeByte(60);
    dispatch(router, p.toArray());
    expect(captured).toEqual({ flag: 1, value: 60 });
  });

  it('ChaosZakumTimer / HontailTimer / ZakumTimer decode flag + int value', () => {
    for (const [header, cb] of [
      [OutHeader.ChaosZakumTimer, 'onChaosZakumTimer'],
      [OutHeader.HontailTimer, 'onHontailTimer'],
      [OutHeader.ZakumTimer, 'onZakumTimer'],
    ] as const) {
      const { router, fh } = setup();
      let captured: any = null;
      (fh as any)[cb] = (a: any) => (captured = a);
      const p = OutPacket.Of(header);
      p.writeByte(1); p.writeInt(300);
      dispatch(router, p.toArray());
      expect(captured).toEqual({ flag: 1, value: 300 });
    }
  });

  it('RPSGameDlg / ParcelDlg decode only the leading sub-action byte', () => {
    for (const [header, cb] of [
      [OutHeader.RPSGameDlg, 'onRPSGameDlg'],
      [OutHeader.ParcelDlg, 'onParcelDlg'],
    ] as const) {
      const { router, fh } = setup();
      let captured: any = null;
      (fh as any)[cb] = (a: any) => (captured = a);
      const p = OutPacket.Of(header);
      p.writeByte(2); p.writeInt(999); // extra bytes are opaque tail, ignored
      dispatch(router, p.toArray());
      // RPSGameDlg handler now decodes subAction 11 fields (npcSelect, cntStraightVictories)
      // but subAction 2 only decodes the leading byte — extra bytes are ignored
      expect(captured.subAction).toBe(2);
    }
  });

  it('SummonedAttack decodes charId + summonedId prefix (decompile/75ac70.c, 759860.c)', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onSummonedAttack = (a) => (captured = a);
    const p = OutPacket.Of(OutHeader.SummonedAttack);
    p.writeInt(5001); p.writeInt(42);
    dispatch(router, p.toArray());
    expect(captured).toEqual({ charId: 5001, summonedId: 42 });
  });

  it('SummonedSkill decodes charId + summonedId + action byte (decompile/8e3980.c, 74a940.c)', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onSummonedSkill = (a) => (captured = a);
    const p = OutPacket.Of(OutHeader.SummonedSkill);
    p.writeInt(5001); p.writeInt(42); p.writeByte(0x85);
    dispatch(router, p.toArray());
    expect(captured).toEqual({ charId: 5001, summonedId: 42, action: 0x05 });
  });

  it('SummonedHit decodes charId/summonedId/attackIdx/damage, plus mob fields when attackIdx > -2 (decompile/74bc80.c)', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onSummonedHit = (a) => (captured = a);
    const p = OutPacket.Of(OutHeader.SummonedHit);
    p.writeInt(5001); p.writeInt(42); p.writeByte(1); p.writeInt(150); p.writeInt(9300018); p.writeByte(1);
    dispatch(router, p.toArray());
    expect(captured).toEqual({ charId: 5001, summonedId: 42, attackIdx: 1, damage: 150, mobTemplateId: 9300018, isLeft: true });
  });

  it('SummonedHit omits mob fields when attackIdx <= -2', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onSummonedHit = (a) => (captured = a);
    const p = OutPacket.Of(OutHeader.SummonedHit);
    p.writeInt(5001); p.writeInt(42); p.writeByte(0xFE /* -2 */); p.writeInt(-1500);
    dispatch(router, p.toArray());
    expect(captured).toEqual({ charId: 5001, summonedId: 42, attackIdx: -2, damage: -1500 });
  });

  it('MobCrcKeyChanged decodes an int', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onMobCrcKeyChanged = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.MobCrcKeyChanged);
    p.writeInt(123456);
    dispatch(router, p.toArray());
    expect(captured).toEqual({ crcKey: 123456 });
  });

  it('NpcChangeController decodes flag + npcId', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onNpcChangeController = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.NpcChangeController);
    p.writeByte(1); p.writeInt(9001000);
    dispatch(router, p.toArray());
    expect(captured).toEqual({ flag: 1, npcId: 9001000 });
  });

  it('NpcMove decodes npcId/actionIdx/chatIdx (decompile/678060.c) — case 314 is real, not unconfirmed', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onNpcMove = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.NpcMove);
    p.writeInt(9001000); p.writeByte(0xFF /* -1 */); p.writeByte(3);
    dispatch(router, p.toArray());
    expect(captured).toEqual({ npcId: 9001000, actionIdx: -1, chatIdx: 3 });
  });

  it('NpcUpdateLimitedInfo decodes npcId/enabled (decompile/676340.c)', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onNpcUpdateLimitedInfo = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.NpcUpdateLimitedInfo);
    p.writeInt(9001000); p.writeByte(1);
    dispatch(router, p.toArray());
    expect(captured).toEqual({ npcId: 9001000, enabled: true });
  });

  it('NpcSetSpecialAction decodes npcId/actionName (decompile/6750f0.c)', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onNpcSetSpecialAction = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.NpcSetSpecialAction);
    p.writeInt(9001000); p.writeString('wave');
    dispatch(router, p.toArray());
    expect(captured).toEqual({ npcId: 9001000, actionName: 'wave' });
  });

  it('PetConsumeItemInit / PetConsumeMPItemInit decode an itemId', () => {
    for (const [header, cb] of [
      [OutHeader.PetConsumeItemInit, 'onPetConsumeItemInit'],
      [OutHeader.PetConsumeMPItemInit, 'onPetConsumeMPItemInit'],
    ] as const) {
      const { router, fh } = setup();
      let captured: any = null;
      (fh as any)[cb] = (a: any) => (captured = a);
      const p = OutPacket.Of(header);
      p.writeInt(2070000);
      dispatch(router, p.toArray());
      expect(captured).toEqual({ itemId: 2070000 });
    }
  });

  it('VegaResult decodes a byte', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onVegaResult = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.VegaResult);
    p.writeByte(1);
    dispatch(router, p.toArray());
    expect(captured).toEqual({ resultCode: 1 });
  });

  it('AuthenCodeChanged decodes nSet + int', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onAuthenCodeChanged = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.AuthenCodeChanged);
    p.writeByte(4); p.writeInt(0);
    dispatch(router, p.toArray());
    expect(captured).toEqual({ nSet: 4, value: 0 });
  });

  // OG: CWvsContext::OnLogoutGift (decompile/9CCCB0.c) reads zero bytes —
  // it's a pure trigger (`if (CUILogoutGift exists) SetRet(1)`), not a
  // payload to decode. The previous "raw bytes" shape implied a payload
  // that was never actually there.
  it('LogoutGift is a pure trigger with no payload', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onLogoutGift = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.LogoutGift);
    dispatch(router, p.toArray());
    expect(captured).toEqual({});
  });
});
