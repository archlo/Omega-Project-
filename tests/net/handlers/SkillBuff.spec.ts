import { describe, it, expect } from 'vitest';
import { PacketRouter } from '../../../src/net/session/PacketRouter.js';
import { FieldHandlers } from '../../../src/net/handlers/FieldHandlers.js';
import { OutHeader, InHeader } from '../../../src/net/packet/OpCodes.js';
import { OutPacket } from '../../../src/net/packet/OutPacket.js';
import { InPacket } from '../../../src/net/packet/InPacket.js';

function dispatchPayload(router: PacketRouter, _opcode: number, payload: Uint8Array): void {
  router.dispatch(new InPacket(payload), null as any);
}

describe('SkillBuff', () => {
  it('opcodes have canonical values', () => {
    expect(OutHeader.TemporaryStatSet).toBe(31);
    expect(OutHeader.TemporaryStatReset).toBe(32);
    expect(OutHeader.ChangeSkillRecordResult).toBe(35);
    expect(OutHeader.SkillUseResult).toBe(36);
    expect(OutHeader.UserEffectRemote).toBe(224);
    expect(OutHeader.UserEffectLocal).toBe(233);
    expect(InHeader.UserSkillUpRequest).toBe(102);
    expect(InHeader.UserSkillUseRequest).toBe(103);
    expect(InHeader.UserSkillCancelRequest).toBe(104);
    expect(InHeader.UserSkillPrepareRequest).toBe(105);
  });

  it('ChangeSkillRecordResult decodes records', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any[] | null = null;
    fh.onSkillRecordResult = (r: any[]) => captured = r;

    const p = OutPacket.Of(OutHeader.ChangeSkillRecordResult);
    p.writeByte(0); p.writeShort(2);
    p.writeInt(1001003); p.writeInt(3); p.writeInt(0); p.writeLong(0n);
    p.writeInt(1001005); p.writeInt(1); p.writeInt(0); p.writeLong(0n);
    p.writeByte(0);
    dispatchPayload(router, OutHeader.ChangeSkillRecordResult, p.toArray());

    expect(captured).not.toBeNull();
    expect(captured!).toHaveLength(2);
    expect(captured![0].skillId).toBe(1001003);
    expect(captured![0].level).toBe(3);
    expect(captured![1].skillId).toBe(1001005);
    expect(captured![1].level).toBe(1);
  });

  it('TemporaryStatReset fires event', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let fired = false;
    fh.onTemporaryStatReset = () => fired = true;

    const p = OutPacket.Of(OutHeader.TemporaryStatReset);
    p.writeBytes(new Uint8Array(16)); p.writeByte(0);
    dispatchPayload(router, OutHeader.TemporaryStatReset, p.toArray());

    expect(fired).toBe(true);
  });

  it('UserEffectRemote exposes character id, effect type, and exact tail', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    const captured: any[] = [];
    fh.onUserEffect = (args) => captured.push(args);

    const p = OutPacket.Of(OutHeader.UserEffectRemote);
    p.writeInt(12345);
    p.writeByte(1);
    p.writeInt(1001003);
    p.writeByte(4);
    dispatchPayload(router, OutHeader.UserEffectRemote, p.toArray());

    expect(captured).toHaveLength(1);
    expect(captured[0].charId).toBe(12345);
    expect(captured[0].effectType).toBe(1);
    expect(captured[0].isLocal).toBe(false);
    expect(Array.from(captured[0].payload)).toEqual(Array.from(p.toArray().subarray(2 + 4 + 1)));
  });

  it('SkillUseResult decodes a single ack byte (decompile/9f1300.c: Decode1 only)', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: number | null = null;
    fh.onSkillUseResult = (ack) => captured = ack;

    const p = OutPacket.Of(OutHeader.SkillUseResult);
    p.writeByte(1);
    dispatchPayload(router, OutHeader.SkillUseResult, p.toArray());

    expect(captured).toBe(1);
  });

  it('SkillResetItemResult decodes exclReset/charId/succeed (decompile/9f60b0.c)', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onSkillResetItemResult = (args) => captured = args;

    const p = OutPacket.Of(OutHeader.SkillResetItemResult);
    p.writeByte(1); p.writeInt(12345); p.writeByte(1);
    dispatchPayload(router, OutHeader.SkillResetItemResult, p.toArray());

    expect(captured).toEqual({ charId: 12345, succeed: true });
  });

  it('SkillLearnItemResult decodes exclReset/charId/isMasterybook/.../used/succeed (decompile/9f7af0.c)', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onSkillLearnItemResult = (args) => captured = args;

    const p = OutPacket.Of(OutHeader.SkillLearnItemResult);
    p.writeByte(1); p.writeInt(12345); p.writeByte(0);
    p.writeInt(2280000); p.writeInt(1001003);
    p.writeByte(1); p.writeByte(1);
    dispatchPayload(router, OutHeader.SkillLearnItemResult, p.toArray());

    expect(captured).toEqual({ charId: 12345, isMasterybook: false, used: true, succeed: true });
  });

  it('SkillCooltimeSet decodes skillId/remainSec (decompile/908b90.c)', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: [number, number] | null = null;
    fh.onSkillCooltimeSet = (skillId, remainSec) => captured = [skillId, remainSec];

    const p = OutPacket.Of(OutHeader.SkillCooltimeSet);
    p.writeInt(1001003); p.writeShort(90);
    dispatchPayload(router, OutHeader.SkillCooltimeSet, p.toArray());

    expect(captured).toEqual([1001003, 90]);
  });

  it('SkillPrepare decodes charId/skillId/slv/actionAndDir/attackSpeed (decompile/953a30.c)', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onSkillPrepare = (args) => captured = args;

    const p = OutPacket.Of(OutHeader.SkillPrepare);
    p.writeInt(12345); p.writeInt(1001003); p.writeByte(5); p.writeShort(300); p.writeByte(7);
    dispatchPayload(router, OutHeader.SkillPrepare, p.toArray());

    expect(captured).toEqual({ charId: 12345, skillId: 1001003, slv: 5, actionAndDir: 300, attackSpeed: 7 });
  });

  it('SkillCancel decodes charId/skillId (decompile/954600.c)', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onSkillCancel = (args) => captured = args;

    const p = OutPacket.Of(OutHeader.SkillCancel);
    p.writeInt(12345); p.writeInt(1001003);
    dispatchPayload(router, OutHeader.SkillCancel, p.toArray());

    expect(captured).toEqual({ charId: 12345, skillId: 1001003 });
  });

  it('UserEffectLocal exposes effect type and exact tail', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    const captured: any[] = [];
    fh.onUserEffect = (args) => captured.push(args);

    const p = OutPacket.Of(OutHeader.UserEffectLocal);
    p.writeByte(0);
    p.writeString('payload');
    dispatchPayload(router, OutHeader.UserEffectLocal, p.toArray());

    expect(captured).toHaveLength(1);
    expect(captured[0].charId).toBe(0);
    expect(captured[0].effectType).toBe(0);
    expect(captured[0].isLocal).toBe(true);
    expect(Array.from(captured[0].payload)).toEqual(Array.from(p.toArray().subarray(2 + 1)));
  });
});
