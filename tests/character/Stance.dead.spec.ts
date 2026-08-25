import { describe, it, expect } from 'vitest';
import { Stance, StanceMoveAction, MoveActionToStance, StanceToWzKey } from '../../src/character/Stance.js';

// Remote-character death is driven by the UserReceiveHP packet (HP ≤ 0) and the
// CUser::OnSetDead flow — NOT by the move-path action byte. The v95 wire byte
// is (moveIdx << 1) | facingLeft; moveAction 18/2 is the separate
// CUser::m_nMoveAction fly value space, not a move-path stance.
describe('Stance moveAction encoding (v95 wire layout)', () => {
  it('encodes the OG wire byte: bit0 = facing-left, bits1+ = move index', () => {
    // CUser::OnResolveMoveAction @0x8E5800 returns (2 * idx) | dir
    expect(StanceMoveAction(Stance.Stand1, false)).toBe(2 << 1);
    expect(StanceMoveAction(Stance.Stand1, true)).toBe((2 << 1) | 1);
    expect(StanceMoveAction(Stance.Walk1, false)).toBe(1 << 1);
    expect(StanceMoveAction(Stance.Walk1, true)).toBe((1 << 1) | 1);
    expect(StanceMoveAction(Stance.Jump, false)).toBe(5 << 1);
    expect(StanceMoveAction(Stance.Ladder, true)).toBe((7 << 1) | 1);
    expect(StanceMoveAction(Stance.Rope, false)).toBe(8 << 1);
    expect(StanceMoveAction(Stance.Sit, false)).toBe(10 << 1);
    expect(StanceMoveAction(Stance.Fly, false)).toBe(9 << 1);
    expect(StanceMoveAction(Stance.Prone, false)).toBe(12 << 1);
  });

  it('decodes remote move actions per MoveActionToStance table', () => {
    expect(MoveActionToStance((1 << 1) | 0).stance).toBe(Stance.Walk1);
    expect(MoveActionToStance((1 << 1) | 1).facingLeft).toBe(true);
    expect(MoveActionToStance((2 << 1) | 0).stance).toBe(Stance.Stand1);
    expect(MoveActionToStance((4 << 1) | 0).stance).toBe(Stance.Stand1); // stand variant collapses
    expect(MoveActionToStance((3 << 1) | 0).stance).toBe(Stance.Fall);   // idx 3 → raw 44 (fall, 0x45FA30)
    expect(MoveActionToStance((5 << 1) | 0).stance).toBe(Stance.Jump);
    expect(MoveActionToStance((6 << 1) | 0).stance).toBe(Stance.Fly);    // swim
    expect(MoveActionToStance((7 << 1) | 0).stance).toBe(Stance.Ladder);
    expect(MoveActionToStance((8 << 1) | 0).stance).toBe(Stance.Rope);
    expect(MoveActionToStance((9 << 1) | 0).stance).toBe(Stance.Fly);
    expect(MoveActionToStance((10 << 1) | 0).stance).toBe(Stance.Sit);   // chair
    expect(MoveActionToStance((12 << 1) | 0).stance).toBe(Stance.Prone);
    expect(MoveActionToStance((19 << 1) | 0).stance).toBe(Stance.Walk1); // dash
  });

  it('walk/stand variants collapse on the wire (OG distinguishes them client-side)', () => {
    for (const s of [Stance.Jump, Stance.Fly, Stance.Ladder, Stance.Rope, Stance.Prone, Stance.Sit]) {
      for (const facingLeft of [true, false]) {
        const back = MoveActionToStance(StanceMoveAction(s, facingLeft));
        expect(back.stance).toBe(s);
        expect(back.facingLeft).toBe(facingLeft);
      }
    }
  });

  it('Stance.Dead maps to the dead action key', () => {
    expect(StanceToWzKey(Stance.Dead)).toBe('dead');
  });
});
