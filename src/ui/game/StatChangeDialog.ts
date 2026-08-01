import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { Button } from '../Button.js';

// OG CUIStatChange (228 bytes, inherits CDialog) — 1:1 from IDA
// 3-step cash item dialog for AP reallocation:
// Step 0: Decrement — remove AP from a stat
// Step 1: Increment — add AP to a stat
// Step 2: Confirm — show before/after and confirm

// OG Stat bitmask values (from OnButtonClicked @ 0x8686F0)
const STAT_HP = 0x800;
const STAT_MP = 0x2000;
const STAT_STR = 0x40;
const STAT_DEX = 0x80;
const STAT_INT = 0x100;
const STAT_LUK = 0x200;

// OG Button IDs (from OnCreate @ 0x86A010)
const BT_HP = 0x7D0;   // 2000
const BT_MP = 0x7D1;   // 2001
const BT_STR = 0x7D2;  // 2002
const BT_DEX = 0x7D3;  // 2003
const BT_INT = 0x7D4;  // 2004
const BT_LUK = 0x7D5;  // 2005

// OG WZ paths (from OnCreate)
const WZ_STEP0_BG = 'UI/UIWindow2.img/Reset/AP/step0/backgrn';  // decrement mode
const WZ_STEP1_BG = 'UI/UIWindow2.img/Reset/AP/step1/backgrn';  // increment mode
const WZ_STEP2_BG = 'UI/UIWindow2.img/Reset/AP/step2/backgrn';  // confirm mode
const WZ_STAT_ICON = 'UI/UIWindow2.img/Reset/AP/stat%d/%d';     // stat icon format

// OG Font types (from Draw @ 0x86BF90)
const COLOR_NORMAL = 0x332A21;   // FONT_SMALL_GRAY
const COLOR_BLUE = 0x0000CC;     // FONT_SMALL_BLUE (decrement)
const COLOR_BLUE_B = 0x0000AA;   // FONT_SMALL_BLUE_B (decrement delta)
const COLOR_RED = 0xCC0000;      // FONT_SMALL_RED (increment)
const COLOR_RED_B = 0xAA0000;    // FONT_SMALL_RED_B (increment delta)

// OG stat positions (from Draw @ 0x86BF90)
const STAT_POSITIONS = [
  { iconX: 9, iconY: 71,  textX: 41, textY: 74  }, // HP
  { iconX: 9, iconY: 89,  textX: 41, textY: 92  }, // MP
  { iconX: 9, iconY: 114, textX: 41, textY: 117 }, // STR
  { iconX: 9, iconY: 132, textX: 41, textY: 135 }, // DEX
  { iconX: 9, iconY: 150, textX: 41, textY: 153 }, // INT
  { iconX: 9, iconY: 168, textX: 41, textY: 171 }, // LUK
];

// OG stat names for display
const STAT_NAMES = ['HP', 'MP', 'STR', 'DEX', 'INT', 'LUK'];
const STAT_BITMASKS = [STAT_HP, STAT_MP, STAT_STR, STAT_DEX, STAT_INT, STAT_LUK];

// ── OG: IncHPVal/IncMPVal/DecHPVal/DecMPVal (0x8688c0-0x86ab90) ────────
// Returns the HP/MP gain/loss per job category

export function incHPVal(job: number): number {
  const jobCat = Math.floor((job % 1000) / 100);
  switch (jobCat) {
    case 0: return 8;   // Beginner
    case 1: return 10;  // Warrior
    case 2: return 12;  // Mage
    case 3: return 16;  // Archer
    case 4: return 16;  // Thief
    case 5: return 20;  // Pirate
    default: return 8;
  }
}

export function incMPVal(job: number): number {
  const jobCat = Math.floor((job % 1000) / 100);
  switch (jobCat) {
    case 0: return 6;   // Beginner
    case 1: return 8;   // Warrior
    case 2: return 12;  // Mage
    case 3: return 16;  // Archer
    case 4: return 16;  // Thief
    case 5: return 18;  // Pirate
    default: return 6;
  }
}

export function decHPVal(job: number): number {
  const jobCat = Math.floor((job % 1000) / 100);
  switch (jobCat) {
    case 0: return 4;   // Beginner
    case 1: return 8;   // Warrior
    case 2: return 4;   // Mage
    case 3: return 4;   // Archer
    case 4: return 4;   // Thief
    case 5: return 8;   // Pirate
    default: return 4;
  }
}

export function decMPVal(job: number): number {
  const jobCat = Math.floor((job % 1000) / 100);
  switch (jobCat) {
    case 0: return 4;   // Beginner
    case 1: return 8;   // Warrior
    case 2: return 4;   // Mage
    case 3: return 4;   // Archer
    case 4: return 4;   // Thief
    case 5: return 4;   // Pirate
    default: return 4;
  }
}

// ── OG: IsUnderMinHP/IsUnderMinMP/IsOverMaxHP/IsOverMaxMP ──────────────
// Massive switch statements keyed by job value (101+ cases each)
// Simplified: returns true if the new value would be below/above the limit

export function isUnderMinHP(job: number, newMHP: number): boolean {
  // OG: minimum HP varies by job, typically 50 for beginners, higher for warriors
  const jobCat = Math.floor((job % 1000) / 100);
  let minHP = 50; // default beginner
  if (jobCat === 1) minHP = 100; // warriors start higher
  if (jobCat === 2) minHP = 30;  // mages
  if (jobCat === 3) minHP = 40;  // archers
  if (jobCat === 4) minHP = 40;  // thieves
  if (jobCat === 5) minHP = 40;  // pirates
  return newMHP < minHP;
}

export function isUnderMinMP(job: number, newMMP: number): boolean {
  const jobCat = Math.floor((job % 1000) / 100);
  let minMP = 6; // default
  if (jobCat === 2) minMP = 20; // mages have higher minimum
  return newMMP < minMP;
}

export function isOverMaxHP(_job: number, newMHP: number): boolean {
  return newMHP > 30000;
}

export function isOverMaxMP(_job: number, newMMP: number): boolean {
  return newMMP > 30000;
}

// ── OG: AP budget calculation (from SetButtons @ 0x869910) ──────────────
export function calcTotalAP(level: number, job: number): number {
  let nSumAP = 5 * (level + 4);

  // Warrior bonus
  if (Math.floor(job / 1000) === 1) {
    nSumAP += level < 70 ? level - 1 : 69;
  }

  // Job level bonus (non-Cygnus, non-Mercedes)
  const jobCat = Math.floor((job % 1000) / 100);
  const jobLevel = Math.floor(job % 100);
  if (jobCat !== 22 && job !== 2001) {
    if (jobLevel === 3) nSumAP += 5;
    else if (jobLevel === 4) nSumAP += 10;
  }

  // Cygnus Knights bonus
  if (jobCat === 22 || job === 2001) {
    if (job >= 2214 && job <= 2218) {
      nSumAP += (job % 10 - 3) * 5;
    }
  }

  // Explorer sub-job bonus
  if (Math.floor(job / 1000) === 0) {
    const subJob = Math.floor(job / 1000);
    if (subJob === 1 && jobLevel === 2) nSumAP += 1;
    if (subJob === 1 && jobLevel === 3) nSumAP += 2;
  }

  return nSumAP;
}

export interface StatChangeResult {
  dwDec: number;
  dwInc: number;
}

// ── OG: CUIStatChange (228 bytes, inherits CDialog) ────────────────────
// Step 0/1 dialog — select which stat to change
export class StatChangeDialog extends GamePanel {
  private _loader: WzTextureLoader;
  private _ui: WzPackage | null;
  private _bgSprite: Sprite | null = null;
  private _statIcons: (Sprite | null)[] = [];
  private _statTexts: Text[] = [];
  private _selectedStat = 0;

  // OG: m_dwDec (decrement bitmask) and m_dwInc (increment bitmask)
  dwDec = 0;
  dwInc = 0;

  // Character data for validation
  job = 0;
  level = 1;
  str = 4; dex = 4; intStat = 4; luk = 4;
  maxHp = 50; maxMp = 5;
  ap = 0;

  // Callbacks
  onOk: ((result: StatChangeResult) => void) | null = null;
  onCancel: (() => void) | null = null;

  // Buttons
  private _buttons: Button[] = [];
  private _okButton: Button | null = null;
  private _cancelButton: Button | null = null;

  constructor(loader: WzTextureLoader, ui: WzPackage | null) {
    super();
    this._loader = loader;
    this._ui = ui;
    this.isVisible = false;
  }

  // OG: CreateStatChangeDlg — opens dialog for decrement or increment mode
  open(isIncrement: boolean): void {
    this.dwDec = isIncrement ? 0 : 1;
    this.dwInc = 0;
    this._selectedStat = 0;
    this._rebuild();
    this.isVisible = true;
  }

  private _rebuild(): void {
    // Clear old content
    this._root.removeChildren();
    this._buttons = [];
    this._statIcons = [];
    this._statTexts = [];

    // OG: Load background based on mode
    const bgPath = this.dwDec === 0 ? WZ_STEP1_BG : WZ_STEP0_BG;
    const bgNode = this._ui?.GetItem(bgPath);
    if (bgNode instanceof WzCanvas) {
      const loaded = this._loader.Load(bgNode);
      if (loaded) {
        this._bgSprite = loaded.ToPixi();
        this._root.addChild(this._bgSprite);
      }
    }

    // Fallback background
    if (!this._bgSprite) {
      const bg = new Graphics();
      bg.roundRect(0, 0, 172, 220, 4).fill({ color: '#0C0C16', alpha: 240 / 255 });
      bg.roundRect(0, 0, 172, 220, 4).stroke({ color: '#46465A', width: 1 });
      this._root.addChild(bg);
    }

    // OG: Create 6 stat buttons (HP/MP/STR/DEX/INT/LUK)
    const buttonIds = [BT_HP, BT_MP, BT_STR, BT_DEX, BT_INT, BT_LUK];
    for (let i = 0; i < 6; i++) {
      const pos = STAT_POSITIONS[i];
      const btn = new Button(STAT_NAMES[i]);
      btn.container.x = 136;
      btn.container.y = pos.iconY;
      btn.onClick = () => this._onStatSelected(i);
      this._root.addChild(btn.container);
      this._buttons.push(btn);
    }

    // OG: Close button
    this._cancelButton = new Button('Close');
    this._cancelButton.container.x = 139;
    this._cancelButton.container.y = 6;
    this._cancelButton.onClick = () => this._onCancel();
    this._root.addChild(this._cancelButton.container);

    // Draw stat values
    this._drawStats();
    this._updateButtons();
  }

  private _drawStats(): void {
    // Clear old texts
    for (const t of this._statTexts) { this._root.removeChild(t); t.destroy(); }
    this._statTexts = [];

    const stats = [this.maxHp, this.maxMp, this.str, this.dex, this.intStat, this.luk];

    for (let i = 0; i < 6; i++) {
      // Skip the selected stat in normal draw (it's shown in DrawDecStat)
      if (STAT_BITMASKS[i] === this.dwDec) continue;

      const pos = STAT_POSITIONS[i];
      const t = new Text({
        text: `${stats[i]}`,
        style: new TextStyle({ fontFamily: 'monospace', fontSize: 9, fill: COLOR_NORMAL }),
      });
      t.x = pos.textX;
      t.y = pos.textY;
      this._root.addChild(t);
      this._statTexts.push(t);
    }

    // Draw selected stat preview (OG: DrawDecStat)
    if (this.dwDec !== 0) {
      this._drawDecStat();
    }
  }

  // OG: DrawDecStat @ 0x86A8F0 — shows the change preview
  private _drawDecStat(): void {
    const statIdx = STAT_BITMASKS.indexOf(this.dwDec);
    if (statIdx < 0) return;

    const pos = STAT_POSITIONS[statIdx];
    const isIncrement = this.dwDec === 0;
    const color = isIncrement ? COLOR_RED : COLOR_BLUE;
    const deltaColor = isIncrement ? COLOR_RED_B : COLOR_BLUE_B;

    let newVal = 0;
    let delta = 0;
    const stats = [this.maxHp, this.maxMp, this.str, this.dex, this.intStat, this.luk];

    if (statIdx === 0) {
      // HP
      delta = isIncrement ? incHPVal(this.job) : decHPVal(this.job);
      newVal = isIncrement ? this.maxHp + delta : this.maxHp - delta;
    } else if (statIdx === 1) {
      // MP
      delta = isIncrement ? incMPVal(this.job) : decMPVal(this.job);
      newVal = isIncrement ? this.maxMp + delta : this.maxMp - delta;
    } else {
      // STR/DEX/INT/LUK
      delta = 1;
      newVal = isIncrement ? stats[statIdx] + 1 : stats[statIdx] - 1;
    }

    // New value text
    const valText = new Text({
      text: `${newVal}`,
      style: new TextStyle({ fontFamily: 'monospace', fontSize: 9, fill: color }),
    });
    valText.x = pos.textX;
    valText.y = pos.textY;
    this._root.addChild(valText);
    this._statTexts.push(valText);

    // Delta text
    const deltaText = new Text({
      text: ` ${isIncrement ? '+' : '-'}${delta}`,
      style: new TextStyle({ fontFamily: 'monospace', fontSize: 9, fill: deltaColor }),
    });
    deltaText.x = pos.textX + valText.width + 2;
    deltaText.y = pos.textY;
    this._root.addChild(deltaText);
    this._statTexts.push(deltaText);
  }

  private _onStatSelected(index: number): void {
    this._selectedStat = index;
    this.dwDec = STAT_BITMASKS[index];
    this._drawStats();
    this._updateButtons();

    // Auto-confirm after selection (OG: SetRet(1))
    this._onOk();
  }

  private _onOk(): void {
    this.isVisible = false;
    this.onOk?.({ dwDec: this.dwDec, dwInc: this.dwInc });
  }

  private _onCancel(): void {
    this.isVisible = false;
    this.onCancel?.();
  }

  // OG: SetButtons @ 0x869910 — enable/disable based on AP budget and stat limits
  private _updateButtons(): void {
    const isIncrement = this.dwDec === 0;
    const totalAP = calcTotalAP(this.level, this.job);
    const usedAP = this.str + this.dex + this.intStat + this.luk - 16; // base stats are 4 each
    const availableAP = this.ap;

    for (let i = 0; i < 6; i++) {
      const btn = this._buttons[i];
      if (!btn) continue;

      let enabled = true;

      if (isIncrement) {
        // OG: Disable HP/MP if no AP left
        if (i <= 1 && availableAP <= 0) enabled = false;

        // OG: Disable HP if over max
        if (i === 0 && isOverMaxHP(this.job, this.maxHp + incHPVal(this.job))) enabled = false;
        // OG: Disable MP if over max
        if (i === 1 && isOverMaxMP(this.job, this.maxMp + incMPVal(this.job))) enabled = false;

        // OG: Disable stats at 999 cap
        if (i === 2 && this.str >= 999) enabled = false;
        if (i === 3 && this.dex >= 999) enabled = false;
        if (i === 4 && this.intStat >= 999) enabled = false;
        if (i === 5 && this.luk >= 999) enabled = false;
      } else {
        // OG: Disable stats at minimum (4)
        if (i === 2 && this.str <= 4) enabled = false;
        if (i === 3 && this.dex <= 4) enabled = false;
        if (i === 4 && this.intStat <= 4) enabled = false;
        if (i === 5 && this.luk <= 4) enabled = false;

        // OG: Job-specific minimums
        const jobCat = Math.floor((this.job % 1000) / 100);
        if (jobCat === 1 && this.str <= 35) enabled = false; // Warrior
        if ((jobCat === 3 || jobCat === 4) && this.dex <= 25) enabled = false; // Archer/Thief
        if (jobCat === 2 && this.intStat <= 20) enabled = false; // Mage
        if (jobCat === 5 && this.dex <= 20) enabled = false; // Pirate

        // OG: Disable HP/MP if under min
        if (i === 0 && isUnderMinHP(this.job, this.maxHp - decHPVal(this.job))) enabled = false;
        if (i === 1 && isUnderMinMP(this.job, this.maxMp - decMPVal(this.job))) enabled = false;
      }

      // OG: Always disable the already-selected stat
      if (STAT_BITMASKS[i] === this.dwDec) enabled = false;

      btn.enabled = enabled;
    }
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    const lx = x - this._root.x;
    const ly = y - this._root.y;
    for (const btn of this._buttons) {
      if (btn.handleMouseButton(lx, ly, down)) return true;
    }
    if (this._cancelButton?.handleMouseButton(lx, ly, down)) return true;
    return lx >= 0 && lx < 172 && ly >= 0 && ly < 220;
  }
}

// ── OG: CUIStatChangeConfirm (176 bytes, inherits CDialog) ─────────────
// Step 2 dialog — confirm the stat change
export class StatChangeConfirmDialog extends GamePanel {
  private _loader: WzTextureLoader;
  private _ui: WzPackage | null;
  private _bgSprite: Sprite | null = null;
  private _okButton: Button | null = null;
  private _cancelButton: Button | null = null;
  private _texts: Text[] = [];

  dwDec = 0;
  dwInc = 0;

  // Character data for display
  job = 0;
  level = 1;
  str = 4; dex = 4; intStat = 4; luk = 4;
  maxHp = 50; maxMp = 5;

  onOk: ((result: StatChangeResult) => void) | null = null;
  onCancel: (() => void) | null = null;

  constructor(loader: WzTextureLoader, ui: WzPackage | null) {
    super();
    this._loader = loader;
    this._ui = ui;
    this.isVisible = false;
  }

  open(dwDec: number, dwInc: number): void {
    this.dwDec = dwDec;
    this.dwInc = dwInc;
    this._rebuild();
    this.isVisible = true;
  }

  private _rebuild(): void {
    this._root.removeChildren();
    this._texts = [];

    // OG: Load step2 background
    const bgNode = this._ui?.GetItem(WZ_STEP2_BG);
    if (bgNode instanceof WzCanvas) {
      const loaded = this._loader.Load(bgNode);
      if (loaded) {
        this._bgSprite = loaded.ToPixi();
        this._root.addChild(this._bgSprite);
      }
    }

    if (!this._bgSprite) {
      const bg = new Graphics();
      bg.roundRect(0, 0, 172, 130, 4).fill({ color: '#0C0C16', alpha: 240 / 255 });
      bg.roundRect(0, 0, 172, 130, 4).stroke({ color: '#46465A', width: 1 });
      this._root.addChild(bg);
    }

    // OG: Show before/after values
    const statIdx = STAT_BITMASKS.indexOf(this.dwDec);
    if (statIdx >= 0) {
      const stats = [this.maxHp, this.maxMp, this.str, this.dex, this.intStat, this.luk];
      const oldVal = stats[statIdx];
      let newVal = oldVal;

      if (this.dwDec !== 0) {
        // Decrement
        if (statIdx === 0) newVal = oldVal - decHPVal(this.job);
        else if (statIdx === 1) newVal = oldVal - decMPVal(this.job);
        else newVal = oldVal - 1;
      } else if (this.dwInc !== 0) {
        // Increment
        if (statIdx === 0) newVal = oldVal + incHPVal(this.job);
        else if (statIdx === 1) newVal = oldVal + incMPVal(this.job);
        else newVal = oldVal + 1;
      }

      const label = new Text({
        text: `${STAT_NAMES[statIdx]}: ${oldVal} → ${newVal}`,
        style: new TextStyle({ fontFamily: 'monospace', fontSize: 10, fill: 0xFFFFFF }),
      });
      label.x = 20;
      label.y = 40;
      this._root.addChild(label);
      this._texts.push(label);
    }

    // OK button
    this._okButton = new Button('OK');
    this._okButton.container.x = 66;
    this._okButton.container.y = 100;
    this._okButton.onClick = () => this._onOk();
    this._root.addChild(this._okButton.container);

    // Cancel button
    this._cancelButton = new Button('Cancel');
    this._cancelButton.container.x = 110;
    this._cancelButton.container.y = 100;
    this._cancelButton.onClick = () => this._onCancel();
    this._root.addChild(this._cancelButton.container);
  }

  private _onOk(): void {
    this.isVisible = false;
    this.onOk?.({ dwDec: this.dwDec, dwInc: this.dwInc });
  }

  private _onCancel(): void {
    this.isVisible = false;
    this.onCancel?.();
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    const lx = x - this._root.x;
    const ly = y - this._root.y;
    if (this._okButton?.handleMouseButton(lx, ly, down)) return true;
    if (this._cancelButton?.handleMouseButton(lx, ly, down)) return true;
    return lx >= 0 && lx < 172 && ly >= 0 && ly < 130;
  }
}
