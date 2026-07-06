import { Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';

const PanelW = 280;
const PanelH = 142;
const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 12, fontFamily: 'monospace' });
const _bodyStyle = new TextStyle({ fill: '#FFFFFF', fontSize: 11, fontFamily: 'monospace' });
const _btnStyle = new TextStyle({ fill: '#D8D8D8', fontSize: 10, fontFamily: 'monospace' });

export interface StoreBankActionState {
  subAction: number;
  passingDay?: number;
  fee?: number;
  accountId?: number;
  value?: number;
  channel?: number;
}

export class StoreBank extends GamePanel {
  onGetAllConfirm: (() => void) | null = null;

  private _bg = new Graphics();
  private _title = new Text({ text: 'Store Bank', style: _titleStyle });
  private _body = new Text({ text: '', style: _bodyStyle });
  private _okBtn = new Graphics();
  private _okLabel = new Text({ text: 'Get All', style: _btnStyle });
  private _closeBtn = new Graphics();
  private _closeLabel = new Text({ text: 'Close', style: _btnStyle });
  private _lastResult: number | null = null;
  private _action: StoreBankActionState | null = null;

  constructor() {
    super();
    this.container.position.set(330, 172);
    this._title.position.set(10, 8);
    this._body.position.set(12, 32);
    this._okLabel.position.set(58, 116);
    this._closeLabel.position.set(174, 116);
    this.container.addChild(this._bg, this._title, this._body, this._okBtn, this._okLabel, this._closeBtn, this._closeLabel);
    this._drawChrome();
    this._refresh();
  }

  SetResult(resultCode: number): void {
    this._lastResult = resultCode;
    this.isVisible = true;
    this._refresh();
  }

  SetAction(action: StoreBankActionState): void {
    // TODO_AUDIT.md Hundred-and-fifty-fourth pass: CStoreBankDlg sub-action
    // 0x23's dialog tail is still opaque; show decoded state only.
    this._action = action;
    this.isVisible = true;
    this._refresh();
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    if (!down) return true;
    const lx = x - this.container.position.x;
    const ly = y - this.container.position.y;
    if (this._hit(lx, ly, 42, 110, 86, 24)) {
      if (this._action?.subAction === 0x24) this.onGetAllConfirm?.();
      return true;
    }
    if (this._hit(lx, ly, 166, 110, 70, 24)) { this.isVisible = false; return true; }
    return lx >= 0 && lx < PanelW && ly >= 0 && ly < PanelH;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.isVisible = false; return true; }
    if (key === 'Enter' && this._action?.subAction === 0x24) { this.onGetAllConfirm?.(); return true; }
    return false;
  }

  private _refresh(): void {
    const a = this._action;
    const lines = [`Result: ${this._lastResult ?? '-'}`];
    if (a) {
      lines.push(`Action: 0x${a.subAction.toString(16)}`);
      if (a.subAction === 0x24) lines.push(`Get all: ${a.passingDay ?? 0} days, fee ${a.fee ?? 0}`);
      if (a.subAction === 0x25) lines.push(`Account ${a.accountId ?? 0}, value ${a.value ?? 0}, ch ${a.channel ?? 0}`);
      if (a.subAction === 0x26) lines.push('Notice-only result');
    } else {
      lines.push('Action: -');
    }
    this._body.text = lines.join('\n');
    this._okLabel.alpha = a?.subAction === 0x24 ? 1 : 0.45;
  }

  private _drawChrome(): void {
    this._bg.clear().roundRect(0, 0, PanelW, PanelH, 5).fill({ color: 0x101423, alpha: 0.92 }).stroke({ color: 0x88b0ff, width: 1 });
    this._okBtn.clear().rect(42, 110, 86, 24).fill({ color: 0x1E2030, alpha: 0.9 }).stroke({ color: 0x505570, width: 1 });
    this._closeBtn.clear().rect(166, 110, 70, 24).fill({ color: 0x1E2030, alpha: 0.9 }).stroke({ color: 0x505570, width: 1 });
  }

  private _hit(x: number, y: number, bx: number, by: number, bw: number, bh: number): boolean {
    return x >= bx && x < bx + bw && y >= by && y < by + bh;
  }
}
