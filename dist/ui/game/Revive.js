import { Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { Button } from '../Button.js';
const FallbackPanelW = 320;
const FallbackPanelH = 140;
const FadeSeconds = 0.2;
export class Revive extends GamePanel {
    OnRevive = null;
    _backgrnd;
    _bgPixi = null;
    _fallbackBg = null;
    _message = null;
    _btOk;
    _font;
    _viewW = 800;
    _viewH = 600;
    _alpha = 0;
    _ignoreInputMs = 0;
    constructor(loader, ui, font) {
        super();
        this._font = font;
        this.isVisible = false;
        const { backgrnd, btYes } = Revive._probeAssets(ui);
        this._backgrnd = backgrnd !== null ? loader.Load(backgrnd) : null;
        if (this._backgrnd) {
            this._bgPixi = this._backgrnd.ToPixi();
            this._root.addChild(this._bgPixi);
        }
        else {
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
        this._btOk.onClick = () => this._acceptTownRevive();
        this._root.addChild(this._btOk.container);
    }
    Open() {
        this.isVisible = true;
        this._alpha = 0;
        this._ignoreInputMs = 250;
    }
    Close() {
        this.isVisible = false;
        this._alpha = 0;
        this._ignoreInputMs = 0;
    }
    _acceptTownRevive() {
        if (this._ignoreInputMs > 0)
            return;
        this.Close();
        this.OnRevive?.(false);
    }
    Relayout(viewWidth, viewHeight) {
        this._viewW = viewWidth;
        this._viewH = viewHeight;
    }
    update(dt) {
        if (!this.isVisible) {
            this._alpha = 0;
            return;
        }
        const ms = dt * 1000;
        this._alpha = Math.min(1, this._alpha + dt / FadeSeconds);
        this._root.alpha = this._alpha;
        if (this._ignoreInputMs > 0)
            this._ignoreInputMs -= ms;
        const tl = this._topLeft();
        if (this._bgPixi)
            this._bgPixi.position.set(tl.x, tl.y);
        if (this._fallbackBg) {
            this._fallbackBg.clear();
            this._fallbackBg.rect(tl.x, tl.y, this._panelWidth, this._panelHeight).fill({ color: 0x0a1a2a, alpha: 0.9 });
            this._fallbackBg.rect(tl.x, tl.y, this._panelWidth, this._panelHeight).stroke({ width: 1, color: 0x446688 });
        }
        if (this._message)
            this._message.position.set(tl.x + this._panelWidth / 2, tl.y + 24);
        const btX = tl.x + (this._panelWidth - this._btOk.width) / 2;
        const btY = tl.y + this._panelHeight - 30;
        this._btOk.container.position.set(btX, btY);
    }
    handleMouseButton(x, y, down) {
        if (!this.isVisible)
            return false;
        this._btOk.handleMouseButton(x, y, down);
        return true;
    }
    onKeyPress(key) {
        if (!this.isVisible)
            return false;
        if (key === 'Enter' || key === ' ' || key === 'y' || key === 'Y') {
            this._acceptTownRevive();
        }
        return true;
    }
    get _panelWidth() { return this._backgrnd?.Width ?? FallbackPanelW; }
    get _panelHeight() { return this._backgrnd?.Height ?? FallbackPanelH; }
    _topLeft() {
        return {
            x: (this._viewW - this._panelWidth) / 2,
            y: (this._viewH - this._panelHeight) / 2 - 40,
        };
    }
    static _probeAssets(ui) {
        if (ui === null)
            return { backgrnd: null, btYes: null };
        const candidates = ['UIWindow.img/Revive/0', 'UIWindow.img/Revive'];
        for (const path of candidates) {
            const root = ui.GetItem(path);
            if (!(root instanceof WzProperty))
                continue;
            const bg = root.Get('backgrnd');
            const bt = root.Get('BtYes') ?? root.Get('BtOK') ?? root.Get('BtRevive');
            if (bg instanceof WzCanvas || bt instanceof WzProperty) {
                return { backgrnd: bg instanceof WzCanvas ? bg : null, btYes: bt instanceof WzProperty ? bt : null };
            }
        }
        return { backgrnd: null, btYes: null };
    }
}
//# sourceMappingURL=Revive.js.map