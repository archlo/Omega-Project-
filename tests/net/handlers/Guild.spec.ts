import { describe, it, expect } from 'vitest';
import { PacketRouter } from '../../../src/net/session/PacketRouter.js';
import { FieldHandlers } from '../../../src/net/handlers/FieldHandlers.js';
import { InHeader, OutHeader } from '../../../src/net/packet/OpCodes.js';
import { OutPacket } from '../../../src/net/packet/OutPacket.js';
import { InPacket } from '../../../src/net/packet/InPacket.js';
import { GameSender } from '../../../src/net/senders/GameSender.js';

function dispatchPayload(router: PacketRouter, _opcode: number, payload: Uint8Array): void {
  router.dispatch(new InPacket(payload), null as any);
}

function writeMember(p: OutPacket, name: string, job: number, level: number, rank: number, online: number): void {
  p.writeStringFixed(name, 13);
  p.writeInt(job); p.writeInt(level); p.writeInt(rank); p.writeInt(online);
  p.writeInt(0); p.writeInt(0);
}

describe('Guild', () => {
  it('opcodes have canonical values', () => {
    expect(OutHeader.GuildResult).toBe(67);
    expect(InHeader.GuildRequest).toBe(149);
  });

  it('GuildResult LoadGuildDone decodes roster', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onGuildLoad = (a: any) => captured = a;

    const p = OutPacket.Of(OutHeader.GuildResult);
    p.writeByte(28); p.writeByte(1); p.writeInt(101); p.writeString('Knights');
    for (let i = 0; i < 5; i++) p.writeString(`Rank${i}`);
    p.writeByte(2); p.writeInt(1001); p.writeInt(1002);
    writeMember(p, 'Leader', 112, 75, 1, 1);
    writeMember(p, 'Member', 212, 60, 3, 0);
    p.writeInt(20); p.writeShort(0); p.writeByte(0);
    p.writeShort(0); p.writeByte(0); p.writeString('Welcome');
    p.writeInt(500); p.writeInt(0); p.writeByte(3); p.writeShort(0);
    dispatchPayload(router, OutHeader.GuildResult, p.toArray());

    expect(captured).not.toBeNull();
    expect(captured.guildId).toBe(101);
    expect(captured.name).toBe('Knights');
    expect(captured.members).toHaveLength(2);
    expect(captured.members[0].characterId).toBe(1001);
    expect(captured.members[0].name).toBe('Leader');
    expect(captured.members[0].rank).toBe(1);
    expect(captured.members[0].online).toBe(true);
    expect(captured.members[1].characterId).toBe(1002);
    expect(captured.members[1].name).toBe('Member');
    expect(captured.members[1].online).toBe(false);
  });

  it('GuildResult LoadGuildDone no guild fires null', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = 'sentinel';
    fh.onGuildLoad = (a: any) => captured = a;

    const p = OutPacket.Of(OutHeader.GuildResult);
    p.writeByte(28); p.writeByte(0);
    dispatchPayload(router, OutHeader.GuildResult, p.toArray());

    expect(captured).toBeNull();
  });

  it('GuildLoad encodes type only', () => {
    const p = new InPacket(GameSender.GuildLoad().toArray());
    expect(p.readShort()).toBe(InHeader.GuildRequest);
    expect(p.readByte()).toBe(0);
    expect(p.remaining).toBe(0);
  });

  it('GuildLeave encodes charId and name', () => {
    const p = new InPacket(GameSender.GuildLeave(1001, 'Leader').toArray());
    expect(p.readShort()).toBe(InHeader.GuildRequest);
    expect(p.readByte()).toBe(7);
    expect(p.readInt()).toBe(1001);
    expect(p.readString()).toBe('Leader');
    expect(p.remaining).toBe(0);
  });

  // TODO_AUDIT.md Seventy-ninth pass: CSetGuildMarkDlg — decompile-confirmed
  // CField::SendSetGuildMarkMsg shape (short, byte, short, byte) and the
  // GuildResult case-17 trigger (CWvsContext::OnGuildResult).
  it('GuildResult case 17 fires onGuildSetMarkPrompt with no payload', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let called = false;
    fh.onGuildSetMarkPrompt = () => { called = true; };

    const p = OutPacket.Of(OutHeader.GuildResult);
    p.writeByte(17);
    dispatchPayload(router, OutHeader.GuildResult, p.toArray());

    expect(called).toBe(true);
  });

  it('GuildSetMark encodes action byte 15 + markBg/markBgColor/mark/markColor', () => {
    const p = new InPacket(GameSender.GuildSetMark(3, 1, 7, 2).toArray());
    expect(p.readShort()).toBe(InHeader.GuildRequest);
    expect(p.readByte()).toBe(15);
    expect(p.readShort()).toBe(3);
    expect(p.readByte()).toBe(1);
    expect(p.readShort()).toBe(7);
    expect(p.readByte()).toBe(2);
    expect(p.remaining).toBe(0);
  });
});
