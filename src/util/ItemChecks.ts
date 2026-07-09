// OG item classification predicates — decompiled 1:1 from v95 IDB.
// All match the exact CDraggableItem::OnDoubleClicked chain ordering.

/** Item ID category (integer division by 10000). */
export function itemCategory(itemId: number): number {
  return Math.floor(itemId / 10000);
}

// ─── Equip tab (TI=1) ────────────────────────────────────────────
// OG: GW_ItemSlotEquip::IsProtectedItem — checks attribute bit 0
export function isProtectedItem(attribute: number): boolean {
  return (attribute & 1) !== 0;
}

// ─── Use tab (TI=2) checks — ordered by OG OnDoubleClicked ───────

/** Category 207 (throwing stars) or 233 (bullets) — used as lottery/gacha items in v95. */
export function isLotteryItem(itemId: number): boolean {
  const c = itemCategory(itemId);
  return c === 207 || c === 233;
}

/** Category 221 && (itemId-2210000)/1000 == 2 → 2212xxx random morph items. */
export function isRandomMorphItemOther(itemId: number): boolean {
  return itemCategory(itemId) === 221 && Math.floor((itemId - 2210000) / 1000) === 2;
}

/** Categories 200, 201, 202, 205, 221, 236, 238, 245 → state-change consumables. */
export function isStateChangeItem(itemId: number): boolean {
  const c = itemCategory(itemId);
  return c === 200 || c === 201 || c === 202 || c === 205
    || c === 221 || c === 236 || c === 238 || c === 245;
}

/** Category 219 → anti-macro (CAPTCHA) scroll. */
export function isAntiMacroItem(itemId: number): boolean {
  return itemCategory(itemId) === 219;
}

/** Category 203 → town portal scroll. */
export function isPortalScrollItem(itemId: number): boolean {
  return itemCategory(itemId) === 203;
}

/** Category 210 → mob summon sack. */
export function isMobSummonItem(itemId: number): boolean {
  return itemCategory(itemId) === 210;
}

/** Category 212 → pet food. */
export function isPetFoodItem(itemId: number): boolean {
  return itemCategory(itemId) === 212;
}

/** Category 226 → taming mob food. */
export function isTamingMobFoodItem(itemId: number): boolean {
  return itemCategory(itemId) === 226;
}

/** Category 227 → bridle (capture mob as pet). */
export function isBridleItem(itemId: number): boolean {
  return itemCategory(itemId) === 227;
}

/** Category 228 or mastery book sub-IDs → skill learn item. */
export function isMasteryBookItem(itemId: number): boolean {
  const c = itemCategory(itemId);
  if (c === 228) return true;
  if (c === 562) return itemId !== 5620007 && itemId !== 5620008;
  return itemId === 5620007 || itemId === 5620008 || itemId === 0x55C126;
}
export function isSkillLearnItem(itemId: number): boolean {
  return itemCategory(itemId) === 228 || isMasteryBookItem(itemId);
}

/** Category 250 → skill reset scroll. */
export function isSkillResetItem(itemId: number): boolean {
  return itemCategory(itemId) === 250;
}

/** Category 231 → shop scanner. */
export function isShopScannerItem(itemId: number): boolean {
  return itemCategory(itemId) === 231;
}

/** Category 232 → map transfer item. */
export function isMapTransferItem(itemId: number): boolean {
  return itemCategory(itemId) === 232;
}

/** Category 545 or 239 → select-NPC item. */
export function isSelectNpcItem(itemId: number): boolean {
  const c = itemCategory(itemId);
  return c === 545 || c === 239;
}

/** Category 237 → EXP-up item. */
export function isExpUpItem(itemId: number): boolean {
  return itemCategory(itemId) === 237;
}

/** Category 243 or exact ID 3994225 → script-run item. */
export function isScriptRunItem(itemId: number): boolean {
  return itemCategory(itemId) === 243 || itemId === 3994225;
}

/** Category 246 → item release (scissors/white scroll flow). */
export function isReleaseItem(itemId: number): boolean {
  return itemCategory(itemId) === 246;
}

/** Category 216 → new year card (consume tab). */
export function isNewYearCardItemCon(itemId: number): boolean {
  return itemCategory(itemId) === 216;
}

// ─── Etc tab (TI=3) checks ──────────────────────────────────────

/** Category 301 → portable chair. */
export function isPortableChairItem(itemId: number): boolean {
  return itemCategory(itemId) === 301;
}

// ─── Setup tab (TI=4 / visual tab 2) checks ─────────────────────

/** Category 408 → mini-game item (omok, memory cards). */
export function isMiniGameItem(itemId: number): boolean {
  return itemCategory(itemId) === 408;
}

/** Category 416 → book item (skill book UI). */
export function isBookItem(itemId: number): boolean {
  return itemCategory(itemId) === 416;
}

/** itemId/1000 == 4220 → raise (pet/taming) items 4220xxx. */
export function isRaiseItem(itemId: number): boolean {
  return Math.floor(itemId / 1000) === 4220;
}

/** Category 428 → gachapon box. */
export function isGachaponBoxItem(itemId: number): boolean {
  return itemCategory(itemId) === 428;
}

/** Category 417 → pigmy egg (incubator). */
export function isPigmyEgg(itemId: number): boolean {
  return itemCategory(itemId) === 417;
}

/** Category 429 → non-cash effect item. */
export function isNonCashEffectItem(itemId: number): boolean {
  return itemCategory(itemId) === 429;
}

/** Category 432 → UI-open item. */
export function isUiOpenItem(itemId: number): boolean {
  return itemCategory(itemId) === 432;
}

// ─── Incubator helpers ───────────────────────────────────────────
/** Returns true if the item ID falls in the incubator/life egg range 4170000-41700099. */
export function isIncubatorEgg(itemId: number): boolean {
  return itemId >= 4170000 && itemId <= 41700099;
}
