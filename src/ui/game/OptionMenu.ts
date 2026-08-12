import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { WzSprite } from '../../render/WzSprite.js';
import { Button } from '../Button.js';

// OG: CUISysOpt (v95). Window 283x419 (UIWindow2.img/SysOpt/backgrnd), centered on
// screen (ctor 0x7A7ED0 → CDialog::CreateDlg @0x4FEC40: pos = -w/2, -h/2, z=10,
// bScreenCoord=1, Origin_CC). All controls created in OnCreate @0x978010 at
// window-relative coords below; every label is baked into backgrnd2 (271x365,
// origin -6,-18 → at 6,18), so controls draw no text.
// Sliders are CCtrlSlider (CreateCtrl @0x4ED5E0) with the SysOpt/scroll/0..3
// (28x11) thumb; the track is baked into backgrnd2. Ranges: video=4, others=20
// (SetSliderRange @0x4ECC70 → valid positions 0..range-1).
// Checkboxes are CCtrlCheckBox (Draw @0x4D6360) using Basic.img/CheckBox/0..3
// (11x11) glyph at (x+2, y+1); state = checked ? 1 : 0 (ChangeCheckBoxState
// @0x4D4510). Mutual-exclusive pairs per OnChildNotify @0x969820 (param1=200).
// Buttons BtOK (id 1) at (99,392), BtCancle (id 2) at (144,392) — 40x16, canvas
// origin (-99,-392)/(-144,-392), CLayoutMan::AddButton offset (0,0).
// Behavior (SetRet @0x969980): OK(1)=ApplySysOpt(cur,1)+SaveGlobal+close;
// Cancel(2)=ApplySysOpt(old,0) revert + close. Every live change fires
// OnChildNotify(700) → GetSysOptFromCtrl + ApplySysOpt(cur,0).
export interface SysOptConfig {
  video: number;
  bgmVol: number;
  bgmMute: boolean;
  seVol: number;
  seMute: boolean;
  mouseSpeed: number;
  hpFlash: number;
  mpFlash: number;
  tremble: boolean;
  mobInfo: number;
  largeScreen: boolean;
  windowed: boolean;
  minimapNormal: boolean;
}

// --- CUISysOpt::OnCreate control table (window-relative) ---
const SliderX = 95;
const VideoY = 32;            // m_pSliderVideo id 1000, len 140, range 4
const BgmSliderY = 91;        // m_pSliderBGMVol id 1001, len 96, range 20
const SfxSliderY = 121;       // m_pSliderSEVol id 1003, len 96, range 20
const MouseSpeedY = 181;      // m_pSliderMouseSpeed id 1006, len 140
const HpFlashY = 211;         // m_pSliderHPFlash id 1007, len 140
const MpFlashY = 241;         // m_pSliderMPFlash id 1008, len 140
const Screen800X = 65, Screen800Y = 60;   // m_pCBScreen800 id 1010
const Screen1024X = 165, Screen1024Y = 60; // m_pCBScreen1024 id 1011
const BgmMuteX = 223, BgmMuteY = 90;      // m_pCBBGMMute id 1002
const SfxMuteX = 223, SfxMuteY = 120;     // m_pCBSEMute id 1004
const TrembleX = 65, TrembleY = 271;      // m_pCBTremble id 1009
const MobInfoX = 66, MobInfoY = 298, MobInfoW = 174; // m_pCBMobInfo id 1012, h 18
const WindowedX = 65, WindowedY = 324;    // m_pCBWindowed id 1014
const FullscreenX = 65, FullscreenY = 336; // m_pCBFullScreen id 1013
const MinimapNormalX = 65, MinimapNormalY = 361; // m_pCBMinimapNormalMode id 1015
const MinimapSimpleX = 147, MinimapSimpleY = 361; // m_pCBMinimapSimpleMode id 1016

const BtOkX = 99, BtOkY = 392;
const BtCancelX = 144, BtCancelY = 392;

const PanelW = 283, PanelH = 419;
const SliderLen = 96, SliderLenLong = 140;
const VideoRange = 4, Range = 20;

const MI_LABELS = ['Show All', 'Hide All', 'Show Boss', 'Show NPC'];

// OG combo colors (CCtrlComboBox::CREATEPARAM @0x4894F0): back #EEEEEE,
// focused #A5A198, border #999999, text offset x=7, fonts BASIC_BLACK/WHITE.
const ComboBack = 0xEEEEEE;
const ComboFocused = 0xA5A198;
const ComboBorder = 0x999999;

const _comboText = new TextStyle({ fill: 0x000000, fontSize: 10, fontFamily: 'monospace' });
const _fallbackStyle = new TextStyle({ fill: '#DCC896', fontSize: 11, fontFamily: 'monospace' });

interface SliderDef {
  key: string;
  x: number;
  y: number;
  len: number;
  range: number;
  max: number;
  muted: () => boolean;
}

export class OptionMenu extends GamePanel {
  onSettingsChanged: (() => void) | null = null;

  config: SysOptConfig = {
    video: 0, bgmVol: 16, bgmMute: false, seVol: 19, seMute: false,
    mouseSpeed: 10, hpFlash: 10, mpFlash: 10, tremble: true,
    mobInfo: 0, largeScreen: false, windowed: true, minimapNormal: true,
  };

  private _snapshot: SysOptConfig | null = null;

  // WZ assets
  private _bg: Sprite | null = null;
  private _bg2: Sprite | null = null;
  private _knob: WzSprite[] = [];       // SysOpt/scroll/0..3 (28x11)
  private _checkGlyphs: WzSprite[] = []; // Basic.img/CheckBox/0..3 (11x11)
  private _btOk: Button | null = null;
  private _btCancel: Button | null = null;

  private _bgFallback: Graphics | null = null;
  private _dynamicChildren: Container[] = [];
  private _dragTarget: string | null = null;
  private _openCombo: 'mobInfo' | null = null;

  get BgmVolume(): number { return this.config.bgmMute ? 0 : this._ogToPct(this.config.bgmVol); }
  get SfxVolume(): number { return this.config.seMute ? 0 : this._ogToPct(this.config.seVol); }
  get HpFlash(): number { return this.config.hpFlash; }
  get MpFlash(): number { return this.config.mpFlash; }

  constructor() {
    super();
    this._root.visible = false;
    this._wndTitleH = 50; // OG CUISysOpt::HitTest: ry < 50 → region 2 (drag title)
    // OG CreateDlg: centered, Origin_CC.
    const scrW = typeof window !== 'undefined' ? window.innerWidth : 800;
    const scrH = typeof window !== 'undefined' ? window.innerHeight : 600;
    this._root.x = Math.max(0, (scrW - PanelW) >> 1);
    this._root.y = Math.max(0, (scrH - PanelH) >> 1);
    this._bgFallback = new Graphics();
    this._root.addChild(this._bgFallback);
  }

  override get isVisible(): boolean { return super.isVisible; }
  override set isVisible(v: boolean) {
    const was = super.isVisible;
    super.isVisible = v;
    if (v && !was) {
      // OG ctor copies CConfig::m_sysOpt into m_sysOptOld (OnCreate @0x978c76);
      // Cancel (SetRet 2) reverts to it.
      this._snapshot = { ...this.config };
      this._openCombo = null;
    }
  }

  loadWz(loader: WzTextureLoader, ui: WzPackage | null): void {
    const sysOpt = ui?.GetItem('UIWindow2.img/SysOpt') instanceof WzProperty
      ? ui.GetItem('UIWindow2.img/SysOpt') as WzProperty
      : null;
    if (!sysOpt) return;

    const loadCanvas = (node: unknown): WzSprite | null =>
      node instanceof WzCanvas ? loader.Load(node) : null;

    // backgrnd 283x419 (origin 0,0) + backgrnd2 271x365 (origin -6,-18 → at 6,18)
    const bgSpr = loadCanvas(sysOpt.Get('backgrnd'));
    if (bgSpr) { this._bg = bgSpr.ToPixi(); this._root.addChildAt(this._bg, 0); }
    const bg2Spr = loadCanvas(sysOpt.Get('backgrnd2'));
    if (bg2Spr) { this._bg2 = bg2Spr.ToPixi(); this._root.addChild(this._bg2); }

    // Slider thumbs: SysOpt/scroll/0..3 (28x11)
    const scroll = sysOpt.Get('scroll');
    if (scroll instanceof WzProperty) {
      for (let i = 0; i < 4; i++) {
        const s = loadCanvas(scroll.Get(String(i)));
        if (s) this._knob.push(s);
      }
    }

    // Checkbox glyphs: Basic.img/CheckBox/0..3 (11x11)
    const cb = ui?.GetItem('Basic.img/CheckBox');
    if (cb instanceof WzProperty) {
      for (let i = 0; i < 4; i++) {
        const s = loadCanvas(cb.Get(String(i)));
        if (s) this._checkGlyphs.push(s);
      }
    }

    // BtOK id 1 / BtCancle id 2 — AddButton offset (0,0), origin places them.
    const btOk = sysOpt.Get('BtOK');
    if (btOk instanceof WzProperty) {
      this._btOk = Button.fromWz(loader, btOk, 'OK');
      this._btOk.onClick = () => this._setRet(1);
      this._btOk.container.position.set(0, 0);
      this._root.addChild(this._btOk.container);
    }
    const btCan = sysOpt.Get('BtCancle');
    if (btCan instanceof WzProperty) {
      this._btCancel = Button.fromWz(loader, btCan, 'Cancel');
      this._btCancel.onClick = () => this._setRet(2);
      this._btCancel.container.position.set(0, 0);
      this._root.addChild(this._btCancel.container);
    }

    if (this._bgFallback) this._bgFallback.visible = false;
  }

  /** OG SetRet @0x969980: 1=apply+save+close, 2=revert to old+close. */
  private _setRet(n: number): void {
    if (n === 1) {
      // ApplySysOpt(cur, 1) + SaveGlobal
      this.onSettingsChanged?.();
    } else if (n === 2 && this._snapshot) {
      this.config = { ...this._snapshot };
      this.onSettingsChanged?.();
    }
    this.isVisible = false;
  }

  LoadVolumes(bgm: number, sfx: number): void {
    this.config.bgmVol = this._pctToOg(Math.max(0, Math.min(100, bgm)));
    this.config.seVol = this._pctToOg(Math.max(0, Math.min(100, sfx)));
  }

  LoadWarningFlash(hp: number, mp: number): void {
    this.config.hpFlash = Math.max(0, Math.min(19, Math.round(hp)));
    this.config.mpFlash = Math.max(0, Math.min(19, Math.round(mp)));
  }

  update(_dt: number): void {
    if (!this.isVisible) return;
    this.draw();
  }

  setPosition(x: number, y: number): void {
    this._root.x = x;
    this._root.y = y;
  }

  draw(): void {
    if (!this.isVisible) return;

    for (const c of this._dynamicChildren) c.destroy({ children: true });
    this._dynamicChildren = [];

    if (this._bgFallback?.visible) this._drawFallback();

    const sliders: SliderDef[] = [
      { key: 'video', x: SliderX, y: VideoY, len: SliderLenLong, range: VideoRange, max: VideoRange - 1, muted: () => false },
      { key: 'bgm', x: SliderX, y: BgmSliderY, len: SliderLen, range: Range, max: Range - 1, muted: () => this.config.bgmMute },
      { key: 'sfx', x: SliderX, y: SfxSliderY, len: SliderLen, range: Range, max: Range - 1, muted: () => this.config.seMute },
      { key: 'mouse', x: SliderX, y: MouseSpeedY, len: SliderLenLong, range: Range, max: Range - 1, muted: () => false },
      { key: 'hp', x: SliderX, y: HpFlashY, len: SliderLenLong, range: Range, max: Range - 1, muted: () => false },
      { key: 'mp', x: SliderX, y: MpFlashY, len: SliderLenLong, range: Range, max: Range - 1, muted: () => false },
    ];
    for (const s of sliders) this._drawSlider(s);

    this._drawCheck(Screen800X, Screen800Y, !this.config.largeScreen);
    this._drawCheck(Screen1024X, Screen1024Y, this.config.largeScreen);
    this._drawCheck(BgmMuteX, BgmMuteY, this.config.bgmMute);
    this._drawCheck(SfxMuteX, SfxMuteY, this.config.seMute);
    this._drawCheck(TrembleX, TrembleY, this.config.tremble);
    this._drawCheck(WindowedX, WindowedY, this.config.windowed);
    this._drawCheck(FullscreenX, FullscreenY, !this.config.windowed);
    this._drawCheck(MinimapNormalX, MinimapNormalY, this.config.minimapNormal);
    this._drawCheck(MinimapSimpleX, MinimapSimpleY, !this.config.minimapNormal);

    // MobInfo combo (id 1012) — CCtrlComboBox colors
    this._drawCombo(MobInfoX, MobInfoY, MobInfoW, MI_LABELS[this.config.mobInfo]);

    // Dropdown overlay (rendered last so it appears above everything)
    if (this._openCombo === 'mobInfo') {
      this._drawDropdown(MobInfoX, MobInfoY + 18, MobInfoW, MI_LABELS, this.config.mobInfo, (i: number) => {
        this.config.mobInfo = i;
        this._openCombo = null;
        this.onSettingsChanged?.();
      });
    }
  }

  // --- WZ renderers (OG CCtrlSlider / CCtrlCheckBox / CCtrlComboBox) ---

  private _drawSlider(s: SliderDef): void {
    const val = this._valFor(s);
    if (this._knob.length > 0) {
      // GetCoordByPos @0x4ECC00: nPos*(len-27)/(range-1)+13; knob drawn at
      // rx + coord - thumbWidth/2 (Draw @0x4ECFC0). Thumb state: 0 normal,
      // 1 captured, 2 range<=1, 3 mouseover.
      const coord = s.range > 1
        ? val * (s.len - 27) / (s.range - 1) + 13
        : 0;
      const state = this._dragTarget === s.key ? 1 : 0;
      const spr = (this._knob[state] ?? this._knob[0]).ToPixi();
      spr.x = s.x + coord - this._knob[0].Width / 2;
      spr.y = s.y;
      this._root.addChild(spr);
      this._dynamicChildren.push(spr);
    } else {
      this._drawSliderFallback(s);
    }
  }

  private _drawCheck(x: number, y: number, on: boolean): void {
    if (this._checkGlyphs.length > 0) {
      // Draw @0x4D6360: glyph at (rx+2, ry+1), state = checked ? 1 : 0.
      const spr = this._checkGlyphs[on ? 1 : 0].ToPixi();
      spr.x = x + 2;
      spr.y = y + 1;
      this._root.addChild(spr);
      this._dynamicChildren.push(spr);
    } else {
      this._drawCheckFallback(x, y, on);
    }
  }

  private _drawCombo(x: number, y: number, w: number, label: string): void {
    const g = new Graphics();
    g.rect(x, y, w, 18).fill({ color: ComboBack });
    g.rect(x, y, w, 18).stroke({ color: ComboBorder, width: 1 });
    // right-aligned dropdown button
    g.poly([x + w - 12, y + 7, x + w - 4, y + 7, x + w - 8, y + 13]).fill({ color: 0x666666 });
    this._root.addChild(g);
    this._dynamicChildren.push(g);
    const t = new Text({ text: label, style: _comboText });
    t.x = x + 7; // nBoxTextLeftOffset = 7
    t.y = y + 3;
    this._root.addChild(t);
    this._dynamicChildren.push(t);
  }

  private _drawDropdown(x: number, y: number, w: number, items: string[], sel: number, onSelect: (i: number) => void): void {
    for (let i = 0; i < items.length; i++) {
      const iy = y + i * 18;
      const g = new Graphics();
      g.rect(x, iy, w, 18).fill({ color: i === sel ? ComboFocused : ComboBack });
      g.rect(x, iy, w, 18).stroke({ color: ComboBorder, width: 1 });
      this._root.addChild(g);
      this._dynamicChildren.push(g);
      const t = new Text({ text: items[i], style: _comboText });
      t.x = x + 7;
      t.y = iy + 3;
      this._root.addChild(t);
      this._dynamicChildren.push(t);
      if (i === sel) {
        const check = new Graphics();
        check.rect(x + 2, iy + 5, 7, 7).fill({ color: 0x000000 });
        this._root.addChild(check);
        this._dynamicChildren.push(check);
      }
      void onSelect;
    }
  }

  private _valFor(s: SliderDef): number {
    switch (s.key) {
      case 'video': return Math.min(s.max, this.config.video);
      case 'bgm': return Math.min(s.max, this.config.bgmVol);
      case 'sfx': return Math.min(s.max, this.config.seVol);
      case 'mouse': return Math.min(s.max, this.config.mouseSpeed);
      case 'hp': return Math.min(s.max, this.config.hpFlash);
      case 'mp': return Math.min(s.max, this.config.mpFlash);
      default: return 0;
    }
  }

  private _setVal(s: SliderDef, v: number): void {
    const val = Math.max(0, Math.min(s.max, Math.round(v)));
    switch (s.key) {
      case 'video': this.config.video = val; break;
      case 'bgm': this.config.bgmVol = val; this.config.bgmMute = false; break;
      case 'sfx': this.config.seVol = val; this.config.seMute = false; break;
      case 'mouse': this.config.mouseSpeed = val; break;
      case 'hp': this.config.hpFlash = val; break;
      case 'mp': this.config.mpFlash = val; break;
    }
  }

  private _sliderFromKey(key: string): SliderDef {
    const long = key === 'video' || key === 'mouse' || key === 'hp' || key === 'mp';
    return {
      key,
      x: SliderX,
      y: key === 'video' ? VideoY : key === 'bgm' ? BgmSliderY : key === 'sfx' ? SfxSliderY
        : key === 'mouse' ? MouseSpeedY : key === 'hp' ? HpFlashY : MpFlashY,
      len: long ? SliderLenLong : SliderLen,
      range: key === 'video' ? VideoRange : Range,
      max: (key === 'video' ? VideoRange : Range) - 1,
      muted: () => (key === 'bgm' ? this.config.bgmMute : key === 'sfx' ? this.config.seMute : false),
    };
  }

  // --- Graphics fallback (no WZ assets loaded) ---

  private _drawFallback(): void {
    const g = this._bgFallback!;
    g.clear();
    g.rect(0, 0, PanelW, PanelH).fill({ color: '#0F0F19', alpha: 235 / 255 });
    g.rect(0, 0, PanelW, PanelH).stroke({ color: '#3C4164', width: 1 });
    g.rect(0, 0, PanelW, 50).fill({ color: '#0F1224' });
    const title = new Text({ text: 'SYSTEM OPTION', style: _fallbackStyle });
    title.x = 12; title.y = 8;
    this._root.addChild(title);
    this._dynamicChildren.push(title);
  }

  private _drawSliderFallback(s: SliderDef): void {
    const val = this._valFor(s);
    const fill = s.len * val / s.max;
    const k = new Graphics();
    k.rect(s.x, s.y + 6, s.len, 2).fill({ color: '#191932' });
    k.rect(s.x, s.y + 6, Math.max(0, Math.min(s.len, fill)), 2).fill({ color: s.muted() ? '#787878' : '#5A96DC' });
    const knobX = s.x + Math.max(0, Math.min(s.len, fill)) - 3;
    k.rect(knobX, s.y - 1, 6, 14).fill({ color: s.muted() ? '#969696' : '#EBEBF5' });
    k.rect(knobX, s.y - 1, 6, 1).fill({ color: '#46465A' });
    k.rect(knobX, s.y + 11, 6, 1).fill({ color: '#46465A' });
    k.rect(knobX, s.y - 1, 1, 14).fill({ color: '#46465A' });
    k.rect(knobX + 5, s.y - 1, 1, 14).fill({ color: '#46465A' });
    this._root.addChild(k);
    this._dynamicChildren.push(k);
  }

  private _drawCheckFallback(x: number, y: number, on: boolean): void {
    const g = new Graphics();
    g.rect(x, y, 11, 11).fill({ color: '#191932' });
    g.rect(x, y, 11, 1).fill({ color: '#504632' });
    g.rect(x, y + 10, 11, 1).fill({ color: '#504632' });
    g.rect(x, y, 1, 11).fill({ color: '#504632' });
    g.rect(x + 10, y, 1, 11).fill({ color: '#504632' });
    if (on) g.rect(x + 2, y + 2, 7, 7).fill({ color: '#64DC64' });
    this._root.addChild(g);
    this._dynamicChildren.push(g);
  }

  // --- Input ---

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    const lx = x - this._root.x;
    const ly = y - this._root.y;
    if (!down) {
      const wasDrag = this._dragTarget !== null;
      this._dragTarget = null;
      return wasDrag || (lx >= 0 && lx < PanelW && ly >= 0 && ly < PanelH);
    }

    // WZ buttons
    if (this._btOk && this._btOk.handleMouseButton(lx, ly, down)) return true;
    if (this._btCancel && this._btCancel.handleMouseButton(lx, ly, down)) return true;

    // Dropdown items (if a combo is open)
    if (this._openCombo) {
      for (let i = 0; i < MI_LABELS.length; i++) {
        const iy = MobInfoY + 18 + i * 18;
        if (lx >= MobInfoX && lx < MobInfoX + MobInfoW && ly >= iy && ly < iy + 18) {
          this.config.mobInfo = i;
          this._openCombo = null;
          this.onSettingsChanged?.();
          return true;
        }
      }
      this._openCombo = null;
      return true;
    }

    // Mutual-exclusive checkbox pairs (OnChildNotify param1=200)
    if (this._hitCheck(lx, ly, Screen800X, Screen800Y) && this.config.largeScreen) { this.config.largeScreen = false; this.onSettingsChanged?.(); return true; }
    if (this._hitCheck(lx, ly, Screen1024X, Screen1024Y) && !this.config.largeScreen) { this.config.largeScreen = true; this.onSettingsChanged?.(); return true; }
    if (this._hitCheck(lx, ly, BgmMuteX, BgmMuteY)) { this.config.bgmMute = !this.config.bgmMute; this.onSettingsChanged?.(); return true; }
    if (this._hitCheck(lx, ly, SfxMuteX, SfxMuteY)) { this.config.seMute = !this.config.seMute; this.onSettingsChanged?.(); return true; }
    if (this._hitCheck(lx, ly, TrembleX, TrembleY)) { this.config.tremble = !this.config.tremble; return true; }
    if (this._hitCheck(lx, ly, WindowedX, WindowedY) && !this.config.windowed) { this.config.windowed = true; this.onSettingsChanged?.(); return true; }
    if (this._hitCheck(lx, ly, FullscreenX, FullscreenY) && this.config.windowed) { this.config.windowed = false; this.onSettingsChanged?.(); return true; }
    if (this._hitCheck(lx, ly, MinimapNormalX, MinimapNormalY) && !this.config.minimapNormal) { this.config.minimapNormal = true; return true; }
    if (this._hitCheck(lx, ly, MinimapSimpleX, MinimapSimpleY) && this.config.minimapNormal) { this.config.minimapNormal = false; return true; }

    // MobInfo combo (open dropdown)
    if (this._hitCombo(lx, ly, MobInfoX, MobInfoY, MobInfoW)) { this._openCombo = this._openCombo === 'mobInfo' ? null : 'mobInfo'; return true; }

    // Sliders — GetPosByCoord @0x4ECCB0 snaps to nearest position
    const sliders = ['video', 'bgm', 'sfx', 'mouse', 'hp', 'mp'];
    for (const key of sliders) {
      const s = this._sliderFromKey(key);
      if (this._hitSlider(lx, ly, s)) {
        this._dragTarget = key;
        const pos = this._lxToPos(lx, s);
        this._setVal(s, pos);
        this.onSettingsChanged?.();
        return true;
      }
    }

    return lx >= 0 && lx < PanelW && ly >= 0 && ly < PanelH;
  }

  /** GetPosByCoord @0x4ECCB0: pick the position whose coord is closest to lx. */
  private _lxToPos(lx: number, s: SliderDef): number {
    if (s.range <= 1) return 0;
    let best = 0, bestD = Infinity;
    for (let p = 0; p < s.range; p++) {
      const coord = s.x + p * (s.len - 27) / (s.range - 1) + 13;
      const d = Math.abs(coord - lx);
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  }

  private _hitSlider(lx: number, ly: number, s: SliderDef): boolean {
    return lx >= s.x - 14 && lx < s.x + s.len + 14 && ly >= s.y - 3 && ly < s.y + 17;
  }

  private _hitCombo(lx: number, ly: number, x: number, y: number, w: number): boolean {
    return lx >= x && lx < x + w && ly >= y && ly < y + 18;
  }

  private _hitCheck(lx: number, ly: number, x: number, y: number): boolean {
    return lx >= x && lx < x + 25 && ly >= y && ly < y + 13;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this._setRet(2); return true; }
    if (key === 'Enter') { this._setRet(1); return true; }
    return true;
  }

  private _ogToPct(v: number): number { return Math.round(v / (Range - 1) * 100); }
  private _pctToOg(v: number): number { return Math.max(0, Math.min(Range - 1, Math.round(v / 100 * (Range - 1)))); }
}
