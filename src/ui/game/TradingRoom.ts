import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { Button } from '../Button.js';

// ── OG class: CTradingRoomDlg (UIWindow2.img/TradingRoom) ────────────────────
// Window 526x472 (backgrnd), backgrnd2 514x459 origin(-6,-7),
// backgrnd3 442x341 origin(-10,-120).
//
// OnCreate @0x765AB0 control table (all window-relative):
//   chat edit   id 1006 @(281,278) 172x15, white bg, text #555555, font SP0x1A25
//   BtEnter     id 0x3EC(1004)  (chat submit)
//   BtClame     id 0x3ED(1005)  (claim/report — no sender in this build)
//   BtTrade     id 0x3EA(1002)  -> Trade()  = [TRP_Trade]
//   BtCoin      id 0x3EB(1003)  -> PutMoney()
//   BtReset     id 2            -> SetRet(2) = [MRP_Leave] + destroy
//   EnableChat(295, 12, 201, 240) — chat log area
//   scrollbar id 1000 at the right edge of the chat area (504, ~12, len 237,
//   wheelRange 226) — CreateCtrl arg order register-garbled, position inferred
//   from the chat rect.
//
// GetItemIndexFromPoint @0x7637D0 — two 3x3 grids of 32x32 cells, pitch 39x37:
//   MY grid    origin (152,152); index i+1 (1..9)
//   THEIR grid origin (17,152);  index -(i+1)
//
// PutMoney @0x764450: gated !m_bMyLock && m_nCurUsers > 1 + 500ms throttle;
// opens CUtilDlgEx INPUT_NO(default 1, min 1, max = my mesos, 10 digits);
// level > 15 || amount <= 1000000 else SP0xFB2 notice; sends [TRP_PutMoney].
//
// OnPacket @0x7649A0: 15 OnPutItem / 16 OnPutMoney / 17 OnTrade / 18 UnTrade
// 19 MoveItemToInventory / 20 ItemCRC / 21 LimitFail.
// OnLeave @0x764A10: leaveType 2 Cancelled, 7 TradeDone (gain = clamp(money - initMoney, partnerOfferDelta)), 8/9 fail, 12/13 CRC.
// Draw @0x765AB0: grids + money rows + name labels + chat log + confirm overlays.
// ─────────────────────────────────────────────────────────────────────────────
const W = 526;
const H = 472;

const CELL = 32;
const PITCH_X = 39;
const PITCH_Y = 37;
const GRID_ROWS = 3;
const GRID_COLS = 3;
const MY_GRID_X = 152;
const THEIR_GRID_X = 17;
const GRID_Y = 152;

const CHAT_LOG = { x: 295, y: 12, w: 201, h: 240 };
const CHAT_EDIT = { x: 281, y: 278, w: 172, h: 15 };
const MAX_CHAT_LINES = 14;
const CHAT_LINE_H = 14;

export interface TradeItem {
  invType: number;
  itemId: number;
  quantity: number;
}

export class TradingRoom extends GamePanel {
  /** OG PutItem — fired when one of my 9 slots receives an item. */
  OnPutItem: ((index: number, invType: number, position: number, quantity: number) => void) | null = null;
  /** OG MoveItemToInventory — take back own offered item. */
  OnMoveItemToInventory: ((index: number) => void) | null = null;
  /** OG PutMoney — fired after the numeric-input dialog confirms. */
  OnPutMoney: ((amount: number) => void) | null = null;
  /** OG Trade button (id 1002). */
  OnTrade: (() => void) | null = null;
  /** OG UnTrade — cancel own confirmation. */
  OnUnTrade: (() => void) | null = null;
  /** OG SetRet(2)/BtReset — closing sends [MRP_Leave]. */
  OnCancel: (() => void) | null = null;
  /** OG BtEnter — submits the chat edit as [MRP_Chat]. */
  OnChat: ((text: string) => void) | null = null;

  /** Injected numeric-input dialog (OG CUtilDlgEx INPUT_NO). */
  modals: {
    askAmount: (msg: string, def: number, max: number, cb: (amount: number) => void) => void;
    notice: (msg: string) => void;
  } | null = null;

  /** Character level for the PutMoney <=1,000,000 under-lv16 gate. */
  characterLevel = 0;

  private _loader: WzTextureLoader;
  private _uiWz: WzPackage | null;

  private _myItems: (TradeItem | null)[] = new Array(GRID_ROWS * GRID_COLS).fill(null);
  private _theirItems: (TradeItem | null)[] = new Array(GRID_ROWS * GRID_COLS).fill(null);
  private _myMoney = 0;
  private _theirMoney = 0;
  private _myConfirmed = false;
  private _theirConfirmed = false;
  private _partnerName = '';
  private _myPosition = 0;
  private _lastPutMoneyAt = 0;

  /** Set by GameStage when an inventory item is selected while this panel is
      open — consumed (and cleared) on the next "my" slot click. */
  pendingItem: { invType: number; position: number; itemId: number; quantity: number } | null = null;

  // Icon provider wired by GameStage (ItemIconLoader)
  private _iconOf: ((itemId: number) => WzSprite | null) | null = null;

  private _bgLayer: Container;
  private _gridG: Graphics;
  private _chatLogG: Graphics;
  private _slotLabels: Text[][] = [[], []];
  private _iconLayer: Container;
  private _iconSprites: (Container | null)[] = new Array(18).fill(null);
  private _moneyLabels: Text[] = [];
  private _nameLabels: Text[] = [];
  private _noticeLabel: Text;
  private _chatLines: Text[] = [];
  private _chatTexts: string[] = [];
  private _chatScroll = 0;
  private _editText: Text;
  private _editFocused = false;
  private _allButtons: Button[] = [];
  private _btTrade: Button | null = null;
  private _btCoin: Button | null = null;

  // Tooltip hover
  private _hoverTooltip: Text | null = null;
  private _hoverItemId = 0;

  constructor(loader?: WzTextureLoader, ui?: WzPackage | null) {
    super();
    this._loader = loader ?? (null as unknown as WzTextureLoader);
    this._uiWz = ui ?? null;
    this.isVisible = false;
    this.container.position.set(140, 60);

    this._bgLayer = new Container();
    this.container.addChild(this._bgLayer);

    const tr = this._uiWz?.GetItem('UIWindow2.img/TradingRoom');
    const trProp = tr instanceof WzProperty ? tr : null;
    // backgrnd(0,0) / backgrnd2(origin -6,-7) / backgrnd3(origin -10,-120)
    for (const name of ['backgrnd', 'backgrnd2', 'backgrnd3']) {
      const v = trProp?.Get(name);
      if (v instanceof WzCanvas) {
        const spr = this._loader?.Load(v) ?? null;
        if (!spr) continue;
        const pixi = spr.ToPixi();
        const ox = Number(spr.OriginX) || 0;
        const oy = Number(spr.OriginY) || 0;
        pixi.position.set(-ox, -oy);
        this._bgLayer.addChild(pixi);
      }
    }

    this._iconLayer = new Container();
    this.container.addChild(this._iconLayer);

    this._gridG = new Graphics();
    this.container.addChild(this._gridG);
    this._chatLogG = new Graphics();
    this.container.addChild(this._chatLogG);

    // Slot labels (fallback rendering when icons absent).
    for (let i = 0; i < GRID_ROWS * GRID_COLS; i++) {
      const mine = new Text({ text: '', style: new TextStyle({ fill: '#CCCCCC', fontSize: 9, fontFamily: 'monospace' }) });
      const msx = MY_GRID_X + (i % GRID_COLS) * PITCH_X;
      const msy = GRID_Y + Math.floor(i / GRID_COLS) * PITCH_Y;
      mine.position.set(msx + 2, msy + 2);
      this.container.addChild(mine);
      this._slotLabels[0].push(mine);

      const theirs = new Text({ text: '', style: new TextStyle({ fill: '#CCCCCC', fontSize: 9, fontFamily: 'monospace' }) });
      const tsx = THEIR_GRID_X + (i % GRID_COLS) * PITCH_X;
      const tsy = GRID_Y + Math.floor(i / GRID_COLS) * PITCH_Y;
      theirs.position.set(tsx + 2, tsy + 2);
      this.container.addChild(theirs);
      this._slotLabels[1].push(theirs);
    }

    const labelStyle = new TextStyle({ fill: '#E8E0C8', fontSize: 11, fontFamily: 'monospace' });
    const myName = new Text({ text: 'My Offer', style: labelStyle });
    myName.position.set(MY_GRID_X, GRID_Y - 18);
    this.container.addChild(myName);
    this._nameLabels.push(myName);
    const theirName = new Text({ text: '', style: labelStyle });
    theirName.position.set(THEIR_GRID_X, GRID_Y - 18);
    this.container.addChild(theirName);
    this._nameLabels.push(theirName);

    // Money rows under each grid (FONT_NO_BLACK digits in OG; text fallback).
    for (let i = 0; i < 2; i++) {
      const t = new Text({ text: '0 meso', style: new TextStyle({ fill: '#000000', fontSize: 11, fontFamily: 'monospace' }) });
      t.position.set((i === 0 ? MY_GRID_X : THEIR_GRID_X), GRID_Y + GRID_ROWS * PITCH_Y + 6);
      this.container.addChild(t);
      this._moneyLabels.push(t);
    }

    this._noticeLabel = new Text({ text: '', style: new TextStyle({ fill: '#FFD080', fontSize: 10, fontFamily: 'monospace' }) });
    this._noticeLabel.position.set(MY_GRID_X, GRID_Y + GRID_ROWS * PITCH_Y + 24);
    this.container.addChild(this._noticeLabel);

    // Chat edit (281,278,172,15): white bg, #555555 text (OG CREATEPARAM).
    this._editText = new Text({ text: '', style: new TextStyle({ fill: 0x555555, fontSize: 11, fontFamily: 'monospace' }) });
    this._editText.position.set(CHAT_EDIT.x + 2, CHAT_EDIT.y + 1);
    this.container.addChild(this._editText);

    this._loadButtons(trProp);
  }

  setIconProvider(fn: (itemId: number) => WzSprite | null): void { this._iconOf = fn; }

  get myConfirmed(): boolean { return this._myConfirmed; }
  get theirConfirmed(): boolean { return this._theirConfirmed; }

  private _loadButtons(trProp: WzProperty | null): void {
    if (!this._loader || !trProp) return;
    const add = (nodeName: string, id: number, onClick: () => void): Button | null => {
      const node = trProp.Get(nodeName);
      if (!(node instanceof WzProperty)) return null;
      const b = Button.fromWz(this._loader!, node, nodeName);
      b.onClick = onClick;
      this.container.addChild(b.container);
      this._allButtons.push(b);
      return b;
    };
    // Origin-placed buttons self-position via their WZ canvas origins.
    this._btTrade = add('BtTrade', 1002, () => this._onTradeButton());
    this._btCoin = add('BtCoin', 1003, () => this._promptMoney());
    add('BtEnter', 1004, () => this._submitChat());
    add('BtClame', 1005, () => { /* OG id routes to default handler; no claim system */ });
    add('BtReset', 2, () => {
      this.OnCancel?.();
      this.isVisible = false;
    });
  }

  private _slotRect(gridIndex: 0 | 1, i: number): { x: number; y: number; w: number; h: number } {
    const col = i % GRID_COLS;
    const row = Math.floor(i / GRID_COLS);
    return {
      x: (gridIndex === 0 ? MY_GRID_X : THEIR_GRID_X) + col * PITCH_X,
      y: GRID_Y + row * PITCH_Y,
      w: CELL,
      h: CELL,
    };
  }

  // ── Data ────────────────────────────────────────────────────────────────────

  /** OG OnEnterResult: open with the partner's name and my seat (0 or 1). */
  Open(partnerName: string, myPosition: number): void {
    this._partnerName = partnerName;
    this._myPosition = myPosition;
    this._myItems.fill(null);
    this._theirItems.fill(null);
    this._myMoney = 0;
    this._theirMoney = 0;
    this._myConfirmed = false;
    this._theirConfirmed = false;
    this.pendingItem = null;
    this._chatTexts = [];
    this._chatScroll = 0;
    this._chatLines.forEach((t) => (t.visible = false));
    this._clearIcons();
    this._setLocked(false);
    this.isVisible = true;
  }

  get myPosition(): number { return this._myPosition; }
  get partnerName(): string { return this._partnerName; }

  /** OG OnPutItem: userIndex byte + index byte (1..9) + item struct. */
  OnPartnerPutItem(userIndex: number, index: number, item: TradeItem): void {
    const mine = userIndex === this._myPosition;
    const arr = mine ? this._myItems : this._theirItems;
    if (index >= 1 && index <= 9) arr[index - 1] = item;
    // Any put clears both locks visually (mirrors server confirm reset)
    if (mine || !mine) { this._myConfirmed = false; this._theirConfirmed = false; this._setLocked(false); }
  }

  OnPartnerMoveItemToInventory(userIndex: number, index: number): void {
    const mine = userIndex === this._myPosition;
    const arr = mine ? this._myItems : this._theirItems;
    if (index >= 1 && index <= 9) arr[index - 1] = null;
    this._myConfirmed = false; this._theirConfirmed = false; this._setLocked(false);
  }

  /** OG OnPutMoney: userIndex byte + int anMoney. */
  OnPartnerPutMoney(userIndex: number, amount: number): void {
    if (userIndex === this._myPosition) this._myMoney = amount;
    else this._theirMoney = amount;
    this._myConfirmed = false; this._theirConfirmed = false; this._setLocked(false);
  }

  OnPartnerTrade(): void {
    this._theirConfirmed = true;
  }

  /** OG TRP_UnTrade — partner cancelled their confirmation. */
  OnPartnerUnTrade(): void {
    this._theirConfirmed = false;
    this._myConfirmed = false;
    this._setLocked(false);
  }

  OnPartnerLeave(): void {
    this.isVisible = false;
  }

  SetTradeMoneyLimit(limitType: number): void {
    this._noticeLabel.text = `Trade money limit type ${limitType}`;
    this.isVisible = true;
  }

  AddChatText(text: string): void {
    this._chatTexts.push(text);
    if (this._chatTexts.length > 100) this._chatTexts.shift();
    // Auto-scroll if already at bottom
    const maxScroll = Math.max(0, this._chatTexts.length - MAX_CHAT_LINES);
    if (this._chatScroll >= maxScroll - 1 || this._chatTexts.length <= MAX_CHAT_LINES) {
      this._chatScroll = maxScroll;
    }
  }

  // ── Buttons ────────────────────────────────────────────────────────────────

  private _setLocked(locked: boolean): void {
    if (this._btTrade) this._btTrade.enabled = !locked;
    if (this._btCoin) this._btCoin.enabled = !locked;
  }

  private _onTradeButton(): void {
    if (this._myConfirmed) {
      // Already confirmed — clicking again cancels (UnTrade)
      this._myConfirmed = false;
      this._setLocked(false);
      this.OnUnTrade?.();
      return;
    }
    // Nothing to trade?
    if (!this._theirItems.some((i) => i !== null) &&
        this._theirMoney === 0 && this._myItems.every((i) => i === null) && this._myMoney === 0) {
      return;
    }
    this._myConfirmed = true;
    this._setLocked(true);
    this.OnTrade?.();
  }

  // OG PutMoney @0x764450: numeric input, lv16+ may exceed 1,000,000,
  // 500ms throttle, locked offers blocked.
  private _promptMoney(): void {
    if (this._myConfirmed) return;
    const now = Date.now();
    if (now - this._lastPutMoneyAt < 500) return;
    this._lastPutMoneyAt = now;
    this.modals?.askAmount('', 1, 0x7FFFFFFF, (amount) => {
      if (!(this.characterLevel > 15 || amount <= 1000000)) {
        this.modals?.notice('You cannot trade more than 1 million mesos until you reach Lv. 16.');
        return;
      }
      if (amount > 0) this.OnPutMoney?.(amount);
    });
  }

  private _submitChat(): void {
    const text = this._editText.text.trim();
    if (!text) return;
    this._editText.text = '';
    this.OnChat?.(text);
  }

  private _clearIcons(): void {
    for (let i = 0; i < this._iconSprites.length; i++) {
      const s = this._iconSprites[i];
      if (s) { s.destroy({ children: true }); this._iconSprites[i] = null; }
    }
  }

  private _syncIcons(): void {
    this._clearIcons();
    for (let grid = 0; grid < 2; grid++) {
      const arr = grid === 0 ? this._myItems : this._theirItems;
      for (let i = 0; i < arr.length; i++) {
        const it = arr[i];
        if (!it || !this._iconOf) continue;
        const spr = this._iconOf(it.itemId);
        if (!spr) continue;
        const pixi = spr.ToPixi();
        const r = this._slotRect(grid as 0 | 1, i);
        // Center 32x32 cell: icons are ~24x24 with origin centered
        pixi.position.set(r.x + 16 - spr.OriginX, r.y + 16 - spr.OriginY);
        const c = new Container();
        c.addChild(pixi);
        // Quantity badge for stackables
        if (it.quantity > 1) {
          const q = new Text({ text: `x${it.quantity}`, style: new TextStyle({ fill: '#FFFFFF', fontSize: 9, fontFamily: 'monospace', stroke: { color: 0x000000, width: 2 } }) });
          q.position.set(r.x + 2, r.y + 20);
          c.addChild(q);
        }
        this._iconLayer.addChild(c);
        this._iconSprites[grid * 9 + i] = c;
      }
    }
  }

  // ── Rendering ──────────────────────────────────────────────────────────────

  update(_dt: number): void {
    if (!this.isVisible) return;

    this._syncIcons();

    this._gridG.clear();
    for (let grid = 0; grid < 2; grid++) {
      for (let i = 0; i < GRID_ROWS * GRID_COLS; i++) {
        const r = this._slotRect(grid as 0 | 1, i);
        const item = grid === 0 ? this._myItems[i] : this._theirItems[i];
        const isLocked = this._myConfirmed || this._theirConfirmed;
        this._gridG.rect(r.x, r.y, r.w, r.h)
          .fill({ color: item ? (isLocked ? 0x1A2A18 : 0x182016) : 0x10121C })
          .stroke({ color: this.pendingItem && grid === 0 && !item && !this._myConfirmed ? 0x88AAFF : 0x282C44, width: 1 });
        // Confirm overlay: diagonal hatch when locked
        if (isLocked && item) {
          this._gridG.moveTo(r.x, r.y).lineTo(r.x + r.w, r.y + r.h).stroke({ color: 0x448844, width: 1, alpha: 0.5 });
        }
        this._slotLabels[grid][i].text = this._iconOf ? '' : (item ? `${item.itemId}\nx${item.quantity}` : '');
      }
    }

    this._chatLogG.clear();
    this._chatLogG.rect(CHAT_LOG.x, CHAT_LOG.y, CHAT_LOG.w, CHAT_LOG.h)
      .fill({ color: 0x10121C, alpha: 0.85 })
      .stroke({ color: 0x282C44, width: 1 });
    this._chatLogG.rect(CHAT_EDIT.x, CHAT_EDIT.y, CHAT_EDIT.w, CHAT_EDIT.h)
      .fill({ color: this._editFocused ? 0xFFFFFF : 0xE8E8E8 })
      .stroke({ color: 0x999999, width: 1 });

    // Chat lines with scroll offset, 14 lines visible
    for (let i = 0; i < MAX_CHAT_LINES; i++) {
      const line = this._chatLines[i];
      const text = this._chatTexts[this._chatScroll + i] ?? '';
      if (!line) {
        const t = new Text({ text, style: new TextStyle({ fill: '#FFFFFF', fontSize: 11, fontFamily: 'monospace' }) });
        t.position.set(CHAT_LOG.x + 4, CHAT_LOG.y + 4 + i * CHAT_LINE_H);
        this.container.addChild(t);
        this._chatLines.push(t);
      } else {
        line.text = text;
        line.visible = text.length > 0;
      }
    }

    this._moneyLabels[0].text = `${this._myMoney.toLocaleString()} meso`;
    this._moneyLabels[1].text = `${this._theirMoney.toLocaleString()} meso`;
    this._nameLabels[1].text = `${this._partnerName}${this._theirConfirmed ? ' ✓' : ''}`;
    this._nameLabels[0].text = `My Offer${this._myConfirmed ? ' ✓ Locked' : ''}`;
    // Money lock hint
    if (this._myConfirmed) this._noticeLabel.text = 'Offer locked — click Trade again to cancel';
    else if (this._theirConfirmed) this._noticeLabel.text = `${this._partnerName} is ready`;
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    const px = this.container.position.x;
    const py = this.container.position.y;
    const lx = x - px;
    const ly = y - py;
    for (const b of this._allButtons) {
      if (b.handleMouseButton(lx, ly, down)) return true;
    }
    if (!down) return true;

    // Chat edit focus toggle.
    if (lx >= CHAT_EDIT.x && lx < CHAT_EDIT.x + CHAT_EDIT.w &&
        ly >= CHAT_EDIT.y && ly < CHAT_EDIT.y + CHAT_EDIT.h) {
      this._editFocused = true;
      return true;
    }
    this._editFocused = false;

    // My-grid slot click
    for (let i = 0; i < GRID_ROWS * GRID_COLS; i++) {
      const r = this._slotRect(0, i);
      if (lx >= r.x && lx < r.x + r.w && ly >= r.y && ly < r.y + r.h) {
        if (this.pendingItem && !this._myItems[i]) {
          if (this._myConfirmed) return true;
          const { invType, position, quantity } = this.pendingItem;
          // Quantity prompt for stackables (quantity > 1)
          if (quantity > 1) {
            this.modals?.askAmount(`How many to trade? (max ${quantity})`, quantity, quantity, (amount) => {
              if (amount <= 0 || amount > quantity) return;
              this._myItems[i] = { invType, itemId: this.pendingItem!.itemId, quantity: amount };
              this.OnPutItem?.(i + 1, invType, position, amount);
              this.pendingItem = null;
            });
          } else {
            const { itemId } = this.pendingItem;
            this._myItems[i] = { invType, itemId, quantity };
            this.OnPutItem?.(i + 1, invType, position, quantity);
            this.pendingItem = null;
          }
        } else if (this._myItems[i] && !this.pendingItem && !this._myConfirmed) {
          // Click own filled slot — take back (MoveItemToInventory)
          this.OnMoveItemToInventory?.(i + 1);
          // Optimistic clear; server will confirm via broadcast
          this._myItems[i] = null;
          this._myConfirmed = false; this._theirConfirmed = false; this._setLocked(false);
        }
        return true;
      }
    }
    // Their-grid click — just consume (no action, but could show tooltip)
    for (let i = 0; i < GRID_ROWS * GRID_COLS; i++) {
      const r = this._slotRect(1, i);
      if (lx >= r.x && lx < r.x + r.w && ly >= r.y && ly < r.y + r.h) return true;
    }
    // Chat scroll click area
    if (lx >= CHAT_LOG.x && lx < CHAT_LOG.x + CHAT_LOG.w && ly >= CHAT_LOG.y && ly < CHAT_LOG.y + CHAT_LOG.h) {
      return true;
    }
    return lx >= 0 && lx < W && ly >= 0 && ly < H;
  }

  onMouseMove(mx: number, my: number): void {
    if (!this.isVisible) return;
    const lx = mx - this.container.position.x;
    const ly = my - this.container.position.y;
    // Hover tooltip for items
    let found: TradeItem | null = null;
    for (let grid = 0; grid < 2; grid++) {
      for (let i = 0; i < 9; i++) {
        const r = this._slotRect(grid as 0 | 1, i);
        if (lx >= r.x && lx < r.x + r.w && ly >= r.y && ly < r.y + r.h) {
          found = (grid === 0 ? this._myItems : this._theirItems)[i];
          break;
        }
      }
      if (found) break;
    }
    if (found && found.itemId !== this._hoverItemId) {
      this._hoverItemId = found.itemId;
      if (!this._hoverTooltip) {
        this._hoverTooltip = new Text({ text: '', style: new TextStyle({ fill: '#FFFFAA', fontSize: 10, fontFamily: 'monospace', stroke: { color: 0x000000, width: 2 } }) });
        this.container.addChild(this._hoverTooltip);
      }
      this._hoverTooltip.text = `${found.itemId} x${found.quantity}`;
      this._hoverTooltip.position.set(lx + 12, ly - 16);
      this._hoverTooltip.visible = true;
    } else if (!found && this._hoverTooltip) {
      this._hoverTooltip.visible = false; this._hoverItemId = 0;
    } else if (this._hoverTooltip) {
      this._hoverTooltip.position.set(lx + 12, ly - 16);
    }
  }

  onMouseWheel(_x: number, _y: number, deltaY: number): boolean {
    if (!this.isVisible) return false;
    const maxScroll = Math.max(0, this._chatTexts.length - MAX_CHAT_LINES);
    if (deltaY > 0) this._chatScroll = Math.min(maxScroll, this._chatScroll + 1);
    else if (deltaY < 0) this._chatScroll = Math.max(0, this._chatScroll - 1);
    return false;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') {
      this.OnCancel?.();
      this.isVisible = false;
      return true;
    }
    if (key === 'Enter') {
      this._submitChat();
      return true;
    }
    // OG OnCreate calls SetFocusChild(m_pEditChat) — typed keys go to the edit.
    if (key.length === 1) {
      if (this._editText.text.length < 256) this._editText.text += key;
      return true;
    }
    if (key === 'Backspace') {
      this._editText.text = this._editText.text.slice(0, -1);
      return true;
    }
    return true;
  }
}
