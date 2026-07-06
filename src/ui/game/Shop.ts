import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { WzSprite } from '../../render/WzSprite.js';
import { Button } from '../Button.js';

const PanelW = 480;
const PanelH = 340;
const TabW = 60;
const TabH = 20;
const ItemStartX = 12;
const ItemStartY = 52;
const ItemW = 184;
const ItemRowH = 22;
const ItemRows = 10;
const ActionX = (PanelW - 130) / 2;
const ActionY = PanelH - 44;

const _tabStyle = new TextStyle({ fill: '#DCC896', fontSize: 10, fontFamily: 'monospace' });
const _itemStyle = new TextStyle({ fill: '#DCC896', fontSize: 10, fontFamily: 'monospace' });
const _priceStyle = new TextStyle({ fill: '#B3904C', fontSize: 9, fontFamily: 'monospace' });
const _stockStyle = new TextStyle({ fill: '#969696', fontSize: 9, fontFamily: 'monospace' });
const _actionStyle = new TextStyle({ fill: '#FFFFFF', fontSize: 10, fontFamily: 'monospace' });

interface ShopItem {
  id: number;
  name: string;
  price: number;
  stock: number;
  bid: number; // Buy
}

export class Shop extends GamePanel {
  OnBuy: ((slot: number, itemId: number, count: number, price: number) => void) | null = null;
  OnSell: ((slot: number, itemId: number, count: number) => void) | null = null;
  OnRecharge: ((slot: number) => void) | null = null;
  OnClosed: (() => void) | null = null;

  private _bg: Graphics;
  private _wzBg: WzSprite | null = null;
  private _titleText: Text;
  private _buyTab = true; // true = Buy, false = false
  private _items: ShopItem[] = [];
  private _selectedIndex = -1;
  private _scrollOffset = 0;
  private _maxScroll = 0;
  private _dragging = false;
  private _dragX = 0;
  private _dragY = 0;

  private _priceText: Text;
  private _stockText: Text;
  private _descText: Text;
  private _actionBtn: Graphics;
  private _actionLabel: Text;
  private _dynamicChildren: Container[] = [];
  private _prevWheel = 0;
  private _btBuy: Button | null = null;
  private _btSell: Button | null = null;
  private _btExit: Button | null = null;
  private _btRecharge: Button | null = null;

  constructor(loader: WzTextureLoader, ui: WzPackage | null) {
    super();
    this._root.visible = false;
    this._root.x = 100;
    this._root.y = 60;

    // Load WZ background
    const shop = ui?.GetItem('UIWindow2.img/Shop') as WzProperty | null;
    if (shop) {
      const bgNode = shop.Get('backgrnd');
      if (bgNode instanceof WzCanvas) {
        this._wzBg = loader.Load(bgNode);
      }
    }

    this._bg = new Graphics();
    if (!this._wzBg) {
      this._rebuildBg();
    }
    this._root.addChild(this._bg);

    if (this._wzBg) {
      const bgSprite = this._wzBg.ToPixi();
      this._root.addChildAt(bgSprite, 0);
    }

    this._titleText = new Text({ text: 'SHOP', style: new TextStyle({ fill: '#DCC896', fontSize: 11, fontFamily: 'monospace' }) });
    this._titleText.x = 220; this._titleText.y = 5;
    this._root.addChild(this._titleText);

    this._priceText = new Text({ text: '', style: _priceStyle });
    this._priceText.x = ItemStartX + ItemW + 16; this._priceText.y = 54;
    this._root.addChild(this._priceText);

    this._stockText = new Text({ text: '', style: _stockStyle });
    this._stockText.x = ItemStartX + ItemW + 16; this._stockText.y = 72;
    this._root.addChild(this._stockText);

    this._descText = new Text({ text: '', style: new TextStyle({ fill: '#B0B0C0', fontSize: 9, fontFamily: 'monospace', wordWrap: true, wordWrapWidth: 220 }) });
    this._descText.x = ItemStartX + ItemW + 16; this._descText.y = 100;
    this._root.addChild(this._descText);

    this._actionBtn = new Graphics();
    this._actionLabel = new Text({ text: 'Buy', style: _actionStyle });
    this._rebuildActionBtn();
    this._root.addChild(this._actionBtn);
    this._root.addChild(this._actionLabel);

    // Load WZ buttons
    if (shop) {
      this._btBuy = this._loadButton(loader, shop, 'BtBuy');
      this._btSell = this._loadButton(loader, shop, 'BtSell');
      this._btExit = this._loadButton(loader, shop, 'BtExit');
      this._btRecharge = this._loadButton(loader, shop, 'BtRecharge');

      // Position buttons
      if (this._btBuy) {
        this._btBuy.container.position.set(8, PanelH - 40);
        this._btBuy.onClick = () => this._doAction('buy');
        this._root.addChild(this._btBuy.container);
      }
      if (this._btSell) {
        this._btSell.container.position.set(8 + 62, PanelH - 40);
        this._btSell.onClick = () => this._doAction('sell');
        this._root.addChild(this._btSell.container);
      }
      if (this._btRecharge) {
        this._btRecharge.container.position.set(8 + 124, PanelH - 40);
        this._btRecharge.onClick = () => this._doAction('recharge');
        this._root.addChild(this._btRecharge.container);
      }
      if (this._btExit) {
        this._btExit.container.position.set(PanelW - 62, 4);
        this._btExit.onClick = () => { this.OnClosed?.(); this.isVisible = false; };
        this._root.addChild(this._btExit.container);
      }
    }

    this._populateSamples();
  }

  private _loadButton(loader: WzTextureLoader, prop: WzProperty, name: string): Button | null {
    const btnProp = prop.Get(name);
    if (!(btnProp instanceof WzProperty)) return null;
    return Button.fromWz(loader, btnProp);
  }

  private _doAction(type: 'buy' | 'sell' | 'recharge'): void {
    if (this._selectedIndex < 0 || this._selectedIndex >= this._items.length) return;
    const item = this._items[this._selectedIndex];
    if (type === 'buy') {
      this.OnBuy?.(this._selectedIndex, item.id, 1, item.price);
    } else if (type === 'sell') {
      this.OnSell?.(this._selectedIndex, item.id, 1);
    } else if (type === 'recharge') {
      this.OnRecharge?.(this._selectedIndex);
    }
  }

  private _populateSamples(): void {
    this._items = [
      { id: 2000000, name: 'Red Potion', price: 50, stock: 500, bid: 50 },
      { id: 2000001, name: 'Orange Potion', price: 200, stock: 300, bid: 200 },
      { id: 2000002, name: 'Blue Potion', price: 200, stock: 300, bid: 200 },
      { id: 2000003, name: 'White Potion', price: 300, stock: 200, bid: 300 },
    ];
    this._recalcScroll();
  }

  LoadItems(items: ShopItem[]): void {
    this._items = items;
    this._selectedIndex = -1;
    this._recalcScroll();
    this._updateDetail();
  }

  private _recalcScroll(): void {
    const totalH = this._items.length * ItemRowH;
    const viewH = ItemRows * ItemRowH;
    this._maxScroll = Math.max(0, totalH - viewH);
    this._scrollOffset = Math.min(this._scrollOffset, this._maxScroll);
  }

  update(_dt: number): void {
    if (!this.isVisible) return;
    this._pollWheel();
    this.draw();
  }

  draw(): void {
    if (!this.isVisible) return;
    if (!this._wzBg) this._rebuildBg();
    for (const c of this._dynamicChildren) c.destroy();
    this._dynamicChildren = [];
    this._drawTabs();
    this._drawItemList();
    this._drawSelection();
    this._rebuildActionBtn();
  }

  private _drawTabs(): void {
    for (const [idx, label] of ['Buy', 'Sell'].entries()) {
      const tx = 8 + idx * (TabW + 2);
      const ty = 28;
      const isActive = (idx === 0 && this._buyTab) || (idx === 1 && !this._buyTab);
      const g = new Graphics();
      if (isActive) {
        g.rect(tx, ty, TabW, TabH).fill({ color: '#3A3450' });
        g.rect(tx, ty, TabW, 1).fill({ color: '#6A5A9A' });
      } else {
        g.rect(tx, ty, TabW, TabH).fill({ color: '#1A1A28' });
        g.rect(tx, ty, TabW, 1).fill({ color: '#504632' });
      }
      g.rect(tx, ty, 1, TabH).fill({ color: '#504632' });
      g.rect(tx + TabW - 1, ty, 1, TabH).fill({ color: '#504632' });
      this._root.addChild(g);
      this._dynamicChildren.push(g);
      const t = new Text({ text: label, style: _tabStyle });
      t.x = tx + 8; t.y = ty + 2;
      this._root.addChild(t);
      this._dynamicChildren.push(t);
    }
  }

  private _drawItemList(): void {
    const startIdx = Math.floor(this._scrollOffset / ItemRowH);
    const offsetY = this._scrollOffset % ItemRowH;
    const visibleCount = Math.min(ItemRows + 1, this._items.length - startIdx);

    for (let i = 0; i < visibleCount; i++) {
      const idx = startIdx + i;
      if (idx >= this._items.length) break;
      const item = this._items[idx];
      const ix = ItemStartX;
      const iy = ItemStartY + (i * ItemRowH) - offsetY;

      const bg = new Graphics();
      bg.rect(ix, iy, ItemW, ItemRowH).fill({ color: idx === this._selectedIndex ? '#2E2E4C' : (i % 2 === 0 ? '#13131F' : '#181828'), alpha: 0.8 });
      if (idx === this._selectedIndex) {
        bg.rect(ix, iy, ItemW, 1).fill({ color: '#6A5A9A' });
        bg.rect(ix, iy + ItemRowH - 1, ItemW, 1).fill({ color: '#6A5A9A' });
      }
      this._root.addChild(bg);
      this._dynamicChildren.push(bg);

      const t = new Text({ text: item.name, style: _itemStyle });
      t.x = ix + 4; t.y = iy + 3;
      this._root.addChild(t);
      this._dynamicChildren.push(t);

      const p = new Text({ text: `${item.price} mesos`, style: _priceStyle });
      p.x = ix + ItemW - 80; p.y = iy + 3;
      this._root.addChild(p);
      this._dynamicChildren.push(p);

      if (item.stock >= 0) {
        const s = new Text({ text: `Stock: ${item.stock}`, style: _stockStyle });
        s.x = ix + 4; s.y = iy + 12;
        this._root.addChild(s);
        this._dynamicChildren.push(s);
      }
    }
  }

  private _drawSelection(): void {
    if (this._selectedIndex < 0 || this._selectedIndex >= this._items.length) return;
    const item = this._items[this._selectedIndex];
    this._priceText.text = `Price: ${item.price} mesos`;
    this._stockText.text = `Stock: ${item.stock >= 0 ? item.stock : '∞'}`;
    this._descText.text = this._buyTab ? `NPC sells ${item.name}.` : `Sell ${item.name} to NPC.`;
  }

  private _updateDetail(): void {
    this._priceText.text = '';
    this._stockText.text = '';
    this._descText.text = '';
  }

  private _rebuildActionBtn(): void {
    this._actionBtn.clear();
    const bx = ActionX;
    const by = ActionY;
    const bw = 130;
    const bh = 26;
    this._actionBtn.rect(bx, by, bw, bh).fill({ color: '#2E2E4C' });
    this._actionBtn.rect(bx, by, bw, 1).fill({ color: '#6A5A9A' });
    this._actionBtn.rect(bx, by + bh - 1, bw, 1).fill({ color: '#46465A' });
    this._actionBtn.rect(bx, by, 1, bh).fill({ color: '#6A5A9A' });
    this._actionBtn.rect(bx + bw - 1, by, 1, bh).fill({ color: '#46465A' });
    this._actionLabel.text = this._buyTab ? 'Buy' : 'Sell';
    this._actionLabel.x = ActionX + 55;
    this._actionLabel.y = ActionY + 5;
  }

  setPosition(x: number, y: number): void {
    this._root.x = x;
    this._root.y = y;
  }

  handleMouseButton(mx: number, my: number, down: boolean): boolean {
    if (!this.isVisible) return false;

    // Check WZ buttons first
    for (const b of [this._btBuy, this._btSell, this._btExit, this._btRecharge]) {
      if (b?.handleMouseButton(mx - this._root.x, my - this._root.y, down)) return true;
    }

    const lx = mx - this._root.x;
    const ly = my - this._root.y;

    if (!down) {
      this._dragging = false;
      return true;
    }

    // Close button fallback
    if (!this._btExit && lx >= PanelW - 18 && ly < 22) { this.OnClosed?.(); this.isVisible = false; return true; }

    // tabs
    for (const [idx, label] of ['Buy', 'Sell'].entries()) {
      const tx = 8 + idx * (TabW + 2);
      if (lx >= tx && lx < tx + TabW && ly >= 28 && ly < 28 + TabH) {
        this._buyTab = label === 'Buy';
        this._selectedIndex = -1;
        this._updateDetail();
        this._scrollOffset = 0;
        return true;
      }
    }

    // item list click
    const startIdx = Math.floor(this._scrollOffset / ItemRowH);
    const offsetY = this._scrollOffset % ItemRowH;
    if (lx >= ItemStartX && lx < ItemStartX + ItemW && ly >= ItemStartY && ly < ItemStartY + ItemRows * ItemRowH) {
      const relY = ly - ItemStartY + offsetY;
      const rowIdx = Math.floor(relY / ItemRowH);
      const idx = startIdx + rowIdx;
      if (idx >= 0 && idx < this._items.length) {
        this._selectedIndex = idx;
        return true;
      }
    }

    // action button fallback
    if (!this._btBuy && lx >= ActionX && lx < ActionX + 130 && ly >= ActionY && ly < ActionY + 26) {
      this._doAction(this._buyTab ? 'buy' : 'sell');
      return true;
    }

    // panel drag
    if (ly < 22 && lx < PanelW - 18) {
      this._dragging = true;
      this._dragX = mx - this._root.x;
      this._dragY = my - this._root.y;
      return true;
    }

    return lx >= 0 && lx < PanelW && ly >= 0 && ly < PanelH;
  }

  onMouseMove(mx: number, my: number): void {
    if (this._dragging) {
      this._root.x = Math.max(0, mx - this._dragX);
      this._root.y = Math.max(0, my - this._dragY);
    }
  }

  handleWheel(_dx: number, dy: number): void {
    if (!this.isVisible) return;
    this._scrollOffset = Math.max(0, Math.min(this._maxScroll, this._scrollOffset + dy * -ItemRowH * 3));
  }

  private _pollWheel(): void {
    const w = window as any;
    const mx = w.__mouseX as number | undefined;
    const my = w.__mouseY as number | undefined;
    if (mx === undefined || my === undefined) return;
    const lx = mx - this._root.x;
    const ly = my - this._root.y;
    if (lx < 0 || lx >= PanelW || ly < 0 || ly >= PanelH) return;
    if (typeof w.__wheelDelta !== 'number') return;
    const d = w.__wheelDelta;
    if (d === this._prevWheel) return;
    this._prevWheel = d;
    this.handleWheel(0, Math.sign(d));
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.isVisible = false; return true; }
    return true;
  }

  onResize(w: number, h: number): void {
    this._root.x = Math.floor((w - PanelW) / 2);
    this._root.y = Math.floor((h - PanelH) / 2);
  }

  private _rebuildBg(): void {
    this._bg.clear();
    this._bg.rect(0, 0, PanelW, PanelH).fill({ color: '#0C0E18', alpha: 245 / 255 });
    this._bg.rect(0, 0, PanelW, PanelH).stroke({ color: '#3C4164', width: 1 });
    this._bg.rect(0, 0, PanelW, 22).fill({ color: '#0F1224' });
  }
}
