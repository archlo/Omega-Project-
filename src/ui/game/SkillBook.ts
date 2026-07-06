import { Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import type { SkillInfoService } from '../../character/SkillInfoService.js';
import type { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';

export interface SkillDragPayload { skillId: number; }

const PANEL_W = 172;
const PANEL_H = 480;
const ROWS = 12;
const ROW_H = 32;
const LIST_X = 6;
const LIST_Y = 58;

const _titleStyle = new TextStyle({ fill: '#DCC896', fontSize: 11, fontFamily: 'monospace' });
const _labelStyle = new TextStyle({ fill: '#CCC', fontSize: 10, fontFamily: 'monospace' });
const _valueStyle = new TextStyle({ fill: '#FFF', fontSize: 9, fontFamily: 'monospace' });
const _cdStyle = new TextStyle({ fill: '#E06060', fontSize: 8, fontFamily: 'monospace' });

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

// OG class: CUISkill (standard IGObj/IUIMsgHandler/ZRefCounted vtable triple;
// OnSkillLevelUpButton@CUISkill, GetRecommendSKill_).
export class SkillBook extends GamePanel {
  skillService: SkillInfoService | null = null;
  textureLoader: WzTextureLoader | null = null;
  sp = 0;
  onSkillUp: ((skillId: number) => void) | null = null;
  onSkillUse: ((skillId: number, slv: number) => void) | null = null;
  // OG: CUISkill::OnButtonClicked button id 0x7E7 (2023) — calls
  // ShiftMacroUIState which toggles CUIMacroSys::SetShow on the macro window.
  // TODO_AUDIT.md Hundred-and-nineteenth pass.
  onMacroOpen: (() => void) | null = null;
  nameOf: (id: number) => string = () => '';
  // OG: CDraggableSkill (IDA 0x7d8f60) — TODO_AUDIT.md Eighty-ninth/
  // Hundred-and-eighth passes. Lets a panel-agnostic DragController pick up
  // a skill icon from here; the actual drop target (e.g. QuickSlotBar)
  // decides whether to accept it.
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
  private _rowBackgrounds: Graphics[] = [];
  private _rowIcons: Sprite[] = [];
  private _rowNames: Text[] = [];
  private _rowLevels: Text[] = [];
  private _rowCds: Text[] = [];
  private _rowSpBtns: Container[] = [];

  constructor(loader?: WzTextureLoader, ui?: WzPackage | null) {
    super();
    this._root.visible = false;
    this._root.x = 190;
    this._root.y = 40;

    let hasWzBg = false;
    if (loader && ui) {
      const skillProp = ui.GetItem('UIWindow2.img/Skill/main');
      const prop = skillProp instanceof WzProperty ? skillProp : null;
      const bgNode = prop?.Get('backgrnd');
      if (bgNode instanceof WzCanvas) {
        const sprite = loader.Load(bgNode)?.ToPixi();
        if (sprite) { this._root.addChild(sprite); hasWzBg = true; }
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

    const macroLbl = new Text({ text: 'Macro', style: new TextStyle({ fill: '#8888CC', fontSize: 9, fontFamily: 'monospace' }) });
    macroLbl.x = 10; macroLbl.y = PANEL_H - 23;
    this._root.addChild(macroLbl);

    for (let i = 0; i < TAB_LABELS.length; i++) {
      const g = new Graphics();
      this._tabGraphics.push(g);
      this._root.addChild(g);
      const t = new Text({ text: TAB_LABELS[i].slice(0, 3), style: _labelStyle });
      this._tabLabels.push(t);
      this._root.addChild(t);
    }

    for (let i = 0; i < ROWS; i++) {
      const g = new Graphics();
      this._rowBackgrounds.push(g);
      this._root.addChild(g);

      const icon = new Sprite();
      icon.width = 24; icon.height = 24;
      icon.x = LIST_X; icon.y = LIST_Y + i * ROW_H + 4;
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

      const btn = new Container();
      const bg = new Graphics();
      bg.rect(0, 0, 16, 14).fill({  color: '#1E3C1E' });
      bg.rect(0, 0, 16, 14).stroke({  color: '#50A050', width: 1 });
      const pt = new Text({ text: '+', style: new TextStyle({ fill: '#64DC64', fontSize: 10, fontFamily: 'monospace' }) });
      pt.x = 3; pt.y = 0;
      btn.addChild(bg, pt);
      this._rowSpBtns.push(btn);
      this._root.addChild(btn);
    }
  }

  // OG: CUISkill::CanSkillUp/GetMaxSkillDegreeSP/GetMySkillDegreeSP
  // (decompile 0x84a930/0x84a870, plus get_job_level/get_job_change_level/
  // get_job_category/is_dual_job_born/is_evan_job). TODO_AUDIT.md
  // Sixty-fifth pass's `CUISkill` finding: the real client-side gate is a
  // per-job-tier, level-capped SP formula — this client previously only
  // checked `sp > 0`.
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
    // ponytail: is_dual_job_born needs the character's subJob field, which
    // this client doesn't track anywhere relevant to the skill book —
    // assumed false (the common case: not a Cygnus-recruited character).
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

  /** OG: CUISkill::CanSkillUp. Beginner/Noblesse-style jobs (job%1000===0
      or job===2001) can never skill-up via this gate at all. */
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
    this._spText.text = `SP: ${this.sp}`;
    this._spText.style = new TextStyle({
      fill: this.sp > 0 ? '#64DC64' : '#A0A0A0',
      fontSize: 10, fontFamily: 'monospace',
    });

    for (const [id, cd] of this._cooldowns) {
      cd.remaining -= _dt;
      if (cd.remaining <= 0) this._cooldowns.delete(id);
    }

    const tab = this._tabs[this._activeTab] || [];
    for (let i = 0; i < ROWS; i++) {
      const abs = this._scrollOffset + i;
      const sk = abs < tab.length ? tab[abs] : null;

      if (sk) {
        this._rowIcons[i].texture = Texture.EMPTY;
        const info = this.skillService?.Get(sk.id);
        if (info?.Icon) {
          const ws = this.textureLoader?.Load(info.Icon);
          if (ws) this._rowIcons[i].texture = ws.Texture;
        }

        this._rowNames[i].text = sk.name || `[${sk.id}]`;
        this._rowNames[i].x = LIST_X + 28;
        this._rowNames[i].y = LIST_Y + i * ROW_H + 4;

        if (sk.passive) {
          this._rowLevels[i].text = `(P) ${sk.level}/${sk.maxLevel}`;
        } else {
          this._rowLevels[i].text = `${sk.level}/${sk.maxLevel}`;
        }
        this._rowLevels[i].x = LIST_X + 28;
        this._rowLevels[i].y = LIST_Y + i * ROW_H + 16;
        this._rowLevels[i].style = new TextStyle({
          fill: sk.level >= sk.maxLevel ? '#C8B450' : '#A0C8A0',
          fontSize: 9, fontFamily: 'monospace',
        });

        const cd = this._cooldowns.get(sk.id);
        if (cd) {
          this._rowCds[i].text = `${Math.ceil(cd.remaining)}s`;
          this._rowCds[i].x = PANEL_W - 44;
          this._rowCds[i].y = LIST_Y + i * ROW_H + 16;
        } else {
          this._rowCds[i].text = '';
        }

        this._rowSpBtns[i].visible = this.sp > 0 && sk.level < sk.maxLevel && !sk.passive && this.canSkillUp(sk.id);
        this._rowSpBtns[i].x = PANEL_W - 22;
        this._rowSpBtns[i].y = LIST_Y + i * ROW_H + 6;
      } else {
        this._rowIcons[i].texture = Texture.EMPTY;
        this._rowNames[i].text = '';
        this._rowLevels[i].text = '';
        this._rowCds[i].text = '';
        this._rowSpBtns[i].visible = false;
      }
    }
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    const lx = x - this._root.x;
    const ly = y - this._root.y;
    if (!down) return true;

    if (lx >= PANEL_W - 18 && ly < 22) { this.isVisible = false; return true; }

    // Macro button (OG: CUISkill::OnButtonClicked id 0x7E7)
    if (lx >= 4 && lx < 62 && ly >= PANEL_H - 26 && ly < PANEL_H - 8) {
      this.onMacroOpen?.();
      return true;
    }

    for (let i = 0; i < TAB_LABELS.length; i++) {
      const tx = 4 + i * 28;
      if (lx >= tx && lx < tx + 26 && ly >= 20 && ly < 34) {
        this._activeTab = i;
        this._scrollOffset = 0;
        return true;
      }
    }

    const tab = this._tabs[this._activeTab] || [];
    for (let i = 0; i < ROWS; i++) {
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

    if (lx >= LIST_X && lx < PANEL_W - 24 && ly >= LIST_Y && ly < LIST_Y + ROWS * ROW_H) {
      const row = Math.floor((ly - LIST_Y) / ROW_H);
      const abs = this._scrollOffset + row;
      if (abs < tab.length) {
        const sk = tab[abs];
        if (!sk.passive && sk.level > 0) {
          this.onDragStart?.({ skillId: sk.id }, this._rowIcons[row].texture, x, y);
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

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.isVisible = false; return true; }
    const tab = this._tabs[this._activeTab] || [];
    if (key === 'PageDown') { this._scrollOffset = Math.min(this._scrollOffset + ROWS, Math.max(0, tab.length - ROWS)); return true; }
    if (key === 'PageUp') { this._scrollOffset = Math.max(0, this._scrollOffset - ROWS); return true; }
    return false;
  }

  private _rebuildBg(): void {
    this._bg.clear();
    this._bg.rect(0, 0, PANEL_W, PANEL_H).fill({  color: '#0C0C16', alpha: 235 / 255 });
    this._bg.rect(0, 0, PANEL_W, PANEL_H).stroke({  color: '#46465A', width: 1 });
    // Macro button (OG: btMacro, id 0x7E7)
    this._bg.rect(4, PANEL_H - 26, 58, 18).fill({ color: '#1A1A2E' });
    this._bg.rect(4, PANEL_H - 26, 58, 18).stroke({ color: '#5050A0', width: 1 });
  }
}
