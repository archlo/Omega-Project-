import { Graphics, Text, TextStyle, Container } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { Button } from '../Button.js';
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
export class ItemScrollDialog extends GamePanel {
    OnUpgrade = null;
    OnClose = null;
    _scrollItemId = 0;
    _scrollPos = 0;
    _targetItemTI = 0;
    _targetSlotPos = 0;
    _state = 0;
    _tStart = 0;
    _tEnd = 0;
    _gaugeSpeed = 60;
    _gaugeProgress = 0;
    _resultState = false;
    _result = 0;
    _returnResult = 0;
    _iuc = 0;
    _requestSent = false;
    _scrollIcon = null;
    _background;
    _font;
    _btUpgrade = null;
    _btCancel = null;
    _gaugeBarBack = null;
    _gaugeFill = null;
    _gaugeFillContainer;
    _effectSuccessFrames = [];
    _effectFailFrames = [];
    _effectContainer;
    _effectFrameIndex = 0;
    _effectFrameTimer = 0;
    _effectRunning = false;
    _effectIsSuccess = false;
    _infoText;
    _resultBg;
    _resultText;
    _allButtons = [];
    constructor(loader, ui, font) {
        super();
        this._font = font;
        this.isVisible = false;
        this.container.position.set(260, 180);
        const vh = ui?.GetItem('UIWindow.img/ViciousHammer');
        const prop = vh instanceof WzProperty ? vh : null;
        // Background
        this._background = prop?.Get('backgrnd') instanceof WzCanvas ? loader.Load(prop.Get('backgrnd')) : null;
        if (this._background)
            this.container.addChild(this._background.ToPixi());
        // Buttons — OG: BtStart at (42, 179), BtCancel at (100, 179)
        this._btUpgrade = this._makeButton(loader, prop, 'BtStart', () => this._onUpgradeClick());
        this._btCancel = this._makeButton(loader, prop, 'BtCancel', () => this._onCancelClick());
        if (this._btUpgrade) {
            this._btUpgrade.container.position.set(42, 179);
            this._btUpgrade.enabled = false;
        }
        if (this._btCancel)
            this._btCancel.container.position.set(100, 179);
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
        if (barCanvas)
            this._gaugeSpeed = barCanvas.Width / 2.7;
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
    Open(scrollItemId, scrollName, scrollPos) {
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
        if (this._btUpgrade)
            this._btUpgrade.enabled = false;
        if (this._btCancel)
            this._btCancel.enabled = true;
        this._updateGaugeGraphic();
        this._resetEffectFrames();
        this._scrollIcon = null;
        this.isVisible = true;
    }
    setScrollIcon(sprite) {
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
    tryAcceptDrag(payload, _x, _y) {
        if (!this.isVisible || this._state !== 0 || this._requestSent)
            return false;
        if (!payload || typeof payload !== 'object' || !('itemId' in payload))
            return false;
        const p = payload;
        this._targetItemTI = p.itemId;
        this._targetSlotPos = p.slotPos;
        if (this._btUpgrade)
            this._btUpgrade.enabled = true;
        this._infoText.text = `Scroll: ${this._scrollItemId} | Equip: ${p.itemId}`;
        return true;
    }
    // resultByte IS the OG's m_nReturnResult (Decode1 — first byte of the packet).
    // 65=error(Decode4→errorCode), 66=equip-issue(Decode4→subResult),
    // else Decode4→result + Decode4→iuc. 61 means success when result===0.
    OnItemUpgradeResult(resultByte, errorCode, subResult, result, iuc) {
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
            const msgs = { 1: 'No scroll selected', 2: 'Already upgraded max', 3: 'No equip target' };
            this._showMessage(msgs[subResult ?? 0] ?? `Sub-result: ${subResult}`);
            this._scheduleClose(2000);
            return;
        }
        this._resultState = true;
        if (this._state === 2)
            this._showResult();
    }
    update(_dt) {
        if (!this.isVisible)
            return;
        // Gauge animation — state 1 (filling)
        if (this._state === 1) {
            const elapsed = performance.now() - this._tStart;
            this._gaugeProgress = Math.min(elapsed * this._gaugeSpeed / 1000, GaugeMaxFill);
            this._updateGaugeGraphic();
            if (this._gaugeProgress >= GaugeMaxFill) {
                this._state = 2;
                if (this._resultState)
                    this._showResult();
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
                    }
                    else {
                        this._effectFrameIndex = frames.length - 1;
                    }
                }
                else {
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
    handleMouseButton(x, y, down) {
        if (!this.isVisible || !down)
            return false;
        const lx = x - this.container.position.x;
        const ly = y - this.container.position.y;
        for (const b of this._allButtons) {
            if (b.handleMouseButton(lx, ly, true))
                return true;
        }
        if (lx >= PanelW - 18 && ly < 22) {
            this.OnClose?.();
            this.isVisible = false;
            return true;
        }
        return lx >= 0 && lx < PanelW && ly >= 0 && ly < PanelH;
    }
    onKeyPress(key) {
        if (!this.isVisible)
            return false;
        if (key === 'Escape') {
            this.OnClose?.();
            this.isVisible = false;
            return true;
        }
        return false;
    }
    _onUpgradeClick() {
        if (this._state !== 0 || this._requestSent || !this._targetItemTI)
            return;
        this._requestSent = true;
        this._tStart = performance.now();
        this._state = 1;
        if (this._btUpgrade)
            this._btUpgrade.enabled = false;
        if (this._btCancel)
            this._btCancel.enabled = false;
        this.OnUpgrade?.(this._scrollPos, this._scrollItemId, this._targetItemTI, this._targetSlotPos);
    }
    _onCancelClick() {
        this.OnClose?.();
        this.isVisible = false;
    }
    _showResult() {
        const success = this._returnResult === 61 && this._result === 0;
        const msg = success
            ? `Upgrade success! (slots used: ${this._iuc})`
            : `Upgrade failed (result: ${this._result}, slots used: ${this._iuc})`;
        this._showMessage(msg);
        // Play effect animation
        if (success) {
            this._playEffect(true);
            this._scheduleClose(1500);
        }
        else {
            this._playEffect(false);
            this._scheduleClose(2700);
        }
    }
    _playEffect(success) {
        // TODO_AUDIT.md 134th pass: Effect_ViciousHammer OG positions
        // EffectP at (OG: 105, 89), EffectE at (OG: 81, 91)
        const frames = success ? this._effectSuccessFrames : this._effectFailFrames;
        if (frames.length === 0)
            return;
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
    _showEffectFrame(index) {
        const frames = this._effectIsSuccess ? this._effectSuccessFrames : this._effectFailFrames;
        for (let i = 0; i < frames.length; i++) {
            frames[i].visible = i === index;
        }
    }
    _resetEffectFrames() {
        for (const f of this._effectSuccessFrames)
            f.visible = false;
        for (const f of this._effectFailFrames)
            f.visible = false;
    }
    _updateGaugeGraphic() {
        if (this._gaugeFill) {
            this._gaugeFill.width = this._gaugeProgress || 0;
            this._gaugeFill.height = 9;
        }
    }
    _showMessage(msg) {
        this._resultBg.clear();
        this._resultBg.rect(0, 80, PanelW, 30).fill({ color: 0x000000, alpha: 0.7 });
        this._resultBg.visible = true;
        this._resultText.text = msg;
        this._resultText.x = PanelW / 2 - this._resultText.width / 2;
        this._resultText.y = 88;
        this._resultText.visible = true;
    }
    _scheduleClose(delay) {
        this._tEnd = performance.now() + delay;
    }
    _makeButton(loader, root, name, onClick) {
        const pr = root?.Get(name);
        if (!(pr instanceof WzProperty))
            return null;
        const b = Button.fromWz(loader, pr, name);
        b.onClick = onClick;
        this._allButtons.push(b);
        this.container.addChild(b.container);
        return b;
    }
    _loadEffectFrames(loader, prop, base, count, out) {
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
function lookupCanvas(prop, path) {
    const item = prop?.Get(path);
    return item instanceof WzCanvas ? item : null;
}
//# sourceMappingURL=ItemScrollDialog.js.map