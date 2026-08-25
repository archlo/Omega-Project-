import { describe, expect, it, vi } from 'vitest';
import { GameStage } from '../../../src/stages/GameStage.js';import { QuickSlotBar } from '../../../src/ui/game/QuickSlotBar.js';

// Text.width measurement needs a canvas 2D context; provide the minimal shim.
function installCanvasShim(): void {
  if ((globalThis as any).__mapleclaudeCanvasShim) return;
  (globalThis as any).__mapleclaudeCanvasShim = true;
  class Fake2DContext {
    measureText(text: string) {
      const width = String(text).length * 8;
      return { width, actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 3 };
    }
    fillText() {} strokeText() {} clearRect() {} fillRect() {}
  }
  class FakeOffscreenCanvas {
    width = 0; height = 0;
    private _ctx: any;
    getContext() { if (!this._ctx) this._ctx = new Fake2DContext(); return this._ctx; }
  }
  (globalThis as any).CanvasRenderingContext2D = Fake2DContext;
  (globalThis as any).OffscreenCanvas = FakeOffscreenCanvas;
  (globalThis as any).document = {
    createElement(tag: string) { return tag === 'canvas' ? new FakeOffscreenCanvas() as any : {}; },
  };
}
installCanvasShim();

// OG CQuickSlot is laid out relative to the LIVE screen size every
// CUIStatusBar::MoveWnd — the TS onResize must forward the real window dims,
// never a hardcoded (800, 600): with stale dims the quickslot drops into
// popup-mode math and its keycap labels (Ins/Del/Home/End/PgUp/PgDn) end up
// far left, underneath the status bar art.
describe('GameStage.onResize forwards real dimensions to HUD panels', () => {
  it('statusBar / quickSlots / revivePanel get the actual window size', () => {
    const stage: any = Object.create(GameStage.prototype);
    stage._camera = {};
    stage._equip = { onResize: vi.fn() };
    stage._item = { onResize: vi.fn() };
    stage._statusBar = { relayout: vi.fn() };
    stage._chatBar = { relayout: vi.fn() };
    stage._buffList = { relayout: vi.fn() };
    stage._quickSlots = { Relayout: vi.fn() };
    stage._revivePanel = { Relayout: vi.fn() };
    stage._fearEffect = { onResize: vi.fn() };
    stage._limitedView = { onResize: vi.fn() };
    stage._keyDownBar = { container: { position: { set: vi.fn() } } };
    stage._comboDisplay = { container: { position: { set: vi.fn() } } };

    stage.onResize(1366, 768);

    expect(stage._statusBar.relayout).toHaveBeenCalledWith(1366, 768);
    expect(stage._quickSlots.Relayout).toHaveBeenCalledWith(1366, 768);
    expect(stage._revivePanel.Relayout).toHaveBeenCalledWith(1366, 768);
  });
});

const nxDir = process.env.MAPLECLAUDE_NX_DIR;

describe.skipIf(!nxDir)('QuickSlotBar keycap label coords (real UI.nx)', () => {
  it('every keycap label sits at slotRect origin + (2,2) in attached mode', async () => {
    const { WzPackage } = await import('../../../src/wz/WzPackage.js');
    const { WzTextureLoader } = await import('../../../src/render/WzTextureLoader.js');
    const ui = WzPackage.Open(`${nxDir}/UI.nx`);
    const loader = new WzTextureLoader();
    const bar = new QuickSlotBar(
      loader, ui, null,
      () => ({ type: 0, id: 0 }) as any,
      () => {},
      () => null,
      () => null,
    );
    // Attached mode (viewW > 800): grid anchored like OG RelMove(881, 2).
    bar.Relayout(1024, 768);
    bar.draw();

    const root = bar.container;
    const keys = bar.GetKeys();
    let checked = 0;
    for (let i = 0; i < 8; i++) {
      const r = (bar as unknown as { _slotRect(i: number): { x: number; y: number; width: number; height: number } })._slotRect(i);
      const lbl = root.children.find((c) => {
        const t = (c as any).texture;
        return t && c.x === r.x + 2 && c.y === r.y + 2;
      });
      // Every default quickslot key (Shift/Ins/Home/PgUp/Ctrl/Del/End/PgDn)
      // has a keycap canvas under UIWindow2.img/KeyConfig/quickslotConfig/key.
      expect(lbl, `no label sprite at slot ${i} (scancode 0x${keys[i].toString(16)})`).toBeTruthy();
      checked++;
    }
    expect(checked).toBe(8);
  });
});
