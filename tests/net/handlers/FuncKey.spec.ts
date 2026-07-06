import { describe, it, expect } from 'vitest';
import { PacketRouter } from '../../../src/net/session/PacketRouter.js';
import { FieldHandlers } from '../../../src/net/handlers/FieldHandlers.js';
import { InHeader, OutHeader } from '../../../src/net/packet/OpCodes.js';
import { OutPacket } from '../../../src/net/packet/OutPacket.js';
import { InPacket } from '../../../src/net/packet/InPacket.js';

function dispatchPayload(router: PacketRouter, _opcode: number, payload: Uint8Array): void {
  router.dispatch(new InPacket(payload), null as any);
}

const FuncKeyMapSize = 89;

describe('FuncKey', () => {
  it('opcodes have canonical values', () => {
    expect(OutHeader.FuncKeyMappedInit).toBe(398);
    expect(InHeader.FuncKeyMappedModified).toBe(159);
    expect(InHeader.QuickslotKeyMappedModified).toBe(216);
  });

  it('non-default decodes 89 entries', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any[] | null = null;
    fh.onFuncKeyMappedInit = (e: any[]) => captured = e;

    const p = OutPacket.Of(OutHeader.FuncKeyMappedInit);
    p.writeByte(0);
    for (let i = 0; i < FuncKeyMapSize; i++) {
      p.writeByte(i % 8);
      p.writeInt(1000 + i);
    }
    dispatchPayload(router, OutHeader.FuncKeyMappedInit, p.toArray());

    expect(captured).not.toBeNull();
    expect(captured!).toHaveLength(FuncKeyMapSize);
    expect(captured![18].keyIndex).toBe(18);
    expect(captured![18].type).toBe(18 % 8);
    expect(captured![18].actionId).toBe(1018);
  });

  it('default decodes no entries', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any[] | null = null;
    fh.onFuncKeyMappedInit = (e: any[]) => captured = e;

    const p = OutPacket.Of(OutHeader.FuncKeyMappedInit);
    p.writeByte(1);
    dispatchPayload(router, OutHeader.FuncKeyMappedInit, p.toArray());

    expect(captured).not.toBeNull();
    expect(captured!).toHaveLength(0);
  });
});
