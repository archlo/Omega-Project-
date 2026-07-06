import { describe, expect, it } from 'vitest';
import { Maker } from '../../../src/ui/game/Maker.js';
import { WzPackage } from '../../../src/wz/WzPackage.js';

describe('Maker', () => {
  it('loads a bounded recipe list from Etc ItemMake data', () => {
    const etc = WzPackage.OpenBase('wz_client', 'Etc');
    const recipes = Maker.BuildRecipeList(etc, (id) => id === 1003108 ? 'Test Recipe' : undefined, 2);

    expect(recipes).toHaveLength(2);
    expect(recipes[0]).toEqual({ id: 1003108, name: 'Test Recipe' });
  });
});
