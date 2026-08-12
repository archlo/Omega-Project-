import { describe, it, expect } from 'vitest';
import { Stance, StanceMoveAction, MoveActionToStance, StanceToWzKey } from '../../src/character/Stance.js';

// Remote-character death is driven by the UserReceiveHP packet (HP ≤ 0) and the
// CUser::OnSetDead flow — NOT by the move-path stance nibble. The stance byte is
// the low 4 bits of the moveAction; moveAction 18 (0x12) is the separate
// CUser::m_nMoveAction dead value, which does not collide with the move path.
describe('Stance moveAction encoding', () => {
  it('StanceMoveAction / MoveActionToStance round-trip for every stance', () => {
    for (const s of [Stance.Stand1, Stance.Stand2, Stance.Walk1, Stance.Walk2, Stance.Jump, Stance.Alert, Stance.Prone, Stance.Sit]) {
      for (const facingLeft of [true, false]) {
        const back = MoveActionToStance(StanceMoveAction(s, facingLeft));
        expect(back.stance).toBe(s);
        expect(back.facingLeft).toBe(facingLeft);
      }
    }
  });

  it('Stance.Dead maps to the dead action key', () => {
    // CharLook.StartAction(StanceToWzKey(Stance.Dead)) → 'dead'
    expect(StanceToWzKey(Stance.Dead)).toBe('dead');
  });
});
