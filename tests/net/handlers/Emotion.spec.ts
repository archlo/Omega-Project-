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

describe('Emotion', () => {
  it('UserEmotion opcode is 56', () => {
    expect(InHeader.UserEmotion).toBe(56);
  });
  it('OutHeader.UserEmotion opcode is 219', () => {
    expect(OutHeader.UserEmotion).toBe(219);
  });
  it('OutHeader.UserEmotionLocal opcode is 232', () => {
    expect(OutHeader.UserEmotionLocal).toBe(232);
  });

  it('UserEmotion encodes int int byte', () => {
    const p = GameSender.UserEmotion(5, -1, false);
    const r = new InPacket(p.toArray());
    expect(r.readShort()).toBe(InHeader.UserEmotion);
    expect(r.readInt()).toBe(5);
    expect(r.readInt()).toBe(-1);
    expect(r.readByte()).toBe(0);
    expect(r.remaining).toBe(0);
  });

  it('UserEmotion with byItemOption true', () => {
    const p = GameSender.UserEmotion(7, 1500, true);
    const r = new InPacket(p.toArray());
    expect(r.readShort()).toBe(InHeader.UserEmotion);
    expect(r.readInt()).toBe(7);
    expect(r.readInt()).toBe(1500);
    expect(r.readByte()).toBe(1);
    expect(r.remaining).toBe(0);
  });

  it('UserEmotion default args sends -1 duration', () => {
    const p = GameSender.UserEmotion(2);
    const r = new InPacket(p.toArray());
    expect(r.readShort()).toBe(InHeader.UserEmotion);
    expect(r.readInt()).toBe(2);
    expect(r.readInt()).toBe(-1);
    expect(r.readByte()).toBe(0);
    expect(r.remaining).toBe(0);
  });

  it('UserEmotion remote decodes charId emotion duration byItem', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onUserEmotion = (a: any) => captured = a;

    const p = OutPacket.Of(OutHeader.UserEmotion);
    p.writeInt(12345); p.writeInt(3); p.writeInt(2000); p.writeByte(0);
    dispatchPayload(router, OutHeader.UserEmotion, p.toArray());

    expect(captured).not.toBeNull();
    expect(captured.charId).toBe(12345);
    expect(captured.emotion).toBe(3);
    expect(captured.durationMs).toBe(2000);
    expect(captured.byItemOption).toBe(false);
  });

  it('UserEmotion local decodes no charId', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onUserEmotion = (a: any) => captured = a;

    const p = OutPacket.Of(OutHeader.UserEmotionLocal);
    p.writeInt(10); p.writeInt(-1); p.writeByte(1);
    dispatchPayload(router, OutHeader.UserEmotionLocal, p.toArray());

    expect(captured).not.toBeNull();
    expect(captured.charId).toBe(0);
    expect(captured.emotion).toBe(10);
    expect(captured.durationMs).toBe(-1);
    expect(captured.byItemOption).toBe(true);
  });
});
