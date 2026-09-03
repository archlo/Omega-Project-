/** Item ID category (integer division by 10000). */
export declare function itemCategory(itemId: number): number;
export declare function isProtectedItem(attribute: number): boolean;
/** Category 207 (throwing stars) or 233 (bullets) — used as lottery/gacha items in v95. */
export declare function isLotteryItem(itemId: number): boolean;
/** Category 221 && (itemId-2210000)/1000 == 2 → 2212xxx random morph items. */
export declare function isRandomMorphItemOther(itemId: number): boolean;
/** Categories 200, 201, 202, 205, 221, 236, 238, 245 → state-change consumables. */
export declare function isStateChangeItem(itemId: number): boolean;
/** Category 219 → anti-macro (CAPTCHA) scroll. */
export declare function isAntiMacroItem(itemId: number): boolean;
/** Category 203 → town portal scroll. */
export declare function isPortalScrollItem(itemId: number): boolean;
/** Category 210 → mob summon sack. */
export declare function isMobSummonItem(itemId: number): boolean;
/** Category 212 → pet food. */
export declare function isPetFoodItem(itemId: number): boolean;
/** Category 226 → taming mob food. */
export declare function isTamingMobFoodItem(itemId: number): boolean;
/** Category 227 → bridle (capture mob as pet). */
export declare function isBridleItem(itemId: number): boolean;
/** Category 228 or mastery book sub-IDs → skill learn item. */
export declare function isMasteryBookItem(itemId: number): boolean;
export declare function isSkillLearnItem(itemId: number): boolean;
/** Category 250 → skill reset scroll. */
export declare function isSkillResetItem(itemId: number): boolean;
/** Category 231 → shop scanner. */
export declare function isShopScannerItem(itemId: number): boolean;
/** Category 232 → map transfer item. */
export declare function isMapTransferItem(itemId: number): boolean;
/** Category 545 or 239 → select-NPC item. */
export declare function isSelectNpcItem(itemId: number): boolean;
/** Category 237 → EXP-up item. */
export declare function isExpUpItem(itemId: number): boolean;
/** Category 243 or exact ID 3994225 → script-run item. */
export declare function isScriptRunItem(itemId: number): boolean;
/** Category 246 → item release (scissors/white scroll flow). */
export declare function isReleaseItem(itemId: number): boolean;
/** Category 216 → new year card (consume tab). */
export declare function isNewYearCardItemCon(itemId: number): boolean;
/** Category 301 → portable chair. */
export declare function isPortableChairItem(itemId: number): boolean;
/** Category 408 → mini-game item (omok, memory cards). */
export declare function isMiniGameItem(itemId: number): boolean;
/** Category 416 → book item (skill book UI). */
export declare function isBookItem(itemId: number): boolean;
/** itemId/1000 == 4220 → raise (pet/taming) items 4220xxx. */
export declare function isRaiseItem(itemId: number): boolean;
/** Category 428 → gachapon box. */
export declare function isGachaponBoxItem(itemId: number): boolean;
/** Category 417 → pigmy egg (incubator). */
export declare function isPigmyEgg(itemId: number): boolean;
/** Category 429 → non-cash effect item. */
export declare function isNonCashEffectItem(itemId: number): boolean;
/** Category 432 → UI-open item. */
export declare function isUiOpenItem(itemId: number): boolean;
/** Returns true if the item ID falls in the incubator/life egg range 4170000-41700099. */
export declare function isIncubatorEgg(itemId: number): boolean;
//# sourceMappingURL=ItemChecks.d.ts.map