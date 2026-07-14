import { describe, expect, it } from 'vitest';
import { MonsterCarnival } from '../../../src/ui/game/MonsterCarnival.js';

describe('MonsterCarnival', () => {
  it('shows decoded CP and status state', () => {
    const panel = new MonsterCarnival(null, null);

    panel.SetState({ team: 1, personalCp: 12, personalCpDiff: 3, myTeamCp: 34, enemyCp: 20, enemyCpTotal: 50, lastMessage: 'summoned' });

    expect(panel.isVisible).toBe(true);
    // Content is now split across multiple text fields
    const teamLabel = (panel as any)._teamLabel.text as string;
    const personalCpVal = (panel as any)._personalCpValue.text as string;
    const enemyCpVal = (panel as any)._enemyCpValue.text as string;
    const msgText = (panel as any)._msgText.text as string;
    expect(teamLabel).toContain('Team 1');
    expect(personalCpVal).toContain('12');
    expect(personalCpVal).toContain('+3');
    expect(enemyCpVal).toContain('20/50');
    expect(msgText).toBe('summoned');
  });
});
