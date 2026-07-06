import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { BuiltInFont } from '../BuiltInFont.js';
import { Button } from '../Button.js';

const PanelW = 280;
const PanelH = 180;
const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 11, fontFamily: 'monospace' });
const _msgStyle = new TextStyle({ fill: '#FFF', fontSize: 10, fontFamily: 'monospace', wordWrap: true, wordWrapWidth: 240 });

// OG class: likely CUIUnreleaseDlg — the WZ asset strings
// "UI/IWindow2.img/MiracleCube/BtOk"/"BtCancel"/"Effect"/"backgrnd" sit
// inside that class's code region (OnCreate@CUIUnreleaseDlg,
// UnreleaseEquipItem@CUIUnreleaseDlg). No standalone "CUIMiracleCube"/
// "PotentialDlg"/"CCubeDlg" class exists — moderate confidence, asset
// co-location not a direct method-body confirmation.
export class MiracleCube extends GamePanel {
  OnConfirm: (() => void) | null = null;
  OnCancel: (() => void) | null = null;

  private _background: WzSprite | null;
  private _font: BuiltInFont | null;
  private _allButtons: Button[] = [];
  private _btOk: Button | null = null;
  private _btCancel: Button | null = null;

  constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null) {
    super();
    this._font = font;
    this.isVisible = false;
    this.container.position.set(260, 180);

    let mc = ui?.GetItem('UIWindow2.img/MiracleCube');
    if (!(mc instanceof WzProperty)) mc = ui?.GetItem('IWindow2.img/MiracleCube');
    const mcProp = mc instanceof WzProperty ? mc : null;
    this._background = mcProp?.Get('backgrnd') instanceof WzCanvas ? loader.Load(mcProp!.Get('backgrnd') as WzCanvas) : null;
    if (this._background) this.container.addChild(this._background.ToPixi());
    this._btOk = this._makeButton(loader, mcProp, 'BtOk', () => { this.OnConfirm?.(); this.isVisible = false; });
    this._btCancel = this._makeButton(loader, mcProp, 'BtCancel', () => { this.OnCancel?.(); this.isVisible = false; });
    if (this._btOk) this._btOk.container.position.set(PanelW / 2 - 70, PanelH - 36);
    if (this._btCancel) this._btCancel.container.position.set(PanelW / 2 + 10, PanelH - 36);

    const title = new Text({ text: 'Miracle Cube', style: _titleStyle });
    title.x = 8; title.y = 5;
    this.container.addChild(title);
  }

  Open(): void {
    this.isVisible = true;
  }

  update(_dt: number): void {}

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
    if (lx >= PanelW - 18 && ly < 22) { this.OnCancel?.(); this.isVisible = false; return true; }
    return lx >= 0 && lx < PanelW && ly >= 0 && ly < PanelH;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.OnCancel?.(); this.isVisible = false; return true; }
    return false;
  }

  private _makeButton(loader: WzTextureLoader, root: WzProperty | null, name: string, onClick: () => void): Button | null {
    const pr = root?.Get(name);
    if (!(pr instanceof WzProperty)) return null;
    const b = Button.fromWz(loader, pr, name);
    b.onClick = onClick;
    this._allButtons.push(b);
    this.container.addChild(b.container);
    return b;
  }
}
