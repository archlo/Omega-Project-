import { describe, it, expect } from 'vitest';
import { MeleeDamage, calcDamageRange, getWeaponType } from '../../../src/net/packet/MeleeDamage.js';

describe('MeleeDamage Estimate', () => {
  it('min not greater than max, both positive', () => {
    const { min, max } = MeleeDamage.Estimate(100, 10, 35, 10, 4, 4);
    expect(min).toBeGreaterThanOrEqual(1);
    expect(max).toBeGreaterThanOrEqual(min);
  });

  it('never zero for fresh beginner', () => {
    const { min, max } = MeleeDamage.Estimate(0, 1, 4, 4, 4, 4);
    expect(min).toBeGreaterThanOrEqual(1);
    expect(max).toBeGreaterThanOrEqual(1);
  });

  it('scales with primary stat', () => {
    const { max: weakMax } = MeleeDamage.Estimate(100, 30, 40, 10, 4, 4);
    const { max: strongMax } = MeleeDamage.Estimate(100, 30, 200, 10, 4, 4);
    expect(strongMax).toBeGreaterThan(weakMax);
  });

  it('scales with level', () => {
    const { max: lowMax } = MeleeDamage.Estimate(100, 5, 50, 10, 4, 4);
    const { max: highMax } = MeleeDamage.Estimate(100, 80, 50, 10, 4, 4);
    expect(highMax).toBeGreaterThan(lowMax);
  });

  it('uses int for magician', () => {
    const { max: mageMax } = MeleeDamage.Estimate(200, 30, 4, 4, 120, 20);
    const { max: mageLowInt } = MeleeDamage.Estimate(200, 30, 4, 4, 10, 20);
    expect(mageMax).toBeGreaterThan(mageLowInt);
  });

  it('uses luk for thief', () => {
    const { max: hi } = MeleeDamage.Estimate(400, 30, 4, 20, 4, 120);
    const { max: lo } = MeleeDamage.Estimate(400, 30, 4, 20, 4, 10);
    expect(hi).toBeGreaterThan(lo);
  });
});

// The in-game damage range must scale with the equipped weapon's INSTANCE
// attack (base + scrolling + options), matching what the stat window shows —
// not just the bare WZ template value.
describe('calcDamageRange (equip-inclusive attack)', () => {
  it('a higher weapon attack widens the range', () => {
    const base = calcDamageRange(100, 30, 15, 0, 35, 10, 4, 4, 0);
    const scrolled = calcDamageRange(100, 30, 60, 0, 35, 10, 4, 4, 0);
    expect(scrolled.max).toBeGreaterThan(base.max);
    expect(scrolled.min).toBeGreaterThan(base.min);
  });

  it('higher STR (from AP or equip) widens the range', () => {
    const low = calcDamageRange(100, 30, 15, 0, 35, 10, 4, 4, 0);
    const high = calcDamageRange(100, 30, 15, 0, 200, 10, 4, 4, 0);
    expect(high.max).toBeGreaterThan(low.max);
  });

  it('getWeaponType recognizes v95 weapon categories', () => {
    expect(getWeaponType(1302000)).toBe(30); // one-handed sword
    expect(getWeaponType(1402000)).toBe(40); // two-handed sword
    expect(getWeaponType(2000000)).toBe(0);  // non-weapon
  });
});
