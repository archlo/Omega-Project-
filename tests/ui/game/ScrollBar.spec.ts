import { describe, expect, it } from 'vitest';
import { ScrollBar } from '../../../src/ui/game/ScrollBar.js';

describe('ScrollBar v95 semantics', () => {
  it('normalizes SetScrollRange count to the last zero-based position', () => {
    const bar = new ScrollBar(0, 0, 100);
    bar.setRange(1);
    expect(bar.maxPosition).toBe(0);
    bar.setRange(6);
    expect(bar.maxPosition).toBe(5);
    bar.pos = 99;
    expect(bar.pos).toBe(5);
  });

  it('clamps an empty range and ignores wheel input', () => {
    const bar = new ScrollBar(0, 0, 100);
    bar.setRange(0);
    expect(bar.maxPosition).toBe(0);
    expect(bar.handleMouseWheel(2, 20, 1)).toBe(false);
    expect(bar.pos).toBe(0);
  });

  it('releases a drag through the shared global path', () => {
    const bar = new ScrollBar(0, 0, 100);
    bar.setRange(10);
    expect(bar.handleMouseButton(5, 30, true)).toBe(true);
    ScrollBar.releasePointer();
    expect(bar.handleMouseMove(5, 99)).toBeUndefined();
    expect(bar.handleMouseButton(50, 500, false)).toBe(false);
  });
});
