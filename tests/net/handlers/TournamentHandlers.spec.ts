import { describe, it, expect, beforeEach } from 'vitest';
import { PacketRouter } from '../../../src/net/session/PacketRouter.js';
import { TournamentHandlers } from '../../../src/net/handlers/TournamentHandlers.js';
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

describe('TournamentHandlers', () => {
  let router: PacketRouter;
  let handlers: TournamentHandlers;

  beforeEach(() => {
    router = new PacketRouter();
    handlers = new TournamentHandlers();
    handlers.register(router);
  });

  // CField_Tournament::OnTournament (decompile/5631A0.c) — exactly two
  // bytes read regardless of branch: flag, then mode.
  it('TournamentInfo decodes flag + mode bytes', () => {
    const values: any[] = [];
    handlers.onTournamentInfo = (args) => values.push(args);

    const p = OutPacket.Raw();
    p.writeByte(0);
    p.writeByte(2);
    dispatchPayload(router, OutHeader.TournamentInfo, p.toArray());

    expect(values).toEqual([{ flag: 0, mode: 2 }]);
  });

  // CField_Tournament::OnTournamentMatchTable (decompile/5630D0.c) — real
  // constructor body (CMatchTableDlg::CMatchTableDlg) absent from this
  // decompile export; only the raw remaining payload is exposed.
  it('TournamentMatchTable exposes raw remaining payload', () => {
    const values: Uint8Array[] = [];
    handlers.onTournamentMatchTable = (raw) => values.push(raw);

    const p = OutPacket.Raw();
    p.writeByte(1);
    p.writeInt(42);
    dispatchPayload(router, OutHeader.TournamentMatchTable, p.toArray());

    expect(values).toHaveLength(1);
    expect(Array.from(values[0])).toEqual(Array.from(p.toArray()));
  });

  // CField_Tournament::OnTournamentSetPrize (decompile/5633A0.c) — flag,
  // hasItems; if hasItems, itemId1 then itemId2 (both Decode4).
  it('TournamentSetPrize decodes no-item branch', () => {
    const values: any[] = [];
    handlers.onTournamentSetPrize = (args) => values.push(args);

    const p = OutPacket.Raw();
    p.writeByte(1);
    p.writeByte(0);
    dispatchPayload(router, OutHeader.TournamentSetPrize, p.toArray());

    expect(values).toEqual([{ flag: 1, hasItems: false, itemId1: null, itemId2: null }]);
  });

  it('TournamentSetPrize decodes two-item branch', () => {
    const values: any[] = [];
    handlers.onTournamentSetPrize = (args) => values.push(args);

    const p = OutPacket.Raw();
    p.writeByte(0);
    p.writeByte(1);
    p.writeInt(1302000);
    p.writeInt(1302001);
    dispatchPayload(router, OutHeader.TournamentSetPrize, p.toArray());

    expect(values).toEqual([{ flag: 0, hasItems: true, itemId1: 1302000, itemId2: 1302001 }]);
  });

  // CField_Tournament::OnTournamentUEW (decompile/563620.c) — single mode byte.
  it('TournamentUEW decodes mode byte', () => {
    const values: any[] = [];
    handlers.onTournamentUEW = (args) => values.push(args);

    const p = OutPacket.Raw();
    p.writeByte(8);
    dispatchPayload(router, OutHeader.TournamentUEW, p.toArray());

    expect(values).toEqual([{ mode: 8 }]);
  });
});
