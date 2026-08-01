import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { WzSprite } from '../../render/WzSprite.js';
import { ScrollBar } from './ScrollBar.js';
import { Button } from '../Button.js';

// OG class: CUIUserInfoWishList (2792 bytes)
// Shows wish list items in single-column layout.
// Positioned at (parent.absLeft + 271, parent.absTop + 271) — right of main panel.

const PANEL_W = 271;
const PANEL_H = 172;

// OG Draw: item icon at x=12, y=42*i+60; name at x=51, y=42*i+31
const ITEM_ICON_X = 12;
const ITEM_NAME_X = 51;
const ROW_START_Y = 31;
const ROW_H = 42;
const VISIBLE_ROWS = 3;

const _textStyle = new TextStyle({ fill: '#AAAAAA', fontSize: 9, fontFamily: 'monospace' });

export interface WishItem {
  itemId: number;
  name: string;
  count: number;
  isCash: boolean;
}

export class UserInfoWishList {
  readonly container = new Container();
  private _loader: WzTextureLoader;
  private _bg: WzSprite | null = null;
  private _texts: Text[] = [];
  private _scrollBar: ScrollBar | null = null;
  private _scrollPos = 0;
  private _items: WishItem[] = [];
  private _btPresents: Button[] = [];

  constructor(loader: WzTextureLoader, ui: WzPackage | null) {
    this._loader = loader;
    const prop = ui?.GetItem('UIWindow2.img/UserInfo/wish') as WzProperty | null;
    if (prop) {
      const bgNode = prop.Get('backgrnd');
      if (bgNode instanceof WzCanvas) {
        this._bg = loader.Load(bgNode);
        if (this._bg) this.container.addChild(this._bg.ToPixi());
      }
      // OG: BtPresent buttons (IDs 3000, 3001, 3002) at y=45, 87, 129 (42px spacing)
      // All initially hidden — shown only for cash items
      for (let i = 0; i < 3; i++) {
        const btnNode = prop.Get('BtPresent');
        if (btnNode instanceof WzProperty) {
          const btn = Button.fromWz(loader, btnNode);
          if (btn) {
            btn.container.position.set(93, 45 + i * 42);
            btn.container.visible = false;
            this._btPresents.push(btn);
            this.container.addChild(btn.container);
          }
        }
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

  setItems(items: WishItem[]): void {
    this._items = items;
    this._rebuild();
  }

  private _rebuild(): void {
    for (const t of this._texts) this.container.removeChild(t);
    this._texts = [];

    const maxScroll = Math.max(0, this._items.length - VISIBLE_ROWS);
    if (this._scrollBar) this._scrollBar.setRange(maxScroll);

    const startIdx = this._scrollPos;
    for (let i = 0; i < VISIBLE_ROWS && startIdx + i < this._items.length; i++) {
      const item = this._items[startIdx + i];
      const y = ROW_START_Y + i * ROW_H;

      const nameStr = item.count > 1 ? `${item.name} x${item.count}` : item.name;
      const nameT = new Text({ text: nameStr, style: _textStyle });
      nameT.x = ITEM_NAME_X; nameT.y = y;
      this.container.addChild(nameT);
      this._texts.push(nameT);

      // OG: BtPresent button only shown for cash items (nItemId / 100000 == 91)
      if (i < this._btPresents.length) {
        this._btPresents[i].container.visible = item.isCash;
      }
    }
    // Hide remaining BtPresent buttons
    for (let i = this._items.length - startIdx; i < this._btPresents.length; i++) {
      this._btPresents[i].container.visible = false;
    }
  }
}
