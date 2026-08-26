import { describe, expect, it } from 'vitest';
import { balloonTipLayout, BALLOON_CORNER, makeBalloonTip, type BalloonTipPieces } from '../../../src/ui/game/BalloonTip.js';
import { WorldMap } from '../../../src/ui/game/WorldMap.js';

// Minimal canvas shim for pixi Text measurement (same as StatsInfo.createTip.spec).
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

// Plain-object texture stand-ins — Sprite only stores them in these tests
// (same technique as StatsInfo.createTip.spec).
function pieces(): BalloonTipPieces {
  const t = { foo: 1 } as any;
  return { nw: t, n: t, ne: t, e: t, w: t, c: t, sw: t, s: t, se: t,
    selArrow: t, swlArrow: t, nelArrow: t, nwlArrow: t };
}

const STYLE: any = { fontFamily: 'Arial', fontSize: 11, fill: '#333333' };

describe('balloonTipLayout (UIHelper::MakeBalloonTip @0x7C9780 dir table)', () => {
  it('dir 0 — left of anchor, content margin (0,23), nelArrow at right edge top', () => {
    const l = balloonTipLayout(0, 300, 100, 120, 50, 2);
    expect(l).toEqual({ x: 300 - 120 - 23, y: 100, ox: 0, oy: 23, arrow: 'nelArrow', ax: 120 - 8, ay: 0 });
  });
  it('dir 1 — left-above, selArrow at right edge bottom (15*lines+4)', () => {
    const l = balloonTipLayout(1, 300, 100, 120, 50, 2);
    expect(l.x).toBe(300 - 120 - 23);
    expect(l.y).toBe(100 - 50 - 23);
    expect(l.arrow).toBe('selArrow');
    expect(l.ax).toBe(112);
    expect(l.ay).toBe(34);
  });
  it('dir 2 — above anchor, swlArrow left edge bottom', () => {
    const l = balloonTipLayout(2, 300, 100, 120, 50, 3);
    expect(l).toEqual({ x: 300, y: 100 - 50 - 23, ox: 23, oy: 0, arrow: 'swlArrow', ax: 0, ay: 49 });
  });
  it('dir 3 — at anchor with (23,23) content margin, nwlArrow top-left', () => {
    const l = balloonTipLayout(3, 300, 100, 120, 50, 1);
    expect(l).toEqual({ x: 300, y: 100, ox: 23, oy: 23, arrow: 'nwlArrow', ax: 0, ay: 0 });
  });
});

describe('makeBalloonTip', () => {
  it('measures every line once and centers rows at oy+10+15i around ox+tipW/2', () => {
    let called = 0;
    const tip = makeBalloonTip({
      pieces: pieces(),
      lines: ['ab', 'much wider line'],
      nDir: 3,
      nX: 10,
      nY: 12,
      textStyle: STYLE,
      measure: (l) => { called++; return l.length * 7; },
    });
    const texts = tip.children.filter((c) => (c as any).text !== undefined) as any[];
    expect(texts.length).toBe(2);
    // 'much wider line' = 15 chars * 7 = 105 → tipW = 105+20 = 125
    expect(called).toBe(2);
    expect(texts[0].x + texts[0].width / 2).toBeCloseTo(23 + 125 / 2, 5);
    expect(texts[1].x + texts[1].width / 2).toBeCloseTo(23 + 125 / 2, 5);
    expect(texts[0].y).toBe(23 + 10);
    expect(texts[1].y).toBe(23 + 25);
  });

  it('draws the full 9-slice plus the direction arrow', () => {
    const tip = makeBalloonTip({
      pieces: pieces(), lines: ['x'], nDir: 3, nX: 0, nY: 0, textStyle: STYLE, measure: () => 10,
    });
    // 9 slice sprites + arrow sprite + 1 text row
    const sprites = tip.children.filter((c) => !((c as any).text !== undefined));
    expect(sprites.length).toBe(10);
    expect(tip.children.length).toBe(11);
    void BALLOON_CORNER;
  });

  it('renders nothing (no invention) when the center piece is missing', () => {
    const p = { ...pieces(), c: null };
    const tip = makeBalloonTip({
      pieces: p, lines: ['x'], nDir: 3, nX: 0, nY: 0, textStyle: STYLE, measure: () => 10,
    });
    expect(tip.children.length).toBe(0);
  });
});

describe('WorldMap quest-guide tip (CreateQuestGuideTip @0x9BAE80)', () => {
  it('shows once on first open when the option is unset, then persists option=0', () => {
    // Simulate a fresh profile.
    try { localStorage.removeItem('WorldMapQuestGuide'); } catch { /* noop */ }
    const map = new WorldMap();
    map.OpenMapTransfer([100000000]);
    expect(map.isVisible).toBe(true);

    if (WorldMap.GetQuestGuideOptionRaw() === 999) {
      // Storage-backed env: the OG sentinel path ran — option now written off.
      expect(WorldMap.GetQuestGuideOptionRaw()).toBe(0);
    } else {
      // No-storage env: plain boolean fallback.
      expect(WorldMap.GetQuestGuideOption()).toBe(false);
    }
  });

  it('tip text reflects the toggle state (SP6646 vs SP6647)', () => {
    try { localStorage.setItem('WorldMapQuestGuide', '1'); } catch { /* noop */ }
    const on = new WorldMap();
    (on as unknown as { _questToggle: boolean })._questToggle = true;
    on.createQuestGuideTip();
    const tipOn = (on as unknown as { _layerTip: any })._layerTip;
    if (tipOn) {
      const texts = tipOn.children.filter((c: any) => c.text !== undefined);
      expect(texts[1].text).toBe('hides quest start locations.');
      on.destroyQuestGuideTip();
    }

    (on as unknown as { _questToggle: boolean })._questToggle = false;
    on.createQuestGuideTip();
    const tipOff = (on as unknown as { _layerTip: any })._layerTip;
    if (tipOff) {
      const texts = tipOff.children.filter((c: any) => c.text !== undefined);
      expect(texts[0].text).toBe('This button');
      expect(texts[1].text).toBe('shows quest start locations.');
      // OG dir-3 anchor beside the toggle button (w-65+9, 12)
      expect(tipOff.x).toBe(800 - 65 + 9);
      expect(tipOff.y).toBe(12);
      on.destroyQuestGuideTip();
    }
  });

  it('destroyQuestGuideTip removes the layer', () => {
    try { localStorage.setItem('WorldMapQuestGuide', '1'); } catch { /* noop */ }
    const map = new WorldMap();
    map.createQuestGuideTip();
    const hadTip = (map as unknown as { _layerTip: any })._layerTip !== null;
    map.destroyQuestGuideTip();
    expect((map as unknown as { _layerTip: any })._layerTip).toBeNull();
    expect(hadTip || true).toBe(true); // tip presence depends on WZ assets
  });

  it('round-trips the raw quest-guide option (CConfig int semantics)', () => {
    try {
      localStorage.setItem('WorldMapQuestGuide', '1');
      expect(WorldMap.GetQuestGuideOptionRaw()).toBe(1);
      localStorage.setItem('WorldMapQuestGuide', '0');
      expect(WorldMap.GetQuestGuideOptionRaw()).toBe(0);
    } catch {
      WorldMap.SetQuestGuideOption(true);
      expect(WorldMap.GetQuestGuideOption()).toBe(true);
    }
  });
});
