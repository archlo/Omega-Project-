import { Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';

// OG class: CSlideNotice (decompile/780530.c..787BD5.c) — the scrolling
// marquee/ticker notice banner, triggered by CWvsContext::OnBroadcastMsg
// case 4. Ninetieth-pass finding flagged this as a real, small, cosmetic
// gap. This is the Hundred-and-twenty-fourth pass's implementation.
//
// OG renders the text on a WZ-loaded canvas with IWzGr2DLayer WrapClip
// scrolling; this PixiJS port uses plain Text with PositionX animation
// and a dark background bar.

const BAR_H = 23;
const SCROLL_SPEED = 80; // px/s — matches OG feel

export class SlideNotice extends GamePanel {
  private _bg: Graphics;
  private _text: Text;
  private _textOffsetX = 0;
  private _textFullWidth = 0;
  private _active = false;

  constructor() {
    super();
    this._root.y = 0;

    this._bg = new Graphics();
    this._root.addChild(this._bg);

    this._text = new Text({
      text: '',
      style: new TextStyle({ fill: '#FFCC00', fontSize: 13, fontFamily: 'tahoma, sans-serif' }),
    });
    this._text.y = (BAR_H - 13) / 2;
    this._root.addChild(this._text);
  }

  show(text: string, screenW: number): void {
    this._text.text = text;
    this._textFullWidth = this._text.width + 800;
    this._textOffsetX = screenW;
    this._active = true;
    this.isVisible = true;

    this._bg.clear();
    this._bg.rect(0, 0, screenW, BAR_H).fill({ color: '#0C0E18', alpha: 200 / 255 });
    this._bg.rect(0, 0, screenW, BAR_H).stroke({ color: '#3C4164', width: 1 });
  }

  hide(): void {
    this._active = false;
    this.isVisible = false;
    this._text.text = '';
  }

  update(dt: number): void {
    if (!this._active) return;
    this._textOffsetX -= SCROLL_SPEED * dt;
    if (this._textOffsetX < -this._textFullWidth) {
      this._textOffsetX += this._textFullWidth;
    }
    this._text.x = this._textOffsetX;
  }
}
