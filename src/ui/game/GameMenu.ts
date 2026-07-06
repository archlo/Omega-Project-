import { Container, Graphics, Sprite } from 'pixi.js';
import { Overlay } from '../Overlay.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { BuiltInFont } from '../BuiltInFont.js';

const PanelW = 93, PanelH = 167;
const ItemX = 6, ItemY0 = 24, ItemPitch = 26, ItemW = 81, ItemH = 25;
const RightMargin = 0, BottomMargin = 35;
const FadeSeconds = 0.18;

const Nodes = ['BtChannel', 'BtSkin', 'BtGameOpt', 'BtSysOpt', 'BtQuit'];
const Labels = ['Change Channel', 'Change Skin', 'Game Option', 'System Option', 'Quit Game'];

export class GameMenu extends Overlay {
  onChannel: (() => void) | null = null;
  onSkin: (() => void) | null = null;
  onGameOption: (() => void) | null = null;
  onSystemOption: (() => void) | null = null;
  onQuit: (() => void) | null = null;

  private _backgrnd: WzSprite | null;
  private _hover: (WzSprite | null)[];
  private _hoverSprites: (Sprite | null)[] = [];
  private _backSprite: Sprite | null = null;
  private _font: BuiltInFont | null;
  private _viewW = 800;
  private _viewH = 600;
  private _selected = -1;
  private _alpha = 0;
  private _lastMouse = { x: -1, y: -1 };
  private _mouseX = -1;
  private _mouseY = -1;

  constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null = null) {
    super();
    this._font = font;
    this._hover = new Array<WzSprite | null>(Nodes.length).fill(null);
    this._hoverSprites = new Array<(Sprite | null)>(Nodes.length).fill(null);

    const menu = ui?.GetItem('UIWindow.img/GameMenu');
    this._backgrnd = menu instanceof WzProperty && menu.Get('backgrnd') instanceof WzCanvas ? loader.Load(menu.Get('backgrnd') as WzCanvas) : null;
    if (this._backgrnd) {
      this._backSprite = this._backgrnd.ToPixi();
      this.container.addChild(this._backSprite);
    }
    for (let i = 0; i < Nodes.length; i++) {
      const root = menu instanceof WzProperty ? menu.Get(Nodes[i]) : null;
      this._hover[i] = root instanceof WzProperty ? this._loadState(loader, root, 'mouseOver') : null;
      if (this._hover[i]) {
        const sp = this._hover[i]!.ToPixi();
        sp.visible = false;
        this.container.addChild(sp);
        this._hoverSprites[i] = sp;
      }
    }
  }

  private _loadState(loader: WzTextureLoader, root: WzProperty, state: string): WzSprite | null {
    const s = root.Get(state);
    const c = s instanceof WzProperty ? s.Get('0') : null;
    return c instanceof WzCanvas ? loader.Load(c) : null;
  }

  private get _panelWidth(): number { return this._backgrnd?.Width ?? PanelW; }
  private get _panelHeight(): number { return this._backgrnd?.Height ?? PanelH; }

  private get _topLeft(): { x: number; y: number } {
    return { x: this._viewW - this._panelWidth - RightMargin, y: this._viewH - BottomMargin - this._panelHeight };
  }

  private get _panelBounds(): { x: number; y: number; width: number; height: number } {
    const p = this._topLeft;
    return { x: p.x, y: p.y, width: this._panelWidth, height: this._panelHeight };
  }

  private _itemRect(i: number): { x: number; y: number; width: number; height: number } {
    const p = this._topLeft;
    return { x: p.x + ItemX, y: p.y + ItemY0 + i * ItemPitch, width: ItemW, height: ItemH };
  }

  private _hitTest(x: number, y: number): number {
    for (let i = 0; i < Nodes.length; i++) {
      const r = this._itemRect(i);
      if (x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height) return i;
    }
    return -1;
  }

  Open(): void {
    this.isVisible = true;
    this._selected = -1;
    this._alpha = 0;
    this._lastMouse = { x: -1, y: -1 };
  }

  private _close(): void {
    this.isVisible = false;
    this._selected = -1;
  }

  Relayout(viewWidth: number, viewHeight: number): void {
    this._viewW = viewWidth;
    this._viewH = viewHeight;
  }

  update(_dt: number): void {
    if (!this.isVisible) { this._alpha = 0; return; }
    this._alpha = Math.min(1, this._alpha + _dt / FadeSeconds);
    const prev = this._selected;
    this._selected = this._hitTest(this._mouseX, this._mouseY);
    if (prev !== this._selected) this._updateHover();
  }

  private _updateHover(): void {
    for (let i = 0; i < Nodes.length; i++) {
      const sp = this._hoverSprites[i];
      if (sp) sp.visible = (this._selected === i) && this.isVisible;
    }
  }

  draw(): void {
    if (!this.isVisible) return;
    const p = this._topLeft;
    this.container.x = p.x;
    this.container.y = p.y;
    this.container.alpha = this._alpha;
    if (this._backSprite) {
      this._backSprite.visible = true;
    }
    this._updateHover();
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible || !down) return false;
    const hit = this._hitTest(x, y);
    if (hit >= 0) { this._activate(hit); return true; }
    return false;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this._close(); return true; }
    return false;
  }

  SetMouse(x: number, y: number): void {
    this._mouseX = x;
    this._mouseY = y;
  }

  private _activate(i: number): void {
    this._close();
    switch (i) {
      case 0: this.onChannel?.(); break;
      case 1: this.onSkin?.(); break;
      case 2: this.onGameOption?.(); break;
      case 3: this.onSystemOption?.(); break;
      case 4: this.onQuit?.(); break;
    }
  }
}
