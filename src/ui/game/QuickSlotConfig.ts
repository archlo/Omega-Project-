import { GamePanel } from './GamePanel.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { BuiltInFont } from '../BuiltInFont.js';
import { Button } from '../Button.js';

const PanelW = 266;
const PanelH = 238;

// OG class: CQuickslotKeyModifyDlg, backed by manager singleton
// CQuickslotKeyMappedMan (SaveQuickslotKeyMap). Separate from the always-
// visible CQuickSlot hotbar widget (see QuickSlotBar.ts).
export class QuickSlotConfig extends GamePanel {
  OnOpenKeyConfig: (() => void) | null = null;

  private _background: WzSprite | null;
  private _btSetting: Button | null;
  private _font: BuiltInFont | null;
  private _windowDrag = false;
  private _windowDragOff = { x: 0, y: 0 };

  constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null) {
    super();
    this._font = font;
    this.isVisible = false;
    this.container.position.set(360, 250);

    const qs = ui?.GetItem('UIWindow2.img/KeyConfig/quickslotConfig');
    const qsProp = qs instanceof WzProperty ? qs : null;
    this._background = qsProp?.Get('backgrnd') instanceof WzCanvas ? loader.Load(qsProp!.Get('backgrnd') as WzCanvas) : null;
    if (this._background) this.container.addChild(this._background.ToPixi());
    const st = qsProp?.Get('BtQuickSetting');
    this._btSetting = st instanceof WzProperty ? Button.fromWz(loader, st, 'Setting') : null;
    if (this._btSetting) {
      this._btSetting.onClick = () => { this.OnOpenKeyConfig?.(); };
      this.container.addChild(this._btSetting.container);
    }
  }

  Open(): void { this.isVisible = true; this._windowDrag = false; }

  update(_dt: number): void {
    if (!this.isVisible) return;
    if (this._btSetting) {
      this._btSetting.container.position.set(220, 5);
    }
  }

  setMouse(x: number, y: number): void {
    if (!this._windowDrag) return;
    this.container.position.set(x - this._windowDragOff.x, y - this._windowDragOff.y);
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    const px = this.container.position.x;
    const py = this.container.position.y;
    const inside = x >= px && x < px + PanelW && y >= py && y < py + PanelH;
    if (this._btSetting !== null && this._btSetting.handleMouseButton(x, y, down)) return true;
    if (!down) return inside;
    if (!inside) return false;
    if (y - py < 24) {
      this._windowDrag = true;
      this._windowDragOff = { x: x - px, y: y - py };
    }
    return true;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.isVisible = false; return true; }
    return false;
  }
}
