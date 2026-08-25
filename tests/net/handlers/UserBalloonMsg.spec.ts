import { describe, it, expect } from 'vitest';
import { PacketRouter } from '../../../src/net/session/PacketRouter.js';
import { FieldHandlers } from '../../../src/net/handlers/FieldHandlers.js';
import { OutHeader } from '../../../src/net/packet/OpCodes.js';
import { OutPacket } from '../../../src/net/packet/OutPacket.js';
import { InPacket } from '../../../src/net/packet/InPacket.js';

function dispatchPayload(router: PacketRouter, opcode: number, payload: Uint8Array): void {
  const buf = new Uint8Array(2 + payload.length);
  buf[0] = opcode & 0xFF;
  buf[1] = (opcode >> 8) & 0xFF;
  buf.set(payload, 2);
  router.dispatch(new InPacket(buf), { send: () => {}, machineId: new Uint8Array(16), isConnected: true });
}

// OG CUserLocal::OnBalloonMsg @0x91D780 — opcode 245 is the LOCAL player's
// script balloon (glTutoMsg0), NOT a mini-room balloon. Decode: str msg,
// short width, short duration(seconds), byte avatarOriented; when not
// avatar-oriented an int x + int y screen anchor follows.
describe('CUserLocal::OnBalloonMsg decode (opcode 245)', () => {
  it('decodes the avatar-oriented script balloon (glTutoMsg0 shape)', () => {
    const router = new PacketRouter();
    const handlers = new FieldHandlers();
    handlers.register(router);
    let captured: any = null;
    handlers.onUserBalloonMsg = (args) => { captured = args; };

    const p = OutPacket.Raw();
    p.writeString('Once you leave this area you won\'t be able to return.');
    p.writeShort(150);  // width
    p.writeShort(5);    // duration seconds
    p.writeByte(1);     // avatarOriented
    dispatchPayload(router, OutHeader.BalloonMsg, p.toArray());

    expect(captured).to.not.equal(null);
    expect(captured.msg).to.contain('Once you leave this area');
    expect(captured.width).to.equal(150);
    expect(captured.durationMs).to.equal(5000);
    expect(captured.avatarOriented).to.equal(true);
    expect(captured.x).toBeUndefined();
    expect(captured.y).toBeUndefined();
  });

  it('reads the int x/y anchor when not avatar-oriented', () => {
    const router = new PacketRouter();
    const handlers = new FieldHandlers();
    handlers.register(router);
    let captured: any = null;
    handlers.onUserBalloonMsg = (args) => { captured = args; };

    const p = OutPacket.Raw();
    p.writeString('hello');
    p.writeShort(120);
    p.writeShort(3);
    p.writeByte(0);
    p.writeInt(-40);
    p.writeInt(200);
    dispatchPayload(router, OutHeader.BalloonMsg, p.toArray());

    expect(captured.msg).to.equal('hello');
    expect(captured.avatarOriented).to.equal(false);
    expect(captured.x).to.equal(-40);
    expect(captured.y).to.equal(200);
  });
});
