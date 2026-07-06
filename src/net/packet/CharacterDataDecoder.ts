import { InPacket } from './InPacket.js';
import { ItemDecoder } from './ItemDecoder.js';
import { AvatarCodec } from '../handlers/AvatarCodec.js';
import {
  CharacterData, SlotItem, SkillRecordEntry, SkillCooltimeEntry,
  QuestRecordEntry, QuestCompleteEntry, MiniGameRecordEntry,
  CoupleRecordEntry, FriendRecordEntry,
} from '../../domain/CharacterData.js';

// kinoko-main/src/main/java/kinoko/world/user/DBChar.java
const DBChar = {
  CHARACTER: 0x1, MONEY: 0x2,
  ITEMSLOTEQUIP: 0x4, ITEMSLOTCONSUME: 0x8, ITEMSLOTINSTALL: 0x10, ITEMSLOTETC: 0x20, ITEMSLOTCASH: 0x40,
  INVENTORYSIZE: 0x80,
  SKILLRECORD: 0x100, QUESTRECORD: 0x200, MINIGAMERECORD: 0x400, COUPLERECORD: 0x800,
  MAPTRANSFER: 0x1000, QUESTCOMPLETE: 0x4000, SKILLCOOLTIME: 0x8000,
  EQUIPEXT: 0x100000,
} as const;

// kinoko-main/src/main/java/kinoko/world/job/JobConstants.java
function isEvanJob(jobId: number): boolean { return Math.floor(jobId / 100) === 22 || jobId === 2001; }
function isDualJob(jobId: number): boolean { return Math.floor(jobId / 10) === 43; }
function getJobLevel(jobId: number): number {
  if (jobId % 100 === 0 || jobId === 2001) return 1;
  const raw = isDualJob(jobId) ? Math.floor((jobId - 430) / 2) : jobId % 10;
  const level = raw + 2;
  if (level >= 2 && (level <= 4 || (level <= 10 && isEvanJob(jobId)))) return level;
  return 0;
}

// kinoko-main/src/main/java/kinoko/world/skill/SkillConstants.java
const IGNORE_MASTER_LEVEL_COMMON = new Set([
  1120012, 1220013, 1320011, 2120009, 2220009, 2320010, 3120010, 3120011,
  3220009, 3220010, 4120010, 4220009, 5120011, 5220012, 32120009, 33120010,
]);
function isSkillNeedMasterLevel(skillId: number): boolean {
  if (IGNORE_MASTER_LEVEL_COMMON.has(skillId)) return false;
  const jobId = Math.floor(skillId / 10000);
  if (isEvanJob(jobId)) {
    const jobLevel = getJobLevel(jobId);
    return jobLevel === 9 || jobLevel === 10 || skillId === 22111001 || skillId === 22141002 || skillId === 22140000;
  }
  if (isDualJob(jobId)) {
    return getJobLevel(jobId) === 4 || skillId === 4311003 || skillId === 4321000 || skillId === 4331002 || skillId === 4331005;
  }
  if (jobId === 100 * Math.floor(jobId / 100)) return false;
  return jobId % 10 === 2;
}

function decodeIndexedItemsShort(p: InPacket): SlotItem[] {
  const out: SlotItem[] = [];
  let slot = p.readShort();
  while (slot !== 0) {
    const item = ItemDecoder.Decode(p);
    out.push({ slot, item });
    slot = p.readShort();
  }
  return out;
}

function decodeIndexedItemsByte(p: InPacket): SlotItem[] {
  const out: SlotItem[] = [];
  let slot = p.readByte();
  while (slot !== 0) {
    const item = ItemDecoder.Decode(p);
    out.push({ slot, item });
    slot = p.readByte();
  }
  return out;
}

function decodeCoupleRecord(p: InPacket): CoupleRecordEntry {
  return {
    pairCharacterId: p.readInt(),
    pairCharacterName: p.readString(13),
    itemSn: p.readLong(),
    pairItemSn: p.readLong(),
  };
}

function decodeFriendRecord(p: InPacket): FriendRecordEntry {
  const base = decodeCoupleRecord(p);
  return { ...base, friendItemId: p.readInt() };
}

/**
 * CharacterData::Decode (decompile/4FCCE0.c), `bBackwardUpdate` always false
 * for live network decode (that parameter only gates internal cash-item-SN
 * memory bookkeeping that never touches the packet — confirmed by grepping
 * every `CInPacket::Decode*` call site in the function and finding none
 * inside any `if (bBackwardUpdate)` block).
 *
 * Field-for-field order and types cross-verified against
 * kinoko-main/src/main/java/kinoko/world/user/CharacterData.java's
 * `encodeCharacterData` and DBChar.java's flag bit table. Stops after
 * MAPTRANSFER — see CharacterData's class doc for why.
 */
export class CharacterDataDecoder {
  static Decode(p: InPacket): CharacterData {
    const d = new CharacterData();
    d.flag = p.readLong();
    const flag = d.flag;
    const has = (bit: number) => (flag & BigInt(bit)) !== 0n;

    const snap = () => p.position;
    d.combatOrders = p.readByte();
    const hasRemoveSn = p.readByte() !== 0;
    if (hasRemoveSn) {
      p.readByte();
      const count1 = p.readInt();
      for (let i = 0; i < count1; i++) p.readLong();
      const count2 = p.readInt();
      for (let i = 0; i < count2; i++) p.readLong();
    }
    const o0 = snap();
    if (has(DBChar.CHARACTER)) {
      d.characterStat = AvatarCodec.DecodeCharacterStat(p);
      d.friendMax = p.readByte();
      if (p.readByte() !== 0) d.linkedCharacter = p.readString();
    }
    const o1 = snap();
    if (has(DBChar.MONEY)) d.money = p.readInt();
    const o2 = snap();
    if (has(DBChar.INVENTORYSIZE)) {
      d.inventorySize = [p.readByte(), p.readByte(), p.readByte(), p.readByte(), p.readByte()];
    }
    const o3 = snap();
    if (has(DBChar.EQUIPEXT)) d.equipExtExpire = p.readLong();
    const o4 = snap();
    if (has(DBChar.ITEMSLOTEQUIP)) {
      d.equipped = decodeIndexedItemsShort(p);
      d.equippedCash = decodeIndexedItemsShort(p);
      d.equipInventory = decodeIndexedItemsShort(p);
      d.dragonEquipped = decodeIndexedItemsShort(p);
      d.mechanicEquipped = decodeIndexedItemsShort(p);
    }
    const o5 = snap();
    if (has(DBChar.ITEMSLOTCONSUME)) d.consumeInventory = decodeIndexedItemsByte(p);
    if (has(DBChar.ITEMSLOTINSTALL)) d.installInventory = decodeIndexedItemsByte(p);
    if (has(DBChar.ITEMSLOTETC)) d.etcInventory = decodeIndexedItemsByte(p);
    if (has(DBChar.ITEMSLOTCASH)) d.cashInventory = decodeIndexedItemsByte(p);
    const o6 = snap();
    console.log(`[DECODE] offsets afterRemoveSn=${o0} char=${o1} money=${o2} invSize=${o3} equipExt=${o4} equip=${o5} inv=${o6} remain=${p.remaining} equipped=${d.equipped.length}`);

    if (has(DBChar.SKILLRECORD)) {
      const count = p.readShort();
      for (let i = 0; i < count; i++) {
        const skillId = p.readInt();
        const level = p.readInt();
        p.readLong(); // mSkillExpired FILETIME
        const entry: SkillRecordEntry = { skillId, level };
        if (isSkillNeedMasterLevel(skillId)) entry.masterLevel = p.readInt();
        d.skillRecords.push(entry);
      }
    }
    if (has(DBChar.SKILLCOOLTIME)) {
      const count = p.readShort();
      const entries: SkillCooltimeEntry[] = [];
      for (let i = 0; i < count; i++) entries.push({ skillId: p.readInt(), cooltime: p.readShort() });
      d.skillCooltimes = entries;
    }
    if (has(DBChar.QUESTRECORD)) {
      const count = p.readShort();
      const entries: QuestRecordEntry[] = [];
      for (let i = 0; i < count; i++) entries.push({ questId: p.readShort(), value: p.readString() });
      d.questRecords = entries;
    }
    if (has(DBChar.QUESTCOMPLETE)) {
      const count = p.readShort();
      const entries: QuestCompleteEntry[] = [];
      for (let i = 0; i < count; i++) entries.push({ questId: p.readShort(), completedTime: p.readLong() });
      d.questCompleted = entries;
    }
    if (has(DBChar.MINIGAMERECORD)) {
      const count = p.readShort();
      const entries: MiniGameRecordEntry[] = [];
      for (let i = 0; i < count; i++) {
        entries.push({ gameId: p.readInt(), win: p.readInt(), draw: p.readInt(), lose: p.readInt(), score: p.readInt() });
      }
      d.miniGameRecords = entries;
    }
    if (has(DBChar.COUPLERECORD)) {
      const coupleCount = p.readShort();
      for (let i = 0; i < coupleCount; i++) d.coupleRecords.push(decodeCoupleRecord(p));
      const friendCount = p.readShort();
      for (let i = 0; i < friendCount; i++) d.friendRecords.push(decodeFriendRecord(p));
      const marriageCount = p.readShort();
      for (let i = 0; i < marriageCount; i++) d.marriageRecordsRaw.push(p.readBytes(0x30));
    }
    if (has(DBChar.MAPTRANSFER)) {
      d.mapTransfer = Array.from({ length: 5 }, () => p.readInt());
      d.mapTransferEx = Array.from({ length: 10 }, () => p.readInt());
    }
    return d;
  }
}
