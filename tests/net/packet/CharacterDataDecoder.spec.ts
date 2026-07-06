import { describe, it, expect } from 'vitest';
import { OutPacket } from '../../../src/net/packet/OutPacket.js';
import { InPacket } from '../../../src/net/packet/InPacket.js';
import { CharacterDataDecoder } from '../../../src/net/packet/CharacterDataDecoder.js';

function writeCharacterStat(p: OutPacket): void {
  p.writeInt(42);
  p.writeBytes(new TextEncoder().encode('TestChar'.padEnd(13, '\0')));
  p.writeByte(0); p.writeByte(0); // gender, skin
  p.writeInt(20000); p.writeInt(0); // face, hair
  p.writeLong(0n); p.writeLong(0n); p.writeLong(0n); // pet SNs
  p.writeByte(30); // level
  p.writeShort(0); // job (non-extend-sp)
  p.writeShort(4); p.writeShort(5); p.writeShort(6); p.writeShort(7); // str/dex/int/luk
  p.writeInt(100); p.writeInt(200); p.writeInt(50); p.writeInt(150); // hp/maxHp/mp/maxMp
  p.writeShort(10); // ap
  p.writeByte(0); p.writeByte(0); // sp (non-extend: 2 bytes)
  p.writeInt(0); p.writeShort(0); p.writeInt(0); // exp, pop, tempExp
  p.writeInt(100000000); p.writeByte(0); p.writeInt(0); p.writeShort(0); // posMap, portal, playTime, subJob
}

function toPacket(p: OutPacket): InPacket {
  return new InPacket(p.toArray());
}

describe('CharacterDataDecoder', () => {
  it('decodes the bare header with no flags set', () => {
    const p = OutPacket.Raw();
    p.writeLong(0n); // flag
    p.writeByte(7); // combatOrders
    p.writeByte(0); // hasRemoveSn = false
    const d = CharacterDataDecoder.Decode(toPacket(p));
    expect(d.flag).toBe(0n);
    expect(d.combatOrders).toBe(7);
    expect(d.characterStat).toBeNull();
  });

  it('decodes the remove-SN lists when present', () => {
    const p = OutPacket.Raw();
    p.writeLong(0n);
    p.writeByte(0);
    p.writeByte(1); // hasRemoveSn = true
    p.writeByte(0); // discarded byte
    p.writeInt(2); p.writeLong(111n); p.writeLong(222n); // first FILETIME list
    p.writeInt(1); p.writeLong(333n); // second FILETIME list (discarded)
    const d = CharacterDataDecoder.Decode(toPacket(p));
    expect(d.combatOrders).toBe(0);
  });

  it('decodes CHARACTER flag: stat, friendMax, linkedCharacter', () => {
    const p = OutPacket.Raw();
    p.writeLong(0x1n);
    p.writeByte(0); p.writeByte(0);
    writeCharacterStat(p);
    p.writeByte(20); // friendMax
    p.writeByte(1); p.writeString('Buddy'); // linked character
    const d = CharacterDataDecoder.Decode(toPacket(p));
    expect(d.characterStat?.characterId).toBe(42);
    expect(d.characterStat?.level).toBe(30);
    expect(d.friendMax).toBe(20);
    expect(d.linkedCharacter).toBe('Buddy');
  });

  it('decodes MONEY flag', () => {
    const p = OutPacket.Raw();
    p.writeLong(0x2n);
    p.writeByte(0); p.writeByte(0);
    p.writeInt(123456);
    const d = CharacterDataDecoder.Decode(toPacket(p));
    expect(d.money).toBe(123456);
  });

  it('decodes INVENTORYSIZE flag', () => {
    const p = OutPacket.Raw();
    p.writeLong(0x80n);
    p.writeByte(0); p.writeByte(0);
    p.writeByte(24); p.writeByte(48); p.writeByte(36); p.writeByte(60); p.writeByte(96);
    const d = CharacterDataDecoder.Decode(toPacket(p));
    expect(d.inventorySize).toEqual([24, 48, 36, 60, 96]);
  });

  it('decodes EQUIPEXT flag', () => {
    const p = OutPacket.Raw();
    p.writeLong(0x100000n);
    p.writeByte(0); p.writeByte(0);
    p.writeLong(999n);
    const d = CharacterDataDecoder.Decode(toPacket(p));
    expect(d.equipExtExpire).toBe(999n);
  });

  it('decodes ITEMSLOTEQUIP flag with all 5 lists empty', () => {
    const p = OutPacket.Raw();
    p.writeLong(0x4n);
    p.writeByte(0); p.writeByte(0);
    for (let i = 0; i < 5; i++) p.writeShort(0); // 5 terminated-empty short-indexed lists
    const d = CharacterDataDecoder.Decode(toPacket(p));
    expect(d.equipped).toEqual([]);
    expect(d.equippedCash).toEqual([]);
    expect(d.equipInventory).toEqual([]);
    expect(d.dragonEquipped).toEqual([]);
    expect(d.mechanicEquipped).toEqual([]);
  });

  it('decodes ITEMSLOTEQUIP flag with one worn equip item', () => {
    const p = OutPacket.Raw();
    p.writeLong(0x4n);
    p.writeByte(0); p.writeByte(0);
    p.writeShort(-1); // worn slot -1 (cap)
    p.writeByte(1); p.writeInt(1002140); p.writeByte(0); p.writeLong(0n); // type=Equip, itemId, cash=0, expire
    // EquipStats: ruc, cuc (bytes) + 15 shorts (incStr..incJump)
    p.writeByte(0); p.writeByte(0);
    for (let i = 0; i < 15; i++) p.writeShort(0);
    p.writeString(''); p.writeShort(0); // title, attribute
    p.writeByte(0); p.writeByte(0); // levelUpType, level
    p.writeInt(0); p.writeInt(0); p.writeInt(0); // exp, durability, iuc
    p.writeByte(0); p.writeByte(0); // grade, vicious
    for (let i = 0; i < 5; i++) p.writeShort(0); // option1-3, socket1-2
    p.writeLong(0n); // itemSn (non-cash equip)
    p.writeLong(0n); p.writeInt(0); // ItemDecoder's trailing readLong()+readInt()
    p.writeShort(0); // terminator for worn list
    for (let i = 0; i < 4; i++) p.writeShort(0); // remaining 4 empty lists
    const d = CharacterDataDecoder.Decode(toPacket(p));
    expect(d.equipped).toHaveLength(1);
    expect(d.equipped[0].slot).toBe(-1);
    expect(d.equipped[0].item.itemId).toBe(1002140);
  });

  it('decodes ITEMSLOTCONSUME/INSTALL/ETC/CASH flags as empty byte-indexed lists', () => {
    const p = OutPacket.Raw();
    p.writeLong(0x8n | 0x10n | 0x20n | 0x40n);
    p.writeByte(0); p.writeByte(0);
    for (let i = 0; i < 4; i++) p.writeByte(0);
    const d = CharacterDataDecoder.Decode(toPacket(p));
    expect(d.consumeInventory).toEqual([]);
    expect(d.installInventory).toEqual([]);
    expect(d.etcInventory).toEqual([]);
    expect(d.cashInventory).toEqual([]);
  });

  it('decodes SKILLRECORD flag with a master-level-gated skill', () => {
    const p = OutPacket.Raw();
    p.writeLong(0x100n);
    p.writeByte(0); p.writeByte(0);
    p.writeShort(1);
    p.writeInt(22181001); // Evan skill id whose job level resolves to one needing master level (job 2218, level 8+2=10)
    p.writeInt(20); // level
    p.writeLong(0n); // mSkillExpired
    p.writeInt(5); // masterLevel (since isSkillNeedMasterLevel true)
    const d = CharacterDataDecoder.Decode(toPacket(p));
    expect(d.skillRecords).toEqual([{ skillId: 22181001, level: 20, masterLevel: 5 }]);
  });

  it('decodes SKILLRECORD flag without master level for an ordinary skill', () => {
    const p = OutPacket.Raw();
    p.writeLong(0x100n);
    p.writeByte(0); p.writeByte(0);
    p.writeShort(1);
    p.writeInt(1001005); // ordinary beginner skill, job%10 !== 2
    p.writeInt(10);
    p.writeLong(0n);
    const d = CharacterDataDecoder.Decode(toPacket(p));
    expect(d.skillRecords).toEqual([{ skillId: 1001005, level: 10 }]);
  });

  it('decodes SKILLCOOLTIME flag', () => {
    const p = OutPacket.Raw();
    p.writeLong(0x8000n);
    p.writeByte(0); p.writeByte(0);
    p.writeShort(1);
    p.writeInt(5101005); p.writeShort(30);
    const d = CharacterDataDecoder.Decode(toPacket(p));
    expect(d.skillCooltimes).toEqual([{ skillId: 5101005, cooltime: 30 }]);
  });

  it('decodes QUESTRECORD flag', () => {
    const p = OutPacket.Raw();
    p.writeLong(0x200n);
    p.writeByte(0); p.writeByte(0);
    p.writeShort(1);
    p.writeShort(12345); p.writeString('1');
    const d = CharacterDataDecoder.Decode(toPacket(p));
    expect(d.questRecords).toEqual([{ questId: 12345, value: '1' }]);
  });

  it('decodes QUESTCOMPLETE flag', () => {
    const p = OutPacket.Raw();
    p.writeLong(0x4000n);
    p.writeByte(0); p.writeByte(0);
    p.writeShort(1);
    p.writeShort(12345); p.writeLong(987654321n);
    const d = CharacterDataDecoder.Decode(toPacket(p));
    expect(d.questCompleted).toEqual([{ questId: 12345, completedTime: 987654321n }]);
  });

  it('decodes MINIGAMERECORD flag', () => {
    const p = OutPacket.Raw();
    p.writeLong(0x400n);
    p.writeByte(0); p.writeByte(0);
    p.writeShort(1);
    p.writeInt(1); p.writeInt(2); p.writeInt(3); p.writeInt(4); p.writeInt(5);
    const d = CharacterDataDecoder.Decode(toPacket(p));
    expect(d.miniGameRecords).toEqual([{ gameId: 1, win: 2, draw: 3, lose: 4, score: 5 }]);
  });

  it('decodes COUPLERECORD flag: couple, friend, and raw marriage records', () => {
    const p = OutPacket.Raw();
    p.writeLong(0x800n);
    p.writeByte(0); p.writeByte(0);
    p.writeShort(1); // couple count
    p.writeInt(100); p.writeBytes(new TextEncoder().encode('Pair1'.padEnd(13, '\0'))); p.writeLong(1n); p.writeLong(2n);
    p.writeShort(1); // friend count
    p.writeInt(200); p.writeBytes(new TextEncoder().encode('Pair2'.padEnd(13, '\0'))); p.writeLong(3n); p.writeLong(4n); p.writeInt(5000);
    p.writeShort(1); // marriage count
    p.writeBytes(new Uint8Array(0x30));
    const d = CharacterDataDecoder.Decode(toPacket(p));
    expect(d.coupleRecords).toHaveLength(1);
    expect(d.friendRecords).toHaveLength(1);
    expect(d.friendRecords[0].friendItemId).toBe(5000);
    expect(d.marriageRecordsRaw).toHaveLength(1);
    expect(d.marriageRecordsRaw[0]).toHaveLength(0x30);
  });

  it('decodes MAPTRANSFER flag as fixed-size 5+10 int arrays', () => {
    const p = OutPacket.Raw();
    p.writeLong(0x1000n);
    p.writeByte(0); p.writeByte(0);
    for (let i = 0; i < 5; i++) p.writeInt(100 + i);
    for (let i = 0; i < 10; i++) p.writeInt(200 + i);
    const d = CharacterDataDecoder.Decode(toPacket(p));
    expect(d.mapTransfer).toEqual([100, 101, 102, 103, 104]);
    expect(d.mapTransferEx).toEqual([200, 201, 202, 203, 204, 205, 206, 207, 208, 209]);
  });
});
