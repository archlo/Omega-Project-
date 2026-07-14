import { describe, expect, it } from 'vitest';
import { RPSGame } from '../../../src/ui/game/RPSGame.js';

describe('RPSGame', () => {
  it('shows decoded sub-action', () => {
    const panel = new RPSGame();

    // SubAction 14 = SUBACTION_CLOSED — resets to start with "Game closed." message
    panel.SetSubAction(14);

    expect((panel as any)._statusText.text).toContain('Game closed');
  });

  it('shows selection mode on subAction 9', () => {
    const panel = new RPSGame();

    panel.SetSubAction(9); // SUBACTION_START_SEL

    expect((panel as any)._statusText.text).toContain('Choose');
    expect(panel.isVisible).toBe(true);
  });

  it('handles server result (win)', () => {
    const panel = new RPSGame();
    panel.SetSubAction(9);

    // Simulate user selecting Paper (1) then server responds with NPC Rock (0)
    (panel as any)._nUserSelect = 1;
    panel.handleServerResult(0, 1);

    expect((panel as any)._resultText.text).toContain('Win');
  });

  it('handles server result (loss)', () => {
    const panel = new RPSGame();
    panel.SetSubAction(9);

    // User selects Rock (0), NPC chooses Paper (1) → loss, streak = -1
    (panel as any)._nUserSelect = 0;
    panel.handleServerResult(1, -1);

    expect((panel as any)._resultText.text).toContain('Lose');
  });

  it('handles tie result', () => {
    const panel = new RPSGame();
    panel.SetSubAction(9);

    // Both chose Rock (0), streak = 0
    (panel as any)._nUserSelect = 0;
    panel.handleServerResult(0, 0);

    expect((panel as any)._resultText.text).toContain('Tie');
  });
});
