import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { BuiltInFont } from '../BuiltInFont.js';
import { Button } from '../Button.js';

const PanelW = 289;
const PanelH = 310;
const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 11, fontFamily: 'monospace' });
const _tabStyle = new TextStyle({ fill: '#DCC896', fontSize: 9, fontFamily: 'monospace' });

export class Delivery extends GamePanel {
  OnSendItem: ((slot: number) => void) | null = null;

  private _background: WzSprite | null;
  private _font: BuiltInFont | null;
  private _allButtons: Button[] = [];
  private _tab = 0;
  private _items: { slot: number; name: string }[] = [];
  private _noticeLine = '';
  private _dynamicChildren: Container[] = [];

  constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null) {
    super();
    this._font = font;
    this.isVisible = false;
    this.container.position.set(260, 100);

    const del = ui?.GetItem('UIWindow2.img/Delivery');
    const delProp = del instanceof WzProperty ? del : null;
    this._background = delProp?.Get('backgrnd') instanceof WzCanvas ? loader.Load(delProp!.Get('backgrnd') as WzCanvas) : null;
    if (this._background) this.container.addChild(this._background.ToPixi());

    const title = new Text({ text: 'Delivery', style: _titleStyle });
    title.x = 8; title.y = 5;
    this.container.addChild(title);
  }

  Open(tab = 0, items: { slot: number; name: string }[]): void {
    this._tab = tab;
    this._items = items;
    this.isVisible = true;
  }

  SetDisallowedQuestList(field1: number, field2: number): void {
    // TODO_AUDIT.md Hundred-and-fifty-fourth pass: DisallowedDeliveryQuestList
    // is decoded as two ints; expose them here without inventing quest labels.
    this._noticeLine = `Disallowed quests: ${field1} ${field2}`;
    this.isVisible = true;
  }

  update(_dt: number): void { this.draw(); }

  draw(): void {
    if (!this.isVisible) return;
    for (const c of this._dynamicChildren) c.destroy();
    this._dynamicChildren = [];

    const tabs = ['Keep', 'Send', 'Quick'];
    for (let i = 0; i < tabs.length; i++) {
      const tx = 6 + i * 90;
      const g = new Graphics();
      g.rect(tx, 28, 86, 20).fill({ color: i === this._tab ? '#3A3450' : '#1A1A28' });
      this.container.addChild(g);
      this._dynamicChildren.push(g);
      const t = new Text({ text: tabs[i], style: _tabStyle });
      t.x = tx + 4; t.y = 32;
      this.container.addChild(t);
      this._dynamicChildren.push(t);
    }

    if (this._noticeLine) {
      const notice = new Text({ text: this._noticeLine, style: new TextStyle({ fill: '#FFD080', fontSize: 10, fontFamily: 'monospace' }) });
      notice.x = 14; notice.y = 276;
      this.container.addChild(notice);
      this._dynamicChildren.push(notice);
    }

    const listY = 52;
    const itemH = 20;
    for (let i = 0; i < this._items.length; i++) {
      const item = this._items[i];
      const iy = listY + i * itemH;
      const bg = new Graphics();
      bg.rect(10, iy, PanelW - 20, itemH - 2).fill({ color: i % 2 === 0 ? '#13131F' : '#181828', alpha: 0.8 });
      this.container.addChild(bg);
      this._dynamicChildren.push(bg);
      const name = new Text({ text: item.name, style: new TextStyle({ fill: '#FFF', fontSize: 10, fontFamily: 'monospace' }) });
      name.x = 14; name.y = iy + 2;
      this.container.addChild(name);
      this._dynamicChildren.push(name);
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
    if (lx >= PanelW - 18 && ly < 22) { this.isVisible = false; return true; }
    const tabs = ['Keep', 'Send', 'Quick'];
    for (let i = 0; i < tabs.length; i++) {
      if (lx >= 6 + i * 90 && lx < 6 + (i + 1) * 90 - 4 && ly >= 28 && ly < 48) {
        this._tab = i;
        return true;
      }
    }
    const listY = 52;
    const itemH = 20;
    for (let i = 0; i < this._items.length; i++) {
      if (lx >= 10 && lx < PanelW - 10 && ly >= listY + i * itemH && ly < listY + (i + 1) * itemH) {
        this.OnSendItem?.(this._items[i].slot);
        return true;
      }
    }
    return lx >= 0 && lx < PanelW && ly >= 0 && ly < PanelH;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.isVisible = false; return true; }
    return false;
  }
}
