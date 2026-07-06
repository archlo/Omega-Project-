import { Graphics, Text, TextStyle, Sprite, Container } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { BuiltInFont } from '../BuiltInFont.js';
import { Button } from '../Button.js';
import type { DragTarget } from '../DragController.js';
import type { ItemDragPayload } from './ItemInventory.js';

const PanelW = 178;
const PanelH = 206;

const GaugeX = 6;
const GaugeY = 152;
const GaugeFillX = 12;
const GaugeFillY = 156;
const GaugeMaxFill = 160;

const EffectEFrames = 14;
const EffectPFrames = 3;
const EffectEFrameMs = 100;
const EffectPFrameMs = 150;

export class ItemScrollDialog extends GamePanel implements DragTarget {
  OnUpgrade: ((scrollPos: number, scrollItemId: number, targetItemTI: number, targetSlotPos: number) => void) | null = null;
  OnClose: (() => void) | null = null;

  private _scrollItemId = 0;
  private _scrollPos = 0;
  private _targetItemTI = 0;
  private _targetSlotPos = 0;
  private _state: 0 | 1 | 2 = 0;
  private _tStart = 0;
  private _tEnd = 0;
  private _gaugeSpeed = 60;
  private _gaugeProgress = 0;
  private _resultState = false;
  private _result = 0;
  private _returnResult = 0;
  private _iuc = 0;
  private _requestSent = false;
  private _scrollIcon: WzSprite | null = null;

  private _background: WzSprite | null;
  private _font: BuiltInFont | null;
  private _btUpgrade: Button | null = null;
  private _btCancel: Button | null = null;
  private _gaugeBarBack: Sprite | null = null;
  private _gaugeFill: Sprite | null = null;
  private _gaugeFillContainer: Container;
  private _effectSuccessFrames: Sprite[] = [];
  private _effectFailFrames: Sprite[] = [];
  private _effectContainer: Container;
  private _effectFrameIndex = 0;
  private _effectFrameTimer = 0;
  private _effectRunning = false;
  private _effectIsSuccess = false;
  private _infoText: Text;
  private _resultBg: Graphics;
  private _resultText: Text;
  private _allButtons: Button[] = [];

  constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null) {
    super();
    this._font = font;
    this.isVisible = false;
    this.container.position.set(260, 180);

    const vh = ui?.GetItem('UIWindow.img/ViciousHammer');
    const prop = vh instanceof WzProperty ? vh : null;

    // Background
    this._background = prop?.Get('backgrnd') instanceof WzCanvas ? loader.Load(prop!.Get('backgrnd') as WzCanvas) : null;
    if (this._background) this.container.addChild(this._background.ToPixi());

    // Buttons — OG: BtStart at (42, 179), BtCancel at (100, 179)
    this._btUpgrade = this._makeButton(loader, prop, 'BtStart', () => this._onUpgradeClick());
    this._btCancel = this._makeButton(loader, prop, 'BtCancel', () => this._onCancelClick());
    if (this._btUpgrade) {
      this._btUpgrade.container.position.set(42, 179);
      this._btUpgrade.enabled = false;
    }
    if (this._btCancel) this._btCancel.container.position.set(100, 179);

    // Gauge bar background — OG: bar at (6, 152), 164×17
    const barCanvas = lookupCanvas(prop, 'GaugeBar/bar');
    if (barCanvas) {
      const barWs = loader.Load(barCanvas);
      if (barWs) {
        this._gaugeBarBack = barWs.ToPixi();
        this._gaugeBarBack.position.set(GaugeX, GaugeY);
        this.container.addChild(this._gaugeBarBack);
      }
    }

    // Gauge fill — OG: gauge (1×9) tiled from x=12, y=156 inside bar
    this._gaugeFillContainer = new Container();
    this._gaugeFillContainer.position.set(GaugeFillX, GaugeFillY);
    this.container.addChild(this._gaugeFillContainer);

    const gaugeCanvas = lookupCanvas(prop, 'GaugeBar/gauge');
    if (gaugeCanvas) {
      const gaugeWs = loader.Load(gaugeCanvas);
      if (gaugeWs) {
        const g = gaugeWs.ToPixi();
        this._gaugeFill = g;
        this._gaugeFillContainer.addChild(g);
      }
    }

    // Compute gauge speed from bar width (OG: barWidth / 2.7)
    if (barCanvas) this._gaugeSpeed = barCanvas.Width / 2.7;

    // Programmatic gauge fill fallback
    this._updateGaugeGraphic();

    // Effect frame container for EffectP/EffectE
    this._effectContainer = new Container();
    this._effectContainer.visible = false;
    this.container.addChild(this._effectContainer);

    // Load EffectP (success) frames
    this._loadEffectFrames(loader, prop, 'EffectP', EffectPFrames, this._effectSuccessFrames);
    // Load EffectE (fail) frames
    this._loadEffectFrames(loader, prop, 'EffectE', EffectEFrames, this._effectFailFrames);

    // Result background overlay + text
    this._resultBg = new Graphics();
    this._resultBg.visible = false;
    this._resultText = new Text({ style: new TextStyle({ fill: '#FFFFFF', fontSize: 13, fontFamily: 'monospace' }) });
    this._resultText.visible = false;
    this.container.addChild(this._resultBg);
    this.container.addChild(this._resultText);

    // Scroll/item info text
    this._infoText = new Text({ style: new TextStyle({ fill: '#FFE4B5', fontSize: 11, fontFamily: 'monospace' }) });
    this._infoText.x = 8;
    this._infoText.y = 5;
    this.container.addChild(this._infoText);

    // Label for the equip slot area
    const targetLabel = new Text({ text: 'Drag equip here', style: new TextStyle({ fill: '#A0A0A0', fontSize: 10, fontFamily: 'monospace' }) });
    targetLabel.x = 8;
    targetLabel.y = 100;
    this.container.addChild(targetLabel);

    const closeBtn = new Text({ text: 'X', style: new TextStyle({ fill: '#888', fontSize: 11, fontFamily: 'monospace' }) });
    closeBtn.x = PanelW - 18;
    closeBtn.y = 5;
    this.container.addChild(closeBtn);
  }

  Open(scrollItemId: number, scrollName: string, scrollPos: number): void {
    this._scrollItemId = scrollItemId;
    this._scrollPos = scrollPos;
    this._targetItemTI = 0;
    this._targetSlotPos = 0;
    this._state = 0;
    this._tStart = 0;
    this._tEnd = 0;
    this._gaugeProgress = 0;
    this._resultState = false;
    this._result = 0;
    this._returnResult = 0;
    this._iuc = 0;
    this._requestSent = false;
    this._effectRunning = false;
    this._effectContainer.visible = false;
    this._infoText.text = `Scroll: ${scrollName}`;
    this._resultText.visible = false;
    this._resultBg.visible = false;
    if (this._btUpgrade) this._btUpgrade.enabled = false;
    if (this._btCancel) this._btCancel.enabled = true;

    this._updateGaugeGraphic();
    this._resetEffectFrames();

    this._scrollIcon = null;
    this.isVisible = true;
  }

  setScrollIcon(sprite: WzSprite | null): void {
    if (this._scrollIcon) {
      this.container.removeChild(this._scrollIcon.ToPixi());
    }
    this._scrollIcon = sprite;
    if (sprite) {
      const p = sprite.ToPixi();
      p.position.set(40, 122);
      this.container.addChild(p);
    }
  }

  tryAcceptDrag(payload: unknown, _x: number, _y: number): boolean {
    if (!this.isVisible || this._state !== 0 || this._requestSent) return false;
    if (!payload || typeof payload !== 'object' || !('itemId' in payload)) return false;
    const p = payload as ItemDragPayload;
    this._targetItemTI = p.itemId;
    this._targetSlotPos = p.slotPos;
    if (this._btUpgrade) this._btUpgrade.enabled = true;
    this._infoText.text = `Scroll: ${this._scrollItemId} | Equip: ${p.itemId}`;
    return true;
  }

  // resultByte IS the OG's m_nReturnResult (Decode1 — first byte of the packet).
  // 65=error(Decode4→errorCode), 66=equip-issue(Decode4→subResult),
  // else Decode4→result + Decode4→iuc. 61 means success when result===0.
  OnItemUpgradeResult(resultByte: number, errorCode?: number, subResult?: number, result?: number, iuc?: number): void {
    this._requestSent = false;
    this._returnResult = resultByte;
    this._result = result ?? 0;
    this._iuc = iuc ?? 0;
    if (resultByte === 65) {
      this._showMessage(`Error code: ${errorCode}`);
      this._scheduleClose(2000);
      return;
    }
    if (resultByte === 66) {
      const msgs: Record<number, string> = { 1: 'No scroll selected', 2: 'Already upgraded max', 3: 'No equip target' };
      this._showMessage(msgs[subResult ?? 0] ?? `Sub-result: ${subResult}`);
      this._scheduleClose(2000);
      return;
    }
    this._resultState = true;
    if (this._state === 2) this._showResult();
  }

  update(_dt: number): void {
    if (!this.isVisible) return;

    // Gauge animation — state 1 (filling)
    if (this._state === 1) {
      const elapsed = performance.now() - this._tStart;
      this._gaugeProgress = Math.min(elapsed * this._gaugeSpeed / 1000, GaugeMaxFill);
      this._updateGaugeGraphic();

      if (this._gaugeProgress >= GaugeMaxFill) {
        this._state = 2;
        if (this._resultState) this._showResult();
      }
    }

    // Effect animation
    if (this._effectRunning) {
      const elapsed = performance.now() - this._effectFrameTimer;
      const frameMs = this._effectIsSuccess ? EffectPFrameMs : EffectEFrameMs;
      if (elapsed >= frameMs) {
        this._effectFrameIndex++;
        const frames = this._effectIsSuccess ? this._effectSuccessFrames : this._effectFailFrames;
        if (this._effectFrameIndex >= frames.length) {
          if (this._effectIsSuccess) {
            this._effectRunning = false;
            this._effectContainer.visible = false;
          } else {
            this._effectFrameIndex = frames.length - 1;
          }
        } else {
          this._showEffectFrame(this._effectFrameIndex);
        }
        this._effectFrameTimer = performance.now();
      }
    }

    // Auto-close timer
    if (this._tEnd > 0 && performance.now() > this._tEnd) {
      this.isVisible = false;
    }
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible || !down) return false;
    const lx = x - this.container.position.x;
    const ly = y - this.container.position.y;

    for (const b of this._allButtons) {
      if (b.handleMouseButton(lx, ly, true)) return true;
    }

    if (lx >= PanelW - 18 && ly < 22) { this.OnClose?.(); this.isVisible = false; return true; }
    return lx >= 0 && lx < PanelW && ly >= 0 && ly < PanelH;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.OnClose?.(); this.isVisible = false; return true; }
    return false;
  }

  private _onUpgradeClick(): void {
    if (this._state !== 0 || this._requestSent || !this._targetItemTI) return;
    this._requestSent = true;
    this._tStart = performance.now();
    this._state = 1;
    if (this._btUpgrade) this._btUpgrade.enabled = false;
    if (this._btCancel) this._btCancel.enabled = false;
    this.OnUpgrade?.(this._scrollPos, this._scrollItemId, this._targetItemTI, this._targetSlotPos);
  }

  private _onCancelClick(): void {
    this.OnClose?.();
    this.isVisible = false;
  }

  private _showResult(): void {
    const success = this._returnResult === 61 && this._result === 0;
    const msg = success
      ? `Upgrade success! (slots used: ${this._iuc})`
      : `Upgrade failed (result: ${this._result}, slots used: ${this._iuc})`;
    this._showMessage(msg);

    // Play effect animation
    if (success) {
      this._playEffect(true);
      this._scheduleClose(1500);
    } else {
      this._playEffect(false);
      this._scheduleClose(2700);
    }
  }

  private _playEffect(success: boolean): void {
    // TODO_AUDIT.md 134th pass: Effect_ViciousHammer OG positions
    // EffectP at (OG: 105, 89), EffectE at (OG: 81, 91)
    const frames = success ? this._effectSuccessFrames : this._effectFailFrames;
    if (frames.length === 0) return;

    this._effectRunning = true;
    this._effectIsSuccess = success;
    this._effectFrameIndex = 0;
    this._effectFrameTimer = performance.now();

    // Position effect centered in dialog
    const first = frames[0];
    const ex = success ? 105 : 81;
    const ey = success ? 89 : 91;
    this._effectContainer.position.set(ex, ey);

    this._effectContainer.removeChildren();
    for (const f of frames) {
      f.visible = false;
      this._effectContainer.addChild(f);
    }
    this._showEffectFrame(0);
    this._effectContainer.visible = true;
  }

  private _showEffectFrame(index: number): void {
    const frames = this._effectIsSuccess ? this._effectSuccessFrames : this._effectFailFrames;
    for (let i = 0; i < frames.length; i++) {
      frames[i].visible = i === index;
    }
  }

  private _resetEffectFrames(): void {
    for (const f of this._effectSuccessFrames) f.visible = false;
    for (const f of this._effectFailFrames) f.visible = false;
  }

  private _updateGaugeGraphic(): void {
    if (this._gaugeFill) {
      this._gaugeFill.width = this._gaugeProgress || 0;
      this._gaugeFill.height = 9;
    }
  }

  private _showMessage(msg: string): void {
    this._resultBg.clear();
    this._resultBg.rect(0, 80, PanelW, 30).fill({ color: 0x000000, alpha: 0.7 });
    this._resultBg.visible = true;
    this._resultText.text = msg;
    this._resultText.x = PanelW / 2 - this._resultText.width / 2;
    this._resultText.y = 88;
    this._resultText.visible = true;
  }

  private _scheduleClose(delay: number): void {
    this._tEnd = performance.now() + delay;
  }

  private _makeButton(loader: WzTextureLoader, root: WzProperty | null, name: string, onClick: () => void): Button | null {
    const pr = root?.Get(name);
    if (!(pr instanceof WzProperty)) return null;
    const b = Button.fromWz(loader, pr, name);
    b.onClick = onClick;
    this._allButtons.push(b);
    this.container.addChild(b.container);
    return b;
  }

  private _loadEffectFrames(loader: WzTextureLoader, prop: WzProperty | null, base: string, count: number, out: Sprite[]): void {
    for (let i = 0; i < count; i++) {
      const c = lookupCanvas(prop, `${base}/${i}`);
      if (c) {
        const ws = loader.Load(c);
        if (ws) {
          const s = ws.ToPixi();
          s.visible = false;
          out.push(s);
        }
      }
    }
  }
}

function lookupCanvas(prop: WzProperty | null, path: string): WzCanvas | null {
  const item = prop?.Get(path);
  return item instanceof WzCanvas ? item : null;
}
