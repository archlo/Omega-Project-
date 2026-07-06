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
const PanelH = 240;
const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 11, fontFamily: 'monospace' });
const _statStyle = new TextStyle({ fill: '#FFF', fontSize: 10, fontFamily: 'monospace' });

export class Reset extends GamePanel {
  OnApUp: ((stat: string) => void) | null = null;
  OnSpUp: ((skillId: number) => void) | null = null;

  private _background: WzSprite | null;
  private _font: BuiltInFont | null;
  private _allButtons: Button[] = [];
  private _stats = { str: 4, dex: 4, int: 4, luk: 4 };
  private _ap = 0;
  private _sp = 0;
  private _mode: 'ap' | 'sp' = 'ap';
  private _dynamicChildren: Container[] = [];

  constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null) {
    super();
    this._font = font;
    this.isVisible = false;
    this.container.position.set(260, 120);

    const paths = ['AP/step0/backgrnd', 'AP/step1/backgrnd', 'AP/step2/backgrnd', 'SP/step0/backgrnd', 'SP/step1/backgrnd', 'SP/step2/backgrnd'];
    let root = ui?.GetItem('UIWindow2.img/Reset');
    if (!(root instanceof WzProperty)) root = ui?.GetItem('IWindow2.img/Reset');
    const rootProp = root instanceof WzProperty ? root : null;
    let bgNode: WzCanvas | null = null;
    if (rootProp) {
      for (const p of paths) {
        const node = rootProp.GetItem(p);
        if (node instanceof WzCanvas) { bgNode = node; break; }
      }
    }
    this._background = bgNode ? loader.Load(bgNode) : null;

    const title = new Text({ text: 'AP Reset', style: _titleStyle });
    title.x = 8; title.y = 5;
    this.container.addChild(title);
  }

  OpenAp(stats: { str: number; dex: number; int: number; luk: number }, ap: number): void {
    this._stats = stats;
    this._ap = ap;
    this._mode = 'ap';
    this.isVisible = true;
  }

  OpenSp(sp: number): void {
    this._sp = sp;
    this._mode = 'sp';
    this.isVisible = true;
  }

  update(_dt: number): void { this.draw(); }

  draw(): void {
    if (!this.isVisible) return;
    if (this._background) this.container.addChildAt(this._background.ToPixi(), 0);
    for (const c of this._dynamicChildren) c.destroy();
    this._dynamicChildren = [];
    this._drawStats();
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

    const labels = this._mode === 'ap' ? ['STR', 'DEX', 'INT', 'LUK'] : [];
    for (let i = 0; i < labels.length; i++) {
      if (lx >= 40 && lx < 180 && ly >= 52 + i * 28 && ly < 52 + (i + 1) * 28) {
        if (this._ap > 0) {
          this.OnApUp?.(labels[i].toLowerCase());
          this._ap--;
        }
        return true;
      }
    }

    return lx >= 0 && lx < PanelW && ly >= 0 && ly < PanelH;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.isVisible = false; return true; }
    return false;
  }

  private _drawStats(): void {
    const ap = new Text({ text: `AP: ${this._ap}`, style: _statStyle });
    ap.x = 20; ap.y = 32;
    this.container.addChild(ap);
    this._dynamicChildren.push(ap);

    const labels = this._mode === 'ap' ? ['STR', 'DEX', 'INT', 'LUK'] : [];
    const values = this._mode === 'ap' ? [this._stats.str, this._stats.dex, this._stats.int, this._stats.luk] : [];

    for (let i = 0; i < labels.length; i++) {
      const ty = 52 + i * 28;
      const l = new Text({ text: `${labels[i]}: ${values[i]}`, style: _statStyle });
      l.x = 40; l.y = ty;
      this.container.addChild(l);
      this._dynamicChildren.push(l);
    }
  }
}
