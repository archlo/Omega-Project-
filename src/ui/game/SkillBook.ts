import { Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import type { SkillInfoService } from '../../character/SkillInfoService.js';
import type { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { ScrollBar } from './ScrollBar.js';
import { ItemTooltip } from './ItemTooltip.js';
import { TooltipAssets } from './TooltipAssets.js';
import type { BuiltInFont } from '../BuiltInFont.js';
import type { ItemIconLoader } from '../../character/ItemIconLoader.js';

export interface SkillDragPayload { skillId: number; }

// OG CUISkill constants (from IDA decompilation — Draw @ 0x84ed90)
const PANEL_W = 174;
const PANEL_H = 281;
const VISIBLE_ROWS = 4;
const ROW_H = 40;
const ROW_START_Y = 112; // nTop starts at 112 in Draw, row bg at nTop-19=93
const SP_TEXT_Y = 256; // SP count drawn at y=256
const BOOK_ICON_Y = 55; // Book icon at (15, 55)
const BOOK_NAME_Y = 65; // Book name centered at y=65 (or split at 55/69 if wide)

// Tab control: (8, 10), 154×20
const TAB_X = 8;
const TAB_Y = 10;
const TAB_W = 154;
const TAB_H = 20;

// Scrollbar: (1, 8), 93×155
const SB_X = 1;
const SB_Y = 8;
const SB_W = 93;
const SB_H = 155;

// OG: SP Up buttons: x=135, Y=113,153,193,233 — loaded from Skill/main/BtSpUp
const SP_BTN_X = 135;
const SP_BTN_Y_START = 113;
const SP_BTN_STEP = 40;

// OG: BtMacro button id=0x7E7 (2023) — loaded from Skill/main/BtMacro
const BT_MACRO_ID = 0x7E7;

// Hit testing (from GetSkillIndexFromPoint)
const ICON_LEFT = 13;
const ICON_RIGHT = 45;
const ROW_LEFT = 10;
const ROW_RIGHT = 149;

const _titleStyle = new TextStyle({ fill: '#DCC896', fontSize: 11, fontFamily: 'monospace' });
const _labelStyle = new TextStyle({ fill: '#CCC', fontSize: 10, fontFamily: 'monospace' });
const _valueStyle = new TextStyle({ fill: '#FFF', fontSize: 9, fontFamily: 'monospace' });
const _cdStyle = new TextStyle({ fill: '#E06060', fontSize: 8, fontFamily: 'monospace' });
const _bonusStyle = new TextStyle({ fill: '#64DC64', fontSize: 9, fontFamily: 'monospace' }); // OG: m_pFontBonus — green bonus text

const TAB_LABELS = ['Beginner', 'Warrior', 'Magician', 'Bowman', 'Thief', 'Pirate'];
const TAB_PREFIXES = [0, 10, 20, 30, 40, 50, 60];

export class SkillRow {
  constructor(
    public id: number,
    public name: string,
    public level: number,
    public maxLevel: number,
    public passive: boolean,
  ) {}
}

export interface CooldownEntry {
  skillId: number;
  remaining: number;
  total: number;
}

// OG class: CUISkill (3040 bytes, inherits CUIWnd)
// All coordinates and behavior from IDA decompilation of v95 client.
// Draw function (0x84ed90, 34K chars) rendering layout:
//   Slot bg: m_pCanvasSkill[state] at (10, nTop-19)
//   Skill icon: p->apCanvas[state+hover] at (12, nTop-17)
//   Recommend: m_pCanvasRecommendSkill at (47, nTop-19) if skill == recommendID
//   Skill name: m_pFont at (50, nTop-18)
//   Skill level: m_pFont at (50, nTop)
//   Bonus text: m_pFontBonus at (65, nTop) if bonus > 0
//   Line separator: m_pCanvasLine at (10, nTop+18) for rows 0-2
//   Book icon: pBookIcon at (15, 55)
//   Book name: m_pFontBookName at (50,55)/(50,69) if wide, else centered at (104-w/2, 65)
//   SP count: m_pFontNo at (104-textWidth, 256)
//   Loop: nTop=112, step=40, while nTop+40 < 272
export class SkillBook extends GamePanel {
  skillService: SkillInfoService | null = null;
  textureLoader: WzTextureLoader | null = null;
  sp = 0;
  onSkillUp: ((skillId: number) => void) | null = null;
  onSkillUse: ((skillId: number, slv: number) => void) | null = null;
  // OG: CUISkill::OnButtonClicked id 0x7E7 → ShiftMacroUIState
  onMacroOpen: (() => void) | null = null;
  nameOf: (id: number) => string = () => '';
  onDragStart: ((payload: SkillDragPayload, texture: Texture, x: number, y: number) => void) | null = null;

  private _skills: SkillRow[] = [];
  private _tabs: SkillRow[][] = [];
  private _activeTab = 0;
  private _scrollOffset = 0;
  private _lastClickSkillId = -1;
  private _lastClickTime = 0;
  private _cooldowns = new Map<number, CooldownEntry>();

  private _bg: Graphics;
  private _titleText: Text;
  private _spText: Text;
  private _tabGraphics: Graphics[] = [];
  private _tabLabels: Text[] = [];
  private _rowIcons: Sprite[] = [];
  private _rowNames: Text[] = [];
  private _rowLevels: Text[] = [];
  private _rowCds: Text[] = [];
  private _rowBonuses: Text[] = []; // OG: m_pFontBonus per row
  private _rowSpBtns: Container[] = [];
  private _scrollBar: ScrollBar;
  private _macroBtn: Container;
  // OG: Skill guide — OpenSkillGuide creates CWndSkillGuide (button IDs 3001-3004)
  onSkillGuide: ((grade: number) => void) | null = null;
  // OG Draw WZ canvases (from OnCreate @ 0x851520)
  // OG draws m_pCanvasSkill[0]/[1] at EACH row position — need per-row sprites
  private _skillSlotNormalTex: Texture | null = null; // m_pCanvasSkill[0] — skill0
  private _skillSlotEnabledTex: Texture | null = null; // m_pCanvasSkill[1] — skill1
  private _rowSlotBgs: Sprite[] = []; // one bg sprite per visible row (4 total)
  private _recommendBgTex: Texture | null = null; // m_pCanvasRecommendSkill — recommend/0
  private _rowRecommendBgs: Sprite[] = []; // one recommend bg per row
  private _lineBgTex: Texture | null = null; // m_pCanvasLine — line separator
  private _rowLineBgs: Sprite[] = []; // one line per row (rows 0-2 only)
  private _bookIcon: Sprite | null = null; // pBookIcon — book icon at (15, 55)
  private _hoverIndex = -1;
  private _recommendSkillId = 0; // from GetRecommendSKill
  private _tooltip: ItemTooltip | null = null;
  private _viewW = 1024;
  private _viewH = 768;
  private _mouseX = 0;
  private _mouseY = 0;

  constructor(loader?: WzTextureLoader, ui?: WzPackage | null,
    font?: BuiltInFont, icons?: ItemIconLoader) {
    super();
    this._root.visible = false;
    this._root.x = 190;
    this._root.y = 40;

    // OG: CUIWnd::OnCreate loads backgrnd from UIWindow2.img/Skill/main
    let hasWzBg = false;
    if (loader && ui) {
      const skillProp = ui.GetItem('UIWindow2.img/Skill/main');
      const prop = skillProp instanceof WzProperty ? skillProp : null;

      const bgNode = prop?.Get('backgrnd');
      if (bgNode instanceof WzCanvas) {
        const sprite = loader.Load(bgNode)?.ToPixi();
        if (sprite) { this._root.addChild(sprite); hasWzBg = true; }
      }

      // OG: skill0 canvas — normal skill slot background (m_pCanvasSkill[0])
      const skill0 = prop?.Get('skill0');
      if (skill0 instanceof WzCanvas) {
        const ws = loader.Load(skill0);
        if (ws) { this._skillSlotNormalTex = ws.Texture; }
      }

      // OG: skill1 canvas — enabled skill slot background (m_pCanvasSkill[1])
      const skill1 = prop?.Get('skill1');
      if (skill1 instanceof WzCanvas) {
        const ws = loader.Load(skill1);
        if (ws) { this._skillSlotEnabledTex = ws.Texture; }
      }

      // OG: recommend/0 canvas (m_pCanvasRecommendSkill)
      const rec = prop?.Get('recommend');
      if (rec instanceof WzProperty) {
        const rec0 = rec.Get('0');
        if (rec0 instanceof WzCanvas) {
          const ws = loader.Load(rec0);
          if (ws) { this._recommendBgTex = ws.Texture; }
        }
      }

      // OG: line canvas — separator (m_pCanvasLine)
      const line = prop?.Get('line');
      if (line instanceof WzCanvas) {
        const ws = loader.Load(line);
        if (ws) { this._lineBgTex = ws.Texture; }
      }

      // OG: Book icon at (15, 55) — pBookIcon from SKILLROOT
      // Loaded from the skill root's book icon property
      const bookIcon = prop?.Get('bookIcon');
      if (bookIcon instanceof WzCanvas) {
        const s = loader.Load(bookIcon)?.ToPixi();
        if (s) { this._bookIcon = s; this._root.addChild(s); }
      }
    }

    // OG: Create per-row sprites for slot bg, recommend bg, and line bg
    // The OG draws m_pCanvasSkill[0]/[1] at EACH row's position separately
    for (let i = 0; i < VISIBLE_ROWS; i++) {
      // Slot background (normal by default, switched to enabled for hovered row)
      const slotBg = new Sprite(this._skillSlotNormalTex ?? Texture.EMPTY);
      this._rowSlotBgs.push(slotBg);
      this._root.addChild(slotBg);

      // Recommend indicator
      const recBg = new Sprite(this._recommendBgTex ?? Texture.EMPTY);
      recBg.visible = false;
      this._rowRecommendBgs.push(recBg);
      this._root.addChild(recBg);

      // Line separator (only for rows 0-2)
      if (i < 3) {
        const lineBg = new Sprite(this._lineBgTex ?? Texture.EMPTY);
        this._rowLineBgs.push(lineBg);
        this._root.addChild(lineBg);
      }
    }

    this._bg = new Graphics();
    if (!hasWzBg) this._rebuildBg();
    this._root.addChild(this._bg);

    this._titleText = new Text({ text: 'Skills', style: _titleStyle });
    this._titleText.x = 66; this._titleText.y = 5;
    this._root.addChild(this._titleText);

    this._spText = new Text({ text: 'SP: 0', style: new TextStyle({ fill: '#A0A0A0', fontSize: 10, fontFamily: 'monospace' }) });
    this._spText.x = PANEL_W - 50; this._spText.y = 5;
    this._root.addChild(this._spText);

    // OG: Tab control at (8, 10), 154×20, nTabSpace=1
    for (let i = 0; i < TAB_LABELS.length; i++) {
      const g = new Graphics();
      this._tabGraphics.push(g);
      this._root.addChild(g);
      const t = new Text({ text: TAB_LABELS[i].slice(0, 3), style: _labelStyle });
      this._tabLabels.push(t);
      this._root.addChild(t);
    }

    // OG: Skill grid — 4 visible rows, Y starts at 127, step 40
    for (let i = 0; i < VISIBLE_ROWS; i++) {
      const icon = new Sprite();
      icon.width = 32; icon.height = 32;
      icon.x = ICON_LEFT; icon.y = ROW_START_Y + i * ROW_H - 31;
      this._rowIcons.push(icon);
      this._root.addChild(icon);

      const tn = new Text({ text: '', style: _valueStyle });
      this._rowNames.push(tn);
      this._root.addChild(tn);

      const tl = new Text({ text: '', style: _labelStyle });
      this._rowLevels.push(tl);
      this._root.addChild(tl);

      const tcd = new Text({ text: '', style: _cdStyle });
      this._rowCds.push(tcd);
      this._root.addChild(tcd);

      // OG: m_pFontBonus — bonus text at (65, nTop) when SkillLevel - PureSkillLevel > 0
      const tBonus = new Text({ text: '', style: _bonusStyle });
      this._rowBonuses.push(tBonus);
      this._root.addChild(tBonus);

      // OG: SP Up button — BtSpUp loaded from Skill/main/BtSpUp via CLayoutMan
      const btn = new Container();
      // Try loading from WZ: Skill/main/BtSpUp
      if (loader && ui) {
        const btSpUp = ui.GetItem('UIWindow2.img/Skill/main/BtSpUp');
        if (btSpUp instanceof WzProperty) {
          const enabledNode = btSpUp.Get('enabled');
          if (enabledNode instanceof WzCanvas) {
            const s = loader.Load(enabledNode)?.ToPixi();
            if (s) btn.addChild(s);
          }
        }
      }
      // Fallback graphics if WZ not available
      if (btn.children.length === 0) {
        const bg = new Graphics();
        bg.rect(0, 0, 16, 14).fill({ color: '#1E3C1E' });
        bg.rect(0, 0, 16, 14).stroke({ color: '#50A050', width: 1 });
        const pt = new Text({ text: '+', style: new TextStyle({ fill: '#64DC64', fontSize: 10, fontFamily: 'monospace' }) });
        pt.x = 3; pt.y = 0;
        btn.addChild(bg, pt);
      }
      btn.x = SP_BTN_X;
      btn.y = SP_BTN_Y_START + i * SP_BTN_STEP + 6;
      this._rowSpBtns.push(btn);
      this._root.addChild(btn);
    }

    // OG: Scrollbar at (1, 8), 93×155, nWheelRange=146
    this._scrollBar = new ScrollBar(SB_X, SB_Y, SB_H, (pos: number) => {
      this._scrollOffset = pos;
    });
    this._root.addChild(this._scrollBar.container);

    // OG: Macro button — BtMacro id 0x7E7, loaded from Skill/main/BtMacro
    this._macroBtn = new Container();
    let macroLoaded = false;
    if (loader && ui) {
      const btMacro = ui.GetItem('UIWindow2.img/Skill/main/BtMacro');
      if (btMacro instanceof WzProperty) {
        const enabledNode = btMacro.Get('enabled');
        if (enabledNode instanceof WzCanvas) {
          const s = loader.Load(enabledNode)?.ToPixi();
          if (s) { this._macroBtn.addChild(s); macroLoaded = true; }
        }
      }
    }
    if (!macroLoaded) {
      const macroBg = new Graphics();
      macroBg.rect(0, 0, 58, 18).fill({ color: '#1A1A2E' });
      macroBg.rect(0, 0, 58, 18).stroke({ color: '#5050A0', width: 1 });
      const macroTxt = new Text({ text: 'Macro', style: new TextStyle({ fill: '#8888CC', fontSize: 9, fontFamily: 'monospace' }) });
      macroTxt.x = 8; macroTxt.y = 3;
      this._macroBtn.addChild(macroBg, macroTxt);
    }
    this._macroBtn.x = 4;
    this._macroBtn.y = PANEL_H - 26;
    this._root.addChild(this._macroBtn);

    // OG: Create tooltip for skill hover display
    if (font && icons && loader && ui) {
      const assets = new TooltipAssets(loader, ui);
      this._tooltip = new ItemTooltip(font, icons, assets);
    }
  }

  get tooltipContainer(): Container | null { return this._tooltip?.root ?? null; }
  setViewSize(w: number, h: number): void { this._viewW = w; this._viewH = h; }

  // OG: CUISkill::CanSkillUp/GetMaxSkillDegreeSP/GetMySkillDegreeSP
  characterLevel = 0;

  private _getJobLevel(job: number): number {
    if (job % 100 === 0 || job === 2001) return 1;
    const v1 = Math.floor(job / 10) === 43 ? (job - 430) / 2 : job % 10;
    const v2 = v1 + 2;
    if (v2 >= 2 && (v2 <= 4 || (v2 <= 10 && (Math.floor(job / 100) === 22 || job === 2001)))) return v2;
    return 0;
  }

  private _getJobChangeLevel(job: number, step: number): number {
    const v3 = Math.floor(job / 1000);
    if (v3 === 3 || Math.floor(job / 100) === 22 || job === 2001) return 200;
    const isMagician = (job % 1000 / 100 | 0) === 2;
    switch (step) {
      case 1: return isMagician ? 8 : 10;
      case 2: return 30;
      case 3: return 70;
      case 4: return 120;
      default: return 200;
    }
  }

  private _getMaxSkillDegreeSP(job: number, degree: number): number {
    const diff = this._getJobChangeLevel(job, degree + 1) - this._getJobChangeLevel(job, degree);
    if (diff <= 0) return 0;
    return 3 * diff + (degree === 4 ? 3 : 1);
  }

  private _getMySkillDegreeSP(degree: number): number {
    let sum = 0;
    for (const sk of this._skills) {
      const job = Math.floor(sk.id / 10000);
      if (job % 1000 !== 0 && job !== 2001 && this._getJobLevel(job) === degree) sum += sk.level;
    }
    return sum;
  }

  canSkillUp(skillId: number): boolean {
    const job = Math.floor(skillId / 10000);
    if (job % 1000 === 0 || job === 2001) return false;
    const jobLevel = this._getJobLevel(job);
    let spentBelow = 0, capBelow = 0;
    for (let tier = 1; tier < jobLevel; tier++) {
      spentBelow += this._getMySkillDegreeSP(tier);
      capBelow += this._getMaxSkillDegreeSP(job, tier);
    }
    if (jobLevel > 1 && spentBelow < capBelow) return false;
    const mySP = this._getMySkillDegreeSP(jobLevel);
    const lvl = this.characterLevel;
    switch (jobLevel) {
      case 2: return mySP < 3 * lvl - 89;
      case 3: return mySP < 3 * lvl - 209;
      case 4: return mySP < 3 * (lvl - 119);
      default: return true;
    }
  }

  setSkills(skills: SkillRow[]): void {
    this._skills = skills;
    this.rebuildTabs();
  }

  rebuildTabs(): void {
    const tabs: SkillRow[][] = [];
    for (let i = 0; i < TAB_PREFIXES.length; i++) tabs.push([]);
    for (const sk of this._skills) {
      const jobRoot = Math.floor(sk.id / 10000);
      let tabIdx = 0;
      for (let i = TAB_PREFIXES.length - 1; i >= 1; i--) {
        if (jobRoot >= TAB_PREFIXES[i]) { tabIdx = i; break; }
      }
      tabs[tabIdx].push(sk);
    }
    this._tabs = tabs;
    // OG: SetScrollBar — range = skillCount - VISIBLE_ROWS
    const tab = this._tabs[this._activeTab] || [];
    this._scrollBar.setRange(Math.max(0, tab.length - VISIBLE_ROWS));
    // OG: GetRecommendSKill — find recommended skill for current tab
    this._recommendSkillId = 0;
    if (tab.length > 0) {
      // Simple heuristic: recommend the first non-passive skill with level > 0
      for (const sk of tab) {
        if (!sk.passive && sk.level > 0 && sk.level < sk.maxLevel) {
          this._recommendSkillId = sk.id;
          break;
        }
      }
    }
  }

  startCooldown(skillId: number, totalSeconds: number): void {
    this._cooldowns.set(skillId, { skillId, remaining: totalSeconds, total: totalSeconds });
  }

  clearCooldown(skillId: number): void {
    this._cooldowns.delete(skillId);
  }

  cooldownOf(skillId: number): { remain: number; total: number } | null {
    const cd = this._cooldowns.get(skillId);
    return cd ? { remain: cd.remaining, total: cd.total } : null;
  }

  update(_dt: number): void {
    if (!this.isVisible) return;

    for (const [id, cd] of this._cooldowns) {
      cd.remaining -= _dt;
      if (cd.remaining <= 0) this._cooldowns.delete(id);
    }

    const tab = this._tabs[this._activeTab] || [];

    // OG Draw: Book icon at (15, 55) via pBookIcon
    if (this._bookIcon) {
      this._bookIcon.position.set(15, 55);
      this._bookIcon.visible = true;
    }

    // OG Draw: SP count at (104 - textWidth, 256) via m_pFontNo — right-aligned at x=104
    this._spText.text = `${this.sp}`;
    this._spText.style = new TextStyle({
      fill: this.sp > 0 ? '#64DC64' : '#A0A0A0',
      fontSize: 10, fontFamily: 'monospace',
    });
    this._spText.x = 104 - this._spText.width;
    this._spText.y = SP_TEXT_Y;

    // OG Draw: Book name — centered at (104-w/2, 65) via m_pFontBookName
    // If width >= 110, split at space: line1 at (50,55), line2 at (50,69)
    const bookName = this._tabs.length > 0 ? TAB_LABELS[this._activeTab] : '';
    this._titleText.text = bookName;
    // OG Draw: measure text width for centering decision
    const bookNameWidth = this._titleText.width;
    if (bookNameWidth < 110) {
      // Narrow: centered at (104 - w/2, 65)
      this._titleText.x = 104 - bookNameWidth / 2;
      this._titleText.y = 65;
    } else {
      // Wide: two-line at (50, 55) and (50, 69)
      this._titleText.x = 50;
      this._titleText.y = 55;
    }

    // OG Draw: Skill slot rendering loop — nTop=112, step=40, while nTop+40<272
    for (let i = 0; i < VISIBLE_ROWS; i++) {
      const abs = this._scrollOffset + i;
      const sk = abs < tab.length ? tab[abs] : null;
      const nTop = ROW_START_Y + i * ROW_H; // 112, 152, 192, 232
      const isHovered = i === this._hoverIndex;

      if (sk) {
        // OG Draw: Slot background at (10, nTop-19) via m_pCanvasSkill[state]
        // state 0=normal, 1=enabled (hovered row when skill can level up)
        const isHoveredRow = isHovered && this.sp > 0 && sk.level < sk.maxLevel && !sk.passive && this.canSkillUp(sk.id);
        const slotBg = this._rowSlotBgs[i];
        if (isHoveredRow && this._skillSlotEnabledTex) {
          slotBg.texture = this._skillSlotEnabledTex;
        } else if (this._skillSlotNormalTex) {
          slotBg.texture = this._skillSlotNormalTex;
        }
        slotBg.position.set(10, nTop - 19);
        slotBg.visible = true;

        // OG Draw: Skill icon at (12, nTop-17) via p->apCanvas[state+hover]
        this._rowIcons[i].texture = Texture.EMPTY;
        const info = this.skillService?.Get(sk.id);
        if (info?.Icon) {
          const ws = this.textureLoader?.Load(info.Icon);
          if (ws) this._rowIcons[i].texture = ws.Texture;
        }
        this._rowIcons[i].x = 12;
        this._rowIcons[i].y = nTop - 17;

        // OG Draw: Recommend indicator at (47, nTop-19) if skill == recommendID
        const recBg = this._rowRecommendBgs[i];
        if (sk.id === this._recommendSkillId && this._recommendBgTex) {
          recBg.texture = this._recommendBgTex;
          recBg.position.set(47, nTop - 19);
          recBg.visible = true;
        } else {
          recBg.visible = false;
        }

        // OG Draw: Skill name at (50, nTop-18) via m_pFont
        this._rowNames[i].text = sk.name || `[${sk.id}]`;
        this._rowNames[i].x = 50;
        this._rowNames[i].y = nTop - 18;

        // OG Draw: Level at (50, nTop) via m_pFont or m_pFontBonus if bonus>0
        if (sk.passive) {
          this._rowLevels[i].text = `(P) ${sk.level}/${sk.maxLevel}`;
        } else {
          this._rowLevels[i].text = `${sk.level}/${sk.maxLevel}`;
        }
        this._rowLevels[i].x = 50;
        this._rowLevels[i].y = nTop;
        this._rowLevels[i].style = new TextStyle({
          fill: sk.level >= sk.maxLevel ? '#C8B450' : '#A0C8A0',
          fontSize: 9, fontFamily: 'monospace',
        });

        const cd = this._cooldowns.get(sk.id);
        if (cd) {
          this._rowCds[i].text = `${Math.ceil(cd.remaining)}s`;
          this._rowCds[i].x = PANEL_W - 44;
          this._rowCds[i].y = nTop;
        } else {
          this._rowCds[i].text = '';
        }

        // OG Draw: Bonus text at (65, nTop) via m_pFontBonus when SkillLevel - PureSkillLevel > 0
        // PureSkillLevel = level without equipment bonus; difference = passive skill bonus
        const bonus = Math.max(0, sk.level - Math.floor(sk.level * 0.8)); // simplified bonus calc
        if (bonus > 0) {
          this._rowBonuses[i].text = `+${bonus}`;
          this._rowBonuses[i].x = 65;
          this._rowBonuses[i].y = nTop;
          this._rowBonuses[i].visible = true;
        } else {
          this._rowBonuses[i].text = '';
          this._rowBonuses[i].visible = false;
        }

        // OG Draw: Line separator at (10, nTop+18) for rows 0-2
        if (i < 3 && this._lineBgTex) {
          const lineBg = this._rowLineBgs[i];
          lineBg.texture = this._lineBgTex;
          lineBg.position.set(10, nTop + 18);
          lineBg.visible = true;
        }

        // OG: SetButton(idx, 1, enabled)
        this._rowSpBtns[i].visible = this.sp > 0 && sk.level < sk.maxLevel && !sk.passive && this.canSkillUp(sk.id);
      } else {
        // OG: SetButton(idx, 0, 0) — hide
        this._rowSlotBgs[i].visible = false;
        this._rowRecommendBgs[i].visible = false;
        this._rowIcons[i].texture = Texture.EMPTY;
        this._rowNames[i].text = '';
        this._rowLevels[i].text = '';
        this._rowCds[i].text = '';
        this._rowBonuses[i].text = '';
        this._rowBonuses[i].visible = false;
        this._rowSpBtns[i].visible = false;
        if (i < 3) this._rowLineBgs[i].visible = false;
      }
    }

    // OG: DrawTab — tab label highlighting
    for (let i = 0; i < TAB_LABELS.length; i++) {
      const isActive = i === this._activeTab;
      const tx = TAB_X + i * (TAB_W / TAB_LABELS.length);
      this._tabGraphics[i].clear();
      if (isActive) {
        this._tabGraphics[i].rect(tx, TAB_Y, TAB_W / TAB_LABELS.length - 1, TAB_H)
          .fill({ color: '#3C4164', alpha: 0.8 });
      }
      this._tabLabels[i].x = tx + 4;
      this._tabLabels[i].y = TAB_Y + 4;
      this._tabLabels[i].style = new TextStyle({
        fill: isActive ? '#FFF' : '#888',
        fontSize: 10, fontFamily: 'monospace',
      });
    }
  }

  // OG: GetSkillIndexFromPoint — hit testing (v10 starts at 127, step 40)
  private _getSkillIndexFromPoint(lx: number, ly: number, bIcon: boolean): number {
    const tab = this._tabs[this._activeTab] || [];
    let v10 = 127; // OG: v10 = 127 initial value
    for (let i = this._scrollOffset; i < tab.length; i++) {
      let left: number, top: number, right: number, bottom: number;
      if (bIcon) {
        left = 13; top = v10 - 31; right = 45; bottom = v10 + 1;
      } else {
        left = 10; top = v10 - 34; right = 149; bottom = v10;
      }
      if (lx >= left && lx < right && ly >= top && ly < bottom) {
        return i - this._scrollOffset;
      }
      v10 += 40;
      if (v10 >= 287) break; // OG: stops at 287
    }
    return -1;
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    const lx = x - this._root.x;
    const ly = y - this._root.y;

    // Forward to scrollbar first
    const sbx = lx - SB_X;
    const sby = ly - SB_Y;
    if (sbx >= 0 && sbx < 12 && sby >= 0 && sby < SB_H) {
      if (this._scrollBar.handleMouseButton(sbx, sby, down)) return true;
    }

    if (!down) return true;

    // Close button
    if (lx >= PANEL_W - 18 && ly < 22) { this.isVisible = false; return true; }

    // OG: OnButtonClicked id 2023 — macro toggle (0x7E7)
    if (lx >= this._macroBtn.x && lx < this._macroBtn.x + 58 &&
        ly >= this._macroBtn.y && ly < this._macroBtn.y + 18) {
      this.onMacroOpen?.();
      return true;
    }

    // OG: OnButtonClicked ids 3001-3004 — skill guide (OpenSkillGuide)
    // These are tab-specific guide buttons; we check if click is in the guide area
    // The OG creates CWndSkillGuide with the grade parameter
    if (ly >= PANEL_H - 46 && ly < PANEL_H - 26 && lx >= 4 && lx < 62) {
      // Skill guide area — pass active tab + 1 as grade
      this.onSkillGuide?.(this._activeTab + 1);
      return true;
    }

    // OG: Tab click — nId=2000, param1=100
    for (let i = 0; i < TAB_LABELS.length; i++) {
      const tx = TAB_X + i * (TAB_W / TAB_LABELS.length);
      if (lx >= tx && lx < tx + TAB_W / TAB_LABELS.length && ly >= TAB_Y && ly < TAB_Y + TAB_H) {
        this._activeTab = i;
        this._scrollOffset = 0;
        this._scrollBar.pos = 0;
        // OG: OnTabChanged — clear tooltip, reload, set scrollbar, set buttons
        this._lastClickSkillId = -1;
        return true;
      }
    }

    // OG: SP Up button clicks — nId=2010..2013
    const tab = this._tabs[this._activeTab] || [];
    for (let i = 0; i < VISIBLE_ROWS; i++) {
      const btn = this._rowSpBtns[i];
      if (!btn.visible) continue;
      if (lx >= btn.x && lx < btn.x + 16 && ly >= btn.y && ly < btn.y + 14) {
        const abs = this._scrollOffset + i;
        if (abs < tab.length) {
          const sk = tab[abs];
          if (sk.level < sk.maxLevel) {
            sk.level++;
            this.sp--;
            this.onSkillUp?.(sk.id);
          }
        }
        return true;
      }
    }

    // OG: Skill row click — GetSkillIndexFromPoint with bIcon=0
    const rowIdx = this._getSkillIndexFromPoint(lx, ly, false);
    if (rowIdx >= 0) {
      const abs = this._scrollOffset + rowIdx;
      if (abs < tab.length) {
        const sk = tab[abs];
        if (!sk.passive && sk.level > 0) {
          this.onDragStart?.({ skillId: sk.id }, this._rowIcons[rowIdx].texture, x, y);
          const now = performance.now();
          const isDoubleClick = sk.id === this._lastClickSkillId && now - this._lastClickTime < 400;
          this._lastClickSkillId = sk.id;
          this._lastClickTime = isDoubleClick ? 0 : now;
          if (isDoubleClick) this.onSkillUse?.(sk.id, sk.level);
        }
      }
      return true;
    }

    // OG: Icon click — GetSkillIndexFromPoint with bIcon=1
    const iconIdx = this._getSkillIndexFromPoint(lx, ly, true);
    if (iconIdx >= 0) {
      const abs = this._scrollOffset + iconIdx;
      if (abs < tab.length) {
        const sk = tab[abs];
        if (!sk.passive && sk.level > 0) {
          this.onDragStart?.({ skillId: sk.id }, this._rowIcons[iconIdx].texture, x, y);
          const now = performance.now();
          const isDoubleClick = sk.id === this._lastClickSkillId && now - this._lastClickTime < 400;
          this._lastClickSkillId = sk.id;
          this._lastClickTime = isDoubleClick ? 0 : now;
          if (isDoubleClick) this.onSkillUse?.(sk.id, sk.level);
        }
      }
      return true;
    }

    return lx >= 0 && lx < PANEL_W && ly >= 0 && ly < PANEL_H;
  }

  // OG: CUISkill::OnMouseMove — hover + tooltip
  onMouseMove(x: number, y: number): void {
    this._mouseX = x;
    this._mouseY = y;
    if (!this.isVisible) return;
    const lx = x - this._root.x;
    const ly = y - this._root.y;
    // Forward to scrollbar
    const sbx = lx - SB_X;
    const sby = ly - SB_Y;
    if (sbx >= 0 && sbx < 12 && sby >= 0 && sby < SB_H) {
      this._scrollBar.handleMouseMove(sbx, sby);
    } else {
      this._scrollBar.handleMouseLeave();
    }
    // OG: GetSkillIndexFromPoint(this, rx, ry, 0) → store in m_nMouseOver
    const hoverIdx = this._getSkillIndexFromPoint(lx, ly, false);
    if (hoverIdx !== this._hoverIndex) {
      this._hoverIndex = hoverIdx;
      // Trigger redraw to update slot bg state (normal vs enabled)
    }

    // OG: Show skill tooltip on hover
    if (this._hoverIndex >= 0 && this._tooltip) {
      const tab = this._tabs[this._activeTab] || [];
      const skill = tab[this._scrollOffset + this._hoverIndex];
      if (skill) {
        this._tooltip.DrawSkillTooltip(
          skill.id, skill.name, this.nameOf(skill.id),
          skill.level, skill.maxLevel,
          '', '', [], // help text, next help text, required skills
          this._mouseX, this._mouseY, this._viewW, this._viewH,
          true,
        );
      }
    } else if (this._tooltip) {
      this._tooltip.Hide();
    }
  }

  // OG: Clear hover when mouse leaves the panel
  onMouseLeave(): void {
    if (this._hoverIndex !== -1) {
      this._hoverIndex = -1;
    }
    this._scrollBar.handleMouseLeave();
    this._tooltip?.Hide();
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.isVisible = false; return true; }
    const tab = this._tabs[this._activeTab] || [];
    if (key === 'PageDown') {
      this._scrollOffset = Math.min(this._scrollOffset + VISIBLE_ROWS, Math.max(0, tab.length - VISIBLE_ROWS));
      this._scrollBar.pos = this._scrollOffset;
      return true;
    }
    if (key === 'PageUp') {
      this._scrollOffset = Math.max(0, this._scrollOffset - VISIBLE_ROWS);
      this._scrollBar.pos = this._scrollOffset;
      return true;
    }
    return false;
  }

  private _rebuildBg(): void {
    this._bg.clear();
    this._bg.rect(0, 0, PANEL_W, PANEL_H).fill({ color: '#0C0C16', alpha: 235 / 255 });
    this._bg.rect(0, 0, PANEL_W, PANEL_H).stroke({ color: '#46465A', width: 1 });
  }
}
