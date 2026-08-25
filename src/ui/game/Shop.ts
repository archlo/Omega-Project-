import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { WzSprite } from '../../render/WzSprite.js';
import { Button } from '../Button.js';
import { ScrollBar } from './ScrollBar.js';
import { CCtrlTab } from './CCtrlTab.js';

// ─────────────────────────────────────────────────────────────────────────────
// CShopDlg port (v95 IDB).
//   ctor/OnCreate 0x6E7540 / SetShopDlg 0x6EAB00 / Draw 0x6E9610 /
//   DrawBuyItem 0x6E8600 / DrawSellItem 0x6E56F0 / DrawMoney 0x6E6FE0 /
//   SetSellItems 0x6E9790 / OnButtonClicked 0x6EB650 / SendBuyRequest
//   0x6E9BB0 / SendSellRequest 0x6E7260 / SendRechargeRequest 0x6E4E90 /
//   GetItemIndexFromPoint 0x6E3C00 / AskItemCount 0x6E5220.
// Window chrome is the single UI/UIWindow2.img/Shop/backgrnd canvas (465x328);
// backgrnd2/backgrnd3 layer on top at their origin offsets.
// ─────────────────────────────────────────────────────────────────────────────

const WIN_W = 465;
const WIN_H = 328;

// Grid — GetItemIndexFromPoint @0x6E3C00: 5 rows pitch 42, first top y=115,
// hit band ends y<325. Buy column x=10, sell column x=241.
const GRID_TOP = 115;
const ROW_PITCH = 42;
const VISIBLE_ROWS = 5;
const GRID_HIT_BOTTOM = 325;
const BUY_X = 10;
const SELL_X = 241;
const SELECT_BUY_X = 47;
const SELECT_SELL_X = 278;
const ICON_BUY_X = 12;
const ICON_SELL_X = 243;
const NAME_BUY_X = 53;
const NAME_SELL_X = 284;
const MESO_BAG_X = 50;
const PRICE_BUY_X = 68;
const NAME_MAX_W = 152;
// Sell recharge price right-aligned endings (DrawSellItem disasm immediates).
const RECHARGE_PRICE_END = 440;
const RECHARGE_PRICE_END_DISCOUNT = 438;

// Money display — DrawMoney @0x6E6FE0: right-aligned ending x=450, y=67.
const MONEY_END_X = 450;
const MONEY_Y = 67;

// Scrollbars — OnCreate: SBBuy(214,115,len203), SBSell(445,115,len203).
const SB_BUY_X = 214;
const SB_SELL_X = 445;

/** Shop item from server packet (SetShopDlg 0x6EAB00 decode). */
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
  unitPrice: number;
  name: string;
  icon: WzSprite | null;
}

/** Player inventory row for the sell column (SetSellItems @0x6E9790). */
export interface SellItem {
  slot: number;
  itemId: number;
  name: string;
  icon: WzSprite | null;
  /** bundle quantity (GetItemNumber) */
  stock: number;
  /** ceil(stock*unitPrice)+basePrice — displayed value, NO client-side /2 */
  price: number;
  /** FULL-recharge price for this stack: deficit * entry.unitPrice */
  rechargePrice: number;
  /** true when a matching recharge entry exists (BtRecharge row) */
  rechargeable: boolean;
}

export interface ShopUserData {
  level: number;
  job: number;
  gender: number;
}

interface EquipReqInfo { reqLevel: number; reqJob: number }

const _fontStyle = new TextStyle({ fill: 0x3A3A3A, fontSize: 11, fontFamily: 'Arial' });
const _redStyle = new TextStyle({ fill: 0xC00000, fontSize: 11, fontFamily: 'Arial' });
const _moneyStyle = new TextStyle({ fill: 0x3A3A3A, fontSize: 11, fontFamily: 'Arial' });

function formatInteger(n: number): string {
  return Math.trunc(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

let _measureCtx: CanvasRenderingContext2D | null | undefined;
function textWidth(s: string, style: TextStyle): number {
  if (typeof document === 'undefined') return s.length * 6;
  if (_measureCtx === undefined) _measureCtx = document.createElement('canvas').getContext('2d');
  if (!_measureCtx) return s.length * 6;
  _measureCtx.font = `${style.fontSize}px ${style.fontFamily}`;
  return _measureCtx.measureText(s).width;
}

function truncate(text: string, maxW: number): string {
  if (textWidth(text, _fontStyle) <= maxW) return text;
  let out = text;
  while (out.length > 1 && textWidth(out + '..', _fontStyle) > maxW) out = out.slice(0, -1);
  return out + '..';
}

/** OG GetDiscountPriceByRate @0x6E3980 — round(p*(100-rate)/100). */
export function discountByRate(price: number, rate: number): number {
  if (rate <= 0 || price <= 0) return 0;
  return Math.round(price * (100 - rate) / 100);
}

export class Shop extends GamePanel {
  // Sends — opcode 66 family via GameSender (OG COutPacket(66)).
  OnBuy: ((shopSlot: number, itemId: number, count: number, price: number) => void) | null = null;
  OnSell: ((invSlot: number, itemId: number, count: number) => void) | null = null;
  OnRecharge: ((invSlot: number) => void) | null = null;
  OnClose: (() => void) | null = null;
  /** Sell-tab changed → GameStage rebuilds the sell list for TI. */
  onRequestSellList: ((ti: number) => void) | null = null;

  // state — CShopDlg members
  private _npcTemplateId = 0;
  private _buyItems: ShopItem[] = [];
  private _buyRecommended: ShopItem[] = [];
  private _originalIndex: number[] = [];   // m_anOriginalIndex
  private _rechargeItems: ShopItem[] = []; // m_aRechargeItem
  private _sellItems: SellItem[] = [];     // m_aSellItem
  private _buySelected = -1;               // m_nBuySelected
  private _sellSelected = -1;              // m_nSellSelected
  private _buyStartIdx = [0, 0];           // m_anBuyStartIdx[2] per TabBuy curTab
  private _requestSent = false;            // m_bShopRequestSent
  private _userData: ShopUserData = { level: 0, job: 0, gender: 0 };
  private _meso = 0;

  // controls
  private _tabBuy: CCtrlTab;
  private _tabSell: CCtrlTab;
  private _sbBuy: ScrollBar;
  private _sbSell: ScrollBar;
  private _btExit: Button | null = null;
  private _btBuy: Button | null = null;
  private _btSell: Button | null = null;
  private _btRecharge: (Button | null)[] = [null, null, null, null, null];

  // assets
  private _canvasSelect: WzSprite | null = null;
  private _canvasMeso: WzSprite | null = null;
  private _btRechargeProto: Button | null = null;
  private _loader: WzTextureLoader | null = null;
  private _rechargeProp: WzProperty | null = null;

  // resolvers / injected helpers
  private _itemNameOf: ((id: number) => string) | null = null;
  private _itemIconOf: ((id: number) => WzSprite | null) | null = null;
  private _equipInfoOf: ((itemId: number) => EquipReqInfo | null) | null = null;
  private _itemPriceOf: ((itemId: number) => { price: number; unitPrice: number }) | null = null;
  private _countItemOf: ((itemId: number) => number) | null = null;

  private _dyn: Container[] = [];

  constructor(loader: WzTextureLoader, ui: WzPackage | null) {
    super();
    const shopProp = ui?.GetItem('UIWindow2.img/Shop') as WzProperty | null;

    // Backdrops — top-left = pos − origin; container origin (0,0).
    if (shopProp && loader) {
      for (const name of ['backgrnd', 'backgrnd2', 'backgrnd3']) {
        const c = shopProp.Get(name);
        if (c instanceof WzCanvas) {
          const sp = loader.Load(c);
          if (!sp) continue;
          const s = sp.ToPixi();
          s.position.set(-sp.OriginX, -sp.OriginY);
          this._root.addChildAt(s, Math.min(2, this._root.children.length));
        }
      }
      const sel = shopProp.Get('select');
      if (sel instanceof WzCanvas) this._canvasSelect = loader.Load(sel);
      const meso = shopProp.Get('meso');
      if (meso instanceof WzCanvas) this._canvasMeso = loader.Load(meso);

      // BtExit(2)/BtBuy(1000)/BtSell(1001) — origin-placed AddButton(dx=0,dy=0):
      // canvas origins (-158,-25)/(-158,-45)/(-390,-45) self-place the sprites.
      this._btExit = this._loadOriginButton(loader, shopProp, 'BtExit', () => this._setRet());
      this._btBuy = this._loadOriginButton(loader, shopProp, 'BtBuy', () => this.SendBuyRequest());
      this._btSell = this._loadOriginButton(loader, shopProp, 'BtSell', () => this.SendSellRequest());

      const rc = shopProp.Get('BtRecharge');
      if (rc instanceof WzProperty) {
        this._rechargeProp = rc;
        this._btRechargeProto = Button.fromWz(loader, rc, 'Charge');
      }
    }
    if (!this._btExit || !this._btBuy || !this._btSell) {
      // Graphics fallback buttons when the WZ set is absent (tests).
      const mk = (label: string, x: number, y: number, onClick: () => void): Button => {
        const b = new Button(label);
        b.container.position.set(x, y);
        b.onClick = onClick;
        this._root.addChild(b.container);
        return b;
      };
      this._btExit ??= mk('Exit', 380, 20, () => this._setRet());
      this._btBuy ??= mk('Buy', 150, 42, () => this.SendBuyRequest());
      this._btSell ??= mk('Sell', 385, 42, () => this.SendSellRequest());
    }

    // TabBuy id1002 @(10,91) 222 wide, SameWidth w=50; one tab ("All") — the
    // Recommended tab is added by SetShopDlg only when it is non-empty.
    this._tabBuy = new CCtrlTab(1002, 10, 91, 222, { type: 8, customHeight: 19, bSameWidth: false, tabSpace: 1 });
    this._tabBuy.addItem('All');
    this._tabBuy.setParent({
      onChildNotify: (nId, param1, param2) => {
        if (nId === 1002 && param1 === 500) this._onBuyTabChanged(param2);
      },
    });
    this._root.addChild(this._tabBuy.container);

    // TabSell id1003 @(241,91) 214×19, five inventory tabs. Tab c → TI:
    // c==2 ? 4 : c==3 ? 3 : c+1  → [Equip=1, Use=2, Setup=4, Etc=3, Cash=5].
    this._tabSell = new CCtrlTab(1003, 241, 91, 214, { type: 8, customHeight: 19, bSameWidth: false, tabSpace: 1 });
    for (const label of ['Equip', 'Use', 'Setup', 'Etc', 'Cash']) this._tabSell.addItem(label);
    this._tabSell.setParent({
      onChildNotify: (nId, param1, param2) => {
        if (nId === 1003 && param1 === 500) this.ResetInfo();
      },
    });
    this._root.addChild(this._tabSell.container);

    this._sbBuy = new ScrollBar(SB_BUY_X, GRID_TOP, 203, () => {
      this._buyStartIdx[this._tabBuy.curTab] = this._sbBuy.pos;
      this.draw();
    });
    this._root.addChild(this._sbBuy.container);
    this._sbSell = new ScrollBar(SB_SELL_X, GRID_TOP, 203, () => this.draw());
    this._root.addChild(this._sbSell.container);

    this.isVisible = false;
  }

  private _loadOriginButton(loader: WzTextureLoader, prop: WzProperty, name: string, onClick: () => void): Button | null {
    const node = prop.Get(name);
    if (!(node instanceof WzProperty)) return null;
    const b = Button.fromWz(loader, node, '');
    b.onClick = onClick;
    b.container.position.set(0, 0); // WZ origin places the sprite
    this._root.addChild(b.container);
    return b;
  }

  // ── Wiring ───────────────────────────────────────────────────────────────

  setResolvers(
    itemNameOf: (id: number) => string,
    itemIconOf: (id: number) => WzSprite | null,
    opts: {
      equipInfoOf?: (itemId: number) => EquipReqInfo | null;
      itemPriceOf?: (itemId: number) => { price: number; unitPrice: number };
      countItemOf?: (itemId: number) => number;
    } = {},
  ): void {
    this._itemNameOf = itemNameOf;
    this._itemIconOf = itemIconOf;
    this._equipInfoOf = opts.equipInfoOf ?? null;
    this._itemPriceOf = opts.itemPriceOf ?? null;
    this._countItemOf = opts.countItemOf ?? null;
  }

  setUserData(level: number, job: number, gender: number): void {
    this._userData = { level, job, gender };
  }

  setMeso(meso: number): void { this._meso = meso; }

  getBuyItem(index: number): ShopItem | null { return this._curBuyList()[index] ?? null; }

  /** m_aRechargeItem lookup by itemId (SetSellItems recharge matching). */
  getRechargeEntry(itemId: number): ShopItem | null {
    return this._rechargeItems.find((r) => r.itemId === itemId) ?? null;
  }

  /**
   * OG SetShopDlg post-processing @0x6EAB00: stars/bullets → m_aRechargeItem;
   * priced items → m_aBuyItem; equips within ±5 levels, job-bit and gender
   * match → m_aBuyItem_Recommended (with original index remembered). When the
   * recommended list is non-empty a second Buy tab is added and selected.
   */
  setShopData(npcTemplateId: number, items: ShopItem[]): void {
    this._npcTemplateId = npcTemplateId;
    this._buyItems = [];
    this._buyRecommended = [];
    this._originalIndex = [];
    this._rechargeItems = [];
    this._buySelected = -1;
    this._sellSelected = -1;
    this._requestSent = false;
    this._buyStartIdx = [0, 0];

    items.forEach((item, idx) => {
      const prefix = Math.floor(item.itemId / 10000);
      if (prefix === 207 || prefix === 233) this._rechargeItems.push(item);
      if (item.price !== 0 || item.tokenPrice !== 0) {
        this._buyItems.push(item);
        // OG recommends EQUIPS only (pItem->GetType() == 1) without a token.
        const isEquip = Math.floor(item.itemId / 1000000) === 1;
        if (isEquip && item.tokenPrice === 0 && this._isRecommended(item)) {
          this._buyRecommended.push(item);
          this._originalIndex.push(idx);
        }
      }
    });

    // Second Buy tab (child "1") only when recommendations exist; select it.
    if (this._buyRecommended.length > 0 && this._tabBuy.itemCount < 2) {
      this._tabBuy.addItem('Recommended');
      this._tabBuy.setTab(1);
    }

    this._syncBuyScroll();
    this.ResetInfo();
  }

  /** OG recommendation gate: ±5 equip req-level, job bit, gender. */
  private _isRecommended(item: ShopItem): boolean {
    const info = this._equipInfoOf?.(item.itemId);
    if (!info) return false;
    const lv = this._userData.level;
    if (!(Math.abs(lv - info.reqLevel) <= 5)) return false;
    if (info.reqJob !== 0) {
      // OG: jobBit = 1 << ((job % 1000) / 100 - 1); 0 when category is 0.
      const cat = Math.floor((this._userData.job % 1000) / 100);
      const jobBit = cat >= 1 ? 1 << (cat - 1) : 0;
      if (!(info.reqJob & jobBit)) return false;
    }
    // gender gate needs the item's required gender; not tracked client-side in
    // this data set — treated as matched (documented gap).
    return true;
  }

  /** OG SetSellItems @0x6E9790. */
  setSellItems(items: SellItem[]): void {
    this._sellItems = items;
    this._sellSelected = -1;
    this._sbSell.setRange(Math.max(items.length - VISIBLE_ROWS + 1, 1));
    this.draw();
  }

  /** OG ResetInfo @0x6EB620 — rebuild sell list for the current sell tab. */
  ResetInfo(): void {
    this.onRequestSellList?.(this.sellTI());
    this.draw();
  }

  /** Sell tab index → server inventory TI ([1,2,4,3,5]). */
  sellTI(): number {
    const c = this._tabSell.curTab;
    return c === 2 ? 4 : c === 3 ? 3 : c + 1;
  }

  private _curBuyList(): ShopItem[] {
    return this._tabBuy.curTab ? this._buyRecommended : this._buyItems;
  }

  private _onBuyTabChanged(_tab: number): void {
    this._buySelected = -1;
    this._sbBuy.pos = this._buyStartIdx[this._tabBuy.curTab] ?? 0;
    this._syncBuyScroll();
    this.draw();
  }

  private _syncBuyScroll(): void {
    const n = this._curBuyList().length;
    this._sbBuy.setRange(Math.max(n - VISIBLE_ROWS + 1, 1));
  }

  // ── Result handling (opcode 365 static OnPacket @0x6EB7D0) ──────────────

  NotifyResult(resultType: number, shortfall?: number, message?: string): void {
    this._requestSent = false;
    const text = SHOP_RESULT_TEXT[resultType]
      ?? (resultType === 14 && shortfall !== undefined ? `You can only purchase items up to level ${-shortfall}.`
        : resultType === 15 && shortfall !== undefined ? `You must be at least level ${shortfall} to purchase this.`
          : undefined);
    if (text) this.onNotice?.(text);
    this.draw();
  }

  onNotice: ((msg: string) => void) | null = null;

  // ── Modal helpers (injected by GameStage via UtilDlgEx) ─────────────────

  modals: {
    yesNo: (msg: string, cb: (ok: boolean) => void) => void;
    askCount: (msg: string, def: number, max: number, cb: (n: number) => void) => void;
  } | null = null;

  // ── Send flows ──────────────────────────────────────────────────────────

  private _gate(): boolean {
    if (this._requestSent) return false;
    this._requestSent = true;
    return true;
  }

  /** OG SendBuyRequest @0x6E9BB0. */
  SendBuyRequest(): void {
    const list = this._curBuyList();
    const sel = this._buySelected;
    if (sel < 0 || sel >= list.length || !this.modals || !this._gate()) return;
    const item = list[sel];
    if (item.price === 0 && item.tokenPrice === 0) { this._requestSent = false; return; }

    // Level gates (SP 0x154F / 0x154E)
    if (item.levelLimited < 0 && this._userData.level > -item.levelLimited) {
      this.onNotice?.(`Only characters below level ${-item.levelLimited} can purchase this.`);
      this._requestSent = false;
      return;
    }
    if (item.levelLimited > 0 && this._userData.level < item.levelLimited) {
      this.onNotice?.(`You must be at least level ${item.levelLimited} to purchase this.`);
      this._requestSent = false;
      return;
    }

    const finish = (count: number) => {
      // pos = recommended tab ? m_anOriginalIndex[m_nBuySelected] : direct idx
      const pos = this._tabBuy.curTab ? this._originalIndex[sel] : sel;
      // OG sends the discounted price; the server validates against its raw
      // table price and always encodes nDiscountRate=0, so send raw.
      this.OnBuy?.(pos, item.itemId, count, item.price);
    };

    const moneyFlow = () => {
      if (this._isStackedPurchase(item)) {
        this.modals!.yesNo(this._buyWarnText(item, 1), (ok) => {
          if (!ok) { this._requestSent = false; return; }
          this._checkMesoAndSend(item, 1, finish);
        });
      } else {
        this.modals!.askCount(this._buyWarnText(item, item.maxPerSlot), 1, item.maxPerSlot, (n) => {
          if (n <= 0 || n > item.maxPerSlot) { this._requestSent = false; return; }
          this._checkMesoAndSend(item, n, finish);
        });
      }
    };

    if (item.price !== 0) {
      moneyFlow();
    } else {
      // Token purchase path (SP 0x1551 confirm / SP 5438 shortfall)
      const owned = this._countItemOf?.(item.tokenId) ?? 0;
      const confirm = (count: number) => {
        const cost = count * item.tokenPrice;
        if (cost <= 0 || owned < cost) {
          this.onNotice?.(`Not enough tokens to purchase ${item.name}.`);
          this._requestSent = false;
          return;
        }
        finish(count);
      };
      const askThenConfirm = () => {
        this.modals!.yesNo(
          `Exchange ${item.tokenPrice} tokens for ${item.name}? You have ${owned}.`,
          (ok) => { if (!ok) { this._requestSent = false; return; } confirm(1); },
        );
      };
      if (item.maxPerSlot === 1) {
        askThenConfirm();
      } else {
        this.modals!.askCount(`How many ${item.name} (max ${item.maxPerSlot})?`, 1, item.maxPerSlot, (n) => {
          if (n <= 0 || n > item.maxPerSlot) { this._requestSent = false; return; }
          this.modals!.yesNo(
            `Exchange ${n * item.tokenPrice} tokens for ${item.name}? You have ${owned}.`,
            (ok) => { if (!ok) { this._requestSent = false; return; } confirm(n); },
          );
        });
      }
    }
  }

  private _isStackedPurchase(item: ShopItem): boolean {
    // OG: is_treat_singly(itemID) || nMaxPerSlot > 1 → YesNo with count 1.
    return item.maxPerSlot > 1;
  }

  private _buyWarnText(item: ShopItem, count: number): string {
    const total = count * item.price;
    return `Purchase ${count > 1 ? `${count} ` : ''}${item.name} for ${formatInteger(total)} mesos?`;
  }

  private _checkMesoAndSend(item: ShopItem, count: number, finish: (n: number) => void): void {
    const total = count * item.price;
    if (total <= 0 || this._meso < total) {
      this.onNotice?.('Not enough mesos.');
      this._requestSent = false;
      return;
    }
    finish(count);
  }

  /** OG SendSellRequest @0x6E7260. */
  SendSellRequest(): void {
    const sel = this._sellSelected;
    if (sel < 0 || sel >= this._sellItems.length || !this.modals || !this._gate()) return;
    const item = this._sellItems[sel];
    // OG: IsProtectedItem → SP 0xD78 notice; treat_singly → YesNo(SP 0x363,
    // count 1); else AskItemCount(default=nStock, max=nStock). The treat-singly
    // flag is not tracked client-side in this data set → ask-count always.
    this.modals.askCount(
      `Sell ${item.name} (you have ${item.stock}) for how many?`,
      item.stock, item.stock,
      (n) => {
        if (n <= 0 || n > item.stock) { this._requestSent = false; return; }
        this.OnSell?.(item.slot, item.itemId, n);
      },
    );
  }

  /** OG SendRechargeRequest @0x6E4E90 — YesNo then full-stack recharge. */
  SendRechargeRequest(row: number): void {
    const sel = this._sbSell.pos + row;
    if (sel < 0 || sel >= this._sellItems.length || !this.modals || !this._gate()) return;
    const item = this._sellItems[sel];
    if (!item.rechargeable || item.rechargePrice <= 0) { this._requestSent = false; return; }
    this.modals.yesNo(
      `Recharge ${item.name} to full for ${formatInteger(Math.ceil(item.rechargePrice))} mesos?`,
      (ok) => {
        if (!ok) { this._requestSent = false; return; }
        this.OnRecharge?.(item.slot);
      },
    );
  }

  /** OG SetRet @0x6E4B80 — ALWAYS sends close [66][3] first. */
  private _setRet(): void {
    this.OnClose?.();
    this.isVisible = false;
  }

  // ── Hit-testing (GetItemIndexFromPoint @0x6E3C00) ───────────────────────

  /** Returns {buy, idx} per OG out-params, null on miss. */
  getItemIndexFromPoint(lx: number, ly: number): { buy: boolean; idx: number } | null {
    const selW = this._canvasSelect?.Width ?? 165;
    const selH = this._canvasSelect?.Height ?? 35;
    let pos = this._sbBuy.pos;
    const buyList = this._curBuyList();
    for (let y = GRID_TOP; y < GRID_HIT_BOTTOM; y += ROW_PITCH) {
      if (pos >= buyList.length) break;
      if (lx >= BUY_X && lx < BUY_X + selW && ly >= y && ly < y + selH) return { buy: true, idx: pos };
      pos++;
    }
    pos = this._sbSell.pos;
    for (let y = GRID_TOP; ; y += ROW_PITCH) {
      if (pos >= this._sellItems.length) return null;
      if (lx >= SELL_X && lx < SELL_X + selW && ly >= y && ly < y + selH) return { buy: false, idx: pos };
      pos++;
      if (y + ROW_PITCH >= GRID_HIT_BOTTOM) return null;
    }
  }

  // ── Frame ───────────────────────────────────────────────────────────────

  update(_dt: number): void {
    if (!this.isVisible) return;
    this.draw();
  }

  draw(): void {
    if (!this.isVisible) return;
    for (const c of this._dyn) c.destroy({ children: true });
    this._dyn = [];
    this._drawBuyColumn();
    this._drawSellColumn();
    this._drawMoney();
  }

  private _add<T extends Container>(c: T): T {
    this._dyn.push(c);
    this._root.addChild(c);
    return c;
  }

  private _blitIcon(spr: WzSprite, x: number, y: number): void {
    const ic = this._add(new Container());
    const pixi = spr.ToPixi();
    pixi.position.set(-spr.OriginX, -spr.OriginY);
    ic.position.set(x, y);
    ic.addChild(pixi);
  }

  private _text(str: string, x: number, y: number, style: TextStyle = _fontStyle): Text {
    const t = new Text({ text: str, style });
    t.position.set(x, y);
    return this._add(t);
  }

  /** OG DrawBuyItem @0x6E8600. */
  private _drawBuyColumn(): void {
    const list = this._curBuyList();
    const start = this._sbBuy.pos;
    for (let i = 0; i < VISIBLE_ROWS; i++) {
      const idx = start + i;
      if (idx >= list.length) break;
      const item = list[idx];
      const ry = GRID_TOP + ROW_PITCH * i;

      if (idx === this._buySelected && this._canvasSelect) {
        this._blitIcon(this._canvasSelect, SELECT_BUY_X, ry);
      }
      if (item.icon) this._blitIcon(item.icon, ICON_BUY_X, ry + 34);
      this._text(truncate(item.name || `[${item.itemId}]`, NAME_MAX_W), NAME_BUY_X, ry + 2);

      if (item.tokenPrice !== 0 && item.price === 0 && this._tokenIcon(item.tokenId)) {
        this._blitIcon(this._tokenIcon(item.tokenId)!, MESO_BAG_X, ry + 21);
        this._text(formatInteger(item.tokenPrice), PRICE_BUY_X, ry + 21);
      } else {
        if (this._canvasMeso) this._blitIcon(this._canvasMeso, MESO_BAG_X, ry + 21);
        // Discount rendering: strike-through old + red new (server always
        // sends rate 0 today; kept for parity).
        const discounted = discountByRate(item.price, item.discountRate);
        if (discounted > 0 && discounted < item.price) {
          const oldStr = formatInteger(item.price);
          this._text(oldStr, PRICE_BUY_X, ry + 21);
          const strike = new Graphics();
          strike.moveTo(PRICE_BUY_X, ry + 23).lineTo(PRICE_BUY_X + textWidth(oldStr, _fontStyle), ry + 23);
          strike.stroke({ color: 0x000000, alpha: 0xA0 / 255, width: 1 });
          this._add(strike);
          this._text(formatInteger(discounted), PRICE_BUY_X + textWidth(oldStr, _fontStyle) + 5, ry + 21, _redStyle);
        } else {
          this._text(formatInteger(item.price), PRICE_BUY_X, ry + 21);
        }
      }
      // stack digits under the icon when stackable (draw_number_by_image)
      if (item.maxPerSlot > 1) {
        this._text(`${item.maxPerSlot}`, ICON_BUY_X, ry + 22);
      }
    }
  }

  private _tokenIcons = new Map<number, WzSprite | null>();
  private _tokenIcon(tokenId: number): WzSprite | null {
    if (!this._tokenIcons.has(tokenId)) {
      this._tokenIcons.set(tokenId, this._itemIconOf?.(tokenId) ?? null);
    }
    return this._tokenIcons.get(tokenId) ?? null;
  }

  /** OG DrawSellItem @0x6E56F0. */
  private _drawSellColumn(): void {
    const start = this._sbSell.pos;
    for (const b of this._btRecharge) {
      if (b) { b.container.removeFromParent(); b.container.destroy({ children: true }); }
    }
    this._btRecharge = [null, null, null, null, null];

    for (let i = 0; i < VISIBLE_ROWS; i++) {
      const idx = start + i;
      if (idx >= this._sellItems.length) break;
      const item = this._sellItems[idx];
      const ry = GRID_TOP + ROW_PITCH * i;

      if (idx === this._sellSelected && this._canvasSelect) {
        this._blitIcon(this._canvasSelect, SELECT_SELL_X, ry);
      }
      if (item.icon) this._blitIcon(item.icon, ICON_SELL_X, ry + 34);
      this._text(truncate(item.name || `[${item.itemId}]`, NAME_MAX_W), NAME_SELL_X, ry + 2);
      this._text(formatInteger(item.price), NAME_SELL_X, ry + 22);

      if (item.rechargeable && item.rechargePrice > 0) {
        // Recharge price right-aligned ending x=440 (rowTop+20)
        const txt = formatInteger(Math.ceil(item.rechargePrice));
        const w = textWidth(txt, _fontStyle);
        this._text(txt, RECHARGE_PRICE_END - w, ry + 20);
        // lazy BtRecharge (id 2000+i) for this visible row
        if (this._btRechargeProto && this._loader && this._rechargeProp) {
          const b = Button.fromWz(this._loader, this._rechargeProp, 'Charge');
          b.onClick = () => this.SendRechargeRequest(i);
          b.container.position.set(RECHARGE_PRICE_END_DISCOUNT + 4, ry + 11);
          this._root.addChild(b.container);
          this._btRecharge[i] = b;
        }
      }
      // stack digits for TI 2/3/4 rows at x=241
      const tiGroup = Math.floor(item.itemId / 1000000);
      if (tiGroup === 2 || tiGroup === 3 || tiGroup === 4) {
        this._text(`${item.stock}`, SELL_X, ry + 22);
      }
    }
  }

  /** OG DrawMoney @0x6E6FE0. */
  private _drawMoney(): void {
    const str = formatInteger(this._meso);
    const w = textWidth(str, _moneyStyle);
    this._text(str, MONEY_END_X - w, MONEY_Y, _moneyStyle);
  }

  // ── Input (OnMouseButton @0x6EB6F0: down selects, up on same fires) ─────

  handleMouseButton(mx: number, my: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    const lx = mx - this._root.x;
    const ly = my - this._root.y;

    for (const b of [this._btExit, this._btBuy, this._btSell]) {
      if (b?.handleMouseButton(lx, ly, down)) return true;
    }
    for (const b of this._btRecharge) {
      if (b && b.handleMouseButton(lx, ly, down)) return true;
    }
    if (this._tabBuy.handleMouseButton(lx - this._tabBuy.x, ly - this._tabBuy.y, down)) return true;
    if (this._tabSell.handleMouseButton(lx - this._tabSell.x, ly - this._tabSell.y, down)) return true;
    if (this._sbBuy.handleMouseButton(lx, ly, down)) return true;
    if (this._sbSell.handleMouseButton(lx, ly, down)) return true;

    const hit = this.getItemIndexFromPoint(lx, ly);
    if (down) {
      // msg 513: store selection, clearing the other
      if (hit) {
        if (hit.buy) { this._buySelected = hit.idx; this._sellSelected = -1; }
        else { this._sellSelected = hit.idx; this._buySelected = -1; }
        this.draw();
      }
      return !!hit || this._inWindow(lx, ly);
    }
    // msg 515: release over the SAME selection fires the request
    if (hit) {
      if (hit.buy && hit.idx === this._buySelected) this.SendBuyRequest();
      else if (!hit.buy && hit.idx === this._sellSelected) this.SendSellRequest();
      return true;
    }
    return this._inWindow(lx, ly);
  }

  private _inWindow(lx: number, ly: number): boolean {
    return lx >= 0 && lx < WIN_W && ly >= 0 && ly < WIN_H;
  }

  onMouseWheel(_x: number, _y: number, delta: number): void {
    if (!this.isVisible) return;
    const d = delta > 0 ? 1 : -1;
    this._sbBuy.pos += d;
    this._sbSell.pos += d;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    // OG OnKey @0x6E3950: ESC/ENTER swallowed while an NPC shop is open.
    if (key === 'Escape') { this._setRet(); return true; }
    return key === 'Enter' ? true : false;
  }

  onResize(w: number, h: number): void {
    this._root.x = Math.floor((w - WIN_W) / 2);
    this._root.y = Math.floor((h - WIN_H) / 2);
  }

  setPosition(x: number, y: number): void {
    this._root.x = x;
    this._root.y = y;
  }
}

// OG result sub-codes (static OnPacket @0x6EB7D0). StringPool ids unresolved
// in this data set — plain-text equivalents.
const SHOP_RESULT_TEXT: Record<number, string> = {
  1: 'The item is not in stock.',
  5: 'The item is not in stock.',
  9: 'The item is not in stock.',
  2: 'You do not have enough mesos.',
  10: 'You do not have enough mesos.',
  3: 'That item cannot be purchased.',
  13: 'You cannot purchase any more of this item.',
  16: 'The trade has failed.',
  17: 'You cannot trade that item here.',
  18: 'You have exceeded the meso limit.',
};
