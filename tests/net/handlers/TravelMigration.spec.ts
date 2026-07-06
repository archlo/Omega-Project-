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

describe('TravelMigration', () => {
  it('opcodes have canonical values', () => {
    expect(InHeader.UserTransferFieldRequest).toBe(41);
    expect(InHeader.UserTransferChannelRequest).toBe(42);
    expect(InHeader.UserMigrateToCashShopRequest).toBe(43);
    expect(OutHeader.MigrateCommand).toBe(16);
  });

  it('TransferChannel encodes channel and update time', () => {
    const p = new InPacket(GameSender.TransferChannel(3).toArray());
    expect(p.readShort()).toBe(InHeader.UserTransferChannelRequest);
    expect(p.readByte()).toBe(3);
    expect(p.readInt()).toBe(0);
    expect(p.remaining).toBe(0);
  });

  it('TransferField with portal encodes position block', () => {
    const p = new InPacket(GameSender.TransferField(2, 100000000, 'west00', 250, -120).toArray());
    expect(p.readShort()).toBe(InHeader.UserTransferFieldRequest);
    expect(p.readByte()).toBe(2);
    expect(p.readInt()).toBe(100000000);
    expect(p.readString()).toBe('west00');
    expect(p.readShort()).toBe(250);
    expect(p.readShort()).toBe(-120);
    expect(p.readByte()).toBe(0);
    expect(p.readByte()).toBe(0);
    expect(p.readByte()).toBe(0);
    expect(p.remaining).toBe(0);
  });

  it('TransferField empty portal omits position block', () => {
    const p = new InPacket(GameSender.TransferField(1, 200000000, '', 5, 6).toArray());
    expect(p.readShort()).toBe(InHeader.UserTransferFieldRequest);
    expect(p.readByte()).toBe(1);
    expect(p.readInt()).toBe(200000000);
    expect(p.readString()).toBe('');
    expect(p.readByte()).toBe(0);
    expect(p.readByte()).toBe(0);
    expect(p.readByte()).toBe(0);
    expect(p.remaining).toBe(0);
  });

  it('Revive town default encodes empty portal zero premium', () => {
    const p = new InPacket(GameSender.Revive(5, false).toArray());
    expect(p.readShort()).toBe(InHeader.UserTransferFieldRequest);
    expect(p.readByte()).toBe(5);
    expect(p.readInt()).toBe(0);
    expect(p.readString()).toBe('');
    expect(p.readByte()).toBe(0);
    expect(p.readByte()).toBe(0);
    expect(p.readByte()).toBe(0);
    expect(p.remaining).toBe(0);
  });

  it('Revive premium flips premium byte', () => {
    const p = new InPacket(GameSender.Revive(5, true).toArray());
    expect(p.readShort()).toBe(InHeader.UserTransferFieldRequest);
    expect(p.readByte()).toBe(5);
    expect(p.readInt()).toBe(0);
    expect(p.readString()).toBe('');
    expect(p.readByte()).toBe(0);
    expect(p.readByte()).toBe(1);
    expect(p.readByte()).toBe(0);
    expect(p.remaining).toBe(0);
  });

  it('MigrateToCashShop encodes update time only', () => {
    const p = new InPacket(GameSender.MigrateToCashShop().toArray());
    expect(p.readShort()).toBe(InHeader.UserMigrateToCashShopRequest);
    expect(p.readInt()).toBe(0);
    expect(p.remaining).toBe(0);
  });

  it('ReturnFromCashShop encodes the real opcode-41 minimum shape, not an empty body', () => {
    // CField::SendTransferFieldRequest (decompile/5345C0.c) always writes
    // fieldKey+targetField+portal-string at minimum, even for a no-op transfer.
    const p = new InPacket(GameSender.ReturnFromCashShop().toArray());
    expect(p.readShort()).toBe(InHeader.UserTransferFieldRequest);
    expect(p.readByte()).toBe(0); // fieldKey
    expect(p.readInt()).toBe(0); // targetField
    expect(p.readString()).toBe(''); // portal
    expect(p.readByte()).toBe(0);
    expect(p.readByte()).toBe(0); // premium
    expect(p.readByte()).toBe(0); // chase
    expect(p.remaining).toBe(0);
  });

  it('MigrateCommand decodes host and port', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: [Uint8Array, number] | null = null;
    fh.onMigrateCommand = (h: Uint8Array, p: number) => captured = [h, p];

    const pkt = OutPacket.Of(OutHeader.MigrateCommand);
    pkt.writeByte(1); pkt.writeBytes(new Uint8Array([127, 0, 0, 1])); pkt.writeShort(8585);
    dispatchPayload(router, OutHeader.MigrateCommand, pkt.toArray());

    expect(captured).not.toBeNull();
    expect(Array.from(captured![0])).toEqual([127, 0, 0, 1]);
    expect(captured![1]).toBe(8585);
  });
});
