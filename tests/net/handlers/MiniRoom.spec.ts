import { describe, it, expect } from 'vitest';
import { PacketRouter } from '../../../src/net/session/PacketRouter.js';
import { FieldHandlers } from '../../../src/net/handlers/FieldHandlers.js';
import { OutHeader } from '../../../src/net/packet/OpCodes.js';
import { OutPacket } from '../../../src/net/packet/OutPacket.js';
import { InPacket } from '../../../src/net/packet/InPacket.js';
import { MiniRoomProtocol, MiniRoomType } from '../../../src/net/packet/MiniRoomProtocol.js';
import type { MiniRoomArgs } from '../../../src/net/handlers/PacketArgs.js';

function dispatchPayload(router: PacketRouter, _opcode: number, payload: Uint8Array): void {
  router.dispatch(new InPacket(payload), null as any);
}

describe('MiniRoom (typed MiniRoomArgs)', () => {
  it('MRP_Leave decodes userIndex + leaveType into typed args', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: { action: number; args: MiniRoomArgs } | null = null;
    fh.onMiniRoom = (action, args) => { captured = { action, args }; };

    const p = OutPacket.Of(OutHeader.MiniRoom);
    p.writeByte(MiniRoomProtocol.MRP_Leave);
    p.writeByte(2);  // userIndex
    p.writeByte(0);  // leaveType
    dispatchPayload(router, OutHeader.MiniRoom, p.toArray());

    expect(captured).not.toBeNull();
    expect(captured!.action).toBe(MiniRoomProtocol.MRP_Leave);
    expect(captured!.args.userIndex).toBe(2);
    expect(captured!.args.leaveType).toBe(0);
  });

  it('MRP_CreateResult decodes roomType into typed args', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: { action: number; args: MiniRoomArgs } | null = null;
    fh.onMiniRoom = (action, args) => { captured = { action, args }; };

    const p = OutPacket.Of(OutHeader.MiniRoom);
    p.writeByte(MiniRoomProtocol.MRP_CreateResult);
    p.writeByte(MiniRoomType.TradingRoom);
    dispatchPayload(router, OutHeader.MiniRoom, p.toArray());

    expect(captured).not.toBeNull();
    expect(captured!.action).toBe(MiniRoomProtocol.MRP_CreateResult);
    expect(captured!.args.roomType).toBe(MiniRoomType.TradingRoom);
  });

  it('MRP_InviteResult decodes inviteType + targetName into typed args', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: { action: number; args: MiniRoomArgs } | null = null;
    fh.onMiniRoom = (action, args) => { captured = { action, args }; };

    const p = OutPacket.Of(OutHeader.MiniRoom);
    p.writeByte(MiniRoomProtocol.MRP_InviteResult);
    p.writeByte(2);              // inviteType (non-1 = target name follows)
    p.writeString('SomePlayer'); // targetName
    dispatchPayload(router, OutHeader.MiniRoom, p.toArray());

    expect(captured).not.toBeNull();
    expect(captured!.action).toBe(MiniRoomProtocol.MRP_InviteResult);
    expect(captured!.args.inviteType).toBe(2);
    expect(captured!.args.targetName).toBe('SomePlayer');
  });

  it('MRP_Balloon (via UserMiniRoomBalloon) carries action in typed args', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: { action: number; args: MiniRoomArgs } | null = null;
    fh.onMiniRoom = (action, args) => { captured = { action, args }; };

    const p = OutPacket.Of(OutHeader.UserMiniRoomBalloon);
    p.writeInt(99);                // ownerId
    p.writeByte(MiniRoomType.EntrustedShop);
    p.writeByte(0);               // unknown byte
    p.writeString('My Shop');      // title
    p.writeByte(1);                // pwd (true)
    dispatchPayload(router, OutHeader.UserMiniRoomBalloon, p.toArray());

    expect(captured).not.toBeNull();
    expect(captured!.action).toBe(MiniRoomProtocol.MRP_Balloon);
    expect(captured!.args.balloon).toBe(true);
    expect(captured!.args.ownerId).toBe(99);
    expect(captured!.args.title).toBe('My Shop');
    expect(captured!.args.pwd).toBe(true);
  });

  it('unrecognized sub-type still emits onMiniRoom with action=read-byte', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: { action: number; args: MiniRoomArgs } | null = null;
    fh.onMiniRoom = (action, args) => { captured = { action, args }; };

    const p = OutPacket.Of(OutHeader.MiniRoom);
    p.writeByte(99); // unrecognized sub-type
    dispatchPayload(router, OutHeader.MiniRoom, p.toArray());

    expect(captured).not.toBeNull();
    expect(captured!.action).toBe(99);
    // All optional fields are undefined when no sub-type-specific fields are read.
    expect(captured!.args.roomType).toBeUndefined();
    expect(captured!.args.inviteType).toBeUndefined();
  });
});
