import { describe, it, expect } from 'vitest';
import { PacketRouter } from '../../../src/net/session/PacketRouter.js';
import { FieldHandlers } from '../../../src/net/handlers/FieldHandlers.js';
import { InHeader, OutHeader } from '../../../src/net/packet/OpCodes.js';
import { OutPacket } from '../../../src/net/packet/OutPacket.js';
import { InPacket } from '../../../src/net/packet/InPacket.js';
import { GameSender, ChatGroupType } from '../../../src/net/senders/GameSender.js';

function dispatchPayload(router: PacketRouter, _opcode: number, payload: Uint8Array): void {
  router.dispatch(new InPacket(payload), null as any);
}

const PartyMax = 6;

describe('Social', () => {
  it('opcodes have canonical values', () => {
    expect(InHeader.GroupMessage).toBe(140);
    expect(InHeader.Whisper).toBe(141);
    expect(InHeader.PartyRequest).toBe(145);
    expect(InHeader.FriendRequest).toBe(153);
    expect(InHeader.UserChat).toBe(54);
    expect(OutHeader.PartyResult).toBe(62);
    expect(OutHeader.FriendResult).toBe(65);
    expect(OutHeader.GroupMessage).toBe(150);
    expect(OutHeader.Whisper).toBe(151);
    expect(OutHeader.UserChat).toBe(181);
  });

  it('GroupMessage decodes type from text', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: [number, string, string, number] | null = null;
    fh.onGroupMessage = (t: number, f: string, m: string, charId: number) => captured = [t, f, m, charId];

    const p = OutPacket.Of(OutHeader.GroupMessage);
    p.writeByte(1); p.writeString('Alice'); p.writeString('hello party'); p.writeInt(1234);
    dispatchPayload(router, OutHeader.GroupMessage, p.toArray());

    expect(captured).not.toBeNull();
    expect(captured![0]).toBe(1);
    expect(captured![1]).toBe('Alice');
    expect(captured![2]).toBe('hello party');
    expect(captured![3]).toBe(1234);
  });

  it('Whisper receive decodes', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: { fromName: string; channelId: number; text: string } | null = null;
    fh.onWhisper = (args) => captured = args;

    const p = OutPacket.Of(OutHeader.Whisper);
    p.writeByte(0x12); p.writeString('Bob'); p.writeByte(3);
    p.writeByte(0); p.writeString('psst');
    dispatchPayload(router, OutHeader.Whisper, p.toArray());

    expect(captured).not.toBeNull();
    expect(captured!.fromName).toBe('Bob');
    expect(captured!.channelId).toBe(3);
    expect(captured!.text).toBe('psst');
  });

  it('Whisper non-receive reply does not fire', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let fired = false;
    fh.onWhisper = () => fired = true;

    const p = OutPacket.Of(OutHeader.Whisper);
    p.writeByte(0x0A); p.writeString('Carol'); p.writeByte(1);
    dispatchPayload(router, OutHeader.Whisper, p.toArray());

    expect(fired).toBe(false);
  });

  it('PartyInvite encodes type and name', () => {
    const p = new InPacket(GameSender.PartyInvite('Target').toArray());
    expect(p.readShort()).toBe(InHeader.PartyRequest);
    expect(p.readByte()).toBe(4);
    expect(p.readString()).toBe('Target');
  });

  it('PartyJoin encodes inviter id and trailing byte', () => {
    const p = new InPacket(GameSender.PartyJoin(1234).toArray());
    expect(p.readShort()).toBe(InHeader.PartyRequest);
    expect(p.readByte()).toBe(3);
    expect(p.readInt()).toBe(1234);
    expect(p.readByte()).toBe(0);
  });

  it('WhisperSend encodes targetName and text (OG format)', () => {
    const p = new InPacket(GameSender.Whisper('Dave', 'yo').toArray());
    expect(p.readShort()).toBe(InHeader.Whisper);
    // OG: encode str(targetName), str(text)
    expect(p.readString()).toBe('Dave');
    expect(p.readString()).toBe('yo');
  });

  it('GroupChat encodes updateTime type count ids text (OG format)', () => {
    const ids = [11, 22, 33];
    const p = new InPacket(GameSender.GroupChat(ChatGroupType.Party, ids, 'go').toArray());
    expect(p.readShort()).toBe(InHeader.GroupMessage);
    // OG: str(update_time), byte(nChatTarget), byte(nMemberCnt), int[](memberIDs), str(text)
    expect(p.readString()).toBeTruthy(); // update_time (timestamp string)
    expect(p.readByte()).toBe(ChatGroupType.Party); // Party = 2
    expect(p.readByte()).toBe(3);
    expect(p.readInt()).toBe(11);
    expect(p.readInt()).toBe(22);
    expect(p.readInt()).toBe(33);
    expect(p.readString()).toBe('go');
  });

  it('FriendAccept encodes type and id', () => {
    const p = new InPacket(GameSender.FriendAccept(4242).toArray());
    expect(p.readShort()).toBe(InHeader.FriendRequest);
    expect(p.readByte()).toBe(2);
    expect(p.readInt()).toBe(4242);
  });

  it('FriendLoad encodes type only', () => {
    const p = new InPacket(GameSender.FriendLoad().toArray());
    expect(p.readShort()).toBe(InHeader.FriendRequest);
    expect(p.readByte()).toBe(0);
    expect(p.remaining).toBe(0);
  });

  it('FriendResult LoadDone decodes friends', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any[] | null = null;
    fh.onFriendList = (list: any[]) => captured = list;

    const p = OutPacket.Of(OutHeader.FriendResult);
    p.writeByte(7); p.writeByte(2);
    p.writeInt(2001); p.writeStringFixed('FriendOne', 13); p.writeByte(0);
    p.writeInt(0); p.writeStringFixed('Group A', 17);
    p.writeInt(2002); p.writeStringFixed('FriendTwo', 13); p.writeByte(0);
    p.writeInt(-2); p.writeStringFixed('Group B', 17);
    p.writeInt(0); p.writeInt(0);
    dispatchPayload(router, OutHeader.FriendResult, p.toArray());

    expect(captured).not.toBeNull();
    expect(captured!).toHaveLength(2);
    expect(captured![0].charId).toBe(2001);
    expect(captured![0].name).toBe('FriendOne');
    expect(captured![0].channel).toBe(0);
    expect(captured![0].online).toBe(true);
    expect(captured![1].name).toBe('FriendTwo');
    expect(captured![1].channel).toBe(-2);
    expect(captured![1].online).toBe(false);
    expect(captured![0].group).toBe('Group A');
    expect(captured![1].group).toBe('Group B');
  });
});
