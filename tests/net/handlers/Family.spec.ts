import { describe, it, expect } from 'vitest';
import { PacketRouter } from '../../../src/net/session/PacketRouter.js';
import { FieldHandlers } from '../../../src/net/handlers/FieldHandlers.js';
import { InHeader, OutHeader } from '../../../src/net/packet/OpCodes.js';
import { OutPacket } from '../../../src/net/packet/OutPacket.js';
import { InPacket } from '../../../src/net/packet/InPacket.js';
import { GameSender } from '../../../src/net/senders/GameSender.js';

function dispatchPayload(router: PacketRouter, payload: Uint8Array): void {
  router.dispatch(new InPacket(payload), null as any);
}

describe('Family', () => {
  it('opcodes have canonical values', () => {
    expect(OutHeader.FamilyChartResult).toBe(98);
    expect(OutHeader.FamilyInfoResult).toBe(99);
    expect(OutHeader.FamilyResult).toBe(100);
    expect(OutHeader.FamilyJoinRequest).toBe(101);
    expect(OutHeader.FamilyJoinRequestResult).toBe(102);
    expect(OutHeader.FamilyJoinAccepted).toBe(103);
    expect(OutHeader.FamilyPrivilegeList).toBe(104);
    expect(OutHeader.FamilyFamousPointIncResult).toBe(105);
    expect(OutHeader.FamilyNotifyLoginOrLogout).toBe(106);
    expect(OutHeader.FamilySetPrivilege).toBe(107);
    expect(OutHeader.FamilySummonRequest).toBe(108);
    expect(InHeader.UserFamilyChartRequest).toBe(169);
    expect(InHeader.UserFamilyInfoRequest).toBe(170);
    expect(InHeader.UserFamilyInviteResult).toBe(174);
    expect(InHeader.UserFamilySummonResponse).toBe(177);
  });

  it('FamilyChartResult exposes the undecoded payload as raw bytes', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onFamilyChartResult = (a: any) => (captured = a);

    const p = OutPacket.Of(OutHeader.FamilyChartResult);
    p.writeByte(1); p.writeByte(2); p.writeByte(3);
    dispatchPayload(router, p.toArray());

    expect(captured.raw).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('FamilyInfoResult decodes header and privilege-use map', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onFamilyInfoResult = (a: any) => (captured = a);

    const p = OutPacket.Of(OutHeader.FamilyInfoResult);
    p.writeInt(100); p.writeInt(5000); p.writeInt(20);
    p.writeShort(3); p.writeShort(10); p.writeShort(8);
    p.writeInt(9001000);
    p.writeString('TheFamily'); p.writeString('Be excellent');
    p.writeInt(2); p.writeInt(1); p.writeInt(5); p.writeInt(2); p.writeInt(7);
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({
      famousPoint: 100, totalFamousPoint: 5000, todaySavePoint: 20,
      childCount: 3, childLimit: 10, totalChildCount: 8,
      bossId: 9001000, familyName: 'TheFamily', precept: 'Be excellent',
      privilegeUse: [{ key: 1, value: 5 }, { key: 2, value: 7 }],
    });
  });

  it('FamilyResult decodes code and value', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onFamilyResult = (a: any) => (captured = a);

    const p = OutPacket.Of(OutHeader.FamilyResult);
    p.writeInt(0x4B); p.writeInt(0);
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({ resultCode: 0x4B, value: 0 });
  });

  it('FamilyJoinRequest decodes inviter fields and name', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onFamilyJoinRequest = (a: any) => (captured = a);

    const p = OutPacket.Of(OutHeader.FamilyJoinRequest);
    p.writeInt(123); p.writeInt(456); p.writeInt(100); p.writeString('Bob');
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({ inviterId: 123, field2: 456, jobCode: 100, inviterName: 'Bob' });
  });

  it('FamilyJoinRequestResult decodes accepted flag and name', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onFamilyJoinRequestResult = (a: any) => (captured = a);

    const p = OutPacket.Of(OutHeader.FamilyJoinRequestResult);
    p.writeByte(1); p.writeString('Alice');
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({ accepted: true, characterName: 'Alice' });
  });

  it('FamilyJoinAccepted decodes name', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onFamilyJoinAccepted = (a: any) => (captured = a);

    const p = OutPacket.Of(OutHeader.FamilyJoinAccepted);
    p.writeString('Carol');
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({ characterName: 'Carol' });
  });

  it('FamilyPrivilegeList decodes the full entry list', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onFamilyPrivilegeList = (a: any) => (captured = a);

    const p = OutPacket.Of(OutHeader.FamilyPrivilegeList);
    p.writeInt(1);
    p.writeByte(2); p.writeInt(50); p.writeInt(7); p.writeString('Boost'); p.writeString('+exp');
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({ privileges: [{ type: 2, fame: 50, dayLimit: 7, name: 'Boost', desc: '+exp' }] });
  });

  it('FamilyFamousPointIncResult decodes signed delta and name', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onFamilyFamousPointIncResult = (a: any) => (captured = a);

    const p = OutPacket.Of(OutHeader.FamilyFamousPointIncResult);
    p.writeInt(-5); p.writeString('Dave');
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({ deltaPoint: -5, characterName: 'Dave' });
  });

  it('FamilyNotifyLoginOrLogout decodes login flag and name', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onFamilyNotifyLoginOrLogout = (a: any) => (captured = a);

    const p = OutPacket.Of(OutHeader.FamilyNotifyLoginOrLogout);
    p.writeByte(1); p.writeString('Eve');
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({ isLogin: true, characterName: 'Eve' });
  });

  it('FamilySetPrivilege decodes type 0 with no further fields', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onFamilySetPrivilege = (a: any) => (captured = a);

    const p = OutPacket.Of(OutHeader.FamilySetPrivilege);
    p.writeByte(0);
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({ type: 0 });
  });

  it('FamilySetPrivilege decodes a nonzero type with full fields', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onFamilySetPrivilege = (a: any) => (captured = a);

    const p = OutPacket.Of(OutHeader.FamilySetPrivilege);
    p.writeByte(1); p.writeInt(3); p.writeInt(10); p.writeInt(20); p.writeByte(0); p.writeInt(60000);
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({ type: 1, index: 3, incExpRate: 10, incDropRate: 20, timeSign: 0, timeDeltaMs: 60000 });
  });

  it('FamilySummonRequest decodes character and field names', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onFamilySummonRequest = (a: any) => (captured = a);

    const p = OutPacket.Of(OutHeader.FamilySummonRequest);
    p.writeString('Frank'); p.writeString('Henesys');
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({ characterName: 'Frank', fieldName: 'Henesys' });
  });

  it('FamilyChartRequest encodes the character name', () => {
    const p = new InPacket(GameSender.FamilyChartRequest('Grace').toArray());
    expect(p.readShort()).toBe(InHeader.UserFamilyChartRequest);
    expect(p.readString()).toBe('Grace');
    expect(p.remaining).toBe(0);
  });

  it('FamilyInfoRequest encodes with no body', () => {
    const p = new InPacket(GameSender.FamilyInfoRequest().toArray());
    expect(p.readShort()).toBe(InHeader.UserFamilyInfoRequest);
    expect(p.remaining).toBe(0);
  });

  it('FamilyInviteResult encodes id, name, and result byte', () => {
    const p = new InPacket(GameSender.FamilyInviteResult(123, 'Bob', true).toArray());
    expect(p.readShort()).toBe(InHeader.UserFamilyInviteResult);
    expect(p.readInt()).toBe(123);
    expect(p.readString()).toBe('Bob');
    expect(p.readByte()).toBe(1);
    expect(p.remaining).toBe(0);
  });

  it('FamilySummonResponse encodes the accepted byte', () => {
    const p = new InPacket(GameSender.FamilySummonResponse(false).toArray());
    expect(p.readShort()).toBe(InHeader.UserFamilySummonResponse);
    expect(p.readByte()).toBe(0);
    expect(p.remaining).toBe(0);
  });
});
