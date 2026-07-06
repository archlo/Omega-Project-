import { Sprite } from 'pixi.js';
import { Overlay } from './Overlay.js';
import { WzSprite } from '../render/WzSprite.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import { WzPackage } from '../wz/WzPackage.js';
import { WzProperty } from '../wz/WzProperty.js';
import { WzCanvas } from '../wz/WzCanvas.js';
import { Button } from './Button.js';

const BgW = 249;
const BgH = 142;

export class SystemNoticeOverlay extends Overlay {
  private _loader: WzTextureLoader;
  private _ui: WzPackage | null;
  private _center: { x: number; y: number };
  private _bg: WzSprite | null;
  private _btYes: Button | null;
  private _text: WzSprite | null = null;
  private _textSprite: Sprite | null = null;
  private _onOk: (() => void) | null = null;

  constructor(loader: WzTextureLoader, ui: WzPackage | null, center: { x: number; y: number }) {
    super();
    this._loader = loader;
    this._ui = ui;
    this._center = center;

    const notice = ui?.GetItem('Login.img/Notice');
    const noticeProp = notice instanceof WzProperty ? notice : null;
    const bg0 = noticeProp?.Get('backgrnd') instanceof WzProperty ? (noticeProp!.Get('backgrnd') as WzProperty).Get('0') : null;
    this._bg = bg0 instanceof WzCanvas ? loader.Load(bg0) : null;
    this._btYes = noticeProp?.Get('BtYes') instanceof WzProperty ? new Button('OK') : null;
    if (this._btYes) this._btYes.onClick = () => this._confirm();

    const bgTL = { x: this._center.x - BgW / 2, y: this._center.y - BgH / 2 };
    if (this._bg) {
      const sp = this._bg.ToPixi();
      sp.position.set(bgTL.x, bgTL.y);
      this.container.addChild(sp);
    }
    if (this._btYes) this.container.addChild(this._btYes.container);
  }

  Show(textId: number, onOk: () => void): void {
    this._onOk = onOk;
    if (this._textSprite) { this.container.removeChild(this._textSprite); this._textSprite = null; }
    const c = this._ui?.GetItem(`Login.img/Notice/text/${textId}`);
    this._text = c instanceof WzCanvas ? this._loader.Load(c) : null;

    const bgTL = { x: this._center.x - BgW / 2, y: this._center.y - BgH / 2 };
    if (this._text) {
      this._textSprite = this._text.ToPixi();
      this._textSprite.position.set(bgTL.x + 16, bgTL.y + 30);
      this.container.addChild(this._textSprite);
    }
    if (this._btYes !== null) this._btYes.container.position.set(bgTL.x + 100, bgTL.y + 107);
    this.isVisible = true;
  }

  private _confirm(): void {
    this.isVisible = false;
    this._onOk?.();
  }

  update(_dt: number): void {
    if (!this.isVisible) return;
  }

  setMouse(x: number, y: number): void {
    if (!this.isVisible) return;
    const b = this._btYes?.bounds;
    if (b) this._btYes?.setHover(x >= b.x && x < b.x + b.width && y >= b.y && y < b.y + b.height);
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    if (this._btYes?.handleMouseButton(x, y, down) === true) return true;
    return true;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Enter' || key === 'Escape') { this._confirm(); return true; }
    return true;
  }
}
