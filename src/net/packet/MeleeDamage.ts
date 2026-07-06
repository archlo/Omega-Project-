// OG: CalcDamage::CalcDamageByWT (0x724DB0) → calc_base_damage (0x721500).
// Full formula decompile-verified: floor((tertiary + secondary + 4 * primary)
// / 100 * (attack * k) + 0.5). Weapon type → stat mapping and multipliers
// per the OG's nWT switch table (IDA 0x724DB0).
function resolveDamageBranch(
  jobId: number, weaponType: number,
  str: number, dex: number, int: number, luk: number,
): { primary: number; secondary: number; tertiary: number; k: number; magic: boolean } {
  const category = Math.floor((jobId / 100) % 10);
  if (category === 2) return { primary: int, secondary: luk, tertiary: 0, k: 1.0, magic: true };
  if (jobId % 1000 === 0 || jobId === 2001) return { primary: str, secondary: dex, tertiary: 0, k: 1.2, magic: false };
  switch (weaponType) {
    case 30: case 31: case 32: return { primary: str, secondary: dex, tertiary: 0, k: 1.2, magic: false };
    case 33: return { primary: luk, secondary: dex, tertiary: str, k: 1.3, magic: false };
    case 39: return { primary: str, secondary: dex, tertiary: 0, k: 1.43, magic: false };
    case 40: case 41: case 42: return { primary: str, secondary: dex, tertiary: 0, k: 1.32, magic: false };
    case 43: case 44: return { primary: str, secondary: dex, tertiary: 0, k: 1.49, magic: false };
    case 45: return { primary: dex, secondary: str, tertiary: 0, k: 1.2, magic: false };
    case 46: return { primary: dex, secondary: str, tertiary: 0, k: 1.35, magic: false };
    case 47: return { primary: luk, secondary: dex, tertiary: 0, k: 1.75, magic: false };
    case 48: return { primary: str, secondary: dex, tertiary: 0, k: 1.7, magic: false };
    case 49: return { primary: str, secondary: dex, tertiary: 0, k: 1.5, magic: false };
    default: return { primary: str, secondary: dex, tertiary: 0, k: 0, magic: false };
  }
}

// OG: GetMsateryConstByWT (0x721540)
function getMasteryConst(weaponType: number): number {
  if (weaponType === 37 || weaponType === 38) return 0.25;
  if (weaponType === 45 || weaponType === 46 || weaponType === 47 || weaponType === 49) return 0.15;
  return 0.2;
}

// OG: calc_accr (0x724CE0)
export function calcHitRate(
  acc: number, mobEva: number, atkLevel: number, targetLevel: number, ar = 0,
): number {
  const sqrtAcc = Math.floor(Math.sqrt(acc));
  const sqrtEva = Math.floor(Math.sqrt(mobEva));
  let rate = sqrtAcc - sqrtEva + 100 + Math.floor(ar * (sqrtAcc - sqrtEva + 100) / 100);
  if (rate >= 100) rate = 100;
  if (targetLevel > atkLevel) {
    const penalty = 5 * (targetLevel - atkLevel);
    rate -= Math.min(penalty, rate);
  }
  return rate;
}

// OG: get_weapon_type (0x46F660) — nWT from item ID via nItemID/10000%100.
// OG: GetWeaponType (0x406410) — separate function, checks only 13xxxxx/14xxxxx.
export function getWeaponType(itemId: number): number {
  if (Math.floor(itemId / 1_000_000) !== 1) return 0;
  const wt = Math.floor(itemId / 10000) % 100;
  if (wt === 30 || wt === 31 || wt === 32 || wt === 33 || wt === 34 ||
      wt === 37 || wt === 38 || wt === 39 ||
      wt === 40 || wt === 41 || wt === 42 || wt === 43 || wt === 44 ||
      wt === 45 || wt === 46 || wt === 47 || wt === 48 || wt === 49) return wt;
  return 0;
}

export function calcBaseDamage(
  primary: number, secondary: number, tertiary: number,
  attack: number, k: number,
): number {
  return Math.max(0, Math.floor((tertiary + secondary + 4 * primary) / 100 * (attack * k) + 0.5));
}

// OG: adjust_ramdom_damage (0x726690) — effective mastery = min(0.95, nMastery/100 + k(WT))
export function calcDamageRange(
  jobId: number, weaponType: number, watk: number, matk: number,
  str: number, dex: number, int: number, luk: number,
  mastery: number,
): { min: number; max: number } {
  const { primary, secondary, tertiary, k, magic } = resolveDamageBranch(jobId, weaponType, str, dex, int, luk);
  const attack = weaponType === 39 ? 1 : (magic ? matk : watk);
  const max = calcBaseDamage(primary, secondary, tertiary, attack, k);
  const effective = Math.min(0.95, mastery / 100 + getMasteryConst(weaponType));
  const min = Math.floor(max * effective + 0.5);
  return { min: Math.max(0, Math.min(min, max)), max };
}

// ponytail: kept for test compat — superseded by calcDamageRange.
// Rough estimate: weaponAttack=8+level*1.3, multiplier=4, hardcoded 0.80 min.
export const MeleeDamage = { Estimate: function (
  jobId: number, level: number,
  str: number, dex: number, int: number, luk: number,
): { min: number; max: number } {
  const weaponAttack = 8.0 + level * 1.3;
  const multiplier = 4.0;
  let primary: number, secondary: number;
  const branch = Math.floor(jobId / 100);
  if (branch === 2) { primary = int; secondary = luk; }
  else if (branch === 3) { primary = dex; secondary = str; }
  else if (branch === 4) { primary = luk; secondary = dex; }
  else { primary = str; secondary = dex; }
  let max = Math.floor((primary * multiplier + secondary) * weaponAttack / 100.0);
  if (max < 1) max = 1;
  let min = Math.floor(max * 0.80);
  if (min < 1) min = 1;
  return { min, max };
}};
