import { describe, it, expect } from 'vitest';
import { PacketRouter } from '../../../src/net/session/PacketRouter.js';
import { FieldHandlers } from '../../../src/net/handlers/FieldHandlers.js';
import { InHeader, OutHeader } from '../../../src/net/packet/OpCodes.js';
import { OutPacket } from '../../../src/net/packet/OutPacket.js';
import { InPacket } from '../../../src/net/packet/InPacket.js';
import { GameSender } from '../../../src/net/senders/GameSender.js';

function dispatchPayload(router: PacketRouter, _opcode: number, payload: Uint8Array): void {
  router.dispatch(new InPacket(payload), null as any);
}

function buildResponse(): OutPacket {
  const p = OutPacket.Of(OutHeader.CharacterInfo);
  p.writeInt(12345); p.writeByte(85); p.writeShort(412); p.writeShort(150);
  p.writeByte(0); p.writeString('Heroes'); p.writeString('Legends');
  // Two bytes here, not one — CWvsContext::OnCharacterInfo (decompile/A05750.c)
  // reads a discarded scratch byte then a second byte (the real pet count).
  p.writeByte(0); p.writeByte(1); // scratch, petCount=1
  // OG: CUIUserInfo::SetMultiPetInfo (IDA: 0x8b66a0) is a do-while — decode
  // one pet's full field block first, THEN a trailing continuation byte.
  // No leading "has next" byte before the first pet.
  p.writeInt(5000000); p.writeString('Fluffy');
  p.writeByte(10); p.writeShort(30000); p.writeByte(100); p.writeShort(7); p.writeInt(0);
  p.writeByte(0); // continuation byte: stop after 1 pet
  p.writeByte(0); p.writeByte(0); p.writeInt(0); p.writeShort(0); p.writeInt(0);
  return p;
}

describe('CharacterInfo', () => {
  it('request opcode is 109', () => {
    expect(InHeader.UserCharacterInfoRequest).toBe(109);
  });
  it('response opcode is 61', () => {
    expect(OutHeader.CharacterInfo).toBe(61);
  });

  it('request encodes updateTime charId petInfo', () => {
    const p = new InPacket(GameSender.UserCharacterInfoRequest(778899).toArray());
    expect(p.readShort()).toBe(InHeader.UserCharacterInfoRequest);
    expect(p.readInt()).toBe(0);
    expect(p.readInt()).toBe(778899);
    expect(p.readByte()).toBe(0);
    expect(p.remaining).toBe(0);
  });

  it('DecodeCharacterInfo decodes core fields and pet', () => {
    const pkt = new InPacket(buildResponse().toArray());
    pkt.readShort();
    const a = FieldHandlers.DecodeCharacterInfo(pkt);
    expect(a.charId).toBe(12345);
    expect(a.level).toBe(85);
    expect(a.job).toBe(412);
    expect(a.fame).toBe(150);
    expect(a.married).toBe(false);
    expect(a.guild).toBe('Heroes');
    expect(a.alliance).toBe('Legends');
    expect(a.pets).toHaveLength(1);
    expect(a.pets[0].templateId).toBe(5000000);
    expect(a.pets[0].name).toBe('Fluffy');
    expect(a.pets[0].level).toBe(10);
  });

  it('registered handler fires event', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onCharacterInfo = (a: any) => captured = a;
    dispatchPayload(router, OutHeader.CharacterInfo, buildResponse().toArray());
    expect(captured).not.toBeNull();
    expect(captured.charId).toBe(12345);
    expect(captured.guild).toBe('Heroes');
  });

  it('no pets decodes empty pet list', () => {
    const p = OutPacket.Of(OutHeader.CharacterInfo);
    p.writeInt(7); p.writeByte(30); p.writeShort(0); p.writeShort(-5);
    p.writeByte(0); p.writeString(''); p.writeString('');
    p.writeByte(0); p.writeByte(0); // scratch, petCount=0 -> no pet bytes follow
    const ip = new InPacket(p.toArray());
    ip.readShort();
    const a = FieldHandlers.DecodeCharacterInfo(ip);
    expect(a.charId).toBe(7);
    expect(a.level).toBe(30);
    expect(a.fame).toBe(-5);
    expect(a.guild).toBe('');
    expect(a.pets).toHaveLength(0);
  });
});
