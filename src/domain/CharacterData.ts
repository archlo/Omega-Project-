import { CharacterStat } from './CharacterStat.js';
import { InventoryItem } from './InventoryItem.js';

/** One entry of an indexed item list (equip slots use signed shorts including
 *  negative cash slots; inventory tab slots use bytes). */
export interface SlotItem { slot: number; item: InventoryItem; }

export interface SkillRecordEntry { skillId: number; level: number; masterLevel?: number; }
export interface SkillCooltimeEntry { skillId: number; cooltime: number; }
export interface QuestRecordEntry { questId: number; value: string; }
export interface QuestCompleteEntry { questId: number; completedTime: bigint; }
export interface MiniGameRecordEntry { gameId: number; win: number; draw: number; lose: number; score: number; }

/** GW_CoupleRecord::Decode (decompile/4F2B60.c) — raw 0x21 (33) bytes:
 *  dwPairCharacterID:int, sPairCharacterName:string(13), liSN:long, liPairSN:long. */
export interface CoupleRecordEntry { pairCharacterId: number; pairCharacterName: string; itemSn: bigint; pairItemSn: bigint; }

/** GW_FriendRecord::Decode (decompile/4F2B70.c) — raw 0x25 (37) bytes: same as
 *  CoupleRecordEntry plus a trailing dwFriendItemID:int. */
export interface FriendRecordEntry extends CoupleRecordEntry { friendItemId: number; }

/**
 * CharacterData (decompile/4FCCE0.c, `CharacterData::Decode`). Field order and
 * types cross-verified against the kinoko-main server's
 * `CharacterData.encodeCharacterData` (kinoko-main/src/main/java/kinoko/world/user/CharacterData.java)
 * and the DBChar flag bit table (kinoko-main/src/main/java/kinoko/world/user/DBChar.java).
 *
 * Sections from NEWYEARCARD (flag 0x40000) onward are NOT decoded: the
 * client's `GW_NewYearCardRecord::Decode` body is absent from the
 * decompilation corpus entirely (not just obfuscated), so its byte layout
 * cannot be determined without guessing — and a wrong guess here would
 * silently desync every field after it (QuestRecordEx, WildHunterInfo,
 * QuestCompleteOld, VisitorLog). `decodeUpTo` on the result records exactly
 * how far decoding got.
 */
export class CharacterData {
  flag = 0n;
  combatOrders = 0;
  characterStat: CharacterStat | null = null;
  friendMax = 0;
  linkedCharacter = '';
  money = 0;
  /** [equip, consume, install, etc, cash] max inventory slot counts. */
  inventorySize: number[] | null = null;
  equipExtExpire: bigint | null = null;
  equipped: SlotItem[] = [];
  equippedCash: SlotItem[] = [];
  equipInventory: SlotItem[] = [];
  dragonEquipped: SlotItem[] = [];
  mechanicEquipped: SlotItem[] = [];
  consumeInventory: SlotItem[] = [];
  installInventory: SlotItem[] = [];
  etcInventory: SlotItem[] = [];
  cashInventory: SlotItem[] = [];
  skillRecords: SkillRecordEntry[] = [];
  skillCooltimes: SkillCooltimeEntry[] = [];
  questRecords: QuestRecordEntry[] = [];
  questCompleted: QuestCompleteEntry[] = [];
  miniGameRecords: MiniGameRecordEntry[] = [];
  coupleRecords: CoupleRecordEntry[] = [];
  friendRecords: FriendRecordEntry[] = [];
  /** GW_MarriageRecord::Decode (decompile/4F2B50.c) is a raw 0x30 (48) byte
   *  memcpy with no field info recoverable from this call site; kinoko-main
   *  never populates it either. Exposed as opaque bytes, not parsed. */
  marriageRecordsRaw: Uint8Array[] = [];
  /** Fixed-size, no count prefix: 5 ints. */
  mapTransfer: number[] = [];
  /** Fixed-size, no count prefix: 10 ints. */
  mapTransferEx: number[] = [];
  /** How far decoding proceeded; see class doc for why this stops short of
   *  the full OG struct. */
  decodedUpTo: 'MAPTRANSFER' = 'MAPTRANSFER';
}
