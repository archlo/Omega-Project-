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

describe('StoreBank', () => {
  it('opcodes have canonical values', () => {
    expect(OutHeader.StoreBankResult).toBe(369);
    expect(OutHeader.StoreBankAction).toBe(370);
    expect(InHeader.UserStoreBankRequest).toBe(69);
  });

  it('StoreBankResult decodes result code', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onStoreBankResult = (a: any) => (captured = a);

    const p = OutPacket.Of(OutHeader.StoreBankResult);
    p.writeByte(0x1E);
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({ resultCode: 0x1E });
  });

  it("StoreBankAction '$' decodes passingDay and fee", () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onStoreBankAction = (a: any) => (captured = a);

    const p = OutPacket.Of(OutHeader.StoreBankAction);
    p.writeByte(0x24); p.writeInt(15); p.writeInt(3000);
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({ subAction: 0x24, passingDay: 15, fee: 3000 });
  });

  it("StoreBankAction '%' decodes accountId, value, channel", () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onStoreBankAction = (a: any) => (captured = a);

    const p = OutPacket.Of(OutHeader.StoreBankAction);
    p.writeByte(0x25); p.writeInt(123456); p.writeInt(42); p.writeByte(3);
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({ subAction: 0x25, accountId: 123456, value: 42, channel: 3 });
  });

  it("StoreBankAction '&' decodes with no extra fields", () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onStoreBankAction = (a: any) => (captured = a);

    const p = OutPacket.Of(OutHeader.StoreBankAction);
    p.writeByte(0x26);
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({ subAction: 0x26 });
  });

  it('StoreBankGetAllConfirm encodes fixed confirm byte', () => {
    const p = new InPacket(GameSender.StoreBankGetAllConfirm().toArray());
    expect(p.readShort()).toBe(InHeader.UserStoreBankRequest);
    expect(p.readByte()).toBe(0x1B);
    expect(p.remaining).toBe(0);
  });
});
