import { Graphics, Text, TextStyle, Container } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { WzSound } from '../../wz/WzSound.js';
import { Button } from '../Button.js';
const PanelW = 178;
const PanelH = 236;
const EquipSlotX = 23;
const EquipSlotY = 148;
const ScrollSlotX = 118;
const ScrollSlotY = 148;
const ArrowX = 80;
const ArrowY = 36;
const GaugeX = 6;
const GaugeY = 190;
const GaugeFillX = 12;
const GaugeFillY = 194;
const GaugeMaxFill = 160;
const CountX = 123;
const CountY = 130;
const SuccessFrameMs = 130;
const FailFrameMs = 160;
/** EffectSpelling frame interval while gauge is running (ms). */
const SpellingFrameMs = 100;
/** EffectTwinkling total duration before auto-stop (ms). */
const TwinklingDurationMs = 2500;
const TwinklingFrameMs = 166;
export class VegaDialog extends GamePanel {
    OnEnhance = null;
    OnClose = null;
    _cashPos = 0;
    _cashItemId = 0;
    _equipItemTI = 0;
    _equipSlotPos = 0;
    _scrollItemTI = 0;
    _scrollSlotPos = 0;
    _whiteScrollUse = 0;
    _state = 0;
    _tStart = 0;
    _tEnd = 0;
    _gaugeProgress = 0;
    _resultCode = 0;
    _requestSent = false;
    _background = null;
    _btStart = null;
    _btCancel = null;
    _gaugeFill = null;
    _gaugeFillContainer;
    _arrow = null;
    _countDigits = [];
    _countContainer;
    _successFrames = [];
    _failFrames = [];
    _twinklingFrames = [];
    _spellingFrames = [];
    _effectContainer;
    _effectFrameIndex = 0;
    _effectFrameTimer = 0;
    _effectRunning = false;
    _effectIsSuccess = false;
    _spellingFrameIndex = 0;
    _spellingTimer = 0;
    _twinklingFrameIndex = 0;
    _twinklingStart = 0;
    _resultBg;
    _resultText;
    _allButtons = [];
    _equipIcon;
    _scrollIcon;
    _equipLabel;
    _scrollLabel;
    /** Item IDs that are valid scrolls (from VegaSpell numeric children). */
    _scrollList = [];
    _successSound = null;
    _failSound = null;
    _twinklingSound = null;
    _audioPlayer = null;
    constructor(loader, ui, font, soundPkg, audioPlayer) {
        super();
        this.isVisible = false;
        this.container.position.set(200, 160);
        this._audioPlayer = audioPlayer;
        const prop = ui?.GetItem('UIWindow.img/VegaSpell');
        const pr = prop instanceof WzProperty ? prop : null;
        this._background = loadCanvas(loader, pr, 'backgrnd10');
        if (this._background)
            this.container.addChild(this._background.ToPixi());
        this._loadScrollList(pr);
        this._loadSounds(soundPkg);
        this._btStart = this._makeButton(loader, pr, 'BtStart', () => this._onEnhanceClick());
        this._btCancel = this._makeButton(loader, pr, 'BtCancel', () => this._onCancelClick());
        if (this._btStart) {
            this._btStart.container.position.set(67, 200);
            this._btStart.enabled = false;
        }
        if (this._btCancel)
            this._btCancel.container.position.set(158, 8);
        // OG: m_pCanvas_Arrow = IWzResMan::GetObjectA(..., "UI/UIWindow.img/VegaSpell/EffectArrow/0")
        const arrowCanvas = lookupCanvas(pr, 'EffectArrow/0');
        if (arrowCanvas) {
            const ws = loader.Load(arrowCanvas);
            if (ws) {
                this._arrow = ws.ToPixi();
                this._arrow.position.set(ArrowX, ArrowY);
                this.container.addChild(this._arrow);
            }
        }
        // OG: m_pCanvas_GaugeBarBack = IWzResMan::GetObjectA(..., "UI/UIWindow.img/VegaSpell/GaugeBar/gauge")
        const gaugeCanvas = lookupCanvas(pr, 'GaugeBar/gauge');
        if (gaugeCanvas) {
            const ws = loader.Load(gaugeCanvas);
            if (ws) {
                this._gaugeFill = ws.ToPixi();
            }
        }
        this._gaugeFillContainer = new Container();
        this._gaugeFillContainer.position.set(GaugeFillX, GaugeFillY);
        if (this._gaugeFill)
            this._gaugeFillContainer.addChild(this._gaugeFill);
        this.container.addChild(this._gaugeFillContainer);
        this._updateGaugeGraphic();
        this._countContainer = new Container();
        this._countContainer.position.set(CountX, CountY);
        this.container.addChild(this._countContainer);
        this._loadCountDigits(loader, pr);
        this._effectContainer = new Container();
        this._effectContainer.visible = false;
        this.container.addChild(this._effectContainer);
        this._loadEffectFrames(loader, pr, 'EffectSuccess', 18, this._successFrames);
        this._loadEffectFrames(loader, pr, 'EffectFail', 6, this._failFrames);
        this._loadEffectFrames(loader, pr, 'EffectTwinkling', 15, this._twinklingFrames);
        this._loadEffectFrames(loader, pr, 'EffectSpelling', 5, this._spellingFrames);
        this._resultBg = new Graphics();
        this._resultBg.visible = false;
        this._resultText = new Text({ style: new TextStyle({ fill: '#FFFFFF', fontSize: 13, fontFamily: 'monospace' }) });
        this._resultText.visible = false;
        this.container.addChild(this._resultBg);
        this.container.addChild(this._resultText);
        this._equipIcon = new Container();
        this._equipIcon.position.set(EquipSlotX, EquipSlotY);
        this.container.addChild(this._equipIcon);
        this._scrollIcon = new Container();
        this._scrollIcon.position.set(ScrollSlotX, ScrollSlotY);
        this.container.addChild(this._scrollIcon);
        this._equipLabel = new Text({ text: 'Equip', style: new TextStyle({ fill: '#A0A0A0', fontSize: 10, fontFamily: 'monospace' }) });
        this._equipLabel.position.set(EquipSlotX, EquipSlotY + 34);
        this.container.addChild(this._equipLabel);
        this._scrollLabel = new Text({ text: 'Scroll', style: new TextStyle({ fill: '#A0A0A0', fontSize: 10, fontFamily: 'monospace' }) });
        this._scrollLabel.position.set(ScrollSlotX, ScrollSlotY + 34);
        this.container.addChild(this._scrollLabel);
    }
    Open(cashPos = 0, cashItemId = 0) {
        this._cashPos = cashPos;
        this._cashItemId = cashItemId;
        this._equipItemTI = 0;
        this._equipSlotPos = 0;
        this._scrollItemTI = 0;
        this._scrollSlotPos = 0;
        this._whiteScrollUse = 0;
        this._state = 0;
        this._tStart = 0;
        this._tEnd = 0;
        this._gaugeProgress = 0;
        this._resultCode = 0;
        this._requestSent = false;
        this._effectRunning = false;
        this._effectContainer.visible = false;
        this._spellingFrameIndex = 0;
        this._spellingTimer = 0;
        this._twinklingFrameIndex = 0;
        this._twinklingStart = 0;
        this._resultText.visible = false;
        this._resultBg.visible = false;
        if (this._btStart)
            this._btStart.enabled = false;
        if (this._btCancel)
            this._btCancel.enabled = true;
        this._equipIcon.removeChildren();
        this._scrollIcon.removeChildren();
        this._updateCount(0);
        this._updateGaugeGraphic();
        this.isVisible = true;
    }
    OnVegaResult(resultCode) {
        this._requestSent = false;
        this._resultCode = resultCode;
        if (resultCode === 68 || resultCode === 73) {
            this._state = 2;
            // OG: OnVegaResult(true) plays EffectSpelling + EffectTwinkling + sound
            this._startSpellingAnimation();
            this._startTwinklingAnimation();
            this._playSound(this._successSound);
            if (this._gaugeProgress >= GaugeMaxFill)
                this._showResult(true);
        }
        else if (resultCode === 69 || resultCode === 71) {
            this._state = 2;
            this._playSound(this._failSound);
            if (this._gaugeProgress >= GaugeMaxFill)
                this._showResult(false);
        }
        else {
            this._showMessage(`Error code: ${resultCode}`);
            this._scheduleClose(2000);
        }
    }
    setEquipIcon(sprite) {
        this._equipIcon.removeChildren();
        if (sprite)
            this._equipIcon.addChild(sprite.ToPixi());
    }
    setScrollIcon(sprite) {
        this._scrollIcon.removeChildren();
        if (sprite)
            this._scrollIcon.addChild(sprite.ToPixi());
    }
    /** Check whether `scrollId` is a valid scroll for this Vega dialog. */
    isRightScroll(scrollId) {
        if (this._scrollList.length === 0)
            return true;
        return this._scrollList.includes(scrollId);
    }
    tryAcceptDrag(payload, _x, _y) {
        if (!this.isVisible || this._state !== 0 || this._requestSent)
            return false;
        if (!payload || typeof payload !== 'object' || !('itemId' in payload))
            return false;
        const p = payload;
        if (p.itemId >= 1000000 && p.itemId < 2000000) {
            this._equipItemTI = 1;
            this._equipSlotPos = p.slotPos;
            this._equipLabel.text = `Equip: ${p.itemId}`;
        }
        else if (p.itemId >= 2000000 && p.itemId < 3000000) {
            if (this._scrollList.length > 0 && !this._scrollList.includes(p.itemId)) {
                return false;
            }
            this._scrollItemTI = 2;
            this._scrollSlotPos = p.slotPos;
            this._scrollLabel.text = `Scroll: ${p.itemId}`;
        }
        else {
            return false;
        }
        if (this._equipItemTI && this._scrollItemTI && this._btStart) {
            this._btStart.enabled = true;
        }
        return true;
    }
    update(_dt) {
        if (!this.isVisible)
            return;
        if (this._state === 1) {
            const elapsed = performance.now() - this._tStart;
            this._gaugeProgress = Math.min(elapsed * 63 / 1000, GaugeMaxFill);
            this._updateGaugeGraphic();
            // OG: EffectSpelling plays during gauge, at (85, 114) repeating
            this._updateSpellingAnimation();
            if (this._gaugeProgress >= GaugeMaxFill) {
                this._stopSpellingAnimation();
                this._state = 2;
                if (this._resultCode !== 0)
                    this._showResult(this._resultCode === 68 || this._resultCode === 73);
            }
        }
        // OG: EffectTwinkling plays for ~2500ms on success, at (85, 114)
        this._updateTwinklingAnimation();
        if (this._effectRunning) {
            const elapsed = performance.now() - this._effectFrameTimer;
            const frameMs = this._effectIsSuccess ? SuccessFrameMs : FailFrameMs;
            if (elapsed >= frameMs) {
                this._effectFrameIndex++;
                const frames = this._effectIsSuccess ? this._successFrames : this._failFrames;
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
    _onEnhanceClick() {
        if (this._state !== 0 || this._requestSent || !this._equipItemTI || !this._scrollItemTI)
            return;
        this._requestSent = true;
        this._tStart = performance.now();
        this._state = 1;
        if (this._btStart)
            this._btStart.enabled = false;
        if (this._btCancel)
            this._btCancel.enabled = false;
        this.OnEnhance?.(this._equipItemTI, this._equipSlotPos, this._scrollItemTI, this._scrollSlotPos, this._whiteScrollUse, this._cashPos, this._cashItemId);
    }
    _onCancelClick() {
        this.OnClose?.();
        this.isVisible = false;
    }
    _showResult(success) {
        const msg = success
            ? `Vega success! (code: ${this._resultCode})`
            : `Vega failed (code: ${this._resultCode})`;
        this._showMessage(msg);
        this._playEffect(success);
        this._scheduleClose(success ? 2000 : 3000);
    }
    // --- Effect animations ---
    _playEffect(success) {
        const frames = success ? this._successFrames : this._failFrames;
        if (frames.length === 0)
            return;
        this._effectRunning = true;
        this._effectIsSuccess = success;
        this._effectFrameIndex = 0;
        this._effectFrameTimer = performance.now();
        const ex = success ? 79 : 6;
        const ey = success ? 71 : 45;
        const first = frames[0];
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
        const frames = this._effectIsSuccess ? this._successFrames : this._failFrames;
        for (let i = 0; i < frames.length; i++) {
            frames[i].visible = i === index;
        }
    }
    /** EffectSpelling at (85, 114) repeating during gauge. */
    _startSpellingAnimation() {
        if (this._spellingFrames.length === 0)
            return;
        this._spellingFrameIndex = 0;
        this._spellingTimer = performance.now();
        // Show first frame immediately
        this._updateSpellingAnimation();
    }
    _updateSpellingAnimation() {
        if (this._spellingFrames.length === 0)
            return;
        const now = performance.now();
        if (now - this._spellingTimer < SpellingFrameMs)
            return;
        this._spellingTimer = now;
        this._spellingFrameIndex = (this._spellingFrameIndex + 1) % this._spellingFrames.length;
        this._showSpellingFrame(this._spellingFrameIndex);
    }
    _stopSpellingAnimation() {
    }
    _showSpellingFrame(index) {
        for (let i = 0; i < this._spellingFrames.length; i++) {
            this._spellingFrames[i].visible = i === index;
        }
    }
    _showTwinklingFrame(index) {
        for (let i = 0; i < this._twinklingFrames.length; i++) {
            this._twinklingFrames[i].visible = i === index;
        }
    }
    /** EffectTwinkling at (85, 114) for ~2500ms on success. */
    _startTwinklingAnimation() {
        if (this._twinklingFrames.length === 0)
            return;
        this._twinklingFrameIndex = 0;
        this._twinklingStart = performance.now();
        this._showTwinklingFrame(0);
        this._twinklingFrames[0].visible = true;
    }
    _updateTwinklingAnimation() {
        if (this._twinklingStart === 0 || this._twinklingFrames.length === 0)
            return;
        const elapsed = performance.now() - this._twinklingStart;
        if (elapsed >= TwinklingDurationMs) {
            this._stopTwinklingAnimation();
            return;
        }
        const frameIndex = Math.min(Math.floor(elapsed / TwinklingFrameMs), this._twinklingFrames.length - 1);
        if (frameIndex !== this._twinklingFrameIndex) {
            this._twinklingFrameIndex = frameIndex;
            this._showTwinklingFrame(frameIndex);
        }
    }
    _stopTwinklingAnimation() {
        this._twinklingStart = 0;
        this._twinklingFrameIndex = 0;
        for (const f of this._twinklingFrames)
            f.visible = false;
    }
    // --- Sound ---
    _loadSounds(soundPkg) {
        if (!soundPkg)
            return;
        const snd = soundPkg.GetItem('UI.img/VegaSuccess');
        if (snd instanceof WzSound)
            this._successSound = snd;
        const fnd = soundPkg.GetItem('UI.img/VegaFail');
        if (fnd instanceof WzSound)
            this._failSound = fnd;
        const tnd = soundPkg.GetItem('UI.img/VegaTwinkling');
        if (tnd instanceof WzSound)
            this._twinklingSound = tnd;
    }
    _playSound(sound) {
        if (sound && this._audioPlayer) {
            this._audioPlayer.PlayEffect(sound.AudioBytes);
        }
    }
    // --- Scroll list ---
    _loadScrollList(prop) {
        if (!prop)
            return;
        const list = [];
        for (const key of Object.keys(prop.Items)) {
            const num = Number(key);
            if (isNaN(num))
                continue;
            const child = prop.Items[key];
            if (child instanceof WzProperty) {
                const it = child.Items['it'];
                if (typeof it === 'number') {
                    list.push(it);
                }
                else if (typeof it === 'bigint') {
                    list.push(Number(it));
                }
            }
            else if (child instanceof WzCanvas) {
                // Some WZ formats have canvases as children (via numeric frame keys).
                // These are effect frames, not scroll entries — skip.
                continue;
            }
        }
        this._scrollList = list;
    }
    // --- Gauge ---
    _updateGaugeGraphic() {
        if (this._gaugeFill) {
            this._gaugeFill.width = this._gaugeProgress || 0;
            this._gaugeFill.height = 9;
        }
    }
    // --- Count ---
    _updateCount(value) {
        this._countContainer.removeChildren();
        const digits = String(value).split('').map(Number);
        let dx = 0;
        for (const d of digits) {
            if (d >= 0 && d < this._countDigits.length) {
                const s = this._countDigits[d];
                s.position.set(dx, 0);
                this._countContainer.addChild(s);
                dx += s.width + 1;
            }
        }
    }
    // --- Message ---
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
    // --- Load helpers ---
    _loadCountDigits(loader, prop) {
        for (let i = 0; i < 10; i++) {
            const c = lookupCanvas(prop, `Count/${i}`);
            if (c) {
                const ws = loader.Load(c);
                if (ws) {
                    const s = ws.ToPixi();
                    this._countDigits.push(s);
                }
            }
        }
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
}
function lookupCanvas(prop, path) {
    const item = prop?.GetItem(path);
    return item instanceof WzCanvas ? item : null;
}
function loadCanvas(loader, prop, path) {
    const c = lookupCanvas(prop, path);
    return c ? loader.Load(c) : null;
}
//# sourceMappingURL=VegaDialog.js.map