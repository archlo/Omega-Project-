import { describe, expect, it } from 'vitest';
import { AttackAction } from '../../src/character/AttackAction.js';

describe('AttackAction', () => {
  it('maps packet action codes to the v95 pose table (index == code)', () => {
    // Verified against the exe's s_aCharacterActionData StringPool entries:
    // 5=swingO1, 6=swingO2, 7=swingO3, 16=stabO1, 31=shoot1, 41=proneStab.
    expect(AttackAction.FromCode(5)).toBe('swingO1');
    expect(AttackAction.CodeFor('swingO1')).toBe(5);
    expect(AttackAction.FromCode(6)).toBe('swingO2');
    expect(AttackAction.CodeFor('swingO2')).toBe(6);
    expect(AttackAction.FromCode(16)).toBe('stabO1');
    expect(AttackAction.CodeFor('stabO1')).toBe(16);
    expect(AttackAction.FromCode(17)).toBe('stabO2');
    expect(AttackAction.CodeFor('stabO2')).toBe(17);
    expect(AttackAction.FromCode(31)).toBe('shoot1');
    expect(AttackAction.CodeFor('shoot1')).toBe(31);
    expect(AttackAction.CodeFor('shoot2')).toBe(32);
    expect(AttackAction.CodeFor('proneStab')).toBe(41);
  });

  it('round-trips a few weapon pose families used for rendered attacks', () => {
    expect(AttackAction.CodeFor('swingO3')).toBe(7);
    expect(AttackAction.CodeFor('swingT2')).toBe(10);
    expect(AttackAction.CodeFor('swingP1')).toBe(13);
    expect(AttackAction.CodeFor('stabT1')).toBe(19);
    expect(AttackAction.FromCode(19)).toBe('stabT1');
    expect(AttackAction.CodeFor('shot')).toBe(116);
    expect(AttackAction.FromCode(116)).toBe('shot');
  });

  it('uses knuckle animations for attack type 8 instead of one-hand-only actions', () => {
    expect(AttackAction.Pick(8, false, () => 0.99)).toBe('swingO3');
  });

  it('round-trips every pose Pick can return so the wire sends what renders', () => {
    // A pose that CodeFor can't map silently falls back to code 6 (swingO2),
    // so remote players would render a different swing than the local one.
    // Every pose reachable from Pick must therefore decode back to itself.
    const picked = new Set<string>();
    for (let t = 0; t <= 10; t++) {
      for (const r of [0, 0.33, 0.66, 0.99]) picked.add(AttackAction.Pick(t, false, () => r));
    }
    picked.add(AttackAction.ProneStab); // the prone branch
    for (const name of picked) {
      const code = AttackAction.CodeFor(name);
      expect(AttackAction.FromCode(code)).toBe(name);
    }
  });
});
