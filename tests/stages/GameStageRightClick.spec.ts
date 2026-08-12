import { describe, expect, it, vi } from 'vitest';
import { GameStage } from '../../src/stages/GameStage.js';
import { MouseButton } from '../../src/app/Stage.js';

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

function makeStage(): any {
  const stage: any = Object.create(GameStage.prototype);
  stage._chatBar = null;
  stage._panels = [];
  stage._quitOverlay = null;
  stage._gameMenu = null;
  stage._keyConfig = null;
  stage._frameMuteButton = null;
  stage._dragController = { updatePosition: vi.fn(), isDragging: false, endDrag: vi.fn(), payload: null };
  stage._contextMenu = null;
  stage._miniMap = null;
  stage._camera = { ScreenToWorld: (x: number, y: number) => ({ x, y }) };
  stage._npcs = [];
  stage._otherChars = new Map();
  stage._mobs = new Map();
  stage._physics = null;
  stage._player = null;
  stage._pendingBridle = null;
  stage.uiRoot = { addChild: vi.fn() };
  return stage;
}

describe('GameStage player context menu (OG CUserLocal::HandleRButtonClk)', () => {
  it('right-click (DOM button 2) on another character deploys the list', () => {
    const stage = makeStage();
    const other = {
      CharId: 900001,
      Name: 'TestChar',
      HitTest: () => true,
    };
    stage._otherChars.set(900001, other);

    // DOM mousedown button=2 (right) → mouseup button=2.
    stage.onMouseButton(300, 300, true, 2);
    stage.onMouseButton(300, 300, false, 2);

    expect(stage._contextMenu).not.toBeNull();
    expect(stage._contextMenu.isVisible).toBe(true);
  });

  it('left-click on another character does NOT open the list (sends info request)', () => {
    const stage = makeStage();
    const send = vi.fn();
    stage.game = { session: { send } };
    const other = {
      CharId: 900002,
      Name: 'OtherChar',
      HitTest: () => true,
    };
    stage._otherChars.set(900002, other);

    stage.onMouseButton(300, 300, false, MouseButton.Left);
    expect(stage._contextMenu).toBeNull();
    expect(send).toHaveBeenCalled();
  });
});