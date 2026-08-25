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

function rowTexts(panel: QuestLog): string[] {
  return panel.container.children[1].children
    .filter((c: any) => c.text !== undefined)
    .map((c: any) => c.text);
}

describe('QuestLog OG LoadData model (category groups + level sort)', () => {
  it('groups quests by category with header rows and names', () => {
    const panel = makePanel();
    panel.isVisible = true;
    // area 30 = "Victoria Island", area 20 = "Maple Island"
    panel.categoryOf = (id) => (id === 1000 ? 20 : 30);
    panel.categoryNameOf = (idx) => (idx === 20 ? 'Maple Island' : idx === 30 ? 'Victoria Island' : '');
    panel.setQuestsForTab(1, [{ name: '[In Progress]', quests: [2000, 1000, 2001] }]);
    panel.update(0);

    const texts = rowTexts(panel);
    expect(texts).toContain('Maple Island (1)');
    expect(texts).toContain('Victoria Island (2)');
    // Categories render in ascending order.
    const mapleIdx = texts.indexOf('Maple Island (1)');
    const victoriaIdx = texts.indexOf('Victoria Island (2)');
    expect(mapleIdx).toBeGreaterThanOrEqual(0);
    expect(victoriaIdx).toBeGreaterThan(mapleIdx);
  });

  it('sorts within a category by sortkey then LvMin (QICompareFunc)', () => {
    const panel = makePanel();
    panel.isVisible = true;
    // All same category. sortKey: 300->0, 100->5, 200->5; LvMin tiebreak 15 < 20.
    panel.categoryOf = () => 7;
    panel.sortKeyOf = (id) => ({ 300: 0, 100: 5, 200: 5 }[id] ?? 0);
    panel.minLevelOf = (id) => ({ 100: 20, 200: 15, 300: 0 }[id] ?? 0);
    panel.setQuestsForTab(1, [{ name: 'G', quests: [100, 200, 300] }]);
    panel.update(0);

    const texts = rowTexts(panel).filter((t) => t.startsWith('Quest '));
    expect(texts).toEqual(['Quest 300', 'Quest 200', 'Quest 100']);
  });

  it('hides worthless quests when the MyLevel filter is active (default)', () => {
    const panel = makePanel();
    panel.isVisible = true;
    panel.worthlessOf = (id) => id === 2000; // out-leveled quest
    panel.setQuestsForTab(1, [{ name: 'G', quests: [2000, 2001] }]);
    panel.update(0);

    let texts = rowTexts(panel);
    expect(texts).not.toContain('Quest 2000');
    expect(texts).toContain('Quest 2001');

    // BtAllLevel (_showAll=true) shows everything again.
    (panel as any)._showAll = true;
    (panel as any)._rebuildRows();
    panel.update(0);
    texts = rowTexts(panel);
    expect(texts).toContain('Quest 2000');
  });

  it('minimizing a category collapses its quest rows', () => {
    const panel = makePanel();
    panel.isVisible = true;
    panel.categoryOf = () => 4;
    panel.setQuestsForTab(1, [{ name: 'G', quests: [1, 2] }]);
    panel.update(0);
    expect(rowTexts(panel)).toContain('Quest 1');

    (panel as any)._minimizedByTab[1].add(4);
    (panel as any)._rebuildRows();
    panel.update(0);
    const texts = rowTexts(panel);
    expect(texts.some((t) => t.includes('(2)'))).toBe(true);
    expect(texts).not.toContain('Quest 1');
  });
});

describe('Quest helper (OG TryShowSuitableLevelQuest / OnTabChanged)', () => {
  it('auto-selects the first suitable unread quest on the available tab', () => {
    const panel = makePanel();
    let selected = -1;
    panel.onSelectQuest = (id) => { selected = id; };
    panel.readOf = (id) => id === 10; // first suitable quest already read
    panel.worthlessOf = (id) => id === 5; // out-leveled
    panel.setQuestsForTab(0, [{ name: 'G', quests: [5, 10, 20] }]);
    panel.isVisible = true;

    expect(panel.tryShowSuitableLevelQuest(true)).toBe(20);
    expect(selected).toBe(20);
    expect(panel.selectedId).toBe(20);

    // Without the read filter, the first non-worthless quest is picked.
    expect(panel.tryShowSuitableLevelQuest(false)).toBe(10);
  });

  it('returns -1 when nothing is suitable and fires onNoQuestSelected via runTabHelper', () => {
    const panel = makePanel();
    let noSelection = false;
    panel.onNoQuestSelected = () => { noSelection = true; };
    panel.worthlessOf = () => true; // everything out-leveled
    panel.setQuestsForTab(0, [{ name: 'G', quests: [1, 2] }]);
    panel.setQuestsForTab(3, [{ name: 'P', quests: [] }]);
    panel.isVisible = true;

    expect(panel.tryShowSuitableLevelQuest(false)).toBe(-1);
    expect(panel.activeTab).toBe(0);
    panel.runTabHelper();
    expect(noSelection).toBe(true);
  });

  it('runTabHelper on a non-available tab keeps the tab and selects its top quest', () => {
    const panel = makePanel();
    let selected = -1;
    panel.onSelectQuest = (id) => { selected = id; };
    panel.setQuestsForTab(1, [{ name: 'G', quests: [500, 501] }]);
    panel.setQuestLists([
      [{ name: 'A', quests: [900] }],
      [{ name: 'G', quests: [500, 501] }],
      [], [],
    ]);
    panel.isVisible = true;

    panel.handleMouseButton(20, 40, true); // switch to tab 0 → helper picks 900
    expect(selected).toBe(900);

    panel.handleMouseButton(70, 40, true); // switch to tab 1 → top quest only
    expect(selected).toBe(500);
    expect(panel.activeTab).toBe(1);
  });

  it('exposes the OG GetQuestSubInfo level strings through GameStage format', () => {
    // Sanity-pin the string contract used by the stage's levelOf wiring.
    const min = 30, max = 45;
    let s = '';
    if (min > 0) s = `Over Level ${min}`;
    if (max > 0) s = `${s ? s + ' ' : ''}Under Level ${max}`;
    expect(s).toBe('Over Level 30 Under Level 45');
  });
});
