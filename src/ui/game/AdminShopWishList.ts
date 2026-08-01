import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzCanvas } from '../../wz/WzCanvas.js';

// OG: CUIAdminShopWishList — inherits CUIWnd.
// WZ: UIWindow2.img/AdminShopWishList/backgrnd

const PANEL_W = 300;
const PANEL_H = 400;

interface WishItem { itemId: number; name: string; count: number }

export class AdminShopWishList extends GamePanel {
  private _bg: Graphics;
  private _items: WishItem[] = [];

  onSelect: ((item: WishItem) => void) | null = null;
  onClose: (() => void) | null = null;

  constructor(opts: {
    loader?: WzTextureLoader;
    uiWz?: WzPackage | null;
  } = {}) {
    super();

    // OG: CUIAdminShopWishList loads from UIWindow2.img/AdminShopWishList
    const bgNode = opts.uiWz?.GetItem('UIWindow2.img/AdminShopWishList/backgrnd');
    const wzBg = (bgNode instanceof WzCanvas && opts.loader) ? opts.loader.Load(bgNode) : null;

    this._bg = new Graphics();
    this._root.addChild(this._bg);

    if (wzBg) {
      const s = wzBg.ToPixi();
      this._root.addChild(s);
    } else {
      this._bg.rect(0, 0, PANEL_W, PANEL_H).fill({ color: '#0C0E18', alpha: 220 / 255 });
      this._bg.rect(0, 0, PANEL_W, PANEL_H).stroke({ color: '#3C4164', width: 1 });
      this._bg.rect(0, 0, PANEL_W, 22).fill({ color: '#0F1224' });
    }
    this._bg.rect(0, 0, PANEL_W, PANEL_H).fill({ color: '#0C0E18', alpha: 240 / 255 });
    this._bg.rect(0, 0, PANEL_W, PANEL_H).stroke({ color: '#3C4164', width: 1 });
    this._bg.rect(0, 0, PANEL_W, 22).fill({ color: '#0F1224' });
    this._root.addChild(this._bg);

    const titleStyle = new TextStyle({ fill: '#DCC896', fontSize: 12, fontFamily: 'monospace', fontWeight: 'bold' });
    const title = new Text({ text: 'Admin Shop Wish List', style: titleStyle });
    title.x = 10; title.y = 5;
    this._root.addChild(title);

    const closeStyle = new TextStyle({ fill: '#FF6666', fontSize: 12, fontFamily: 'monospace' });
    const closeBtn = new Text({ text: 'X', style: closeStyle });
    closeBtn.x = PANEL_W - 20; closeBtn.y = 5;
    closeBtn.eventMode = 'static'; closeBtn.cursor = 'pointer';
    closeBtn.on('pointertap', () => { this.onClose?.(); this.isVisible = false; });
    this._root.addChild(closeBtn);
  }

  setItems(items: { itemId: number; name: string; count: number }[]): void {
    this._items = items;
    // Rebuild item list display
    for (let i = this._root.children.length - 1; i >= 0; i--) {
      const c = this._root.children[i];
      if ((c as any).label === 'wishItem') this._root.removeChild(c);
    }
    const itemStyle = new TextStyle({ fill: '#FFFFFF', fontSize: 11, fontFamily: 'monospace' });
    for (let i = 0; i < this._items.length; i++) {
      const item = this._items[i];
      const text = new Text({ text: `${item.name} x${item.count}`, style: itemStyle });
      text.x = 10; text.y = 30 + i * 20;
      text.eventMode = 'static'; text.cursor = 'pointer';
      const idx = i;
      text.on('pointertap', () => this.onSelect?.(this._items[idx]));
      (text as any).label = 'wishItem';
      this._root.addChild(text);
    }
  }

  handleMouseButton(x: number, y: number, _down: boolean): boolean {
    if (!this.isVisible) return false;
    return true;
  }

  onKeyPress(key: string): boolean {
    if (key === 'Escape' && this.isVisible) { this.onClose?.(); this.isVisible = false; return true; }
    return false;
  }

  update(_dt: number): void {}
}
