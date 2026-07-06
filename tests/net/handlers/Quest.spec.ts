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

describe('Quest', () => {
  it('UserQuestRequest opcode is 119', () => {
    expect(InHeader.UserQuestRequest).toBe(119);
  });

  it('QuestRecord perform decodes progress value', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onQuestRecord = (a: any) => captured = a;

    const p = OutPacket.Of(OutHeader.Message);
    p.writeByte(1); p.writeShort(2100); p.writeByte(1); p.writeString('003');
    dispatchPayload(router, OutHeader.Message, p.toArray());

    expect(captured).not.toBeNull();
    expect(captured.questId).toBe(2100);
    expect(captured.state).toBe(1);
    expect(captured.value).toBe('003');
    expect(captured.isEx).toBe(false);
  });

  it('QuestRecord complete decodes state', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onQuestRecord = (a: any) => captured = a;

    const p = OutPacket.Of(OutHeader.Message);
    p.writeByte(1); p.writeShort(2100); p.writeByte(2); p.writeLong(0n);
    dispatchPayload(router, OutHeader.Message, p.toArray());

    expect(captured).not.toBeNull();
    expect(captured.state).toBe(2);
    expect(captured.questId).toBe(2100);
  });

  it('QuestRecordEx decodes value', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onQuestRecord = (a: any) => captured = a;

    const p = OutPacket.Of(OutHeader.Message);
    p.writeByte(11); p.writeShort(7777); p.writeString('ex-value');
    dispatchPayload(router, OutHeader.Message, p.toArray());

    expect(captured).not.toBeNull();
    expect(captured.questId).toBe(7777);
    expect(captured.value).toBe('ex-value');
    expect(captured.isEx).toBe(true);
  });

  it('QuestAccept encodes fields', () => {
    const p = new InPacket(GameSender.QuestAccept(2100, 9000001, 10, -20).toArray());
    expect(p.readShort()).toBe(InHeader.UserQuestRequest);
    expect(p.readByte()).toBe(1);
    expect(p.readShort()).toBe(2100);
    expect(p.readInt()).toBe(9000001);
    expect(p.readInt()).toBe(0);
    expect(p.readShort()).toBe(10);
    expect(p.readShort()).toBe(-20);
    expect(p.remaining).toBe(0);
  });

  it('QuestComplete encodes reward index', () => {
    const p = new InPacket(GameSender.QuestComplete(2100, 9000001, 0, 0, 2).toArray());
    expect(p.readShort()).toBe(InHeader.UserQuestRequest);
    expect(p.readByte()).toBe(2);
    expect(p.readShort()).toBe(2100);
    expect(p.readInt()).toBe(9000001);
    expect(p.readInt()).toBe(0);
    expect(p.readShort()).toBe(0);
    expect(p.readShort()).toBe(0);
    expect(p.readInt()).toBe(2);
    expect(p.remaining).toBe(0);
  });

  it('QuestResign encodes quest id', () => {
    const p = new InPacket(GameSender.QuestResign(2100).toArray());
    expect(p.readShort()).toBe(InHeader.UserQuestRequest);
    expect(p.readByte()).toBe(3);
    expect(p.readShort()).toBe(2100);
    expect(p.remaining).toBe(0);
  });

  it('QuestStartScript encodes fields', () => {
    const p = new InPacket(GameSender.QuestStartScript(2100, 9000001, 10, -20).toArray());
    expect(p.readShort()).toBe(InHeader.UserQuestRequest);
    expect(p.readByte()).toBe(4);
    expect(p.readShort()).toBe(2100);
    expect(p.readInt()).toBe(9000001);
    expect(p.readShort()).toBe(10);
    expect(p.readShort()).toBe(-20);
    expect(p.remaining).toBe(0);
  });

  it('QuestCompleteScript encodes fields', () => {
    const p = new InPacket(GameSender.QuestCompleteScript(2100, 9000001, 5, 6).toArray());
    expect(p.readShort()).toBe(InHeader.UserQuestRequest);
    expect(p.readByte()).toBe(5);
    expect(p.readShort()).toBe(2100);
    expect(p.readInt()).toBe(9000001);
    expect(p.readShort()).toBe(5);
    expect(p.readShort()).toBe(6);
    expect(p.remaining).toBe(0);
  });
});
