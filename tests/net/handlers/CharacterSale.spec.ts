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

describe('CharacterSale', () => {
  it('opcodes have canonical values', () => {
    expect(OutHeader.CharacterSaleCheckIdResult).toBe(413);
    expect(OutHeader.CharacterSaleCreateResult).toBe(414);
    expect(InHeader.UserCharacterSaleCreate).toBe(85);
    expect(InHeader.UserCharacterSaleCheckId).toBe(311);
  });

  it('CharacterSaleCheckIdResult decodes id and signed result code', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onCharacterSaleCheckIdResult = (a: any) => (captured = a);

    const p = OutPacket.Of(OutHeader.CharacterSaleCheckIdResult);
    p.writeString('Newname'); p.writeByte(0xFF); // -1 as signed byte
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({ id: 'Newname', resultCode: -1 });
  });

  it('CharacterSaleCreateResult decodes mode and code', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onCharacterSaleCreateResult = (a: any) => (captured = a);

    const p = OutPacket.Of(OutHeader.CharacterSaleCreateResult);
    p.writeByte(56); p.writeInt(0);
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({ mode: 56, code: 0 });
  });

  it('CharacterSaleCheckId encodes name', () => {
    const p = new InPacket(GameSender.CharacterSaleCheckId('Newname').toArray());
    expect(p.readShort()).toBe(InHeader.UserCharacterSaleCheckId);
    expect(p.readString()).toBe('Newname');
    expect(p.remaining).toBe(0);
  });

  it('CharacterSaleCreate encodes full field set', () => {
    const p = new InPacket(GameSender.CharacterSaleCreate(3, 5360000, 'Newname', [4, 4, 4, 4], 0, 100, 0, 12345).toArray());
    expect(p.readShort()).toBe(InHeader.UserCharacterSaleCreate);
    expect(p.readInt()).toBe(12345);
    expect(p.readShort()).toBe(3);
    expect(p.readInt()).toBe(5360000);
    expect(p.readString()).toBe('Newname');
    expect(p.readInt()).toBe(4);
    expect(p.readInt()).toBe(4);
    expect(p.readInt()).toBe(4);
    expect(p.readInt()).toBe(4);
    expect(p.readInt()).toBe(0);
    expect(p.readInt()).toBe(100);
    expect(p.readInt()).toBe(0);
    expect(p.readInt()).toBe(12345);
    expect(p.remaining).toBe(0);
  });
});
