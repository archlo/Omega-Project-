import { Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { Button } from '../Button.js';

/**
 * OG: CCashTradingRoomDlg — cash item trading dialog.
 * Decompiled from v95 IDB (OnCreate 0x49E8C0, OnButtonClicked 0x49F030,
 * OnPacket 0x49D6B0, OnPutItem 0x49CDD0, OnTrade 0x49CFD0,
 * DrawItems 0x49F1B0, PutItem 0x49D210, PutMoney 0x49D480).
 *
 * Inherits CMiniRoomBaseDlg. Similar to TradingRoom but for cash items.
 * WZ: UI/UIWindow2.img/CashTradingRoom/
 */

const PanelW = 526;
const PanelH = 472;

// Grid layout (OG: DrawItems 0x49F1B0)
const GRID_COLS = 3;
const GRID_ROWS = 3;
const SLOT_W = 60;
const SLOT_H = 60;
const SLOT_GAP = 4;
const MY_GRID_X = 20;
const THEIR_GRID_X = 306;
const GRID_Y = 68;

// Button IDs (OG: OnButtonClicked 0x49F030)
const BTN_TRADE = 0x3EA;    // 1002
const BTN_PUT_MONEY = 0x3EB; // 1003
const BTN_CHAT = 0x3EC;      // 1004

// Packet types (OG: OnPacket 0x49D6B0)
const TRP_PUT_ITEM = 15;
const TRP_PUT_MONEY = 16;
const TRP_TRADE = 17;

const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 11, fontFamily: 'monospace' });
const _labelStyle = new TextStyle({ fill: '#AAA', fontSize: 9, fontFamily: 'monospace' });
const _slotStyle = new TextStyle({ fill: '#CCC', fontSize: 9, fontFamily: 'monospace' });
const _moneyStyle = new TextStyle({ fill: '#FFD700', fontSize: 10, fontFamily: 'monospace' });

export interface CashTradeItem {
  itemId: number;
  quantity: number;
  name: string;
  icon: WzSprite | null;
}

export class CashTradingRoom extends GamePanel {
  // Callbacks
  OnPutItem: ((index: number, itemId: number, quantity: number) => void) | null = null;
  OnPutMoney: ((amount: number) => void) | null = null;
  OnTrade: (() => void) | null = null;
  OnCancel: (() => void) | null = null;
  OnChat: ((message: string) => void) | null = null;

  // State
  private _myItems: (CashTradeItem | null)[] = new Array(GRID_COLS * GRID_ROWS).fill(null);
  private _theirItems: (CashTradeItem | null)[] = new Array(GRID_COLS * GRID_ROWS).fill(null);
  private _myMoney = 0;
  private _theirMoney = 0;
  private _myConfirmed = false;
  private _theirConfirmed = false;
  private _partnerName = '';

  // UI
  private _bg: Graphics;
  private _dynamicChildren: import('pixi.js').Container[] = [];
  private _allButtons: Button[] = [];
  private _btTrade: Button | null = null;
  private _btPutMoney: Button | null = null;

  // Resolvers
  private _itemNameOf: ((id: number) => string) | null = null;
  private _itemIconOf: ((id: number) => WzSprite | null) | null = null;

  constructor(loader: WzTextureLoader, ui: WzPackage | null) {
    super();
    this.isVisible = false;

    this._bg = new Graphics();
    this._rebuildBg();
    this._root.addChild(this._bg);

    // Load WZ background (OG: "UI/UIWindow2.img/CashTradingRoom/backgrnd")
    const cashTrade = ui?.GetItem('UIWindow2.img/CashTradingRoom') as WzProperty | null;
    if (cashTrade) {
      const bgNode = cashTrade.Get('backgrnd');
      if (bgNode instanceof WzCanvas) {
        const bgSprite = loader.Load(bgNode)?.ToPixi();
        if (bgSprite) this._root.addChildAt(bgSprite, 0);
      }

      // Load buttons (OG: CLayoutMan::AddButton)
      this._btTrade = this._loadButton(loader, cashTrade, 'BtTrade');
      this._btPutMoney = this._loadButton(loader, cashTrade, 'BtPutMoney');
    }

    // Position buttons
    if (this._btTrade) {
      this._btTrade.container.position.set(200, 400);
      this._btTrade.onClick = () => this.OnTrade?.();
      this._root.addChild(this._btTrade.container);
      this._allButtons.push(this._btTrade);
    }
    if (this._btPutMoney) {
      this._btPutMoney.container.position.set(300, 400);
      this._btPutMoney.onClick = () => this._promptMoney();
      this._root.addChild(this._btPutMoney.container);
      this._allButtons.push(this._btPutMoney);
    }
  }

  /** Set name/icon resolvers. */
  setResolvers(
    itemNameOf: (id: number) => string,
    itemIconOf: (id: number) => WzSprite | null,
  ): void {
    this._itemNameOf = itemNameOf;
    this._itemIconOf = itemIconOf;
  }

  /** Open the trading room. */
  open(partnerName: string): void {
    this._partnerName = partnerName;
    this._myItems = new Array(GRID_COLS * GRID_ROWS).fill(null);
    this._theirItems = new Array(GRID_COLS * GRID_ROWS).fill(null);
    this._myMoney = 0;
    this._theirMoney = 0;
    this._myConfirmed = false;
    this._theirConfirmed = false;
    this.isVisible = true;
  }

  /** OG: CCashTradingRoomDlg::OnPutItem (0x49CDD0) — partner placed an item. */
  putTheirItem(slot: number, itemId: number, quantity: number): void {
    if (slot < 0 || slot >= this._theirItems.length) return;
    this._theirItems[slot] = {
      itemId,
      quantity,
      name: this._itemNameOf?.(itemId) ?? `[${itemId}]`,
      icon: this._itemIconOf?.(itemId) ?? null,
    };
    this._theirConfirmed = false;
    this._myConfirmed = false;
  }

  /** OG: CCashTradingRoomDlg::OnPutMoney (0x49C9D0) — partner put money. */
  setTheirMoney(amount: number): void {
    this._theirMoney = amount;
  }

  /** OG: CCashTradingRoomDlg::OnTrade (0x49CFD0) — trade confirmation. */
  setTradeConfirmed(theirConfirmed: boolean): void {
    this._theirConfirmed = theirConfirmed;
  }

  /** Place an item in my grid. */
  putMyItem(slot: number, itemId: number, quantity: number): void {
    if (slot < 0 || slot >= this._myItems.length) return;
    this._myItems[slot] = {
      itemId,
      quantity,
      name: this._itemNameOf?.(itemId) ?? `[${itemId}]`,
      icon: this._itemIconOf?.(itemId) ?? null,
    };
    this._myConfirmed = false;
    this._theirConfirmed = false;
  }

  /** Remove an item from my grid. */
  removeMyItem(slot: number): void {
    if (slot >= 0 && slot < this._myItems.length) {
      this._myItems[slot] = null;
    }
  }

  private _promptMoney(): void {
    const raw = window.prompt('Amount of mesos:');
    if (raw === null) return;
    const amount = Math.trunc(Number(raw));
    if (Number.isFinite(amount) && amount > 0) {
      this._myMoney += amount;
      this.OnPutMoney?.(amount);
    }
  }

  private _loadButton(loader: WzTextureLoader, prop: WzProperty, name: string): Button | null {
    const pr = prop.Get(name);
    if (!(pr instanceof WzProperty)) return null;
    const b = Button.fromWz(loader, pr);
    this._root.addChild(b.container);
    return b;
  }

  private _rebuildBg(): void {
    this._bg.clear();
    this._bg.rect(0, 0, PanelW, PanelH).fill({ color: '#0C0E18', alpha: 245 / 255 });
    this._bg.rect(0, 0, PanelW, PanelH).stroke({ color: '#3C4164', width: 1 });
    this._bg.rect(0, 0, PanelW, 22).fill({ color: '#0F1224' });
  }

  // --- Drawing ---

  update(_dt: number): void {
    if (!this.isVisible) return;
    this.draw();
  }

  draw(): void {
    if (!this.isVisible) return;
    for (const c of this._dynamicChildren) c.destroy();
    this._dynamicChildren = [];

    // Title
    const title = new Text({ text: `Cash Trading - ${this._partnerName}`, style: _titleStyle });
    title.x = 10; title.y = 3;
    this._root.addChild(title);
    this._dynamicChildren.push(title);

    // My grid label
    const myLabel = new Text({ text: 'My Items', style: _labelStyle });
    myLabel.x = MY_GRID_X; myLabel.y = GRID_Y - 14;
    this._root.addChild(myLabel);
    this._dynamicChildren.push(myLabel);

    // Their grid label
    const theirLabel = new Text({ text: `${this._partnerName}'s Items`, style: _labelStyle });
    theirLabel.x = THEIR_GRID_X; theirLabel.y = GRID_Y - 14;
    this._root.addChild(theirLabel);
    this._dynamicChildren.push(theirLabel);

    // Draw item grids
    this._drawGrid(this._myItems, MY_GRID_X);
    this._drawGrid(this._theirItems, THEIR_GRID_X);

    // Money display
    const myMoneyText = new Text({ text: `My Mesos: ${this._myMoney}`, style: _moneyStyle });
    myMoneyText.x = MY_GRID_X; myMoneyText.y = GRID_Y + GRID_ROWS * (SLOT_H + SLOT_GAP) + 10;
    this._root.addChild(myMoneyText);
    this._dynamicChildren.push(myMoneyText);

    const theirMoneyText = new Text({ text: `${this._partnerName}'s Mesos: ${this._theirMoney}`, style: _moneyStyle });
    theirMoneyText.x = THEIR_GRID_X; theirMoneyText.y = GRID_Y + GRID_ROWS * (SLOT_H + SLOT_GAP) + 10;
    this._root.addChild(theirMoneyText);
    this._dynamicChildren.push(theirMoneyText);

    // Confirmation status
    if (this._myConfirmed) {
      const myConf = new Text({ text: 'Confirmed', style: new TextStyle({ fill: '#96FF96', fontSize: 10, fontFamily: 'monospace' }) });
      myConf.x = MY_GRID_X + 100; myConf.y = GRID_Y + GRID_ROWS * (SLOT_H + SLOT_GAP) + 10;
      this._root.addChild(myConf);
      this._dynamicChildren.push(myConf);
    }
    if (this._theirConfirmed) {
      const theirConf = new Text({ text: 'Confirmed', style: new TextStyle({ fill: '#96FF96', fontSize: 10, fontFamily: 'monospace' }) });
      theirConf.x = THEIR_GRID_X + 100; theirConf.y = GRID_Y + GRID_ROWS * (SLOT_H + SLOT_GAP) + 10;
      this._root.addChild(theirConf);
      this._dynamicChildren.push(theirConf);
    }
  }

  private _drawGrid(items: (CashTradeItem | null)[], baseX: number): void {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const idx = row * GRID_COLS + col;
        const sx = baseX + col * (SLOT_W + SLOT_GAP);
        const sy = GRID_Y + row * (SLOT_H + SLOT_GAP);

        // Slot background
        const slotBg = new Graphics();
        slotBg.rect(sx, sy, SLOT_W, SLOT_H).fill({ color: '#13131F', alpha: 0.8 });
        slotBg.rect(sx, sy, SLOT_W, SLOT_H).stroke({ color: '#3C4164', width: 1 });
        this._root.addChild(slotBg);
        this._dynamicChildren.push(slotBg);

        const item = items[idx];
        if (item) {
          // Item icon
          if (item.icon) {
            const icon = item.icon.ToPixi();
            icon.x = sx + (SLOT_W - 32) / 2;
            icon.y = sy + 4;
            this._root.addChild(icon);
            this._dynamicChildren.push(icon);
          }

          // Item name
          const name = new Text({ text: item.name, style: _slotStyle });
          name.x = sx + 2; name.y = sy + SLOT_H - 14;
          this._root.addChild(name);
          this._dynamicChildren.push(name);

          // Quantity
          if (item.quantity > 1) {
            const qty = new Text({ text: `x${item.quantity}`, style: _slotStyle });
            qty.x = sx + SLOT_W - 24; qty.y = sy + 2;
            this._root.addChild(qty);
            this._dynamicChildren.push(qty);
          }
        }
      }
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

    // My grid click — select slot for putting item
    if (lx >= MY_GRID_X && lx < MY_GRID_X + GRID_COLS * (SLOT_W + SLOT_GAP) &&
        ly >= GRID_Y && ly < GRID_Y + GRID_ROWS * (SLOT_H + SLOT_GAP)) {
      const col = Math.floor((lx - MY_GRID_X) / (SLOT_W + SLOT_GAP));
      const row = Math.floor((ly - GRID_Y) / (SLOT_H + SLOT_GAP));
      const idx = row * GRID_COLS + col;
      if (idx >= 0 && idx < this._myItems.length) {
        // If clicking an occupied slot, could remove; for now just select
        return true;
      }
    }

    return lx >= 0 && lx < PanelW && ly >= 0 && ly < PanelH;
  }

  onMouseMove(_mx: number, _my: number): void {
    // Drag handled by GamePanel base
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') {
      this.OnCancel?.();
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
