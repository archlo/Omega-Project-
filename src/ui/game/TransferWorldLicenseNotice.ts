import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzCanvas } from '../../wz/WzCanvas.js';

// OG: CUITransferWorldLicenseNotice — inherits CDialog (modal).
// WZ: UIWindow2.img/TransferWorldLicenseNotice/backgrnd

const PANEL_W = 280;
const PANEL_H = 140;

export class TransferWorldLicenseNotice extends GamePanel {
  private _bg: Graphics;

  onClose: (() => void) | null = null;

  constructor(opts: {
    message?: string;
    loader?: WzTextureLoader;
    uiWz?: WzPackage | null;
  } = {}) {
    super();

    // OG: CUITransferWorldLicenseNotice loads from UIWindow2.img/TransferWorldLicenseNotice
    const bgNode = opts.uiWz?.GetItem('UIWindow2.img/TransferWorldLicenseNotice/backgrnd');
    const wzBg = (bgNode instanceof WzCanvas && opts.loader) ? opts.loader.Load(bgNode) : null;

    this._bg = new Graphics();
    this._root.addChild(this._bg);

    if (wzBg) {
      const s = wzBg.ToPixi();
      this._root.addChild(s);
    } else {
      this._bg.rect(0, 0, PANEL_W, PANEL_H).fill({ color: '#0C0E18', alpha: 240 / 255 });
      this._bg.rect(0, 0, PANEL_W, PANEL_H).stroke({ color: '#3C4164', width: 1 });
      this._bg.rect(0, 0, PANEL_W, 22).fill({ color: '#0F1224' });
    }

    const titleStyle = new TextStyle({ fill: '#DCC896', fontSize: 12, fontFamily: 'monospace', fontWeight: 'bold' });
    const title = new Text({ text: 'World Transfer', style: titleStyle });
    title.x = 10; title.y = 5;
    this._root.addChild(title);

    const bodyStyle = new TextStyle({ fill: '#FFFFFF', fontSize: 11, fontFamily: 'monospace', wordWrap: true, wordWrapWidth: 260 });
    const body = new Text({ text: opts.message ?? 'World transfer license required.', style: bodyStyle });
    body.x = 10; body.y = 35;
    this._root.addChild(body);

    const btnStyle = new TextStyle({ fill: '#DCC896', fontSize: 11, fontFamily: 'monospace' });
    const okBtn = new Text({ text: 'OK', style: btnStyle });
    okBtn.x = 130; okBtn.y = 115;
    okBtn.eventMode = 'static'; okBtn.cursor = 'pointer';
    okBtn.on('pointertap', () => { this.onClose?.(); this.isVisible = false; });
    this._root.addChild(okBtn);
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
