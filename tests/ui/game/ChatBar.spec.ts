import { describe, it, expect } from 'vitest';
import { Text } from 'pixi.js';
import { ChatBar } from '../../../src/ui/game/ChatBar.js';

// ponytail: avoids pulling in jsdom just to satisfy Text.width's canvas measurement in tests
Object.defineProperty(Text.prototype, 'width', { get: () => 0 });

// OG edit control coordinates (ChatBar.ts constants)
const EDIT_X = 75;
const EDIT_Y = 524;
const DISPLAY_X = 0;
const DISPLAY_Y_SMALL = 492;
const CHAT_HEIGHT_SMALL = 24;
const TEXT_X = 9;
const CHAR_W = 7;
const LINE_H = 13;

describe('ChatBar history recall', () => {
  function screenPos(bar: ChatBar, lx: number, ly: number): [number, number] {
    const root = (bar as any)._root;
    return [root.x + lx, root.y + ly];
  }

  function typeAndSend(bar: ChatBar, msg: string): void {
    const [sx, sy] = screenPos(bar, EDIT_X + 4, EDIT_Y + 2);
    bar.handleMouseButton(sx, sy, true);
    for (const ch of msg) bar.onKeyPress(ch);
    bar.onKeyPress('Enter');
  }

  it('ArrowUp/ArrowDown cycle through previously sent messages', () => {
    const bar = new ChatBar();
    typeAndSend(bar, 'first');
    typeAndSend(bar, 'second');

    // Re-focus after last send (endChat unfocused the bar)
    const [fx, fy] = screenPos(bar, EDIT_X + 4, EDIT_Y + 2);
    bar.handleMouseButton(fx, fy, true);
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
    bar.startChat(); // switch to SMALL so display area is visible
    let clicked = 0;
    bar.onItemLink = (itemId) => { clicked = itemId; };

    bar.addMapleLine('loot #i2000000# now', (id) => id === 2000000 ? 'Red Potion' : null);

    // Text is "loot [Red Potion] now" — link [Red Potion] spans chars 5-16
    // Click at char 8 → lx = TEXT_X + 8*CHAR_W = 65
    // OG bottom-up: line 0 y = displayY + chatHeight - 13 = 492 + 24 - 13 = 503
    // Line center y = 503 + 6 = 509
    const [sx, sy] = screenPos(bar, TEXT_X + 8 * CHAR_W, DISPLAY_Y_SMALL + CHAT_HEIGHT_SMALL - LINE_H + 6);
    expect(bar.handleMouseButton(sx, sy, true)).toBe(true);
    expect(clicked).toBe(2000000);
  });

  it('keeps duplicate item links distinct', () => {
    const bar = new ChatBar();
    bar.startChat(); // switch to SMALL so display area is visible
    const clicked: number[] = [];
    bar.onItemLink = (itemId) => { clicked.push(itemId); };

    bar.addMapleLine('#i100# and #i200#', (id) => `Item${id}`);

    // Text: "[Item100] and [Item200]"
    // Link1: chars 0-9 → click at char 3 → lx = TEXT_X + 3*CHAR_W = 30
    // Link2: chars 15-24 → click at char 20 → lx = TEXT_X + 20*CHAR_W = 149
    // OG bottom-up: line 0 y = 492 + 24 - 13 = 503, center = 509
    const [sx1, sy] = screenPos(bar, TEXT_X + 3 * CHAR_W, DISPLAY_Y_SMALL + CHAT_HEIGHT_SMALL - LINE_H + 6);
    const [sx2] = screenPos(bar, TEXT_X + 20 * CHAR_W, DISPLAY_Y_SMALL + CHAT_HEIGHT_SMALL - LINE_H + 6);
    bar.handleMouseButton(sx1, sy, true);
    bar.handleMouseButton(sx2, sy, true);
    expect(clicked).toEqual([100, 200]);
  });
});
