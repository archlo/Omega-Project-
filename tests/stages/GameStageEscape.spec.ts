import { describe, expect, it, vi } from 'vitest';
import { GameStage } from '../../src/stages/GameStage.js';

function installCanvasShim(): void {
  if ((globalThis as any).__mapleclaudeCanvasShim) return;
  (globalThis as any).__mapleclaudeCanvasShim = true;
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
  (globalThis as any).CanvasRenderingContext2D = Fake2DContext;
  (globalThis as any).OffscreenCanvas = FakeOffscreenCanvas;
  (globalThis as any).document = {
    createElement(tag: string) { return tag === 'canvas' ? new FakeOffscreenCanvas() as any : {}; },
  };
}
installCanvasShim();

function fakePanel(name: string): any {
  return {
    name,
    isVisible: false,
    container: { x: 0, y: 0 },
    resetButtonStates: vi.fn(),
    beginDrag: () => false,
    handleMouseButton: () => false,
  };
}

function makeStage(panels: any[]): any {
  const stage: any = Object.create(GameStage.prototype);
  stage._panels = panels;
  stage._quitOverlay = null;
  stage._gameMenu = null;
  stage._keyConfig = null;
  stage._contextMenu = null;
  stage._worldMap = null;
  stage._userList = null;
  stage._statusBar = null;
  stage._miniMap = null;
  stage._quickSlots = null;
  stage._revivePanel = null;
  stage._questReward = null;
  stage._notice = null;
  stage._questAlarm = null;
  stage._utilDlg = null;
  stage._frameMuteButton = null;
  stage._camera = { ScreenToWorld: (x: number, y: number) => ({ x, y }) };
  stage._npcs = [];
  stage._otherChars = new Map();
  stage._mobs = new Map();
  stage._physics = null;
  stage._player = null;
  stage._pendingBridle = null;
  stage._dragController = { isDragging: false, payload: null, endDrag: vi.fn() };
  stage._drops = [];
  stage.game = { session: { send: vi.fn() }, frameToCanvas: (x: number, y: number) => ({ x, y }) };
  return stage;
}

// OG CWvsContext::ProcessBasicUIKey → TryCloseUI: Escape closes the topmost
// open window one per press; UI_Menu (the game menu) only fires when nothing
// was closed.
describe('GameStage Escape / TryCloseUI', () => {
  it('closes the topmost open panel and resets its button states', () => {
    const bottom = fakePanel('bottom');
    const top = fakePanel('top');
    bottom.isVisible = true;
    top.isVisible = true;
    const stage = makeStage([bottom, top]);

    expect(stage.handleKeyDown('Escape')).toBe(true);
    expect(top.isVisible).toBe(false);
    expect(bottom.isVisible).toBe(true);
    expect(top.resetButtonStates).toHaveBeenCalled();

    expect(stage.handleKeyDown('Escape')).toBe(true);
    expect(bottom.isVisible).toBe(false);
  });

  it('closes the world map / user list even though they are late additions', () => {
    const wm = fakePanel('worldMap');
    wm.isVisible = true;
    const stage = makeStage([wm]);
    stage._worldMap = wm;
    expect(stage.handleKeyDown('Escape')).toBe(true);
    expect(wm.isVisible).toBe(false);
  });

  it('never leaves a stuck pressed button: global mouse-up resets all visible panels', () => {
    const panel = fakePanel('quest');
    panel.isVisible = true;
    const stage = makeStage([panel]);
    const statusBar = { resetButtonStates: vi.fn() };
    stage._statusBar = statusBar;

    stage.onMouseButton(400, 300, true, 0);
    stage.onMouseButton(400, 300, false, 0);

    expect(panel.resetButtonStates).toHaveBeenCalled();
    expect(statusBar.resetButtonStates).toHaveBeenCalled();
  });

  it('does not close HUD panels or the revive gate', () => {
    const hud = fakePanel('statusBar');
    const revive = fakePanel('revive');
    hud.isVisible = true;
    revive.isVisible = true;
    const stage = makeStage([hud, revive]);
    stage._statusBar = hud;
    stage._revivePanel = revive;

    // Both are kept open; with nothing else to close the game-menu branch
    // fires (gameMenu is null here) but must not touch the protected panels.
    stage.handleKeyDown('Escape');
    expect(hud.isVisible).toBe(true);
    expect(revive.isVisible).toBe(true);
  });

  it('toggles the game menu closed on Escape instead of reopening it', () => {
    const stage = makeStage([]);
    const menu = { isVisible: true, Open: vi.fn() };
    stage._gameMenu = menu;

    stage.handleKeyDown('Escape');
    expect(menu.isVisible).toBe(false);

    // Nothing open at all → OG UI_Menu auto-opens the menu.
    stage.handleKeyDown('Escape');
    expect(menu.Open).toHaveBeenCalled();
  });
});
