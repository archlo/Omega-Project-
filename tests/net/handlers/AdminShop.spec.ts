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

describe('AdminShop', () => {
  it('opcodes have canonical values', () => {
    expect(OutHeader.AdminShopDlg).toBe(366);
    expect(OutHeader.AdminShopResult).toBe(367);
    expect(InHeader.UserAdminShopRequest).toBe(74);
  });

  it('AdminShopDlg decodes action and marks reopen-eligible actions', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onAdminShopDlg = (a: any) => (captured = a);

    const p = OutPacket.Of(OutHeader.AdminShopDlg);
    p.writeByte(6);
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({ action: 6, shouldReopen: true });
  });

  it('AdminShopDlg marks non-reopen actions correctly', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onAdminShopDlg = (a: any) => (captured = a);

    const p = OutPacket.Of(OutHeader.AdminShopDlg);
    p.writeByte(10);
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({ action: 10, shouldReopen: false });
  });

  it('AdminShopResult decodes npc template id and item count', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onAdminShopResult = (a: any) => (captured = a);

    const p = OutPacket.Of(OutHeader.AdminShopResult);
    p.writeInt(9001000); p.writeShort(3);
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({ npcTemplateId: 9001000, itemCount: 3 });
  });

  it('AdminShopRequest encodes initial sub-action', () => {
    const p = new InPacket(GameSender.AdminShopRequest().toArray());
    expect(p.readShort()).toBe(InHeader.UserAdminShopRequest);
    expect(p.readByte()).toBe(2);
    expect(p.remaining).toBe(0);
  });

  it('AdminShopReopen encodes reopen sub-action and npc template id', () => {
    const p = new InPacket(GameSender.AdminShopReopen(9001000).toArray());
    expect(p.readShort()).toBe(InHeader.UserAdminShopRequest);
    expect(p.readByte()).toBe(0);
    expect(p.readInt()).toBe(9001000);
    expect(p.remaining).toBe(0);
  });
});
