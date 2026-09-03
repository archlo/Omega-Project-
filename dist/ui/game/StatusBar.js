import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { Button } from '../Button.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
const BAR_W = 1024;
const BAR_H = 85;
const HP_GAUGE = { x: 254, y: 53, len: 138 };
const MP_GAUGE = { x: 423, y: 53, len: 138 };
const EXP_GAUGE = { x: 254, y: 69, len: 308 };
const HP_NUM = { x: 389, y: 55 };
const MP_NUM = { x: 558, y: 55 };
const EXP_NUM = { x: 558, y: 71 };
const LV_NUM = { x: 45, y: 59 };
const JOB_POS = { x: 75, y: 52 };
const NAME_POS = { x: 75, y: 64 };
const _labelStyle = new TextStyle({ fill: '#CCC', fontSize: 11, fontFamily: 'monospace' });
const _valueStyle = new TextStyle({ fill: '#FFF', fontSize: 11, fontFamily: 'monospace' });
const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 12, fontFamily: 'monospace' });
export class StatusBar extends GamePanel {
    level = 1;
    charName = '';
    jobName = 'Beginner';
    hp = 50;
    maxHp = 50;
    mp = 30;
    maxMp = 30;
    exp = 0;
    nextExp = 100;
    hpFlash = 10;
    mpFlash = 10;
    onCharacter = null;
    onStats = null;
    onQuest = null;
    onItems = null;
    onEquip = null;
    onSkills = null;
    onKeys = null;
    onChannel = null;
    onCashShop = null;
    onMenu = null;
    onSystem = null;
    onMTS = null;
    onChat = null;
    onClaim = null;
    onCommunity = null;
    onRanking = null;
    onGameOption = null;
    onSystemOption = null;
    onJoyPad = null;
    onInfo = null;
    onOptions = null;
    onQuit = null;
    _viewW = 800;
    _viewH = 600;
    _hpPct = 0;
    _mpPct = 0;
    _expPct = 0;
    _pastHp = 25;
    _pastMp = 15;
    _hpFlashTime = 0;
    _mpFlashTime = 0;
    _mouseX = 0;
    _mouseY = 0;
    _bgSprite;
    _lvBackSprite;
    _lvCoverSprite;
    _gaugeBackSprite;
    _gaugeCoverSprite;
    _noticeSprite;
    _quickSlotSprite;
    _hpCap = [null, null, null];
    _mpCap = [null, null, null];
    _expCap = [null, null, null];
    _gaugeGlyphs = new Map();
    _lvDigits = Array(10).fill(null);
    // Cached gauge text sprites — keyed by text string, reused when unchanged
    _gaugeTextCache = new Map();
    _gaugeTextWidths = new Map();
    _lastHpText = '';
    _lastMpText = '';
    _lastExpText = '';
    _textDirty = true;
    _hpOverlay = [null, null];
    _mpOverlay = [null, null];
    _flashHp = { time: 0, frame: 0 };
    _flashMp = { time: 0, frame: 0 };
    // OG: CUIToolTip — tooltip overlay for EXP gauge hover
    _tooltipText = null;
    _tooltipBg = null;
    _buttons = [];
    _font;
    _smallFont;
    _gaugeGfx;
    _gaugeLayer = new Container();
    _textLayer = new Container();
    _levelText;
    _nameText;
    _nameTextWhite;
    _openPopup = null;
    _menuPopup = null;
    _systemPopup = null;
    _btMenu;
    _btSystem;
    constructor(loader, ui, font, smallFont) {
        super();
        this._font = font;
        this._smallFont = smallFont ?? font;
        this.isVisible = true;
        const bar = ui?.GetItem('StatusBar2.img/mainBar') ?? null;
        this._bgSprite = this._canvas(loader, bar, 'backgrnd');
        this._lvBackSprite = this._canvas(loader, bar, 'lvBacktrnd');
        this._lvCoverSprite = this._canvas(loader, bar, 'lvCover');
        this._gaugeBackSprite = this._canvas(loader, bar, 'gaugeBackgrd');
        this._gaugeCoverSprite = this._canvas(loader, bar, 'gaugeCover');
        this._noticeSprite = this._canvas(loader, bar, 'notice');
        const gauge = bar?.Get('gauge') ?? null;
        for (let i = 0; i < 3; i++) {
            this._hpCap[i] = this._canvas(loader, gauge?.Get('hp') ?? null, String(i));
            this._mpCap[i] = this._canvas(loader, gauge?.Get('mp') ?? null, String(i));
            this._expCap[i] = this._canvas(loader, gauge?.Get('exp') ?? null, String(i));
        }
        const numNode = gauge?.Get('number');
        if (numNode) {
            for (const [k, v] of Object.entries(numNode.Items)) {
                if (k.length === 1 && v instanceof WzCanvas) {
                    const g = loader.Load(v);
                    if (g)
                        this._gaugeGlyphs.set(k[0], g);
                }
            }
        }
        const lvNode = bar?.Get('lvNumber');
        if (lvNode) {
            for (let i = 0; i < 10; i++) {
                this._lvDigits[i] = this._canvas(loader, lvNode, String(i));
            }
        }
        // quickSlot slot sprite no longer loaded here — QuickSlotBar owns its own rendering
        this._quickSlotSprite = null;
        this._gaugeGfx = new Graphics();
        this._gaugeLayer = new Container();
        this._textLayer = new Container();
        this._levelText = new Text({ text: '', style: _titleStyle });
        this._nameText = new Text({ text: '', style: _valueStyle });
        this._nameTextWhite = new Text({ text: '', style: new TextStyle({ fill: 0xffffff, fontSize: 11, fontFamily: 'monospace' }) });
        this._root.addChild(this._gaugeGfx, this._gaugeLayer, this._textLayer);
        for (const cap of [...this._hpCap, ...this._mpCap, ...this._expCap]) {
            if (cap) {
                cap.visible = false;
                this._gaugeLayer.addChild(cap);
            }
        }
        this._loadOverlayFrames(loader, bar, 'aniHPGauge', this._hpOverlay);
        this._loadOverlayFrames(loader, bar, 'aniMPGauge', this._mpOverlay);
        this._btMenu = this._addButton(loader, bar, 'BtMenu', () => this._toggle(this._menuPopup));
        this._btSystem = this._addButton(loader, bar, 'BtSystem', () => this._toggle(this._systemPopup));
        this._addButton(loader, bar, 'BtCharacter', () => this.onCharacter?.());
        this._addButton(loader, bar, 'BtStat', () => this.onStats?.());
        this._addButton(loader, bar, 'BtQuest', () => this.onQuest?.());
        this._addButton(loader, bar, 'BtInven', () => this.onItems?.());
        this._addButton(loader, bar, 'BtEquip', () => this.onEquip?.());
        this._addButton(loader, bar, 'BtSkill', () => this.onSkills?.());
        this._addButton(loader, bar, 'BtKeysetting', () => this.onKeys?.());
        this._addButton(loader, bar, 'BtChannel', () => this.onChannel?.());
        this._addButton(loader, bar, 'BtCashShop', () => this.onCashShop?.());
        this._addButton(loader, bar, 'BtMTS', () => this.onMTS?.());
        this._addButton(loader, bar, 'BtChat', () => this.onChat?.());
        this._addButton(loader, bar, 'BtClaim', () => this.onClaim?.());
        const menuRoot = bar?.Get('Menu') ?? null;
        if (this._btMenu && menuRoot) {
            this._menuPopup = new SubMenu(loader, menuRoot, this._btMenu, [
                ['BtItem', () => { this._openPopup = null; this.onItems?.(); }],
                ['BtEquip', () => { this._openPopup = null; this.onEquip?.(); }],
                ['BtStat', () => { this._openPopup = null; this.onStats?.(); }],
                ['BtSkill', () => { this._openPopup = null; this.onSkills?.(); }],
                ['BtCommunity', () => { this._openPopup = null; this.onCommunity?.(); }],
                ['BtQuest', () => { this._openPopup = null; this.onQuest?.(); }],
                ['BtMSN', () => { this._openPopup = null; this.onInfo?.(); }],
                ['BtRank', () => { this._openPopup = null; this.onRanking?.(); }],
            ]);
        }
        const systemRoot = bar?.Get('System') ?? null;
        if (this._btSystem && systemRoot) {
            this._systemPopup = new SubMenu(loader, systemRoot, this._btSystem, [
                ['BtChannel', () => { this._openPopup = null; this.onChannel?.(); }],
                ['BtKeySetting', () => { this._openPopup = null; this.onKeys?.(); }],
                ['BtGameOption', () => { this._openPopup = null; this.onGameOption?.(); }],
                ['BtSystemOption', () => { this._openPopup = null; this.onSystemOption?.(); }],
                ['BtGameQuit', () => { this._openPopup = null; this.onQuit?.(); }],
                ['BtJoyPad', () => { this._openPopup = null; this.onJoyPad?.(); }],
            ]);
        }
    }
    get chatAnchor() {
        return { x: this._barCenterX, y: this._viewH - 1 };
    }
    relayout(viewW, viewH) {
        this._viewW = viewW;
        this._viewH = viewH;
    }
    update(dt) {
        // OG CGauge::SetVal (0x86DEA0): CUIStatusBar::Draw re-targets every gauge
        // to its live value each frame (SetNumberValue -> SetVal), so the fill
        // approaches its target exponentially with tau = 700ms — never a one-shot
        // cubic tween, never overshooting.
        const hpTarget = this.maxHp > 0 ? Math.min(1, Math.max(0, this.hp / this.maxHp)) : 0;
        this._hpPct += (hpTarget - this._hpPct) * Math.min(1, dt / 0.7);
        const mpTarget = this.maxMp > 0 ? Math.min(1, Math.max(0, this.mp / this.maxMp)) : 0;
        this._mpPct += (mpTarget - this._mpPct) * Math.min(1, dt / 0.7);
        // OG SetNumberValue (0x873D50): EXP percent is clamped to 99.98 so the
        // bar never renders fully full.
        const expTarget = this.nextExp > 0 ? Math.min(0.9998, Math.max(0, this.exp / this.nextExp)) : 0;
        this._expPct += (expTarget - this._expPct) * Math.min(1, dt / 0.7);
        this._updateWarningFlash();
        this._hpFlashTime = Math.max(0, this._hpFlashTime - dt);
        this._mpFlashTime = Math.max(0, this._mpFlashTime - dt);
        // OG FlashHPBar (0x86D760) / FlashMPBar (0x86D8E0): the 2-frame
        // aniHPGauge/aniMPGauge overlay flashes while the warning timer is active
        // (RegisterRepeatAnimation 500ms). EXP never flashes.
        const tl = this._barTopLeft;
        this._tickFlashOverlay(this._hpFlashTime > 0, this._hpOverlay, HP_GAUGE, tl, dt, this._flashHp);
        this._tickFlashOverlay(this._mpFlashTime > 0, this._mpOverlay, MP_GAUGE, tl, dt, this._flashMp);
        // Detect text value changes
        const hpText = `[${this.hp}\\${this.maxHp}]`;
        const mpText = `[${this.mp}\\${this.maxMp}]`;
        const expText = this._expText();
        if (hpText !== this._lastHpText || mpText !== this._lastMpText || expText !== this._lastExpText) {
            this._lastHpText = hpText;
            this._lastMpText = mpText;
            this._lastExpText = expText;
            this._textDirty = true;
        }
        if (this._openPopup) {
            this._openPopup.updateHover(this._mouseX, this._mouseY);
            if (!this._openPopup.container.parent)
                this._root.addChild(this._openPopup.container);
        }
        else {
            for (const p of [this._menuPopup, this._systemPopup]) {
                if (p && p.container.parent)
                    p.container.removeFromParent();
            }
        }
        this._rebuildGfx();
    }
    handleMouseButton(x, y, down) {
        if (!this.isVisible)
            return false;
        this._mouseX = x;
        this._mouseY = y;
        if (this._openPopup?.handleMouseButton(x, y, down))
            return true;
        for (const b of this._buttons) {
            if (b.handleMouseButton(x, y, down))
                return true;
        }
        if (this._openPopup && down) {
            const b = this._openPopup.bounds;
            if (x < b.x || x > b.x + b.width || y < b.y || y > b.y + b.height) {
                this._openPopup = null;
            }
        }
        const tl = this._barTopLeft;
        return this._openPopup !== null ||
            (x >= tl.x && x < tl.x + BAR_W && y >= tl.y && y < tl.y + BAR_H);
    }
    get _barCenterX() {
        return Math.max(512, Math.floor(this._viewW / 2));
    }
    get _barRef() {
        return { x: this._barCenterX, y: this._viewH - 1 };
    }
    get _barTopLeft() {
        return { x: this._barCenterX - 512, y: this._viewH - BAR_H };
    }
    // OG: CUIStatusBar::ProcessToolTip (0x873140) — EXP gauge tooltip on hover
    onMouseMove(x, y) {
        if (!this.isVisible)
            return;
        this._mouseX = x;
        this._mouseY = y;
        const tl = this._barTopLeft;
        const lx = x - tl.x;
        const ly = y - tl.y;
        // OG: hit-test EXP bar area (rx=76-162, ry=560-574 in 800x600 frame)
        // In local coords: lx=76, ly=BAR_H-40 to BAR_H-26
        const inExpArea = lx >= 76 && lx <= 162 && ly >= BAR_H - 40 && ly <= BAR_H - 26;
        // OG: hit-test gauge text rect (28,18)-(336,31) relative to gauge text layer
        // Gauge text is at EXP_NUM (x=558, y=71) in bar-local coords
        const inExpText = lx >= EXP_NUM.x + 28 && lx <= EXP_NUM.x + 336
            && ly >= EXP_NUM.y + 18 && ly <= EXP_NUM.y + 31;
        if (inExpArea || inExpText) {
            const pct = this.nextExp > 0 ? Math.floor(this.exp / this.nextExp * 100) : 0;
            let msg;
            if (inExpText) {
                // OG: StringPool(0x1A37) format — "EXP: %d/%d"
                msg = `EXP: ${this.exp}/${this.nextExp} (${pct}%)`;
            }
            else {
                // OG: StringPool(0x2B9/0x7FD) format — character info with guild
                msg = `Lv.${this.level} ${this.charName} — ${this.jobName}\nEXP: ${this.exp}/${this.nextExp} (${pct}%)`;
            }
            this._showTooltip(x + 20, y + 20, msg);
        }
        else {
            this._hideTooltip();
        }
    }
    _showTooltip(x, y, text) {
        if (!this._tooltipBg) {
            this._tooltipBg = new Graphics();
            this._root.addChild(this._tooltipBg);
        }
        if (!this._tooltipText) {
            this._tooltipText = new Text({ text: '', style: { fill: '#FFF', fontSize: 11, fontFamily: 'monospace' } });
            this._root.addChild(this._tooltipText);
        }
        this._tooltipText.text = text;
        this._tooltipText.x = x + 4;
        this._tooltipText.y = y + 4;
        const w = this._tooltipText.width + 8;
        const h = this._tooltipText.height + 8;
        this._tooltipBg.clear();
        this._tooltipBg.rect(x, y, w, h).fill({ color: '#000', alpha: 0.85 });
        this._tooltipBg.rect(x, y, w, h).stroke({ color: '#666', width: 1 });
        this._tooltipBg.visible = true;
        this._tooltipText.visible = true;
    }
    _hideTooltip() {
        if (this._tooltipBg)
            this._tooltipBg.visible = false;
        if (this._tooltipText)
            this._tooltipText.visible = false;
    }
    _rebuildGfx() {
        const g = this._gaugeGfx;
        g.clear();
        const r = this._barRef;
        const tl = this._barTopLeft;
        if (this._bgSprite) {
            this._bgSprite.position.set(r.x, r.y);
            if (!this._root.children.includes(this._bgSprite))
                this._root.addChildAt(this._bgSprite, 0);
        }
        if (this._lvBackSprite) {
            this._lvBackSprite.position.set(r.x, r.y);
            if (!this._root.children.includes(this._lvBackSprite))
                this._root.addChildAt(this._lvBackSprite, 1);
        }
        if (this._gaugeBackSprite) {
            this._gaugeBackSprite.position.set(r.x, r.y);
            if (!this._root.children.includes(this._gaugeBackSprite))
                this._root.addChildAt(this._gaugeBackSprite, 2);
        }
        // HP gauge
        this._drawGauge(g, tl, this._hpCap, HP_GAUGE, this._hpPct, 0xff3333);
        // MP gauge
        this._drawGauge(g, tl, this._mpCap, MP_GAUGE, this._mpPct, 0x3c5adc);
        // EXP gauge
        this._drawGauge(g, tl, this._expCap, EXP_GAUGE, this._expPct, 0xdcb428);
        // OG FlashHPBar/FlashMPBar use the ani*gauge sprite overlay (driven in
        // update); fall back to a pulsing rect when the WZ frames are unavailable.
        if (!this._hpOverlay[0])
            this._drawWarningFlash(g, tl, HP_GAUGE, this._hpFlashTime, 0xff6666);
        if (!this._mpOverlay[0])
            this._drawWarningFlash(g, tl, MP_GAUGE, this._mpFlashTime, 0x66a0ff);
        if (this._gaugeCoverSprite) {
            this._gaugeCoverSprite.position.set(r.x, r.y);
            if (!this._root.children.includes(this._gaugeCoverSprite))
                this._root.addChild(this._gaugeCoverSprite);
        }
        if (this._lvCoverSprite) {
            this._lvCoverSprite.position.set(r.x, r.y);
            if (!this._root.children.includes(this._lvCoverSprite))
                this._root.addChild(this._lvCoverSprite);
        }
        if (this._noticeSprite) {
            this._noticeSprite.position.set(r.x, r.y);
            if (!this._root.children.includes(this._noticeSprite))
                this._root.addChild(this._noticeSprite);
        }
        if (!this._textDirty)
            return;
        this._textDirty = false;
        this._textLayer.removeChildren();
        // Gauge numbers via bitmap glyphs or text fallback
        this._drawGaugeText(this._textLayer, `[${this.hp}\\${this.maxHp}]`, tl, HP_NUM);
        this._drawGaugeText(this._textLayer, `[${this.mp}\\${this.maxMp}]`, tl, MP_NUM);
        this._drawGaugeText(this._textLayer, this._expText(), tl, EXP_NUM);
        // Level digits
        this._drawLevelDigits(this._textLayer, tl);
        // Name / job
        this._drawNamePlate(this._textLayer, tl);
    }
    _drawGauge(g, tl, caps, gauge, pct, color) {
        // OG CGauge::SetVal (0x86DEA0):
        //   nLen = max(1, floor(m_nLength * dVal / 100))
        //   center (1px) sprite stretched to nLen - 1, left edge pinned at m_nX
        //   right cap at m_nX + nLen - 1; left cap static at m_nX
        const nLen = StatusBar.gaugeFillLength(gauge.len, pct);
        const sx = tl.x + gauge.x;
        const sy = tl.y + gauge.y;
        // Position WZ cap sprites (left edge, stretch center, right edge) on
        // _gaugeLayer above the Graphics fill for the proper OG visual.
        const lcap = caps[0];
        const mid = caps[1];
        const rcap = caps[2];
        if (!lcap || !mid || !rcap) {
            // The v95 assets always provide all three caps. This path is only for
            // an incomplete local asset set and is intentionally not part of the
            // normal UI rendering path.
            g.rect(sx, sy, nLen, 10).fill({ color });
            return;
        }
        lcap.visible = true;
        lcap.position.set(sx, sy);
        const midW = Math.max(0, nLen - 1);
        if (midW > 0) {
            mid.visible = true;
            mid.position.set(sx, sy);
            mid.scale.x = midW / mid.width;
        }
        else {
            mid.visible = false;
        }
        rcap.visible = true;
        rcap.position.set(sx + nLen - 1, sy);
    }
    // OG CGauge::SetVal fill width: max(1, floor(len * pct)). A full value maps
    // to exactly len pixels — full bar = full gauge, never overshoots.
    static gaugeFillLength(len, pct) {
        return Math.max(1, Math.min(len, Math.floor(len * pct)));
    }
    // OG SetNumberValue (0x873D50): EXP text shows the RAW exp/expMax percent
    // (not the animated fill), clamped to 99.98, formatted "%d[%0.2f%%]".
    _expText() {
        const pct = this.nextExp > 0 ? Math.min(99.98, (this.exp / this.nextExp) * 100) : 0;
        return `${this.exp}[${pct.toFixed(2)}%]`;
    }
    _tickFlashOverlay(active, overlay, gauge, tl, dt, state) {
        if (!active) {
            for (const o of overlay)
                if (o)
                    o.visible = false;
            return;
        }
        state.time += dt;
        if (state.time >= 0.12 && overlay[0] && overlay[1]) {
            state.time -= 0.12;
            state.frame = 1 - state.frame;
        }
        for (let i = 0; i < overlay.length; i++) {
            const o = overlay[i];
            if (!o)
                continue;
            o.visible = state.frame === i;
            o.position.set(tl.x + gauge.x, tl.y + gauge.y);
            o.scale.x = 1;
            o.alpha = 1;
        }
    }
    _updateWarningFlash() {
        // Flash fires once when HP/MP drops below the configured threshold,
        // not on every frame the value is low. `_pastHp`/`_pastMp` track the
        // last-seen value so the flash only triggers on an actual decrease.
        const hpThreshold = 5 * this.hpFlash;
        if (hpThreshold && this.maxHp > 0 && Math.floor(100 * this.hp / this.maxHp) < hpThreshold) {
            if (this._pastHp > this.hp && this._hpFlashTime <= 0)
                this._hpFlashTime = 0.5;
            this._pastHp = this.hp;
        }
        else {
            this._pastHp = this.maxHp * hpThreshold / 100;
        }
        const mpThreshold = 5 * this.mpFlash;
        if (mpThreshold && this.maxMp > 0 && Math.floor(100 * this.mp / this.maxMp) < mpThreshold) {
            if (this._pastMp > this.mp && this._mpFlashTime <= 0)
                this._mpFlashTime = 0.5;
            this._pastMp = this.mp;
        }
        else {
            this._pastMp = this.maxMp * mpThreshold / 100;
        }
    }
    _drawWarningFlash(g, tl, gauge, time, color) {
        if (time <= 0)
            return;
        // OG: flash pulses slowly — 2 cycles per 0.5s (not 4)
        const alpha = 0.2 + 0.35 * Math.abs(Math.sin((0.5 - time) * Math.PI * 4));
        g.rect(tl.x + gauge.x, tl.y + gauge.y - 1, gauge.len, 12).fill({ color, alpha });
    }
    _drawGaugeText(g, text, tl, pos) {
        let sprites = this._gaugeTextCache.get(text);
        let widths = this._gaugeTextWidths.get(text);
        if (!sprites || !widths) {
            sprites = [];
            widths = [];
            for (const ch of text) {
                const glyph = this._gaugeGlyphs.get(ch);
                if (glyph) {
                    widths.push(glyph.Width);
                    sprites.push(glyph.ToPixi());
                }
            }
            this._gaugeTextCache.set(text, sprites);
            this._gaugeTextWidths.set(text, widths);
        }
        if (sprites.length === 0)
            return;
        const totalW = widths.reduce((a, b) => a + b, 0);
        let xPos = tl.x + pos.x - totalW;
        const yPos = tl.y + pos.y;
        for (let i = 0; i < sprites.length; i++) {
            sprites[i].position.set(xPos, yPos);
            g.addChild(sprites[i]);
            xPos += widths[i];
        }
    }
    _drawLevelDigits(g, tl) {
        const s = this.level.toString();
        let w = 0;
        for (const ch of s) {
            const d = this._lvDigits[parseInt(ch)];
            if (d)
                w += d.width;
        }
        let xPos = tl.x + LV_NUM.x - w;
        const yPos = tl.y + LV_NUM.y;
        for (const ch of s) {
            const d = this._lvDigits[parseInt(ch)];
            if (d) {
                d.position.set(xPos, yPos);
                g.addChild(d);
                xPos += d.width;
            }
        }
    }
    _drawNamePlate(g, tl) {
        this._nameText.text = this.charName;
        this._nameText.position.set(tl.x + NAME_POS.x + 1, tl.y + NAME_POS.y + 1);
        this._nameText.style.fill = 0x000000;
        g.addChild(this._nameText);
        this._nameTextWhite.text = this.charName;
        this._nameTextWhite.position.set(tl.x + NAME_POS.x, tl.y + NAME_POS.y);
        g.addChild(this._nameTextWhite);
        this._levelText.text = `Lv.${this.level} ${this.jobName}`;
        this._levelText.position.set(tl.x + JOB_POS.x, tl.y + JOB_POS.y);
        this._levelText.style.fill = 0xffe4b5;
        g.addChild(this._levelText);
    }
    _addButton(loader, bar, name, onClick) {
        const b = Button.fromWz(loader, bar?.Get(name) ?? null);
        if (!b)
            return null;
        b.onClick = onClick;
        b.container.position.set(this._barRef.x, this._barRef.y);
        this._buttons.push(b);
        this._root.addChild(b.container);
        return b;
    }
    _loadOverlayFrames(loader, bar, name, out) {
        const node = bar?.Get(name);
        if (!node)
            return;
        for (let i = 0; i < out.length; i++) {
            const frame = node.Get(String(i));
            if (!frame)
                continue;
            const bmp = frame instanceof WzProperty ? frame.Get('bmp') : frame instanceof WzCanvas ? frame : null;
            if (bmp instanceof WzCanvas) {
                const s = loader.Load(bmp)?.ToPixi();
                if (s) {
                    s.anchor.set(0, 0);
                    s.visible = false;
                    out[i] = s;
                    this._gaugeLayer.addChild(s);
                }
            }
        }
    }
    _canvas(loader, parent, name) {
        const c = parent?.Get(name);
        return c instanceof WzCanvas ? loader.Load(c)?.ToPixi() ?? null : null;
    }
    _toggle(popup) {
        this._openPopup = this._openPopup === popup ? null : popup;
    }
}
class SubMenu {
    _bgTop;
    _bgMid;
    _bgBot;
    _bgW;
    _anchor;
    _buttons = [];
    _container;
    constructor(loader, root, anchor, items) {
        this._anchor = anchor;
        const bg = root.Get('backgrnd');
        this._bgTop = SubMenu._loadCanvas(loader, bg, '0');
        this._bgMid = SubMenu._loadCanvas(loader, bg, '1');
        this._bgBot = SubMenu._loadCanvas(loader, bg, '2');
        this._bgW = this._bgTop?.width ?? 79;
        this._container = new Container();
        for (const [name, onClick] of items) {
            const br = root.Get(name);
            if (!br)
                continue;
            const b = Button.fromWz(loader, br);
            if (!b)
                continue;
            b.onClick = onClick;
            this._buttons.push(b);
            this._container.addChild(b.container);
        }
    }
    get height() {
        return 7 + this._buttons.length * 25 + 7;
    }
    get bounds() {
        const a = this._anchorPos;
        return { x: Math.floor(a.x), y: Math.floor(a.y), width: this._bgW, height: this.height };
    }
    get container() {
        return this._container;
    }
    get _anchorPos() {
        const bb = this._anchor.bounds;
        return { x: bb.x + bb.width / 2 - this._bgW / 2, y: bb.y - this.height };
    }
    updateHover(x, y) {
        this._layout();
        for (const b of this._buttons)
            b.setHover(b.hitTest(x, y));
    }
    handleMouseButton(x, y, down) {
        this._layout();
        for (const b of this._buttons) {
            if (b.handleMouseButton(x, y, down))
                return true;
        }
        return false;
    }
    _layout() {
        const a = this._anchorPos;
        this._container.removeChildren();
        if (this._bgTop) {
            this._bgTop.position.set(a.x, a.y);
            this._container.addChild(this._bgTop);
        }
        const midH = Math.max(0, this.height - (this._bgTop?.height ?? 0) - (this._bgBot?.height ?? 0));
        if (midH > 0 && this._bgMid) {
            this._bgMid.position.set(a.x, a.y + (this._bgTop?.height ?? 0));
            this._bgMid.scale.y = midH / this._bgMid.height;
            this._container.addChild(this._bgMid);
        }
        if (this._bgBot) {
            this._bgBot.position.set(a.x, a.y + this.height - this._bgBot.height);
            this._container.addChild(this._bgBot);
        }
        for (let i = 0; i < this._buttons.length; i++) {
            this._buttons[i].container.position.set(a.x + 8, a.y + 7 + i * 25);
            this._container.addChild(this._buttons[i].container);
        }
    }
    static _loadCanvas(loader, root, name) {
        const c = root?.Get(name);
        return c instanceof WzCanvas ? loader.Load(c)?.ToPixi() ?? null : null;
    }
}
//# sourceMappingURL=StatusBar.js.map