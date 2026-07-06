import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { WzSprite } from '../render/WzSprite.js';

export class TextField {
  position = { x: 0, y: 0 };
  width = 160;
  height = 24;
  private _text = '';
  set text(v: string) {
    this._text = v.slice(0, this.maxLength);
    this._updateDisplay();
  }
  get text(): string { return this._text; }
  maxLength = 16;
  isPassword = false;
  drawBackground = true;

  private _isFocused = false;
  get isFocused(): boolean { return this._isFocused; }
  set isFocused(v: boolean) {
    this._isFocused = v;
    this._cursor.visible = v;
    this.drawBg();
  }
  /** Optional WZ background sprite, rendered when the field is empty. */
  background: WzSprite | null = null;
  container: Container;

  private _bg: Graphics;
  private _bgSprite: import('pixi.js').Sprite | null = null;
  private _textNode: Text;
  private _cursor: Graphics;
  private _textColor = 0xFFFFFF;
  private _caretColor = 0xFFFFFF;

  constructor(background?: WzSprite | null) {
    this.background = background ?? null;
    this.container = new Container();
    this._bg = new Graphics();
    this._textNode = new Text({
      text: '',
      style: new TextStyle({ fill: 0xFFFFFF, fontSize: 12, fontFamily: 'monospace' }),
    });
    this._textNode.position.set(4, 4);
    this._cursor = new Graphics();
    this._cursor.visible = false;
    this.container.addChild(this._bg);
    if (this.background) {
      this._bgSprite = this.background.ToPixi();
      this.container.addChildAt(this._bgSprite, 0);
      this.width = this.background.Width;
      this.height = this.background.Height;
    }
    this.container.addChild(this._textNode);
    this.container.addChild(this._cursor);
    this.drawBg();
  }

  get bounds() {
    return { x: this.position.x, y: this.position.y, width: this.width, height: this.height };
  }

  set textColor(v: number) {
    this._textColor = v;
    (this._textNode.style as TextStyle).fill = v;
  }
  get textColor(): number { return this._textColor; }

  set caretColor(v: number) { this._caretColor = v; }
  get caretColor(): number { return this._caretColor; }

  setPosition(x: number, y: number): void {
    this.position.x = x;
    this.position.y = y;
    this.container.position.set(x, y);
  }

  onTextInput(character: string): void {
    if (!this.isFocused) return;
    if (character.length > 0) {
      this.text = this.text + character;
    }
  }

  onKeyPress(key: string): boolean {
    if (!this.isFocused) return false;
    if (key === 'Backspace') {
      this.text = this.text.slice(0, -1);
      return true;
    }
    return false;
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!down) return false;
    const b = this.bounds;
    this.isFocused = x >= b.x && x < b.x + b.width && y >= b.y && y < b.y + b.height;
    return this._isFocused;
  }

  private _updateDisplay(): void {
    const display = this.isPassword ? '•'.repeat(this.text.length) : this.text;
    this._textNode.text = display;
    if (this._bgSprite) {
      this._bgSprite.visible = this.text.length === 0;
    }
    this._updateCursorPos();
  }

  private _updateCursorPos(): void {
    this._cursor.position.set(4 + this._textNode.width + 2, 4);
  }

  drawBg(): void {
    const g = this._bg;
    g.clear();
    const cursorH = this.height - 8;
    this._updateCursorPos();
    this._cursor.clear();
    this._cursor.rect(0, 0, 1, cursorH).fill({ color: this._caretColor });

    if (this.background || !this.drawBackground) {
      // WZ art or transparent mode — no fill box
      return;
    }
    g.rect(0, 0, this.width, this.height).fill({ color: this.isFocused ? 0x1a3a5a : 0x0a1a2a });
    g.rect(0, 0, this.width, this.height).stroke({ width: 1, color: this.isFocused ? 0x88CCFF : 0x446688 });
  }
}
