import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';

const PANEL_W = 340;
const PANEL_H = 120;

const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 12, fontFamily: 'monospace' });
const _msgStyle = new TextStyle({ fill: '#FFF', fontSize: 11, fontFamily: 'monospace', wordWrap: true, wordWrapWidth: 300 });

// OG: generic notices are CUtilDlg::Notice (decompile/977220.c, 334 callers)
// plus sibling CUtilDlg::YesNo/YesNo2. A separate CUINoticePremium singleton
// (TSingleton<CUINoticePremium>) handles the premium/cash-shop notice variant
// — not the same class as this generic OK-dialog panel.
export class Notice extends GamePanel {
  private _bg: Graphics;
  private _titleText: Text;
  private _msgText: Text;
  private _btnOk: Container;
  private _btnCancel: Container;
  private _isConfirm = false;

  onDismiss: (() => void) | null = null;
  // OG: CUtilDlg::YesNo (sibling of CUtilDlg::Notice) — fired only in
  // showConfirm() mode when the user picks the affirmative button.
  onConfirm: (() => void) | null = null;
  private _message = '';

  constructor() {
    super();
    this._root.visible = false;

    this._bg = new Graphics();
    this._bg.rect(0, 0, PANEL_W, PANEL_H).fill({  color: '#0C0E18', alpha: 0.95 });
    this._bg.rect(0, 0, PANEL_W, PANEL_H).stroke({  color: '#3C4164', width: 1 });
    this._bg.rect(0, 0, PANEL_W, 22).fill({  color: '#0F1224' });
    this._root.addChild(this._bg);

    this._titleText = new Text({ text: 'Notice', style: _titleStyle });
    this._titleText.x = 10; this._titleText.y = 4;
    this._root.addChild(this._titleText);

    this._msgText = new Text({ text: '', style: _msgStyle });
    this._msgText.x = 16; this._msgText.y = 28;
    this._root.addChild(this._msgText);

    this._btnOk = new Container();
    const btn = new Graphics();
    btn.rect(0, 0, 56, 20).fill({  color: '#1E2030', alpha: 0.9 });
    btn.rect(0, 0, 56, 20).stroke({  color: '#505570', width: 1 });
    const t = new Text({ text: 'OK', style: new TextStyle({ fill: '#CCC', fontSize: 10, fontFamily: 'monospace' }) });
    t.x = 20; t.y = 4;
    this._btnOk.addChild(btn, t);
    this._btnOk.y = PANEL_H - 28;
    this._root.addChild(this._btnOk);

    this._btnCancel = new Container();
    const cbtn = new Graphics();
    cbtn.rect(0, 0, 56, 20).fill({  color: '#1E2030', alpha: 0.9 });
    cbtn.rect(0, 0, 56, 20).stroke({  color: '#505570', width: 1 });
    const ct = new Text({ text: 'No', style: new TextStyle({ fill: '#CCC', fontSize: 10, fontFamily: 'monospace' }) });
    ct.x = 20; ct.y = 4;
    this._btnCancel.addChild(cbtn, ct);
    this._btnCancel.y = PANEL_H - 28;
    this._btnCancel.visible = false;
    this._root.addChild(this._btnCancel);

    this._layoutButtons();

    this._root.x = (800 - PANEL_W) / 2;
    this._root.y = (600 - PANEL_H) / 2;
  }

  private _layoutButtons(): void {
    if (this._isConfirm) {
      this._btnOk.x = PANEL_W / 2 - 60;
      this._btnCancel.x = PANEL_W / 2 + 4;
    } else {
      this._btnOk.x = (PANEL_W - 56) / 2;
    }
  }

  show(title: string, message: string): void {
    this._isConfirm = false;
    this._btnCancel.visible = false;
    this._layoutButtons();
    this._titleText.text = title;
    this._message = message;
    this._msgText.text = message;
    this.isVisible = true;
    this._root.visible = true;
  }

  // OG: CUtilDlg::YesNo — shown for actions that need confirmation before the
  // client sends a follow-up request packet (e.g. StoreBank get-all fee).
  showConfirm(title: string, message: string): void {
    this._isConfirm = true;
    this._btnCancel.visible = true;
    this._layoutButtons();
    this._titleText.text = title;
    this._message = message;
    this._msgText.text = message;
    this.isVisible = true;
    this._root.visible = true;
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    const lx = x - this._root.x;
    const ly = y - this._root.y;
    if (!down) return true;
    if (lx >= this._btnOk.x && lx < this._btnOk.x + 56 && ly >= this._btnOk.y && ly < this._btnOk.y + 22) {
      if (this._isConfirm) this._confirm(); else this._dismiss();
      return true;
    }
    if (this._isConfirm && lx >= this._btnCancel.x && lx < this._btnCancel.x + 56 && ly >= this._btnCancel.y && ly < this._btnCancel.y + 22) {
      this._dismiss();
      return true;
    }
    if (lx >= 0 && lx < PANEL_W && ly >= 0 && ly < PANEL_H) return true;
    return false;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Enter' || key === ' ') {
      if (this._isConfirm) this._confirm(); else this._dismiss();
      return true;
    }
    if (key === 'Escape') {
      this._dismiss();
      return true;
    }
    return false;
  }

  private _confirm(): void {
    this.isVisible = false;
    this._root.visible = false;
    this.onConfirm?.();
  }

  private _dismiss(): void {
    this.isVisible = false;
    this._root.visible = false;
    this.onDismiss?.();
  }
}
