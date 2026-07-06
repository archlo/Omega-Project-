import { Container, Graphics, Text, TextStyle } from 'pixi.js';

export interface DeleteConfirmResult {
  confirmed: boolean;
  secondaryPassword: string;
}

export class DeleteConfirmOverlay {
  readonly container = new Container();
  private _resolve: ((result: DeleteConfirmResult) => void) | null = null;
  private _spw = '';
  private _spwText: Text;
  private _statusText: Text;
  private _promptText: Text;

  constructor() {
    const bg = new Graphics();
    bg.rect(0, 0, 800, 600).fill({ color: 0x000000, alpha: 180 / 255 });
    this.container.addChild(bg);

    const dialog = new Graphics();
    dialog.roundRect(200, 200, 400, 200, 8).fill({ color: 0x1a1a2e }).stroke({ width: 1, color: 0x446688 });
    this.container.addChild(dialog);

    this._promptText = new Text({
      text: 'Enter your Secondary Password (PIC) to delete this character.',
      style: new TextStyle({ fill: 0xCCCCCC, fontSize: 13, fontFamily: 'monospace', wordWrap: true, wordWrapWidth: 360 }),
    });
    this._promptText.position.set(220, 220);
    this.container.addChild(this._promptText);

    const spwLabel = new Text({
      text: 'PIC:',
      style: new TextStyle({ fill: 0xAAAAAA, fontSize: 14, fontFamily: 'monospace' }),
    });
    spwLabel.position.set(220, 270);
    this.container.addChild(spwLabel);

    this._spwText = new Text({
      text: '',
      style: new TextStyle({ fill: 0xFFFFFF, fontSize: 14, fontFamily: 'monospace', letterSpacing: 4 }),
    });
    this._spwText.position.set(270, 270);
    this.container.addChild(this._spwText);

    this._statusText = new Text({
      text: '',
      style: new TextStyle({ fill: 0xFF6666, fontSize: 11, fontFamily: 'monospace' }),
    });
    this._statusText.position.set(220, 300);
    this.container.addChild(this._statusText);

    this._makeButton('Confirm', 240, 340, 100, 32, () => this._confirm());
    this._makeButton('Cancel', 460, 340, 100, 32, () => this._cancel());
  }

  show(): Promise<DeleteConfirmResult> {
    this._spw = '';
    this._spwText.text = '';
    this._statusText.text = '';
    return new Promise((resolve) => {
      this._resolve = resolve;
    });
  }

  onKeyPress(key: string): boolean {
    if (!this._resolve) return false;
    if (key === 'Escape') { this._cancel(); return true; }
    if (key === 'Enter') { this._confirm(); return true; }
    if (key === 'Backspace') { this._spw = this._spw.slice(0, -1); this._spwText.text = '*'.repeat(this._spw.length); return true; }
    if (key.length === 1 && this._spw.length < 16) { this._spw += key; this._spwText.text = '*'.repeat(this._spw.length); return true; }
    return false;
  }

  onMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this._resolve) return false;
    if (!down) return true;
    this.container.emit('click-btn', x, y);
    return true;
  }

  private _confirm(): void {
    const r = this._resolve;
    this._resolve = null;
    r?.({ confirmed: true, secondaryPassword: this._spw });
  }

  private _cancel(): void {
    const r = this._resolve;
    this._resolve = null;
    r?.({ confirmed: false, secondaryPassword: '' });
  }

  private _makeButton(label: string, x: number, y: number, w: number, h: number, onClick: () => void): void {
    const btn = new Graphics();
    btn.roundRect(0, 0, w, h, 4).fill({ color: 0x225577 }).stroke({ width: 1, color: 0x6699CC });
    const text = new Text({ text: label, style: new TextStyle({ fill: 0xFFFFFF, fontSize: 13, fontFamily: 'monospace' }) });
    text.anchor.set(0.5);
    text.position.set(w / 2, h / 2);
    btn.addChild(text);
    btn.position.set(x, y);
    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    btn.on('pointerdown', onClick);
    this.container.addChild(btn);
  }
}
