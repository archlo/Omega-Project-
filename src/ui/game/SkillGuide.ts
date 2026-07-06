import { Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';

const W = 260;
const H = 118;

export class SkillGuide extends GamePanel {
  private readonly _bg = new Graphics();
  private readonly _title = new Text({ text: 'Skill Guide', style: new TextStyle({ fill: '#ffe6a3', fontSize: 13, fontFamily: 'monospace' }) });
  private readonly _body = new Text({
    text: 'A skill guide was opened by the server.\n\nUse the Skill Book to view and level\navailable skills. Detailed guide payload\nis not decoded yet.',
    style: new TextStyle({ fill: '#ffffff', fontSize: 11, fontFamily: 'monospace' }),
  });

  constructor() {
    super();
    this._root.position.set(280, 160);
    this._bg.roundRect(0, 0, W, H, 5).fill({ color: 0x121827, alpha: 0.92 });
    this._bg.roundRect(0, 0, W, H, 5).stroke({ color: 0x7cc8ff, width: 1 });
    this._title.position.set(10, 8);
    this._body.position.set(10, 30);
    this._root.addChild(this._bg, this._title, this._body);
  }

  Open(): void {
    this.isVisible = true;
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible || !down) return this.isVisible;
    const lx = x - this._root.x;
    const ly = y - this._root.y;
    if (lx >= W - 20 && lx < W && ly >= 0 && ly < 22) {
      this.isVisible = false;
      return true;
    }
    return lx >= 0 && lx < W && ly >= 0 && ly < H;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') this.isVisible = false;
    return true;
  }
}
