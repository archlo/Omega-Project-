import { Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';

// OG class: CSlideNotice (decompile/780530.c..787BD5.c) — the scrolling
// marquee/ticker notice banner, triggered by CWvsContext::OnBroadcastMsg
// case 4.
//
// OG (verified from the IDB this session):
// - ctor @0x780530: CWnd::CreateWnd(-512, 0, 1024, 0x17, 10, 1, nullptr,
//   1, Origin_CT) — a 1024x23 window at the top, Center-Top origin.
// - OnCreate @0x77FBE0: raw_DrawRectangle(0, 0, 1024, 768, 0x80000000)
//   on the window canvas — black at alpha 0x80 (128/255), clipped to the
//   23px bar, so the bar is dimmed ~50%, NOT the whole screen.
// - SetMsg @0x787070: creates m_pLayerSlide (color 0xFFFFFFFF, origin and
//   overlay = window layer, z=1), loads FONT_BASIC_YELLOW, calc text width;
//   if width > 0 → canvas (textWidth x 23), DrawTextA at (0, 5) with
//   FONT_BASIC_YELLOW (0xFFFFFF20, height 12, non-bold), InsertCanvas,
//   RelMove(+1024, 0) (start off right edge), RelMove(-1-textWidth, 0),
//   WrapClip(-textWidth, 0, textWidth+1024, 0) (continuous right→left
//   marquee); if width == 0 → Destroy the singleton (hide).
//
// This PixiJS port: 23px bar dimmed at the OG 0x502 alpha (no stroke — OG
// draws only the rect), FONT_BASIC_YELLOW text #FFFF20 / 12px / non-bold at
// y=5, right→left wrap marquee at a constant px/s.

const BAR_H = 23; // OG 0x17
const SCROLL_SPEED = 80; // px/s — matches OG feel
const TEXT_Y = 5; // OG DrawTextA(0, 5)
const BAR_FILL = 0x000000; // OG 0x80000000 → RGB black
const BAR_ALPHA = 0x80 / 0xff; // OG alpha byte 0x80 ≈ 0.502
const TEXT_FILL = '#FFFF20'; // OG FONT_BASIC_YELLOW 0xFFFFFF20
const TEXT_SIZE = 12; // OG FONT_BASIC_YELLOW height 12

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
      style: new TextStyle({ fill: TEXT_FILL, fontSize: TEXT_SIZE, fontFamily: 'tahoma, sans-serif' }),
    });
    this._text.y = TEXT_Y;
    this._root.addChild(this._text);
  }

  show(text: string, screenW: number): void {
    this._text.text = text;
    this._textFullWidth = this._text.width + 800;
    this._textOffsetX = screenW;
    this._active = true;
    this.isVisible = true;

    // OG: OnCreate raw_DrawRectangle — black at alpha 0x80 over the bar,
    // no stroke
    this._bg.clear();
    this._bg.rect(0, 0, screenW, BAR_H).fill({ color: BAR_FILL, alpha: BAR_ALPHA });
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
