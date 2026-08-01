import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { WzSprite } from '../../render/WzSprite.js';
import { Button } from '../Button.js';
import { ScrollBar } from './ScrollBar.js';

// OG class: CUIUserInfoExceptionList (208 bytes)
// Shows pet exception item list.
// Positioned at (parent.absLeft+270, absTop+(state!=0?196:34))

const PANEL_W = 158;
const PANEL_H = 136;

// OG Draw: item name at x=12, y=13*i+30 — 7 visible rows
const ITEM_NAME_X = 12;
const ROW_START_Y = 30;
const ROW_H = 13;
const VISIBLE_ROWS = 7;

// OG highlight colors
const COLOR_SELECTED = 0xFFDB00; // dark blue highlight — approximated as yellow for visibility
const COLOR_MOUSEOVER = 0xFFE866;

const _textStyle = new TextStyle({ fill: '#AAAAAA', fontSize: 9, fontFamily: 'monospace' });
const _textStyleSelected = new TextStyle({ fill: '#FFFFFF', fontSize: 9, fontFamily: 'monospace' });

export class UserInfoExceptionList {
  readonly container = new Container();
  private _loader: WzTextureLoader;
  private _bg: WzSprite | null = null;
  private _texts: Text[] = [];
  private _highlights: Graphics[] = [];
  private _scrollBar: ScrollBar | null = null;
  private _scrollPos = 0;
  private _items: number[] = []; // item IDs (0x7FFFFFFF = "All")
  private _selectedIndex = -1;
  private _mouseOverIndex = -1;

  // Buttons
  private _btMeso: Button | null = null;
  private _btRegist: Button | null = null;
  private _btDelete: Button | null = null;

  onRemove: ((selectedIdx: number) => void) | null = null;
  onAddAll: (() => void) | null = null;
  onOpenSearch: (() => void) | null = null;

  constructor(loader: WzTextureLoader, ui: WzPackage | null) {
    this._loader = loader;
    const prop = ui?.GetItem('UIWindow2.img/UserInfo/exception') as WzProperty | null;
    if (prop) {
      const bgNode = prop.Get('backgrnd');
      if (bgNode instanceof WzCanvas) {
        this._bg = loader.Load(bgNode);
        if (this._bg) this.container.addChild(this._bg.ToPixi());
      }
      // OG: BtMeso(0x7D1), BtRegist(0x7D2), BtDelete(0x7D3)
      const loadBtn = (name: string): Button | null => {
        const n = prop.Get(name);
        return n instanceof WzProperty ? Button.fromWz(loader, n) : null;
      };
      this._btMeso = loadBtn('BtMeso');
      this._btRegist = loadBtn('BtRegist');
      this._btDelete = loadBtn('BtDelete');
      if (this._btMeso) { this._btMeso.onClick = () => this.onAddAll?.(); this.container.addChild(this._btMeso.container); }
      if (this._btRegist) { this._btRegist.onClick = () => this.onOpenSearch?.(); this.container.addChild(this._btRegist.container); }
      if (this._btDelete) { this._btDelete.onClick = () => this.onRemove?.(this._selectedIndex); this.container.addChild(this._btDelete.container); }
    }
    if (!this._bg) {
      const g = new Graphics();
      g.rect(0, 0, PANEL_W, PANEL_H).fill({ color: '#0F0F19', alpha: 230 / 255 });
      g.rect(0, 0, PANEL_W, PANEL_H).stroke({ color: '#504632', width: 1 });
      this.container.addChild(g);
    }
    // OG: scrollbar at (8, 27, h=96)
    this._scrollBar = new ScrollBar(8, 27, 96, (pos) => { this._scrollPos = pos; this._rebuild(); });
    this.container.addChild(this._scrollBar.container);
  }

  setItems(itemIds: number[]): void {
    this._items = itemIds;
    this._selectedIndex = -1;
    this._rebuild();
  }

  handleClick(lx: number, ly: number): boolean {
    // Hit-test rows
    for (let i = 0; i < VISIBLE_ROWS; i++) {
      const rowY = ROW_START_Y + i * ROW_H;
      if (lx >= ITEM_NAME_X && lx < PANEL_W - 10 && ly >= rowY && ly < rowY + ROW_H) {
        this._selectedIndex = this._scrollPos + i;
        this._rebuild();
        return true;
      }
    }
    return false;
  }

  handleMouseMove(lx: number, ly: number): void {
    this._mouseOverIndex = -1;
    for (let i = 0; i < VISIBLE_ROWS; i++) {
      const rowY = ROW_START_Y + i * ROW_H;
      if (lx >= ITEM_NAME_X && lx < PANEL_W - 10 && ly >= rowY && ly < rowY + ROW_H) {
        this._mouseOverIndex = this._scrollPos + i;
        break;
      }
    }
    this._rebuild();
  }

  private _rebuild(): void {
    for (const t of this._texts) this.container.removeChild(t);
    for (const h of this._highlights) this.container.removeChild(h);
    this._texts = [];
    this._highlights = [];

    const maxScroll = Math.max(0, this._items.length - VISIBLE_ROWS);
    if (this._scrollBar) this._scrollBar.setRange(maxScroll);

    const startIdx = this._scrollPos;
    for (let i = 0; i < VISIBLE_ROWS && startIdx + i < this._items.length; i++) {
      const globalIdx = startIdx + i;
      const itemId = this._items[globalIdx];
      const y = ROW_START_Y + i * ROW_H;

      // OG: highlight for selected/mouseover
      if (globalIdx === this._selectedIndex || globalIdx === this._mouseOverIndex) {
        const hl = new Graphics();
        hl.rect(10, y - 2, 138, ROW_H).fill({ color: globalIdx === this._selectedIndex ? COLOR_SELECTED : COLOR_MOUSEOVER, alpha: 0.3 });
        this.container.addChild(hl);
        this._highlights.push(hl);
      }

      // OG: 0x7FFFFFFF = "All" text
      const nameStr = itemId === 0x7FFFFFFF ? 'All' : `Item ${itemId}`;
      const style = globalIdx === this._selectedIndex ? _textStyleSelected : _textStyle;
      const nameT = new Text({ text: nameStr, style });
      nameT.x = ITEM_NAME_X; nameT.y = y;
      this.container.addChild(nameT);
      this._texts.push(nameT);
    }
  }
}
