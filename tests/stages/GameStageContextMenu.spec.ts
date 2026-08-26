import { describe, expect, it, vi } from 'vitest';
import { Container } from 'pixi.js';
import { GameStage } from '../../src/stages/GameStage.js';
import { ContextMenu } from '../../src/ui/ContextMenu.js';

// Text.width measurement needs a canvas 2D context; provide the minimal shim.
function installCanvasShim(): void {
  if ((globalThis as any).__mapleclaudeCanvasShim) return;
  (globalThis as any).__mapleclaudeCanvasShim = true;
  class Fake2DContext {
    measureText(text: string) { return { width: String(text).length * 8 }; }
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

// OG: CUserLocal::HandleRButtonClk @0x911A60 — right-clicking a REMOTE user
// opens CUIContextMenu (modal); left-click sends the character-info request.
function makeStage(frameToCanvas?: (x: number, y: number) => { x: number; y: number }): any {
  const stage: any = Object.create(GameStage.prototype);
  stage.game = {
    session: { send: vi.fn() },
    frameToCanvas: frameToCanvas ?? ((x: number, y: number) => ({ x, y })),
  };
  stage.uiRoot = new Container();
  stage._panels = [];
  stage._quizModal = null;
  stage._fadeYesNo = null;
  stage._quitOverlay = null;
  stage._gameMenu = null;
  stage._keyConfig = null;
  stage._frameMuteButton = null;
  stage._dragController = { isDragging: false, endDrag: vi.fn(), payload: null };
  stage._contextMenu = null;
  stage._chatBar = null;
  stage._camera = { ScreenToWorld: (x: number, y: number) => ({ x, y }) };
  stage._npcs = [];
  stage._otherChars = new Map();
  stage._mobs = new Map();
  stage._drops = [];
  stage._physics = null;
  stage._player = null;
  stage._pendingBridle = null;
  return stage;
}

function makeOther(charId: number, x: number, y: number): any {
  return {
    CharId: charId,
    Name: `Char${charId}`,
    MiniRoomId: 0,
    Position: { x, y },
    // Same box as OtherCharLook.HitTest: ±15 wide, feet-78..feet tall.
    HitTest: (wx: number, wy: number) =>
      wx >= x - 15 && wx < x + 15 && wy >= y - 78 && wy < y,
  };
}

describe('GameStage right-click player context menu (OG HandleRButtonClk)', () => {
  it('right mouse-up over a remote char shows the context menu', () => {
    const stage = makeStage();
    stage._otherChars.set(42, makeOther(42, 400, 300));
    stage.onMouseButton(400, 280, true, 2);
    expect(stage._contextMenu).toBeNull(); // menu opens on UP, like OG
    stage.onMouseButton(400, 280, false, 2);
    expect(stage._contextMenu).not.toBeNull();
    expect(stage._contextMenu.isVisible).toBe(true);
    const labels = (stage._contextMenu as ContextMenu)['_entries']
      .filter((e) => !('separator' in e)).map((e) => e.label);
    expect(labels).toContain('Info');
    expect(labels).toContain('Trade');
    expect(labels).toContain('Whisper');
  });

  it('right-click still hits when the UI frame is offset inside a larger window', () => {
    // Window 1280x720: the 800x600 frame is centered at (240, 60), scale 1.
    // Mouse events deliver FRAME coords; the world hit test needs canvas coords.
    const stage = makeStage((fx, fy) => ({ x: fx + 240, y: fy + 60 }));
    stage._camera = { ScreenToWorld: (x: number, y: number) => ({ x, y }) };
    stage._otherChars.set(7, makeOther(7, 500, 350));
    // Frame coords of the char's body = canvas (500,330) - offset (240,60).
    stage.onMouseButton(260, 270, true, 2);
    stage.onMouseButton(260, 270, false, 2);
    expect(stage._contextMenu).not.toBeNull();
  });

  it('left click over a remote char sends the info request instead', () => {
    const stage = makeStage();
    const other = makeOther(42, 400, 300);
    stage._otherChars.set(42, other);
    stage.onMouseButton(400, 280, true, 0);
    stage.onMouseButton(400, 280, false, 0);
    expect(stage._contextMenu).toBeNull();
    expect(stage.game.session.send).toHaveBeenCalled();
  });

  it('right-clicking your OWN character opens the self menu (Info / Copy Name)', () => {
    const stage = makeStage();
    stage._otherChars.clear();
    stage._player = { Position: { x: 400, y: 300 }, charName: 'Me' };
    stage._charInfo = { charName: 'Me' };
    const onCharacter = vi.fn();
    stage._statusBar = { onCharacter };

    stage.onMouseButton(400, 270, true, 2);
    expect(stage._contextMenu).toBeNull(); // opens on UP
    stage.onMouseButton(400, 270, false, 2);
    expect(stage._contextMenu).not.toBeNull();

    const entries = (stage._contextMenu as ContextMenu)['_entries'];
    expect(entries.map((e) => ('label' in e ? e.label : ''))).toEqual(['Info', 'Copy Name']);

    // Info toggles the local CUIUserInfo via the status-bar hook.
    (stage._contextMenu as ContextMenu).handleMouseButton(
      ((stage._contextMenu as ContextMenu).container.x) + 10,
      ((stage._contextMenu as ContextMenu).container.y) + 10,
      true,
    );
    expect(onCharacter).toHaveBeenCalled();
  });

  it('left-clicking your own character does NOT open a menu', () => {
    const stage = makeStage();
    stage._player = { Position: { x: 400, y: 300 }, charName: 'Me' };
    stage.onMouseButton(400, 270, false, 0);
    expect(stage._contextMenu).toBeNull();
  });

  it('any subsequent click dismisses an open menu', () => {
    const stage = makeStage();
    stage._otherChars.set(42, makeOther(42, 400, 300));
    stage.onMouseButton(400, 280, false, 2);
    expect(stage._contextMenu).not.toBeNull();
    const menu = stage._contextMenu as ContextMenu;
    stage.onMouseButton(100, 100, true, 0);
    expect(stage._contextMenu).toBeNull();
    expect(menu.container.parent).toBeNull();
  });

  it('moving the mouse off the menu does NOT auto-close it (OG modal DoModal)', () => {
    const stage = makeStage();
    vi.useFakeTimers();
    try {
      stage._otherChars.set(42, makeOther(42, 400, 300));
      stage.onMouseButton(400, 280, false, 2);
      const menu = stage._contextMenu as ContextMenu;
      menu.onMouseMove(700, 550); // far outside the menu rect
      vi.advanceTimersByTime(1000);
      expect(menu.isVisible).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
