import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { Button } from '../Button.js';
import { BuiltInFont } from '../BuiltInFont.js';
import type { WzTextureLoader } from '../../render/WzTextureLoader.js';
import type { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { WzSprite } from '../../render/WzSprite.js';

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
  hp = 50; maxHp = 50;
  mp = 30; maxMp = 30;
  exp = 0; nextExp = 100;
  hpFlash = 10;
  mpFlash = 10;

  onCharacter: (() => void) | null = null;
  onStats: (() => void) | null = null;
  onQuest: (() => void) | null = null;
  onItems: (() => void) | null = null;
  onEquip: (() => void) | null = null;
  onSkills: (() => void) | null = null;
  onKeys: (() => void) | null = null;
  onChannel: (() => void) | null = null;
  onCashShop: (() => void) | null = null;
  onMenu: (() => void) | null = null;
  onSystem: (() => void) | null = null;
  onMTS: (() => void) | null = null;
  onChat: (() => void) | null = null;
  onClaim: (() => void) | null = null;
  onCommunity: (() => void) | null = null;
  onRanking: (() => void) | null = null;
  onGameOption: (() => void) | null = null;
  onSystemOption: (() => void) | null = null;
  onJoyPad: (() => void) | null = null;
  onInfo: (() => void) | null = null;
  onOptions: (() => void) | null = null;
  onQuit: (() => void) | null = null;

  private _viewW = 800;
  private _viewH = 600;
  private _hpPct = 0;
  private _mpPct = 0;
  private _expPct = 0;
  private _hpTarget = -1;
  private _mpTarget = -1;
  private _expTarget = -1;
  private _hpAnimFrom = 0;
  private _mpAnimFrom = 0;
  private _expAnimFrom = 0;
  private _hpAnimT = 1;
  private _mpAnimT = 1;
  private _expAnimT = 1;
  private _pastHp = 25;
  private _pastMp = 15;
  private _hpFlashTime = 0;
  private _mpFlashTime = 0;
  private _mouseX = 0;
  private _mouseY = 0;

  private readonly _bgSprite: Sprite | null;
  private readonly _lvBackSprite: Sprite | null;
  private readonly _lvCoverSprite: Sprite | null;
  private readonly _gaugeBackSprite: Sprite | null;
  private readonly _gaugeCoverSprite: Sprite | null;
  private readonly _noticeSprite: Sprite | null;
  private readonly _quickSlotSprite: Sprite | null;

  private readonly _hpCap: (Sprite | null)[] = [null, null, null];
  private readonly _mpCap: (Sprite | null)[] = [null, null, null];
  private readonly _expCap: (Sprite | null)[] = [null, null, null];

  private readonly _gaugeGlyphs = new Map<string, WzSprite>();
  private readonly _lvDigits: (Sprite | null)[] = Array(10).fill(null);

  // Cached gauge text sprites — keyed by text string, reused when unchanged
  private _gaugeTextCache = new Map<string, Sprite[]>();
  private _gaugeTextWidths = new Map<string, number[]>();
  private _lastHpText = '';
  private _lastMpText = '';
  private _lastExpText = '';
  private _textDirty = true;

  private readonly _hpOverlay: (Sprite | null)[] = [null, null];
  private readonly _mpOverlay: (Sprite | null)[] = [null, null];
  private _aniHPTime = 0;
  private _aniMPTime = 0;

  // OG: CUIToolTip — tooltip overlay for EXP gauge hover
  private _tooltipText: Text | null = null;
  private _tooltipBg: Graphics | null = null;
  private _aniHPFrame = 0;
  private _aniMPFrame = 0;

  private readonly _buttons: Button[] = [];
  private readonly _font: BuiltInFont;
  private readonly _smallFont: BuiltInFont;

  private readonly _gaugeGfx: Graphics;
  private readonly _gaugeLayer = new Container();
  private readonly _textLayer = new Container();
  private readonly _levelText: Text;
  private readonly _nameText: Text;
  private readonly _nameTextWhite: Text;

  private _openPopup: SubMenu | null = null;
  private _menuPopup: SubMenu | null = null;
  private _systemPopup: SubMenu | null = null;
  private readonly _btMenu: Button | null;
  private readonly _btSystem: Button | null;

  constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont, smallFont?: BuiltInFont) {
    super();
    this._font = font;
    this._smallFont = smallFont ?? font;
    this.isVisible = true;

    const bar = (ui?.GetItem('StatusBar2.img/mainBar') as WzProperty) ?? null;

    this._bgSprite = this._canvas(loader, bar, 'backgrnd');
    this._lvBackSprite = this._canvas(loader, bar, 'lvBacktrnd');
    this._lvCoverSprite = this._canvas(loader, bar, 'lvCover');
    this._gaugeBackSprite = this._canvas(loader, bar, 'gaugeBackgrd');
    this._gaugeCoverSprite = this._canvas(loader, bar, 'gaugeCover');
    this._noticeSprite = this._canvas(loader, bar, 'notice');

    const gauge = (bar?.Get('gauge') as WzProperty) ?? null;
    for (let i = 0; i < 3; i++) {
      this._hpCap[i] = this._canvas(loader, (gauge?.Get('hp') as WzProperty) ?? null, String(i));
      this._mpCap[i] = this._canvas(loader, (gauge?.Get('mp') as WzProperty) ?? null, String(i));
      this._expCap[i] = this._canvas(loader, (gauge?.Get('exp') as WzProperty) ?? null, String(i));
    }

    const numNode = gauge?.Get('number') as WzProperty;
    if (numNode) {
      for (const [k, v] of Object.entries(numNode.Items)) {
        if (k.length === 1 && v instanceof WzCanvas) {
          const g = loader.Load(v);
          if (g) this._gaugeGlyphs.set(k[0], g);
        }
      }
    }

    const lvNode = bar?.Get('lvNumber') as WzProperty;
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
      if (cap) { cap.visible = false; this._gaugeLayer.addChild(cap); }
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

    const menuRoot = (bar?.Get('Menu') as WzProperty) ?? null;
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

    const systemRoot = (bar?.Get('System') as WzProperty) ?? null;
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

  get chatAnchor(): { x: number; y: number } {
    return { x: this._barCenterX, y: this._viewH - 1 };
  }

  relayout(viewW: number, viewH: number): void {
    this._viewW = viewW;
    this._viewH = viewH;
  }

  update(dt: number): void {
    // --- HP gauge animation (OG: smooth interpolation) ---
    const hpTarget = this.maxHp > 0 ? Math.min(1, Math.max(0, this.hp / this.maxHp)) : 0;
    if (this._hpTarget < 0) {
      // First frame: start animation from current value
      this._hpAnimFrom = hpTarget;
      this._hpTarget = hpTarget;
      this._hpAnimT = 1;
    } else if (Math.abs(hpTarget - this._hpTarget) > 1e-10) {
      this._hpAnimFrom = this._hpPct;
      this._hpTarget = hpTarget;
      this._hpAnimT = 0;
    }
    if (this._hpAnimT < 1) {
      this._hpAnimT = Math.min(1, this._hpAnimT + dt / 0.7);
      // OG: smooth ease-out interpolation
      const t = 1 - Math.pow(1 - this._hpAnimT, 3);
      this._hpPct = this._hpAnimFrom + (this._hpTarget - this._hpAnimFrom) * t;
    } else {
      this._hpPct = this._hpTarget;
    }

    // --- MP gauge animation ---
    const mpTarget = this.maxMp > 0 ? Math.min(1, Math.max(0, this.mp / this.maxMp)) : 0;
    if (this._mpTarget < 0) {
      this._mpAnimFrom = mpTarget;
      this._mpTarget = mpTarget;
      this._mpAnimT = 1;
    } else if (Math.abs(mpTarget - this._mpTarget) > 1e-10) {
      this._mpAnimFrom = this._mpPct;
      this._mpTarget = mpTarget;
      this._mpAnimT = 0;
    }
    if (this._mpAnimT < 1) {
      this._mpAnimT = Math.min(1, this._mpAnimT + dt / 0.7);
      const t = 1 - Math.pow(1 - this._mpAnimT, 3);
      this._mpPct = this._mpAnimFrom + (this._mpTarget - this._mpAnimFrom) * t;
    } else {
      this._mpPct = this._mpTarget;
    }

    // --- EXP gauge animation ---
    const expTarget = this.nextExp > 0 ? Math.min(1, Math.max(0, this.exp / this.nextExp)) : 0;
    if (this._expTarget < 0) {
      this._expAnimFrom = expTarget;
      this._expTarget = expTarget;
      this._expAnimT = 1;
    } else if (Math.abs(expTarget - this._expTarget) > 1e-10) {
      this._expAnimFrom = this._expPct;
      this._expTarget = expTarget;
      this._expAnimT = 0;
    }
    if (this._expAnimT < 1) {
      this._expAnimT = Math.min(1, this._expAnimT + dt / 0.7);
      const t = 1 - Math.pow(1 - this._expAnimT, 3);
      this._expPct = this._expAnimFrom + (this._expTarget - this._expAnimFrom) * t;
    } else {
      this._expPct = this._expTarget;
    }

    this._updateWarningFlash();
    this._hpFlashTime = Math.max(0, this._hpFlashTime - dt);
    this._mpFlashTime = Math.max(0, this._mpFlashTime - dt);

    // Overlay frame animation (delay=120ms per frame)
    // OG: overlay only animates when gauge value actually changes, not constantly
    if (Math.abs(this._hpPct - this._hpTarget) > 1e-10) {
      this._aniHPTime += dt;
      if (this._aniHPTime >= 0.12 && this._hpOverlay[0] && this._hpOverlay[1]) {
        this._aniHPFrame = 1 - this._aniHPFrame;
        this._hpOverlay[0].visible = this._aniHPFrame === 0;
        this._hpOverlay[1].visible = this._aniHPFrame === 1;
        this._aniHPTime -= 0.12;
      }
    } else {
      // Stop overlay when gauge reaches target
      if (this._hpOverlay[0]) this._hpOverlay[0].visible = false;
      if (this._hpOverlay[1]) this._hpOverlay[1].visible = false;
    }
    if (Math.abs(this._mpPct - this._mpTarget) > 1e-10) {
      this._aniMPTime += dt;
      if (this._aniMPTime >= 0.12 && this._mpOverlay[0] && this._mpOverlay[1]) {
        this._aniMPFrame = 1 - this._aniMPFrame;
        this._mpOverlay[0].visible = this._aniMPFrame === 0;
        this._mpOverlay[1].visible = this._aniMPFrame === 1;
        this._aniMPTime -= 0.12;
      }
    } else {
      if (this._mpOverlay[0]) this._mpOverlay[0].visible = false;
      if (this._mpOverlay[1]) this._mpOverlay[1].visible = false;
    }

    // Detect text value changes
    const hpText = `[${this.hp}\\${this.maxHp}]`;
    const mpText = `[${this.mp}\\${this.maxMp}]`;
    const pct = this.nextExp > 0 ? (this._expPct * 100).toFixed(0) : '0';
    const expText = `${this.exp}[${pct}%]`;
    if (hpText !== this._lastHpText || mpText !== this._lastMpText || expText !== this._lastExpText) {
      this._lastHpText = hpText;
      this._lastMpText = mpText;
      this._lastExpText = expText;
      this._textDirty = true;
    }

    if (this._openPopup) {
      this._openPopup.updateHover(this._mouseX, this._mouseY);
      if (!this._openPopup.container.parent) this._root.addChild(this._openPopup.container);
    } else {
      for (const p of [this._menuPopup, this._systemPopup]) {
        if (p && p.container.parent) p.container.removeFromParent();
      }
    }

    this._rebuildGfx();
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    this._mouseX = x;
    this._mouseY = y;

    if (this._openPopup?.handleMouseButton(x, y, down)) return true;

    for (const b of this._buttons) {
      if (b.handleMouseButton(x, y, down)) return true;
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

  private get _barCenterX(): number {
    return Math.max(512, Math.floor(this._viewW / 2));
  }

  private get _barRef(): { x: number; y: number } {
    return { x: this._barCenterX, y: this._viewH - 1 };
  }

  private get _barTopLeft(): { x: number; y: number } {
    return { x: this._barCenterX - 512, y: this._viewH - BAR_H };
  }

  // OG: CUIStatusBar::ProcessToolTip (0x873140) — EXP gauge tooltip on hover
  onMouseMove(x: number, y: number): void {
    if (!this.isVisible) return;
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
      let msg: string;
      if (inExpText) {
        // OG: StringPool(0x1A37) format — "EXP: %d/%d"
        msg = `EXP: ${this.exp}/${this.nextExp} (${pct}%)`;
      } else {
        // OG: StringPool(0x2B9/0x7FD) format — character info with guild
        msg = `Lv.${this.level} ${this.charName} — ${this.jobName}\nEXP: ${this.exp}/${this.nextExp} (${pct}%)`;
      }
      this._showTooltip(x + 20, y + 20, msg);
    } else {
      this._hideTooltip();
    }
  }

  private _showTooltip(x: number, y: number, text: string): void {
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

  private _hideTooltip(): void {
    if (this._tooltipBg) this._tooltipBg.visible = false;
    if (this._tooltipText) this._tooltipText.visible = false;
  }

  private _rebuildGfx(): void {
    const g = this._gaugeGfx;
    g.clear();

    const r = this._barRef;
    const tl = this._barTopLeft;

    if (this._bgSprite) {
      this._bgSprite.position.set(r.x, r.y);
      if (!this._root.children.includes(this._bgSprite)) this._root.addChildAt(this._bgSprite, 0);
    }
    if (this._lvBackSprite) {
      this._lvBackSprite.position.set(r.x, r.y);
      if (!this._root.children.includes(this._lvBackSprite)) this._root.addChildAt(this._lvBackSprite, 1);
    }
    if (this._gaugeBackSprite) {
      this._gaugeBackSprite.position.set(r.x, r.y);
      if (!this._root.children.includes(this._gaugeBackSprite)) this._root.addChildAt(this._gaugeBackSprite, 2);
    }

    // HP gauge
    this._drawGauge(g, tl, this._hpCap, HP_GAUGE, this._hpPct, 0xff3333, this._hpOverlay);
    // MP gauge
    this._drawGauge(g, tl, this._mpCap, MP_GAUGE, this._mpPct, 0x3c5adc, this._mpOverlay);
    this._drawWarningFlash(g, tl, HP_GAUGE, this._hpFlashTime, 0xff6666);
    this._drawWarningFlash(g, tl, MP_GAUGE, this._mpFlashTime, 0x66a0ff);
    // EXP gauge
    this._drawGauge(g, tl, this._expCap, EXP_GAUGE, this._expPct, 0xdcb428, []);

    if (this._gaugeCoverSprite) {
      this._gaugeCoverSprite.position.set(r.x, r.y);
      if (!this._root.children.includes(this._gaugeCoverSprite)) this._root.addChild(this._gaugeCoverSprite);
    }
    if (this._lvCoverSprite) {
      this._lvCoverSprite.position.set(r.x, r.y);
      if (!this._root.children.includes(this._lvCoverSprite)) this._root.addChild(this._lvCoverSprite);
    }
    if (this._noticeSprite) {
      this._noticeSprite.position.set(r.x, r.y);
      if (!this._root.children.includes(this._noticeSprite)) this._root.addChild(this._noticeSprite);
    }

    if (!this._textDirty) return;
    this._textDirty = false;

    this._textLayer.removeChildren();

    // Gauge numbers via bitmap glyphs or text fallback
    this._drawGaugeText(this._textLayer, `[${this.hp}\\${this.maxHp}]`, tl, HP_NUM);
    this._drawGaugeText(this._textLayer, `[${this.mp}\\${this.maxMp}]`, tl, MP_NUM);
    const pct = this.nextExp > 0 ? (this._expPct * 100).toFixed(0) : '0';
    this._drawGaugeText(this._textLayer, `${this.exp}[${pct}%]`, tl, EXP_NUM);

    // Level digits
    this._drawLevelDigits(this._textLayer, tl);
    // Name / job
    this._drawNamePlate(this._textLayer, tl);
  }

  private _drawGauge(
    g: Graphics,
    tl: { x: number; y: number },
    caps: (Sprite | null)[],
    gauge: { x: number; y: number; len: number },
    pct: number,
    color: number,
    overlay: (Sprite | null)[] | null = null,
  ): void {
    const fill = Math.max(0, Math.min(gauge.len, Math.floor(gauge.len * pct)));
    const sx = tl.x + gauge.x;
    const sy = tl.y + gauge.y;

    const lcap = caps[0];
    const mid = caps[1];
    const rcap = caps[2];
    if (!lcap || !mid || !rcap) {
      if (fill > 0) g.rect(sx, sy, fill, 10).fill({ color });
      return;
    }

    if (fill <= 0) {
      lcap.visible = false;
      mid.visible = false;
      rcap.visible = false;
      if (overlay) { for (const o of overlay) if (o) o.visible = false; }
      return;
    }

    lcap.visible = true;
    lcap.position.set(sx, sy);

    const midW = Math.max(0, fill - lcap.width - rcap.width);
    if (midW > 0) {
      mid.visible = true;
      mid.position.set(sx + lcap.width, sy);
      mid.scale.x = midW / mid.width;
    } else {
      mid.visible = false;
    }

    rcap.visible = true;
    rcap.position.set(sx + fill - rcap.width, sy);

    // Animated overlay (aniHPGauge/aniMPGauge) clipped to fill width
    if (overlay) {
      const scale = fill / gauge.len;
      for (const o of overlay) {
        if (!o) continue;
        o.visible = true;
        o.position.set(sx, sy);
        o.scale.x = scale;
        o.alpha = 1;
      }
    }
  }

  private _updateWarningFlash(): void {
    // Flash fires once when HP/MP drops below the configured threshold,
    // not on every frame the value is low. `_pastHp`/`_pastMp` track the
    // last-seen value so the flash only triggers on an actual decrease.
    const hpThreshold = 5 * this.hpFlash;
    if (hpThreshold && this.maxHp > 0 && Math.floor(100 * this.hp / this.maxHp) < hpThreshold) {
      if (this._pastHp > this.hp && this._hpFlashTime <= 0) this._hpFlashTime = 0.5;
      this._pastHp = this.hp;
    } else {
      this._pastHp = this.maxHp * hpThreshold / 100;
    }

    const mpThreshold = 5 * this.mpFlash;
    if (mpThreshold && this.maxMp > 0 && Math.floor(100 * this.mp / this.maxMp) < mpThreshold) {
      if (this._pastMp > this.mp && this._mpFlashTime <= 0) this._mpFlashTime = 0.5;
      this._pastMp = this.mp;
    } else {
      this._pastMp = this.maxMp * mpThreshold / 100;
    }
  }

  private _drawWarningFlash(
    g: Graphics,
    tl: { x: number; y: number },
    gauge: { x: number; y: number; len: number },
    time: number,
    color: number
  ): void {
    if (time <= 0) return;
    // OG: flash pulses slowly — 2 cycles per 0.5s (not 4)
    const alpha = 0.2 + 0.35 * Math.abs(Math.sin((0.5 - time) * Math.PI * 4));
    g.rect(tl.x + gauge.x, tl.y + gauge.y - 1, gauge.len, 12).fill({ color, alpha });
  }

  private _drawGaugeText(
    g: Container,
    text: string,
    tl: { x: number; y: number },
    pos: { x: number; y: number },
  ): void {
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
    if (sprites.length === 0) return;
    const totalW = widths.reduce((a, b) => a + b, 0);
    let xPos = tl.x + pos.x - totalW;
    const yPos = tl.y + pos.y;
    for (let i = 0; i < sprites.length; i++) {
      sprites[i].position.set(xPos, yPos);
      g.addChild(sprites[i]);
      xPos += widths[i];
    }
  }

  private _drawLevelDigits(g: Container, tl: { x: number; y: number }): void {
    const s = this.level.toString();
    let w = 0;
    for (const ch of s) {
      const d = this._lvDigits[parseInt(ch)];
      if (d) w += d.width;
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

  private _drawNamePlate(g: Container, tl: { x: number; y: number }): void {
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

  private _addButton(loader: WzTextureLoader, bar: WzProperty | null, name: string, onClick: () => void): Button | null {
    const b = Button.fromWz(loader, (bar?.Get(name) as WzProperty) ?? null);
    if (!b) return null;
    b.onClick = onClick;
    b.container.position.set(this._barRef.x, this._barRef.y);
    this._buttons.push(b);
    this._root.addChild(b.container);
    return b;
  }

  private _loadOverlayFrames(loader: WzTextureLoader, bar: WzProperty | null, name: string, out: (Sprite | null)[]): void {
    const node = bar?.Get(name) as WzProperty;
    if (!node) return;
    for (let i = 0; i < out.length; i++) {
      const frame = node.Get(String(i));
      if (!frame) continue;
      const bmp = frame instanceof WzProperty ? frame.Get('bmp') : frame instanceof WzCanvas ? frame : null;
      if (bmp instanceof WzCanvas) {
        const s = loader.Load(bmp)?.ToPixi();
        if (s) { s.anchor.set(0, 0); s.visible = false; out[i] = s; this._gaugeLayer.addChild(s); }
      }
    }
  }

  private _canvas(loader: WzTextureLoader, parent: WzProperty | null, name: string): Sprite | null {
    const c = parent?.Get(name);
    return c instanceof WzCanvas ? loader.Load(c)?.ToPixi() ?? null : null;
  }

  private _toggle(popup: SubMenu | null): void {
    this._openPopup = this._openPopup === popup ? null : popup;
  }
}

class SubMenu {
  private readonly _bgTop: Sprite | null;
  private readonly _bgMid: Sprite | null;
  private readonly _bgBot: Sprite | null;
  private readonly _bgW: number;
  private readonly _anchor: Button;
  private readonly _buttons: Button[] = [];
  private readonly _container: Container;

  constructor(
    loader: WzTextureLoader,
    root: WzProperty,
    anchor: Button,
    items: [string, () => void][]
  ) {
    this._anchor = anchor;
    const bg = root.Get('backgrnd') as WzProperty;
    this._bgTop = SubMenu._loadCanvas(loader, bg, '0');
    this._bgMid = SubMenu._loadCanvas(loader, bg, '1');
    this._bgBot = SubMenu._loadCanvas(loader, bg, '2');
    this._bgW = this._bgTop?.width ?? 79;

    this._container = new Container();

    for (const [name, onClick] of items) {
      const br = root.Get(name) as WzProperty;
      if (!br) continue;
      const b = Button.fromWz(loader, br);
      if (!b) continue;
      b.onClick = onClick;
      this._buttons.push(b);
      this._container.addChild(b.container);
    }
  }

  get height(): number {
    return 7 + this._buttons.length * 25 + 7;
  }

  get bounds(): { x: number; y: number; width: number; height: number } {
    const a = this._anchorPos;
    return { x: Math.floor(a.x), y: Math.floor(a.y), width: this._bgW, height: this.height };
  }

  get container(): Container {
    return this._container;
  }

  private get _anchorPos(): { x: number; y: number } {
    const bb = this._anchor.bounds;
    return { x: bb.x + bb.width / 2 - this._bgW / 2, y: bb.y - this.height };
  }

  updateHover(x: number, y: number): void {
    this._layout();
    for (const b of this._buttons) b.setHover(b.hitTest(x, y));
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    this._layout();
    for (const b of this._buttons) {
      if (b.handleMouseButton(x, y, down)) return true;
    }
    return false;
  }

  private _layout(): void {
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

  private static _loadCanvas(loader: WzTextureLoader, root: WzProperty | null, name: string): Sprite | null {
    const c = root?.Get(name);
    return c instanceof WzCanvas ? loader.Load(c)?.ToPixi() ?? null : null;
  }
}
