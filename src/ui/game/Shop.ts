import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { WzSprite } from '../../render/WzSprite.js';
import { Button } from '../Button.js';
import { ScrollBar } from './ScrollBar.js';

/**
 * OG: CShopDlg — NPC shop dialog.
 * Decompiled from v95 IDB (OnCreate 0x6E7540, SetShopDlg 0x6EAB00,
 * OnButtonClicked 0x6EB650, Draw 0x6E9610, DrawBuyItem 0x6E8600,
 * DrawSellItem 0x6E56F0, DrawMoney 0x6E6FE0).
 *
 * WZ: UI/UIWindow2.img/Shop/ (backgrnd, BtExit, BtBuy, BtSell, tab/*)
 */

// --- OG constants from CShopDlg::OnCreate (0x6E7540) ---
// Tab control: CreateCtrl_2(this, 1002, 8, 10, 91, 222, 19, &paramTab)
const TAB_X = 8;
const TAB_Y = 10;
const TAB_W = 91;
const TAB_H = 222;
const TAB_ITEM_H = 19;

// Buy item list area (from DrawBuyItem 0x6E8600)
const BUY_LIST_X = 8;
const BUY_LIST_Y = 32;
const BUY_LIST_W = 91;
const BUY_LIST_ROWS = 10;
const BUY_ROW_H = 22;

// Sell item list area (from DrawSellItem 0x6E56F0)
const SELL_LIST_X = 8;
const SELL_LIST_Y = 32;
const SELL_LIST_W = 91;
const SELL_LIST_ROWS = 10;
const SELL_ROW_H = 22;

// Detail area (right side)
const DETAIL_X = 110;
const DETAIL_Y = 32;
const DETAIL_W = 170;

// Money display (from DrawMoney 0x6E6FE0)
const MONEY_X = 110;
const MONEY_Y = 230;

// Button IDs from OnButtonClicked (0x6EB650)
const BTN_EXIT = 2;
const BTN_BUY = 1000;  // 0x3E8
const BTN_SELL = 1001;  // 0x3E9
const BTN_RECHARGE_BASE = 2000;  // 0x7D0–0x7D4

// Recharge item prefixes (itemId / 10000)
const PREFIX_THROW_ARROW = 207;
const PREFIX_BULLET = 233;

// Sell tab inventory type mapping (from SetSellItems 0x6E9790)
// OG: m_pTabSell->m_nCurTab maps to inventory type:
// 0→Equip(1), 1→Use(2), 2→Setup(4), 3→Etc(3), 4→Cash(5)
const SELL_TAB_TO_INVTYPE = [1, 2, 4, 3, 5];

/** Shop item from server packet (SetShopDlg 0x6EAB00). */
export interface ShopItem {
  itemId: number;
  price: number;
  discountRate: number;
  tokenId: number;
  tokenPrice: number;
  itemPeriod: number;
  levelLimited: number;
  quantity: number;
  maxPerSlot: number;
  unitPrice: number;  // for throw arrows/bullets
  name: string;
  icon: WzSprite | null;
  stock: number;  // -1 = unlimited
}

/** Player inventory item for sell tab. */
export interface SellItem {
  slot: number;
  itemId: number;
  quantity: number;
  name: string;
  icon: WzSprite | null;
}

const _tabStyle = new TextStyle({ fill: '#DCC896', fontSize: 10, fontFamily: 'monospace' });
const _itemStyle = new TextStyle({ fill: '#DCC896', fontSize: 10, fontFamily: 'monospace' });
const _priceStyle = new TextStyle({ fill: '#B3904C', fontSize: 9, fontFamily: 'monospace' });
const _stockStyle = new TextStyle({ fill: '#969696', fontSize: 9, fontFamily: 'monospace' });
const _moneyStyle = new TextStyle({ fill: '#FFD700', fontSize: 10, fontFamily: 'monospace' });

export class Shop extends GamePanel {
  // Callbacks
  OnBuy: ((shopSlot: number, itemId: number, count: number, price: number) => void) | null = null;
  OnSell: ((invSlot: number, itemId: number, count: number) => void) | null = null;
  OnRecharge: ((invSlot: number) => void) | null = null;
  OnClose: (() => void) | null = null;

  // OG: CShopDlg members
  private _npcTemplateId = 0;
  private _buyItems: ShopItem[] = [];
  private _rechargeItems: ShopItem[] = [];
  private _recommendedItems: ShopItem[] = [];
  private _recommendedIndices: number[] = [];
  private _sellItems: SellItem[] = [];

  // Tab state (OG: m_pTabBuy / m_pTabSell)
  private _activeTab = 0;  // 0=Buy, 1=Recommended, 2=Sell
  private _buySelected = -1;  // OG: m_nBuySelected
  private _sellSelected = -1;  // OG: m_nSellSelected
  private _buyScrollOffset = 0;
  private _sellScrollOffset = 0;

  // Meso display
  private _meso = 0;

  // UI elements
  private _bg: Graphics;
  private _wzBg: WzSprite | null = null;
  private _dynamicChildren: Container[] = [];
  private _prevWheel = 0;

  // WZ buttons
  private _btExit: Button | null = null;
  private _btBuy: Button | null = null;
  private _btSell: Button | null = null;

  // Scrollbars
  private _buyScrollBar: ScrollBar | null = null;
  private _sellScrollBar: ScrollBar | null = null;

  // WZ assets
  private _canvasSelect: WzSprite | null = null;  // OG: m_pCanvasSelect
  private _canvasMeso: WzSprite | null = null;    // OG: m_pCanvasMeso

  // Resolvers
  private _itemNameOf: ((id: number) => string) | null = null;
  private _itemIconOf: ((id: number) => WzSprite | null) | null = null;

  constructor(loader: WzTextureLoader, ui: WzPackage | null) {
    super();
    this._root.visible = false;

    // Load WZ background (OG: "UI/UIWindow2.img/Shop/backgrnd")
    const shop = ui?.GetItem('UIWindow2.img/Shop') as WzProperty | null;
    if (shop) {
      const bgNode = shop.Get('backgrnd');
      if (bgNode instanceof WzCanvas) {
        this._wzBg = loader.Load(bgNode);
      }
      // Load selection highlight canvas
      const selectNode = shop.Get('select');
      if (selectNode instanceof WzCanvas) {
        this._canvasSelect = loader.Load(selectNode);
      }
      // Load meso icon canvas
      const mesoNode = shop.Get('meso');
      if (mesoNode instanceof WzCanvas) {
        this._canvasMeso = loader.Load(mesoNode);
      }
    }

    // Background
    this._bg = new Graphics();
    if (!this._wzBg) {
      this._rebuildBg();
    }
    this._root.addChild(this._bg);
    if (this._wzBg) {
      this._root.addChildAt(this._wzBg.ToPixi(), 0);
    }

    // WZ buttons (OG: CLayoutMan::AddButton)
    if (shop) {
      this._btExit = this._loadButton(loader, shop, 'BtExit');
      this._btBuy = this._loadButton(loader, shop, 'BtBuy');
      this._btSell = this._loadButton(loader, shop, 'BtSell');
    }

    // Position buttons per OG layout
    if (this._btExit) {
      this._btExit.container.position.set(BTN_RECHARGE_BASE ? 250 : 250, 4);
      this._btExit.onClick = () => { this.OnClose?.(); this.isVisible = false; };
      this._root.addChild(this._btExit.container);
    }
    if (this._btBuy) {
      this._btBuy.container.position.set(DETAIL_X, 200);
      this._btBuy.onClick = () => this._doBuy();
      this._root.addChild(this._btBuy.container);
    }
    if (this._btSell) {
      this._btSell.container.position.set(DETAIL_X + 60, 200);
      this._btSell.onClick = () => this._doSell();
      this._root.addChild(this._btSell.container);
    }

    // Scrollbars (OG: CCtrlScrollBar for buy and sell lists)
    this._buyScrollBar = new ScrollBar(
      BUY_LIST_X + BUY_LIST_W + 2,
      BUY_LIST_Y,
      BUY_LIST_ROWS * BUY_ROW_H,
      (pos: number) => { this._buyScrollOffset = pos; },
    );
    this._root.addChild(this._buyScrollBar.container);

    this._sellScrollBar = new ScrollBar(
      SELL_LIST_X + SELL_LIST_W + 2,
      SELL_LIST_Y,
      SELL_LIST_ROWS * SELL_ROW_H,
      (pos: number) => { this._sellScrollOffset = pos; },
    );
    this._root.addChild(this._sellScrollBar.container);
    this._sellScrollBar.container.visible = false;
  }

  /** Set name/icon resolvers (called from GameStage). */
  setResolvers(
    itemNameOf: (id: number) => string,
    itemIconOf: (id: number) => WzSprite | null,
  ): void {
    this._itemNameOf = itemNameOf;
    this._itemIconOf = itemIconOf;
  }

  /** Set player meso count (for display). */
  setMeso(meso: number): void {
    this._meso = meso;
  }

  /**
   * OG: CShopDlg::SetShopDlg (0x6EAB00) — populate shop from server packet.
   * Already decoded by FieldHandlers.handleShopOpen; this takes the structured data.
   */
  setShopData(npcTemplateId: number, items: ShopItem[]): void {
    this._npcTemplateId = npcTemplateId;
    this._buyItems = items;
    this._rechargeItems = items.filter(i =>
      Math.floor(i.itemId / 10000) === PREFIX_THROW_ARROW ||
      Math.floor(i.itemId / 10000) === PREFIX_BULLET
    );
    this._recommendedItems = [];
    this._recommendedIndices = [];
    this._buySelected = -1;
    this._sellSelected = -1;
    this._buyScrollOffset = 0;
    this._activeTab = 0;
    this._updateBuyScrollRange();
  }

  /**
   * OG: CShopDlg::SetSellItems (0x6E9790) — populate sell tab from player inventory.
   */
  setSellItems(items: SellItem[]): void {
    this._sellItems = items;
    this._sellScrollOffset = 0;
    this._updateSellScrollRange();
  }

  private _loadButton(loader: WzTextureLoader, prop: WzProperty, name: string): Button | null {
    const btnProp = prop.Get(name);
    if (!(btnProp instanceof WzProperty)) return null;
    return Button.fromWz(loader, btnProp);
  }

  // --- Actions (OG: OnButtonClicked 0x6EB650) ---

  private _doBuy(): void {
    if (this._activeTab === 2) return;  // Sell tab
    const list = this._activeTab === 0 ? this._buyItems : this._recommendedItems;
    const sel = this._buySelected;
    if (sel < 0 || sel >= list.length) return;
    const item = list[sel];
    this.OnBuy?.(sel, item.itemId, 1, item.price);
  }

  private _doSell(): void {
    if (this._activeTab !== 2) return;  // Only on sell tab
    const sel = this._sellSelected;
    if (sel < 0 || sel >= this._sellItems.length) return;
    const item = this._sellItems[sel];
    this.OnSell?.(item.slot, item.itemId, 1);
  }

  private _doRecharge(index: number): void {
    if (index < 0 || index >= this._sellItems.length) return;
    const item = this._sellItems[index];
    this.OnRecharge?.(item.slot);
  }

  // --- Scroll ---

  private _updateBuyScrollRange(): void {
    const list = this._activeTab === 2 ? this._sellItems :
      this._activeTab === 1 ? this._recommendedItems : this._buyItems;
    const max = Math.max(0, list.length - BUY_LIST_ROWS);
    this._buyScrollBar?.setRange(max + 1);
  }

  private _updateSellScrollRange(): void {
    const max = Math.max(0, this._sellItems.length - SELL_LIST_ROWS);
    this._sellScrollBar?.setRange(max + 1);
  }

  // --- Draw (OG: CShopDlg::Draw 0x6E9610) ---

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
    if (this._activeTab === 2) {
      this._drawSellList();
      this._sellScrollBar!.container.visible = true;
      this._buyScrollBar!.container.visible = false;
    } else {
      this._drawBuyList();
      this._sellScrollBar!.container.visible = false;
      this._buyScrollBar!.container.visible = true;
    }
    this._drawDetail();
    this._drawMoney();
  }

  /** OG: Tab rendering — 3 tabs: Buy, Recommended, Sell */
  private _drawTabs(): void {
    const labels = ['Buy', 'Recommended', 'Sell'];
    for (let i = 0; i < labels.length; i++) {
      const tx = TAB_X;
      const ty = TAB_Y + i * TAB_ITEM_H;
      const isActive = i === this._activeTab;
      const g = new Graphics();
      g.rect(tx, ty, TAB_W, TAB_ITEM_H).fill({ color: isActive ? '#3A3450' : '#1A1A28' });
      if (isActive) {
        g.rect(tx, ty, TAB_W, 1).fill({ color: '#6A5A9A' });
      }
      g.rect(tx, ty, 1, TAB_ITEM_H).fill({ color: '#504632' });
      g.rect(tx + TAB_W - 1, ty, 1, TAB_ITEM_H).fill({ color: '#504632' });
      this._root.addChild(g);
      this._dynamicChildren.push(g);

      const t = new Text({ text: labels[i], style: _tabStyle });
      t.x = tx + 4;
      t.y = ty + 3;
      this._root.addChild(t);
      this._dynamicChildren.push(t);
    }
  }

  /** OG: CShopDlg::DrawBuyItem (0x6E8600) — buy/recommended item list */
  private _drawBuyList(): void {
    const list = this._activeTab === 1 ? this._recommendedItems : this._buyItems;
    const sel = this._buySelected;
    const startIdx = this._buyScrollOffset;
    const visibleCount = Math.min(BUY_LIST_ROWS, list.length - startIdx);

    for (let i = 0; i < visibleCount; i++) {
      const idx = startIdx + i;
      const item = list[idx];
      const ix = BUY_LIST_X;
      const iy = BUY_LIST_Y + i * BUY_ROW_H;
      const isSelected = idx === sel;

      // Selection highlight (OG: m_pCanvasSelect)
      if (isSelected && this._canvasSelect) {
        const spr = this._canvasSelect.ToPixi();
        spr.x = ix;
        spr.y = iy;
        this._root.addChild(spr);
        this._dynamicChildren.push(spr);
      }

      // Item icon
      if (item.icon) {
        const icon = item.icon.ToPixi();
        icon.x = ix + 2;
        icon.y = iy + 2;
        this._root.addChild(icon);
        this._dynamicChildren.push(icon);
      }

      // Item name
      const t = new Text({ text: item.name, style: _itemStyle });
      t.x = ix + 20;
      t.y = iy + 3;
      this._root.addChild(t);
      this._dynamicChildren.push(t);

      // Price
      const p = new Text({ text: `${item.price}`, style: _priceStyle });
      p.x = ix + BUY_LIST_W - 40;
      p.y = iy + 3;
      this._root.addChild(p);
      this._dynamicChildren.push(p);
    }
  }

  /** OG: CShopDlg::DrawSellItem (0x6E56F0) — sell item list (player inventory) */
  private _drawSellList(): void {
    const sel = this._sellSelected;
    const startIdx = this._sellScrollOffset;
    const visibleCount = Math.min(SELL_LIST_ROWS, this._sellItems.length - startIdx);

    for (let i = 0; i < visibleCount; i++) {
      const idx = startIdx + i;
      const item = this._sellItems[idx];
      const ix = SELL_LIST_X;
      const iy = SELL_LIST_Y + i * SELL_ROW_H;
      const isSelected = idx === sel;

      // Selection highlight
      if (isSelected && this._canvasSelect) {
        const spr = this._canvasSelect.ToPixi();
        spr.x = ix;
        spr.y = iy;
        this._root.addChild(spr);
        this._dynamicChildren.push(spr);
      }

      // Item icon
      if (item.icon) {
        const icon = item.icon.ToPixi();
        icon.x = ix + 2;
        icon.y = iy + 2;
        this._root.addChild(icon);
        this._dynamicChildren.push(icon);
      }

      // Item name
      const t = new Text({ text: item.name, style: _itemStyle });
      t.x = ix + 20;
      t.y = iy + 3;
      this._root.addChild(t);
      this._dynamicChildren.push(t);

      // Quantity
      const q = new Text({ text: `x${item.quantity}`, style: _stockStyle });
      q.x = ix + SELL_LIST_W - 30;
      q.y = iy + 3;
      this._root.addChild(q);
      this._dynamicChildren.push(q);
    }
  }

  /** Detail panel (right side) — shows selected item info */
  private _drawDetail(): void {
    const item = this._activeTab === 2
      ? (this._sellSelected >= 0 ? this._sellItems[this._sellSelected] : null)
      : (this._buySelected >= 0
        ? (this._activeTab === 1 ? this._recommendedItems : this._buyItems)[this._buySelected]
        : null);

    if (!item) return;

    // Item icon (large)
    const icon = 'icon' in item ? item.icon : null;
    if (icon) {
      const spr = icon.ToPixi();
      spr.x = DETAIL_X;
      spr.y = DETAIL_Y;
      this._root.addChild(spr);
      this._dynamicChildren.push(spr);
    }

    // Item name
    const name = new Text({ text: item.name, style: _itemStyle });
    name.x = DETAIL_X;
    name.y = DETAIL_Y + 40;
    this._root.addChild(name);
    this._dynamicChildren.push(name);

    // Price
    if ('price' in item) {
      const price = new Text({ text: `Price: ${item.price} mesos`, style: _priceStyle });
      price.x = DETAIL_X;
      price.y = DETAIL_Y + 58;
      this._root.addChild(price);
      this._dynamicChildren.push(price);
    }
  }

  /** OG: CShopDlg::DrawMoney (0x6E6FE0) — meso display */
  private _drawMoney(): void {
    // Meso icon
    if (this._canvasMeso) {
      const spr = this._canvasMeso.ToPixi();
      spr.x = MONEY_X;
      spr.y = MONEY_Y;
      this._root.addChild(spr);
      this._dynamicChildren.push(spr);
    }

    // Meso amount
    const t = new Text({ text: `${this._meso}`, style: _moneyStyle });
    t.x = MONEY_X + 20;
    t.y = MONEY_Y + 2;
    this._root.addChild(t);
    this._dynamicChildren.push(t);
  }

  private _rebuildBg(): void {
    this._bg.clear();
    this._bg.rect(0, 0, 290, 260).fill({ color: '#0C0E18', alpha: 245 / 255 });
    this._bg.rect(0, 0, 290, 260).stroke({ color: '#3C4164', width: 1 });
    this._bg.rect(0, 0, 290, 22).fill({ color: '#0F1224' });
  }

  // --- Input ---

  handleMouseButton(mx: number, my: number, down: boolean): boolean {
    if (!this.isVisible) return false;

    // WZ buttons first
    for (const b of [this._btExit, this._btBuy, this._btSell]) {
      if (b?.handleMouseButton(mx - this._root.x, my - this._root.y, down)) return true;
    }

    const lx = mx - this._root.x;
    const ly = my - this._root.y;

    if (!down) return true;

    // Tab clicks
    for (let i = 0; i < 3; i++) {
      const ty = TAB_Y + i * TAB_ITEM_H;
      if (lx >= TAB_X && lx < TAB_X + TAB_W && ly >= ty && ly < ty + TAB_ITEM_H) {
        this._activeTab = i;
        this._buySelected = -1;
        this._sellSelected = -1;
        this._buyScrollOffset = 0;
        this._sellScrollOffset = 0;
        this._updateBuyScrollRange();
        return true;
      }
    }

    // Buy list click
    if (this._activeTab !== 2) {
      const list = this._activeTab === 1 ? this._recommendedItems : this._buyItems;
      if (lx >= BUY_LIST_X && lx < BUY_LIST_X + BUY_LIST_W && ly >= BUY_LIST_Y && ly < BUY_LIST_Y + BUY_LIST_ROWS * BUY_ROW_H) {
        const rowIdx = Math.floor((ly - BUY_LIST_Y) / BUY_ROW_H) + this._buyScrollOffset;
        if (rowIdx >= 0 && rowIdx < list.length) {
          this._buySelected = rowIdx;
          return true;
        }
      }
    }

    // Sell list click
    if (this._activeTab === 2) {
      if (lx >= SELL_LIST_X && lx < SELL_LIST_X + SELL_LIST_W && ly >= SELL_LIST_Y && ly < SELL_LIST_Y + SELL_LIST_ROWS * SELL_ROW_H) {
        const rowIdx = Math.floor((ly - SELL_LIST_Y) / SELL_ROW_H) + this._sellScrollOffset;
        if (rowIdx >= 0 && rowIdx < this._sellItems.length) {
          this._sellSelected = rowIdx;
          return true;
        }
      }
    }

    return lx >= 0 && lx < 290 && ly >= 0 && ly < 260;
  }

  onMouseMove(_mx: number, _my: number): void {
    // Drag handled by GamePanel base
  }

  handleWheel(_dx: number, dy: number): void {
    if (!this.isVisible) return;
    const delta = dy > 0 ? 1 : -1;
    if (this._activeTab === 2 && this._sellScrollBar) {
      this._sellScrollBar.pos = Math.max(0, Math.min(this._sellScrollBar.pos + delta, this._sellItems.length - SELL_LIST_ROWS));
    } else if (this._buyScrollBar) {
      const list = this._activeTab === 1 ? this._recommendedItems : this._buyItems;
      this._buyScrollBar.pos = Math.max(0, Math.min(this._buyScrollBar.pos + delta, list.length - BUY_LIST_ROWS));
    }
  }

  private _pollWheel(): void {
    const w = window as any;
    const mx = w.__mouseX as number | undefined;
    const my = w.__mouseY as number | undefined;
    if (mx === undefined || my === undefined) return;
    const lx = mx - this._root.x;
    const ly = my - this._root.y;
    if (lx < 0 || lx >= 290 || ly < 0 || ly >= 260) return;
    if (typeof w.__wheelDelta !== 'number') return;
    const d = w.__wheelDelta;
    if (d === this._prevWheel) return;
    this._prevWheel = d;
    this.handleWheel(0, Math.sign(d));
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

  setPosition(x: number, y: number): void {
    this._root.x = x;
    this._root.y = y;
  }

  onResize(w: number, h: number): void {
    this._root.x = Math.floor((w - 290) / 2);
    this._root.y = Math.floor((h - 260) / 2);
  }
}
