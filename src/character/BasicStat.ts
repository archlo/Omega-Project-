// OG: BasicStat::SetFrom (0x732BA0) — full stat computation pipeline
// ponytail: set effects, dragon/mechanic equips not wired here (depend on
// per-item-slot option IDs from the server). Item options/sockets are
// pre-computed in GameStage._syncStatDetailInputs and fed into the flat/rate
// input fields below.

export interface BasicStatInput {
  baseStr: number; baseDex: number; baseInt: number; baseLuk: number;
  baseMaxHp: number; baseMaxMp: number;
  equipStr: number; equipDex: number; equipInt: number; equipLuk: number;
  equipMaxHp: number; equipMaxMp: number;
  equipMaxHPr: number; equipMaxMPr: number;
  basicStatIncPct: number;
  forcedStr: number; forcedDex: number; forcedInt: number; forcedLuk: number;
  nMaxHPInc: number; nMaxMPInc: number;
  rateStrPct: number; rateDexPct: number; rateIntPct: number; rateLukPct: number;
  rateMaxHPr: number; rateMaxMPr: number;
  nMaxHPIncRate: number; nConversionMaxHPIncRate: number;
  nMorewildMaxHPIncRate: number; nJaguarRidingHPIncRate: number;
  nPdsMHPr: number; nPdsMMPr: number; nSwallowMaxMPIncRate: number;
  // ponytail: set effects, dragon/mechanic equips — add when equipped set items tracked
}

export interface BasicStatOutput {
  str: number; dex: number; int: number; luk: number;
  maxHp: number; maxMp: number;
}

export function defaultBasicStatInput(): BasicStatInput {
  return {
    baseStr: 0, baseDex: 0, baseInt: 0, baseLuk: 0,
    baseMaxHp: 0, baseMaxMp: 0,
    equipStr: 0, equipDex: 0, equipInt: 0, equipLuk: 0,
    equipMaxHp: 0, equipMaxMp: 0,
    equipMaxHPr: 0, equipMaxMPr: 0,
    basicStatIncPct: 0,
    forcedStr: 0, forcedDex: 0, forcedInt: 0, forcedLuk: 0,
    nMaxHPInc: 0, nMaxMPInc: 0,
    rateStrPct: 0, rateDexPct: 0, rateIntPct: 0, rateLukPct: 0,
    rateMaxHPr: 0, rateMaxMPr: 0,
    nMaxHPIncRate: 0, nConversionMaxHPIncRate: 0,
    nMorewildMaxHPIncRate: 0, nJaguarRidingHPIncRate: 0,
    nPdsMHPr: 0, nPdsMMPr: 0, nSwallowMaxMPIncRate: 0,
  };
}

export function computeBasicStat(inp: BasicStatInput): BasicStatOutput {
  // Phase 1: base stats + equipment bonuses
  let str = inp.baseStr + inp.equipStr;
  let dex = inp.baseDex + inp.equipDex;
  let int = inp.baseInt + inp.equipInt;
  let luk = inp.baseLuk + inp.equipLuk;
  let maxHp = inp.baseMaxHp + inp.equipMaxHp;
  let maxMp = inp.baseMaxMp + inp.equipMaxMp;

  // Phase 6: BasicStatInc (single percentage applied to base stats)
  // OG: nSTR += nBasicStatInc * baseSTR / 100
  if (inp.basicStatIncPct !== 0) {
    str += Math.floor(inp.basicStatIncPct * inp.baseStr / 100);
    dex += Math.floor(inp.basicStatIncPct * inp.baseDex / 100);
    int += Math.floor(inp.basicStatIncPct * inp.baseInt / 100);
    luk += Math.floor(inp.basicStatIncPct * inp.baseLuk / 100);
  }

  // Phase 7: ForcedStat override (only when > 0, OG checks positive)
  if (inp.forcedStr > 0) str = inp.forcedStr;
  if (inp.forcedDex > 0) dex = inp.forcedDex;
  if (inp.forcedInt > 0) int = inp.forcedInt;
  if (inp.forcedLuk > 0) luk = inp.forcedLuk;

  // Phase 8: Flat HP/MP increase
  maxHp += inp.nMaxHPInc;
  maxMp += inp.nMaxMPInc;

  // Phase 9: Rate options percentage (applied to current value)
  if (inp.rateStrPct !== 0) str += Math.floor(inp.rateStrPct * str / 100);
  if (inp.rateDexPct !== 0) dex += Math.floor(inp.rateDexPct * dex / 100);
  if (inp.rateIntPct !== 0) int += Math.floor(inp.rateIntPct * int / 100);
  if (inp.rateLukPct !== 0) luk += Math.floor(inp.rateLukPct * luk / 100);

  // Phase 10: HP/MP rate formula
  // OG: maxRate = max(nMaxHPIncRate, nConversionMaxHPIncRate, nMorewildMaxHPIncRate)
  //   nMHP += nMHP * (nJaguarRidingHPIncRate + nPdsMHPr + nIncMaxHPr + bOption.nMHPr + maxRate) / 100
  const maxHpRate = Math.max(inp.nMaxHPIncRate, inp.nConversionMaxHPIncRate, inp.nMorewildMaxHPIncRate);
  const totalHpPct = inp.nJaguarRidingHPIncRate + inp.nPdsMHPr + inp.equipMaxHPr + inp.rateMaxHPr + maxHpRate;
  if (totalHpPct !== 0) maxHp += Math.floor(maxHp * totalHpPct / 100);

  // OG: nMMP += nMMP * (nPdsMMPr + nSwallowMaxMPIncRate + nMaxMPIncRate + nIncMaxMPr + bOption.nMMPr) / 100
  const totalMpPct = inp.nPdsMMPr + inp.nSwallowMaxMPIncRate + inp.nMaxHPIncRate + inp.equipMaxMPr + inp.rateMaxMPr;
  if (totalMpPct !== 0) maxMp += Math.floor(maxMp * totalMpPct / 100);

  // Phase 11: Cap at 99999
  maxHp = Math.min(maxHp, 99999);
  maxMp = Math.min(maxMp, 99999);

  return { str, dex, int, luk, maxHp, maxMp };
}
