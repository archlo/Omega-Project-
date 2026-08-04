import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { Button } from '../Button.js';
import { ScrollBar } from './ScrollBar.js';

/**
 * OG: CEntrustedShopDlg — Hired Merchant (entrusted shop).
 * Decompiled from v95 IDB:
 * - OnButtonClicked (0x51E400) — owner: GoOut/Arrange/WithdrawMoney/BlackList/VisitList; visitor: buy
 * - DrawEmployee (0x51CE60) — renders shop owner sprite
 * - DrawRemainingTime (0x51E6B0) — shows remaining time at (370, 12)
 * - OnGoOut (0x51DD40) — sends ESP_GoOut (0x27)
 * - OnWithdrawMoney (0x51DE80) — sends ESP_WithdrawMoney (0x2B)
 * - OnPacket (0x520EC0) — dispatches sub-actions
 * - OnWithdrawAllResult (0x51EBA0) — withdraw all items result
 * - Draw (0x51F930) — full render
 *
 * WZ: UI/UIWindow2.img/EntrustedShop/ (backgrnd, BtCoin, BtArrange, BtGoOut, BtBlackList, BtVisitList)
 */

// Panel dimensions (OG: CWnd size from OnCreate)
const PanelW = 400;
const PanelH = 450;

// Item list area
const LIST_X = 12;
const LIST_Y = 60;
const LIST_W = 280;
const LIST_ROWS = 8;
const LIST_ROW_H = 28;

// Money display position
const MONEY_X = 16;
const MONEY_Y = 36;

// Remaining time position (OG: DrawRemainingTime 0x51E6B0 — DrawRectangle at 370,12)
const TIME_X = 370;
const TIME_Y = 12;
const TIME_W = 120;
const TIME_H = 12;

// Button IDs (OG: OnButtonClicked 0x51E400)
const BTN_GO_OUT = 0x3F2;       // 1010
const BTN_ARRANGE = 0x3F7;      // 1015
const BTN_WITHDRAW_MONEY = 0x3F8; // 1016
const BTN_BLACK_LIST = 0x3F9;   // 1017
const BTN_VISIT_LIST = 0x3FA;   // 1018

// OG: max merchant duration = 24 hours (1440 minutes)
const MAX_DURATION_MIN = 1439;

const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 11, fontFamily: 'monospace' });
const _itemStyle = new TextStyle({ fill: '#FFFFFF', fontSize: 9, fontFamily: 'monospace' });
const _priceStyle = new TextStyle({ fill: '#FFD700', fontSize: 9, fontFamily: 'monospace' });
const _moneyStyle = new TextStyle({ fill: '#FFD700', fontSize: 10, fontFamily: 'monospace' });
const _timeStyle = new TextStyle({ fill: '#CCCCCC', fontSize: 9, fontFamily: 'monospace' });
const _labelStyle = new TextStyle({ fill: '#AAA', fontSize: 9, fontFamily: 'monospace' });

/** Shop item in the entrusted shop. */
export interface EntrustedShopItem {
  index: number;
  itemId: number;
  quantity: number;
  price: number;
  name: string;
  icon: WzSprite | null;
}

export class EntrustedShop extends GamePanel {
  // Callbacks (OG: OnGoOut 0x51DD40, OnWithdrawMoney 0x51DE80)
  OnClose: (() => void) | null = null;
  OnWithdrawMoney: (() => void) | null = null;
  OnArrange: (() => void) | null = null;
  OnBlackList: (() => void) | null = null;
  OnVisitList: (() => void) | null = null;
  OnBuyItem: ((index: number, count: number) => void) | null = null;

  // State
  private _isOwner = false;
  private _money = 0;
  private _items: EntrustedShopItem[] = [];
  private _selectedItem = -1;
  private _scrollOffset = 0;
  private _enterTime = 0;  // OG: m_tEnter
  private _elapsedMs = 0;  // OG: m_tPass

  // UI
  private _bg: Graphics;
  private _dynamicChildren: Container[] = [];
  private _allButtons: Button[] = [];
  private _scrollBar: ScrollBar | null = null;

  // WZ buttons
  private _btGoOut: Button | null = null;
  private _btArrange: Button | null = null;
  private _btCoin: Button | null = null;
  private _btBlackList: Button | null = null;
  private _btVisitList: Button | null = null;

  // Resolvers
  private _itemNameOf: ((id: number) => string) | null = null;
  private _itemIconOf: ((id: number) => WzSprite | null) | null = null;

  constructor(loader: WzTextureLoader, ui: WzPackage | null) {
    super();
    this.isVisible = false;

    this._bg = new Graphics();
    this._rebuildBg();
    this._root.addChild(this._bg);

    // Load WZ background (OG: "UI/UIWindow2.img/EntrustedShop/backgrnd")
    const es = ui?.GetItem('UIWindow2.img/EntrustedShop') as WzProperty | null;
    if (es) {
      const bgNode = es.Get('backgrnd');
      if (bgNode instanceof WzCanvas) {
        const bgSprite = loader.Load(bgNode)?.ToPixi();
        if (bgSprite) this._root.addChildAt(bgSprite, 0);
      }
    }

    // Create buttons (OG: CLayoutMan::AddButton)
    this._btGoOut = this._loadButton(loader, es, 'BtGoOut');
    this._btArrange = this._loadButton(loader, es, 'BtArrange');
    this._btCoin = this._loadButton(loader, es, 'BtCoin');
    this._btBlackList = this._loadButton(loader, es, 'BtBlackList');
    this._btVisitList = this._loadButton(loader, es, 'BtVisitList');

    // Position buttons (OG layout)
    if (this._btGoOut) {
      this._btGoOut.container.position.set(PanelW - 80, PanelH - 36);
      this._btGoOut.onClick = () => this.OnClose?.();
      this._root.addChild(this._btGoOut.container);
      this._allButtons.push(this._btGoOut);
    }
    if (this._btArrange) {
      this._btArrange.container.position.set(16, PanelH - 36);
      this._btArrange.onClick = () => this.OnArrange?.();
      this._root.addChild(this._btArrange.container);
      this._allButtons.push(this._btArrange);
    }
    if (this._btCoin) {
      this._btCoin.container.position.set(100, PanelH - 36);
      this._btCoin.onClick = () => this.OnWithdrawMoney?.();
      this._root.addChild(this._btCoin.container);
      this._allButtons.push(this._btCoin);
    }
    if (this._btBlackList) {
      this._btBlackList.container.position.set(184, PanelH - 36);
      this._btBlackList.onClick = () => this.OnBlackList?.();
      this._root.addChild(this._btBlackList.container);
      this._allButtons.push(this._btBlackList);
    }
    if (this._btVisitList) {
      this._btVisitList.container.position.set(268, PanelH - 36);
      this._btVisitList.onClick = () => this.OnVisitList?.();
      this._root.addChild(this._btVisitList.container);
      this._allButtons.push(this._btVisitList);
    }

    // Scrollbar
    this._scrollBar = new ScrollBar(
      LIST_X + LIST_W + 2,
      LIST_Y,
      LIST_ROWS * LIST_ROW_H,
      (pos: number) => { this._scrollOffset = pos; },
    );
    this._root.addChild(this._scrollBar.container);
  }

  /** Set name/icon resolvers. */
  setResolvers(
    itemNameOf: (id: number) => string,
    itemIconOf: (id: number) => WzSprite | null,
  ): void {
    this._itemNameOf = itemNameOf;
    this._itemIconOf = itemIconOf;
  }

  /**
   * OG: CEntrustedShopDlg::Open — open the shop.
   * @param isOwner — true if the player owns this shop
   * @param money — accumulated mesos (owner only)
   * @param items — shop items
   * @param enterTime — timestamp when the shop was placed (for remaining time calc)
   */
  Open(isOwner: boolean, money: number, items: EntrustedShopItem[], enterTime?: number): void {
    this._isOwner = isOwner;
    this._money = money;
    this._items = [...items];
    this._selectedItem = -1;
    this._scrollOffset = 0;
    this._enterTime = enterTime ?? Date.now();
    this._elapsedMs = 0;
    this._updateScrollRange();
    this.isVisible = true;

    // OG: owner sees Arrange/Coin/BlackList/VisitList; visitor sees only GoOut
    if (this._btArrange) this._btArrange.container.visible = isOwner;
    if (this._btCoin) this._btCoin.container.visible = isOwner;
    if (this._btBlackList) this._btBlackList.container.visible = isOwner;
    if (this._btVisitList) this._btVisitList.container.visible = isOwner;
  }

  /** Update money display (owner: accumulated mesos). */
  setMoney(money: number): void {
    this._money = money;
  }

  /** Update items (from server refresh). */
  setItems(items: EntrustedShopItem[]): void {
    this._items = [...items];
    this._updateScrollRange();
  }

  private _updateScrollRange(): void {
    const max = Math.max(0, this._items.length - LIST_ROWS);
    this._scrollBar?.setRange(max + 1);
  }

  private _loadButton(loader: WzTextureLoader, prop: WzProperty | null, name: string): Button | null {
    const pr = prop?.Get(name);
    if (!(pr instanceof WzProperty)) return null;
    const b = Button.fromWz(loader, pr);
    return b;
  }

  private _rebuildBg(): void {
    this._bg.clear();
    this._bg.rect(0, 0, PanelW, PanelH).fill({ color: '#0C0E18', alpha: 245 / 255 });
    this._bg.rect(0, 0, PanelW, PanelH).stroke({ color: '#3C4164', width: 1 });
    this._bg.rect(0, 0, PanelW, 22).fill({ color: '#0F1224' });
  }

  // --- Drawing ---

  update(dt: number): void {
    if (!this.isVisible) return;
    this._elapsedMs += dt;
    this.draw();
  }

  draw(): void {
    if (!this.isVisible) return;
    for (const c of this._dynamicChildren) c.destroy();
    this._dynamicChildren = [];
    this._rebuildBg();

    // Title
    const title = new Text({ text: 'Entrusted Shop', style: _titleStyle });
    title.x = 8; title.y = 3;
    this._root.addChild(title);
    this._dynamicChildren.push(title);

    // Money display (owner only)
    if (this._isOwner) {
      const moneyText = new Text({ text: `Mesos: ${this._money.toLocaleString()}`, style: _moneyStyle });
      moneyText.x = MONEY_X; moneyText.y = MONEY_Y;
      this._root.addChild(moneyText);
      this._dynamicChildren.push(moneyText);
    }

    // OG: DrawRemainingTime (0x51E6B0) — remaining time at (370, 12)
    this._drawRemainingTime();

    // Item list
    this._drawItemList();
  }

  /** OG: DrawRemainingTime (0x51E6B0) — shows remaining merchant duration.
   * OG formula: 1439 - (m_tPass - m_tEnter + timeGetTime()) / 60000
   * Renders at (370, 12) with size (120, 12). */
  private _drawRemainingTime(): void {
    const elapsedMin = Math.floor(this._elapsedMs / 60000);
    const remainingMin = Math.max(0, MAX_DURATION_MIN - elapsedMin);
    const hours = Math.floor(remainingMin / 60);
    const mins = remainingMin % 60;

    // Background rect (OG: DrawRectangle at 370,12,120,12)
    const bg = new Graphics();
    bg.rect(TIME_X, TIME_Y, TIME_W, TIME_H).fill({ color: '#1a1a2e' });
    this._root.addChild(bg);
    this._dynamicChildren.push(bg);

    // Time text (OG: StringPool 0xDB0 format string "%d:%02d")
    const timeText = new Text({ text: `${hours}:${mins.toString().padStart(2, '0')}`, style: _timeStyle });
    timeText.x = TIME_X + 4; timeText.y = TIME_Y + 1;
    this._root.addChild(timeText);
    this._dynamicChildren.push(timeText);
  }

  /** OG: CEntrustedShopDlg::Draw — item list rendering. */
  private _drawItemList(): void {
    const startIdx = this._scrollOffset;
    const visibleCount = Math.min(LIST_ROWS, this._items.length - startIdx);

    for (let i = 0; i < visibleCount; i++) {
      const idx = startIdx + i;
      const item = this._items[idx];
      const ix = LIST_X;
      const iy = LIST_Y + i * LIST_ROW_H;
      const isSelected = idx === this._selectedItem;

      // Selection highlight
      if (isSelected) {
        const sel = new Graphics();
        sel.rect(ix, iy, LIST_W, LIST_ROW_H).fill({ color: '#2E2E4C' });
        this._root.addChild(sel);
        this._dynamicChildren.push(sel);
      }

      // Item icon
      if (item.icon) {
        const icon = item.icon.ToPixi();
        icon.x = ix + 2; icon.y = iy + 2;
        this._root.addChild(icon);
        this._dynamicChildren.push(icon);
      }

      // Item name
      const nameText = new Text({ text: item.name, style: _itemStyle });
      nameText.x = ix + 24; nameText.y = iy + 3;
      this._root.addChild(nameText);
      this._dynamicChildren.push(nameText);

      // Quantity
      if (item.quantity > 1) {
        const qtyText = new Text({ text: `x${item.quantity}`, style: _itemStyle });
        qtyText.x = ix + LIST_W - 80; qtyText.y = iy + 3;
        this._root.addChild(qtyText);
        this._dynamicChildren.push(qtyText);
      }

      // Price
      const priceText = new Text({ text: `${item.price.toLocaleString()} mesos`, style: _priceStyle });
      priceText.x = ix + LIST_W - 60; priceText.y = iy + 3;
      this._root.addChild(priceText);
      this._dynamicChildren.push(priceText);
    }
  }

  // --- Input ---

  handleMouseButton(mx: number, my: number, down: boolean): boolean {
    if (!this.isVisible) return false;

    // WZ buttons first
    for (const b of this._allButtons) {
      if (b.handleMouseButton(mx - this._root.x, my - this._root.y, down)) return true;
    }

    const lx = mx - this._root.x;
    const ly = my - this._root.y;

    if (!down) return false;

    // Item list click
    if (lx >= LIST_X && lx < LIST_X + LIST_W && ly >= LIST_Y && ly < LIST_Y + LIST_ROWS * LIST_ROW_H) {
      const rowIdx = Math.floor((ly - LIST_Y) / LIST_ROW_H) + this._scrollOffset;
      if (rowIdx >= 0 && rowIdx < this._items.length) {
        this._selectedItem = rowIdx;
        // Visitor: double-click to buy
        if (!this._isOwner) {
          const item = this._items[rowIdx];
          this.OnBuyItem?.(item.index, 1);
        }
        return true;
      }
    }

    return lx >= 0 && lx < PanelW && ly >= 0 && ly < PanelH;
  }

  onMouseMove(_mx: number, _my: number): void {
    // Drag handled by GamePanel base
  }

  handleWheel(_dx: number, dy: number): void {
    if (!this.isVisible || !this._scrollBar) return;
    this._scrollBar.pos = Math.max(0, Math.min(this._scrollBar.pos + (dy > 0 ? 1 : -1), this._items.length - LIST_ROWS));
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') {
      this.OnClose?.();
      this.isVisible = false;
      return true;
    }
    return true;
  }

  onResize(w: number, h: number): void {
    this._root.x = Math.floor((w - PanelW) / 2);
    this._root.y = Math.floor((h - PanelH) / 2);
  }
}
