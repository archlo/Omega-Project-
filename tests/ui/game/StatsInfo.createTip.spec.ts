import { describe, it, expect } from 'vitest';
import { StatsInfo } from '../../../src/ui/game/StatsInfo.js';
import { WzTextureLoader } from '../../../src/render/WzTextureLoader.js';

(globalThis as any).window ??= {};
(globalThis as any).localStorage = { getItem: () => null, setItem: () => {} };
// Minimal canvas shim for pixi Text measurement
class Fake2DContext {
  measureText(text: string) {
    return { width: String(text).length * 8, actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 3 };
  }
  fillText() {} strokeText() {} clearRect() {} fillRect() {}
}
class FakeOffscreenCanvas {
  width = 0; height = 0;
  private _ctx: any;
  getContext() { if (!this._ctx) this._ctx = new Fake2DContext(); return this._ctx; }
}
(globalThis as any).CanvasRenderingContext2D ??= Fake2DContext;
(globalThis as any).OffscreenCanvas ??= FakeOffscreenCanvas;
(globalThis as any).document ??= {
  createElement(tag: string) { return tag === 'canvas' ? new FakeOffscreenCanvas() as any : {}; },
};

// OG CUIStat::CreateTip @0x866530 + UIHelper::MakeBalloonTip @0x7C9780.
// Tip layer position = MakeBalloonTip's Offset(v28,v29), derived from
// (nX,nY) + direction: dir2 → (nX, nY-tipH-23); dir3 → (nX, nY);
// dir1 → (nX-tipW-23, nY-tipH-23); tipH = 15*lines + 20.
//
// StringPool texts below are decrypted from the client's ms_aString table:
//   0x14C1 Dawn Warrior / 0x14C2 Blaze Wizard / 0x14C3 Wind Archer /
//   0x14C4 Night Walker / 0x14C5 Thunder Breaker (Cygnus Knights).
describe('StatsInfo createTip job tips (CUIStat::CreateTip)', () => {
  function makeStats(job: string): StatsInfo {
    const s = new StatsInfo(new WzTextureLoader(), null);
    s.job = job;
    seedBalloon(s);
    return s;
  }

  function seedBalloon(s: StatsInfo): void {
    const tex = { foo: 1 } as any;
    const pieces: Record<string, any> = { c: { Texture: tex } };
    for (const p of ['nw', 'n', 'ne', 'e', 'w', 'sw', 's', 'se',
      'nwArrow', 'neArrow', 'seArrow', 'swArrow', 'nwlArrow', 'nelArrow', 'swlArrow', 'selArrow']) {
      pieces[p] = { Texture: tex };
    }
    (s as any)._balloonPieces = pieces;
  }

  function tipLayers(s: StatsInfo): any[] {
    return (s as any)._tipLayers;
  }

  function lineTexts(tip: any): string[] {
    return tip.children.filter((c: any) => c && typeof c.text === 'string').map((c: any) => c.text);
  }

  it('base tip exists for every job — auto-assign hint, anchored at (170, 187-tipH-23) for nDir=2', () => {
    const s = makeStats('100');
    s.createTip11();
    const tips = tipLayers(s);
    expect(tips.length).toBeGreaterThanOrEqual(1);
    // 2 lines → tipH = 15*2+20 = 50; dir2 → py = 187-50-23
    expect(tips[0].x).toBe(170);
    expect(tips[0].y).toBe(114);
    const texts = lineTexts(tips[0]);
    expect(texts.join(' ')).toContain('auto-assign button');
  });

  it('Warrior (100) uses the STR tip at (160,241) nDir=3', () => {
    const s = makeStats('100');
    s.createTip11();
    const tip = tipLayers(s)[1];
    expect(tip.x).toBe(160);
    expect(tip.y).toBe(241);
    expect(lineTexts(tip).join(' ')).toContain('Warrior is STR');
  });

  it('Magician (200) uses the INT tip — dir2 lifts it above the anchor', () => {
    const s = makeStats('200');
    s.createTip11();
    const tip = tipLayers(s)[1];
    // 3 lines → tipH = 65; dir2 → py = 266-65-23
    expect(tip.x).toBe(160);
    expect(tip.y).toBe(178);
    expect(lineTexts(tip).join(' ')).toContain('Magician is INT');
  });

  it('Blaze Wizard (1200) uses its own INT tip — distinct from generic jobs', () => {
    const s = makeStats('1200');
    s.createTip11();
    const texts = lineTexts(tipLayers(s)[1]);
    expect(texts.join(' ')).toContain('Blaze Wizard is INT');
  });

  it('Night Walker (1400) uses its own LUK tip — dir2 lifts above (160,284)', () => {
    const s = makeStats('1400');
    s.createTip11();
    const tips = tipLayers(s);
    const texts = lineTexts(tips[1]);
    expect(texts.join(' ')).toContain('Night Walker is LUK');
    expect(tips[1].x).toBe(160);
    // 3 lines → tipH = 65; dir2 → py = 284-65-23
    expect(tips[1].y).toBe(196);
  });

  it('Thunder Breaker (1500) uses its own STR tip at (160,241) nDir=3', () => {
    const s = makeStats('1500');
    s.createTip11();
    const tips = tipLayers(s);
    expect(lineTexts(tips[1]).join(' ')).toContain('Thunder Breaker is STR');
    expect(tips[1].x).toBe(160);
    expect(tips[1].y).toBe(241);
  });

  it('Pirate (500) gets TWO tips — dir1 infighter + dir2 gunner', () => {
    const s = makeStats('500');
    s.createTip11();
    const tips = tipLayers(s);
    expect(tips.length).toBeGreaterThanOrEqual(3); // base + tip1 + tip2
    // tip1 dir1: px = 149 - tipW - 23 (< 149), py = 230 - 65 - 23
    expect(tips[1].x).toBeLessThan(149);
    expect(tips[1].y).toBe(142);
    // tip2 dir2: 2 lines → py = 248 - 50 - 23
    expect(tips[2].x).toBe(160);
    expect(tips[2].y).toBe(175);
    expect(lineTexts(tips[1]).join(' ')).toContain('knuckle using Pirate is STR');
    expect(lineTexts(tips[2]).join(' ')).toContain('gun using Pirate is DEX');
  });

  it('destroyTip removes all tip layers', () => {
    const s = makeStats('100');
    s.createTip11();
    expect(tipLayers(s).length).toBeGreaterThan(0);
    s.destroyTip();
    expect(tipLayers(s).length).toBe(0);
  });
});
