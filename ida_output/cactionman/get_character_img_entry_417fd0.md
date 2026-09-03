/**
 * CActionMan::GetCharacterImgEntry (0x417fd0) — Character Image Cache
 *
 * Looks up CHARACTERIMGENTRY by nUOLKey in m_mCharacterImgEntry.
 * If cached: updates tLastAccessed, handles weekly data refresh, returns.
 * If not cached:
 *   1. Allocates CHARACTERIMGENTRY (68 bytes)
 *   2. Calls get_equip_data_path(&sUOL, nUOLKey) to build WZ path
 *   3. Loads pImg via IWzResMan::GetObjectA(sUOL)
 *   4. Reads from info node (StringPool IDs):
 *      - 981: "info" → info property node
 *      - 1177: "islot" → ISlot string
 *      - 1178: "vslot" → VSlot string
 *      - 1179: "sfx" → sound effect path
 *      - 1186: "weekly" → weekly rotation flag
 *      - 1180: "afterimage" → weapon afterimage UOL
 *      - 1181: "walk" → walk action speed
 *      - 1067: "stand" → stand action speed
 *      - 6814: "attack" → attack action speed
 *      - 1182: "speed" → attack speed modifier
 *   5. Calls GetWeaponType(nUOLKey) for weapon category
 *   6. Inserts into m_lCharacterImgEntry (LRU list) and m_mCharacterImgEntry (hash map)
 *   7. If bWeekly: loads weekly variant from get_weekly_data_path()
 */
export {};
