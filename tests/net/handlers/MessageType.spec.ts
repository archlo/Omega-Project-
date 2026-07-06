import { describe, it, expect } from 'vitest';
import { PacketRouter } from '../../../src/net/session/PacketRouter.js';
import { FieldHandlers } from '../../../src/net/handlers/FieldHandlers.js';
import { OutHeader } from '../../../src/net/packet/OpCodes.js';
import { OutPacket } from '../../../src/net/packet/OutPacket.js';
import { InPacket } from '../../../src/net/packet/InPacket.js';
import { MessageType } from '../../../src/net/protocol/Enums.js';
import type {
  CashItemExpireArgs,
  GiveBuffArgs,
  OpenUrlArgs,
  SystemMessageArgs,
} from '../../../src/net/handlers/PacketArgs.js';

function dispatchPayload(router: PacketRouter, _opcode: number, payload: Uint8Array): void {
  router.dispatch(new InPacket(payload), null as any);
}

describe('handleMessage sub-types (Phase 4.6)', () => {
  it('CashItemExpire (2) decodes itemId', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: CashItemExpireArgs | null = null;
    fh.onCashItemExpire = (args) => { captured = args; };

    const p = OutPacket.Of(OutHeader.Message);
    p.writeByte(MessageType.CashItemExpire);
    p.writeInt(5010001);
    dispatchPayload(router, OutHeader.Message, p.toArray());

    expect(captured).not.toBeNull();
    expect(captured!.itemId).toBe(5010001);
  });

  it('IncSp (4) decodes job:short + spGain:byte (decompile/9F8570.c)', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: number | null = null;
    fh.onIncSp = (v) => { captured = v; };

    const p = OutPacket.Of(OutHeader.Message);
    p.writeByte(MessageType.IncSp);
    p.writeShort(122); // job
    p.writeByte(7); // sp gained
    dispatchPayload(router, OutHeader.Message, p.toArray());

    expect(captured).toBe(7);
  });

  it('IncFame (7) decodes a single int, no padding byte (decompile/9F90A0.c)', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: number | null = null;
    fh.onIncFame = (v) => { captured = v; };

    const p = OutPacket.Of(OutHeader.Message);
    p.writeByte(MessageType.IncFame);
    p.writeInt(42);
    dispatchPayload(router, OutHeader.Message, p.toArray());

    expect(captured).toBe(42);
  });

  it('IncGP (8) decodes a single int, no padding byte (decompile/9F91E0.c)', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: number | null = null;
    fh.onIncGp = (v) => { captured = v; };

    const p = OutPacket.Of(OutHeader.Message);
    p.writeByte(MessageType.IncGP);
    p.writeInt(99);
    dispatchPayload(router, OutHeader.Message, p.toArray());

    expect(captured).toBe(99);
  });

  it('GiveBuff (9) decodes itemId', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: GiveBuffArgs | null = null;
    fh.onGiveBuff = (args) => { captured = args; };

    const p = OutPacket.Of(OutHeader.Message);
    p.writeByte(MessageType.GiveBuff);
    p.writeInt(2022179);
    dispatchPayload(router, OutHeader.Message, p.toArray());

    expect(captured).not.toBeNull();
    expect(captured!.itemId).toBe(2022179);
  });

  it('System (11) decodes text', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: SystemMessageArgs | null = null;
    fh.onSystemMessage = (args) => { captured = args; };

    const p = OutPacket.Of(OutHeader.Message);
    p.writeByte(MessageType.System);
    p.writeString('Hello world');
    dispatchPayload(router, OutHeader.Message, p.toArray());

    expect(captured).not.toBeNull();
    expect(captured!.text).toBe('Hello world');
    expect(captured!.type).toBe(MessageType.System);
  });

  it('OpenURL (13) decodes URL', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: OpenUrlArgs | null = null;
    fh.onOpenUrl = (args) => { captured = args; };

    const p = OutPacket.Of(OutHeader.Message);
    p.writeByte(MessageType.OpenURL);
    p.writeString('https://maplestory.nexon.com');
    dispatchPayload(router, OutHeader.Message, p.toArray());

    expect(captured).not.toBeNull();
    expect(captured!.url).toBe('https://maplestory.nexon.com');
  });
});
