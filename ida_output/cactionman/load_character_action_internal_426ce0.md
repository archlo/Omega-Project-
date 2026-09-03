/**
 * CActionMan::load_character_action (0x426ce0) — Internal Character Action Loader
 *
 * Signature: (nAction, nSkin, aAvatarHairEquip[60], &aFrame, nWeaponStickerID, nGhostIndex)
 *
 * Processing steps:
 *   1. Check if cap (slot 1) exists → bCapEquip flag
 *   2. Extract weapon sticker: nWeaponStickerID / 100000 == 17 ? nWeaponStickerID : 0
 *   3. Load body action: load_item_action(nAction, nSkin, nSkin+2000, ...)
 *   4. Map ghost action: action_mapping_for_ghost(&nAction)
 *   5. Load face action: load_item_action(v11, nSkin, nSkin+12000, ...)
 *      - If action == 47 → use 44 for face
 *   6. Loop through all 60 equipment slots:
 *      - Skip slot 11 for actions: 88,96,112,138,87,27,28
 *      - Always skip slots 18,19,20
 *      - For each non-zero slot: load_item_action()
 *   7. If no cap (slot 1 == 0): set m_sExclVSlot to "CapHair" (StringPool 0x4A1)
 *      for all frames (excludes cap hair from visual slot merging)
 */
export {};
