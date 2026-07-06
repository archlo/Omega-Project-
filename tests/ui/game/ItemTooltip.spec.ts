import { describe, it, expect } from 'vitest';
import { ItemTooltip } from '../../../src/ui/game/ItemTooltip.js';
import { BuiltInFont } from '../../../src/ui/BuiltInFont.js';
import { TooltipAssets } from '../../../src/ui/game/TooltipAssets.js';

// TODO_AUDIT.md Hundred-and-second/Hundred-and-fifth/Hundred-and-ninth passes:
// equip tooltips show how many pieces of the item's own set are equipped.
// Exercises _buildInfoLines directly rather than the full Draw() pipeline —
// Draw()'s Graphics.fill() calls hit a separate, pre-existing color-format
// bug (0xRRGGBBAA constants passed where Pixi wants 0xRRGGBB) unrelated to
// this change; noted in TODO_AUDIT.md rather than fixed here.
describe('ItemTooltip set-item info line', () => {
  function makeTooltip() {
    const icons = { LoadAttr: () => null, LoadIcon: () => null } as any;
    const assets = new TooltipAssets({} as any, null);
    return new ItemTooltip(new BuiltInFont(), icons, assets);
  }

  it('includes a set-item line with the equipped count for set items', () => {
    const tip = makeTooltip();
    const lines = (tip as any)._buildInfoLines(1000000, { SetItemId: 5 }, 3);
    expect(lines.some((l: any) => l.text?.includes('Set Item') && l.text.includes('3'))).toBe(true);
  });

  it('omits the set-item line for items with no set', () => {
    const tip = makeTooltip();
    const lines = (tip as any)._buildInfoLines(1000000, { SetItemId: 0 }, 0);
    expect(lines.some((l: any) => l.text?.includes('Set Item'))).toBe(false);
  });

  it('returns no lines when there is no attr at all', () => {
    const tip = makeTooltip();
    expect((tip as any)._buildInfoLines(1000000, null, 5)).toEqual([]);
  });
});
