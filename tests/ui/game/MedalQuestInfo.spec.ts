import { describe, expect, it } from 'vitest';
import { MedalQuestInfo } from '../../../src/ui/game/MedalQuestInfo.js';

describe('MedalQuestInfo', () => {
  it('opens medal groups and forwards quest selection', () => {
    (globalThis as any).window ??= {};
    const panel = new MedalQuestInfo();
    let selected = 0;
    panel.nameOf = (id) => `Quest ${id}`;
    panel.onSelectQuest = (id) => { selected = id; };

    panel.Open([{ name: '[Medal 1]', quests: [19000], medalItems: { 19000: 1142000 } }]);

    expect(panel.isVisible).toBe(true);
    panel.update(0);
    // panel.container → _log.container → _rowLayer (children[1])
    const logContainer = panel.container.children[0];
    const rowLayer = logContainer.children[1];
    const rendered = rowLayer.children.some((child: any) => child.text === 'Quest 19000 [1142000]');
    expect(rendered).toBe(true);
    // Row 0 is the category header; quest 19000 sits at local row 1 (y=74).
    // The embedded QuestLog sits at (50,60), so screen y = 74 + 60 = 134.
    expect(panel.handleMouseButton(64, 134, true)).toBe(true);
    expect(selected).toBe(19000);
  });
});
