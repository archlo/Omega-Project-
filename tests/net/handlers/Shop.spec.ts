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

function writeHeader(p: OutPacket, itemId: number, price: number): void {
  p.writeInt(itemId); p.writeInt(price); p.writeByte(0);
  p.writeInt(0); p.writeInt(0); p.writeInt(0); p.writeInt(0);
}

describe('Shop', () => {
  it('opcodes have canonical values', () => {
    expect(OutHeader.OpenShopDlg).toBe(364);
    expect(OutHeader.ShopResult).toBe(365);
    expect(InHeader.UserShopRequest).toBe(66);
  });

  it('OpenShopDlg decodes normal and rechargeable items', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onShopOpen = (a: any) => captured = a;

    const p = OutPacket.Of(OutHeader.OpenShopDlg);
    p.writeInt(9999999); p.writeShort(2);
    writeHeader(p, 2000000, 50); p.writeShort(1); p.writeShort(100);
    writeHeader(p, 2070000, 700); p.writeDouble(1.5); p.writeShort(800);
    dispatchPayload(router, OutHeader.OpenShopDlg, p.toArray());

    expect(captured).not.toBeNull();
    expect(captured.npcId).toBe(9999999);
    expect(captured.items).toHaveLength(2);
    expect(captured.items[0].itemId).toBe(2000000);
    expect(captured.items[0].price).toBe(50);
    expect(captured.items[1].itemId).toBe(2070000);
    expect(captured.items[1].price).toBe(700);
    expect(captured.items[1].quantity).toBe(800);
  });

  it('ShopResult ServerMsg decodes message', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onShopResult = (a: any) => captured = a;

    const p = OutPacket.Of(OutHeader.ShopResult);
    p.writeByte(19); p.writeByte(1); p.writeString('Closed for the day.');
    dispatchPayload(router, OutHeader.ShopResult, p.toArray());

    expect(captured).not.toBeNull();
    expect(captured.resultType).toBe(19);
    expect(captured.message).toBe('Closed for the day.');
  });

  it('ShopResult BuyNoMoney decodes type', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onShopResult = (a: any) => captured = a;

    const p = OutPacket.Of(OutHeader.ShopResult);
    p.writeByte(2);
    dispatchPayload(router, OutHeader.ShopResult, p.toArray());

    expect(captured).not.toBeNull();
    expect(captured.resultType).toBe(2);
  });

  it('ShopBuy encodes slot item count price', () => {
    const p = new InPacket(GameSender.ShopBuy(3, 2000000, 5, 50).toArray());
    expect(p.readShort()).toBe(InHeader.UserShopRequest);
    expect(p.readByte()).toBe(0);
    expect(p.readShort()).toBe(3);
    expect(p.readInt()).toBe(2000000);
    expect(p.readShort()).toBe(5);
    expect(p.readInt()).toBe(50);
    expect(p.remaining).toBe(0);
  });

  it('ShopSell encodes pos item count', () => {
    const p = new InPacket(GameSender.ShopSell(7, 4000000, 2).toArray());
    expect(p.readShort()).toBe(InHeader.UserShopRequest);
    expect(p.readByte()).toBe(1);
    expect(p.readShort()).toBe(7);
    expect(p.readInt()).toBe(4000000);
    expect(p.readShort()).toBe(2);
    expect(p.remaining).toBe(0);
  });

  it('ShopRecharge and Close encode', () => {
    const r = new InPacket(GameSender.ShopRecharge(4).toArray());
    expect(r.readShort()).toBe(InHeader.UserShopRequest);
    expect(r.readByte()).toBe(2); expect(r.readShort()).toBe(4);
    expect(r.remaining).toBe(0);

    const c = new InPacket(GameSender.ShopClose().toArray());
    expect(c.readShort()).toBe(InHeader.UserShopRequest);
    expect(c.readByte()).toBe(3);
    expect(c.remaining).toBe(0);
  });
});
