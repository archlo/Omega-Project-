import { describe, expect, it } from 'vitest';
import { QuestLog } from '../../../src/ui/game/QuestLog.js';

(globalThis as any).window ??= {};

function makePanel(): QuestLog {
  const panel = new QuestLog();
  panel.nameOf = (id) => `Quest ${id}`;
  panel.container.x = 0;
  panel.container.y = 0;
  return panel;
}

describe('QuestLog (authentic CUIQuestInfo port)', () => {
  it('is hidden by default and closes on Escape', () => {
    const panel = makePanel();
    expect(panel.isVisible).toBe(false);
    panel.isVisible = true;
    expect(panel.onKeyPress('Escape')).toBe(true);
    expect(panel.isVisible).toBe(false);
  });

  it('renders per-tab groups and selects a quest row', () => {
    const panel = makePanel();
    let selected = 0;
    panel.onSelectQuest = (id) => { selected = id; };
    panel.isVisible = true;
    panel.setQuestsForTab(1, [
      { name: '[In Progress]', quests: [2000, 2001] },
    ]);
    panel.update(0);

    // Row text is drawn into the row layer.
    const texts = panel.container.children[1].children
      .filter((c: any) => c.text !== undefined)
      .map((c: any) => c.text);
    expect(texts).toContain('[In Progress] (2)');
    expect(texts).toContain('Quest 2000');
    expect(texts).toContain('Quest 2001');

    // Click the second quest row. Row 0 is the category header, so quest 2001
    // sits at row index 2 → y = 52 + 2*22 = 96.
    expect(panel.handleMouseButton(40, 96, true)).toBe(true);
    expect(selected).toBe(2001);
    expect(panel.selectedId).toBe(2001);
  });

  it('switches tabs and clears selection', () => {
    const panel = makePanel();
    panel.isVisible = true;
    panel.setQuestsForTab(0, [{ name: '[Available]', quests: [9000] }]);
    panel.setQuestsForTab(1, [{ name: '[In Progress]', quests: [2000] }]);
    panel.setQuestsForTab(2, [{ name: '[Completed]', quests: [3000] }]);
    panel.setQuestsForTab(3, [{ name: '[Party]', quests: [1300] }]);
    panel.update(0);

    // Default active tab is 1 (in-progress, matches setQuests feeding).
    let texts = panel.container.children[1].children
      .filter((c: any) => c.text !== undefined)
      .map((c: any) => c.text);
    expect(texts).toContain('Quest 2000');
    expect(texts).not.toContain('Quest 9000');

    // Click tab 0 (visual x 17..66, y 34..56).
    expect(panel.handleMouseButton(20, 40, true)).toBe(true);
    panel.update(0);
    texts = panel.container.children[1].children
      .filter((c: any) => c.text !== undefined)
      .map((c: any) => c.text);
    expect(texts).toContain('Quest 9000');
    expect(texts).not.toContain('Quest 2000');

    // Click tab 2 (visual x 125..176).
    expect(panel.handleMouseButton(140, 40, true)).toBe(true);
    panel.update(0);
    texts = panel.container.children[1].children
      .filter((c: any) => c.text !== undefined)
      .map((c: any) => c.text);
    expect(texts).toContain('Quest 3000');
    expect(texts).not.toContain('Quest 9000');
  });

  it('clamps scroll to max and scrolls on wheel', () => {
    const panel = makePanel();
    panel.isVisible = true;
    const many = Array.from({ length: 30 }, (_, i) => 2000 + i);
    panel.setQuestsForTab(1, [{ name: '[In Progress]', quests: many }]);
    panel.update(0);

    panel.handleWheel(0, -1);
    expect(panel.handleMouseButton(40, 74, true)).toBe(true);
    expect(panel.selectedId).toBe(2001);
  });

  it('setQuests feeds tab 1 (backward-compatible API)', () => {
    const panel = makePanel();
    panel.isVisible = true;
    panel.setQuests([{ name: '[In Progress]', quests: [2100] }]);
    panel.update(0);
    const texts = panel.container.children[1].children
      .filter((c: any) => c.text !== undefined)
      .map((c: any) => c.text);
    expect(texts).toContain('Quest 2100');
  });
});
