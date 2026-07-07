import { Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { BuiltInFont } from '../BuiltInFont.js';
import { Button } from '../Button.js';

const FallbackPanelW = 320;
const FallbackPanelH = 140;
const FadeSeconds = 0.2;

export class Revive extends GamePanel {
  OnRevive: ((premium: boolean) => void) | null = null;

  private _backgrnd: WzSprite | null;
  private _bgPixi: import('pixi.js').Sprite | null = null;
  private _fallbackBg: Graphics | null = null;
  private _message: Text | null = null;
  private _btOk: Button;
  private _font: BuiltInFont | null;
  private _viewW = 800;
  private _viewH = 600;
  private _alpha = 0;
  private _ignoreInputMs = 0;

  constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null) {
    super();
    this._font = font;
    this.isVisible = false;

    const { backgrnd, btYes } = Revive._probeAssets(ui);
    this._backgrnd = backgrnd !== null ? loader.Load(backgrnd) : null;
    if (this._backgrnd) {
      this._bgPixi = this._backgrnd.ToPixi();
      this._root.addChild(this._bgPixi);
    } else {
      // No WZ art found — draw a plain fallback panel + message so the
      // dialog is still usable instead of rendering nothing but a button.
      this._fallbackBg = new Graphics();
      this._root.addChild(this._fallbackBg);
      this._message = new Text({
        text: 'You have died.\nReturn to town?',
        style: new TextStyle({ fill: 0xFFFFFF, fontSize: 13, fontFamily: 'monospace', align: 'center' }),
      });
      this._message.anchor.set(0.5, 0);
      this._root.addChild(this._message);
    }
    this._btOk = btYes !== null ? Button.fromWz(loader, btYes, 'OK') : new Button('OK');
    this._btOk.onClick = () => this._acceptTownRevive();
    this._root.addChild(this._btOk.container);
  }

  Open(): void {
    this.isVisible = true;
    this._alpha = 0;
    this._ignoreInputMs = 250;
  }

  Close(): void {
    this.isVisible = false;
    this._alpha = 0;
    this._ignoreInputMs = 0;
  }

  private _acceptTownRevive(): void {
    if (this._ignoreInputMs > 0) return;
    this.Close();
    this.OnRevive?.(false);
  }

  Relayout(viewWidth: number, viewHeight: number): void {
    this._viewW = viewWidth;
    this._viewH = viewHeight;
  }

  update(dt: number): void {
    if (!this.isVisible) { this._alpha = 0; return; }
    const ms = dt * 1000;
    this._alpha = Math.min(1, this._alpha + dt / FadeSeconds);
    this._root.alpha = this._alpha;
    if (this._ignoreInputMs > 0) this._ignoreInputMs -= ms;
    const tl = this._topLeft();
    if (this._bgPixi) this._bgPixi.position.set(tl.x, tl.y);
    if (this._fallbackBg) {
      this._fallbackBg.clear();
      this._fallbackBg.rect(tl.x, tl.y, this._panelWidth, this._panelHeight).fill({ color: 0x0a1a2a, alpha: 0.9 });
      this._fallbackBg.rect(tl.x, tl.y, this._panelWidth, this._panelHeight).stroke({ width: 1, color: 0x446688 });
    }
    if (this._message) this._message.position.set(tl.x + this._panelWidth / 2, tl.y + 24);
    const btX = tl.x + (this._panelWidth - this._btOk.width) / 2;
    const btY = tl.y + this._panelHeight - 30;
    this._btOk.container.position.set(btX, btY);
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    this._btOk.handleMouseButton(x, y, down);
    return true;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Enter' || key === ' ' || key === 'y' || key === 'Y') {
      this._acceptTownRevive();
    }
    return true;
  }

  private get _panelWidth(): number { return this._backgrnd?.Width ?? FallbackPanelW; }
  private get _panelHeight(): number { return this._backgrnd?.Height ?? FallbackPanelH; }

  private _topLeft(): { x: number; y: number } {
    return {
      x: (this._viewW - this._panelWidth) / 2,
      y: (this._viewH - this._panelHeight) / 2 - 40,
    };
  }

  private static _probeAssets(ui: WzPackage | null): { backgrnd: WzCanvas | null; btYes: WzProperty | null } {
    if (ui === null) return { backgrnd: null, btYes: null };
    const candidates = ['UIWindow.img/Revive/0', 'UIWindow.img/Revive'];
    for (const path of candidates) {
      const root = ui.GetItem(path);
      if (!(root instanceof WzProperty)) continue;
      const bg = root.Get('backgrnd');
      const bt = (root.Get('BtYes') as WzProperty) ?? (root.Get('BtOK') as WzProperty) ?? (root.Get('BtRevive') as WzProperty);
      if (bg instanceof WzCanvas || bt instanceof WzProperty) {
        return { backgrnd: bg instanceof WzCanvas ? bg : null, btYes: bt instanceof WzProperty ? bt : null };
      }
    }
    return { backgrnd: null, btYes: null };
  }
}
