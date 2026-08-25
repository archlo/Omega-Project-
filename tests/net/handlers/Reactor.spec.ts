import { describe, it, expect } from 'vitest';
import { PacketRouter } from '../../../src/net/session/PacketRouter.js';
import { FieldHandlers } from '../../../src/net/handlers/FieldHandlers.js';
import { OutPacket } from '../../../src/net/packet/OutPacket.js';
import { InPacket } from '../../../src/net/packet/InPacket.js';

// Byte-for-byte mirror of server ReactorPacket.reactorEnterField
// (int objId, int templateId, byte state, short x, short y, bool flip,
//  mapleAsciiString name).
function buildReactorEnterPayload(): Uint8Array {
  const p = OutPacket.Of(336); // opcode written by Of? — no, use raw writer below
  void p;
  const bytes: number[] = [];
  const i32 = (v: number) => bytes.push(v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >>> 24) & 0xff);
  const u16 = (v: number) => bytes.push(v & 0xff, (v >> 8) & 0xff);
  i32(777);          // objId
  i32(1012000);      // templateId
  bytes.push(0);     // state
  u16((-408) & 0xffff); // x short
  u16(596 & 0xffff);    // y short
  bytes.push(0);     // flip
  u16(0);            // empty maple string
  return new Uint8Array(bytes);
}

describe('ReactorEnterField decode', () => {
  it('routes opcode 336 to onReactorEnter with server-shaped args', () => {
    const router = new PacketRouter();
    const handlers = new FieldHandlers();
    handlers.register(router);
    const got: unknown[] = [];
    handlers.onReactorEnter = (args) => got.push(args);
    const session = { send: () => {}, isConnected: true };

    const payload = buildReactorEnterPayload();
    const buf = new Uint8Array(2 + payload.length);
    buf[0] = 336 & 0xff;
    buf[1] = (336 >> 8) & 0xff;
    buf.set(payload, 2);
    router.dispatch(new InPacket(buf), session);

    expect(got).toHaveLength(1);
    expect(got[0]).toMatchObject({ objId: 777, templateId: 1012000, state: 0, flip: false, name: '' });
  });
});
