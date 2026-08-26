import { describe, it, expect } from 'vitest';
import { WzPackage } from '../../src/wz/WzPackage.js';
import { WzTextureLoader } from '../../src/render/WzTextureLoader.js';
import { GameStage } from '../../src/stages/GameStage.js';

// Smoke test: run the REAL _initMenu against the real UI.nx and assert it
// completes without throwing and that the status bar (gauges/level/name/job)
// actually got created + parented. Guards against regressions where a panel
// constructor throws inside the try/catch at GameStage._loadWzAsync:1264 —
// that warn is easy to miss in dev and silently drops every later panel
// (status bar included).
(globalThis as any).window ??= { innerWidth: 1024, innerHeight: 768 };
(globalThis as any).localStorage ??= {
  getItem: () => null, setItem: () => {}, removeItem: () => {},
};
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

describe('GameStage._initMenu smoke (real UI.nx)', () => {
  const nx = process.env.MAPLECLAUDE_NX_DIR;
  if (!nx) {
    it('skipped', () => console.log('MAPLECLAUDE_NX_DIR not set'));
    return;
  }

  it('constructs the full menu without throwing and creates the StatusBar', () => {
    const ui = WzPackage.Open(`${nx}/UI.nx`);
    const stage: any = new GameStage();
    stage._loader = new WzTextureLoader();
    stage._uiWz = ui;
    stage._mapWz = null;
    stage.game = {
      wz: {}, session: { send: () => {} }, nameService: null,
      questInfoService: null, audioPlayer: { PlayEffect: () => {} },
      pixiApp: { screen: { width: 1024, height: 768 } },
    } as any;

    let threw: unknown = null;
    try {
      stage._initMenu(ui);
    } catch (ex) {
      threw = ex;
    }
    expect(threw).toBeNull();
    expect(stage._statusBar).toBeTruthy();
    expect(stage._statusBar.container.parent).toBe(stage.uiRoot);
  });
});
