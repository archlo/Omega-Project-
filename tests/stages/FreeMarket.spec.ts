import { describe, expect, it, vi } from 'vitest';
import { InPacket } from '../../src/net/packet/InPacket.js';
import { OutPacket } from '../../src/net/packet/OutPacket.js';
import { FieldHandlers } from '../../src/net/handlers/FieldHandlers.js';
import { GameSender } from '../../src/net/senders/GameSender.js';
import { MiniRoomProtocol, MiniRoomType } from '../../src/net/packet/MiniRoomProtocol.js';
import { OtherCharLook } from '../../src/character/OtherCharLook.js';

function makePacket(bytes: number[]): InPacket {
  return new InPacket(new Uint8Array(bytes));
}

// ---------------------------------------------------------------------------
// Free Market chain: town marketNN portal script -> FM entrance -> room map ->
// shop create/balloon/enter. The server side owns steps 1-3 (FreeMarket.ts
// portal scripts + personalShop=1 room validation); these pin the client half.
// ---------------------------------------------------------------------------
describe('Free Market client wiring', () => {
  it('MiniRoomCreatePersonalShop matches the OG create shape', () => {
    // CWvsContext::SendCreateMiniRoomRequest shop branch: after the type
    // byte the packet carries str title, byte 0, short nPOS, int nItemID.
    const p = GameSender.MiniRoomCreatePersonalShop('My Shop', 5140000);
    expect(p.header).toBe(144); // InHeader.MiniRoom
    const r = new InPacket(p.toArray().slice(2)); // strip the opcode short
    expect(r.readByte()).toBe(MiniRoomProtocol.MRP_Create);
    expect(r.readByte()).toBe(MiniRoomType.PersonalShop);
    expect(r.readString()).toBe('My Shop');
    expect(r.readByte()).toBe(0);
    expect(r.readShort()).toBe(0); // nPOS
    expect(r.readInt()).toBe(5140000); // Regular Store Permit
  });

  it('decodes UserMiniRoomBalloon attach (with dwMiniRoomSN) and tracks it on the owner entry', () => {
    const fh = new FieldHandlers();
    const got: any[] = [];
    fh.onMiniRoom = (_action, args) => got.push(args);
    const h = (fh as unknown as { handleUserMiniRoomBalloon: (p: InPacket) => void }).handleUserMiniRoomBalloon.bind(fh);

    // Attach: charId=11, type=4 (personal shop), roomId=777,
    // title="WTS", private=0, gameSpec=0, cur=1, max=3, gameOn=0.
    const b = new OutPacket(0);
    b.writeInt(11); b.writeByte(4); b.writeInt(777);
    b.writeString('WTS'); b.writeByte(0); b.writeByte(0);
    b.writeByte(1); b.writeByte(3); b.writeByte(0);
    h(makePacket(b.toArray()));
    expect(got[0]).toMatchObject({ ownerId: 11, miniRoomType: 4, roomId: 777, title: 'WTS' });
  });

  it('decodes the destroy variant (type 0 stops immediately)', () => {
    const fh = new FieldHandlers();
    const got: any[] = [];
    fh.onMiniRoom = (_action, args) => got.push(args);
    const h = (fh as unknown as { handleUserMiniRoomBalloon: (p: InPacket) => void }).handleUserMiniRoomBalloon.bind(fh);
    const b = new OutPacket(0);
    b.writeInt(11); b.writeByte(0); // charId + type 0, nothing else on the wire
    h(makePacket(b.toArray()));
    expect(got[0]).toMatchObject({ ownerId: 11, miniRoomType: 0 });
    expect(got[0].roomId).toBeUndefined();
  });

  it('OtherCharLook exposes the balloon room id for click-to-enter', () => {
    const ch = new OtherCharLook(1, 'ShopOwner', 30, null);
    expect(ch.MiniRoomId).toBe(0);
    ch.MiniRoomId = 42;
    ch.MiniRoomType = MiniRoomType.PersonalShop;
    expect(ch.MiniRoomId).toBe(42);
  });

  it('MiniRoomEnter frames the visitor request around dwMiniRoomSN', () => {
    const p = GameSender.MiniRoomEnter(777, '');
    expect(p.header).toBe(144);
    const r = new InPacket(p.toArray().slice(2)); // strip the opcode short
    expect(r.readByte()).toBe(MiniRoomProtocol.MRP_Enter);
    expect(r.readInt()).toBe(777);
    expect(r.readByte()).toBe(0); // no password
    expect(r.readByte()).toBe(0); // OG trailing byte
  });
});
