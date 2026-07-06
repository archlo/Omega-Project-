import { Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import type { WeddingItemTab } from '../../net/handlers/PacketArgs.js';

const PanelW = 330;
const PanelH = 190;
const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 12, fontFamily: 'monospace' });
const _bodyStyle = new TextStyle({ fill: '#FFFFFF', fontSize: 10, fontFamily: 'monospace' });
const _btnStyle = new TextStyle({ fill: '#D8D8D8', fontSize: 10, fontFamily: 'monospace' });

export class WeddingWishList extends GamePanel {
  onGetItem: ((tab: number, index: number) => void) | null = null;

  private _bg = new Graphics();
  private _title = new Text({ text: 'Wedding Wishlist', style: _titleStyle });
  private _body = new Text({ text: '', style: _bodyStyle });
  private _getBtn = new Graphics();
  private _getLabel = new Text({ text: 'Get First', style: _btnStyle });
  private _closeBtn = new Graphics();
  private _closeLabel = new Text({ text: 'Close', style: _btnStyle });
  private _subAction = 0;
  private _wishList: string[] = [];
  private _itemTabs: WeddingItemTab[] = [];

  constructor() {
    super();
    this.container.position.set(292, 138);
    this._title.position.set(10, 8);
    this._body.position.set(12, 32);
    this._getLabel.position.set(62, 162);
    this._closeLabel.position.set(218, 162);
    this.container.addChild(this._bg, this._title, this._body, this._getBtn, this._getLabel, this._closeBtn, this._closeLabel);
    this._drawChrome();
    this._refresh();
  }

  SetResult(subAction: number, wishList?: string[], itemTabs?: WeddingItemTab[]): void {
    // TODO_AUDIT.md Hundred-and-fifty-fourth pass: wishlist put-item needs
    // inventory drag/slot state; this panel exposes decoded display + get only.
    this._subAction = subAction;
    if (wishList) this._wishList = wishList;
    if (itemTabs) this._itemTabs = itemTabs;
    this.isVisible = true;
    this._refresh();
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    if (!down) return true;
    const lx = x - this.container.position.x;
    const ly = y - this.container.position.y;
    if (this._hit(lx, ly, 52, 156, 90, 24)) {
      const first = this._itemTabs.find((tab) => tab.items.length > 0);
      if (first) this.onGetItem?.(first.tab, 0);
      return true;
    }
    if (this._hit(lx, ly, 208, 156, 70, 24)) { this.isVisible = false; return true; }
    return lx >= 0 && lx < PanelW && ly >= 0 && ly < PanelH;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.isVisible = false; return true; }
    return false;
  }

  private _refresh(): void {
    const wishes = this._wishList.length > 0 ? this._wishList.slice(0, 5).join(', ') : '-';
    const tabLines = this._itemTabs.length > 0
      ? this._itemTabs.map((t) => `tab ${t.tab}: ${t.items.length} item(s)`).join('\n')
      : '-';
    this._body.text = `Sub-action: ${this._subAction || '-'}\nWishes: ${wishes}\n${tabLines}`;
    this._getLabel.alpha = this._itemTabs.some((tab) => tab.items.length > 0) ? 1 : 0.45;
  }

  private _drawChrome(): void {
    this._bg.clear().roundRect(0, 0, PanelW, PanelH, 5).fill({ color: 0x171123, alpha: 0.92 }).stroke({ color: 0xff99cc, width: 1 });
    this._getBtn.clear().rect(52, 156, 90, 24).fill({ color: 0x1E2030, alpha: 0.9 }).stroke({ color: 0x705570, width: 1 });
    this._closeBtn.clear().rect(208, 156, 70, 24).fill({ color: 0x1E2030, alpha: 0.9 }).stroke({ color: 0x705570, width: 1 });
  }

  private _hit(x: number, y: number, bx: number, by: number, bw: number, bh: number): boolean {
    return x >= bx && x < bx + bw && y >= by && y < by + bh;
  }
}
