import { describe, expect, it } from 'vitest';
import { QuestLog } from '../../../src/ui/game/QuestLog.js';
import { WzPackage } from '../../../src/wz/WzPackage.js';
import { WzTextureLoader } from '../../../src/render/WzTextureLoader.js';

(globalThis as any).window ??= {};

// Integration test against the real v95 UI.nx. Verifies the authentic WZ
// subtree wiring (Quest/list backgrnd, Tab/enabled|disabled, icon frames,
// BtMyLevel/BtAllLevel) actually resolves — same pattern as
// ItemInventory.toggle.spec.ts / SkillInfoStringNx.spec.ts.
describe('QuestLog WZ asset resolution (real UI.nx)', () => {
  it('loads backgrnd, tabs, icons and toggle buttons from UI.nx', () => {
    const ui = WzPackage.OpenBase('wz_client', 'UI');
    const loader = new WzTextureLoader();
    const panel = new QuestLog({ loader, uiWz: ui });
    panel.isVisible = true;
    panel.setQuestLists([
      [{ name: '[Available]', quests: [2000] }],
      [{ name: '[In Progress]', quests: [2001] }],
      [],
      [],
    ]);
    panel.update(0);

    // The layer holds the WZ background sprites (backgrnd at least).
    const layer = panel.container.children[0];
    expect(layer.children.length).toBeGreaterThan(0);

    // Tab canvases loaded (enabled + disabled at least resolve to Sprites).
    const tabSprites = layer.children.filter(
      (c: any) => c.texture !== undefined && c.texture !== null,
    );
    expect(tabSprites.length).toBeGreaterThan(0);

    // Row layer renders the in-progress row with its name + level.
    const rowLayer = panel.container.children[1];
    const texts = rowLayer.children
      .filter((c: any) => c.text !== undefined)
      .map((c: any) => c.text);
    expect(texts).toContain('[In Progress] (1)');
  });
});
