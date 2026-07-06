import { Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';

const PanelW = 300;
const PanelH = 150;
const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 12, fontFamily: 'monospace' });
const _bodyStyle = new TextStyle({ fill: '#FFFFFF', fontSize: 11, fontFamily: 'monospace' });
const _btnStyle = new TextStyle({ fill: '#D8D8D8', fontSize: 10, fontFamily: 'monospace' });

export class CharacterSale extends GamePanel {
  onCheckName: ((name: string) => void) | null = null;

  private _bg = new Graphics();
  private _title = new Text({ text: 'Character Sale', style: _titleStyle });
  private _body = new Text({ text: '', style: _bodyStyle });
  private _checkBtn = new Graphics();
  private _checkLabel = new Text({ text: 'Check Name', style: _btnStyle });
  private _closeBtn = new Graphics();
  private _closeLabel = new Text({ text: 'Close', style: _btnStyle });
  private _lastCheck: { id: string; resultCode: number } | null = null;
  private _lastCreate: { mode: number; code: number } | null = null;

  constructor() {
    super();
    this.container.position.set(320, 164);
    this._title.position.set(10, 8);
    this._body.position.set(12, 32);
    this._checkLabel.position.set(50, 116);
    this._closeLabel.position.set(186, 116);
    this.container.addChild(this._bg, this._title, this._body, this._checkBtn, this._checkLabel, this._closeBtn, this._closeLabel);
    this._drawChrome();
    this._refresh();
  }

  Open(): void {
    this.isVisible = true;
    this._refresh();
  }

  SetCheckResult(id: string, resultCode: number): void {
    this._lastCheck = { id, resultCode };
    this.isVisible = true;
    this._refresh();
  }

  SetCreateResult(mode: number, code: number): void {
    this._lastCreate = { mode, code };
    this.isVisible = true;
    this._refresh();
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    if (!down) return true;
    const lx = x - this.container.position.x;
    const ly = y - this.container.position.y;
    if (this._hit(lx, ly, 42, 110, 98, 24)) {
      const name = (globalThis as { prompt?: (msg: string) => string | null }).prompt?.('Character name:') ?? '';
      if (name.trim()) this.onCheckName?.(name.trim());
      return true;
    }
    if (this._hit(lx, ly, 178, 110, 70, 24)) { this.isVisible = false; return true; }
    return lx >= 0 && lx < PanelW && ly >= 0 && ly < PanelH;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.isVisible = false; return true; }
    return false;
  }

  private _refresh(): void {
    // TODO_AUDIT.md Hundred-and-fifty-fourth pass: CUICharacterSaleDlg create
    // needs job/look/item/ability fields; only the verified name-check sender
    // and result display are exposed here.
    const check = this._lastCheck
      ? `${this._lastCheck.id}: ${this._lastCheck.resultCode === 0 ? 'available' : `code ${this._lastCheck.resultCode}`}`
      : '-';
    const create = this._lastCreate ? `mode ${this._lastCreate.mode}, code ${this._lastCreate.code}` : '-';
    this._body.text = `Name check: ${check}\nCreate result: ${create}\nCreate form: not modeled`;
  }

  private _drawChrome(): void {
    this._bg.clear().roundRect(0, 0, PanelW, PanelH, 5).fill({ color: 0x101423, alpha: 0.92 }).stroke({ color: 0xcc99ff, width: 1 });
    this._checkBtn.clear().rect(42, 110, 98, 24).fill({ color: 0x1E2030, alpha: 0.9 }).stroke({ color: 0x505570, width: 1 });
    this._closeBtn.clear().rect(178, 110, 70, 24).fill({ color: 0x1E2030, alpha: 0.9 }).stroke({ color: 0x505570, width: 1 });
  }

  private _hit(x: number, y: number, bx: number, by: number, bw: number, bh: number): boolean {
    return x >= bx && x < bx + bw && y >= by && y < by + bh;
  }
}
