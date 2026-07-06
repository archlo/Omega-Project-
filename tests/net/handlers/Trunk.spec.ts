import { describe, it, expect } from 'vitest';
import { PacketRouter } from '../../../src/net/session/PacketRouter.js';
import { FieldHandlers } from '../../../src/net/handlers/FieldHandlers.js';
import { InHeader, OutHeader } from '../../../src/net/packet/OpCodes.js';
import { OutPacket } from '../../../src/net/packet/OutPacket.js';
import { InPacket } from '../../../src/net/packet/InPacket.js';
import { GameSender } from '../../../src/net/senders/GameSender.js';
import { InvItemType } from '../../../src/domain/InventoryItem.js';

function dispatchPayload(router: PacketRouter, _opcode: number, payload: Uint8Array): void {
  router.dispatch(new InPacket(payload), null as any);
}

// Writes item body in ItemDecoder.Decode's bundle format: type, itemId, cash flag,
// dateExpire, quantity, title, attribute (no itemSn — itemId isn't rechargeable).
function writeBody(p: OutPacket, itemId: number, qty: number): void {
  p.writeByte(InvItemType.Bundle);
  p.writeInt(itemId);
  p.writeByte(0);
  p.writeLong(0n);
  p.writeShort(qty);
  p.writeString('');
  p.writeShort(0);
}

describe('Trunk', () => {
  it('opcodes have canonical values', () => {
    expect(InHeader.UserTrunkRequest).toBe(67);
    expect(OutHeader.TrunkResult).toBe(368);
  });

  it('TrunkWithdraw encodes type invType position', () => {
    const p = new InPacket(GameSender.TrunkWithdraw(2, 3).toArray());
    expect(p.readShort()).toBe(InHeader.UserTrunkRequest);
    expect(p.readByte()).toBe(4); expect(p.readByte()).toBe(2); expect(p.readByte()).toBe(3);
    expect(p.remaining).toBe(0);
  });

  it('TrunkDeposit encodes pos itemId quantity', () => {
    const p = new InPacket(GameSender.TrunkDeposit(5, 2000000, 10).toArray());
    expect(p.readShort()).toBe(InHeader.UserTrunkRequest);
    expect(p.readByte()).toBe(5); expect(p.readShort()).toBe(5);
    expect(p.readInt()).toBe(2000000); expect(p.readShort()).toBe(10);
    expect(p.remaining).toBe(0);
  });

  it('TrunkSort and Close encode type only', () => {
    const sort = new InPacket(GameSender.TrunkSort().toArray());
    expect(sort.readShort()).toBe(InHeader.UserTrunkRequest);
    expect(sort.readByte()).toBe(6); expect(sort.remaining).toBe(0);

    const close = new InPacket(GameSender.TrunkClose().toArray());
    expect(close.readShort()).toBe(InHeader.UserTrunkRequest);
    expect(close.readByte()).toBe(8); expect(close.remaining).toBe(0);
  });

  it('TrunkMoney withdraw positive deposit negative', () => {
    const w = new InPacket(GameSender.TrunkWithdrawMoney(1000).toArray());
    expect(w.readShort()).toBe(InHeader.UserTrunkRequest);
    expect(w.readByte()).toBe(7); expect(w.readInt()).toBe(1000);

    const d = new InPacket(GameSender.TrunkDepositMoney(1000).toArray());
    expect(d.readShort()).toBe(InHeader.UserTrunkRequest);
    expect(d.readByte()).toBe(7); expect(d.readInt()).toBe(-1000);
  });

  it('TrunkResult OpenTrunkDlg decodes money and items', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onTrunkResult = (a: any) => captured = a;

    const p = OutPacket.Of(OutHeader.TrunkResult);
    p.writeByte(22); p.writeInt(9030000); p.writeByte(20);
    p.writeLong(-1n); p.writeInt(12345);
    p.writeByte(0); p.writeByte(2);
    writeBody(p, 2000000, 100); writeBody(p, 2000001, 50);
    p.writeByte(0); p.writeByte(1); writeBody(p, 4000000, 3);
    p.writeByte(0);
    dispatchPayload(router, OutHeader.TrunkResult, p.toArray());

    expect(captured).not.toBeNull();
    expect(captured.resultType).toBe(22);
    expect(captured.templateId).toBe(9030000);
    expect(captured.slotCount).toBe(20);
    expect(captured.money).toBe(12345);
    expect(captured.items).toHaveLength(3);
  });

  it('TrunkResult MoneySuccess decodes money only', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onTrunkResult = (a: any) => captured = a;

    const p = OutPacket.Of(OutHeader.TrunkResult);
    p.writeByte(19); p.writeByte(20); p.writeLong(0x2n); p.writeInt(777);
    dispatchPayload(router, OutHeader.TrunkResult, p.toArray());

    expect(captured).not.toBeNull();
    expect(captured.money).toBe(777);
    expect(captured.items).toHaveLength(0);
  });

  it('TrunkResult ServerMsg decodes message', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onTrunkResult = (a: any) => captured = a;

    const p = OutPacket.Of(OutHeader.TrunkResult);
    p.writeByte(24); p.writeByte(1); p.writeString('Your storage is full.');
    dispatchPayload(router, OutHeader.TrunkResult, p.toArray());

    expect(captured).not.toBeNull();
    expect(captured.message).toBe('Your storage is full.');
  });
});
