import { Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { BuiltInFont } from '../BuiltInFont.js';
import { Button } from '../Button.js';

const FallbackPanelW = 320;
const FallbackPanelH = 140;
const FadeSeconds = 0.2;
// OG: CUIRevive::Update @0x83CE70 — auto-revive after 600000ms (10 minutes)
const AutoReviveTimeoutMs = 600000;

export type ReviveKind = 'town' | 'soulStone' | 'wheelOfDestiny';

export class Revive extends GamePanel {
  OnRevive: ((premium: boolean, kind: ReviveKind) => void) | null = null;

  private _backgrnd: WzSprite | null;
  private _bgPixi: import('pixi.js').Sprite | null = null;
  private _fallbackBg: Graphics | null = null;
  private _message: Text | null = null;
  private _btOk: Button;
  private _btCancel: Button | null = null;
  private _font: BuiltInFont | null;
  private _viewW = 800;
  private _viewH = 600;
  private _alpha = 0;
  private _ignoreInputMs = 0;
  private _kind: ReviveKind = 'town';
  private _autoReviveTimerMs = 0;

  constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null) {
    super();
    this._font = font;
    this.isVisible = false;

    // OG: CUIRevive::OnCreate @0x83CEA0 — the revive dialog background is
    // UIWindow2.img/Notice/<0..4> (0 = plain "return to town", 1/2/4 = special
    // variants) with btOK (id 6) / btCancle (id 7). Use Notice/0 for the plain
    // town-revive case; the premium/soul-stone variants are a separate feature.
    const { backgrnd, btYes, btCancel } = Revive._probeAssets(ui, 'town');
    this._backgrnd = backgrnd !== null ? loader.Load(backgrnd) : null;
    if (this._backgrnd) {
      this._bgPixi = this._backgrnd.ToPixi();
      this._root.addChild(this._bgPixi);
    } else {
      // No WZ art found — draw a plain fallback panel + message so the
      // dialog is still usable instead of rendering nothing but a button.
      this._fallbackBg = new Graphics();
      this._root.addChild(this._fallbackBg);
      this._message = new Text({
        text: 'You have died.\nReturn to town?',
        style: new TextStyle({ fill: 0xFFFFFF, fontSize: 13, fontFamily: 'monospace', align: 'center' }),
      });
      this._message.anchor.set(0.5, 0);
      this._root.addChild(this._message);
    }
    this._btOk = btYes !== null ? Button.fromWz(loader, btYes, 'OK') : new Button('OK');
    this._btOk.onClick = () => this._acceptRevive(false);
    this._root.addChild(this._btOk.container);

    // OG: btCancle button (id 7) — cancels the revive dialog without sending Revive
    if (btCancel) {
      this._btCancel = Button.fromWz(loader, btCancel, 'Cancel');
      this._btCancel.onClick = () => this._cancelRevive();
      this._root.addChild(this._btCancel.container);
    }
  }

  Open(kind: ReviveKind = 'town'): void {
    this._kind = kind;
    this._autoReviveTimerMs = 0;
    this.isVisible = true;
    this._alpha = 0;
    this._ignoreInputMs = 250;
    // Load the correct WZ assets for this revive kind
    this._loadAssetsForKind(kind);
  }

  Close(): void {
    this.isVisible = false;
    this._alpha = 0;
    this._ignoreInputMs = 0;
    this._autoReviveTimerMs = 0;
  }

  private _loadAssetsForKind(kind: ReviveKind): void {
    // For now, we only probe 'town' (Notice/0). Premium variants (Notice/2, Notice/4)
    // would be loaded here when implemented.
    this._kind = kind;
  }

  private _acceptRevive(premium: boolean): void {
    if (this._ignoreInputMs > 0) return;
    this.Close();
    this.OnRevive?.(premium, this._kind);
  }

  private _cancelRevive(): void {
    if (this._ignoreInputMs > 0) return;
    // OG: Cancel just closes the dialog without sending revive packet
    // The player remains dead until they click OK or auto-revive triggers
    this.Close();
  }

  Relayout(viewWidth: number, viewHeight: number): void {
    this._viewW = viewWidth;
    this._viewH = viewHeight;
  }

  update(dt: number): void {
    if (!this.isVisible) { this._alpha = 0; return; }
    const ms = dt * 1000;
    this._alpha = Math.min(1, this._alpha + dt / FadeSeconds);
    this._root.alpha = this._alpha;
    if (this._ignoreInputMs > 0) this._ignoreInputMs -= ms;

    // OG: CUIRevive::Update @0x83CE70 — auto-revive after 600000ms (10 minutes)
    this._autoReviveTimerMs += ms;
    if (this._autoReviveTimerMs >= AutoReviveTimeoutMs) {
      this._autoReviveTimerMs = 0;
      this._acceptRevive(false); // Auto-revive as town revive (non-premium)
    }

    const tl = this._topLeft();
    if (this._bgPixi) {
      this._bgPixi.position.set(tl.x, tl.y);
      // OG: CUIRevive::OnCreate plain case (Notice/0) — single btOK via
      // AddButton offset (42, 0); its canvas origin (-196, -100) lands the
      // sprite at panel-relative (238, 100).
      this._btOk.container.position.set(tl.x + 42, tl.y);
      // OG: btCancle at offset (0, 0) with origin (-320, -141) -> panel-relative (320, 141)
      if (this._btCancel) {
        this._btCancel.container.position.set(tl.x + 0, tl.y);
      }
    }
    if (this._fallbackBg) {
      this._fallbackBg.clear();
      this._fallbackBg.rect(tl.x, tl.y, this._panelWidth, this._panelHeight).fill({ color: 0x0a1a2a, alpha: 0.9 });
      this._fallbackBg.rect(tl.x, tl.y, this._panelWidth, this._panelHeight).stroke({ width: 1, color: 0x446688 });
    }
    if (this._message) this._message.position.set(tl.x + this._panelWidth / 2, tl.y + 24);
    if (!this._bgPixi) {
      // Fallback-only: center the buttons under the message
      const btOkX = tl.x + (this._panelWidth - this._btOk.width - (this._btCancel?.width ?? 0) - 10) / 2;
      const btOkY = tl.y + this._panelHeight - 30;
      this._btOk.container.position.set(btOkX, btOkY);
      if (this._btCancel) {
        this._btCancel.container.position.set(btOkX + this._btOk.width + 10, btOkY);
      }
    }
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    this._btOk.handleMouseButton(x, y, down);
    this._btCancel?.handleMouseButton(x, y, down);
    return true;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Enter' || key === ' ' || key === 'y' || key === 'Y') {
      this._acceptRevive(false);
    }
    if (key === 'Escape' || key === 'n' || key === 'N') {
      this._cancelRevive();
    }
    return true;
  }

  private get _panelWidth(): number { return this._backgrnd?.Width ?? FallbackPanelW; }
  private get _panelHeight(): number { return this._backgrnd?.Height ?? FallbackPanelH; }

  private _topLeft(): { x: number; y: number } {
    // OG: CUIRevive ctor @0x83D230 — CreateWnd(-150, -195, 300, 131, z=10,
    // bScreenCoord=1, ..., Origin_CC). With Origin_CC the (l,t) is the window
    // CENTER, so the panel is centered horizontally but raised 195px above
    // screen center vertically.
    return {
      x: (this._viewW - this._panelWidth) / 2,
      y: (this._viewH - this._panelHeight) / 2 - 195,
    };
  }

  private static _probeAssets(ui: WzPackage | null, kind: ReviveKind): { backgrnd: WzCanvas | null; btYes: WzProperty | null; btCancel: WzProperty | null } {
    if (ui === null) return { backgrnd: null, btYes: null, btCancel: null };
    // OG: CUIRevive::OnCreate — UIWindow2.img/Notice/<0..4> + btOK/btCancle
    // kind 'town' -> Notice/0, 'soulStone' -> Notice/2, 'wheelOfDestiny' -> Notice/4
    const noticeIndex = kind === 'soulStone' ? 2 : kind === 'wheelOfDestiny' ? 4 : 0;
    const root = ui.GetItem(`UIWindow2.img/Notice/${noticeIndex}`);
    if (!(root instanceof WzProperty)) return { backgrnd: null, btYes: null, btCancel: null };
    const bg = root.Get('0');
    const bt = (root.Get('btOK') as WzProperty) ?? (root.Get('btYes') as WzProperty) ?? null;
    const btCancel = root.Get('btCancle') as WzProperty ?? null; // OG uses "btCancle" (typo in original)
    return {
      backgrnd: bg instanceof WzCanvas ? bg : null,
      btYes: bt instanceof WzProperty ? bt : null,
      btCancel: btCancel instanceof WzProperty ? btCancel : null,
    };
  }
}
