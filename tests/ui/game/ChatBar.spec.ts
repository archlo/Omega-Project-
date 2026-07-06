import { describe, it, expect } from 'vitest';
import { Text } from 'pixi.js';
import { ChatBar } from '../../../src/ui/game/ChatBar.js';

// ponytail: avoids pulling in jsdom just to satisfy Text.width's canvas measurement in tests
Object.defineProperty(Text.prototype, 'width', { get: () => 0 });

// TODO_AUDIT.md Eighty-eighth pass: CChatHelper::HistoryUp/HistoryDown recall.
describe('ChatBar history recall', () => {
  function screenPos(bar: ChatBar, lx: number, ly: number): [number, number] {
    const root = (bar as any)._root;
    return [root.x + lx, root.y + ly];
  }

  function typeAndSend(bar: ChatBar, msg: string): void {
    const [sx, sy] = screenPos(bar, 4, 81); // INPUT_X+4, INPUT_Y+2
    bar.handleMouseButton(sx, sy, true);
    for (const ch of msg) bar.onKeyPress(ch);
    bar.onKeyPress('Enter');
  }

  it('ArrowUp/ArrowDown cycle through previously sent messages', () => {
    const bar = new ChatBar();
    typeAndSend(bar, 'first');
    typeAndSend(bar, 'second');

    bar.onKeyPress('ArrowUp');
    expect((bar as any)._input).toBe('second');
    bar.onKeyPress('ArrowUp');
    expect((bar as any)._input).toBe('first');
    bar.onKeyPress('ArrowUp');
    expect((bar as any)._input).toBe('first'); // clamps at oldest

    bar.onKeyPress('ArrowDown');
    expect((bar as any)._input).toBe('second');
    bar.onKeyPress('ArrowDown');
    expect((bar as any)._input).toBe(''); // back past newest clears input
  });

  it('turns Maple item tags into clickable chat links', () => {
    const bar = new ChatBar();
    let clicked = 0;
    bar.onItemLink = (itemId) => { clicked = itemId; };

    bar.addMapleLine('loot #i2000000# now', (id) => id === 2000000 ? 'Red Potion' : null);

    expect((bar as any)._lines[0].text).toBe('loot [Red Potion] now');
    // Click on the link text "[Red Potion]" — first line, display area
    const [sx, sy] = screenPos(bar, 20 + 40, 0 + 18 + 2); // DISPLAY_X+40, DISPLAY_Y+TAB_H+2 (first line)
    expect(bar.handleMouseButton(sx, sy, true)).toBe(true);
    expect(clicked).toBe(2000000);
  });

  it('keeps duplicate item links distinct', () => {
    const bar = new ChatBar();
    const clicked: number[] = [];
    bar.onItemLink = (itemId) => { clicked.push(itemId); };

    bar.addMapleLine('#i100# and #i200#', (id) => `Item${id}`);

    expect((bar as any)._lines[0].text).toBe('[Item100] and [Item200]');
    // Click on first link "[Item100]" then second "[Item200]"
    const [sx1, sy] = screenPos(bar, 20 + 4, 0 + 18 + 2);
    const [sx2] = screenPos(bar, 20 + 4 + 14 * 7, 0 + 18 + 2); // charIndex 14 = start of [Item200]
    bar.handleMouseButton(sx1, sy, true);
    bar.handleMouseButton(sx2, sy, true);
    expect(clicked).toEqual([100, 200]);
  });
});
