import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzCanvas } from '../../wz/WzCanvas.js';

// OG: CUISendGifts — inherits CUIWnd.
// WZ: UIWindow2.img/SendGifts/backgrnd

const PANEL_W = 250;
const PANEL_H = 350;

interface GiftMember { id: number; name: string; level?: number }

export class SendGifts extends GamePanel {
  private _bg: Graphics;
  private _members: GiftMember[] = [];
  private _scrollOffset = 0;
  private _selectedIndex = -1;

  onSelect: ((member: GiftMember) => void) | null = null;
  onClose: (() => void) | null = null;

  constructor(opts: {
    title?: string;
    loader?: WzTextureLoader;
    uiWz?: WzPackage | null;
  } = {}) {
    super();

    // OG: CUISendGifts loads from UIWindow2.img/SendGifts
    const bgNode = opts.uiWz?.GetItem('UIWindow2.img/SendGifts/backgrnd');
    const wzBg = (bgNode instanceof WzCanvas && opts.loader) ? opts.loader.Load(bgNode) : null;

    this._bg = new Graphics();
    this._root.addChild(this._bg);

    if (wzBg) {
      const s = wzBg.ToPixi();
      this._root.addChild(s);
    } else {
      this._bg.rect(0, 0, PANEL_W, PANEL_H).fill({ color: '#0C0E18', alpha: 220 / 255 });
      this._bg.rect(0, 0, PANEL_W, PANEL_H).stroke({ color: '#3C4164', width: 1 });
      this._bg.rect(0, 0, PANEL_W, 22).fill({ color: '#0F1224' });
    }
    this._bg.rect(0, 0, PANEL_W, PANEL_H).fill({ color: '#0C0E18', alpha: 240 / 255 });
    this._bg.rect(0, 0, PANEL_W, PANEL_H).stroke({ color: '#3C4164', width: 1 });
    this._bg.rect(0, 0, PANEL_W, 22).fill({ color: '#0F1224' });
    this._root.addChild(this._bg);

    const titleStyle = new TextStyle({ fill: '#DCC896', fontSize: 12, fontFamily: 'monospace', fontWeight: 'bold' });
    const title = new Text({ text: opts.title ?? 'Select Recipient', style: titleStyle });
    title.x = 10; title.y = 5;
    this._root.addChild(title);

    const closeStyle = new TextStyle({ fill: '#FF6666', fontSize: 12, fontFamily: 'monospace' });
    const closeBtn = new Text({ text: 'X', style: closeStyle });
    closeBtn.x = PANEL_W - 20; closeBtn.y = 5;
    closeBtn.eventMode = 'static'; closeBtn.cursor = 'pointer';
    closeBtn.on('pointertap', () => { this.onClose?.(); this.isVisible = false; });
    this._root.addChild(closeBtn);
  }

  setMembers(members: { id: number; name: string; level?: number }[]): void {
    this._members = members;
    this._scrollOffset = 0;
    this._rebuildList();
  }

  private _rebuildList(): void {
    for (let i = this._root.children.length - 1; i >= 0; i--) {
      const c = this._root.children[i];
      if ((c as any).label === 'giftMember') this._root.removeChild(c);
    }
    const itemStyle = new TextStyle({ fill: '#FFFFFF', fontSize: 11, fontFamily: 'monospace' });
    const maxVisible = Math.min(this._members.length, 15);
    for (let i = 0; i < maxVisible; i++) {
      const member = this._members[this._scrollOffset + i];
      if (!member) break;
      const text = new Text({ text: member.name, style: itemStyle });
      text.x = 10; text.y = 30 + i * 20;
      text.eventMode = 'static'; text.cursor = 'pointer';
      const idx = this._scrollOffset + i;
      text.on('pointertap', () => {
        this._selectedIndex = idx;
        this.onSelect?.(this._members[idx]);
      });
      (text as any).label = 'giftMember';
      this._root.addChild(text);
    }
  }

  setScrollBar(offset: number): void {
    this._scrollOffset = Math.max(0, Math.min(offset, this._members.length - 15));
    this._rebuildList();
  }

  handleMouseButton(x: number, y: number, _down: boolean): boolean {
    if (!this.isVisible) return false;
    return true;
  }

  onKeyPress(key: string): boolean {
    if (key === 'Escape' && this.isVisible) { this.onClose?.(); this.isVisible = false; return true; }
    if (key === 'ArrowDown') { this.setScrollBar(this._scrollOffset + 1); return true; }
    if (key === 'ArrowUp') { this.setScrollBar(this._scrollOffset - 1); return true; }
    return false;
  }

  update(_dt: number): void {}
}
