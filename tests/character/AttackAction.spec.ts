import { describe, expect, it } from 'vitest';
import { AttackAction } from '../../src/character/AttackAction.js';

describe('AttackAction', () => {
  it('round-trips common packet action codes used for rendered attacks', () => {
    expect(AttackAction.FromCode(6)).toBe('swingO1');
    expect(AttackAction.CodeFor('swingO1')).toBe(6);
    expect(AttackAction.FromCode(9)).toBe('shoot1');
    expect(AttackAction.CodeFor('shoot1')).toBe(9);
  });

  it('uses knuckle animations for attack type 8 instead of one-hand-only actions', () => {
    expect(AttackAction.Pick(8, false, () => 0.99)).toBe('swingO3');
  });
});
