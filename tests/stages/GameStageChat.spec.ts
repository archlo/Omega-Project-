import { describe, expect, it, vi } from 'vitest';
import { GameStage } from '../../src/stages/GameStage.js';
import { ChatBar } from '../../src/ui/game/ChatBar.js';

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

// The ChatBar owns the chat edit box, combo box, tabs and log. GameStage must
// route keyboard/mouse to it (OG: CUIStatusBar owns the chat UI and its OnKey
// / OnMouseButton dispatch to the edit + combo). These tests pin that wiring.
function makeStage(chat: ChatBar): any {
  const stage: any = Object.create(GameStage.prototype);
  stage._chatBar = chat;
  stage._panels = [];
  stage._quitOverlay = null;
  stage._gameMenu = null;
  stage._keyConfig = null;
  stage._frameMuteButton = null;
  stage._dragController = { updatePosition: vi.fn(), isDragging: false, endDrag: vi.fn(), payload: null };
  stage._contextMenu = null;
  stage._miniMap = null;
  stage._chatTarget = 'all';
  stage._chatTab = 0;
  stage._camera = { ScreenToWorld: (x: number, y: number) => ({ x, y }) };
  stage._npcs = [];
  stage._otherChars = new Map();
  stage._mobs = new Map();
  stage._physics = null;
  stage._player = null;
  stage._pendingBridle = null;
  return stage;
}

describe('GameStage chat wiring (OG CUIStatusBar 0x87FDE0 / 0x8803F0)', () => {
  it('press Enter with the chat inactive starts the chat (StartChat)', () => {
    const chat = new ChatBar();
    const stage = makeStage(chat);
    const spy = vi.spyOn(chat, 'startChat');
    stage.onKeyPress('Enter');
    expect(spy).toHaveBeenCalled();
  });

  it('routes keys to the focused chat bar so Enter sends + EndChat', () => {
    const chat = new ChatBar();
    const stage = makeStage(chat);
    chat.focus();
    const send = vi.spyOn(chat as any, '_sendInput');
    const end = vi.spyOn(chat, 'endChat');
    stage.onKeyPress('Enter');
    expect(send).toHaveBeenCalled();
    expect(end).toHaveBeenCalled();
  });

  it('the chat bar owns all keys while focused (letters type, not func keys)', () => {
    const chat = new ChatBar();
    const stage = makeStage(chat);
    chat.focus();
    stage.onKeyPress('h');
    expect((chat as any)._input).toBe('h');
    // While focused, gameplay keys like ArrowUp must NOT fire portals — the
    // chat bar consumes them (OG OnKey: ArrowUp = CChatHelper::HistoryUp).
    const up = vi.spyOn(stage, '_handleUpKeyDown');
    stage.onKeyPress('ArrowUp');
    expect(up).not.toHaveBeenCalled();
  });

  it('routes mouse clicks to the chat bar so the combo box opens', () => {
    const chat = new ChatBar();
    const stage = makeStage(chat);
    const comboSpy = vi.spyOn((chat as any)._combo, 'toggle');
    // Combo box is at (3, 539) [519 + 20 CHAT_DY], 68x21 in frame coords.
    stage.onMouseButton(10, 550, true, 0);
    expect(comboSpy).toHaveBeenCalled();
  });

  it('outside clicks fall through — the chat bar is not focused/opened', () => {
    const chat = new ChatBar();
    const stage = makeStage(chat);
    const comboSpy = vi.spyOn((chat as any)._combo, 'toggle');
    stage.onMouseButton(400, 300, true, 0);
    expect(comboSpy).not.toHaveBeenCalled();
    expect(chat.isFocused).toBe(false);
  });
});
