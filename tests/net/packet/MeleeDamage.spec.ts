import { describe, it, expect } from 'vitest';
import { MeleeDamage } from '../../../src/net/packet/MeleeDamage.js';

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
