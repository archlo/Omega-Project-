import { Container, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';

const FADE_TIME = 3;

const _msgStyle = new TextStyle({ fill: '#FFF', fontSize: 11, fontFamily: 'monospace' });

// OG class: CFloatNotice (CreateFloatNotice/CreateEffEvolRing) — a plain
// object with no IGObj/IUIMsgHandler interfaces, unlike CUIxxx windows,
// consistent with this panel's lightweight always-on toast nature. EXP-gain
// toasts specifically are driven by CWvsContext::OnIncEXPMessage
// (decompile/9F86C0.c). Distinct from CUINoticePremium (cash-shop popup,
// not a toast — see Notice.ts).
export class StatusMessenger extends GamePanel {
  position = { x: 300, y: 320 };

  private _msgContainer: Container;
  private _messages: { text: Container; time: number }[] = [];

  constructor() {
    super();
    this.isVisible = true; // always-on HUD layer, never explicitly toggled
    this._msgContainer = new Container();
    this._msgContainer.x = this.position.x;
    this._msgContainer.y = this.position.y;
    this._root.addChild(this._msgContainer);
  }

  showLoot(item: string): void { this._addMsg(`Loot: ${item}`, '#FFD700'); }
  showEXP(amount: number): void { this._addMsg(`+${amount} EXP`, '#F1C40F'); }
  showBuff(name: string): void { this._addMsg(`Buff: ${name}`, '#2ECC40'); }
  showLevelUp(level: number): void { this._addMsg(`Level Up! Lv.${level}`, '#FF6B6B'); }
  // TODO_AUDIT.md Eighty-fourth pass: CTips ambient gameplay tip toast.
  showTip(text: string): void { this._addMsg(`Tip: ${text}`, '#87CEEB'); }

  update(dt: number): void {
    for (let i = this._messages.length - 1; i >= 0; i--) {
      this._messages[i].time -= dt;
      if (this._messages[i].time <= 0) {
        this._msgContainer.removeChild(this._messages[i].text);
        this._messages.splice(i, 1);
      }
    }
    for (let i = 0; i < this._messages.length; i++) {
      this._messages[i].text.y = i * 18;
    }
  }

  private _addMsg(text: string, color: string): void {
    const c = new Container();
    const t = new Text({ text, style: new TextStyle({ fill: color, fontSize: 11, fontFamily: 'monospace' }) });
    c.addChild(t);
    c.x = 0;
    this._msgContainer.addChild(c);
    this._messages.push({ text: c, time: FADE_TIME });
    if (this._messages.length > 6) {
      const old = this._messages.shift()!;
      this._msgContainer.removeChild(old.text);
    }
  }
}
