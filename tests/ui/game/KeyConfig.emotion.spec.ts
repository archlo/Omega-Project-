import { describe, it, expect, vi } from 'vitest';
import { KeyConfig, KeyAction } from '../../../src/ui/game/KeyConfig.js';
import { GameStage } from '../../../src/stages/GameStage.js';
import { InPacket } from '../../../src/net/packet/InPacket.js';

// Canvas shim — KeyConfig ctor loads WZ textures / measures text.
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
(globalThis as any).window ??= { innerWidth: 800, innerHeight: 600 };
(globalThis as any).localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };

// OG default map binds F1-F7 (scancodes 59-65) to ids 55-61 =
// KeyAction.Emotion1..7. `_actionToFk` must resolve those or isActionDown
// returns false and F1-F7 do nothing.
describe('KeyConfig emotion key resolution (_actionToFk 55..61)', () => {
  function makeKc(): any {
    return new KeyConfig(null as any, null, null);
  }

  it('resolves Emotion1..7 to Menu-type records matching the default map', () => {
    const kc = makeKc();
    for (let i = 1; i <= 7; i++) {
      const action = KeyAction[`Emotion${i}` as keyof typeof KeyAction];
      expect(action).toBe(54 + i);
      const fk = (kc as any)._actionToFk(action);
      expect(fk, `Emotion${i}`).not.toBeNull();
      expect(fk.type).toBe(4); // FuncKeyType.Menu
      expect(fk.id).toBe(55 + i - 1);
    }
  });

  it('isActionDown(EmotionN) fires when the bound F-key is held', () => {
    const kc = makeKc();
    // F1 (scancode 59 → 'F1') is Emotion1 in the default map.
    expect(kc.isActionDown((k) => k === 'F1', KeyAction.Emotion1)).toBe(true);
    expect(kc.isActionDown((k) => k === 'F7', KeyAction.Emotion7)).toBe(true);
    expect(kc.isActionDown((k) => k === 'F1', KeyAction.Emotion2)).toBe(false);
  });
});

// F1 dispatch reaches _sendEmotionChange through onKeyPress:
// forKey('F1') → {Menu,55} → _executeMenuAction(55) falls through →
// handleKeyDown('F1') → emotion loop → gated sender.
describe('GameStage emotion keypress flow', () => {
  function makeStage(): any {
    const stage: any = Object.create(GameStage.prototype);
    stage._quitOverlay = null;
    stage._gameMenu = null;
    stage._panels = [];
    stage._chatBar = null;
    stage._keyConfig = new KeyConfig(null as any, null, null);
    stage._player = { SetEmotion: vi.fn(), morphTemplateId: 0 };
    stage._miniMap = null;
    stage._lastEmotionTime = 0;
    stage.game = { session: { send: vi.fn() } };
    return stage;
  }

  it('onKeyPress(F1) sends UserEmotion(1) and applies the local face', () => {
    const stage = makeStage();
    stage.onKeyPress('F1');
    expect(stage.game.session.send).toHaveBeenCalledTimes(1);
    const p = stage.game.session.send.mock.calls[0][0];
    const r = new InPacket(p.toArray());
    expect(r.readShort()).toBe(56); // UserEmotion
    expect(r.readInt()).toBe(1);
    expect(stage._player.SetEmotion).toHaveBeenCalledWith(1);
  });

  it('blocks emotions while morphed (OG AddChatMorphedMsg gate)', () => {
    const stage = makeStage();
    stage._player.morphTemplateId = 2300000;
    stage.onKeyPress('F1');
    expect(stage.game.session.send).not.toHaveBeenCalled();
    expect(stage._player.SetEmotion).not.toHaveBeenCalled();
  });

  it('enforces the 2000ms cooldown between emotions', () => {
    const stage = makeStage();
    stage.onKeyPress('F1');
    stage.onKeyPress('F2'); // within cooldown
    expect(stage.game.session.send).toHaveBeenCalledTimes(1);
  });
});
