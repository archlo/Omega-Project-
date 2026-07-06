import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { BuiltInFont } from '../BuiltInFont.js';
import { Button } from '../Button.js';

const PanelW = 300;
const PanelH = 220;
const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 11, fontFamily: 'monospace' });
const _msgStyle = new TextStyle({ fill: '#FFF', fontSize: 10, fontFamily: 'monospace', wordWrap: true, wordWrapWidth: PanelW - 32 });

export class Claim extends GamePanel {
  OnConfirm: (() => void) | null = null;

  private _background: WzSprite | null;
  private _font: BuiltInFont | null;
  private _allButtons: Button[] = [];
  private _btOk: Button | null = null;
  private _message = '';
  private readonly _msgText: Text;

  constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null) {
    super();
    this._font = font;
    this.isVisible = false;
    this.container.position.set(250, 150);

    const claim = ui?.GetItem('UIWindow2.img/Claim');
    const claimProp = claim instanceof WzProperty ? claim : null;
    this._background = claimProp?.Get('backgrnd') instanceof WzCanvas ? loader.Load(claimProp!.Get('backgrnd') as WzCanvas) : null;
    if (this._background) this.container.addChild(this._background.ToPixi());

    const title = new Text({ text: 'Notice', style: _titleStyle });
    title.x = 8; title.y = 5;
    this.container.addChild(title);

    this._msgText = new Text({ text: '', style: _msgStyle });
    this._msgText.x = 16; this._msgText.y = 40;
    this.container.addChild(this._msgText);

    this._btOk = this._makeButton(loader, claimProp, 'BtOk', () => { this.OnConfirm?.(); this.isVisible = false; });
    if (this._btOk) this._btOk.container.position.set(PanelW / 2 - 30, PanelH - 36);
  }

  Show(message: string): void {
    this._message = message;
    this._msgText.text = message;
    this.isVisible = true;
  }

  ShowResult(result: number, success?: boolean, claimDelayMinutes?: number): void {
    // TODO_AUDIT.md Hundred-and-fifty-fourth pass: claim packet payload is
    // decoded; full OG multi-step claim form remains out of scope here.
    const state = success === undefined ? `result ${result}` : success ? 'accepted' : 'rejected';
    const delay = claimDelayMinutes ? ` (${claimDelayMinutes}min delay)` : '';
    this.Show(`Claim ${state}${delay}.`);
  }

  ShowServiceStatus(message: string): void {
    this.Show(message);
  }

  update(_dt: number): void {}

  private _makeButton(loader: WzTextureLoader, root: WzProperty | null, name: string, onClick: () => void): Button | null {
    const pr = root?.Get(name);
    if (!(pr instanceof WzProperty)) return null;
    const b = Button.fromWz(loader, pr, name);
    b.onClick = onClick;
    this._allButtons.push(b);
    this.container.addChild(b.container);
    return b;
  }

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
    if (lx >= PanelW - 18 && ly < 22) { this.isVisible = false; return true; }
    return lx >= 0 && lx < PanelW && ly >= 0 && ly < PanelH;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.isVisible = false; return true; }
    return false;
  }
}
