import { Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { BuiltInFont } from '../BuiltInFont.js';
import { ItemIconLoader } from '../../character/ItemIconLoader.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';

// OG: CUICakePieEventItemInfo — inherits CUIWnd.
// Event-specific UI for Cake/Pie event item rewards.
// Shows event item details, timer, and item display.

const PANEL_W = 200;
const PANEL_H = 250;

export class CakePieEventItemInfo extends GamePanel {
  private _bg: Graphics;
  private _slotIcon: Sprite;
  private _itemCount = 0;
  private _requiredCount = 0;
  private _eventName = '';
  private _itemId = 0;

  onUse: ((itemId: number) => void) | null = null;
  onClose: (() => void) | null = null;

  constructor(opts: {
    eventName?: string;
    itemId?: number;
    itemCount?: number;
    requiredCount?: number;
  } = {}) {
    super();
    this._eventName = opts.eventName ?? 'Cake/Pie Event';
    this._itemId = opts.itemId ?? 0;
    this._itemCount = opts.itemCount ?? 0;
    this._requiredCount = opts.requiredCount ?? 10;

    this._bg = new Graphics();
    this._bg.rect(0, 0, PANEL_W, PANEL_H).fill({ color: '#0C0E18', alpha: 240 / 255 });
    this._bg.rect(0, 0, PANEL_W, PANEL_H).stroke({ color: '#3C4164', width: 1 });
    this._bg.rect(0, 0, PANEL_W, 22).fill({ color: '#0F1224' });
    this._root.addChild(this._bg);

    const titleStyle = new TextStyle({ fill: '#DCC896', fontSize: 12, fontFamily: 'monospace', fontWeight: 'bold' });
    const title = new Text({ text: this._eventName, style: titleStyle });
    title.x = 10; title.y = 5;
    this._root.addChild(title);

    this._slotIcon = new Sprite(Texture.EMPTY);
    this._slotIcon.x = 84;
    this._slotIcon.y = 50;
    this._root.addChild(this._slotIcon);

    const countStyle = new TextStyle({ fill: '#FFFFFF', fontSize: 11, fontFamily: 'monospace' });
    const countText = new Text({ text: `${this._itemCount} / ${this._requiredCount}`, style: countStyle });
    countText.x = 80; countText.y = 90;
    countText.label = 'countText';
    this._root.addChild(countText);

    const btnStyle = new TextStyle({ fill: '#DCC896', fontSize: 11, fontFamily: 'monospace' });
    const useBtn = new Text({ text: 'Use', style: btnStyle });
    useBtn.x = 80; useBtn.y = 200;
    useBtn.eventMode = 'static'; useBtn.cursor = 'pointer';
    useBtn.on('pointertap', () => this.onUse?.(this._itemId));
    this._root.addChild(useBtn);

    const closeBtn = new Text({ text: 'Close', style: btnStyle });
    closeBtn.x = 130; closeBtn.y = 200;
    closeBtn.eventMode = 'static'; closeBtn.cursor = 'pointer';
    closeBtn.on('pointertap', () => { this.onClose?.(); this.isVisible = false; });
    this._root.addChild(closeBtn);
  }

  setItemCount(count: number): void {
    this._itemCount = count;
    // Update count display
    for (const child of this._root.children) {
      if ((child as any).label === 'countText') {
        (child as Text).text = `${this._itemCount} / ${this._requiredCount}`;
      }
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
