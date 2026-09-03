/**
 * CActionMan::LoadCharacterAction (0x427d00) — Process Avatar Equipment
 *
 * Signature: (nAction, nGender, nSkin, aAvatarHairEquip[60], &apFE,
 *             nWeaponStickerID, nVehicleID, bTamingMobTired, nGhostIndex)
 *
 * Processing steps:
 *   1. If action == 47 (ghost): only keep slots 0,1,3,4
 *   2. Else: copy full array, clear ring slots (19,20)
 *   3. Cash item rules:
 *      - If slot 5 is cash (105xxxx) and slot 6 exists:
 *        * If slot 5 is cash OR slot 6 is NOT cash → hide slot 6
 *      - Default hair: slot 5 = gender? 1041046:1040036
 *      - Default face: slot 6 = gender? 1061039:1060026
 *   4. Hide special items (hardcoded IDs):
 *      slot 1 == 1002186 → 0
 *      slot 4 == 1032024 → 0
 *      slot 3 == 1022079 → 0
 *      slot 7 == 1072153 → 0
 *      slot 8 == 1082102 → 0
 *      slot 9 == 1102039 → 0
 *      slot 10 == 1092067 → 0
 *   5. Weapon sticker: if 1702099 or 1702190 → hide
 *   6. Vehicle overrides (190xxx, 193xxx, 1902040-42, 1983xxx):
 *      - Hide slots 10,11
 *      - Override action for mount animations
 *   7. Action 100: hide weapon slots
 *   8. Riding actions (80,81): clear weapon sticker
 *   9. Calls load_character_action() then MergeCharacterSprite()
 */
export {};
