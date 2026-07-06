import { describe, it, expect } from 'vitest';
import { computeDerived, defaultStatInputs } from '../../../src/ui/game/StatDerived.js';

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

  it('an unrecognized weapon type produces zero damage (k=0)', () => {
    const s = { ...defaultStatInputs(), jobId: 100, str: 100, dex: 50, weaponType: 999, watk: 100, mastery: 1 };
    const d = computeDerived(s);
    expect(d.maxDamage).toBe(0);
  });
});
