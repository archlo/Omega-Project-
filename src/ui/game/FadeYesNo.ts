import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { Button } from '../Button.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { WzSprite } from '../../render/WzSprite.js';

// OG: CUIFadeYesNo — generic yes/no confirmation dialog that fades in.
// Used for expedition apply (PartyResult=62 sub 78), guild/alliance confirms,
// and other confirm prompts. Not the same as Revive.ts (death dialog).
const PANEL_W = 320;
const PANEL_H = 160;
const FADE_DURATION = 0.25;
const MSG_STYLE = new TextStyle({ fill: '#FFF', fontSize: 12, fontFamily: 'monospace', wordWrap: true, wordWrapWidth: 280, align: 'center' });

export class FadeYesNo extends GamePanel {
  onYes: (() => void) | null = null;
  onNo: (() => void) | null = null;

  private _bg: Graphics;
  private _wzBg: WzSprite | null = null;
  private _msgText: Text;
  private _btYes: Button;
  private _btNo: Button;
  private _alpha = 0;
  private _ignoreInputMs = 0;
  private _viewW = 800;
  private _viewH = 600;

  constructor(loader: WzTextureLoader, ui: WzPackage | null) {
    super();
    this.isVisible = false;

    // OG: CUIFadeYesNo loads from UIWindow2.img/FadeYesNo
    const prop = ui?.GetItem('UIWindow2.img/FadeYesNo') as WzProperty | null;
    const bgNode = prop?.Get('backgrnd');
    this._wzBg = bgNode instanceof WzCanvas ? loader.Load(bgNode) ?? null : null;

    this._bg = new Graphics();
    if (!this._wzBg) this._rebuildBg();
    this._root.addChild(this._bg);

    if (this._wzBg) {
      const spr = this._wzBg.ToPixi();
      this._root.addChildAt(spr, 0);
    }

    this._msgText = new Text({ text: '', style: MSG_STYLE });
    this._msgText.anchor.set(0.5, 0);
    this._root.addChild(this._msgText);

    // OG: BtYes / BtNo buttons from WZ
    const btYesProp = prop?.Get('BtYes') as WzProperty | null;
    const btNoProp = prop?.Get('BtNo') as WzProperty | null;
    this._btYes = btYesProp ? Button.fromWz(loader, btYesProp, 'Yes') : new Button('Yes');
    this._btNo = btNoProp ? Button.fromWz(loader, btNoProp, 'No') : new Button('No');
    this._btYes.onClick = () => this._handleYes();
    this._btNo.onClick = () => this._handleNo();
    this._root.addChild(this._btYes.container);
    this._root.addChild(this._btNo.container);
  }

  Open(message: string): void {
    this._msgText.text = message;
    this.isVisible = true;
    this._alpha = 0;
    this._ignoreInputMs = 250;
    this._layout();
  }

  Close(): void {
    this.isVisible = false;
    this._alpha = 0;
    this._ignoreInputMs = 0;
  }

  Relayout(viewWidth: number, viewHeight: number): void {
    this._viewW = viewWidth;
    this._viewH = viewHeight;
  }

  update(dt: number): void {
    if (!this.isVisible) { this._alpha = 0; return; }
    const ms = dt * 1000;
    this._alpha = Math.min(1, this._alpha + dt / FADE_DURATION);
    this._root.alpha = this._alpha;
    if (this._ignoreInputMs > 0) this._ignoreInputMs -= ms;
    this._layout();
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    if (this._ignoreInputMs > 0) return true;
    if (this._btYes.handleMouseButton(x, y, down)) return true;
    if (this._btNo.handleMouseButton(x, y, down)) return true;
    // Consume clicks inside the panel
    const lx = x - this._root.x;
    const ly = y - this._root.y;
    const pw = this._wzBg?.Width ?? PANEL_W;
    const ph = this._wzBg?.Height ?? PANEL_H;
    return lx >= 0 && lx < pw && ly >= 0 && ly < ph;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (this._ignoreInputMs > 0) return true;
    if (key === 'Enter' || key === ' ' || key === 'y' || key === 'Y') {
      this._handleYes();
      return true;
    }
    if (key === 'Escape' || key === 'n' || key === 'N') {
      this._handleNo();
      return true;
    }
    return true;
  }

  private _handleYes(): void {
    if (this._ignoreInputMs > 0) return;
    this.Close();
    this.onYes?.();
  }

  private _handleNo(): void {
    if (this._ignoreInputMs > 0) return;
    this.Close();
    this.onNo?.();
  }

  private _layout(): void {
    const pw = this._wzBg?.Width ?? PANEL_W;
    const ph = this._wzBg?.Height ?? PANEL_H;
    const cx = (this._viewW - pw) / 2;
    const cy = (this._viewH - ph) / 2 - 30;
    this._root.position.set(cx, cy);

    if (this._wzBg) {
      const bgSpr = this._root.children[0] as any;
      if (bgSpr) bgSpr.position.set(0, 0);
    }

    this._msgText.position.set(pw / 2, 20);

    const btnY = ph - 36;
    const gap = 16;
    const totalBtnW = this._btYes.width + gap + this._btNo.width;
    const btnStartX = (pw - totalBtnW) / 2;
    this._btYes.container.position.set(btnStartX, btnY);
    this._btNo.container.position.set(btnStartX + this._btYes.width + gap, btnY);
  }

  private _rebuildBg(): void {
    this._bg.clear();
    this._bg.roundRect(0, 0, PANEL_W, PANEL_H, 6).fill({ color: 0x0c1628, alpha: 0.92 });
    this._bg.roundRect(0, 0, PANEL_W, PANEL_H, 6).stroke({ color: 0x446688, width: 1 });
    this._bg.rect(0, 0, PANEL_W, 22).fill({ color: 0x1a2840, alpha: 1 });
  }
}
