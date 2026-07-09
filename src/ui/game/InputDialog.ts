import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';

const PANEL_W = 240;
const PANEL_H = 110;

const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 12, fontFamily: 'monospace' });
const _labelStyle = new TextStyle({ fill: '#CCC', fontSize: 11, fontFamily: 'monospace' });
const _inputStyle = new TextStyle({ fill: '#FFF', fontSize: 11, fontFamily: 'monospace' });

// OG: CUtilDlgEx with type=2 (numeric input) — used for meso drop amount and
// stackable item drop quantity. Simplified TS version with a text input field.
export class InputDialog extends GamePanel {
  private _bg: Graphics;
  private _titleText: Text;
  private _labelText: Text;
  private _inputBg: Graphics;
  private _inputText: Text;
  private _inputValue = '';
  private _btnOk: Container;
  private _btnCancel: Container;
  private _maxValue = 0;

  onConfirm: ((value: number) => void) | null = null;
  onCancel: (() => void) | null = null;

  constructor() {
    super();
    this._root.visible = false;

    this._bg = new Graphics();
    this._bg.rect(0, 0, PANEL_W, PANEL_H).fill({ color: '#0C0E18', alpha: 0.95 });
    this._bg.rect(0, 0, PANEL_W, PANEL_H).stroke({ color: '#3C4164', width: 1 });
    this._bg.rect(0, 0, PANEL_W, 22).fill({ color: '#0F1224' });
    this._root.addChild(this._bg);

    this._titleText = new Text({ text: 'Input', style: _titleStyle });
    this._titleText.x = 10; this._titleText.y = 4;
    this._root.addChild(this._titleText);

    this._labelText = new Text({ text: 'Amount:', style: _labelStyle });
    this._labelText.x = 16; this._labelText.y = 32;
    this._root.addChild(this._labelText);

    // Input field background
    this._inputBg = new Graphics();
    this._inputBg.rect(0, 0, 160, 20).fill({ color: '#10121C' });
    this._inputBg.rect(0, 0, 160, 20).stroke({ color: '#505570', width: 1 });
    this._inputBg.x = 60; this._inputBg.y = 30;
    this._root.addChild(this._inputBg);

    this._inputText = new Text({ text: '', style: _inputStyle });
    this._inputText.x = 64; this._inputText.y = 34;
    this._root.addChild(this._inputText);

    // OK button
    this._btnOk = new Container();
    const okBtn = new Graphics();
    okBtn.rect(0, 0, 56, 20).fill({ color: '#1E2030', alpha: 0.9 });
    okBtn.rect(0, 0, 56, 20).stroke({ color: '#505570', width: 1 });
    const okText = new Text({ text: 'OK', style: new TextStyle({ fill: '#CCC', fontSize: 10, fontFamily: 'monospace' }) });
    okText.x = 20; okText.y = 4;
    this._btnOk.addChild(okBtn, okText);
    this._btnOk.x = PANEL_W / 2 - 60;
    this._btnOk.y = PANEL_H - 28;
    this._root.addChild(this._btnOk);

    // Cancel button
    this._btnCancel = new Container();
    const cancelBtn = new Graphics();
    cancelBtn.rect(0, 0, 56, 20).fill({ color: '#1E2030', alpha: 0.9 });
    cancelBtn.rect(0, 0, 56, 20).stroke({ color: '#505570', width: 1 });
    const cancelText = new Text({ text: 'No', style: new TextStyle({ fill: '#CCC', fontSize: 10, fontFamily: 'monospace' }) });
    cancelText.x = 20; cancelText.y = 4;
    this._btnCancel.addChild(cancelBtn, cancelText);
    this._btnCancel.x = PANEL_W / 2 + 4;
    this._btnCancel.y = PANEL_H - 28;
    this._root.addChild(this._btnCancel);

    this._root.x = (800 - PANEL_W) / 2;
    this._root.y = (600 - PANEL_H) / 2;
  }

  show(title: string, label: string, defaultValue: number, maxValue: number): void {
    this._titleText.text = title;
    this._labelText.text = label;
    this._maxValue = maxValue;
    this._inputValue = String(defaultValue);
    this._inputText.text = this._inputValue;
    this.isVisible = true;
    this._root.visible = true;
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    const lx = x - this._root.x;
    const ly = y - this._root.y;
    if (!down) return true;
    if (lx >= this._btnOk.x && lx < this._btnOk.x + 56 && ly >= this._btnOk.y && ly < this._btnOk.y + 22) {
      this._confirm();
      return true;
    }
    if (lx >= this._btnCancel.x && lx < this._btnCancel.x + 56 && ly >= this._btnCancel.y && ly < this._btnCancel.y + 22) {
      this._cancel();
      return true;
    }
    if (lx >= 0 && lx < PANEL_W && ly >= 0 && ly < PANEL_H) return true;
    return false;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Enter' || key === ' ') {
      this._confirm();
      return true;
    }
    if (key === 'Escape') {
      this._cancel();
      return true;
    }
    // Handle backspace
    if (key === 'Backspace') {
      this._inputValue = this._inputValue.slice(0, -1);
      this._inputText.text = this._inputValue;
      return true;
    }
    // Handle digits only
    if (/^\d$/.test(key) && this._inputValue.length < 10) {
      this._inputValue += key;
      this._inputText.text = this._inputValue;
      return true;
    }
    return false;
  }

  private _confirm(): void {
    const value = Math.trunc(Number(this._inputValue));
    if (!Number.isFinite(value) || value <= 0) return;
    if (this._maxValue > 0 && value > this._maxValue) return;
    this.isVisible = false;
    this._root.visible = false;
    this.onConfirm?.(value);
  }

  private _cancel(): void {
    this.isVisible = false;
    this._root.visible = false;
    this.onCancel?.();
  }
}
