import { describe, it, expect } from 'vitest';
import { Container, Sprite } from 'pixi.js';
import { CCtrlTab, type TabItem } from '../../../src/ui/game/CCtrlTab.js';

// Make a fake Sprite with a stub texture whose width we control.
function fakeSprite(width: number): Sprite {
  const s = new Sprite();
  const tex = s.texture;
  Object.defineProperty(tex, 'width', { get: () => width, configurable: true });
  Object.defineProperty(tex, 'height', { get: () => 19, configurable: true });
  Object.defineProperty(tex, 'orig', { get: () => ({ width, height: 19 }), configurable: true });
  Object.defineProperty(tex, 'frame', { get: () => ({ width, height: 19, x: 0, y: 0 }), configurable: true });
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
    // Edge-to-edge: x0=0, x1=30, x2=60, x3=100, x4=130, x5=180
    expect(positions).toEqual([0, 30, 60, 100, 130, 180]);
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
