import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { BuiltInFont } from '../BuiltInFont.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { Button } from '../Button.js';

// OG: CUIReceiveGift — inherits CDialog (modal).
// Gift receive dialog showing received cash shop gift info.
// Has OK button to accept.

const PANEL_W = 250;
const PANEL_H = 150;

export class ReceiveGift extends GamePanel {
  private _bg: Graphics;
  private _buttons: Button[] = [];
  private _senderName = '';
  private _message = '';
  private _itemName = '';

  onAccept: ((senderName: string) => void) | null = null;
  onClose: (() => void) | null = null;

  constructor(opts: {
    senderName?: string;
    message?: string;
    itemName?: string;
  } = {}) {
    super();
    this._senderName = opts.senderName ?? '';
    this._message = opts.message ?? '';
    this._itemName = opts.itemName ?? '';

    this._bg = new Graphics();
    this._bg.rect(0, 0, PANEL_W, PANEL_H).fill({ color: '#0C0E18', alpha: 240 / 255 });
    this._bg.rect(0, 0, PANEL_W, PANEL_H).stroke({ color: '#3C4164', width: 1 });
    this._bg.rect(0, 0, PANEL_W, 22).fill({ color: '#0F1224' });
    this._root.addChild(this._bg);

    const titleStyle = new TextStyle({ fill: '#DCC896', fontSize: 12, fontFamily: 'monospace', fontWeight: 'bold' });
    const title = new Text({ text: 'Gift Received', style: titleStyle });
    title.x = 10; title.y = 5;
    this._root.addChild(title);

    const bodyStyle = new TextStyle({ fill: '#FFFFFF', fontSize: 11, fontFamily: 'monospace', wordWrap: true, wordWrapWidth: 230 });
    const body = new Text({ text: `From: ${this._senderName}\nItem: ${this._itemName}\n${this._message}`, style: bodyStyle });
    body.x = 10; body.y = 30;
    this._root.addChild(body);

    const btnStyle = new TextStyle({ fill: '#DCC896', fontSize: 11, fontFamily: 'monospace' });
    const okBtn = new Text({ text: 'OK', style: btnStyle });
    okBtn.x = 110; okBtn.y = 125;
    okBtn.eventMode = 'static'; okBtn.cursor = 'pointer';
    okBtn.on('pointertap', () => { this.onAccept?.(this._senderName); this.isVisible = false; });
    this._root.addChild(okBtn);
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    return true;
  }

  onKeyPress(key: string): boolean {
    if ((key === 'Escape' || key === 'Enter') && this.isVisible) {
      this.onAccept?.(this._senderName);
      this.isVisible = false;
      return true;
    }
    return false;
  }

  update(_dt: number): void {}
}
