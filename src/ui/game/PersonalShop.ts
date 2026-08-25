import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { Button } from '../Button.js';
import { TextField } from '../TextField.js';
import { ScrollBar } from './ScrollBar.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';

// ─────────────────────────────────────────────────────────────────────────────
// CPersonalShopDlg port (v95 IDB).
//   ctor 0x69E6C0 / OnCreate 0x69EBA0 / Draw 0x698D50 / GetItemIndexFromPoint
//   0x697B90 / GetRectIndexFromPoint 0x698240 / SetScrollBar 0x697C20 /
//   Update 0x69B340 / OnButtonClicked 0x69C080 / CPutItemDlg 0x69CE70 /
//   CSoldItemDlg 0x69BD00. Window is WZ-driven from
//   UI/UIWindow2.img/PersonalShop/{main,saleAdd,saleList}.
// ─────────────────────────────────────────────────────────────────────────────

export interface ShopItemSlot {
  index: number;
  itemId: number;
  name: string;
  setCount: number;
  setSize: number;
  price: number;
}

/** CPersonalShopDlg::SOLD_ITEM — one entry of the sold-history dialog. */
export interface SoldItemRecord {
  itemId: number;
  itemName: string;
  /** total units sold = setSize * bundles */
  number: number;
  buyerName: string;
  price: number;
}

// Item grid — GetItemIndexFromPoint @0x697B90: row i rect x[10,208],
// y[161+42i, 200+42i]; 5 visible rows; absIdx = buyScrollPos + i.
const GRID_LEFT = 10;
const GRID_RIGHT = 208;
const GRID_TOP = 161;
const ROW_PITCH = 42;
const ROW_HEIGHT = 39;
const VISIBLE_ROWS = 5;

// Chat area — EnableChat(225,163,270,150) + DrawTextA: 9 lines at
// (227,165+k*16), wrap budget m_nWidth-14 = 256px.
const CHAT_LEFT = 225;
const CHAT_TOP = 163;
const CHAT_W = 270;
const CHAT_H = 150;
const CHAT_LINE_PITCH = 16;
const CHAT_VISIBLE_LINES = 9;
const CHAT_WRAP_W = 256;
const CHAT_MAX_LINES = 1000; // OG caps m_aChatText at 0x3E8 entries

// Owner idle-kick — Update @0x69B340 uses 0x36EE80 ms.
const VISITOR_IDLE_KICK_MS = 3_600_000;

const _titleStyle = new TextStyle({ fill: 0x000000, fontSize: 12, fontWeight: 'bold', fontFamily: 'Arial' });
const _smallWhite = new TextStyle({ fill: 0xFFFFFF, fontSize: 11, fontFamily: 'Arial' });
const _smallGray = new TextStyle({ fill: 0x575757, fontSize: 11, fontFamily: 'Arial' });
const _priceStyle = new TextStyle({ fill: 0x402000, fontSize: 11, fontFamily: 'Arial' });
const _hintStyle = new TextStyle({ fill: 0x666666, fontSize: 10, fontFamily: 'Arial' });

function formatInteger(n: number): string {
  return Math.trunc(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function truncate(text: string, maxW: number, measure: (s: string) => number): string {
  if (measure(text) <= maxW) return text;
  let out = text;
  while (out.length > 1 && measure(out + '..') > maxW) out = out.slice(0, -1);
  return out + '..';
}

export class PersonalShop extends GamePanel {
  OnBuyItem: ((index: number, count: number) => void) | null = null;
  OnLeave: (() => void) | null = null;
  OnPutItem: ((invType: number, position: number, setCount: number, setSize: number, price: number) => void) | null = null;
  OnBalloonOpen: ((open: boolean) => void) | null = null;
  /** OG: CPersonalShopDlg::OnSoldItemResult (0x69a670). */
  OnSoldItem: ((itemIndex: number, quantity: number, buyerName: string) => void) | null = null;
  /** OG: MoveItemToInventory @0x6987A0 → [144][27][short idx]. */
  OnMoveItemToInventory: ((index: number) => void) | null = null;
  /** OG: OnClickBanButton @0x69B1C0 → [144][28][slot][name]. */
  OnBan: ((slot: number, name: string) => void) | null = null;
  /** OG: Update @0x69B340 owner idle-kick → [144][29][slot][name]. */
  OnKickTimeOver: ((slot: number, name: string) => void) | null = null;
  /** OG: BtEnter/OnKey(Enter) → CheckAndSendChat → [144][6]. */
  OnChatSubmit: ((text: string) => void) | null = null;

  /** Set by GameStage when an inventory item is selected while this panel is
      open as owner — consumed on PutItem-drag onto an empty slot. */
  pendingItem: { invType: number; position: number; stackSize: number } | null = null;

  private _loader: WzTextureLoader | null;
  private _ui: WzPackage | null;

  // state — mirrors CPersonalShopDlg members
  private _title = '';
  private _isOwner = false;
  private _myPosition = -1;
  private _items: ShopItemSlot[] = [];
  private _itemMaxCount = 16;
  private _balloonOpen = false;      // m_bOpen
  private _buySelected = -1;         // m_nBuySelected
  private _names: string[] = ['', '', '', ''];  // GetUserID(slot)
  private _enterTimes: number[] = [0, 0, 0, 0];
  private _statusLine = '';
  private _chatLines: { text: string; color: number }[] = [];
  private _soldItems: SoldItemRecord[] = []; // m_aSoldItem
  private _totSold = 0;
  private _totReceived = 0;

  // controls
  private _buttons = new Map<number, Button>();
  private _banButtons: (Button | null)[] = [null, null, null];
  private _buyScroll: ScrollBar | null = null;
  private _chatScroll: ScrollBar | null = null;
  private _chatEdit: TextField | null = null;
  private _selectSprite: WzSprite | null = null;

  // sub-dialogs
  private _putDlg: PutItemDialog | null = null;
  private _soldDlg: SoldItemDialog | null = null;

  constructor(loader: WzTextureLoader | null, ui: WzPackage | null, _font: unknown = null) {
    super();
    this._loader = loader;
    this._ui = ui;
    this.isVisible = false;
    this.container.position.set(120, 40);

    const main = this._prop('UIWindow2.img/PersonalShop/main');
    this._addBackdrops(main);

    // Buttons — OnCreate @0x69EBA0 AddButton table. Origin-placed buttons get
    // container position (0,0): the WZ origin node offsets the sprite itself.
    this._addButton('UIWindow2.img/PersonalShop/main/BtStart', 1001, 0, 0, () => this._onStart());
    this._addButton('UIWindow2.img/PersonalShop/main/BtBuy', 1003, 0, 0, () => this._onBuy());
    this._addButton('UIWindow2.img/PersonalShop/main/BtClose', 1002, 0, 0, () => this.OnLeave?.());
    this._addButton('UIWindow2.img/PersonalShop/main/BtExit', 1010, 0, 0, () => this._leave());
    this._addButton('UIWindow2.img/PersonalShop/main/BtInfo', 1004, 0, 0, () => { /* character info request */ });
    this._addButton('UIWindow2.img/PersonalShop/main/BtItem', 1005, 0, 0, () => this._toggleSoldDlg());
    this._addButton('UIWindow2.img/PersonalShop/main/BtEnter', 1006, 0, 0, () => this._submitChat());
    for (let i = 0; i < 3; i++) {
      const b = this._addButton('UIWindow2.img/PersonalShop/main/BtBan', 1007 + i, 302 + i * 92, 117,
        () => this._onBanClick(i + 1));
      b.container.visible = false;
      this._banButtons[i] = b;
    }
    // BtArrange/Coin/BlackList/Visit + BtExit2 are hidden unconditionally by
    // OnEnterResult in the personal-shop flow (entrusted-shop-only controls).
    for (const [path, id] of [
      ['UIWindow2.img/PersonalShop/main/BtArrange', 1015],
      ['UIWindow2.img/PersonalShop/main/BtCoin', 1016],
      ['UIWindow2.img/PersonalShop/main/BtBlackList', 1017],
      ['UIWindow2.img/PersonalShop/main/BtVisit', 1018],
    ] as const) {
      const b = this._addButton(path, id, 0, 0, () => { });
      b.container.visible = false;
    }

    const selectNode = main?.Get('select');
    if (selectNode instanceof WzCanvas && loader) this._selectSprite = loader.Load(selectNode);

    this._buyScroll = new ScrollBar(197, 160, 204, () => this.draw(), loader && ui ? { loader, uiWz: ui } : undefined);
    this.container.addChild(this._buyScroll.container);
    this._chatScroll = new ScrollBar(488, 161, 155, () => this.draw(), loader && ui ? { loader, uiWz: ui } : undefined);
    this.container.addChild(this._chatScroll.container);

    // Chat edit — CCtrlEdit id 1013 @(225,325) 211x15, white bg #555555 text.
    this._chatEdit = new TextField(null);
    this._chatEdit.setPosition(CHAT_LEFT, 325);
    this._chatEdit.width = 211;
    this._chatEdit.height = 15;
    this._chatEdit.maxLength = 256;
    this._chatEdit.textColor = 0x555555;
    this._chatEdit.drawBackground = true;
    this.container.addChild(this._chatEdit.container);

    this._applyModeVisibility();
  }

  // ── WZ helpers ───────────────────────────────────────────────────────────

  private _prop(path: string): WzProperty | null {
    const n = this._ui?.GetItem(path);
    return n instanceof WzProperty ? n : null;
  }

  private _addBackdrops(main: WzProperty | null): void {
    if (!main || !this._loader) return;
    for (const name of ['backgrnd', 'backgrnd2', 'backgrnd3']) {
      const c = main.Get(name);
      if (c instanceof WzCanvas) {
        const sp = this._loader.Load(c);
        if (!sp) continue;
        const s = sp.ToPixi();
        s.position.set(-sp.OriginX, -sp.OriginY);
        this.container.addChildAt(s, Math.min(2, this.container.children.length));
      }
    }
  }

  private _addButton(path: string, id: number, dx: number, dy: number, onClick: () => void): Button {
    const node = this._prop(path);
    const btn = node && this._loader ? Button.fromWz(this._loader, node, '') : new Button('');
    btn.onClick = onClick;
    btn.container.position.set(dx, dy);
    this.container.addChild(btn.container);
    this._buttons.set(id, btn);
    return btn;
  }

  private _button(id: number): Button | null { return this._buttons.get(id) ?? null; }

  // ── Open / mode ──────────────────────────────────────────────────────────

  OpenAsOwner(title: string, items: ShopItemSlot[]): void {
    this._title = title;
    this._items = items;
    this._isOwner = true;
    this._myPosition = 0;
    this._names[0] = ''; // filled by GameStage via setSelfName
    this._balloonOpen = false;
    this._buySelected = -1;
    this.pendingItem = null;
    this.isVisible = true;
    this._syncScrollBar();
    this._applyModeVisibility();
    this.draw();
  }

  OpenAsVisitor(title: string, items: ShopItemSlot[], visitorIndex: number): void {
    this._title = title;
    this._items = items;
    this._isOwner = false;
    this._myPosition = visitorIndex;
    this._balloonOpen = true;
    this._buySelected = -1;
    this.isVisible = true;
    this._syncScrollBar();
    this._applyModeVisibility();
    this.draw();
  }

  setSelfName(name: string): void { this._names[0] = name; }

  get myPosition(): number { return this._myPosition; }
  get balloonOpen(): boolean { return this._balloonOpen; }

  /** MRP_Leave for another visitor — clear their plate + ban button. */
  OnUserLeave(slot: number): void {
    if (slot < 1 || slot > 3) return;
    this._names[slot] = '';
    this._enterTimes[slot] = 0;
    this._applyModeVisibility();
    this.draw();
  }

  Refresh(items: ShopItemSlot[]): void {
    this._items = items;
    this._syncScrollBar();
    this.draw();
  }

  /** MRP_Enter (enterBase): a visitor took a seat. */
  OnUserEnter(slot: number, name: string): void {
    if (slot < 1 || slot > 3) return;
    this._names[slot] = name;
    this._enterTimes[slot] = Date.now();
    this._applyModeVisibility();
    this.draw();
  }

  /** PSP_MoveItemToInventory result: listing removed from the shop. */
  OnMoveItemResult(itemIndex: number): void {
    this._items.splice(itemIndex, 1);
    this._syncScrollBar();
    this.draw();
  }

  AcceptBuyResult(resultCode: number): void {
    if (resultCode === 0) return; // silent success per OnBuyResult
    this._statusLine = BUY_RESULT_TEXT[resultCode] ?? BUY_RESULT_TEXT[13];
    this.draw();
  }

  SetShopStatus(message: string): void {
    this._statusLine = message;
    this.isVisible = true;
    this.draw();
  }

  /** OG OnSoldItemResult: qty is bundle multiplier against the listing's set. */
  NotifySoldItem(itemIndex: number, multiplier: number, buyerName: string): void {
    const slot = this._items[itemIndex];
    const number = (slot?.setSize ?? 1) * multiplier;
    const record: SoldItemRecord = {
      itemId: slot?.itemId ?? 0,
      itemName: slot?.name ?? '',
      number,
      buyerName,
      price: slot?.price ?? 0,
    };
    this._soldItems.push(record);
    const revenue = record.price * number; // OG divides/multiplies by set — cancels out
    this._totSold += revenue;
    this._totReceived += revenue - personalShopTax(revenue);
    this._soldDlg?.SetRecords(this._soldItems);
    this.OnSoldItem?.(itemIndex, number, buyerName);
    this.draw();
  }

  get soldItems(): SoldItemRecord[] { return this._soldItems; }
  get totSold(): number { return this._totSold; }
  get totReceived(): number { return this._totReceived; }
  getItem(index: number): ShopItemSlot | null { return this._items[index] ?? null; }

  ClosedByServer(reason: number): void {
    this.isVisible = false;
    this._soldDlg?.close();
    this._putDlg?.close();
    const msg = LEAVE_REASON_TEXT[reason];
    if (msg !== undefined) this._statusLine = msg;
  }

  // ── Per-frame ────────────────────────────────────────────────────────────

  update(_dt: number): void {
    // OG Update @0x69B340 — owner auto-kicks visitors idle > 1 hour with
    // [144][29][slot][name].
    if (this._isOwner && this.isVisible) {
      for (let slot = 1; slot <= 3; slot++) {
        const t = this._enterTimes[slot];
        if (t > 0 && Date.now() - t > VISITOR_IDLE_KICK_MS) {
          this._enterTimes[slot] = 0;
          this.OnKickTimeOver?.(slot, this._names[slot]);
        }
      }
    }
    this._putDlg?.update(_dt);
    this._soldDlg?.update(_dt);
    this.draw();
  }

  // ── Draw (OG Draw @0x698D50 order) ──────────────────────────────────────

  draw(): void {
    if (!this.isVisible) return;
    this._redrawDynamic();
  }

  private _dyn: Container[] = [];

  private _clearDyn(): void {
    for (const c of this._dyn) c.destroy({ children: true });
    this._dyn = [];
  }

  private _addDyn<T extends Container>(c: T): T {
    this._dyn.push(c);
    this.container.addChild(c);
    return c;
  }

  private _text(str: string, x: number, y: number, style: TextStyle, maxW?: number): Text {
    const t = new Text({ text: maxW ? truncate(str, maxW, (s) => textWidth(s, style)) : str, style });
    t.position.set(x, y);
    return this._addDyn(t);
  }

  private _redrawDynamic(): void {
    this._clearDyn();

    // 3. shop title @(23,10) FONT_BASIC_BLACK_B
    this._text(this._title, 23, 10, _titleStyle, 496);

    // 4. owner name centered at (57 − w/2, 134), truncated to 83px
    const ownerName = this._names[0];
    if (ownerName) {
      const w = Math.min(textWidth(ownerName, _smallWhite), 83);
      this._text(ownerName, 57 - w / 2, 134 - 8, _smallWhite, 83);
    }

    // 5. money right-aligned ending x=204 y=133 SMALL_GRAY
    const moneyText = this._text(formatInteger(this._moneyOf?.(this._money) ?? this._money), 0, 125, _smallGray);
    moneyText.x = 204 - moneyText.width;

    // 6. item rows
    const scroll = this._buyScroll?.pos ?? 0;
    for (let i = 0; i < VISIBLE_ROWS; i++) {
      const absIdx = scroll + i;
      if (absIdx >= this._items.length) break;
      const item = this._items[absIdx];
      const rowTop = GRID_TOP + ROW_PITCH * i;
      const yOff = rowTop;

      // selection bar blit at (47, rowTop) when selected and in stock
      if (this._buySelected === absIdx && item.setCount > 0 && this._selectSprite) {
        const s = this._addDyn(new Container());
        const pixi = this._selectSprite.ToPixi();
        pixi.position.set(-this._selectSprite.OriginX, -this._selectSprite.OriginY);
        s.position.set(47, yOff);
        s.addChild(pixi);
      }
      // icon at (12,163+42i) via DrawItemIconForSlot (origin-anchored blit)
      const icon = this.iconOf?.(item.itemId);
      if (icon) {
        const ic = this._addDyn(new Container());
        const pixi = icon.ToPixi();
        pixi.position.set(-icon.OriginX, -icon.OriginY);
        ic.position.set(12, yOff + 2);
        ic.addChild(pixi);
      }
      // sold-out veil DrawRectangle(10,rowTop,199,35,0x80FFFFFF)
      if (item.setCount <= 0) {
        const veil = new Graphics();
        veil.rect(GRID_LEFT, yOff, 199, 35).fill({ color: 0xFFFFFF, alpha: 0x80 / 255 });
        this._addDyn(veil);
      } else {
        // quantity digits at (11,184+42i) showing nNumber*nSet for stackables
        const group = Math.floor(item.itemId / 10000);
        if (group === 207 || group === 233 || (item.setSize > 1)) {
          this._text(`${item.setCount * item.setSize}`, 11, yOff + 23 - 8, _smallGray);
        }
      }
      // name @(51,162+42i) truncated 160px
      this._text(item.name || this._itemName(item.itemId), 51, yOff + 1, _smallGray, 160);
      // price line @(51,180+42i)
      const bundled = item.setSize > 1;
      const priceStr = bundled
        ? `${formatInteger(item.price)} mesos x ${item.setSize}`
        : `${formatInteger(item.price)} mesos`;
      this._text(priceStr, 51, yOff + 19, _priceStyle);
    }

    // participant name plates — visitors at (92*slot − w/2 + 180, 133), 83px cap
    for (let slot = 1; slot <= 3; slot++) {
      const name = this._names[slot];
      if (!name) continue;
      const cx = 92 * slot + 180;
      const w = Math.min(textWidth(name, _smallWhite), 83);
      this._text(name, cx - w / 2, 133 - 8, _smallWhite, 83);
    }

    // chat log — 9 lines at (227,165+k*16) from scroll pos
    const start = this._chatScroll?.pos ?? 0;
    for (let k = 0; k < CHAT_VISIBLE_LINES; k++) {
      const entry = this._chatLines[start + k];
      if (!entry) break;
      const t = new Text({
        text: entry.text,
        style: new TextStyle({ fill: entry.color, fontSize: 11, fontFamily: 'Arial', wordWrap: true, wordWrapWidth: CHAT_WRAP_W, breakWords: true }),
      });
      t.position.set(CHAT_LEFT + 2, CHAT_TOP + 2 + k * CHAT_LINE_PITCH);
      this._addDyn(t);
    }

    // status/hint line (TS-only surface for decoded notices; OG shows them as
    // CUtilDlg::Notice popups — see TODO note below).
    if (this._statusLine) {
      const st = new Text({
        text: this._statusLine,
        style: new TextStyle({ fill: 0x883333, fontSize: 10, fontFamily: 'Arial', wordWrap: true, wordWrapWidth: 260 }),
      });
      st.position.set(16, 352);
      this._addDyn(st);
    }

    // hint for owner with a dragged item pending
    if (this._isOwner && this.pendingItem) {
      this._text('Click a listed item to withdraw it, or drop an inventory selection to add.', 16, 368, _hintStyle);
    }
  }

  /** Optional icon provider wired by GameStage (ItemIconLoader). */
  iconOf: ((itemId: number) => WzSprite | null) | null = null;
  nameOf: ((itemId: number) => string) | null = null;
  private _moneyOf: ((fallback: number) => number) | null = null;

  /** GameStage wiring: item names, icons, live meso count. */
  setResolvers(
    nameOf: (id: number) => string,
    iconOf: (id: number) => WzSprite | null,
    moneyOf?: (fallback: number) => number,
  ): void {
    this.nameOf = nameOf;
    this.iconOf = iconOf;
    this._moneyOf = moneyOf ?? null;
  }

  private _itemName(itemId: number): string {
    return this.nameOf?.(itemId) ?? `[${itemId}]`;
  }
  /** Local player's meso count for the money display (GetMoney). */
  _money = 0;
  setMoney(m: number): void { this._money = m; this.draw(); }

  // ── Mouse / keys ────────────────────────────────────────────────────────

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    const px = this.container.position.x;
    const py = this.container.position.y;
    const lx = x - px;
    const ly = y - py;

    if (this._putDlg?.isVisible) return this._putDlg.handleMouseButton(lx, ly, down);
    if (this._soldDlg?.isVisible) return this._soldDlg.handleMouseButton(lx, ly, down);

    for (const b of this._buttons.values()) {
      if (b.container.visible && b.enabled && b.handleMouseButton(lx, ly, down)) return true;
    }
    if (this._buyScroll?.handleMouseButton(lx, ly, down)) return true;
    if (this._chatScroll?.handleMouseButton(lx, ly, down)) return true;
    if (this._chatEdit?.handleMouseButton(lx, ly, down)) return true;

    if (!down) return true;

    // avatar hover rects (GetRectIndexFromPoint @0x698240) — no-op click target

    // item rows — GetItemIndexFromPoint @0x697B90
    const idx = this.getItemIndexFromPoint(lx, ly);
    if (idx >= 0) {
      if (this._isOwner) {
        // owner clicking a listed item withdraws it (MoveItemToInventory)
        if (lx >= 51) { this.OnMoveItemToInventory?.(idx); return true; }
      } else {
        this._buySelected = idx;
        this.draw();
        return true;
      }
    }
    // empty grid area with pending drag-in (owner put-item path)
    if (this._isOwner && this.pendingItem && lx >= GRID_LEFT && lx < GRID_RIGHT &&
        ly >= GRID_TOP && ly < GRID_TOP + ROW_PITCH * VISIBLE_ROWS) {
      this._openPutDialog();
      return true;
    }

    return lx >= 0 && lx < 509 && ly >= 0 && ly < 551;
  }

  /** OG GetItemIndexFromPoint @0x697B90. */
  getItemIndexFromPoint(lx: number, ly: number): number {
    let cur = this._buyScroll?.pos ?? 0;
    for (let y = 200; ; y += ROW_PITCH) {
      if (cur >= 0 && cur < this._items.length) {
        if (lx >= GRID_LEFT && lx <= GRID_RIGHT && ly >= y - ROW_HEIGHT && ly <= y) return cur;
      }
      cur++;
      if (y >= 410) return -1;
    }
  }

  onMouseMove(x: number, y: number): void {
    this._chatEdit?.onMouseMove(x - this.container.position.x, y - this.container.position.y);
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') {
      if (this._putDlg?.isVisible) { this._putDlg.close(); this.draw(); return true; }
      if (this._soldDlg?.isVisible) { this._soldDlg.close(); this.draw(); return true; }
      if (this._chatEdit?.isFocused) { this._chatEdit.isFocused = false; return true; }
      this._leave();
      return true;
    }
    if (this._chatEdit?.isFocused) {
      if (key === 'Enter') { this._submitChat(); return true; }
      if (this._chatEdit.onKeyPress(key)) return true;
      if (key.length === 1) { this._chatEdit.onTextInput(key); return true; }
      return false;
    }
    return false;
  }

  focusChat(): void { if (this._chatEdit) this._chatEdit.isFocused = true; }

  // ── Actions ──────────────────────────────────────────────────────────────

  private _leave(): void {
    this.OnLeave?.();
    this.isVisible = false;
  }

  private _submitChat(): void {
    const text = (this._chatEdit?.text ?? '').trim();
    if (!text) return;
    this._chatEdit!.text = '';
    this.OnChatSubmit?.(text);
  }

  /** BtStart — DeliverBlackList then open the balloon. */
  private _onStart(): void {
    if (this._balloonOpen) return;
    this._balloonOpen = true;
    this.OnBalloonOpen?.(true);
    this._applyModeVisibility();
    this.draw();
  }

  private _onBuy(): void {
    if (this._buySelected < 0) return;
    const item = this._items[this._buySelected];
    if (!item || item.setCount <= 0) { this._statusLine = 'That item is out of stock.'; this.draw(); return; }
    // OG BuyItem opens the numeric-input modal defaulting to nSet*nNumber
    // (the max purchasable total); the count/confirm modals are driven by
    // GameStage via UtilDlgEx.
    this.OnBuyItem?.(this._buySelected, item.setSize * item.setCount);
  }

  private _onBanClick(slot: number): void {
    const name = this._names[slot];
    if (!name) return;
    this.OnBan?.(slot, name);
  }

  private _toggleSoldDlg(): void {
    if (this._soldDlg?.isVisible) { this._soldDlg.close(); this.draw(); return; }
    if (!this._soldDlg) {
      this._soldDlg = new SoldItemDialog(this._loader, this._saleProp('saleList'), this.container);
    }
    this._soldDlg.SetRecords(this._soldItems);
    this._soldDlg.open();
    this.draw();
  }

  private _openPutDialog(): void {
    const pending = this.pendingItem;
    if (!pending) return;
    if (!this._putDlg) {
      this._putDlg = new PutItemDialog(this._loader, this._saleProp('saleAdd'), this.container);
    }
    this._putDlg.Open(pending.stackSize, (bundles, setSize, price) => {
      this.pendingItem = null;
      this.OnPutItem?.(pending.invType, pending.position, bundles, setSize, price);
    }, () => { this.pendingItem = null; });
  }

  private _saleProp(name: string): WzProperty | null {
    return this._prop(`UIWindow2.img/PersonalShop/${name}`);
  }

  /** SetScrollBar @0x697C20 — m_bOpen (owner managing) vs visitor formula. */
  private _syncScrollBar(): void {
    if (!this._buyScroll) return;
    const open = this._isOwner && this._balloonOpen;
    const range = open
      ? (this._items.length > 5 ? this._items.length - 4 : 0)
      : (this._items.length >= this._itemMaxCount ? this._items.length - 4
        : (this._items.length > 4 ? this._items.length - 3 : 0));
    this._buyScroll.setRange(Math.max(range, 1));
  }

  /** OnEnterResult visibility model. */
  private _applyModeVisibility(): void {
    const visitor = !this._isOwner;
    this._button(1001)!.container.visible = this._isOwner && !this._balloonOpen;
    this._button(1002)!.container.visible = this._isOwner && this._balloonOpen;
    this._button(1003)!.container.visible = visitor;
    this._button(1004)!.container.visible = visitor;
    this._button(1005)!.container.visible = this._isOwner;
    this._button(1010)!.container.visible = true;
    for (let i = 0; i < 3; i++) {
      const b = this._banButtons[i];
      if (b) b.container.visible = this._isOwner && !!this._names[i + 1];
    }
  }

  /** ChatLogAdd equivalent — AddChatText @0x639130 with wrap + 1000-line cap. */
  AddChatText(text: string, color = 0x000000): void {
    const words = text.split(' ');
    const lines: string[] = [];
    let cur = '';
    for (const word of words) {
      const cand = cur ? `${cur} ${word}` : word;
      if (textWidth(cand, _smallGray) > CHAT_WRAP_W && cur) {
        lines.push(cur);
        cur = `    ${word}`; // OG 4-space continuation indent
      } else {
        cur = cand;
      }
    }
    if (cur) lines.push(cur);
    const wasAtEnd = (this._chatScroll?.pos ?? 0) >= (this._chatScroll?.maxPosition ?? 0);
    for (const line of lines) {
      this._chatLines.push({ text: line, color });
      if (this._chatLines.length > CHAT_MAX_LINES) this._chatLines.shift();
    }
    this._chatScroll?.setRange(Math.max(this._chatLines.length - CHAT_VISIBLE_LINES + 1, 1));
    if (wasAtEnd && this._chatScroll) this._chatScroll.pos = this._chatScroll.maxPosition;
    this.draw();
  }
}

// OG OnBuyResult @0x69A300 notice mapping — StringPool ids are unresolved in
// this data set, so these are the PlayerShopBuyResult names as plain text.
const BUY_RESULT_TEXT: Record<number, string> = {
  1: 'Purchase failed: out of stock.',
  2: 'Purchase failed: not enough mesos.',
  3: 'Purchase failed: the price is too high.',
  4: 'Purchase failed: the shop owner has too much mesos.',
  5: 'Purchase failed: not enough inventory space.',
  6: 'Purchase failed: this item cannot be purchased together with others.',
  7: 'Purchase failed: this item cannot be used by your gender.',
  8: 'Purchase failed: you are too young to purchase this item.',
  9: 'Purchase failed: this item has expired.',
  10: 'The shop owner declined the trade.',
  11: 'You have been blocked from this shop.',
  12: 'Purchase failed: item verification error.',
  13: 'Purchase failed due to an unknown error.',
  14: 'Purchase failed: meso limit exceeded.',
};

// OG OnLeave self-branch notice reasons (SP ids unresolved — plain text).
const LEAVE_REASON_TEXT: Record<number, string> = {
  1: 'You have been kicked from the shop.',
  3: 'The shop has been closed.',
  5: 'The shop closed because it ran out of time.',
  6: 'The shop is no longer open.',
  14: 'The shop closed: all items have been sold.',
  15: 'The shop closed after a period of inactivity.',
};

/** OG GetPersonalShopTax @0x697920 — display-side tax tiers. */
export function personalShopTax(money: number): number {
  if (money >= 100_000_000) return Math.floor(money * 0.03);
  if (money >= 25_000_000) return Math.floor(money * 0.025);
  if (money >= 10_000_000) return Math.floor(money * 0.02);
  if (money >= 5_000_000) return Math.floor(money * 0.015);
  if (money >= 1_000_000) return Math.floor(money * 0.009);
  if (money >= 100_000) return Math.floor(money * 0.004);
  return 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// CPutItemDlg port ("saleAdd") — listing dialog shown when the owner drops an
// inventory item into the shop. OnCreate @0x69CE70 geometry:
//   edits: count@(101,32) price@(111,51) set@(111,70) each 59x14;
//   checkbox "sell in sets" @(9,91); OK rendered at (89,115), Cancel (133,115),
//   BtClose3 @(w-22,6). SetRet validation: set→count→count%set→price.
// ─────────────────────────────────────────────────────────────────────────────
class PutItemDialog {
  isVisible = false;
  private _root = new Container();
  private _count = new TextField(null);
  private _price = new TextField(null);
  private _set = new TextField(null);
  private _check = false;
  private _checkMark: Graphics | null = null;
  private _maxStack = 1;
  private _onOk: ((bundles: number, setSize: number, price: number) => void) | null = null;
  private _onCancel: (() => void) | null = null;
  private _dyn: Container[] = [];

  constructor(loader: WzTextureLoader | null, prop: WzProperty | null, parent: Container) {
    if (prop && loader) {
      for (const name of ['backgrnd', 'backgrnd2', 'backgrnd3', 'bar']) {
        const c = prop.Get(name);
        if (c instanceof WzCanvas) {
          const sp = loader.Load(c);
          if (!sp) continue;
          const s = sp.ToPixi();
          s.position.set(-sp.OriginX, -sp.OriginY);
          this._root.addChild(s);
        }
      }
    } else {
      const bg = new Graphics();
      bg.rect(0, 0, 183, 141).fill({ color: 0x2A2A3A, alpha: 0.96 });
      bg.rect(0, 0, 183, 141).stroke({ color: 0x777777, width: 1 });
      this._root.addChild(bg);
    }
    for (const f of [this._count, this._price, this._set]) {
      f.width = 59; f.height = 14; f.maxLength = f === this._price ? 10 : 4;
      f.textColor = 0x222222; f.drawBackground = true;
      this._root.addChild(f.container);
    }
    this._count.setPosition(101, 32);
    this._price.setPosition(111, 51);
    this._set.setPosition(111, 70);
    this._root.eventMode = 'static';
    parent.addChild(this._root);
    this._root.visible = false;
  }

  Open(maxStack: number, onOk: (bundles: number, setSize: number, price: number) => void, onCancel: () => void): void {
    this._maxStack = Math.max(1, maxStack);
    this._count.text = String(this._maxStack);
    this._price.text = '';
    this._set.text = '1';
    this._check = false;
    this._onOk = onOk;
    this._onCancel = onCancel;
    this.isVisible = true;
    this._root.visible = true;
    this._count.enabled = true;
    this._set.enabled = false;
    this._drawCheck();
    this._count.isFocused = true;
  }

  close(): void {
    this.isVisible = false;
    this._root.visible = false;
    this._count.isFocused = this._price.isFocused = this._set.isFocused = false;
  }

  private _drawCheck(): void {
    if (this._checkMark) { this._checkMark.destroy(); this._checkMark = null; }
    if (!this._check) return;
    const g = new Graphics();
    g.moveTo(12, 94); g.lineTo(15, 98); g.lineTo(21, 89);
    g.stroke({ color: 0x22AA22, width: 2 });
    this._checkMark = g;
    this._root.addChild(g);
  }

  update(_dt: number): void { }

  onKeyPress(key: string): boolean {
    for (const f of [this._count, this._price, this._set]) {
      if (f.isFocused) {
        if (key === 'Enter') { this._ok(); return true; }
        if (f.onKeyPress(key)) return true;
        if (key.length === 1 && key >= '0' && key <= '9') { f.onTextInput(key); return true; }
      }
    }
    return false;
  }

  handleMouseButton(lx: number, ly: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    if (!down) return true;
    // checkbox @(9,91) 90x14
    if (lx >= 9 && lx < 99 && ly >= 91 && ly < 105) {
      this._check = !this._check;
      this._set.enabled = this._check;
      if (this._check) this._set.isFocused = true;
      this._drawCheck();
      return true;
    }
    // buttons: OK (89,115) Cancel (133,115) close (w-22,6)
    if (lx >= 161 && lx < 183 && ly >= 0 && ly < 22) { this._cancel(); return true; }
    if (ly >= 110 && ly < 131) {
      if (lx >= 69 && lx < 109) { this._cancel(); return true; }
      if (lx >= 109 && lx < 149) { this._ok(); return true; }
    }
    for (const f of [this._count, this._price, this._set]) {
      if (f.handleMouseButton(lx, ly, down)) return true;
      f.isFocused = false;
    }
    return true;
  }

  /** IsNumber @0x69B740 + SetRet validation order: set → count → %set → price. */
  private _ok(): void {
    const parse = (f: TextField, min: number, max: number): number | null => {
      const s = f.text.trim();
      if (!/^\d+$/.test(s)) return null;
      const v = Number(s);
      if (!Number.isSafeInteger(v) || v > max || v < min) return null;
      return v;
    };
    const set = this._check ? (parse(this._set, 1, this._maxStack) ?? -1) : 1;
    if (set < 0) return;
    const count = parse(this._count, 1, this._maxStack);
    if (count === null) return;
    if (count % set !== 0) return; // SP434 divisible-by-set gate
    const price = parse(this._price, 1, 0x7FFFFFFF);
    if (price === null) return;
    const bundles = count / set;
    this.close();
    this._onOk?.(bundles, set, price);
  }

  private _cancel(): void {
    this.close();
    this._onCancel?.();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CSoldItemDlg port ("saleList") — sold-history dialog. OnCreate @0x69BD00:
// scrollbar id2000 (197,27,len226); Draw @0x69D430: 4 rows pitch 58,
// icon ~(38,58i+74), name x50 y58i+29 (152px), buyer y+46, price y+63.
// ─────────────────────────────────────────────────────────────────────────────
class SoldItemDialog {
  isVisible = false;
  private _root = new Container();
  private _scroll: ScrollBar;
  private _records: SoldItemRecord[] = [];
  private _dyn: Container[] = [];

  constructor(loader: WzTextureLoader | null, prop: WzProperty | null, parent: Container) {
    if (prop && loader) {
      for (const name of ['backgrnd', 'backgrnd2', 'backgrnd3']) {
        const c = prop.Get(name);
        if (c instanceof WzCanvas) {
          const sp = loader.Load(c);
          if (!sp) continue;
          const s = sp.ToPixi();
          s.position.set(-sp.OriginX, -sp.OriginY);
          this._root.addChild(s);
        }
      }
    } else {
      const bg = new Graphics();
      bg.rect(0, 0, 217, 263).fill({ color: 0x2A2A3A, alpha: 0.96 });
      bg.rect(0, 0, 217, 263).stroke({ color: 0x777777, width: 1 });
      this._root.addChild(bg);
    }
    this._root.position.set(240, 60);
    this._scroll = new ScrollBar(197, 27, 226, () => this.draw(), loader ? undefined : undefined);
    this._root.addChild(this._scroll.container);
    this._root.eventMode = 'static';
    parent.addChild(this._root);
    this._root.visible = false;
  }

  SetRecords(records: SoldItemRecord[]): void {
    this._records = records;
    this._scroll.setRange(Math.max(this._records.length - 2, 1));
    this.draw();
  }

  open(): void { this.isVisible = true; this._root.visible = true; this.draw(); }
  close(): void { this.isVisible = false; this._root.visible = false; }

  update(_dt: number): void { }

  handleMouseButton(lx: number, ly: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    const ox = this._root.position.x;
    const oy = this._root.position.y;
    if (this._scroll.handleMouseButton(lx - ox, ly - oy, down)) return true;
    if (!down) return true;
    // close button (w-22,6)
    if (lx - ox >= 195 && ly - oy < 22) { this.close(); return true; }
    return lx - ox >= 0 && lx - ox < 217 && ly - oy >= 0 && ly - oy < 263;
  }

  draw(): void {
    if (!this.isVisible) return;
    for (const c of this._dyn) c.destroy({ children: true });
    this._dyn = [];
    const style = new TextStyle({ fill: 0x444444, fontSize: 10, fontFamily: 'Arial' });
    for (let i = 0; i < 4; i++) {
      const rec = this._records[(this._scroll.pos) + i];
      if (!rec) break;
      const base = 58 * i + 24;
      const mk = (str: string, dy: number) => {
        const t = new Text({ text: str, style });
        t.position.set(50, base + dy);
        this._root.addChild(t);
        this._dyn.push(t);
      };
      mk(rec.itemName || `[${rec.itemId}]`, 5);
      mk(`Sold to ${rec.buyerName}`, 22);
      mk(`${formatInteger(rec.price)} mesos`, 39);
    }
  }
}

let _measureCtx: CanvasRenderingContext2D | null | undefined;

function textWidth(s: string, style: TextStyle): number {
  if (typeof document === 'undefined') return s.length * 6;
  if (_measureCtx === undefined) {
    _measureCtx = document.createElement('canvas').getContext('2d');
  }
  if (!_measureCtx) return s.length * 6;
  _measureCtx.font = `${style.fontWeight === 'bold' ? 'bold ' : ''}${style.fontSize}px ${style.fontFamily}`;
  return _measureCtx.measureText(s).width;
}
