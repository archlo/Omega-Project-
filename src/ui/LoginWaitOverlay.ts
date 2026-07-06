import { Overlay } from './Overlay.js';
import { WzSprite } from '../render/WzSprite.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import { WzPackage } from '../wz/WzPackage.js';
import { WzProperty } from '../wz/WzProperty.js';
import { WzCanvas } from '../wz/WzCanvas.js';
import { BuiltInFont } from './BuiltInFont.js';
import { Button } from './Button.js';

export class LoginWaitOverlay extends Overlay {
  OnCancel: (() => void) | null = null;
  OnDone: (() => void) | null = null;

  private _background: WzSprite | null;
  private _btCancel: Button | null;
  private _font: BuiltInFont | null;
  private _center: { x: number; y: number };
  private _autoTimer = -1;

  constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null, center: { x: number; y: number }) {
    super();
    this._font = font;
    this._center = center;

    const wait = ui?.GetItem('Login.img/LoginWait');
    const waitProp = wait instanceof WzProperty ? wait : null;
    this._background = waitProp?.Get('backgrnd') instanceof WzCanvas ? loader.Load(waitProp!.Get('backgrnd') as WzCanvas) : null;
    if (this._background) {
      const sprite = this._background.ToPixi();
      sprite.position.set(center.x, center.y);
      this.container.addChild(sprite);
    }

    const cancelRoot = waitProp?.Get('BtCancel');
    this._btCancel = cancelRoot instanceof WzProperty
      ? Button.fromWz(loader, cancelRoot as WzProperty, 'Cancel')
      : new Button('Cancel');
    this._btCancel.onClick = () => this.OnCancel?.();
    this._btCancel.container.position.set(center.x, center.y + 40);
    this.container.addChild(this._btCancel.container);

    this.container.visible = this.isVisible;
  }

  /** Keeps the Pixi container's visibility in sync with `isVisible`. */
  setVisible(visible: boolean): void {
    this.isVisible = visible;
    this.container.visible = visible;
  }

  ShowAndThen(seconds: number, onDone: () => void): void {
    this.setVisible(true);
    this._autoTimer = seconds;
    this.OnDone = onDone;
  }

  update(_dt: number): void {
    if (!this.isVisible || this._autoTimer < 0) return;
    this._autoTimer -= _dt;
    if (this._autoTimer <= 0) {
      this._autoTimer = -1;
      this.setVisible(false);
      this.OnDone?.();
    }
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    this._btCancel?.handleMouseButton(x, y, down);
    return true;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.OnCancel?.(); return true; }
    return true;
  }
}
