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
    characterStat = null;
    friendMax = 0;
    linkedCharacter = '';
    money = 0;
    /** [equip, consume, install, etc, cash] max inventory slot counts. */
    inventorySize = null;
    equipExtExpire = null;
    equipped = [];
    equippedCash = [];
    equipInventory = [];
    dragonEquipped = [];
    mechanicEquipped = [];
    consumeInventory = [];
    installInventory = [];
    etcInventory = [];
    cashInventory = [];
    skillRecords = [];
    skillCooltimes = [];
    questRecords = [];
    questCompleted = [];
    miniGameRecords = [];
    coupleRecords = [];
    friendRecords = [];
    /** GW_MarriageRecord::Decode (decompile/4F2B50.c) is a raw 0x30 (48) byte
     *  memcpy with no field info recoverable from this call site; kinoko-main
     *  never populates it either. Exposed as opaque bytes, not parsed. */
    marriageRecordsRaw = [];
    /** Fixed-size, no count prefix: 5 ints. */
    mapTransfer = [];
    /** Fixed-size, no count prefix: 10 ints. */
    mapTransferEx = [];
    /** How far decoding proceeded; see class doc for why this stops short of
     *  the full OG struct. */
    decodedUpTo = 'MAPTRANSFER';
}
//# sourceMappingURL=CharacterData.js.map