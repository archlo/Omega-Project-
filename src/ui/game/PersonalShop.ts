import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { BuiltInFont } from '../BuiltInFont.js';
import { Button } from '../Button.js';
import { PLAYER_SHOP_SLOT_MAX } from '../../net/packet/MiniRoomProtocol.js';

const PanelW = 360;
const PanelH = 412;
const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 11, fontFamily: 'monospace' });
const _itemStyle = new TextStyle({ fill: '#FFF', fontSize: 9, fontFamily: 'monospace' });
const _priceStyle = new TextStyle({ fill: '#FFD700', fontSize: 9, fontFamily: 'monospace' });

export interface ShopItemSlot {
  index: number;
  itemId: number;
  name: string;
  setCount: number;
  setSize: number;
  price: number;
}

export class PersonalShop extends GamePanel {
  OnBuyItem: ((index: number, count: number) => void) | null = null;
  OnChat: ((text: string) => void) | null = null;
  OnLeave: (() => void) | null = null;
  OnPutItem: ((invType: number, position: number, setCount: number, setSize: number, price: number) => void) | null = null;
  OnBalloonOpen: ((open: boolean) => void) | null = null;
  /** OG: CPersonalShopDlg::OnSoldItemResult (0x69a670). */
  OnSoldItem: ((itemIndex: number, quantity: number, buyerName: string) => void) | null = null;

  /** Set by GameStage when an inventory item is selected while this panel is
      open as owner — consumed (and cleared) on the next empty-slot click. */
  pendingItem: { invType: number; position: number } | null = null;

  private _background: WzSprite | null;
  private _font: BuiltInFont | null;
  private _allButtons: Button[] = [];
  private _title = '';
  private _isOwner = false;
  private _items: ShopItemSlot[] = [];
  private _visitorIndex = 1;
  private _statusLine = '';
  private _dynamicChildren: Container[] = [];
  private _balloonOpen = false;

  constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null) {
    super();
    this._font = font;
    this.isVisible = false;
    this.container.position.set(220, 80);

    const ps = ui?.GetItem('UIWindow2.img/PersonalShop');
    const psProp = ps instanceof WzProperty ? ps : null;
    this._background = psProp?.Get('backgrnd') instanceof WzCanvas ? loader.Load(psProp!.Get('backgrnd') as WzCanvas) : null;

    const title = new Text({ text: 'Shop', style: _titleStyle });
    title.x = 8; title.y = 5;
    this.container.addChild(title);
  }

  OpenAsOwner(title: string, items: ShopItemSlot[]): void {
    this._title = title;
    this._items = items;
    this._isOwner = true;
    this._visitorIndex = 0;
    this._balloonOpen = false;
    this.pendingItem = null;
    this.isVisible = true;
  }

  OpenAsVisitor(title: string, items: ShopItemSlot[], visitorIndex: number): void {
    this._title = title;
    this._items = items;
    this._isOwner = false;
    this._visitorIndex = visitorIndex;
    this.isVisible = true;
  }

  Refresh(items: ShopItemSlot[]): void {
    this._items = items;
  }

  AcceptBuyResult(_result: number): void {
  }

  SetShopStatus(message: string): void {
    // TODO_AUDIT.md Hundred-and-fifty-fourth pass: surface decoded shop-room
    // result/status packets without inventing extra shop controls.
    this._statusLine = message;
    this.isVisible = true;
  }

  // TODO_AUDIT.md Fifty-fourth pass: PSP_AddSoldItem's decoded `quantity` is
  // a multiplier against the listing's own bundle size at that slot
  // (CPersonalShopDlg::OnSoldItemResult: nNumber = nSet * Decode2()), not a
  // raw sold count — has to be resolved against `_items` here, not at the
  // protocol-decode layer which has no shop-listing context.
  NotifySoldItem(itemIndex: number, multiplier: number, buyerName: string): void {
    const slot = this._items.find((i) => i.index === itemIndex);
    const quantity = (slot?.setSize ?? 1) * multiplier;
    this.OnSoldItem?.(itemIndex, quantity, buyerName);
  }

  update(_dt: number): void { this.draw(); }

  draw(): void {
    if (!this.isVisible) return;
    if (this._background) this.container.addChildAt(this._background.ToPixi(), 0);
    for (const c of this._dynamicChildren) c.destroy();
    this._dynamicChildren = [];

    const listBg = new Graphics();
    listBg.rect(16, 40, PanelW - 32, 300).fill({ color: '#1A1A2E', alpha: 0.85 });
    this.container.addChild(listBg);
    this._dynamicChildren.push(listBg);

    for (let i = 0; i < this._items.length; i++) {
      const item = this._items[i];
      const iy = 44 + i * 28;

      const slotBg = new Graphics();
      slotBg.rect(20, iy, PanelW - 40, 26).fill({ color: i % 2 === 0 ? '#181828' : '#13131F', alpha: 0.7 });
      this.container.addChild(slotBg);
      this._dynamicChildren.push(slotBg);

      const name = new Text({ text: item.name || `[${item.itemId}]`, style: _itemStyle });
      name.x = 24; name.y = iy + 2;
      this.container.addChild(name);
      this._dynamicChildren.push(name);

      const qty = new Text({ text: `${item.setCount}x`, style: _itemStyle });
      qty.x = 190; qty.y = iy + 2;
      this.container.addChild(qty);
      this._dynamicChildren.push(qty);

      const price = new Text({ text: `${item.price} meso`, style: _priceStyle });
      price.x = 240; price.y = iy + 2;
      this.container.addChild(price);
      this._dynamicChildren.push(price);
    }

    if (this._isOwner) {
      for (let i = this._items.length; i < PLAYER_SHOP_SLOT_MAX; i++) {
        const iy = 44 + i * 28;
        if (iy > 340) break;
        const slotBg = new Graphics();
        slotBg.rect(20, iy, PanelW - 40, 26).fill({ color: this.pendingItem ? '#1A3A1A' : '#101018', alpha: 0.6 });
        slotBg.rect(20, iy, PanelW - 40, 26).stroke({ color: this.pendingItem ? '#5A9A5A' : '#282C44', width: 1 });
        this.container.addChild(slotBg);
        this._dynamicChildren.push(slotBg);
        const t = new Text({ text: this.pendingItem ? 'Click to place selected item' : '(empty)', style: new TextStyle({ fill: '#666', fontSize: 9, fontFamily: 'monospace' }) });
        t.x = 24; t.y = iy + 2;
        this.container.addChild(t);
        this._dynamicChildren.push(t);
      }

      const balloonLabel = new Text({ text: this._balloonOpen ? 'Shop OPEN (click to close)' : 'Shop CLOSED (click to open)', style: new TextStyle({ fill: this._balloonOpen ? '#00FF00' : '#FF6464', fontSize: 9, fontFamily: 'monospace' }) });
      balloonLabel.x = 20; balloonLabel.y = PanelH - 30;
      this.container.addChild(balloonLabel);
      this._dynamicChildren.push(balloonLabel);
    }

    if (this._statusLine) {
      const status = new Text({ text: this._statusLine, style: new TextStyle({ fill: '#FFD080', fontSize: 10, fontFamily: 'monospace', wordWrap: true, wordWrapWidth: PanelW - 40 }) });
      status.x = 20; status.y = PanelH - 54;
      this.container.addChild(status);
      this._dynamicChildren.push(status);
    }
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

    if (lx >= PanelW - 18 && ly < 22) { this.OnLeave?.(); this.isVisible = false; return true; }

    if (!this._isOwner) {
      for (let i = 0; i < this._items.length; i++) {
        if (lx >= 20 && lx < PanelW - 20 && ly >= 44 + i * 28 && ly < 44 + (i + 1) * 28) {
          this.OnBuyItem?.(this._items[i].index, 1);
          return true;
        }
      }
    } else {
      for (let i = this._items.length; i < PLAYER_SHOP_SLOT_MAX; i++) {
        const iy = 44 + i * 28;
        if (iy > 340) break;
        if (lx >= 20 && lx < PanelW - 20 && ly >= iy && ly < iy + 26) {
          if (this.pendingItem) this._promptAndPutItem(this.pendingItem);
          return true;
        }
      }
      if (lx >= 20 && lx < 280 && ly >= PanelH - 30 && ly < PanelH - 14) {
        this._balloonOpen = !this._balloonOpen;
        this.OnBalloonOpen?.(this._balloonOpen);
        return true;
      }
    }

    return lx >= 0 && lx < PanelW && ly >= 0 && ly < PanelH;
  }

  private _promptAndPutItem(pending: { invType: number; position: number }): void {
    const setSizeRaw = window.prompt('Bundle size per sale (e.g. 1 for a single item, or stack size):', '1');
    if (setSizeRaw === null) return;
    const setSize = Math.trunc(Number(setSizeRaw));
    const setCountRaw = window.prompt('How many bundles to list?', '1');
    if (setCountRaw === null) return;
    const setCount = Math.trunc(Number(setCountRaw));
    const priceRaw = window.prompt('Price per bundle (mesos):');
    if (priceRaw === null) return;
    const price = Math.trunc(Number(priceRaw));
    if (!Number.isFinite(setSize) || setSize <= 0 || !Number.isFinite(setCount) || setCount <= 0 || !Number.isFinite(price) || price <= 0) return;
    this.OnPutItem?.(pending.invType, pending.position, setCount, setSize, price);
    this.pendingItem = null;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.OnLeave?.(); this.isVisible = false; return true; }
    return false;
  }
}
