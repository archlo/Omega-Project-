import { Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { BuiltInFont } from '../BuiltInFont.js';
import { Button } from '../Button.js';

const PanelW = 526;
const PanelH = 472;
const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 11, fontFamily: 'monospace' });
const _labelStyle = new TextStyle({ fill: '#AAA', fontSize: 9, fontFamily: 'monospace' });
const _slotStyle = new TextStyle({ fill: '#CCC', fontSize: 9, fontFamily: 'monospace' });

const GRID_COLS = 3;
const GRID_ROWS = 3;
const SLOT_W = 60;
const SLOT_H = 60;
const SLOT_GAP = 4;
const MY_GRID_X = 20;
const THEIR_GRID_X = 306;
const GRID_Y = 68;

export interface TradeItem {
  invType: number;
  itemId: number;
  quantity: number;
}

export class TradingRoom extends GamePanel {
  OnPutItem: ((index: number, invType: number, position: number, quantity: number) => void) | null = null;
  OnPutMoney: ((amount: number) => void) | null = null;
  OnTrade: (() => void) | null = null;
  OnCancel: (() => void) | null = null;

  private _background: WzSprite | null;
  private _font: BuiltInFont | null;
  private _allButtons: Button[] = [];
  private _btTrade: Button | null = null;
  private _btPutMoney: Button | null = null;
  // _btReset/_btEnter/_btClame from the real client's TradingRoom.img have no
  // matching sender in GameSender.ts (no "take back item"/"reset offer"
  // packet exists) — not instantiating them with fabricated behavior.
  private _myItems: (TradeItem | null)[] = new Array(9).fill(null);
  private _theirItems: (TradeItem | null)[] = new Array(9).fill(null);
  private _myMoney = 0;
  private _theirMoney = 0;
  private _myConfirmed = false;
  private _theirConfirmed = false;
  private _partnerName = '';

  /** Set by GameStage when an inventory item is selected while this panel is
      open — consumed (and cleared) on the next "my" slot click. */
  pendingItem: { invType: number; position: number; itemId: number; quantity: number } | null = null;

  private _bg: Graphics;
  private _myBg: Graphics;
  private _theirBg: Graphics;
  private _mySlotBgs: Graphics[] = [];
  private _theirSlotBgs: Graphics[] = [];
  private _mySlotLabels: Text[] = [];
  private _theirSlotLabels: Text[] = [];
  private _myLabel: Text;
  private _theirLabel: Text;
  private _myMoneyLabel: Text;
  private _theirMoneyLabel: Text;
  private _noticeLabel: Text;
  private _title: Text;

  constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null) {
    super();
    this._font = font;
    this.isVisible = false;
    this.container.position.set(140, 60);

    const tr = ui?.GetItem('UIWindow2.img/TradingRoom');
    const trProp = tr instanceof WzProperty ? tr : null;
    this._background = trProp?.Get('backgrnd') instanceof WzCanvas ? loader.Load(trProp!.Get('backgrnd') as WzCanvas) : null;
    if (this._background) this.container.addChild(this._background.ToPixi());

    this._bg = new Graphics();
    this._bg.rect(0, 0, PanelW, 22).fill({ color: '#0F1224', alpha: 0.9 });
    this.container.addChild(this._bg);

    this._title = new Text({ text: 'Trade', style: _titleStyle });
    this._title.x = 8; this._title.y = 5;
    this.container.addChild(this._title);

    this._myBg = new Graphics();
    this.container.addChild(this._myBg);
    this._theirBg = new Graphics();
    this.container.addChild(this._theirBg);

    this._myLabel = new Text({ text: 'My items', style: new TextStyle({ fill: '#FFD700', fontSize: 9, fontFamily: 'monospace' }) });
    this._myLabel.x = MY_GRID_X + 5; this._myLabel.y = 50;
    this.container.addChild(this._myLabel);

    this._theirLabel = new Text({ text: '', style: new TextStyle({ fill: '#FFD700', fontSize: 9, fontFamily: 'monospace' }) });
    this._theirLabel.x = THEIR_GRID_X + 5; this._theirLabel.y = 50;
    this.container.addChild(this._theirLabel);

    for (let i = 0; i < 9; i++) {
      const { sx, sy } = this._slotPos(MY_GRID_X, i);
      const mb = new Graphics();
      this._mySlotBgs.push(mb);
      this.container.addChild(mb);
      const ml = new Text({ text: '', style: _slotStyle });
      ml.x = sx + 4; ml.y = sy + 4;
      this._mySlotLabels.push(ml);
      this.container.addChild(ml);

      const { sx: tsx, sy: tsy } = this._slotPos(THEIR_GRID_X, i);
      const tb = new Graphics();
      this._theirSlotBgs.push(tb);
      this.container.addChild(tb);
      const tl = new Text({ text: '', style: _slotStyle });
      tl.x = tsx + 4; tl.y = tsy + 4;
      this._theirSlotLabels.push(tl);
      this.container.addChild(tl);
    }

    this._myMoneyLabel = new Text({ text: '', style: _labelStyle });
    this._myMoneyLabel.x = MY_GRID_X + 5; this._myMoneyLabel.y = GRID_Y + GRID_ROWS * (SLOT_H + SLOT_GAP) + 6;
    this.container.addChild(this._myMoneyLabel);
    this._theirMoneyLabel = new Text({ text: '', style: _labelStyle });
    this._theirMoneyLabel.x = THEIR_GRID_X + 5; this._theirMoneyLabel.y = GRID_Y + GRID_ROWS * (SLOT_H + SLOT_GAP) + 6;
    this.container.addChild(this._theirMoneyLabel);

    this._noticeLabel = new Text({ text: '', style: new TextStyle({ fill: '#FFD080', fontSize: 10, fontFamily: 'monospace' }) });
    this._noticeLabel.x = 20; this._noticeLabel.y = 292;
    this.container.addChild(this._noticeLabel);

    this._btTrade = new Button('Trade');
    this._btTrade.onClick = () => { this.OnTrade?.(); };
    this._allButtons.push(this._btTrade);
    this.container.addChild(this._btTrade.container);
    this._btTrade.container.position.set(330, 320);

    this._btPutMoney = new Button('Put Meso');
    this._btPutMoney.onClick = () => this._promptMoney();
    this._allButtons.push(this._btPutMoney);
    this.container.addChild(this._btPutMoney.container);
    this._btPutMoney.container.position.set(400, 320);
  }

  private _slotPos(gridX: number, index: number): { sx: number; sy: number } {
    const col = index % GRID_COLS;
    const row = Math.floor(index / GRID_COLS);
    return { sx: gridX + col * (SLOT_W + SLOT_GAP), sy: GRID_Y + row * (SLOT_H + SLOT_GAP) };
  }

  Open(partnerName: string, myIndex: number): void {
    this._partnerName = partnerName;
    this._myItems.fill(null);
    this._theirItems.fill(null);
    this._myMoney = 0;
    this._theirMoney = 0;
    this._myConfirmed = false;
    this._theirConfirmed = false;
    this.pendingItem = null;
    this.isVisible = true;
  }

  OnPartnerPutItem(index: number, item: TradeItem): void {
    if (index >= 0 && index < 9) this._theirItems[index] = item;
  }

  OnPartnerPutMoney(amount: number): void {
    this._theirMoney = amount;
  }

  OnPartnerTrade(): void {
    this._theirConfirmed = true;
  }

  OnPartnerLeave(): void {
    this.isVisible = false;
  }

  SetTradeMoneyLimit(limitType: number): void {
    // TODO_AUDIT.md Hundred-and-fifty-fourth pass: TradeMoneyLimit is decoded
    // as one byte; expose the raw type without guessing server-side wording.
    this._noticeLabel.text = `Trade money limit type ${limitType}`;
    this.isVisible = true;
  }

  update(_dt: number): void {
    if (!this.isVisible) return;

    this._myLabel.text = `My items${this._myConfirmed ? ' (Confirmed)' : ''}`;
    this._myLabel.style.fill = this._myConfirmed ? '#00FF00' : '#FFD700';
    this._theirLabel.text = `${this._partnerName}${this._theirConfirmed ? ' (Confirmed)' : ''}`;
    this._theirLabel.style.fill = this._theirConfirmed ? '#00FF00' : '#FFD700';

    this._myBg.clear();
    this._myBg.rect(MY_GRID_X - 4, GRID_Y - 4, GRID_COLS * (SLOT_W + SLOT_GAP) + 4, GRID_ROWS * (SLOT_H + SLOT_GAP) + 4)
      .fill({ color: '#1A1A2E', alpha: 0.85 });
    this._theirBg.clear();
    this._theirBg.rect(THEIR_GRID_X - 4, GRID_Y - 4, GRID_COLS * (SLOT_W + SLOT_GAP) + 4, GRID_ROWS * (SLOT_H + SLOT_GAP) + 4)
      .fill({ color: '#1A1A2E', alpha: 0.85 });

    for (let i = 0; i < 9; i++) {
      const { sx, sy } = this._slotPos(MY_GRID_X, i);
      const item = this._myItems[i];
      this._mySlotBgs[i].clear();
      this._mySlotBgs[i].rect(sx, sy, SLOT_W, SLOT_H).fill({ color: item ? '#182016' : '#10121C' });
      this._mySlotBgs[i].rect(sx, sy, SLOT_W, SLOT_H).stroke({ color: this.pendingItem ? '#8AF' : item ? '#375537' : '#282C44', width: 1 });
      this._mySlotLabels[i].text = item ? `${item.itemId}\nx${item.quantity}` : '';

      const { sx: tsx, sy: tsy } = this._slotPos(THEIR_GRID_X, i);
      const theirItem = this._theirItems[i];
      this._theirSlotBgs[i].clear();
      this._theirSlotBgs[i].rect(tsx, tsy, SLOT_W, SLOT_H).fill({ color: theirItem ? '#182016' : '#10121C' });
      this._theirSlotBgs[i].rect(tsx, tsy, SLOT_W, SLOT_H).stroke({ color: theirItem ? '#375537' : '#282C44', width: 1 });
      this._theirSlotLabels[i].text = theirItem ? `${theirItem.itemId}\nx${theirItem.quantity}` : '';
    }

    this._myMoneyLabel.text = this._myMoney > 0 ? `${this._myMoney} meso` : '';
    this._theirMoneyLabel.text = this._theirMoney > 0 ? `${this._theirMoney} meso` : '';
  }

  private _promptMoney(): void {
    const raw = window.prompt('Amount of mesos to offer:');
    if (raw === null) return;
    const amount = Math.trunc(Number(raw));
    if (Number.isFinite(amount) && amount > 0) {
      this._myMoney = amount;
      this.OnPutMoney?.(amount);
    }
  }

  /** Click on one of my own 9 slots — consumes `pendingItem` (set by GameStage
      from an inventory selection) if present. */
  private _handleMySlotClick(lx: number, ly: number): boolean {
    for (let i = 0; i < 9; i++) {
      const { sx, sy } = this._slotPos(MY_GRID_X, i);
      if (lx >= sx && lx < sx + SLOT_W && ly >= sy && ly < sy + SLOT_H) {
        if (this.pendingItem && !this._myItems[i]) {
          const { invType, position, itemId, quantity } = this.pendingItem;
          this._myItems[i] = { invType, itemId, quantity };
          this.OnPutItem?.(i, invType, position, quantity);
          this.pendingItem = null;
        }
        return true;
      }
    }
    return false;
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    if (!down) return true;
    const px = this.container.position.x;
    const py = this.container.position.y;
    const lx = x - px;
    const ly = y - py;
    for (const b of this._allButtons) {
      if (b.handleMouseButton(lx, ly, down)) return true;
    }
    if (lx >= PanelW - 18 && ly < 22) { this.OnCancel?.(); this.isVisible = false; return true; }
    if (this._handleMySlotClick(lx, ly)) return true;
    return lx >= 0 && lx < PanelW && ly >= 0 && ly < PanelH;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.OnCancel?.(); this.isVisible = false; return true; }
    return false;
  }
}
