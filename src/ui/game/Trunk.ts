import { GamePanel } from './GamePanel.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { BuiltInFont } from '../BuiltInFont.js';
import { Button } from '../Button.js';

export interface TrunkItem {
  name: string;
  itemId: number;
  quantity: number;
  invType: number;
  position: number;
}

const PanelW = 436;
const PanelH = 344;
const ItemH = 50;
const ListTop = 58;
const ListBot = 290;
const VisRows = Math.floor((ListBot - ListTop) / ItemH);

export class Trunk extends GamePanel {
  OnWithdraw: ((invType: number, position: number) => void) | null = null;
  OnDeposit: ((position: number, itemId: number, count: number) => void) | null = null;
  OnSort: (() => void) | null = null;
  OnClosed: (() => void) | null = null;
  OnWithdrawMoney: ((amount: number) => void) | null = null;
  OnDepositMoney: ((amount: number) => void) | null = null;

  private _background: WzSprite | null;
  private _btClose: Button | null;
  private _font: BuiltInFont | null;
  private _allButtons: Button[] = [];
  private _tab = 0;
  private _scroll = 0;
  private _selected = -1;
  private _money = 0;
  private _trunkItems: TrunkItem[] = [];
  private _invItems: TrunkItem[] = [];

  constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null) {
    super();
    this._font = font;
    this.isVisible = false;
    this.container.position.set(180, 120);

    const trunk = ui?.GetItem('UIWindow2.img/Trunk');
    const trunkProp = trunk instanceof WzProperty ? trunk : null;
    this._background = trunkProp?.Get('backgrnd') instanceof WzCanvas ? loader.Load(trunkProp!.Get('backgrnd') as WzCanvas) : null;
    if (this._background) this.container.addChildAt(this._background.ToPixi(), 0);
    this._btClose = this._makeButton(loader, trunkProp, 'BtClose', () => this._close());
    this._applyLayout();
  }

  Open(money: number, trunkItems: TrunkItem[], invItems: TrunkItem[]): void {
    this._refresh(money, trunkItems, invItems);
    this._tab = 0; this._scroll = 0; this._selected = -1;
    this.isVisible = true;
  }

  Refresh(money: number, trunkItems: TrunkItem[], invItems: TrunkItem[]): void {
    this._refresh(money, trunkItems, invItems);
  }

  private _refresh(money: number, trunkItems: TrunkItem[], invItems: TrunkItem[]): void {
    this._money = money;
    this._trunkItems = [...trunkItems];
    this._invItems = [...invItems];
    if (this._selected >= this._currentList.length) this._selected = -1;
  }

  SetMoney(money: number): void { this._money = money; }

  private get _currentList(): TrunkItem[] { return this._tab === 0 ? this._trunkItems : this._invItems; }

  private _close(): void {
    this.isVisible = false;
    this.OnClosed?.();
  }

  private _promptMoney(callback: ((amount: number) => void) | null): void {
    const raw = window.prompt('Amount of mesos:');
    if (raw === null) return;
    const amount = Math.trunc(Number(raw));
    if (Number.isFinite(amount) && amount > 0) callback?.(amount);
  }

  private _applyLayout(): void {
    if (this._btClose !== null) this._btClose.container.position.set(this.container.position.x + 418, this.container.position.y + 4);
  }

  update(_dt: number): void { this._applyLayout(); }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    for (const b of this._allButtons) {
      if (b.handleMouseButton(x, y, down)) return true;
    }
    const px = this.container.position.x;
    const py = this.container.position.y;

    if (down) {
      if (x >= px + 8 && x < px + 128 && y >= py + 24 && y < py + 44) { this._tab = 0; this._scroll = 0; this._selected = -1; return true; }
      if (x >= px + 136 && x < px + 256 && y >= py + 24 && y < py + 44) { this._tab = 1; this._scroll = 0; this._selected = -1; return true; }
      const list = this._currentList;
      for (let i = 0; i < VisRows; i++) {
        const idx = i + this._scroll;
        if (idx >= list.length) break;
        if (x >= px + 6 && x < px + PanelW - 14 && y >= py + ListTop + i * ItemH + 1 && y < py + ListTop + (i + 1) * ItemH - 1) {
          this._selected = idx;
          return true;
        }
      }
      if (x >= px + 6 && x < px + 74 && y >= py + ListBot + 8 && y < py + ListBot + 30) {
        this._promptMoney(this.OnWithdrawMoney);
        return true;
      }
      if (x >= px + 78 && x < px + 150 && y >= py + ListBot + 8 && y < py + ListBot + 30) {
        this._promptMoney(this.OnDepositMoney);
        return true;
      }
      if (x >= px + PanelW - 156 && x < px + PanelW - 92 && y >= py + ListBot + 8 && y < py + ListBot + 30) {
        this.OnSort?.();
        return true;
      }
      if (x >= px + PanelW - 80 && x < px + PanelW - 12 && y >= py + ListBot + 8 && y < py + ListBot + 30
        && this._selected >= 0 && this._selected < list.length) {
        const item = list[this._selected];
        if (this._tab === 0) this.OnWithdraw?.(item.invType, item.position);
        else this.OnDeposit?.(item.position, item.itemId, item.quantity > 0 ? item.quantity : 1);
        this._selected = -1;
        return true;
      }
    }
    return x >= px && x < px + PanelW && y >= py && y < py + PanelH;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this._close(); return true; }
    const list = this._currentList;
    if (key === 'ArrowUp' && this._selected > 0) { this._selected--; this._clampScrollToSelected(); return true; }
    if (key === 'ArrowDown' && this._selected < list.length - 1) { this._selected++; this._clampScrollToSelected(); return true; }
    return true;
  }

  private _clampScrollToSelected(): void {
    if (this._selected >= 0) {
      this._scroll = Math.max(0, Math.min(this._scroll, this._selected));
      this._scroll = Math.max(this._scroll, Math.max(0, this._selected - VisRows + 1));
    }
  }

  private _makeButton(loader: WzTextureLoader, root: WzProperty | null, name: string, onClick: () => void): Button | null {
    const pr = root?.Get(name);
    if (!(pr instanceof WzProperty)) return null;
    const b = Button.fromWz(loader, pr, name);
    b.onClick = onClick;
    this._allButtons.push(b);
    this.container.addChild(b.container);
    return b;
  }
}
