import { describe, expect, it } from 'vitest';
import { RPSGame } from '../../../src/ui/game/RPSGame.js';

describe('RPSGame', () => {
  it('shows decoded sub-action', () => {
    const panel = new RPSGame();

    panel.SetSubAction(4);

    expect((panel as any)._body.text).toContain('Sub-action: 4');
  });
});
