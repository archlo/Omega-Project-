import { Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';

export interface ShopScannerDisplayItem { id: number; name: string; price: number; }

const PanelW = 330;
const PanelH = 190;
const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 12, fontFamily: 'monospace' });
const _bodyStyle = new TextStyle({ fill: '#FFFFFF', fontSize: 10, fontFamily: 'monospace' });
const _btnStyle = new TextStyle({ fill: '#D8D8D8', fontSize: 10, fontFamily: 'monospace' });

export class ShopScanner extends GamePanel {
  private _bg = new Graphics();
  private _title = new Text({ text: 'Shop Scanner', style: _titleStyle });
  private _body = new Text({ text: '', style: _bodyStyle });
  private _closeBtn = new Graphics();
  private _closeLabel = new Text({ text: 'Close', style: _btnStyle });
  private _subType = 0;
  private _items: ShopScannerDisplayItem[] = [];

  constructor() {
    super();
    this.container.position.set(300, 142);
    this._title.position.set(10, 8);
    this._body.position.set(12, 32);
    this._closeLabel.position.set(226, 162);
    this.container.addChild(this._bg, this._title, this._body, this._closeBtn, this._closeLabel);
    this._drawChrome();
    this._refresh();
  }

  SetResult(subType: number, items: ShopScannerDisplayItem[] = []): void {
    // TODO_AUDIT.md Hundred-and-fifty-fourth pass: CUIShopScanner result list;
    // search/open controls are not exposed because no verified sender exists.
    this._subType = subType;
    this._items = items;
    this.isVisible = true;
    this._refresh();
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    if (!down) return true;
    const lx = x - this.container.position.x;
    const ly = y - this.container.position.y;
    if (this._hit(lx, ly, 216, 156, 70, 24)) { this.isVisible = false; return true; }
    return lx >= 0 && lx < PanelW && ly >= 0 && ly < PanelH;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.isVisible = false; return true; }
    return false;
  }

  private _refresh(): void {
    const rows = this._items.length > 0
      ? this._items.slice(0, 8).map((it) => `${it.name}: ${it.price.toLocaleString()}`).join('\n')
      : '-';
    this._body.text = `Sub-type: ${this._subType}\nItems: ${this._items.length}\n${rows}`;
  }

  private _drawChrome(): void {
    this._bg.clear().roundRect(0, 0, PanelW, PanelH, 5).fill({ color: 0x142018, alpha: 0.92 }).stroke({ color: 0x88dd99, width: 1 });
    this._closeBtn.clear().rect(216, 156, 70, 24).fill({ color: 0x1E2030, alpha: 0.9 }).stroke({ color: 0x557055, width: 1 });
  }

  private _hit(x: number, y: number, bx: number, by: number, bw: number, bh: number): boolean {
    return x >= bx && x < bx + bw && y >= by && y < by + bh;
  }
}
