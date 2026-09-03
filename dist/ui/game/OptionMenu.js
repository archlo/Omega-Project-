import { Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { Button } from '../Button.js';
const SliderX = 95;
const VideoY = 32;
const Screen800X = 65, Screen800Y = 60;
const Screen1024X = 165, Screen1024Y = 60;
const BgmSliderY = 91;
const BgmMuteX = 223, BgmMuteY = 90;
const SfxSliderY = 121;
const SfxMuteX = 223, SfxMuteY = 120;
const ComboX = 95;
const ScreenshotY = 66, ScreenshotW = 148;
const MouseSpeedY = 181;
const HpFlashY = 211;
const MpFlashY = 241;
const TrembleX = 65, TrembleY = 271;
const MobInfoY = 297, MobInfoW = 148;
const WindowedX = 65, WindowedY = 324;
const FullscreenX = 65, FullscreenY = 336;
const MinimapNormalX = 65, MinimapNormalY = 361;
const MinimapSimpleX = 147, MinimapSimpleY = 361;
const KnobW = 6, KnobH = 14, ComboH = 16;
const PanelW = 299, PanelH = 394;
const _labelStyle = new TextStyle({ fill: '#DCC896', fontSize: 11, fontFamily: 'monospace' });
const _comboText = new TextStyle({ fill: '#EBEBF5', fontSize: 10, fontFamily: 'monospace' });
const SS_LABELS = ['BMP', 'JPG', 'PNG'];
const MI_LABELS = ['Show All', 'Hide All', 'Show Boss', 'Show NPC'];
export class OptionMenu extends GamePanel {
    onSettingsChanged = null;
    config = {
        video: 0, bgmVol: 16, bgmMute: false, seVol: 20, seMute: false,
        mouseSpeed: 10, hpFlash: 10, mpFlash: 10, tremble: true,
        screenshot: 0, mobInfo: 0, largeScreen: false, windowed: true, minimapNormal: true,
    };
    _bg;
    _dynamicChildren = [];
    _labels = [];
    _dragTarget = null;
    _btOk = null;
    _btCancel = null;
    _openCombo = null;
    get BgmVolume() { return this.config.bgmMute ? 0 : this._ogToPct(this.config.bgmVol); }
    get SfxVolume() { return this.config.seMute ? 0 : this._ogToPct(this.config.seVol); }
    get HpFlash() { return this.config.hpFlash; }
    get MpFlash() { return this.config.mpFlash; }
    constructor() {
        super();
        this._root.visible = false;
        this._root.x = 220;
        this._root.y = 120;
        this._bg = new Graphics();
        this._rebuildBg();
        this._root.addChild(this._bg);
    }
    loadWz(loader, ui) {
        let raw = ui?.GetItem('UIWindow2.img/SysOpt');
        if (!(raw instanceof WzProperty))
            raw = ui?.GetItem('IWindow2.img/SysOpt');
        const sysOpt = raw instanceof WzProperty ? raw : null;
        if (!sysOpt)
            return;
        const loadBt = (path, label, cb) => {
            const prop = sysOpt.Get(path);
            if (!prop)
                return null;
            const bt = Button.fromWz(loader, prop, label);
            bt.onClick = cb;
            this._root.addChild(bt.container);
            return bt;
        };
        this._btOk = loadBt('BtOK', 'OK', () => { this.isVisible = false; this.onSettingsChanged?.(); });
        this._btCancel = loadBt('BtCancle', 'Cancel', () => { this.isVisible = false; this.onSettingsChanged?.(); });
    }
    LoadVolumes(bgm, sfx) {
        this.config.bgmVol = this._pctToOg(Math.max(0, Math.min(100, bgm)));
        this.config.seVol = this._pctToOg(Math.max(0, Math.min(100, sfx)));
    }
    LoadWarningFlash(hp, mp) {
        this.config.hpFlash = Math.max(0, Math.min(19, Math.round(hp)));
        this.config.mpFlash = Math.max(0, Math.min(19, Math.round(mp)));
    }
    update(_dt) {
        if (!this.isVisible)
            return;
        this.draw();
    }
    setPosition(x, y) {
        this._root.x = x;
        this._root.y = y;
    }
    draw() {
        if (!this.isVisible)
            return;
        this._rebuildBg();
        for (const c of this._dynamicChildren)
            c.destroy();
        this._dynamicChildren = [];
        this._drawSlider(SliderX, VideoY, 140, 4, this.config.video, false);
        this._drawCheck(Screen800X, Screen800Y, !this.config.largeScreen, '800×600');
        this._drawCheck(Screen1024X, Screen1024Y, this.config.largeScreen, '1024×768');
        this._drawCombo(ComboX, ScreenshotY, ScreenshotW, SS_LABELS[this.config.screenshot], 'screenshot');
        this._drawSlider(SliderX, BgmSliderY, 96, 20, this.config.bgmVol, this.config.bgmMute);
        this._drawCheck(BgmMuteX, BgmMuteY, this.config.bgmMute, 'Mute');
        this._drawSlider(SliderX, SfxSliderY, 96, 20, this.config.seVol, this.config.seMute);
        this._drawCheck(SfxMuteX, SfxMuteY, this.config.seMute, 'Mute');
        this._drawSlider(SliderX, MouseSpeedY, 140, 20, this.config.mouseSpeed, false);
        this._drawSlider(SliderX, HpFlashY, 140, 20, this.config.hpFlash, false);
        this._drawSlider(SliderX, MpFlashY, 140, 20, this.config.mpFlash, false);
        this._drawCheck(TrembleX, TrembleY, this.config.tremble, 'On');
        this._drawCombo(ComboX, MobInfoY, MobInfoW, MI_LABELS[this.config.mobInfo], 'mobInfo');
        this._drawCheck(WindowedX, WindowedY, this.config.windowed, 'Windowed');
        this._drawCheck(FullscreenX, FullscreenY, !this.config.windowed, 'Full Screen');
        this._drawCheck(MinimapNormalX, MinimapNormalY, this.config.minimapNormal, 'Mini-map Normal');
        this._drawCheck(MinimapSimpleX, MinimapSimpleY, !this.config.minimapNormal, 'Mini-map Simple');
        // Dropdown overlay (rendered last so it appears above everything)
        if (this._openCombo === 'screenshot') {
            this._drawDropdown(ComboX, ScreenshotY + ComboH, ScreenshotW, SS_LABELS, this.config.screenshot, (i) => { this.config.screenshot = i; this._openCombo = null; this.onSettingsChanged?.(); });
        }
        else if (this._openCombo === 'mobInfo') {
            this._drawDropdown(ComboX, MobInfoY + ComboH, MobInfoW, MI_LABELS, this.config.mobInfo, (i) => { this.config.mobInfo = i; this._openCombo = null; });
        }
        // OK/Cancel buttons at bottom-right
        const btY = PanelH - 30;
        if (this._btOk && this._btCancel) {
            const gap = 8;
            const bw = this._btOk.width + this._btCancel.width + gap;
            let bx = (PanelW - bw) / 2;
            this._btOk.container.position.set(bx, btY);
            bx += this._btOk.width + gap;
            this._btCancel.container.position.set(bx, btY);
        }
        else {
            const btW = 50, btH = 20, btGap = 8;
            const totalW = btW * 2 + btGap;
            let bx = (PanelW - totalW) / 2;
            this._drawButton(bx, btY, btW, btH, 'OK', () => { this.isVisible = false; this.onSettingsChanged?.(); });
            bx += btW + btGap;
            this._drawButton(bx, btY, btW, btH, 'Cancel', () => { this.isVisible = false; this.onSettingsChanged?.(); });
        }
    }
    _drawDropdown(x, y, w, items, sel, onSelect) {
        for (let i = 0; i < items.length; i++) {
            const iy = y + i * 18;
            const g = new Graphics();
            g.rect(x, iy, w, 18).fill({ color: i === sel ? '#3C4164' : '#0F0F19' });
            g.rect(x, iy, w, 18).stroke({ color: '#504632', width: 1 });
            if (i === sel)
                g.rect(x + 2, iy + 2, 14, 14).fill({ color: '#64DC64' });
            this._root.addChild(g);
            this._dynamicChildren.push(g);
            const t = new Text({ text: items[i], style: _comboText });
            t.x = x + 3;
            t.y = iy + 2;
            this._root.addChild(t);
            this._dynamicChildren.push(t);
        }
    }
    _drawButton(x, y, w, h, label, onClick) {
        const g = new Graphics();
        g.rect(x, y, w, h).fill({ color: '#1A1A30' });
        g.rect(x, y, w, h).stroke({ color: '#3C4164', width: 1 });
        this._root.addChild(g);
        this._dynamicChildren.push(g);
        const t = new Text({ text: label, style: new TextStyle({ fill: '#DCC896', fontSize: 10, fontFamily: 'monospace' }) });
        t.x = x + (w - t.width) / 2;
        t.y = y + (h - t.height) / 2;
        this._root.addChild(t);
        this._dynamicChildren.push(t);
    }
    _drawCombo(x, y, w, label, _id) {
        const g = new Graphics();
        g.rect(x, y, w, ComboH).fill({ color: '#0F0F19' });
        g.rect(x, y, w, ComboH).stroke({ color: '#504632', width: 1 });
        g.poly([x + w - 12, y + 4, x + w - 4, y + 4, x + w - 8, y + 12]).fill({ color: '#787878' });
        this._root.addChild(g);
        this._dynamicChildren.push(g);
        const t = new Text({ text: label, style: _comboText });
        t.x = x + 3;
        t.y = y + 2;
        this._root.addChild(t);
        this._dynamicChildren.push(t);
    }
    _drawSlider(x, y, w, max, val, muted) {
        const fill = w * val / max;
        const k = new Graphics();
        k.rect(x, y + Math.floor(KnobH / 2) - 1, Math.max(0, Math.min(w, fill)), 2).fill({ color: muted ? '#787878' : '#5A96DC' });
        const knobX = x + Math.max(0, Math.min(w, fill)) - Math.floor(KnobW / 2);
        k.rect(knobX, y - 1, KnobW, KnobH).fill({ color: muted ? '#969696' : '#EBEBF5' });
        k.rect(knobX, y - 1, KnobW, 1).fill({ color: '#46465A' });
        k.rect(knobX, y + KnobH - 2, KnobW, 1).fill({ color: '#46465A' });
        k.rect(knobX, y - 1, 1, KnobH).fill({ color: '#46465A' });
        k.rect(knobX + KnobW - 1, y - 1, 1, KnobH).fill({ color: '#46465A' });
        this._root.addChild(k);
        this._dynamicChildren.push(k);
    }
    _drawCheck(x, y, on, label) {
        const g = new Graphics();
        g.rect(x, y, 11, 11).fill({ color: '#191932' });
        g.rect(x, y, 11, 1).fill({ color: '#504632' });
        g.rect(x, y + 10, 11, 1).fill({ color: '#504632' });
        g.rect(x, y, 1, 11).fill({ color: '#504632' });
        g.rect(x + 10, y, 1, 11).fill({ color: '#504632' });
        if (on)
            g.rect(x + 2, y + 2, 7, 7).fill({ color: '#64DC64' });
        this._root.addChild(g);
        this._dynamicChildren.push(g);
        if (label) {
            const t = new Text({ text: label, style: _comboText });
            t.x = x + 14;
            t.y = y + 1;
            this._root.addChild(t);
            this._dynamicChildren.push(t);
        }
    }
    handleMouseButton(x, y, down) {
        if (!this.isVisible)
            return false;
        const lx = x - this._root.x;
        const ly = y - this._root.y;
        if (!down) {
            const wasDrag = this._dragTarget !== null;
            this._dragTarget = null;
            return wasDrag || (lx >= 0 && lx < PanelW && ly >= 0 && ly < PanelH);
        }
        // Close button (X)
        if (lx >= PanelW - 18 && ly < 22) {
            this.isVisible = false;
            this.onSettingsChanged?.();
            return true;
        }
        // WZ buttons (if loaded)
        if (this._btOk && this._hitChild(this._btOk, lx, ly)) {
            this._btOk.onClick?.();
            return true;
        }
        if (this._btCancel && this._hitChild(this._btCancel, lx, ly)) {
            this._btCancel.onClick?.();
            return true;
        }
        // Dropdown items (if a combo is open)
        if (this._openCombo) {
            const comboKey = this._openCombo;
            const cx = ComboX, cy = comboKey === 'screenshot' ? ScreenshotY : MobInfoY;
            const cw = comboKey === 'screenshot' ? ScreenshotW : MobInfoW;
            const items = comboKey === 'screenshot' ? SS_LABELS : MI_LABELS;
            for (let i = 0; i < items.length; i++) {
                const iy = cy + ComboH + i * 18;
                if (lx >= cx && lx < cx + cw && ly >= iy && ly < iy + 18) {
                    if (comboKey === 'screenshot') {
                        this.config.screenshot = i;
                    }
                    else {
                        this.config.mobInfo = i;
                    }
                    this._openCombo = null;
                    this.onSettingsChanged?.();
                    return true;
                }
            }
            this._openCombo = null;
            return true;
        }
        // Checkboxes
        if (this._hitCheck(lx, ly, Screen800X, Screen800Y) && this.config.largeScreen) {
            this.config.largeScreen = false;
            this.onSettingsChanged?.();
            return true;
        }
        if (this._hitCheck(lx, ly, Screen1024X, Screen1024Y) && !this.config.largeScreen) {
            this.config.largeScreen = true;
            this.onSettingsChanged?.();
            return true;
        }
        if (this._hitCheck(lx, ly, BgmMuteX, BgmMuteY)) {
            this.config.bgmMute = !this.config.bgmMute;
            this.onSettingsChanged?.();
            return true;
        }
        if (this._hitCheck(lx, ly, SfxMuteX, SfxMuteY)) {
            this.config.seMute = !this.config.seMute;
            this.onSettingsChanged?.();
            return true;
        }
        if (this._hitCheck(lx, ly, TrembleX, TrembleY)) {
            this.config.tremble = !this.config.tremble;
            return true;
        }
        if (this._hitCheck(lx, ly, WindowedX, WindowedY) && !this.config.windowed) {
            this.config.windowed = true;
            this.onSettingsChanged?.();
            return true;
        }
        if (this._hitCheck(lx, ly, FullscreenX, FullscreenY) && this.config.windowed) {
            this.config.windowed = false;
            this.onSettingsChanged?.();
            return true;
        }
        if (this._hitCheck(lx, ly, MinimapNormalX, MinimapNormalY) && !this.config.minimapNormal) {
            this.config.minimapNormal = true;
            return true;
        }
        if (this._hitCheck(lx, ly, MinimapSimpleX, MinimapSimpleY) && this.config.minimapNormal) {
            this.config.minimapNormal = false;
            return true;
        }
        // Combos (open dropdown)
        if (this._hitCombo(lx, ly, ComboX, ScreenshotY, ScreenshotW)) {
            this._openCombo = this._openCombo === 'screenshot' ? null : 'screenshot';
            return true;
        }
        if (this._hitCombo(lx, ly, ComboX, MobInfoY, MobInfoW)) {
            this._openCombo = this._openCombo === 'mobInfo' ? null : 'mobInfo';
            return true;
        }
        // Sliders
        if (this._hitSlider(lx, ly, SliderX, VideoY, 140)) {
            this.config.video = this._lxToVal(lx, 4, 140);
            return true;
        }
        if (this._hitSlider(lx, ly, SliderX, BgmSliderY, 96)) {
            this._dragTarget = 'bgm';
            this._setSlider('bgm', lx);
            this.onSettingsChanged?.();
            return true;
        }
        if (this._hitSlider(lx, ly, SliderX, SfxSliderY, 96)) {
            this._dragTarget = 'sfx';
            this._setSlider('sfx', lx);
            this.onSettingsChanged?.();
            return true;
        }
        if (this._hitSlider(lx, ly, SliderX, MouseSpeedY, 140)) {
            this._dragTarget = 'mouse';
            this._setSlider('mouse', lx);
            return true;
        }
        if (this._hitSlider(lx, ly, SliderX, HpFlashY, 140)) {
            this._dragTarget = 'hp';
            this._setSlider('hp', lx);
            this.onSettingsChanged?.();
            return true;
        }
        if (this._hitSlider(lx, ly, SliderX, MpFlashY, 140)) {
            this._dragTarget = 'mp';
            this._setSlider('mp', lx);
            this.onSettingsChanged?.();
            return true;
        }
        // Graphics OK/Cancel buttons (fallback when no WZ buttons)
        if (!this._btOk && !this._btCancel) {
            const btW = 50, btH = 20, btGap = 8;
            const btY = PanelH - 30;
            const totalW = btW * 2 + btGap;
            let bx = (PanelW - totalW) / 2;
            if (this._hitRect(lx, ly, bx, btY, btW, btH)) {
                this.isVisible = false;
                this.onSettingsChanged?.();
                return true;
            }
            bx += btW + btGap;
            if (this._hitRect(lx, ly, bx, btY, btW, btH)) {
                this.isVisible = false;
                this.onSettingsChanged?.();
                return true;
            }
        }
        return lx >= 0 && lx < PanelW && ly >= 0 && ly < PanelH;
    }
    _hitChild(bt, lx, ly) {
        const p = bt.container.position;
        return lx >= p.x && lx < p.x + bt.width && ly >= p.y && ly < p.y + bt.height;
    }
    _setSlider(which, lx) {
        const w = (which === 'bgm' || which === 'sfx') ? 96 : 140;
        const v = this._lxToVal(lx, 20, w);
        switch (which) {
            case 'bgm':
                this.config.bgmVol = v;
                this.config.bgmMute = false;
                break;
            case 'sfx':
                this.config.seVol = v;
                this.config.seMute = false;
                break;
            case 'mouse':
                this.config.mouseSpeed = v;
                break;
            case 'hp':
                this.config.hpFlash = v;
                break;
            case 'mp':
                this.config.mpFlash = v;
                break;
        }
    }
    _lxToVal(lx, max, sw) {
        return Math.max(0, Math.min(max, Math.round((lx - SliderX) / sw * max)));
    }
    _ogToPct(v) { return Math.round(v / 20 * 100); }
    _pctToOg(v) { return Math.max(0, Math.min(20, Math.round(v / 100 * 20))); }
    _hitRect(lx, ly, x, y, w, h) {
        return lx >= x && lx < x + w && ly >= y && ly < y + h;
    }
    _hitCheck(lx, ly, x, y) {
        return lx >= x && lx < x + 25 && ly >= y && ly < y + 13;
    }
    _hitCombo(lx, ly, x, y, w) {
        return lx >= x && lx < x + w && ly >= y && ly < y + ComboH;
    }
    _hitSlider(lx, ly, x, y, w) {
        return lx >= x && lx < x + w + KnobW && ly >= y - 3 && ly < y + KnobH + 3;
    }
    onKeyPress(key) {
        if (!this.isVisible)
            return false;
        if (key === 'Escape' || key === 'Enter') {
            this._openCombo = null;
            this.isVisible = false;
            this.onSettingsChanged?.();
            return true;
        }
        return true;
    }
    _rebuildBg() {
        this._bg.clear();
        this._bg.rect(0, 0, PanelW, PanelH).fill({ color: '#0F0F19', alpha: 235 / 255 });
        this._bg.rect(0, 0, PanelW, PanelH).stroke({ color: '#3C4164', width: 1 });
        this._bg.rect(0, 0, PanelW, 22).fill({ color: '#0F1224' });
    }
}
//# sourceMappingURL=OptionMenu.js.map