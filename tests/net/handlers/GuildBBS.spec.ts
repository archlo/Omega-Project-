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

function writeEntry(p: OutPacket, entryId: number, characterId: number, title: string, date: bigint, emoticon: number, comments: number): void {
  p.writeInt(entryId); p.writeInt(characterId); p.writeString(title); p.writeLong(date); p.writeInt(emoticon); p.writeInt(comments);
}

describe('GuildBBS', () => {
  it('opcodes have canonical values', () => {
    expect(OutHeader.GuildBBSPacket).toBe(59);
    expect(InHeader.UserGuildBBSRequest).toBe(179);
  });

  it('LoadListResult decodes with no notice and a list', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onGuildBBSListResult = (a: any) => (captured = a);

    const p = OutPacket.Of(OutHeader.GuildBBSPacket);
    p.writeByte(6); // sub-action
    p.writeByte(0); // hasNotice = false
    p.writeInt(5); // totalCount
    p.writeInt(1); // listCount
    writeEntry(p, 1, 1001, 'Hello', 123456789n, 0, 2);
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({
      notice: null, totalCount: 5,
      entries: [{ entryId: 1, characterId: 1001, title: 'Hello', date: 123456789n, emoticon: 0, comments: 2 }],
    });
  });

  it('LoadListResult decodes a notice entry', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onGuildBBSListResult = (a: any) => (captured = a);

    const p = OutPacket.Of(OutHeader.GuildBBSPacket);
    p.writeByte(6);
    p.writeByte(1); // hasNotice = true
    writeEntry(p, 99, 2002, 'Notice', 1n, 3, 0);
    p.writeInt(0); p.writeInt(0); // totalCount, listCount
    dispatchPayload(router, p.toArray());

    expect(captured.notice).toEqual({ entryId: 99, characterId: 2002, title: 'Notice', date: 1n, emoticon: 3, comments: 0 });
    expect(captured.entries).toEqual([]);
  });

  it('ViewEntryResult decodes entry and comments', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onGuildBBSViewEntryResult = (a: any) => (captured = a);

    const p = OutPacket.Of(OutHeader.GuildBBSPacket);
    p.writeByte(7);
    p.writeInt(5); p.writeInt(1001); p.writeLong(42n);
    p.writeString('Title'); p.writeString('Body text');
    p.writeInt(2); // emoticon
    p.writeInt(1); // commentCount
    p.writeInt(10); p.writeInt(1002); p.writeLong(7n); p.writeString('Nice post');
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({
      entryId: 5, characterId: 1001, date: 42n, title: 'Title', text: 'Body text', emoticon: 2,
      comments: [{ sn: 10, characterId: 1002, date: 7n, comment: 'Nice post' }],
    });
  });

  it('EntryNotFound fires the no-arg callback', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let fired = false;
    fh.onGuildBBSEntryNotFound = () => { fired = true; };

    const p = OutPacket.Of(OutHeader.GuildBBSPacket);
    p.writeByte(8);
    dispatchPayload(router, p.toArray());

    expect(fired).toBe(true);
  });

  it('GuildBBSRegister encodes a new post', () => {
    const p = new InPacket(GameSender.GuildBBSRegister('Title', 'Body', 2, false).toArray());
    expect(p.readShort()).toBe(InHeader.UserGuildBBSRequest);
    expect(p.readByte()).toBe(0);
    expect(p.readByte()).toBe(0); // isModify
    expect(p.readByte()).toBe(0); // isNotice
    expect(p.readString()).toBe('Title');
    expect(p.readString()).toBe('Body');
    expect(p.readInt()).toBe(2);
    expect(p.remaining).toBe(0);
  });

  it('GuildBBSRegister encodes a modify with entryId', () => {
    const p = new InPacket(GameSender.GuildBBSRegister('T', 'B', 0, true, 7).toArray());
    expect(p.readShort()).toBe(InHeader.UserGuildBBSRequest);
    expect(p.readByte()).toBe(0);
    expect(p.readByte()).toBe(1); // isModify
    expect(p.readInt()).toBe(7);
    expect(p.readByte()).toBe(1); // isNotice
    expect(p.readString()).toBe('T');
    expect(p.readString()).toBe('B');
    expect(p.readInt()).toBe(0);
    expect(p.remaining).toBe(0);
  });

  it('GuildBBSDeleteEntry encodes entryId', () => {
    const p = new InPacket(GameSender.GuildBBSDeleteEntry(7).toArray());
    expect(p.readShort()).toBe(InHeader.UserGuildBBSRequest);
    expect(p.readByte()).toBe(1);
    expect(p.readInt()).toBe(7);
    expect(p.remaining).toBe(0);
  });

  it('GuildBBSLoadList encodes startIndex', () => {
    const p = new InPacket(GameSender.GuildBBSLoadList(10).toArray());
    expect(p.readShort()).toBe(InHeader.UserGuildBBSRequest);
    expect(p.readByte()).toBe(2);
    expect(p.readInt()).toBe(10);
    expect(p.remaining).toBe(0);
  });

  it('GuildBBSViewEntry encodes entryId', () => {
    const p = new InPacket(GameSender.GuildBBSViewEntry(5).toArray());
    expect(p.readShort()).toBe(InHeader.UserGuildBBSRequest);
    expect(p.readByte()).toBe(3);
    expect(p.readInt()).toBe(5);
    expect(p.remaining).toBe(0);
  });

  it('GuildBBSComment encodes entryId and comment', () => {
    const p = new InPacket(GameSender.GuildBBSComment(5, 'Nice!').toArray());
    expect(p.readShort()).toBe(InHeader.UserGuildBBSRequest);
    expect(p.readByte()).toBe(4);
    expect(p.readInt()).toBe(5);
    expect(p.readString()).toBe('Nice!');
    expect(p.remaining).toBe(0);
  });

  it('GuildBBSCommentDelete encodes entryId and commentSn', () => {
    const p = new InPacket(GameSender.GuildBBSCommentDelete(5, 10).toArray());
    expect(p.readShort()).toBe(InHeader.UserGuildBBSRequest);
    expect(p.readByte()).toBe(5);
    expect(p.readInt()).toBe(5);
    expect(p.readInt()).toBe(10);
    expect(p.remaining).toBe(0);
  });
});
