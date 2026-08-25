import { describe, it, expect } from 'vitest';
import { Sprite, Texture } from 'pixi.js';
import { WzCanvas } from '../../src/wz/WzCanvas.js';
import { DamageDigits } from '../../src/ui/DamageDigits.js';

// OG CAnimationDisplayer::Effect_HP @0x444EB0 draws damage numbers with TWO
// digit sets: the FIRST digit comes from the "_1" node (NoRed1 / NoCri1),
// every subsequent digit from the "_0" node (NoRed0 / NoCri0).
// These tests pin that split using distinguishable glyph widths per set.

function makeWz(widths: Record<string, number>) {
  return {
    GetItem: (path: string) => {
      const m = /^BasicEff\.img\/(NoRed1|NoRed0|NoCri1|NoCri0)\/(\d)$/.exec(path);
      if (!m || !(m[1] in widths)) return null;
      const c = new WzCanvas(null as any, 0);
      (c as any).__w = widths[m[1]];
      return c;
    },
  } as any;
}

function makeLoader() {
  return {
    Load: (raw: any) => ({
      Width: raw.__w as number,
      Height: 14,
      OriginX: 0,
      OriginY: 0,
      Texture: Texture.EMPTY,
      NewSprite: () => new Sprite(),
    }),
  } as any;
}

describe('DamageDigits OG Effect_HP dual-set parity', () => {
  it('draws the first digit from the _1 set and the rest from the _0 set (white)', () => {
    const digits = new DamageDigits(makeWz({ NoRed1: 10, NoRed0: 20, NoCri1: 30, NoCri0: 40 }), makeLoader());
    expect(digits.LoadedWhite).toBe(true);
    expect(digits.LoadedCrit).toBe(true);

    // "42": total = 10(_1) + 20(_0) - 2 overlap = 28 -> centered at 100
    expect(digits.DrawNumber('w1', '42', { x: 100, y: 50 }, 1, false)).toBe(true);
    const kids = digits.container.children;
    expect(kids.length).toBe(2);
    // First digit advance = its glyph width - 2. Gap of 8 proves it came from
    // NoRed1 (width 10); a NoRed0 glyph would leave a gap of 18.
    expect(kids[0].x).toBe(86); // 100 - 28/2
    expect(kids[1].x).toBe(94); // 86 + 10 - 2
    expect(kids[0].alpha).toBe(1);
  });

  it('uses the critical sets (NoCri1 first, NoCri0 rest) for crit numbers', () => {
    const digits = new DamageDigits(makeWz({ NoRed1: 10, NoRed0: 20, NoCri1: 30, NoCri0: 40 }), makeLoader());
    expect(digits.DrawNumber('c1', '77', { x: 200, y: 50 }, 1, true)).toBe(true);
    const kids = digits.container.children;
    expect(kids.length).toBe(2);
    // total = 30 + 40 - 2 = 68; first digit from NoCri1 (advance 28)
    expect(kids[0].x).toBe(166); // 200 - 68/2
    expect(kids[1].x).toBe(194); // 166 + 30 - 2
  });

  it('falls back to the _0 set alone when the _1 nodes are absent', () => {
    const digits = new DamageDigits(makeWz({ NoRed0: 20 }), makeLoader());
    expect(digits.LoadedWhite).toBe(true);
    expect(digits.DrawNumber('f1', '55', { x: 60, y: 0 }, 0.5, false)).toBe(true);
    const kids = digits.container.children;
    expect(kids.length).toBe(2);
    // Both glyphs are _0 (width 20): total = 38, uniform advance 18
    expect(kids[0].x).toBe(41); // 60 - 38/2
    expect(kids[1].x).toBe(59); // 41 + 20 - 2
    expect(kids[0].alpha).toBe(0.5);
  });
});
