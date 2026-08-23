import { describe, it, expect } from 'vitest';
import { WzPackage } from '../../../src/wz/WzPackage.js';
import { WzProperty } from '../../../src/wz/WzProperty.js';
import { WzCanvas } from '../../../src/wz/WzCanvas.js';
import { WzTextureLoader } from '../../../src/render/WzTextureLoader.js';
import { StatsInfo } from '../../../src/ui/game/StatsInfo.js';

(globalThis as any).window ??= { innerWidth: 800, innerHeight: 600 };
(globalThis as any).localStorage ??= {
  getItem: () => null, setItem: () => {}, removeItem: () => {},
};
// Text measurement shim (same as GameStageChat.spec) — pixi Text needs a
// 2D context for width calc in update().
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

describe('StatsInfo WZ parity (real UI.nx)', () => {
  const nx = process.env.MAPLECLAUDE_NX_DIR;
  if (!nx) {
    it('skipped', () => console.log('MAPLECLAUDE_NX_DIR not set'));
    return;
  }

  function makePanel(): { panel: StatsInfo; ui: WzPackage } {
    const ui = WzPackage.Open(`${nx}/UI.nx`);
    // Canvas measurement needs a 2D context shim; reuse the standard stub.
    const panel = new StatsInfo(new WzTextureLoader(), ui as any);
    return { panel, ui };
  }

  it('loads every OG CUIStat button with WZ sprites and origin positions', () => {
    const { panel } = makePanel();
    // OG OnCreate AddButton table: BtHpUp(0x7D0), BtMpUp(0x7D1), BtStrUp(0x7D2),
    // BtDexUp(0x7D3), BtIntUp(0x7D4), BtLukUp(0x7D5), BtAuto(0x7D7),
    // BtAuto1(0x7D8), BtAuto2(0x7D9), BtDetailOpen(0x7D6).
    const cases: Array<[string, any, number, number]> = [
      ['BtHpUp', panel['_btHpUp'], 147, 103],
      ['BtMpUp', panel['_btMpUp'], 147, 121],
      ['BtStrUp', panel['_btStrUp'], 147, 226],
      ['BtDexUp', panel['_btDexUp'], 147, 244],
      ['BtIntUp', panel['_btIntUp'], 147, 262],
      ['BtLukUp', panel['_btLukUp'], 147, 280],
      ['BtAuto', panel['_btAuto'], 94, 180],
      ['BtAuto1', panel['_btAuto1'], 93, 180],
      ['BtAuto2', panel['_btAuto2'], 93, 198],
      ['BtDetailOpen', panel['_btDetailOpen'], 92, 307],
    ];
    for (const [name, btn, x, y] of cases) {
      expect(btn, `${name} missing`).not.toBeNull();
      const b = btn.bounds;
      expect(b.x, `${name} x`).toBe(x);
      expect(b.y, `${name} y`).toBe(y);
    }
  });

  it('renders the BtAuto sprite from the animated normal/0 frame (not the fallback box)', () => {
    const { panel } = makePanel();
    const btAuto = panel['_btAuto']!;
    // The Graphics-fallback path means the WZ sprite failed to load.
    expect(btAuto.hasWzSprite).toBe(true);
    expect(btAuto.container.children.length).toBeGreaterThan(0);
  });

  it('shows BtAuto after stats load for a level-30 warrior with AP', () => {
    const { panel } = makePanel();
    panel.isVisible = true;
    panel.jobId = 100;
    panel.level = 30;
    panel.ap = 5;
    panel.update(0.016);
    const btAuto = panel['_btAuto']!;
    expect(btAuto.container.visible).toBe(true);
    expect(btAuto.enabled).toBe(true);
    // on the content layer, above the backgrounds
    expect(panel['_contentLayer'].children).toContain(btAuto.container);
  });

  it('stat subtree carries the expected canvases and origins', async () => {
    const { ui } = makePanel();
    const stat = ui.GetItem('UIWindow2.img/Stat/main') as WzProperty;
    expect(stat).toBeInstanceOf(WzProperty);
    const bg = stat.Get('backgrnd') as WzCanvas;
    expect(bg.Width).toBe(172);
    expect(bg.Height).toBe(337);
    // Disabled icons: exactly STR/DEX/INT/LUK
    const disabled = stat.Get('Disabled') as WzProperty;
    for (const n of ['STR', 'DEX', 'INT', 'LUK']) {
      expect(disabled.Get(n)).toBeInstanceOf(WzCanvas);
    }
    // detail window: backgrnd 178x247 + backgrnd2 content layer + BtHpUp
    const detail = ui.GetItem('UIWindow2.img/Stat/detail') as WzProperty;
    expect((detail.Get('backgrnd') as WzCanvas).Width).toBe(178);
    expect((detail.Get('backgrnd2') as WzCanvas).Width).toBe(166);
    expect(detail.Get('BtHpUp')).toBeInstanceOf(WzProperty);
    // detail BtHpUp loads as a real WZ button at origin position (150,218)
    const { StatDetailInfo } = await import('../../../src/ui/game/StatDetailInfo.js');
    const loader = new WzTextureLoader();
    const detailPanel = new StatDetailInfo(loader, ui as any, null, null);
    const detailHp = detailPanel['_btHpUp']!;
    expect(detailHp.hasWzSprite).toBe(true);
    const hb = detailHp.bounds;
    expect(hb.x).toBe(150);
    expect(hb.y).toBe(218);
  });
});
