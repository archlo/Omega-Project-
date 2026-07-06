import { describe, expect, it } from 'vitest';
import { SequencedKeyMan, comboSkillId, type ComboCastContext } from '../../src/character/SequencedKeyMan.js';

function ctx(overrides: Partial<ComboCastContext> = {}): ComboCastContext {
  return {
    jobId: 100,
    getSkillLevel: () => 1,
    isAttacking: () => true,
    ...overrides,
  };
}

describe('comboSkillId', () => {
  it('uses Warrior-tree IDs for non-Beginner jobs', () => {
    expect(comboSkillId('double', 110)).toBe(21000002);
    expect(comboSkillId('triple', 110)).toBe(21100001);
  });

  it('uses Beginner innate IDs for job 2000', () => {
    expect(comboSkillId('double', 2000)).toBe(20000014);
    expect(comboSkillId('triple', 2000)).toBe(20000015);
  });
});

describe('SequencedKeyMan', () => {
  it('reserves Double Stab on a tap landing mid-swing when the skill is learned', () => {
    const man = new SequencedKeyMan();
    const c = ctx();
    man.onAttackKey(true, 1000, c);
    man.onAttackKey(false, 1200, c); // 200ms tap, within 420ms window
    expect(man.update({ ...c, isAttacking: () => true })).toBeNull(); // still swinging
    expect(man.update({ ...c, isAttacking: () => false })).toBe(comboSkillId('double', c.jobId));
  });

  it('does not reserve when the skill is not learned', () => {
    const man = new SequencedKeyMan();
    const c = ctx({ getSkillLevel: () => 0 });
    man.onAttackKey(true, 1000, c);
    man.onAttackKey(false, 1200, c);
    expect(man.update({ ...c, isAttacking: () => false })).toBeNull();
  });

  it('does not reserve when the tap lands while not attacking', () => {
    const man = new SequencedKeyMan();
    const c = ctx({ isAttacking: () => false });
    man.onAttackKey(true, 1000, c);
    man.onAttackKey(false, 1200, c);
    expect(man.update({ ...c, isAttacking: () => false })).toBeNull();
  });

  it('does not reserve when the tap exceeds the 420ms double window', () => {
    const man = new SequencedKeyMan();
    const c = ctx();
    man.onAttackKey(true, 1000, c);
    man.onAttackKey(false, 1500, c); // 500ms, past window
    expect(man.update({ ...c, isAttacking: () => false })).toBeNull();
  });

  it('chains into Triple Stab on the next mid-swing tap after Double fires', () => {
    const man = new SequencedKeyMan();
    const c = ctx();
    man.onAttackKey(true, 1000, c);
    man.onAttackKey(false, 1200, c);
    expect(man.update({ ...c, isAttacking: () => false })).toBe(comboSkillId('double', c.jobId));

    man.onAttackKey(true, 2000, c);
    man.onAttackKey(false, 2300, c); // 300ms, within 660ms triple window
    expect(man.update({ ...c, isAttacking: () => false })).toBe(comboSkillId('triple', c.jobId));
  });

  it('resets the chain after Triple Stab fires (no quadruple)', () => {
    const man = new SequencedKeyMan();
    const c = ctx();
    man.onAttackKey(true, 1000, c);
    man.onAttackKey(false, 1200, c);
    man.update({ ...c, isAttacking: () => false });
    man.onAttackKey(true, 2000, c);
    man.onAttackKey(false, 2300, c);
    man.update({ ...c, isAttacking: () => false });

    man.onAttackKey(true, 3000, c);
    man.onAttackKey(false, 3200, c);
    expect(man.update({ ...c, isAttacking: () => false })).toBe(comboSkillId('double', c.jobId));
  });

  it('clear() resets pending state', () => {
    const man = new SequencedKeyMan();
    const c = ctx();
    man.onAttackKey(true, 1000, c);
    man.onAttackKey(false, 1200, c);
    man.clear();
    expect(man.update({ ...c, isAttacking: () => false })).toBeNull();
  });

  it('can derive attack transitions from held-key state', () => {
    const man = new SequencedKeyMan();
    const c = ctx();
    man.observeAttackState(true, 1000, c);
    man.observeAttackState(true, 1100, c);
    man.observeAttackState(false, 1200, c);
    expect(man.update({ ...c, isAttacking: () => false })).toBe(comboSkillId('double', c.jobId));
  });
});
