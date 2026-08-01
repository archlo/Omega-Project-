import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';

// OG: CUIAccountMoreInfo — inherits CWnd.
// Account information display dialog.
// WZ: UIWindow2.img/AccountMoreInfo/backgrnd

const PANEL_W = 300;
const PANEL_H = 200;

export class AccountMoreInfo extends GamePanel {
  private _bg: Graphics;

  onClose: (() => void) | null = null;

  constructor(opts: {
    accountName?: string;
    nx?: number;
    maplePoints?: number;
    loader?: WzTextureLoader;
    uiWz?: WzPackage | null;
  } = {}) {
    super();

    // OG: CUIAccountMoreInfo loads from UIWindow2.img/AccountMoreInfo
    const bgNode = opts.uiWz?.GetItem('UIWindow2.img/AccountMoreInfo/backgrnd');
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

    const titleStyle = new TextStyle({ fill: '#DCC896', fontSize: 12, fontFamily: 'monospace', fontWeight: 'bold' });
    const title = new Text({ text: 'Account Info', style: titleStyle });
    title.x = 10; title.y = 5;
    this._root.addChild(title);

    const bodyStyle = new TextStyle({ fill: '#FFFFFF', fontSize: 11, fontFamily: 'monospace', wordWrap: true, wordWrapWidth: 280 });
    const body = new Text({
      text: `Account: ${opts.accountName ?? 'Unknown'}\nNX: ${opts.nx ?? 0}\nMaple Points: ${opts.maplePoints ?? 0}`,
      style: bodyStyle,
    });
    body.x = 10; body.y = 35;
    this._root.addChild(body);

    const closeStyle = new TextStyle({ fill: '#DCC896', fontSize: 11, fontFamily: 'monospace' });
    const closeBtn = new Text({ text: 'Close', style: closeStyle });
    closeBtn.x = 130; closeBtn.y = 170;
    closeBtn.eventMode = 'static'; closeBtn.cursor = 'pointer';
    closeBtn.on('pointertap', () => { this.onClose?.(); this.isVisible = false; });
    this._root.addChild(closeBtn);
  }

  handleMouseButton(x: number, y: number, _down: boolean): boolean {
    if (!this.isVisible) return false;
    return true;
  }

  onKeyPress(key: string): boolean {
    if ((key === 'Escape' || key === 'Enter') && this.isVisible) {
      this.onClose?.();
      this.isVisible = false;
      return true;
    }
    return false;
  }

  update(_dt: number): void {}
}
