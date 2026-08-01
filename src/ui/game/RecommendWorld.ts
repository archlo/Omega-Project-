import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';

// OG: CUIRecommendWorld — inherits CWnd.
// Recommend world selection screen during login.
// Constructor: (CLogin*) — takes login pointer
// OnButtonClicked: button handler for world selection
// Draw: renders world list with recommendation
// Has: m_pLogin, world list, selected world

const PANEL_W = 400;
const PANEL_H = 350;

interface RecommendWorldInfo {
  id: number;
  name: string;
  recommended: boolean;
  eventDescription?: string;
}

export class RecommendWorld extends GamePanel {
  private _bg: Graphics;
  private _wzBg: WzSprite | null = null;
  private _worlds: RecommendWorldInfo[] = [];
  private _selectedWorld = -1;

  onWorldSelect: ((worldId: number) => void) | null = null;
  onClose: (() => void) | null = null;

  constructor(opts: {
    loader?: WzTextureLoader;
    uiWz?: WzPackage | null;
  } = {}) {
    super();

    // OG: CUIRecommendWorld loads from UIWindow2.img/RecommendWorld
    const bgNode = opts.uiWz?.GetItem('UIWindow2.img/RecommendWorld/backgrnd');
    this._wzBg = (bgNode instanceof WzCanvas && opts.loader) ? opts.loader.Load(bgNode) : null;

    this._bg = new Graphics();
    this._root.addChild(this._bg);

    if (this._wzBg) {
      const s = this._wzBg.ToPixi();
      this._root.addChild(s);
    } else {
      this._bg.rect(0, 0, PANEL_W, PANEL_H).fill({ color: '#0C0E18', alpha: 220 / 255 });
      this._bg.rect(0, 0, PANEL_W, PANEL_H).stroke({ color: '#3C4164', width: 1 });
      this._bg.rect(0, 0, PANEL_W, 22).fill({ color: '#0F1224' });
    }

    const titleStyle = new TextStyle({ fill: '#DCC896', fontSize: 14, fontFamily: 'monospace', fontWeight: 'bold' });
    const title = new Text({ text: 'Recommended World', style: titleStyle });
    title.x = 10; title.y = 5;
    this._root.addChild(title);
  }

  setWorlds(worlds: RecommendWorldInfo[]): void {
    this._worlds = worlds;
    this._rebuildWorldList();
  }

  private _rebuildWorldList(): void {
    for (let i = this._root.children.length - 1; i >= 0; i--) {
      const c = this._root.children[i];
      if ((c as any).label === 'rwdWorld') this._root.removeChild(c);
    }
    const normalStyle = new TextStyle({ fill: '#FFFFFF', fontSize: 11, fontFamily: 'monospace' });
    const recStyle = new TextStyle({ fill: '#55EE77', fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold' });
    for (let i = 0; i < this._worlds.length; i++) {
      const world = this._worlds[i];
      const label = world.recommended ? `★ ${world.name}` : world.name;
      const text = new Text({ text: label, style: world.recommended ? recStyle : normalStyle });
      text.x = 20; text.y = 40 + i * 28;
      text.eventMode = 'static'; text.cursor = 'pointer';
      const idx = i;
      text.on('pointertap', () => {
        this._selectedWorld = idx;
        this.onWorldSelect?.(world.id);
      });
      (text as any).label = 'rwdWorld';
      this._root.addChild(text);
    }
  }

  resetWorldAndMessage(reset: boolean): void {
    if (reset) {
      this._selectedWorld = -1;
      this._rebuildWorldList();
    }
  }

  handleMouseButton(x: number, y: number, _down: boolean): boolean {
    if (!this.isVisible) return false;
    return true;
  }

  onKeyPress(key: string): boolean {
    if (key === 'Escape' && this.isVisible) { this.onClose?.(); this.isVisible = false; return true; }
    return false;
  }

  update(_dt: number): void {}
}
