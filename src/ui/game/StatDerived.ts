// No standalone OG class/function for these formulas — confirmed via
// exhaustive search ("CalcDamage"/"GetMaxDamagePoint"/"GW_CharacterStat::Calc*"/
// "WeaponConstant"/"PAD"/"PDD"/"MAD"/"MDD"/"nAcc"/"nEva"/"Avoidability"/
// "999999", zero real hits). The formula logic, if it exists as a named
// function at all, is folded directly into CUIStatDetail's own methods
// (GetCriticalProp@CUIStatDetail is the one confirmed derived-stat method
// found there) — every constant below could be correct or silently wrong,
// genuinely unverifiable from this decompile export.
export const DamageMax = 999_999;

export interface StatInputs {
  jobId: number;
  str: number;
  dex: number;
  int: number;
  luk: number;
  maxHp: number;
  maxMp: number;
  weaponType: number;
  watk: number;
  matk: number;
  mastery: number;
  speed: number;
  jump: number;
  accBonus: number;
  evaBonus: number;
  pddBonus: number;
  mddBonus: number;
  // Buff combat modifiers
  magicGuardReduction: number;   // % damage absorbed by MP (0-100)
  powerGuardReduction: number;   // % damage reflected (0-100)
  mesoGuardReduction: number;    // % damage absorbed by meso (0-100)
  holySymbolExpRate: number;     // % EXP bonus (0-100)
  sharpEyesCritRate: number;     // % critical rate bonus (0-100)
  stanceRate: number;            // % dodge chance (0-100)
  shadowPartnerDamageRate: number; // % extra damage from ShadowPartner
  hyperBodyHpMul: number;        // % HP multiplier
  hyperBodyMpMul: number;        // % MP multiplier
}

export function defaultStatInputs(): StatInputs {
  return { jobId: 0, str: 0, dex: 0, int: 0, luk: 0, maxHp: 0, maxMp: 0, weaponType: 0, watk: 0, matk: 0, mastery: 0, speed: 100, jump: 100, accBonus: 0, evaBonus: 0, pddBonus: 0, mddBonus: 0, magicGuardReduction: 0, powerGuardReduction: 0, mesoGuardReduction: 0, holySymbolExpRate: 0, sharpEyesCritRate: 0, stanceRate: 0, shadowPartnerDamageRate: 0, hyperBodyHpMul: 0, hyperBodyMpMul: 0 };
}

export interface DerivedStats {
  minDamage: number;
  maxDamage: number;
  accuracy: number;
  avoidability: number;
  pdd: number;
  mdd: number;
  criticalPercent: number;
  speed: number;
  jump: number;
}

export function computeDerived(s: StatInputs): DerivedStats {
  // TODO_AUDIT.md Thirty-seventh/Thirty-eighth passes: the real formula is
  // CalcDamage::CalcDamageByWT (0x724db0) -> calc_base_damage (0x721500):
  // floor((tertiary + secondary + 4*primary) / 100 * (attack * k) + 0.5),
  // with `k` a per-weapon-type constant and primary/secondary/tertiary/k
  // chosen by weapon type (nWT), not job — job only overrides the whole
  // selection for the Beginner-tier and mage-branch special cases. The
  // previous version conflated `k` (weapon multiplier on attack) with the
  // stat-side constant (always 4 in the real formula) into one number, and
  // selected stats by job instead of weapon type.
  const { primary, secondary, tertiary, k, magic } = resolveDamageBranch(s);
  // nWT===39 passes the literal constant 1 instead of the real attack
  // stat in OG — a real vestigial/bug case, preserved as-observed rather
  // than "fixed", per the Thirty-eighth pass's note.
  const attack = s.weaponType === 39 ? 1 : (magic ? s.matk : s.watk);
  const mastery = Math.max(0, Math.min(s.mastery, 0.95));
  let max = Math.floor((tertiary + secondary + 4 * primary) / 100 * (attack * k) + 0.5);
  let min = Math.floor((tertiary + secondary + 4 * primary * 0.9 * mastery) / 100 * (attack * k) + 0.5);
  max = Math.max(0, Math.min(max, DamageMax));
  min = Math.max(0, Math.min(min, max));

  // BasicStat::CalcBasePACC (0x721b60): floor(dex * 1.2 + luk * 1.0).
  // BasicStat::CalcBasePDD (0x721a40): floor(str*1.2 + dex*0.5 + luk*0.5 + int*0.4).
  // BasicStat::CalcBaseMDD (0x721ad0): floor(int*1.2 + dex*0.5 + luk*0.5 + str*0.4).
  // Final step: multiply by (1 + buffRate/100) and cap at 99999.
  const acc = Math.min(99999, Math.floor(s.dex * 1.2 + s.luk * 1.0) + s.accBonus);
  const eva = Math.min(99999, Math.floor(s.dex * 0.25 + s.luk * 0.25) + s.evaBonus + s.stanceRate);
  const basePdd = Math.floor(s.str * 1.2 + s.dex * 0.5 + s.luk * 0.5 + s.int * 0.4);
  const baseMdd = Math.floor(s.int * 1.2 + s.dex * 0.5 + s.luk * 0.5 + s.str * 0.4);
  const speed = s.speed <= 0 ? 100 : s.speed;
  const jump = s.jump <= 0 ? 100 : s.jump;

  // Critical rate: base 5% + SharpEyes bonus + weapon option critical prob
  const criticalPercent = Math.min(100, 5 + s.sharpEyesCritRate);

  return { minDamage: min, maxDamage: max, accuracy: acc, avoidability: eva, pdd: basePdd + s.pddBonus, mdd: baseMdd + s.mddBonus, criticalPercent, speed, jump };
}

export function resolvePrimarySecondary(s: StatInputs): [number, number, boolean] {
  const category = Math.floor((s.jobId / 100) % 10);
  switch (category) {
    case 1: return [s.str, s.dex, false];
    case 2: return [s.int, s.luk, true];
    case 3: return [s.dex, s.str, false];
    case 4: return [s.luk, s.dex, false];
    case 5: return [s.str, s.dex, false];
    default: return [s.str, s.dex, false];
  }
}

export function primaryStatFlag(jobId: number): number {
  const category = Math.floor((jobId / 100) % 10);
  switch (category) {
    case 1: return 0x40;
    case 2: return 0x100;
    case 3: return 0x80;
    case 4: return 0x200;
    case 5: return 0x40;
    default: return 0x40;
  }
}

interface DamageBranch { primary: number; secondary: number; tertiary: number; k: number; magic: boolean; }

// OG: CalcDamage::CalcDamageByWT (0x724db0) per-nWT switch, decompile-
// verified. nWT is extracted from item ID via get_weapon_type (0x46F660):
// (nItemID / 10000) % 100 for equip items. Mastery const per
// GetMsateryConstByWT (0x721540) — 0.25 for nWT 37/38, 0.15 for 45-47/49,
// 0.2 otherwise. Effective mastery capped at 0.95 per adjust_ramdom_damage
// (0x726690).
function resolveDamageBranch(s: StatInputs): DamageBranch {
  const category = Math.floor((s.jobId / 100) % 10);
  if (category === 2) return { primary: s.int, secondary: s.luk, tertiary: 0, k: 1.0, magic: true };
  if (s.jobId % 1000 === 0 || s.jobId === 2001) return { primary: s.str, secondary: s.dex, tertiary: 0, k: 1.2, magic: false };
  switch (s.weaponType) {
    case 30: case 31: case 32: return { primary: s.str, secondary: s.dex, tertiary: 0, k: 1.2, magic: false };
    case 33: return { primary: s.luk, secondary: s.dex, tertiary: s.str, k: 1.3, magic: false };
    case 39: return { primary: s.str, secondary: s.dex, tertiary: 0, k: 1.43, magic: false };
    case 40: case 41: case 42: return { primary: s.str, secondary: s.dex, tertiary: 0, k: 1.32, magic: false };
    case 43: case 44: return { primary: s.str, secondary: s.dex, tertiary: 0, k: 1.49, magic: false };
    case 45: return { primary: s.dex, secondary: s.str, tertiary: 0, k: 1.2, magic: false };
    case 46: return { primary: s.dex, secondary: s.str, tertiary: 0, k: 1.35, magic: false };
    case 47: return { primary: s.luk, secondary: s.dex, tertiary: 0, k: 1.75, magic: false };
    case 48: return { primary: s.str, secondary: s.dex, tertiary: 0, k: 1.7, magic: false };
    case 49: return { primary: s.str, secondary: s.dex, tertiary: 0, k: 1.5, magic: false };
    default: return { primary: 0, secondary: 0, tertiary: 0, k: 0, magic: false };
  }
}

function getMasteryConstByWT(weaponType: number): number {
  if (weaponType === 37 || weaponType === 38) return 0.25;
  if (weaponType === 45 || weaponType === 46 || weaponType === 47 || weaponType === 49) return 0.15;
  return 0.2;
}

function getEffectiveMastery(masteryFromSkill: number, weaponType: number): number {
  return Math.min(0.95, masteryFromSkill / 100 + getMasteryConstByWT(weaponType));
}

// ── OG: CUserLocal::ApplyDefenseOption (0x90e970) ───────────────────────
// Iterates equip body parts {1,5,6,7,8,9,10,50} (Hat/Top/Bottom/Shoes/
// Gloves/Cape/Shield/Belt), reads IgnoreDAM/IgnoreDAMr from each item's
// ItemOption level data, accumulates by probability, then rolls each entry:
// flat IgnoreDAM subtracts from damage, rate IgnoreDAMr subtracts a %.
// Minimum damage is 1 when any option was applied.
// Parameters: getEquipOption(bodyPart) returns the ItemOption level data for
// that slot, nDamage is modified in-place (reduced).

// OG body parts checked for defense options: 1(Hat),5(Top),6(Bottom),
// 7(Shoes),8(Gloves),9(Cape),10(Shield),50(Belt)
const DEFENSE_OPTION_BODY_PARTS = [1, 5, 6, 7, 8, 9, 10, 50];

export interface DefenseOptionData {
  nIgnoreDAM: number;       // flat damage reduction
  nIgnoreDAMProb: number;   // probability (0-100) for flat reduction
  nIgnoreDAMr: number;      // percentage damage reduction
  nIgnoreDAMrProb: number;  // probability (0-100) for rate reduction
}

export function applyDefenseOption(
  getEquipOption: (bodyPart: number) => DefenseOptionData | null,
  nDamage: number,
): number {
  // Accumulate entries by probability — same-prob entries stack their values
  const flatByProb = new Map<number, number>();
  const rateByProb = new Map<number, number>();

  for (const bp of DEFENSE_OPTION_BODY_PARTS) {
    const opt = getEquipOption(bp);
    if (!opt) continue;
    if (opt.nIgnoreDAMProb > 0 && opt.nIgnoreDAM > 0) {
      flatByProb.set(opt.nIgnoreDAMProb, (flatByProb.get(opt.nIgnoreDAMProb) ?? 0) + opt.nIgnoreDAM);
    }
    if (opt.nIgnoreDAMrProb > 0 && opt.nIgnoreDAMr > 0) {
      rateByProb.set(opt.nIgnoreDAMrProb, (rateByProb.get(opt.nIgnoreDAMrProb) ?? 0) + opt.nIgnoreDAMr);
    }
  }

  let applied = false;

  // OG: iterate flat reductions — each entry rolls independently
  for (const [prob, flatDmg] of flatByProb) {
    if (Math.floor(Math.random() * 101) <= prob) {
      nDamage -= flatDmg;
      applied = true;
    }
  }

  // OG: iterate rate reductions — each entry rolls independently
  for (const [prob, ratePct] of rateByProb) {
    if (Math.floor(Math.random() * 101) <= prob) {
      nDamage -= Math.floor(nDamage * ratePct / 100);
      applied = true;
    }
  }

  // OG: if any defense option was applied and damage dropped to 0 or below,
  // clamp to 1 (defense options never reduce damage to 0).
  if (applied && nDamage <= 0) nDamage = 1;

  return nDamage;
}

// ── OG: CUserLocal::ApplyWeaponOption (0x9092e0) ───────────────────────
// Reads weapon's ItemOption level data at the item's level tier and
// populates outgoing-attack modifiers: critical prob/damage, DAMr,
// BossDAMr, and IgnoreTargetDEF.
export interface WeaponOptionResult {
  criticalProb: number;    // niCr — extra critical hit probability %
  criticalDamage: number;  // niCDr — extra critical damage %
  totalDAMr: number;       // niDAMr — damage reduction %
  bossDAMr: number;        // nBoss — boss damage reduction % (when nBoss > 0, niDAMr goes to bossDAMr instead)
  ignoreTargetDEF: number; // nIgnoreTargetDEF — ignore target defense %
}

export function applyWeaponOption(
  optionData: { niCr: number; niCDr: number; niDAMr: number; nBoss: number; nIgnoreTargetDEF: number } | null,
): WeaponOptionResult {
  const result: WeaponOptionResult = { criticalProb: 0, criticalDamage: 0, totalDAMr: 0, bossDAMr: 0, ignoreTargetDEF: 0 };
  if (!optionData) return result;

  if (optionData.niCr > 0) result.criticalProb = optionData.niCr;
  if (optionData.niCDr > 0) result.criticalDamage = optionData.niCDr;
  // OG: when nBoss > 0, niDAMr goes to bossDAMr; otherwise to totalDAMr
  if (optionData.nBoss > 0) {
    result.bossDAMr = optionData.niDAMr;
  } else if (optionData.niDAMr > 0) {
    result.totalDAMr = optionData.niDAMr;
  }
  if (optionData.nIgnoreTargetDEF > 0) result.ignoreTargetDEF = optionData.nIgnoreTargetDEF;

  return result;
}

// OG: get_weapon_type (0x46F660) — extracts weapon type from item ID
// Returns (nItemID / 10000) % 100 for equip items
export function getWeaponType(itemId: number): number {
  return Math.floor(itemId / 10000) % 100;
}
