import { describe, it, expect } from 'vitest';
import { Text } from 'pixi.js';
import { GuildGradeWindow } from '../../../src/ui/game/GuildGradeWindow.js';

Object.defineProperty(Text.prototype, 'width', { get: () => 0 });

// CWndGuildGrade / CWndAllianceGrade (v95 IDB): spawned by
// CUIUserList::ToggleGuildInfo @0x8D1B30 at (community right edge, top),
// window 264x382, BtEdit id 2140 / BtSave id 2141, grades
// Master / Jr.Master / Member x3.
describe('GuildGradeWindow', () => {
  it('defaults to the OG grade names', () => {
    const w = new GuildGradeWindow(false);
    const texts = w.container.children.filter((c) => c instanceof Text).map((c) => (c as Text).text);
    expect(texts.some((t) => t.includes('Master'))).toBe(true);
    expect(texts.some((t) => t.includes('Jr.Master'))).toBe(true);
    expect(texts.filter((t) => t.startsWith('3 ')).length).toBe(1);
    expect(texts.filter((t) => t.startsWith('5 ')).length).toBe(1);
  });

  it('edit + commit fires onGradeNameChange with the 1-based grade index', () => {
    const w = new GuildGradeWindow(false);
    w.isVisible = true;
    let changed: [number, string] | null = null;
    w.onGradeNameChange = (idx, name) => { changed = [idx, name]; };
    // click row 0 to begin editing (pre-fills the current name)
    const rowText = w.container.children.filter((c) => c instanceof Text).map((c) => c as Text)[1];
    rowText.emit('pointerdown');
    for (let i = 0; i < 6; i++) w.onKeyPress('Backspace'); // clear "Master"
    'Knights'.split('').forEach((k) => w.onKeyPress(k));
    w.onKeyPress('Enter');
    expect(changed).toEqual([1, 'Knights']);
  });

  it('Escape closes the window', () => {
    const w = new GuildGradeWindow(true);
    w.isVisible = true;
    w.onKeyPress('Escape');
    expect(w.isVisible).toBe(false);
  });
});
