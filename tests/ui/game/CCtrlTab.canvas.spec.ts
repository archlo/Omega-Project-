import { describe, it, expect } from 'vitest';
import { Container, Sprite, Texture } from 'pixi.js';
import { CCtrlTab, type TabItem } from '../../../src/ui/game/CCtrlTab.js';

// Make a fake Sprite with a stub texture whose width we control. `new Sprite()`
// shares the Texture.EMPTY singleton, so give each sprite its own Texture.
function fakeSprite(width: number): Sprite {
  const tex = new Texture({ source: { width, height: 19 } } as never);
  Object.defineProperty(tex, 'width', { get: () => width, configurable: true });
  Object.defineProperty(tex, 'height', { get: () => 19, configurable: true });
  const s = new Sprite(tex);
  return s;
}

describe('CCtrlTab canvas tab relocation', () => {
  it('lays WZ tab canvases edge-to-edge at their bitmap widths', () => {
    const tab = new CCtrlTab(2001, 9, 25, 250, { type: 8, customHeight: 19, tabSpace: 1 });
    for (const name of ['Friend', 'Party', 'Exped', 'Guild', 'Union', 'Block']) tab.addItem(name);
    const items = () => (tab as unknown as { _items: TabItem[] })._items;
    const sel = [30, 30, 40, 30, 50, 59].map(fakeSprite);
    const norm = [30, 30, 40, 30, 50, 59].map(fakeSprite);
    tab.setCanvasItems(sel, norm);

    const positions = items().map((i) => i.x);
    // Edge-to-edge with tabSpace=1: x0=0, x1=31, x2=62, x3=103, x4=134, x5=185
    expect(positions).toEqual([0, 31, 62, 103, 134, 185]);
    // Widths use the canvas bitmap widths, not text measurement.
    expect(items().map((i) => i.width)).toEqual([30, 30, 40, 30, 50, 59]);
  });

  it('relocates once when canvases are set after items exist', () => {
    const tab = new CCtrlTab(2001, 9, 25, 250, { type: 8, customHeight: 19, tabSpace: 1 });
    for (const name of ['A', 'B', 'C']) tab.addItem(name);
    // Text-measured widths first (no canvases).
    const before = (tab as unknown as { _items: TabItem[] })._items.map((i) => i.width);
    expect(before[0]).toBe(before[1]); // text-measured, all 3 same-length labels

    const sel = [30, 40, 50].map(fakeSprite);
    const norm = [30, 40, 50].map(fakeSprite);
    tab.setCanvasItems(sel, norm);
    const after = (tab as unknown as { _items: TabItem[] })._items.map((i) => i.width);
    expect(after).toEqual([30, 40, 50]); // canvas widths win
    expect((tab as unknown as { container: Container }).container.children.some((c) => c instanceof Sprite)).toBe(true);
  });
});
