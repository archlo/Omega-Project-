import { describe, it, expect } from 'vitest';
import { PacketRouter } from '../../src/net/session/PacketRouter.js';
import { OutHeader } from '../../src/net/packet/OpCodes.js';
import { OutPacket } from '../../src/net/packet/OutPacket.js';
import { InPacket } from '../../src/net/packet/InPacket.js';

function buildPacket(op: number, ...body: number[]): InPacket {
  const p = OutPacket.Of(op);
  for (const b of body) p.writeByte(b);
  return new InPacket(p.toArray());
}

describe('PacketRouter', () => {
  it('dispatches registered handler', () => {
    const router = new PacketRouter();
    let captured = 0;
    router.register(OutHeader.CheckPasswordResult, (pkt) => {
      captured = pkt.readByte();
    });

    router.dispatch(buildPacket(OutHeader.CheckPasswordResult, 0x07), null!);
    expect(captured).toBe(0x07);
  });

  it('dispatch unknown opcode does not throw', () => {
    const router = new PacketRouter();
    expect(() => router.dispatch(buildPacket(9999), null!)).not.toThrow();
  });

  it('unregister removes handler', () => {
    const router = new PacketRouter();
    let fired = false;
    router.register(OutHeader.AliveReq, () => { fired = true; });
    router.unregister(OutHeader.AliveReq);
    router.dispatch(buildPacket(OutHeader.AliveReq), null!);
    expect(fired).toBe(false);
  });
});
