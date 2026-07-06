import { describe, it, expect } from 'vitest';
import { PacketRouter } from '../../../src/net/session/PacketRouter.js';
import { FieldHandlers } from '../../../src/net/handlers/FieldHandlers.js';
import { OutHeader } from '../../../src/net/packet/OpCodes.js';
import { OutPacket } from '../../../src/net/packet/OutPacket.js';
import { InPacket } from '../../../src/net/packet/InPacket.js';

function dispatchPayload(router: PacketRouter, payload: Uint8Array): void {
  router.dispatch(new InPacket(payload), null as any);
}

describe('MonsterCarnival', () => {
  it('opcodes have canonical values', () => {
    expect(OutHeader.MonsterCarnivalEnter).toBe(346);
    expect(OutHeader.MonsterCarnivalPersonalCp).toBe(347);
    expect(OutHeader.MonsterCarnivalTeamCp).toBe(348);
    expect(OutHeader.MonsterCarnivalRequestResult).toBe(349);
    expect(OutHeader.MonsterCarnivalRequestCanned).toBe(350);
    expect(OutHeader.MonsterCarnivalProcessForDeath).toBe(351);
    expect(OutHeader.MonsterCarnivalMemberOut).toBe(352);
    expect(OutHeader.MonsterCarnivalGameResult).toBe(353);
  });

  it('MonsterCarnivalEnter decodes the fixed header', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onMonsterCarnivalEnter = (a: any) => (captured = a);

    const p = OutPacket.Of(OutHeader.MonsterCarnivalEnter);
    p.writeByte(1); p.writeShort(10); p.writeShort(2); p.writeShort(50); p.writeShort(500); p.writeShort(30); p.writeShort(450);
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({
      team: 1, personalCp: 10, personalCpDiff: 2,
      myTeamCp: 50, myTeamCpTotal: 500, enemyCpRest: 30, enemyCpTotal: 450,
    });
  });

  // TODO_AUDIT.md Eighty-ninth pass: CField_MonsterCarnivalRevive (WZ
  // info/fieldType 11, decompile-confirmed at 0x55a330) sends just one
  // byte for opcode 346 — reading the normal room's extra 9 bytes would
  // desync every packet after it.
  it('MonsterCarnivalEnter decodes only the team byte in the revive room (fieldType 11)', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    fh.setCurrentFieldType(11);
    let captured: any = null;
    fh.onMonsterCarnivalEnter = (a: any) => (captured = a);

    const p = OutPacket.Of(OutHeader.MonsterCarnivalEnter);
    p.writeByte(1);
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({ team: 1 });
  });

  it('MonsterCarnivalPersonalCp decodes cp and diff', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onMonsterCarnivalPersonalCp = (a: any) => (captured = a);

    const p = OutPacket.Of(OutHeader.MonsterCarnivalPersonalCp);
    p.writeShort(15); p.writeShort(3);
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({ cp: 15, cpDiff: 3 });
  });

  it('MonsterCarnivalTeamCp decodes team, cp, diff', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onMonsterCarnivalTeamCp = (a: any) => (captured = a);

    const p = OutPacket.Of(OutHeader.MonsterCarnivalTeamCp);
    p.writeByte(0); p.writeShort(100); p.writeShort(5);
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({ team: 0, cp: 100, cpDiff: 5 });
  });

  it('MonsterCarnivalRequestResult decodes codes and message', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onMonsterCarnivalRequestResult = (a: any) => (captured = a);

    const p = OutPacket.Of(OutHeader.MonsterCarnivalRequestResult);
    p.writeByte(1); p.writeByte(2); p.writeString('hello');
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({ code1: 1, code2: 2, message: 'hello' });
  });

  it('MonsterCarnivalRequestCanned decodes result code', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onMonsterCarnivalRequestCanned = (a: any) => (captured = a);

    const p = OutPacket.Of(OutHeader.MonsterCarnivalRequestCanned);
    p.writeByte(3);
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({ resultCode: 3 });
  });

  it('MonsterCarnivalProcessForDeath decodes teamFlag, name, count', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onMonsterCarnivalProcessForDeath = (a: any) => (captured = a);

    const p = OutPacket.Of(OutHeader.MonsterCarnivalProcessForDeath);
    p.writeByte(1); p.writeString('Bob'); p.writeByte(5);
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({ teamFlag: 1, characterName: 'Bob', remainingCount: 5 });
  });

  it('MonsterCarnivalMemberOut decodes flags and name', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onMonsterCarnivalMemberOut = (a: any) => (captured = a);

    const p = OutPacket.Of(OutHeader.MonsterCarnivalMemberOut);
    p.writeByte(6); p.writeByte(0); p.writeString('Alice');
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({ flag1: 6, flag2: 0, characterName: 'Alice' });
  });

  it('MonsterCarnivalGameResult decodes result code', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onMonsterCarnivalGameResult = (a: any) => (captured = a);

    const p = OutPacket.Of(OutHeader.MonsterCarnivalGameResult);
    p.writeByte(8);
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({ resultCode: 8 });
  });
});
