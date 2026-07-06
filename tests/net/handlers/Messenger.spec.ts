import { describe, it, expect } from 'vitest';
import { PacketRouter } from '../../../src/net/session/PacketRouter.js';
import { FieldHandlers } from '../../../src/net/handlers/FieldHandlers.js';
import { InHeader, OutHeader } from '../../../src/net/packet/OpCodes.js';
import { OutPacket } from '../../../src/net/packet/OutPacket.js';
import { InPacket } from '../../../src/net/packet/InPacket.js';
import { GameSender } from '../../../src/net/senders/GameSender.js';
import { AvatarCodec } from '../../../src/net/handlers/AvatarCodec.js';
import { AvatarLook } from '../../../src/domain/AvatarLook.js';

function dispatchPayload(router: PacketRouter, _opcode: number, payload: Uint8Array): void {
  router.dispatch(new InPacket(payload), null as any);
}

describe('Messenger', () => {
  it('opcodes have canonical values', () => {
    expect(InHeader.Messenger).toBe(143);
    expect(OutHeader.Messenger).toBe(372);
  });

  it('MessengerEnter encodes type and id', () => {
    const p = new InPacket(GameSender.MessengerEnter(0).toArray());
    expect(p.readShort()).toBe(InHeader.Messenger);
    expect(p.readByte()).toBe(0);
    expect(p.readInt()).toBe(0);
    expect(p.remaining).toBe(0);
  });

  it('MessengerLeave encodes type only', () => {
    const p = new InPacket(GameSender.MessengerLeave().toArray());
    expect(p.readShort()).toBe(InHeader.Messenger);
    expect(p.readByte()).toBe(2);
    expect(p.remaining).toBe(0);
  });

  it('MessengerInvite encodes type and name', () => {
    const p = new InPacket(GameSender.MessengerInvite('Buddy').toArray());
    expect(p.readShort()).toBe(InHeader.Messenger);
    expect(p.readByte()).toBe(3);
    expect(p.readString()).toBe('Buddy');
    expect(p.remaining).toBe(0);
  });

  it('MessengerChat encodes type and text', () => {
    const p = new InPacket(GameSender.MessengerChat('hello there').toArray());
    expect(p.readShort()).toBe(InHeader.Messenger);
    expect(p.readByte()).toBe(6);
    expect(p.readString()).toBe('hello there');
    expect(p.remaining).toBe(0);
  });

  it('Messenger Enter decodes participant across avatar', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onMessengerResult = (a: any) => captured = a;

    const p = OutPacket.Of(OutHeader.Messenger);
    p.writeByte(0); p.writeByte(1);
    const look = new AvatarLook();
    look.gender = 0; look.skin = 0; look.face = 20000; look.hair = 30000;
    AvatarCodec.EncodeAvatarLook(p, look);
    p.writeString('Partner'); p.writeByte(2); p.writeByte(1);
    dispatchPayload(router, OutHeader.Messenger, p.toArray());

    expect(captured).not.toBeNull();
    expect(captured.action).toBe(0);
    expect(captured.userIndex).toBe(1);
    expect(captured.name).toBe('Partner');
    expect(captured.channel).toBe(2);
    expect(captured.flag).toBe(true);
  });

  it('Messenger Chat decodes text', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onMessengerResult = (a: any) => captured = a;

    const p = OutPacket.Of(OutHeader.Messenger);
    p.writeByte(6); p.writeString('hi!');
    dispatchPayload(router, OutHeader.Messenger, p.toArray());

    expect(captured).not.toBeNull();
    expect(captured.chat).toBe('hi!');
  });

  it('Messenger Invite decodes inviter and id', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onMessengerResult = (a: any) => captured = a;

    const p = OutPacket.Of(OutHeader.Messenger);
    p.writeByte(3); p.writeString('Inviter'); p.writeByte(1);
    p.writeInt(5550); p.writeByte(0);
    dispatchPayload(router, OutHeader.Messenger, p.toArray());

    expect(captured).not.toBeNull();
    expect(captured.name).toBe('Inviter');
    expect(captured.messengerId).toBe(5550);
  });

  it('Messenger SelfEnterResult decodes index', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onMessengerResult = (a: any) => captured = a;

    const p = OutPacket.Of(OutHeader.Messenger);
    p.writeByte(1); p.writeByte(0);
    dispatchPayload(router, OutHeader.Messenger, p.toArray());

    expect(captured).not.toBeNull();
    expect(captured.action).toBe(1);
    expect(captured.userIndex).toBe(0);
  });
});
