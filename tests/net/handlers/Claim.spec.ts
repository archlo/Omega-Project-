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
  router.dispatch(new InPacket(buf), null as any);
}

describe('Claim handlers', () => {
  it('ClaimResult result=2 decodes success flag and claim delay', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    const captured: any[] = [];
    fh.onClaimResult = (args) => captured.push(args);

    const p = OutPacket.Raw();
    p.writeByte(2);
    p.writeByte(1);
    p.writeInt(30);
    dispatchPayload(router, OutHeader.ClaimResult, p.toArray());

    expect(captured).toEqual([{ result: 2, success: true, claimDelayMinutes: 30 }]);
  });

  it('ClaimResult notice-only codes consume only the result byte', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    const captured: any[] = [];
    fh.onClaimResult = (args) => captured.push(args);

    const p = OutPacket.Raw();
    p.writeByte(0x41);
    dispatchPayload(router, OutHeader.ClaimResult, p.toArray());

    expect(captured).toEqual([{ result: 0x41 }]);
  });

  it('SetClaimSvrAvailableTime decodes open and close hours', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    const captured: any[] = [];
    fh.onClaimSvrAvailableTime = (args) => captured.push(args);

    const p = OutPacket.Raw();
    p.writeByte(9);
    p.writeByte(18);
    dispatchPayload(router, OutHeader.SetClaimSvrAvailableTime, p.toArray());

    expect(captured).toEqual([{ openHour: 9, closeHour: 18 }]);
  });

  it('ClaimSvrStatusChanged decodes connected flag', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    const captured: boolean[] = [];
    fh.onClaimSvrStatusChanged = (connected) => captured.push(connected);

    const p = OutPacket.Raw();
    p.writeByte(1);
    dispatchPayload(router, OutHeader.ClaimSvrStatusChanged, p.toArray());

    expect(captured).toEqual([true]);
  });
});
