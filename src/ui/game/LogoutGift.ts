import { Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';

const PanelW = 240;
const PanelH = 118;
const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 12, fontFamily: 'monospace' });
const _bodyStyle = new TextStyle({ fill: '#FFFFFF', fontSize: 11, fontFamily: 'monospace' });
const _btnStyle = new TextStyle({ fill: '#D8D8D8', fontSize: 10, fontFamily: 'monospace' });

export class LogoutGift extends GamePanel {
  private _bg = new Graphics();
  private _title = new Text({ text: 'Logout Gift', style: _titleStyle });
  private _body = new Text({ text: 'A gift is waiting for you.', style: _bodyStyle });
  private _closeBtn = new Graphics();
  private _closeLabel = new Text({ text: 'Close', style: _btnStyle });

  constructor() {
    super();
    this.container.position.set(344, 184);
    this._title.position.set(10, 8);
    this._body.position.set(12, 38);
    this._closeLabel.position.set(158, 90);
    this.container.addChild(this._bg, this._title, this._body, this._closeBtn, this._closeLabel);
    this._drawChrome();
  }

  Open(): void {
    // TODO_AUDIT.md Hundred-and-fifty-fourth pass: LogoutGift has no decoded
    // payload; OG OnLogoutGift is a pure trigger, so this panel is display-only.
    this.isVisible = true;
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    if (!down) return true;
    const lx = x - this.container.position.x;
    const ly = y - this.container.position.y;
    if (this._hit(lx, ly, 148, 84, 58, 24)) { this.isVisible = false; return true; }
    return lx >= 0 && lx < PanelW && ly >= 0 && ly < PanelH;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.isVisible = false; return true; }
    return false;
  }

  private _drawChrome(): void {
    this._bg.clear().roundRect(0, 0, PanelW, PanelH, 5).fill({ color: 0x181426, alpha: 0.92 }).stroke({ color: 0xddbbff, width: 1 });
    this._closeBtn.clear().rect(148, 84, 58, 24).fill({ color: 0x1E2030, alpha: 0.9 }).stroke({ color: 0x665570, width: 1 });
  }

  private _hit(x: number, y: number, bx: number, by: number, bw: number, bh: number): boolean {
    return x >= bx && x < bx + bw && y >= by && y < by + bh;
  }
}
