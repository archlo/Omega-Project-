import { describe, it, expect } from 'vitest';
import { computeDerived, defaultStatInputs } from '../../../src/ui/game/StatDerived.js';
import { calcDamageRange } from '../../../src/net/packet/MeleeDamage.js';

// TODO_AUDIT.md Seventieth pass: BasicStat::CalcBasePACC/CalcBasePDD/CalcBaseMDD
// (decompile 0x721b60/0x721a40/0x721ad0) — real formulas, confirmed wrong
// (ACC) or entirely missing (PDD/MDD base-stat contribution) before this fix.
describe('computeDerived stat formulas', () => {
  it('accuracy uses dex*1.2 + luk*1.0 (not the old dex*0.8 + luk*0.5)', () => {
    const s = { ...defaultStatInputs(), dex: 50, luk: 20 };
    const d = computeDerived(s);
    expect(d.accuracy).toBe(Math.floor(50 * 1.2 + 20 * 1.0));
  });

  it('pdd = str*1.2 + dex*0.5 + luk*0.5 + int*0.4, plus equipment pddBonus', () => {
    const s = { ...defaultStatInputs(), str: 40, dex: 20, luk: 10, int: 5, pddBonus: 100 };
    const d = computeDerived(s);
    const base = Math.floor(40 * 1.2 + 20 * 0.5 + 10 * 0.5 + 5 * 0.4);
    expect(d.pdd).toBe(base + 100);
  });

  it('mdd = int*1.2 + dex*0.5 + luk*0.5 + str*0.4, plus equipment mddBonus', () => {
    const s = { ...defaultStatInputs(), int: 40, dex: 20, luk: 10, str: 5, mddBonus: 50 };
    const d = computeDerived(s);
    const base = Math.floor(40 * 1.2 + 20 * 0.5 + 10 * 0.5 + 5 * 0.4);
    expect(d.mdd).toBe(base + 50);
  });
});

// TODO_AUDIT.md Thirty-seventh/Thirty-eighth passes: CalcDamage::CalcDamageByWT
// (0x724db0) -> calc_base_damage (0x721500) — real formula is
// floor((tertiary + secondary + 4*primary)/100 * (attack*k) + 0.5), with
// primary/secondary/tertiary/k chosen by weapon type (nWT), not job. The
// previous version conflated k (attack multiplier) with the stat-side
// constant (always 4) and selected stats by job instead of weapon type.
describe('computeDerived damage formula', () => {
  it('weapon type 30-32 uses STR/DEX with k=1.2', () => {
    const s = { ...defaultStatInputs(), jobId: 100, str: 100, dex: 50, weaponType: 31, watk: 100, mastery: 1 };
    const d = computeDerived(s);
    expect(d.maxDamage).toBe(Math.floor((50 + 4 * 100) / 100 * (100 * 1.2) + 0.5));
  });

  it('weapon type 33 includes a STR tertiary term with LUK primary/DEX secondary', () => {
    const s = { ...defaultStatInputs(), jobId: 100, str: 30, dex: 20, luk: 100, weaponType: 33, watk: 100, mastery: 1 };
    const d = computeDerived(s);
    expect(d.maxDamage).toBe(Math.floor((30 + 20 + 4 * 100) / 100 * (100 * 1.3) + 0.5));
  });

  it('weapon type 39 forces attack to the literal constant 1 (real OG vestigial case, preserved as-observed)', () => {
    const s = { ...defaultStatInputs(), jobId: 100, str: 100, dex: 50, weaponType: 39, watk: 999, mastery: 1 };
    const d = computeDerived(s);
    expect(d.maxDamage).toBe(Math.floor((50 + 4 * 100) / 100 * (1 * 1.43) + 0.5));
  });

  it('mage-branch jobs use INT/LUK against matk with k=1.0, regardless of weaponType', () => {
    const s = { ...defaultStatInputs(), jobId: 200, int: 100, luk: 50, weaponType: 30, watk: 999, matk: 100, mastery: 1 };
    const d = computeDerived(s);
    expect(d.maxDamage).toBe(Math.floor((50 + 4 * 100) / 100 * (100 * 1.0) + 0.5));
  });

  it('Beginner-tier jobs (job % 1000 === 0) use STR/DEX with k=1.2, regardless of weaponType', () => {
    const s = { ...defaultStatInputs(), jobId: 0, str: 100, dex: 50, weaponType: 47, watk: 100, mastery: 1 };
    const d = computeDerived(s);
    expect(d.maxDamage).toBe(Math.floor((50 + 4 * 100) / 100 * (100 * 1.2) + 0.5));
  });

  it('an unrecognized weapon type computes zero base damage but clamps to a minimum of 1', () => {
    const s = { ...defaultStatInputs(), jobId: 100, str: 100, dex: 50, weaponType: 999, watk: 100, mastery: 1 };
    const d = computeDerived(s);
    expect(d.maxDamage).toBe(1);
    expect(d.minDamage).toBe(1);
  });
});

// OG: CUIStatDetail::Draw (0x8625F0) clamps the displayed damage range to
// [1, 999999] — `if (nMinDmg > 1) {...} else nMinDmg = 1;` and the same for
// nMaxDmg. This mirrors PDamage@0x730130 / MDamage@0x72CD60 (zmax(dmg,1.0),
// zmin(dmg,999999)), so every job/race with zero equipment ATK still shows a
// minimum 1 damage — never "0~0" in the ability-stats window.
describe('computeDerived minimum damage clamp (OG [1, 999999])', () => {
  it('unarmed beginner (job 0, no weapon) shows 1~1, not 0~0 / 0 floating damage', () => {
    const s = { ...defaultStatInputs(), jobId: 0, str: 4, dex: 4, int: 4, luk: 4, weaponType: 0, watk: 0, matk: 0 };
    const d = computeDerived(s);
    expect(d.maxDamage).toBe(1);
    expect(d.minDamage).toBe(1);
  });

  it('warrior-family job with no weapon still clamps to 1', () => {
    const s = { ...defaultStatInputs(), jobId: 100, str: 100, dex: 50, weaponType: 0, watk: 0 };
    const d = computeDerived(s);
    expect(d.maxDamage).toBe(1);
    expect(d.minDamage).toBe(1);
  });

  it('mage-branch job with zero MATK still clamps to 1 (not 0)', () => {
    const s = { ...defaultStatInputs(), jobId: 200, int: 100, luk: 50, weaponType: 38, matk: 0 };
    const d = computeDerived(s);
    expect(d.maxDamage).toBe(1);
    expect(d.minDamage).toBe(1);
  });

  it('Cygnus/Aran-style race job (job 1000/2001) with no ATK clamps to 1', () => {
    const cygnus = { ...defaultStatInputs(), jobId: 1000, str: 10, dex: 5, weaponType: 30, watk: 0 };
    expect(computeDerived(cygnus).maxDamage).toBe(1);
    const aran = { ...defaultStatInputs(), jobId: 2001, str: 10, dex: 5, weaponType: 0, watk: 0 };
    expect(computeDerived(aran).maxDamage).toBe(1);
  });

  it('excessively large damage still caps at 999999 (DamageMax)', () => {
    const s = { ...defaultStatInputs(), jobId: 100, str: 9999, dex: 9999, weaponType: 31, watk: 99999, mastery: 1 };
    const d = computeDerived(s);
    expect(d.maxDamage).toBeLessThanOrEqual(999999);
  });
});

// OG: adjust_ramdom_damage (0x726690) — min = floor(max * min(0.95,
// mastery/100 + GetMsateryConstByWT(nWT)) + 0.5). The panel's range and
// MeleeDamage.calcDamageRange (used by live attacks) must agree exactly.
describe('computeDerived min damage matches the live attack math', () => {
  it('min = floor(max * effectiveMastery + 0.5) with the per-WT mastery const', () => {
    const s = { ...defaultStatInputs(), jobId: 100, str: 100, dex: 50, weaponType: 31, watk: 200, mastery: 20 };
    const d = computeDerived(s);
    // effective = min(0.95, 0.2 + 0.2) = 0.4
    expect(d.minDamage).toBe(Math.floor(d.maxDamage * 0.4 + 0.5));
  });

  it('agrees 1:1 with MeleeDamage.calcDamageRange across branches', () => {
    const cases: Array<[number, number]> = [
      [100, 31], [400, 33], [500, 48], [300, 45], [200, 38], [0, 30],
    ];
    for (const [jobId, wt] of cases) {
      const s = { ...defaultStatInputs(), jobId, str: 80 + jobId % 7, dex: 40, luk: 25, int: 30, weaponType: wt, watk: 120, matk: 90, mastery: 19 };
      const d = computeDerived(s);
      const r = calcDamageRange(jobId, wt, s.watk, s.matk, s.str, s.dex, s.int, s.luk, s.mastery);
      expect(d.minDamage).toBe(r.min);
      expect(d.maxDamage).toBe(r.max);
    }
  });
});
