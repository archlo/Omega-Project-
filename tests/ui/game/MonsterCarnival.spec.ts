import { describe, expect, it } from 'vitest';
import { MonsterCarnival } from '../../../src/ui/game/MonsterCarnival.js';

describe('MonsterCarnival', () => {
  it('shows decoded CP and status state', () => {
    const panel = new MonsterCarnival();

    panel.SetState({ team: 1, personalCp: 12, personalCpDiff: 3, myTeamCp: 34, enemyCp: 20, enemyCpTotal: 50, lastMessage: 'summoned' });

    expect(panel.isVisible).toBe(true);
    const text = (panel as any)._body.text as string;
    expect(text).toContain('Team: 1');
    expect(text).toContain('Personal CP: 12 (+3)');
    expect(text).toContain('Enemy CP: 20/50');
    expect(text).toContain('Status: summoned');
  });
});
