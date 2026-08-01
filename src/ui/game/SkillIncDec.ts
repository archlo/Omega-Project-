import { Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import type { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { ScrollBar } from './ScrollBar.js';

// OG: CUISkillInc/Dec/DecEX — 3-step SP reset wizard
// Step 0: CUISkillDec/DecEX (pick skill to remove SP from)
// Step 1: CUISkillInc (pick skill to add SP to)
// Step 2: CUISkillChangeConfirm (confirm the swap)

// OG: WZ paths for backgrounds (from CDialog::CreateDlg)
// Step 0: UI/UIWindow2.img/Reset/SP/step0/backgrnd (Dec/DecEX)
// Step 1: UI/UIWindow2.img/Reset/SP/step1/backgrnd (Inc)
// Step 2: UI/UIWindow2.img/Reset/SP/step2/backgrnd (ChangeConfirm)

// OG: Row rendering WZ resources (from Draw functions)
// skill0: UI/UIWindow2.img/Reset/SP/skill0 — disabled/normal row bg
// skill1: UI/UIWindow2.img/Reset/SP/skill1 — enabled/active row bg
// line:   UI/UIWindow2.img/Reset/SP/line — separator line

// OG: Tab icons (from DrawTab)
// Tab/enabled/%d — normal jobs
// EvanTab/enabled/%d — extend SP jobs (Aran/Evan/DualBlade)

// OG: ExtendSP detection
function isExtendSP(job: number): boolean {
  return Math.floor(job / 1000) === 3 || Math.floor(job / 100) === 22 || job === 2001;
}

const _nameStyle = new TextStyle({ fill: '#FFFFFF', fontSize: 9, fontFamily: 'monospace' });
const _levelStyle = new TextStyle({ fill: '#A0C8A0', fontSize: 9, fontFamily: 'monospace' });
const _redLevelStyle = new TextStyle({ fill: '#FF6464', fontSize: 9, fontFamily: 'monospace' });
const _blueLevelStyle = new TextStyle({ fill: '#6464FF', fontSize: 9, fontFamily: 'monospace' });
const _spLabelStyle = new TextStyle({ fill: '#FF8888', fontSize: 9, fontFamily: 'monospace' });
const _spBlueLabelStyle = new TextStyle({ fill: '#8888FF', fontSize: 9, fontFamily: 'monospace' });

interface SkillRow {
  id: number;
  name: string;
  level: number;
  maxLevel?: number;
  icon?: WzCanvas;
}

// ─── CUISkillInc (Step 1) — Skill Increment Panel ─────────────────────────
// OG: Inherits CUIWnd, WZ background from step1/backgrnd
// Scrollbar at (1,8,150,93,155), Close at (152,6), SP Up buttons at (133,113+i*40)
// Row Y start: 93, step: 40, skill0/skill1/line canvases
export class SkillIncPanel extends GamePanel {
  private _rows: { bg: Sprite; icon: Sprite; name: Text; level: Text; spLabel: Text; btn: Container }[] = [];
  private _scrollBar: ScrollBar;
  private _scrollOffset = 0;
  private _skills: SkillRow[] = [];
  private _onSkillUp: ((skillId: number) => void) | null = null;
  private _textureLoader: WzTextureLoader | null = null;
  private _skill0Tex: Texture | null = null; // normal row bg
  private _skill1Tex: Texture | null = null; // enabled row bg
  private _lineTex: Texture | null = null; // separator

  constructor(loader?: WzTextureLoader, ui?: WzPackage | null) {
    super();
    this._textureLoader = loader ?? null;

    // OG: CDialog::CreateDlg with step1/backgrnd
    if (loader && ui) {
      const bg = ui.GetItem('UI/UIWindow2.img/Reset/SP/step1/backgrnd');
      if (bg instanceof WzCanvas) {
        const sprite = loader.Load(bg)?.ToPixi();
        if (sprite) this._root.addChild(sprite);
      }
      for (const layer of ['backgrnd2', 'backgrnd3']) {
        const node = ui.GetItem(`UI/UIWindow2.img/Reset/SP/step1/${layer}`);
        if (node instanceof WzCanvas) {
          const sprite = loader.Load(node)?.ToPixi();
          if (sprite) this._root.addChild(sprite);
        }
      }
    }

    // OG: Load skill0, skill1, line canvases from Reset/SP/
    if (loader && ui) {
      const s0 = ui.GetItem('UI/UIWindow2.img/Reset/SP/skill0');
      if (s0 instanceof WzCanvas) this._skill0Tex = loader.Load(s0)?.Texture ?? null;
      const s1 = ui.GetItem('UI/UIWindow2.img/Reset/SP/skill1');
      if (s1 instanceof WzCanvas) this._skill1Tex = loader.Load(s1)?.Texture ?? null;
      const ln = ui.GetItem('UI/UIWindow2.img/Reset/SP/line');
      if (ln instanceof WzCanvas) this._lineTex = loader.Load(ln)?.Texture ?? null;
    }

    // OG: Scrollbar at (1, 8, 150, 93, 155), wheelRange=156
    this._scrollBar = new ScrollBar(1, 8, 155, (pos: number) => {
      this._scrollOffset = pos;
    });
    this._root.addChild(this._scrollBar.container);

    // OG: 4 visible rows, y = 40*i + 93
    for (let i = 0; i < 4; i++) {
      const y = 40 * i + 93;
      const bg = new Sprite(this._skill0Tex ?? Texture.EMPTY);
      bg.position.set(9, y - 21);
      this._root.addChild(bg);

      const icon = new Sprite(Texture.EMPTY);
      icon.width = 32; icon.height = 32;
      icon.position.set(11, y - 19);
      this._root.addChild(icon);

      const name = new Text({ text: '', style: _nameStyle });
      name.position.set(49, y - 18);
      this._root.addChild(name);

      const level = new Text({ text: '', style: _levelStyle });
      level.position.set(49, y);
      this._root.addChild(level);

      const spLabel = new Text({ text: '', style: _spLabelStyle });
      spLabel.position.set(49, y);
      spLabel.visible = false;
      this._root.addChild(spLabel);

      // OG: SP Up button at (133, 113+i*40)
      const btn = new Container();
      const btnBg = new Graphics();
      btnBg.rect(0, 0, 16, 14).fill({ color: '#1E3C1E' });
      btnBg.rect(0, 0, 16, 14).stroke({ color: '#50A050', width: 1 });
      const pt = new Text({ text: '+', style: new TextStyle({ fill: '#64DC64', fontSize: 10, fontFamily: 'monospace' }) });
      pt.x = 3; pt.y = 0;
      btn.addChild(btnBg, pt);
      btn.position.set(133, 113 + i * 40);
      btn.visible = false;
      this._root.addChild(btn);

      this._rows.push({ bg, icon, name, level, spLabel, btn });
    }
  }

  setOnSkillUp(cb: (skillId: number) => void): void { this._onSkillUp = cb; }

  open(skills: SkillRow[], x: number, y: number): void {
    this._skills = skills;
    this._scrollOffset = 0;
    this._scrollBar.pos = 0;
    this._scrollBar.setRange(Math.max(0, skills.length - 3));
    this._root.position.set(x, y);
    this.isVisible = true;
  }

  update(_dt: number): void {
    if (!this.isVisible) return;
    for (let i = 0; i < this._rows.length; i++) {
      const abs = this._scrollOffset + i;
      const sk = abs < this._skills.length ? this._skills[abs] : null;
      const row = this._rows[i];
      if (sk) {
         row.name.text = sk.name;
        row.level.text = `${sk.level}`;
        row.level.style = _levelStyle;
        row.level.visible = true;
        row.spLabel.visible = false;
        row.btn.visible = (sk.maxLevel ?? 99) > sk.level;
        row.bg.texture = this._skill1Tex ?? this._skill0Tex ?? Texture.EMPTY;
        if (sk.icon && this._textureLoader) {
          const ws = this._textureLoader.Load(sk.icon);
          if (ws) row.icon.texture = ws.Texture;
        }
      } else {
        row.name.text = '';
        row.level.text = '';
        row.level.visible = false;
        row.spLabel.visible = false;
        row.btn.visible = false;
        row.bg.texture = this._skill0Tex ?? Texture.EMPTY;
        row.icon.texture = Texture.EMPTY;
      }
    }
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    const lx = x - this._root.x;
    const ly = y - this._root.y;
    if (!down) return true;
    if (lx >= 152 && lx < 170 && ly >= 6 && ly < 22) { this.isVisible = false; return true; }
    for (let i = 0; i < this._rows.length; i++) {
      const btn = this._rows[i].btn;
      if (!btn.visible) continue;
      if (lx >= btn.x && lx < btn.x + 16 && ly >= btn.y && ly < btn.y + 14) {
        const abs = this._scrollOffset + i;
        if (abs < this._skills.length) this._onSkillUp?.(this._skills[abs].id);
        return true;
      }
    }
     return lx >= 0 && lx < 170 && ly >= 0 && ly < 262;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.isVisible = false; return true; }
    return true;
  }
}

// ─── CUISkillDec (Step 0) — Skill Decrement Panel ─────────────────────────
// OG: Inherits CUIWnd, WZ background from step0/backgrnd
// Tab at (8,8,69,170,20), Scrollbar at (1,8,150,95,153), Close at (149,6)
// SP Down buttons at (133,115+i*40), Row Y start: 95, step: 40
export class SkillDecPanel extends GamePanel {
  private _rows: { bg: Sprite; icon: Sprite; name: Text; level: Text; spLabel: Text; btn: Container }[] = [];
  private _scrollBar: ScrollBar;
  private _scrollOffset = 0;
  private _skills: SkillRow[] = [];
  private _onSkillDown: ((skillId: number) => void) | null = null;
  private _textureLoader: WzTextureLoader | null = null;
  private _skill0Tex: Texture | null = null;
  private _skill1Tex: Texture | null = null;
  private _lineTex: Texture | null = null;

  constructor(loader?: WzTextureLoader, ui?: WzPackage | null) {
    super();
    this._textureLoader = loader ?? null;

    // OG: CDialog::CreateDlg with step0/backgrnd
    if (loader && ui) {
      const bg = ui.GetItem('UI/UIWindow2.img/Reset/SP/step0/backgrnd');
      if (bg instanceof WzCanvas) {
        const sprite = loader.Load(bg)?.ToPixi();
        if (sprite) this._root.addChild(sprite);
      }
      for (const layer of ['backgrnd2', 'backgrnd3']) {
        const node = ui.GetItem(`UI/UIWindow2.img/Reset/SP/step0/${layer}`);
        if (node instanceof WzCanvas) {
          const sprite = loader.Load(node)?.ToPixi();
          if (sprite) this._root.addChild(sprite);
        }
      }
    }

    if (loader && ui) {
      const s0 = ui.GetItem('UI/UIWindow2.img/Reset/SP/skill0');
      if (s0 instanceof WzCanvas) this._skill0Tex = loader.Load(s0)?.Texture ?? null;
      const s1 = ui.GetItem('UI/UIWindow2.img/Reset/SP/skill1');
      if (s1 instanceof WzCanvas) this._skill1Tex = loader.Load(s1)?.Texture ?? null;
      const ln = ui.GetItem('UI/UIWindow2.img/Reset/SP/line');
      if (ln instanceof WzCanvas) this._lineTex = loader.Load(ln)?.Texture ?? null;
    }

    // OG: Scrollbar at (1, 8, 150, 95, 153), wheelRange=156
    this._scrollBar = new ScrollBar(1, 8, 153, (pos: number) => {
      this._scrollOffset = pos;
    });
    this._root.addChild(this._scrollBar.container);

    // OG: 4 visible rows, y = 40*i + 95
    for (let i = 0; i < 4; i++) {
      const y = 40 * i + 95;
      const bg = new Sprite(this._skill0Tex ?? Texture.EMPTY);
      bg.position.set(9, y - 21);
      this._root.addChild(bg);

      const icon = new Sprite(Texture.EMPTY);
      icon.width = 32; icon.height = 32;
      icon.position.set(11, y - 19);
      this._root.addChild(icon);

      const name = new Text({ text: '', style: _nameStyle });
      name.position.set(49, y - 18);
      this._root.addChild(name);

      const level = new Text({ text: '', style: _levelStyle });
      level.position.set(49, y);
      this._root.addChild(level);

      const spLabel = new Text({ text: '', style: _blueLevelStyle });
      spLabel.position.set(49, y);
      spLabel.visible = false;
      this._root.addChild(spLabel);

      // OG: SP Down button at (133, 115+i*40)
      const btn = new Container();
      const btnBg = new Graphics();
      btnBg.rect(0, 0, 16, 14).fill({ color: '#3C1E1E' });
      btnBg.rect(0, 0, 16, 14).stroke({ color: '#A05050', width: 1 });
      const pt = new Text({ text: '-', style: new TextStyle({ fill: '#DC6464', fontSize: 10, fontFamily: 'monospace' }) });
      pt.x = 4; pt.y = 0;
      btn.addChild(btnBg, pt);
      btn.position.set(133, 115 + i * 40);
      btn.visible = false;
      this._root.addChild(btn);

      this._rows.push({ bg, icon, name, level, spLabel, btn });
    }
  }

  setOnSkillDown(cb: (skillId: number) => void): void { this._onSkillDown = cb; }

  open(skills: SkillRow[], x: number, y: number): void {
    this._skills = skills;
    this._scrollOffset = 0;
    this._scrollBar.pos = 0;
    this._scrollBar.setRange(Math.max(0, skills.length - 3));
    this._root.position.set(x, y);
    this.isVisible = true;
  }

  update(_dt: number): void {
    if (!this.isVisible) return;
    for (let i = 0; i < this._rows.length; i++) {
      const abs = this._scrollOffset + i;
      const sk = abs < this._skills.length ? this._skills[abs] : null;
      const row = this._rows[i];
      if (sk) {
         row.name.text = sk.name;
        row.level.text = `${sk.level}`;
        row.level.style = sk.level > 0 ? _levelStyle : _levelStyle;
        row.level.visible = true;
        row.spLabel.visible = false;
        row.btn.visible = sk.level > 0;
        row.bg.texture = this._skill1Tex ?? this._skill0Tex ?? Texture.EMPTY;
        if (sk.icon && this._textureLoader) {
          const ws = this._textureLoader.Load(sk.icon);
          if (ws) row.icon.texture = ws.Texture;
        }
      } else {
        row.name.text = '';
        row.level.text = '';
        row.level.visible = false;
        row.spLabel.visible = false;
        row.btn.visible = false;
        row.bg.texture = this._skill0Tex ?? Texture.EMPTY;
        row.icon.texture = Texture.EMPTY;
      }
    }
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    const lx = x - this._root.x;
    const ly = y - this._root.y;
    if (!down) return true;
    if (lx >= 149 && lx < 167 && ly >= 6 && ly < 22) { this.isVisible = false; return true; }
    for (let i = 0; i < this._rows.length; i++) {
      const btn = this._rows[i].btn;
      if (!btn.visible) continue;
      if (lx >= btn.x && lx < btn.x + 16 && ly >= btn.y && ly < btn.y + 14) {
        const abs = this._scrollOffset + i;
        if (abs < this._skills.length) this._onSkillDown?.(this._skills[abs].id);
        return true;
      }
    }
     return lx >= 0 && lx < 170 && ly >= 0 && ly < 283;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.isVisible = false; return true; }
    return true;
  }
}

// ─── CUISkillChangeConfirm (Step 2) — Job Change Confirmation ──────────────
// OG: Inherits CUIWnd, WZ background from step2/backgrnd
// Shows 2 skill rows (inc at y=79, dec at y=143) + 2 tab icons + OK/Cancel buttons
// OK: UI/UIWindow2.img/Reset/SP/step2/BtOK, Cancel: UI/UIWindow2.img/Reset/SP/step2/BtCancle
// Close at (138, 6)
export class SkillChangeConfirm extends GamePanel {
  private _incRow: { bg: Sprite; icon: Sprite; name: Text; level: Text; spLabel: Text };
  private _decRow: { bg: Sprite; icon: Sprite; name: Text; level: Text; spLabel: Text };
  private _incTab: Sprite;
  private _decTab: Sprite;
  private _btOk: Container;
  private _btCancel: Container;
  private _skill0Tex: Texture | null = null;
  private _skill1Tex: Texture | null = null;
  private _lineTex: Texture | null = null;
  private _textureLoader: WzTextureLoader | null = null;
  private _ui: WzPackage | null = null;
  onConfirm: (() => void) | null = null;
  onCancel: (() => void) | null = null;

  constructor(loader?: WzTextureLoader, ui?: WzPackage | null) {
    super();
    this._textureLoader = loader ?? null;
    this._ui = ui ?? null;

    // OG: CDialog::CreateDlg with step2/backgrnd
    if (loader && ui) {
      const bg = ui.GetItem('UI/UIWindow2.img/Reset/SP/step2/backgrnd');
      if (bg instanceof WzCanvas) {
        const sprite = loader.Load(bg)?.ToPixi();
        if (sprite) this._root.addChild(sprite);
      }
      for (const layer of ['backgrnd2', 'backgrnd3']) {
        const node = ui.GetItem(`UI/UIWindow2.img/Reset/SP/step2/${layer}`);
        if (node instanceof WzCanvas) {
          const sprite = loader.Load(node)?.ToPixi();
          if (sprite) this._root.addChild(sprite);
        }
      }
    }

    if (loader && ui) {
      const s0 = ui.GetItem('UI/UIWindow2.img/Reset/SP/skill0');
      if (s0 instanceof WzCanvas) this._skill0Tex = loader.Load(s0)?.Texture ?? null;
      const s1 = ui.GetItem('UI/UIWindow2.img/Reset/SP/skill1');
      if (s1 instanceof WzCanvas) this._skill1Tex = loader.Load(s1)?.Texture ?? null;
      const ln = ui.GetItem('UI/UIWindow2.img/Reset/SP/line');
      if (ln instanceof WzCanvas) this._lineTex = loader.Load(ln)?.Texture ?? null;
    }

    // OG: Separator line at (9, 116)
    if (this._lineTex) {
      const line = new Sprite(this._lineTex);
      line.position.set(9, 116);
      this._root.addChild(line);
    }

    // Tab icons for inc/dec skills
    this._incTab = new Sprite(Texture.EMPTY);
    this._incTab.position.set(9, 54);
    this._root.addChild(this._incTab);

    this._decTab = new Sprite(Texture.EMPTY);
    this._decTab.position.set(9, 118);
    this._root.addChild(this._decTab);

    // Inc skill row at y=79 (skill1 bg — active)
    const incBg = new Sprite(this._skill1Tex ?? Texture.EMPTY);
    incBg.position.set(9, 79);
    this._root.addChild(incBg);
    const incIcon = new Sprite(Texture.EMPTY);
    incIcon.width = 32; incIcon.height = 32;
    incIcon.position.set(11, 81);
    this._root.addChild(incIcon);
    const incName = new Text({ text: '', style: _nameStyle });
    incName.position.set(49, 82);
    this._root.addChild(incName);
    const incLevel = new Text({ text: '', style: _redLevelStyle });
    incLevel.position.set(49, 100);
    this._root.addChild(incLevel);
    const incSpLabel = new Text({ text: '', style: _spLabelStyle });
    incSpLabel.position.set(49, 100);
    incSpLabel.visible = false;
    this._root.addChild(incSpLabel);
    this._incRow = { bg: incBg, icon: incIcon, name: incName, level: incLevel, spLabel: incSpLabel };

    // Dec skill row at y=143 (skill0 bg — inactive)
    const decBg = new Sprite(this._skill0Tex ?? Texture.EMPTY);
    decBg.position.set(9, 143);
    this._root.addChild(decBg);
    const decIcon = new Sprite(Texture.EMPTY);
    decIcon.width = 32; decIcon.height = 32;
    decIcon.position.set(11, 145);
    this._root.addChild(decIcon);
    const decName = new Text({ text: '', style: _nameStyle });
    decName.position.set(49, 146);
    this._root.addChild(decName);
    const decLevel = new Text({ text: '', style: _blueLevelStyle });
    decLevel.position.set(49, 164);
    this._root.addChild(decLevel);
    const decSpLabel = new Text({ text: '', style: _spBlueLabelStyle });
    decSpLabel.position.set(49, 164);
    decSpLabel.visible = false;
    this._root.addChild(decSpLabel);
    this._decRow = { bg: decBg, icon: decIcon, name: decName, level: decLevel, spLabel: decSpLabel };

    // OG: OK button (BtOK) and Cancel button (BtCancle) from WZ
    this._btOk = new Container();
    if (loader && ui) {
      const node = ui.GetItem('UI/UIWindow2.img/Reset/SP/step2/BtOK/normal');
      if (node instanceof WzCanvas) {
        const sprite = loader.Load(node)?.ToPixi();
        if (sprite) this._btOk.addChild(sprite);
      }
    }
    this._btOk.position.set(37, 181);
    this._root.addChild(this._btOk);

    this._btCancel = new Container();
    if (loader && ui) {
      const node = ui.GetItem('UI/UIWindow2.img/Reset/SP/step2/BtCancle/normal');
      if (node instanceof WzCanvas) {
        const sprite = loader.Load(node)?.ToPixi();
        if (sprite) this._btCancel.addChild(sprite);
      }
    }
    this._btCancel.position.set(87, 181);
    this._root.addChild(this._btCancel);
  }

  // OG: SetOption — receives dec/inc skill IDs
  open(incSkill: SkillRow, decSkill: SkillRow, job: number, x: number, y: number): void {
    const extendSP = isExtendSP(job);
    const tabPath = extendSP ? 'EvanTab' : 'Tab';

    // OG: DrawTab — load tab icon from Reset/SP/{EvanTab|Tab}/enabled/%d
    if (this._ui && this._textureLoader) {
      const incJob = Math.floor(incSkill.id / 10000);
      const decJob = Math.floor(decSkill.id / 10000);
      const incTabIdx = extendSP ? (getJobLevel(incJob) - 1) : (getJobLevel(incJob) - 1);
      const decTabIdx = extendSP ? (getJobLevel(decJob) - 1) : (getJobLevel(decJob) - 1);
      const incTabNode = this._ui.GetItem(`UI/UIWindow2.img/Reset/SP/${tabPath}/enabled/${incTabIdx}`);
      if (incTabNode instanceof WzCanvas) {
        const ws = this._textureLoader.Load(incTabNode);
        if (ws) this._incTab.texture = ws.Texture;
      }
      const decTabNode = this._ui.GetItem(`UI/UIWindow2.img/Reset/SP/${tabPath}/enabled/${decTabIdx}`);
      if (decTabNode instanceof WzCanvas) {
        const ws = this._textureLoader.Load(decTabNode);
        if (ws) this._decTab.texture = ws.Texture;
      }
    }

    // Inc row
    this._incRow.name.text = incSkill.name;
    this._incRow.level.text = `${incSkill.level + 1}`;
    this._incRow.level.style = _redLevelStyle;
    this._incRow.spLabel.text = `SP +1`;
    this._incRow.spLabel.visible = true;
    if (incSkill.icon && this._textureLoader) {
      const ws = this._textureLoader.Load(incSkill.icon);
      if (ws) this._incRow.icon.texture = ws.Texture;
    }

    // Dec row
    this._decRow.name.text = decSkill.name;
    this._decRow.level.text = `${decSkill.level - 1}`;
    this._decRow.level.style = _blueLevelStyle;
    this._decRow.spLabel.text = `SP -1`;
    this._decRow.spLabel.visible = true;
    if (decSkill.icon && this._textureLoader) {
      const ws = this._textureLoader.Load(decSkill.icon);
      if (ws) this._decRow.icon.texture = ws.Texture;
    }

    this._root.position.set(x, y);
    this.isVisible = true;
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    const lx = x - this._root.x;
    const ly = y - this._root.y;
    if (!down) return true;
    if (lx >= 138 && lx < 156 && ly >= 6 && ly < 22) { this.isVisible = false; return true; }
    if (lx >= this._btOk.x && lx < this._btOk.x + 60 && ly >= this._btOk.y && ly < this._btOk.y + 22) {
      this.isVisible = false; this.onConfirm?.(); return true;
    }
    if (lx >= this._btCancel.x && lx < this._btCancel.x + 60 && ly >= this._btCancel.y && ly < this._btCancel.y + 22) {
      this.isVisible = false; this.onCancel?.(); return true;
    }
    return lx >= 0 && lx < 158 && ly >= 0 && ly < 212;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.isVisible = false; this.onCancel?.(); return true; }
    if (key === 'Enter') { this.isVisible = false; this.onConfirm?.(); return true; }
    return true;
  }
}

// OG: get_job_level — maps job to degree (1-4)
function getJobLevel(job: number): number {
  if (job % 1000 === 0 || job === 2001) return 1;
  const v1 = Math.floor(job / 10) === 43 ? (job - 430) / 2 : job % 10;
  const v2 = v1 + 2;
  if (v2 >= 2 && (v2 <= 4 || (v2 <= 10 && (Math.floor(job / 100) === 22 || job === 2001)))) return v2;
  return 0;
}
