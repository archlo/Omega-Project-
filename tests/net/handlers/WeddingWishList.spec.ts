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

function writeBundleItem(p: OutPacket, itemId: number, quantity: number): void {
  p.writeByte(2); // InvItemType.Bundle
  p.writeInt(itemId);
  p.writeByte(0); // cash = false
  p.writeLong(0n); // dateExpire
  p.writeShort(quantity);
  p.writeString(''); // title
  p.writeShort(0); // attribute
}

describe('WeddingWishList', () => {
  it('opcodes have canonical values', () => {
    expect(OutHeader.WeddingGiftResult).toBe(77);
    expect(InHeader.UserWeddingWishListRequest).toBe(162);
  });

  it('sub-action 9 decodes wish list strings only', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onWeddingGiftResult = (a: any) => (captured = a);

    const p = OutPacket.Of(OutHeader.WeddingGiftResult);
    p.writeByte(9); p.writeByte(2); p.writeString('A nice hat'); p.writeString('A cape');
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({ subAction: 9, wishList: ['A nice hat', 'A cape'] });
  });

  it('sub-action 10 decodes item tabs only', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onWeddingGiftResult = (a: any) => (captured = a);

    const p = OutPacket.Of(OutHeader.WeddingGiftResult);
    p.writeByte(10);
    p.writeLong(4n); // tab 1 only
    p.writeByte(1);
    writeBundleItem(p, 2000000, 5);
    dispatchPayload(router, p.toArray());

    expect(captured.subAction).toBe(10);
    expect(captured.itemTabs).toHaveLength(1);
    expect(captured.itemTabs[0].tab).toBe(1);
    expect(captured.itemTabs[0].items).toHaveLength(1);
    expect(captured.itemTabs[0].items[0].itemId).toBe(2000000);
    expect(captured.itemTabs[0].items[0].quantity).toBe(5);
  });

  it('sub-action 11 decodes wish list then item tabs', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onWeddingGiftResult = (a: any) => (captured = a);

    const p = OutPacket.Of(OutHeader.WeddingGiftResult);
    p.writeByte(11);
    p.writeByte(1); p.writeString('Ring');
    p.writeLong(8n); // tab 2 only
    p.writeByte(1);
    writeBundleItem(p, 4000000, 1);
    dispatchPayload(router, p.toArray());

    expect(captured.subAction).toBe(11);
    expect(captured.wishList).toEqual(['Ring']);
    expect(captured.itemTabs).toEqual([{ tab: 2, items: [expect.objectContaining({ itemId: 4000000, quantity: 1 })] }]);
  });

  it('sub-action 15 decodes item tabs only (no wish list)', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onWeddingGiftResult = (a: any) => (captured = a);

    const p = OutPacket.Of(OutHeader.WeddingGiftResult);
    p.writeByte(15);
    p.writeLong(0n); // no tabs present
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({ subAction: 15, itemTabs: [] });
  });

  it.each([12, 13, 14, 16])('sub-action %i decodes with no further fields', (sub) => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onWeddingGiftResult = (a: any) => (captured = a);

    const p = OutPacket.Of(OutHeader.WeddingGiftResult);
    p.writeByte(sub);
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({ subAction: sub });
  });

  it('WeddingWishListPutItem encodes sub-action, pos, itemId, count', () => {
    const p = new InPacket(GameSender.WeddingWishListPutItem(3, 2000000, 1).toArray());
    expect(p.readShort()).toBe(InHeader.UserWeddingWishListRequest);
    expect(p.readByte()).toBe(6);
    expect(p.readShort()).toBe(3);
    expect(p.readInt()).toBe(2000000);
    expect(p.readShort()).toBe(1);
    expect(p.remaining).toBe(0);
  });

  it('WeddingWishListGetItem encodes sub-action, tab, idx', () => {
    const p = new InPacket(GameSender.WeddingWishListGetItem(2, 0).toArray());
    expect(p.readShort()).toBe(InHeader.UserWeddingWishListRequest);
    expect(p.readByte()).toBe(7);
    expect(p.readByte()).toBe(2);
    expect(p.readByte()).toBe(0);
    expect(p.remaining).toBe(0);
  });
});
