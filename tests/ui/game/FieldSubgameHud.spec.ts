import { describe, expect, it } from 'vitest';
import { FieldSubgameHud } from '../../../src/ui/game/FieldSubgameHud.js';

describe('FieldSubgameHud', () => {
  it('shows confirmed field type names on field load', () => {
    const hud = new FieldSubgameHud();
    hud.SetField(14, 925020000);
    expect(hud.container.visible).toBe(true);
    expect((hud as any)._title.text).toBe('Mu Lung Dojo');
  });

  it('shows packet-driven Monster Carnival state even before field type is known', () => {
    const hud = new FieldSubgameHud();
    hud.SetField(0, 980000000);
    hud.SetMonsterCarnival({ team: 1, personalCp: 12, myTeamCp: 34, enemyCp: 20 });
    expect(hud.container.visible).toBe(true);
    expect((hud as any)._body.text).toContain('CP 12');
  });
});
