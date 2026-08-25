import { describe, expect, it, vi } from 'vitest';
import { StatusMessenger } from '../../../src/ui/game/StatusMessenger.js';

// Text width measurement needs a canvas 2D context; provide the minimal shim
// (same pattern as GameStageChat.spec).
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

// OG ground truth — CUIScreenMsg (ctor @0x83D8B0, LayoutScrMsg @0x83D440,
// ScrMsg_Add @0x83DC40):
// - Up to SIX 290x14 strips anchored to the RIGHT-BOTTOM of the screen;
//   entry k sits at (viewW - 296, viewH - 172 + 14k) (-235 base when the
//   quickslot bar is slid up).
// - Text is RIGHT-ALIGNED inside the strip (x = 290 - textWidth), drawn with
//   a black outline pass at (+1,+1) under the white/yellow main pass.
// - Alpha pops to 255 instantly and fades out from currentTime + 1500ms.
describe('StatusMessenger as CUIScreenMsg', () => {
  it('anchors the stack to the right-bottom (viewW-296, viewH-172)', () => {
    const m = new StatusMessenger();
    m.relayout(1024, 768);
    const c = (m as unknown as { _msgContainer: { x: number; y: number } })._msgContainer;
    expect(c.x).toBe(1024 - 296);
    expect(c.y).toBe(768 - 172);
  });

  it('stacks entries downward at 14px pitch (newest lowest)', () => {
    const m = new StatusMessenger();
    m.ScrMsgAdd('first');
    m.ScrMsgAdd('second');
    m.ScrMsgAdd('third');
    const msgs = (m as unknown as { _messages: Array<{ container: { y: number } }> })._messages;
    expect(msgs.length).toBe(3);
    expect(msgs[0].container.y).toBe(0);
    expect(msgs[1].container.y).toBe(14);
    expect(msgs[2].container.y).toBe(28);
  });

  it('recycles the oldest strip beyond 6 slots (OG head->tail reuse)', () => {
    const m = new StatusMessenger();
    for (let i = 0; i < 8; i++) m.ScrMsgAdd(`m${i}`);
    const msgs = (m as unknown as { _messages: Array<{ container: { children: Array<{ text: string }> } }> })._messages;
    expect(msgs.length).toBe(6);
    // oldest two were dropped; newest six remain in order.
    const first = msgs[0].container.children.find((c) => 'text' in c) as unknown as { text: string };
    expect(first.text).toBe('m2');
  });

  it('holds alpha for 1500ms then fades to 0', () => {
    vi.useFakeTimers();
    const m = new StatusMessenger();
    m.ScrMsgAdd('hello');
    const msg = (m as unknown as { _messages: Array<{ container: { alpha: number }; ageMs: number }> })._messages[0];
    m.update(1.0);
    expect(msg.container.alpha).toBe(1); // still holding
    m.update(0.6); // ageMs = 1600 -> 100ms into the fade
    expect(msg.container.alpha).toBeCloseTo(1 - 100 / 500, 5);
    m.update(0.5);
    expect((m as unknown as { _messages: unknown[] })._messages.length).toBe(0);
    vi.useRealTimers();
  });

  it('right-aligns the text at the strip edge with an offset outline pass', () => {
    const m = new StatusMessenger();
    m.ScrMsgAdd('aligned');
    const msg = (m as unknown as { _messages: Array<{ outline: { position: { x: number; y: number } }; text: { position: { x: number } } }> })._messages[0];
    expect(msg.text.position.x).toBe(290); // right edge of the strip
    expect(msg.outline.position.x).toBe(291); // +1 outline pass
    expect(msg.outline.position.y).toBe(1);
  });
});
