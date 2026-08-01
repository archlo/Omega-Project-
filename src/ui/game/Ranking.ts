import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { BuiltInFont } from '../BuiltInFont.js';

const PanelW = 303;
const PanelH = 298;
const TabLabels = ['Overall', 'Warrior', 'Magician', 'Bowman', 'Thief', 'Pirate'];
const TabW = 50;
const TabH = 18;

const _headerStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 10, fontFamily: 'monospace' });
const _tabStyle = new TextStyle({ fill: '#DCC896', fontSize: 9, fontFamily: 'monospace' });
const _rowStyle = new TextStyle({ fill: '#FFF', fontSize: 9, fontFamily: 'monospace' });
const _rankStyle = new TextStyle({ fill: '#FFD700', fontSize: 9, fontFamily: 'monospace' });

export interface RankingEntry {
  rank: number;
  name: string;
  level: number;
  job: string;
  value: number;
}

export class Ranking extends GamePanel {
  private _background: WzSprite | null;
  private _font: BuiltInFont | null;
  private _tab = 0;
  private _entries: RankingEntry[] = [];
  private _rows: { name: Text; level: Text; value: Text }[] = [];
  private _dynamicChildren: Container[] = [];

  constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null) {
    super();
    this._font = font;
    this.isVisible = false;
    this.container.position.set(250, 60);

    const rank = ui?.GetItem('UIWindow2.img/Ranking');
    const rankProp = rank instanceof WzProperty ? rank : null;
    this._background = rankProp?.Get('backgrnd') instanceof WzCanvas ? loader.Load(rankProp!.Get('backgrnd') as WzCanvas) : null;

    const title = new Text({ text: 'Rankings', style: _headerStyle });
    title.x = 8; title.y = 5;
    this.container.addChild(title);
    // OG: CUIWnd close button
    this.createCloseButton(null, null, 1, 300);
  }

  Open(tab = 0, entries: RankingEntry[]): void {
    this._tab = tab;
    this._entries = entries;
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
    this._drawTabs();
    this._drawRows();
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    if (!down) return true;
    const px = this.container.position.x;
    const py = this.container.position.y;
    const lx = x - px;
    const ly = y - py;

    if (lx >= PanelW - 18 && ly < 22 && down) { this.isVisible = false; return true; }

    for (let i = 0; i < TabLabels.length; i++) {
      const tx = 6 + i * (TabW + 2);
      if (lx >= tx && lx < tx + TabW && ly >= 28 && ly < 28 + TabH) {
        this._tab = i;
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

  private _rebuildBackground(): void {
    if (this._background) {
      const sp = this._background.ToPixi();
      this.container.addChildAt(sp, 0);
    }
  }

  private _drawTabs(): void {
    for (let i = 0; i < TabLabels.length; i++) {
      const tx = 6 + i * (TabW + 2);
      const ty = 28;
      const g = new Graphics();
      if (i === this._tab) {
        g.rect(tx, ty, TabW, TabH).fill({ color: '#3A3450' });
        g.rect(tx, ty, TabW, 1).fill({ color: '#6A5A9A' });
      } else {
        g.rect(tx, ty, TabW, TabH).fill({ color: '#1A1A28' });
        g.rect(tx, ty, TabW, 1).fill({ color: '#504632' });
      }
      g.rect(tx, ty, 1, TabH).fill({ color: '#504632' });
      g.rect(tx + TabW - 1, ty, 1, TabH).fill({ color: '#504632' });
      this.container.addChild(g);
      this._dynamicChildren.push(g);
      const t = new Text({ text: TabLabels[i], style: _tabStyle });
      t.x = tx + 2; t.y = ty + 2;
      this.container.addChild(t);
      this._dynamicChildren.push(t);
    }
  }

  private _drawRows(): void {
    const startY = 52;
    const rowH = 24;
    const maxRows = Math.floor((PanelH - startY - 10) / rowH);

    for (let i = 0; i < Math.min(maxRows, this._entries.length); i++) {
      const e = this._entries[i];
      const ry = startY + i * rowH;
      const bg = new Graphics();
      bg.rect(0, ry, PanelW - 2, rowH).fill({ color: i % 2 === 0 ? '#13131F' : '#181828', alpha: 0.8 });
      this.container.addChild(bg);
      this._dynamicChildren.push(bg);

      const rank = new Text({ text: `#${e.rank}`, style: _rankStyle });
      rank.x = 6; rank.y = ry + 4;
      this.container.addChild(rank);
      this._dynamicChildren.push(rank);

      const name = new Text({ text: e.name, style: _rowStyle });
      name.x = 36; name.y = ry + 4;
      this.container.addChild(name);
      this._dynamicChildren.push(name);

      const lvl = new Text({ text: `Lv.${e.level}`, style: _rowStyle });
      lvl.x = 160; lvl.y = ry + 4;
      this.container.addChild(lvl);
      this._dynamicChildren.push(lvl);

      const job = new Text({ text: e.job, style: _rowStyle });
      job.x = 210; job.y = ry + 4;
      this.container.addChild(job);
      this._dynamicChildren.push(job);

      const val = new Text({ text: `${e.value}`, style: _rankStyle });
      val.x = PanelW - 56; val.y = ry + 4;
      this.container.addChild(val);
      this._dynamicChildren.push(val);
    }
  }
}
