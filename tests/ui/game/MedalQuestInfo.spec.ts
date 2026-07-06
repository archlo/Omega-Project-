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
    const rendered = panel.container.children[0].children.some((child: any) => child.text === '  Quest 19000 [1142000]');
    expect(rendered).toBe(true);
    expect(panel.handleMouseButton(64, 116, true)).toBe(true);
    expect(selected).toBe(19000);
  });
});
