import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { WzSprite } from '../../render/WzSprite.js';
import { ScrollBar } from './ScrollBar.js';

// OG class: CUIUserInfoDetail (164 bytes)
// Shows equipped items in 2-column layout.
// Positioned at (parent.absLeft + 271, parent.absTop) — right of main panel.

const PANEL_W = 271;
const PANEL_H = 172;

// OG Draw: left column — item icon at x=12, y=42*i+60; name at x=51, y=42*i+31; detail at x=87, y=42*i+48
// OG Draw: right column — item icon at x=183, y=42*i+60; name at x=222, y=42*i+31; detail at x=258, y=42*i+48
const COL_LEFT_ICON_X = 12;
const COL_LEFT_NAME_X = 51;
const COL_LEFT_INFO_X = 87;
const COL_RIGHT_ICON_X = 183;
const COL_RIGHT_NAME_X = 222;
const COL_RIGHT_INFO_X = 258;
const ROW_START_Y = 31;
const ROW_H = 42;
const VISIBLE_ROWS = 3;

const _textStyle = new TextStyle({ fill: '#AAAAAA', fontSize: 9, fontFamily: 'monospace' });

export interface DetailItem {
  itemId: number;
  name: string;
  info: string;
}

export class UserInfoDetail {
  readonly container = new Container();
  private _loader: WzTextureLoader;
  private _bg: WzSprite | null = null;
  private _texts: Text[] = [];
  private _scrollBar: ScrollBar | null = null;
  private _scrollPos = 0;
  private _items: DetailItem[] = [];

  constructor(loader: WzTextureLoader, ui: WzPackage | null) {
    this._loader = loader;
    const prop = ui?.GetItem('UIWindow2.img/UserInfo/item') as WzProperty | null;
    if (prop) {
      const bgNode = prop.Get('backgrnd');
      if (bgNode instanceof WzCanvas) {
        this._bg = loader.Load(bgNode);
        if (this._bg) this.container.addChild(this._bg.ToPixi());
      }
    }
    if (!this._bg) {
      const g = new Graphics();
      g.rect(0, 0, PANEL_W, PANEL_H).fill({ color: '#0F0F19', alpha: 230 / 255 });
      g.rect(0, 0, PANEL_W, PANEL_H).stroke({ color: '#504632', width: 1 });
      this.container.addChild(g);
    }
    // OG: scrollbar at (8, 151, h=121) — IDA CreateCtrl_2(ctrl, this, 1000, 1, 8, 151, 26, 121)
    this._scrollBar = new ScrollBar(8, 151, 121, (pos) => { this._scrollPos = pos; this._rebuild(); });
    this.container.addChild(this._scrollBar.container);
  }

  // OG: left column = chair items, right column = wish items
  setItems(chairItems: DetailItem[], wishItems: DetailItem[]): void {
    // Interleave for rendering: [chair0, wish0, chair1, wish1, ...]
    this._items = [];
    const maxLen = Math.max(chairItems.length, wishItems.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < chairItems.length) this._items.push(chairItems[i]);
      if (i < wishItems.length) this._items.push(wishItems[i]);
    }
    this._rebuild();
  }

  private _rebuild(): void {
    for (const t of this._texts) this.container.removeChild(t);
    this._texts = [];

    const maxScroll = Math.max(0, Math.ceil(this._items.length / 2) - VISIBLE_ROWS);
    if (this._scrollBar) this._scrollBar.setRange(maxScroll + 1);

    const startRow = this._scrollPos;
    for (let row = 0; row < VISIBLE_ROWS; row++) {
      const idx = (startRow + row) * 2;
      for (let col = 0; col < 2; col++) {
        const item = this._items[idx + col];
        if (!item) continue;
        const nameX = col === 0 ? COL_LEFT_NAME_X : COL_RIGHT_NAME_X;
        const infoX = col === 0 ? COL_LEFT_INFO_X : COL_RIGHT_INFO_X;
        const y = ROW_START_Y + row * ROW_H;

        const nameT = new Text({ text: item.name, style: _textStyle });
        nameT.x = nameX; nameT.y = y;
        this.container.addChild(nameT);
        this._texts.push(nameT);

        const infoT = new Text({ text: item.info, style: _textStyle });
        infoT.x = infoX; infoT.y = y + 17;
        this.container.addChild(infoT);
        this._texts.push(infoT);
      }
    }
  }
}
