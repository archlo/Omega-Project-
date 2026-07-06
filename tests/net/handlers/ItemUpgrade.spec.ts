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

describe('ItemUpgrade', () => {
  it('opcodes have canonical values', () => {
    expect(OutHeader.ItemUpgradeResult).toBe(425);
    expect(InHeader.UserConsumeCashItemUseRequest).toBe(85);
  });

  it('resultByte 65 decodes an error code', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onItemUpgradeResult = (a: any) => (captured = a);

    const p = OutPacket.Of(OutHeader.ItemUpgradeResult);
    p.writeByte(65); p.writeInt(7);
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({ resultByte: 65, errorCode: 7 });
  });

  it('resultByte 66 decodes a sub-result', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onItemUpgradeResult = (a: any) => (captured = a);

    const p = OutPacket.Of(OutHeader.ItemUpgradeResult);
    p.writeByte(66); p.writeInt(2);
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({ resultByte: 66, subResult: 2 });
  });

  it('normal scroll result decodes result and iuc', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onItemUpgradeResult = (a: any) => (captured = a);

    const p = OutPacket.Of(OutHeader.ItemUpgradeResult);
    p.writeByte(1); p.writeInt(0); p.writeInt(3);
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({ resultByte: 1, result: 0, iuc: 3 });
  });

  it('ItemUpgradeApply encodes both timestamps and target fields', () => {
    const p = new InPacket(GameSender.ItemUpgradeApply(5, 2040000, 1, 9, 1000, 2000).toArray());
    expect(p.readShort()).toBe(InHeader.UserConsumeCashItemUseRequest);
    expect(p.readInt()).toBe(1000);
    expect(p.readShort()).toBe(5);
    expect(p.readInt()).toBe(2040000);
    expect(p.readInt()).toBe(1);
    expect(p.readInt()).toBe(9);
    expect(p.readInt()).toBe(2000);
    expect(p.remaining).toBe(0);
  });

  it('ItemProtectorApply encodes the same shape as ItemUpgradeApply', () => {
    const p = new InPacket(GameSender.ItemProtectorApply(5, 2340000, 1, 9, 1000, 2000).toArray());
    expect(p.readShort()).toBe(InHeader.UserConsumeCashItemUseRequest);
    expect(p.readInt()).toBe(1000);
    expect(p.readShort()).toBe(5);
    expect(p.readInt()).toBe(2340000);
    expect(p.readInt()).toBe(1);
    expect(p.readInt()).toBe(9);
    expect(p.readInt()).toBe(2000);
    expect(p.remaining).toBe(0);
  });

  it('KarmaApply encodes a single timestamp and no trailing second timestamp', () => {
    const p = new InPacket(GameSender.KarmaApply(5, 2700000, 1, 9, 1000).toArray());
    expect(p.readShort()).toBe(InHeader.UserConsumeCashItemUseRequest);
    expect(p.readInt()).toBe(1000);
    expect(p.readShort()).toBe(5);
    expect(p.readInt()).toBe(2700000);
    expect(p.readInt()).toBe(1);
    expect(p.readInt()).toBe(9);
    expect(p.remaining).toBe(0);
  });
});
