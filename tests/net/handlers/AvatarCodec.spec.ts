import { describe, it, expect } from 'vitest';
import { AvatarCodec } from '../../../src/net/handlers/AvatarCodec.js';
import { OutPacket } from '../../../src/net/packet/OutPacket.js';
import { InPacket } from '../../../src/net/packet/InPacket.js';
import { CharacterStat } from '../../../src/domain/CharacterStat.js';

function buildBody(writer: (p: OutPacket) => void): InPacket {
  const p = OutPacket.Raw();
  writer(p);
  return new InPacket(p.toArray());
}

describe('AvatarCodec.DecodeCharacterStat', () => {
  it('decodes non-extend job character stat correctly', () => {
    const pkt = buildBody(p => {
      p.writeInt(1001);               // characterId
      p.writeBytes(new TextEncoder().encode('TestChar\0\0\0\0\0')); // name (13 bytes)
      p.writeByte(1);                 // gender
      p.writeByte(3);                 // skin
      p.writeInt(20001);              // face
      p.writeInt(30001);              // hair
      p.writeLong(100001n);           // petSn1
      p.writeLong(100002n);           // petSn2
      p.writeLong(100003n);           // petSn3
      p.writeByte(50);                // level
      p.writeShort(100);              // job
      p.writeShort(4);                // str
      p.writeShort(5);                // dex
      p.writeShort(6);                // int
      p.writeShort(7);                // luk
      p.writeInt(500);                // hp
      p.writeInt(1000);               // maxHp
      p.writeInt(200);                // mp
      p.writeInt(500);                // maxMp
      p.writeShort(10);               // ap
      // Non-extend SP: 2 bytes
      p.writeByte(5);                 // spLow
      p.writeByte(1);                 // spHigh
      p.writeInt(9999);               // exp
      p.writeShort(50);               // pop
      p.writeInt(0);                  // tempExp
      p.writeInt(100000000);          // posMap
      p.writeByte(0);                 // portal
      p.writeInt(3600);               // playTime
      p.writeShort(0);                // subJob
    });

    const s = AvatarCodec.DecodeCharacterStat(pkt);
    expect(s.characterId).toBe(1001);
    expect(s.name).toBe('TestChar');
    expect(s.gender).toBe(1);
    expect(s.skin).toBe(3);
    expect(s.face).toBe(20001);
    expect(s.hair).toBe(30001);
    expect(Number(s.petSn1)).toBe(100001);
    expect(Number(s.petSn2)).toBe(100002);
    expect(Number(s.petSn3)).toBe(100003);
    expect(s.level).toBe(50);
    expect(s.job).toBe(100);
    expect(s.str).toBe(4);
    expect(s.dex).toBe(5);
    expect(s.int).toBe(6);
    expect(s.luk).toBe(7);
    expect(s.hp).toBe(500);
    expect(s.maxHp).toBe(1000);
    expect(s.mp).toBe(200);
    expect(s.maxMp).toBe(500);
    expect(s.ap).toBe(10);
    expect(s.spRaw).toHaveLength(2);
    expect(s.spRaw[0]).toBe(5);
    expect(s.spRaw[1]).toBe(1);
    expect(s.exp).toBe(9999);
    expect(s.pop).toBe(50);
    expect(s.posMap).toBe(100000000);
    expect(s.playTime).toBe(3600);
    expect(s.subJob).toBe(0);
  });

  it('decodes extend-job SP layout', () => {
    const pkt = buildBody(p => {
      p.writeInt(2001);               // characterId (Evan)
      p.writeBytes(new TextEncoder().encode('EvanChar\0\0\0\0\0')); // name (13 bytes)
      p.writeByte(0); p.writeByte(0); p.writeInt(0); p.writeInt(0);
      p.writeLong(0n); p.writeLong(0n); p.writeLong(0n);
      p.writeByte(10);                // level
      p.writeShort(2200);             // job (Evan = 2200, extend)
      p.writeShort(0); p.writeShort(0); p.writeShort(0); p.writeShort(0);
      p.writeInt(0); p.writeInt(0); p.writeInt(0); p.writeInt(0);
      p.writeShort(0);
      // Extend SP: count + count*2 bytes
      p.writeByte(2);                 // count
      p.writeByte(0); p.writeByte(3); // jobLevel=0, sp=3
      p.writeByte(1); p.writeByte(5); // jobLevel=1, sp=5
      p.writeInt(0); p.writeShort(0); p.writeInt(0);
      p.writeInt(0); p.writeByte(0); p.writeInt(0); p.writeShort(0);
    });

    const s = AvatarCodec.DecodeCharacterStat(pkt);
    expect(s.characterId).toBe(2001);
    expect(s.job).toBe(2200);
    expect(s.level).toBe(10);
    // SP raw: count(1) + count*2(4) = 5 bytes
    expect(s.spRaw).toHaveLength(5);
    expect(s.spRaw[0]).toBe(2);     // count
    expect(s.spRaw[1]).toBe(0);     // jobLevel 0
    expect(s.spRaw[2]).toBe(3);     // sp for level 0
    expect(s.spRaw[3]).toBe(1);     // jobLevel 1
    expect(s.spRaw[4]).toBe(5);     // sp for level 1
  });

  it('round-trips encode<->decode character stat', () => {
    // Build an OutPacket with expected stat fields, then decode and verify
    const expected = new CharacterStat();
    expected.characterId = 505;
    expected.name = 'Alice';
    expected.gender = 2;
    expected.skin = 0;
    expected.face = 10000;
    expected.hair = 20000;
    expected.petSn1 = 555n;
    expected.petSn2 = 0n;
    expected.petSn3 = 0n;
    expected.level = 30;
    expected.job = 200; // warrior
    expected.str = 100;
    expected.dex = 30;
    expected.int = 10;
    expected.luk = 10;
    expected.hp = 2000;
    expected.maxHp = 2200;
    expected.mp = 200;
    expected.maxMp = 250;
    expected.ap = 15;
    expected.spRaw = new Uint8Array([10, 2]); // non-extend
    expected.exp = 50000;
    expected.pop = 10;
    expected.tempExp = 0;
    expected.posMap = 100000000;
    expected.portal = 0;
    expected.playTime = 99999;
    expected.subJob = 0;

    const p = OutPacket.Raw();
    p.writeInt(expected.characterId);
    p.writeBytes(new TextEncoder().encode(expected.name.padEnd(13, '\0')));
    p.writeByte(expected.gender);
    p.writeByte(expected.skin);
    p.writeInt(expected.face);
    p.writeInt(expected.hair);
    p.writeLong(typeof expected.petSn1 === 'bigint' ? expected.petSn1 : BigInt(expected.petSn1));
    p.writeLong(typeof expected.petSn2 === 'bigint' ? expected.petSn2 : BigInt(expected.petSn2));
    p.writeLong(typeof expected.petSn3 === 'bigint' ? expected.petSn3 : BigInt(expected.petSn3));
    p.writeByte(expected.level);
    p.writeShort(expected.job);
    p.writeShort(expected.str);
    p.writeShort(expected.dex);
    p.writeShort(expected.int);
    p.writeShort(expected.luk);
    p.writeInt(expected.hp);
    p.writeInt(expected.maxHp);
    p.writeInt(expected.mp);
    p.writeInt(expected.maxMp);
    p.writeShort(expected.ap);
    p.writeBytes(expected.spRaw);
    p.writeInt(expected.exp);
    p.writeShort(expected.pop);
    p.writeInt(expected.tempExp);
    p.writeInt(expected.posMap);
    p.writeByte(expected.portal);
    p.writeInt(expected.playTime);
    p.writeShort(expected.subJob);

    const decoded = AvatarCodec.DecodeCharacterStat(new InPacket(p.toArray()));
    expect(decoded.characterId).toBe(expected.characterId);
    expect(decoded.name).toBe(expected.name);
    expect(decoded.gender).toBe(expected.gender);
    expect(decoded.skin).toBe(expected.skin);
    expect(decoded.face).toBe(expected.face);
    expect(decoded.hair).toBe(expected.hair);
    expect(Number(decoded.petSn1)).toBe(555);
    expect(decoded.level).toBe(expected.level);
    expect(decoded.job).toBe(expected.job);
    expect(decoded.str).toBe(expected.str);
    expect(decoded.ap).toBe(expected.ap);
    expect(Array.from(decoded.spRaw)).toEqual([10, 2]);
    expect(decoded.exp).toBe(expected.exp);
    expect(decoded.posMap).toBe(expected.posMap);
    expect(decoded.playTime).toBe(expected.playTime);
  });
});
