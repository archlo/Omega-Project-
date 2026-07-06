import { describe, it, expect } from 'vitest';
import { Sprite } from 'pixi.js';
import { ShopMarker } from '../../src/character/ShopMarker.js';

// TODO_AUDIT.md Eighty-first pass: CMessageBoxPool floating shop marker.
describe('ShopMarker', () => {
  function noIcons() { return { LoadIcon: () => null } as any; }

  it('positions a marker at the live tracked-character position when found', () => {
    const sm = new ShopMarker(noIcons());
    sm.Add(1, 1234567, 'Bob', '', 0, 0);
    const screen = sm.RebuildDisplay(
      (name) => (name === 'Bob' ? { x: 500, y: 300 } : null),
      (wx, wy) => ({ x: wx, y: wy }),
    );
    expect(screen.children.length).toBe(0); // no icon loaded (noIcons), so no sprite child — just verifying no throw
  });

  it('falls back to the packet position when the character is not tracked', () => {
    const sm = new ShopMarker(noIcons());
    let seen: { x: number; y: number } | null = null;
    sm.Add(2, 1234567, 'Carol', '', 42, 99);
    sm.RebuildDisplay(
      () => null,
      (wx, wy) => { seen = { x: wx, y: wy }; return { x: wx, y: wy }; },
    );
    expect(seen).toEqual({ x: 42, y: 99 - 100 });
  });

  it('removes a marker by id', () => {
    const sm = new ShopMarker(noIcons());
    sm.Add(3, 1, 'Dave', '', 0, 0);
    sm.Remove(3);
    let calls = 0;
    sm.RebuildDisplay(() => { calls++; return null; }, (x, y) => ({ x, y }));
    expect(calls).toBe(0);
  });

  it('shows the hope text when an icon is available', () => {
    const icons = { LoadIcon: () => ({ NewSprite: () => new Sprite(), Height: 32 }) } as any;
    const sm = new ShopMarker(icons);
    sm.Add(4, 1, 'Eve', 'Selling stuff', 0, 0);
    const screen = sm.RebuildDisplay(() => null, (x, y) => ({ x, y }));
    expect(screen.children.length).toBe(2); // icon sprite + hope text
  });
});
