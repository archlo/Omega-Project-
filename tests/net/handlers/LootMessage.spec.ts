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

describe('LootMessage', () => {
  it('opcodes have canonical values', () => {
    expect(OutHeader.Message).toBe(38);
    expect(OutHeader.StatChanged).toBe(30);
    expect(InHeader.DropPickUpRequest).toBe(246);
  });

  it('Message IncExp fires onIncExp', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: number | null = null;
    fh.onIncExp = (e: number) => captured = e;

    const p = OutPacket.Of(OutHeader.Message);
    p.writeByte(3); p.writeByte(1); p.writeInt(1234); p.writeByte(0);
    dispatchPayload(router, OutHeader.Message, p.toArray());
    expect(captured).toBe(1234);
  });

  it('Message IncMoney fires onIncMoney', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: number | null = null;
    fh.onIncMoney = (m: number) => captured = m;

    const p = OutPacket.Of(OutHeader.Message);
    p.writeByte(6); p.writeInt(500);
    dispatchPayload(router, OutHeader.Message, p.toArray());
    expect(captured).toBe(500);
  });

  it('Message DropPickUp item bundle fires lootMessage', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onLootMessage = (a: any) => captured = a;

    const p = OutPacket.Of(OutHeader.Message);
    p.writeByte(0); p.writeSByte(0); p.writeInt(2000000); p.writeInt(3);
    dispatchPayload(router, OutHeader.Message, p.toArray());

    expect(captured).not.toBeNull();
    expect(captured.isMoney).toBe(false);
    expect(captured.itemId).toBe(2000000);
    expect(captured.quantity).toBe(3);
    expect(captured.warning).toBe(0);
  });

  it('Message DropPickUp money fires lootMessage', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onLootMessage = (a: any) => captured = a;

    const p = OutPacket.Of(OutHeader.Message);
    p.writeByte(0); p.writeSByte(1); p.writeByte(0); p.writeInt(750); p.writeShort(0);
    dispatchPayload(router, OutHeader.Message, p.toArray());

    expect(captured).not.toBeNull();
    expect(captured.isMoney).toBe(true);
    expect(captured.money).toBe(750);
  });

  it('Message DropPickUp warning fires with negative warning', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onLootMessage = (a: any) => captured = a;

    const p = OutPacket.Of(OutHeader.Message);
    p.writeByte(0); p.writeSByte(-1);
    dispatchPayload(router, OutHeader.Message, p.toArray());

    expect(captured).not.toBeNull();
    expect(captured.warning).toBe(-1);
    expect(captured.isMoney).toBe(false);
    // itemId is optional and unset when the loot sub-type isn't ItemWarning/ItemUnidentified/ItemExpire
    expect(captured.itemId).toBeUndefined();
  });

  it('StatChanged exp and money decode correctly', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onStatChanged = (a: any) => captured = a;

    const mask = 0x10000 | 0x40000;
    const p = OutPacket.Of(OutHeader.StatChanged);
    p.writeByte(0); p.writeLong(BigInt(mask)); p.writeInt(98765); p.writeInt(54321);
    p.writeByte(0); p.writeByte(0);
    dispatchPayload(router, OutHeader.StatChanged, p.toArray());

    expect(captured).not.toBeNull();
    expect(captured.exp).toBe(98765);
    expect(captured.meso).toBe(54321);
  });

  it('StatChanged level and exp stay aligned', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onStatChanged = (a: any) => captured = a;

    const mask = 0x10 | 0x10000;
    const p = OutPacket.Of(OutHeader.StatChanged);
    p.writeByte(0); p.writeLong(BigInt(mask)); p.writeByte(13); p.writeInt(4242);
    dispatchPayload(router, OutHeader.StatChanged, p.toArray());

    expect(captured).not.toBeNull();
    expect(captured.level).toBe(13);
    expect(captured.exp).toBe(4242);
  });

  it('PickUpDrop encodes fieldKey pos dropId', () => {
    const p = new InPacket(GameSender.PickUpDrop(7, 120, -45, 9001).toArray());
    expect(p.readShort()).toBe(InHeader.DropPickUpRequest);
    expect(p.readByte()).toBe(7);
    expect(p.readInt()).toBe(0);
    expect(p.readShort()).toBe(120);
    expect(p.readShort()).toBe(-45);
    expect(p.readInt()).toBe(9001);
    expect(p.readInt()).toBe(0);
    expect(p.remaining).toBe(0);
  });
});
