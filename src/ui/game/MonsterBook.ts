import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { BuiltInFont } from '../BuiltInFont.js';

const PanelW = 475;
const PanelH = 349;
const CardRows = 4;
const CardCols = 6;
const CardW = ((PanelW - 20) / CardCols) | 0;
const CardH = 52;

const _cardStyle = new TextStyle({ fill: '#FFF', fontSize: 8, fontFamily: 'monospace', align: 'center' });
const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 11, fontFamily: 'monospace' });
const _countStyle = new TextStyle({ fill: '#AAA', fontSize: 9, fontFamily: 'monospace' });

export interface MonsterCard {
  mobId: number;
  name: string;
  level: number;
  caught: boolean;
  count: number;
}

export class MonsterBook extends GamePanel {
  private _background: WzSprite | null;
  private _font: BuiltInFont | null;
  private _cards: MonsterCard[] = [];
  private _scroll = 0;
  private _selected = -1;
  private _total = 0;
  private _caught = 0;
  private _dynamicChildren: Container[] = [];

  constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null) {
    super();
    this._font = font;
    this.isVisible = false;
    this.container.position.set(160, 60);

    const mb = ui?.GetItem('UIWindow2.img/MonsterBook');
    const mbProp = mb instanceof WzProperty ? mb : null;
    this._background = mbProp?.Get('backgrnd') instanceof WzCanvas ? loader.Load(mbProp!.Get('backgrnd') as WzCanvas) : null;

    const title = new Text({ text: 'Monster Book', style: _titleStyle });
    title.x = 8; title.y = 5;
    this.container.addChild(title);
    // OG: CUIWnd close button
    this.createCloseButton(null, null, 1, 280);
  }

  Open(cards: MonsterCard[], total: number, caught: number): void {
    this._cards = cards;
    this._total = total;
    this._caught = caught;
    this._scroll = 0;
    this._selected = -1;
    this.isVisible = true;
  }

  update(_dt: number): void {
    if (!this.isVisible) return;
    this.draw();
  }

  draw(): void {
    if (!this.isVisible) return;
    this._rebuildBackground();
    for (const c of this._dynamicChildren) c.destroy();
    this._dynamicChildren = [];
    this._drawStats();
    this._drawCards();
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    if (!down) return true;
    const px = this.container.position.x;
    const py = this.container.position.y;
    const lx = x - px;
    const ly = y - py;

    if (lx >= PanelW - 18 && ly < 22) { this.isVisible = false; return true; }

    if (ly >= 52 && ly < 52 + CardRows * CardH) {
      const col = Math.floor((lx - 8) / CardW);
      const row = Math.floor((ly - 52) / CardH);
      const idx = row * CardCols + col + this._scroll * CardCols;
      if (col >= 0 && col < CardCols && idx >= 0 && idx < this._cards.length) {
        this._selected = idx;
        return true;
      }
    }

    // scroll buttons
    if (lx >= PanelW - 40 && lx < PanelW - 16 && ly >= PanelH - 24 && ly < PanelH - 6) {
      this._scroll = Math.min(this._scroll + 1, Math.max(0, Math.ceil(this._cards.length / (CardRows * CardCols)) - 1));
      return true;
    }
    if (lx >= PanelW - 64 && lx < PanelW - 42 && ly >= PanelH - 24 && ly < PanelH - 6) {
      this._scroll = Math.max(0, this._scroll - 1);
      return true;
    }

    return lx >= 0 && lx < PanelW && ly >= 0 && ly < PanelH;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.isVisible = false; return true; }
    return false;
  }

  private _rebuildBackground(): void {
    if (this._background) {
      const sp = this._background.ToPixi();
      this.container.addChildAt(sp, 0);
    }
  }

  private _drawStats(): void {
    const t = new Text({ text: `${this._caught} / ${this._total}`, style: _countStyle });
    t.x = PanelW - 80; t.y = 8;
    this.container.addChild(t);
    this._dynamicChildren.push(t);
  }

  private _drawCards(): void {
    const startIdx = this._scroll * CardRows * CardCols;
    for (let i = 0; i < CardRows * CardCols; i++) {
      const idx = startIdx + i;
      if (idx >= this._cards.length) break;
      const card = this._cards[idx];
      const col = i % CardCols;
      const row = Math.floor(i / CardCols);
      const cx = 8 + col * CardW;
      const cy = 52 + row * CardH;

      const bg = new Graphics();
      bg.rect(cx, cy, CardW - 2, CardH - 2)
        .fill({ color: idx === this._selected ? '#2E2E4C' : (card.caught ? '#1A2A1A' : '#1A1A28'), alpha: 0.9 });
      if (card.caught) {
        bg.rect(cx, cy, CardW - 2, 1).fill({ color: '#4A8A4A' });
      }
      this.container.addChild(bg);
      this._dynamicChildren.push(bg);

      const id = new Text({ text: `${card.mobId}`, style: _cardStyle });
      id.x = cx + 2; id.y = cy + 2;
      this.container.addChild(id);
      this._dynamicChildren.push(id);

      const name = new Text({ text: card.name.slice(0, 10), style: _cardStyle });
      name.x = cx + 2; name.y = cy + 16;
      this.container.addChild(name);
      this._dynamicChildren.push(name);

      const lvl = new Text({ text: `Lv.${card.level}`, style: _cardStyle });
      lvl.x = cx + 2; lvl.y = cy + 30;
      this.container.addChild(lvl);
      this._dynamicChildren.push(lvl);

      if (card.caught && card.count > 0) {
        const cnt = new Text({ text: `x${card.count}`, style: _cardStyle });
        cnt.x = cx + CardW - 24; cnt.y = cy + CardH - 18;
        this.container.addChild(cnt);
        this._dynamicChildren.push(cnt);
      }
    }
  }
}
