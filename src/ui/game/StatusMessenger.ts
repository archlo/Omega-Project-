import { Container, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';

// OG: CUIScreenMsg — the on-screen message stack anchored to the RIGHT-BOTTOM
// of the screen (ctor @0x83D8B0). Up to SIX 290x14 strips; LayoutScrMsg
// @0x83D440 places entry k at (viewW - 296, viewH - 172 + 14k) relative to
// the Origin_RB anchor (-235 base when the quickslot bar is slid up).
// ScrMsg_Add @0x83DC40: when all 6 slots are busy the OLDEST strip is
// recycled (canvas cleared, moved to the tail); the text is drawn
// RIGHT-ALIGNED inside the 290px strip (x = 290 - CalcTextWidth) with a
// black outline pass at (+1,+1) under the colored main pass
// (FONT_BASIC_WHITE / FONT_BASIC_YELLOW over FONT_BASIC_BLACK), pops to
// alpha 255 instantly and fades out from currentTime + 1500ms.
const STRIP_W = 290;
const STRIP_H = 14;
const MAX_STRIPS = 6;
const BASE_Y = -172; // OG: -235 when CUIStatusBar::CQuickSlot::IsSlideUp()
const X_OFF = -296;
const HOLD_MS = 1500;
const FADE_MS = 500;

interface Msg {
  container: Container;
  outline: Text;
  text: Text;
  ageMs: number;
}

export class StatusMessenger extends GamePanel {
  position = { x: 300, y: 320 };

  private _msgContainer: Container;
  private _messages: Msg[] = [];
  private _viewW = 800;
  private _viewH = 600;

  constructor() {
    super();
    this.isVisible = true; // always-on HUD layer, never explicitly toggled
    this._msgContainer = new Container();
    this._root.addChild(this._msgContainer);
  }

  /** OG LayoutScrMsg — re-stack after add/remove/resize. */
  relayout(viewW: number, viewH: number): void {
    this._viewW = viewW;
    this._viewH = viewH;
    this._msgContainer.position.set(viewW + X_OFF, viewH + BASE_Y);
    this._messages.forEach((m, i) => { m.container.y = i * STRIP_H; });
  }

  /** OG CUIScreenMsg::ScrMsg_Add — white/yellow text with a black outline. */
  ScrMsgAdd(text: string, yellow = false): void {
    const fill = yellow ? '#FFE800' : '#FFFFFF';
    const style = new TextStyle({
      fill,
      fontSize: 12,
      fontFamily: 'Arial',
      stroke: { color: '#000000', width: 2 },
    });
    const outline = new Text({ text, style: new TextStyle({ fill: '#000000', fontSize: 12, fontFamily: 'Arial' }) });
    const main = new Text({ text, style });
    const container = new Container();
    // Right-align inside the 290px strip; the outline pass sits at (+1,+1)
    // exactly like the double DrawTextA in ScrMsg_Add.
    const w = Math.max(main.width, outline.width);
    main.anchor.set(1, 0);
    outline.anchor.set(1, 0);
    main.position.set(STRIP_W, 0);
    outline.position.set(STRIP_W + 1, 1);
    void w;
    container.alpha = 1; // RelMove(255, 0) — visible instantly
    container.addChild(outline, main);
    if (this._messages.length >= MAX_STRIPS) {
      // Recycle the oldest strip (OG clears the head layer and moves it to
      // the tail instead of destroying it).
      const old = this._messages.shift()!;
      this._msgContainer.removeChild(old.container);
      old.container.destroy({ children: true });
    }
    this._msgContainer.addChild(container);
    this._messages.push({ container, outline, text: main, ageMs: 0 });
    this.relayout(this._viewW, this._viewH);
  }

  showLoot(item: string): void { this.ScrMsgAdd(item); }
  showEXP(amount: number): void { this.ScrMsgAdd(`+${amount} EXP`, true); }
  showBuff(name: string): void { this.ScrMsgAdd(`Buff: ${name}`); }
  showLevelUp(level: number): void { this.ScrMsgAdd(`Level Up! Lv.${level}`); }
  // TODO_AUDIT.md Eighty-fourth pass: CTips ambient gameplay tip toast.
  showTip(text: string): void { this._addMsg(`Tip: ${text}`, '#87CEEB'); }

  update(dt: number): void {
    for (let i = this._messages.length - 1; i >= 0; i--) {
      const m = this._messages[i];
      m.ageMs += dt * 1000;
      // OG: alpha holds at 255 until currentTime + 1500ms, then tweens away.
      if (m.ageMs > HOLD_MS) {
        m.container.alpha = Math.max(0, 1 - (m.ageMs - HOLD_MS) / FADE_MS);
        if (m.container.alpha <= 0) {
          this._msgContainer.removeChild(m.container);
          m.container.destroy({ children: true });
          this._messages.splice(i, 1);
        }
      }
    }
  }

  private _addMsg(text: string, color: string): void {
    const c = new Container();
    const t = new Text({ text, style: new TextStyle({ fill: color, fontSize: 11, fontFamily: 'Arial', stroke: { color: '#000000', width: 2 } }) });
    c.addChild(t);
    c.x = 0;
    this._msgContainer.addChild(c);
    this._messages.push({ container: c, outline: t, text: t, ageMs: 0 });
    if (this._messages.length > MAX_STRIPS) {
      const old = this._messages.shift()!;
      this._msgContainer.removeChild(old.container);
    }
    this.relayout(this._viewW, this._viewH);
  }
}
