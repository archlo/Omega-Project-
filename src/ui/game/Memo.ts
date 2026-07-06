import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { BuiltInFont } from '../BuiltInFont.js';
import { Button } from '../Button.js';

const PanelW = 400;
const PanelH = 300;
const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 11, fontFamily: 'monospace' });
const _msgStyle = new TextStyle({ fill: '#FFF', fontSize: 10, fontFamily: 'monospace' });
const _dateStyle = new TextStyle({ fill: '#888', fontSize: 9, fontFamily: 'monospace' });

export interface MemoMessage {
  id: number;
  from: string;
  text: string;
  date: string;
  read: boolean;
}

export class Memo extends GamePanel {
  OnSend: ((target: string, text: string) => void) | null = null;
  OnDelete: ((id: number) => void) | null = null;

  private _background: WzSprite | null;
  private _font: BuiltInFont | null;
  private _messages: MemoMessage[] = [];
  private _selected = -1;
  private _composing = false;
  private _composeTarget = '';
  private _composeText = '';
  private _allButtons: Button[] = [];
  private _btClose: Button | null = null;
  private _btSend: Button | null = null;
  private _btDelete: Button | null = null;
  private _btNew: Button | null = null;
  private _dynamicChildren: Container[] = [];

  constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null) {
    super();
    this._font = font;
    this.isVisible = false;
    this.container.position.set(200, 80);

    const memo = ui?.GetItem('UIWindow2.img/Memo');
    const memoProp = memo instanceof WzProperty ? memo : null;
    this._background = memoProp?.Get('backgrnd') instanceof WzCanvas ? loader.Load(memoProp!.Get('backgrnd') as WzCanvas) : null;
    this._btClose = this._makeButton(loader, memoProp, 'BtClose', () => { this.isVisible = false; });
    this._btSend = this._makeButton(loader, memoProp, 'BtSend', () => this._doSend());
    this._btDelete = this._makeButton(loader, memoProp, 'BtDelete', () => this._doDelete());
    this._btNew = this._makeButton(loader, memoProp, 'BtNew', () => { this._startCompose(); });

    const title = new Text({ text: 'Memo', style: _titleStyle });
    title.x = 8; title.y = 5;
    this.container.addChild(title);
  }

  Open(messages: MemoMessage[]): void {
    this._messages = messages;
    this._selected = -1;
    this._composing = false;
    this.isVisible = true;
  }

  // OG: CUIMemo's actual compose flow is a real `CCtrlMLEdit` multi-line
  // text box (TODO_AUDIT.md Fifty-seventh pass). No text-input widget
  // exists in this client — `window.prompt` is the same fallback already
  // used for every other free-text entry (Trunk/Trade amounts, party/friend
  // invite names, GuildBBS posts).
  private _startCompose(): void {
    const target = window.prompt('Send to (character name):') ?? '';
    if (target.length === 0) return;
    const text = window.prompt('Message:') ?? '';
    if (text.length === 0) return;
    this._composing = true;
    this._composeTarget = target;
    this._composeText = text;
  }

  private _doSend(): void {
    if (this._composeTarget && this._composeText) {
      this.OnSend?.(this._composeTarget, this._composeText);
    }
    this._composing = false;
  }

  private _doDelete(): void {
    if (this._selected >= 0 && this._selected < this._messages.length) {
      this.OnDelete?.(this._messages[this._selected].id);
      this._messages.splice(this._selected, 1);
      this._selected = -1;
    }
  }

  update(_dt: number): void {
    if (!this.isVisible) return;
    this.draw();
  }

  draw(): void {
    if (!this.isVisible) return;
    this._rebuildBackground();
    for (const c of this._dynamicChildren) c.destroy();
    this._dynamicChildren = [];
    this._drawList();
    this._drawButtons();
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    if (!down) return true;
    for (const b of this._allButtons) {
      if (b.handleMouseButton(x, y, down)) return true;
    }
    const px = this.container.position.x;
    const py = this.container.position.y;
    const lx = x - px;
    const ly = y - py;

    if (lx >= PanelW - 18 && ly < 22) { this.isVisible = false; return true; }

    if (this._composing) {
      if (lx >= 20 && lx < 380 && ly >= 120 && ly < 140) {
        // focus target field
        return true;
      }
      if (lx >= 20 && lx < 380 && ly >= 150 && ly < 260) {
        // focus text field
        return true;
      }
      return lx >= 0 && lx < PanelW && ly >= 0 && ly < PanelH;
    }

    const startY = 48;
    const rowH = 22;
    if (lx >= 8 && lx < PanelW - 8 && ly >= startY && ly < PanelH - 48) {
      const idx = Math.floor((ly - startY) / rowH);
      if (idx >= 0 && idx < this._messages.length) {
        this._selected = idx;
        return true;
      }
    }

    return lx >= 0 && lx < PanelW && ly >= 0 && ly < PanelH;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.isVisible = false; return true; }
    return false;
  }

  private _rebuildBackground(): void {
    if (this._background) {
      const sp = this._background.ToPixi();
      this.container.addChildAt(sp, 0);
    }
  }

  private _drawList(): void {
    if (this._composing) {
      const target = new Text({ text: `To: ${this._composeTarget}`, style: _msgStyle });
      target.x = 20; target.y = 120;
      this.container.addChild(target);
      this._dynamicChildren.push(target);

      const body = new Text({ text: this._composeText || '(type message)', style: _msgStyle });
      body.x = 20; body.y = 150;
      this.container.addChild(body);
      this._dynamicChildren.push(body);
      return;
    }

    const startY = 48;
    const rowH = 22;
    for (let i = 0; i < this._messages.length; i++) {
      const m = this._messages[i];
      const ry = startY + i * rowH;
      const bg = new Graphics();
      bg.rect(8, ry, PanelW - 16, rowH).fill({ color: i === this._selected ? '#2E2E4C' : (i % 2 === 0 ? '#13131F' : '#181828'), alpha: 0.8 });
      this.container.addChild(bg);
      this._dynamicChildren.push(bg);

      const from = new Text({ text: m.read ? m.from : `* ${m.from}`, style: m.read ? _msgStyle : new TextStyle({ fill: '#FFD700', fontSize: 10, fontFamily: 'monospace' }) });
      from.x = 12; from.y = ry + 3;
      this.container.addChild(from);
      this._dynamicChildren.push(from);

      const date = new Text({ text: m.date, style: _dateStyle });
      date.x = PanelW - 80; date.y = ry + 3;
      this.container.addChild(date);
      this._dynamicChildren.push(date);
    }
  }

  private _drawButtons(): void {
    if (this._btClose) this._btClose.container.position.set(this.container.position.x + PanelW - 22, this.container.position.y + 4);
    if (this._btSend) this._btSend.container.position.set(300, 270);
    if (this._btDelete) this._btDelete.container.position.set(220, 270);
    if (this._btNew) this._btNew.container.position.set(140, 270);
  }

  private _makeButton(loader: WzTextureLoader, root: WzProperty | null, name: string, onClick: () => void): Button | null {
    const pr = root?.Get(name);
    if (!(pr instanceof WzProperty)) return null;
    const b = Button.fromWz(loader, pr, name);
    b.onClick = onClick;
    this._allButtons.push(b);
    this.container.addChild(b.container);
    return b;
  }
}
