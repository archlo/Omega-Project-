import { describe, it, expect } from 'vitest';
import { PacketRouter } from '../../../src/net/session/PacketRouter.js';
import { FieldHandlers } from '../../../src/net/handlers/FieldHandlers.js';
import { OutHeader } from '../../../src/net/packet/OpCodes.js';
import { OutPacket } from '../../../src/net/packet/OutPacket.js';
import { InPacket } from '../../../src/net/packet/InPacket.js';

function dispatchPayload(router: PacketRouter, payload: Uint8Array): void {
  router.dispatch(new InPacket(payload), null as any);
}

// OG: CWvsContext::OnEntrustedShopCheckResult (decompile/9FFCB0.c).
describe('EntrustedShopCheckResult', () => {
  it('subType 8 decodes channelLoad (n%100) and busyChannelId', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onEntrustedShopCheckResult = (a) => captured = a;

    const p = OutPacket.Of(OutHeader.EntrustedShopCheckResult);
    p.writeByte(8); p.writeInt(250); p.writeByte(3);
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({ subType: 8, busyChannelId: 3, channelLoad: 50 });
  });

  it('subType 13 decodes searchedShopId', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onEntrustedShopCheckResult = (a) => captured = a;

    const p = OutPacket.Of(OutHeader.EntrustedShopCheckResult);
    p.writeByte(13); p.writeInt(123456);
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({ subType: 13, searchedShopId: 123456 });
  });

  it('subType 14 decodes flag', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onEntrustedShopCheckResult = (a) => captured = a;

    const p = OutPacket.Of(OutHeader.EntrustedShopCheckResult);
    p.writeByte(14); p.writeByte(1);
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({ subType: 14, flag: true });
  });

  it('subType 16 decodes transferChannelId for a real channel value', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onEntrustedShopCheckResult = (a) => captured = a;

    const p = OutPacket.Of(OutHeader.EntrustedShopCheckResult);
    p.writeByte(16); p.writeInt(0); p.writeByte(5);
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({ subType: 16, transferChannelId: 5 });
  });

  it('subType 16 reports transferDenied for the 0xFD/0xFE/0xFF sentinel values', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onEntrustedShopCheckResult = (a) => captured = a;

    const p = OutPacket.Of(OutHeader.EntrustedShopCheckResult);
    p.writeByte(16); p.writeInt(0); p.writeByte(0xFE);
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({ subType: 16, transferDenied: true });
  });

  it('subType 17 decodes ownerId/shopSlot/cashItemSN', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onEntrustedShopCheckResult = (a) => captured = a;

    const sn = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const p = OutPacket.Of(OutHeader.EntrustedShopCheckResult);
    p.writeByte(17); p.writeInt(9001); p.writeShort(2); p.writeBytes(sn);
    dispatchPayload(router, p.toArray());

    expect(captured.subType).toBe(17);
    expect(captured.ownerId).toBe(9001);
    expect(captured.shopSlot).toBe(2);
    expect(Array.from(captured.cashItemSN)).toEqual(Array.from(sn));
  });

  it('subType 18 decodes message only when the leading flag is set', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onEntrustedShopCheckResult = (a) => captured = a;

    const p = OutPacket.Of(OutHeader.EntrustedShopCheckResult);
    p.writeByte(18); p.writeByte(1); p.writeString('hello');
    dispatchPayload(router, p.toArray());
    expect(captured).toEqual({ subType: 18, message: 'hello' });

    const p2 = OutPacket.Of(OutHeader.EntrustedShopCheckResult);
    p2.writeByte(18); p2.writeByte(0);
    dispatchPayload(router, p2.toArray());
    expect(captured).toEqual({ subType: 18, message: undefined });
  });

  it('subType 7/9/10/11/15 have no further wire data', () => {
    for (const subType of [7, 9, 10, 11, 15]) {
      const router = new PacketRouter();
      const fh = new FieldHandlers();
      fh.register(router);
      let captured: any = null;
      fh.onEntrustedShopCheckResult = (a) => captured = a;

      const p = OutPacket.Of(OutHeader.EntrustedShopCheckResult);
      p.writeByte(subType);
      dispatchPayload(router, p.toArray());
      expect(captured).toEqual({ subType });
    }
  });
});
