import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { Button } from '../Button.js';
import { Checkbox } from '../Checkbox.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { BuiltInFont } from '../BuiltInFont.js';
import type { BattleRecordDotDamageArgs } from '../../net/handlers/BattleRecordHandlers.js';

// CUIBattleRecord (decompile/773370.c OnCreate/773CF0.c, OnButtonClicked/773860.c,
// Update/7730E0.c, Toggle/773170.c). Window sizes, control ids/positions, and
// the timer state machine are verified against those functions. Exact
// String.wz button/checkbox label text and the 3 fields that exist on the
// class but were never found being created in OnCreate (m_pBtSave,
// m_pBtRecentSaveView, m_pBtRecentSaveSel — likely lazily created on a
// "recent saves" tab not reached by this trace) are NOT implemented; labels
// below are descriptive placeholders, not the real localized text.
const PanelW_Normal = 200;
const PanelW_Extended = 450;
const PanelH = 250;
const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 11, fontFamily: 'monospace' });
const _statStyle = new TextStyle({ fill: '#FFF', fontSize: 10, fontFamily: 'monospace' });
const _labelStyle = new TextStyle({ fill: '#AAA', fontSize: 9, fontFamily: 'monospace' });

const TabCount = 4;
const TabNames = ['All', 'Monster', 'Player', 'Skill'];

// OG: CBattleRecordMan::DamageInfo (decompile 0x470200-0x4703c0) — the real
// combat-stats calculation engine, a separate class from CUIBattleRecord
// (the window shell already built above). TODO_AUDIT.md Sixty-seventh
// pass's `CBattleRecordMan` finding: this client previously only tracked a
// raw DoT-damage sum, with no average-per-hit, no smoothed DPS, no crit
// count, and nothing at all for regular (non-DoT) attack damage.
interface DamageInfo {
  minDamage: number; maxDamage: number;
  critMinDamage: number; critMaxDamage: number;
  missNum: number; criticalNum: number;
  totalDamage: number; totalAttackNum: number; totalAttrRate: number;
  averageDamagePerHit: number; averageAttrRate: number; averageDamagePerSec: number;
  tBeforeAttackTime: number; dTotalAttackTime: number; dAverageHitPerSec: number;
}

function makeDamageInfo(): DamageInfo {
  return {
    minDamage: 0, maxDamage: 0, critMinDamage: 0, critMaxDamage: 0,
    missNum: 0, criticalNum: 0,
    totalDamage: 0, totalAttackNum: 0, totalAttrRate: 0,
    averageDamagePerHit: 0, averageAttrRate: 0, averageDamagePerSec: 0,
    tBeforeAttackTime: 0, dTotalAttackTime: 0, dAverageHitPerSec: 0,
  };
}

export class BattleRecord extends GamePanel {
  private _background: WzSprite | null;
  private _font: BuiltInFont | null;
  private _option = 0; // m_nOption — currently selected tab
  private _extended = false; // m_bExtended — fold/unfold state
  private _damageLog: { damage: number; count: number; attrRate: number | null }[] = [];
  private _info: DamageInfo = makeDamageInfo();
  private _serverOnCalc = false;
  private _damageText: Text | null = null;
  private _calcText: Text | null = null;
  private _timerText: Text | null = null;
  private _bg: Graphics;

  // CUIBattleRecord timer state (decompile/7730E0.c Update, 773170.c Toggle).
  private _tSetTime = 0; // absolute ms timestamp when recording auto-stops; 0 = no active timer
  private _tStopRemainTime = 0; // ms remaining when paused; 0 = not paused
  private _tNextUpdate = 0; // throttles redraw to once/second while a timer is running

  private _tabButtons: Button[] = [];
  private _btTabClear!: Button;
  private _btAllClear!: Button;
  private _btTimerSet!: Button;
  private _btFold!: Button;
  private _btOnOff!: Button;
  private _btTimerStop!: Button;
  private _cbIncludeDot!: Checkbox;
  private _cbIncludeSummon!: Checkbox;
  private _allControls: Array<{ handleMouseButton(x: number, y: number, down: boolean): boolean }> = [];

  constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null) {
    super();
    this._font = font;
    this.isVisible = false;
    this.container.position.set(230, 100);

    const br = ui?.GetItem('UIWindow2.img/BattleRecord');
    const brProp = br instanceof WzProperty ? br : null;
    this._background = brProp?.Get('backgrnd') instanceof WzCanvas ? loader.Load(brProp!.Get('backgrnd') as WzCanvas) : null;

    this._bg = new Graphics();
    this.container.addChildAt(this._bg, 0);

    const title = new Text({ text: 'Battle Record', style: _titleStyle });
    title.x = 8; title.y = 5;
    this.container.addChild(title);

    // CCtrlTab at (7, 3), 4 items (decompile/773CF0.c: `for (i=0;i<4;++i)`).
    for (let i = 0; i < TabCount; i++) {
      const b = new Button(TabNames[i]);
      b.width = 28; b.height = 28;
      b.position = { x: 7, y: 3 + i * 30 };
      b.onClick = () => this._selectTab(i);
      this._tabButtons.push(b);
      this.container.addChild(b.container);
      this._allControls.push(b);
    }

    this._damageText = new Text({ text: '', style: _statStyle });
    this._damageText.x = 40; this._damageText.y = 28;
    this.container.addChild(this._damageText);

    this._calcText = new Text({ text: '', style: _labelStyle });
    this._calcText.x = 40; this._calcText.y = PanelH - 44;
    this.container.addChild(this._calcText);

    this._timerText = new Text({ text: '', style: _labelStyle });
    this._timerText.x = 40; this._timerText.y = PanelH - 32;
    this.container.addChild(this._timerText);

    // Button ids/positions from decompile/773CF0.c CreateCtrl_2 calls.
    this._btTabClear = this._makeButton('Clear tab', 10, 233, () => this._onTabClear());
    this._btAllClear = this._makeButton('Clear all', 30, 233, () => this._onAllClear());
    this._btTimerSet = this._makeButton('Set timer', 170, 210, () => this._onTimerSet());
    this._btFold = this._makeButton(this._extended ? 'Fold' : 'Unfold', 155, 6, () => this._onFold());
    this._btOnOff = this._makeButton('On/Off', 140, 6, () => this._onOnOff());
    this._btTimerStop = this._makeButton('Stop', 155, 210, () => this._onTimerStop());
    this._btTimerStop.enabled = false; // decompile/773CF0.c: SetEnable(..., 0) on create

    // Checkboxes at (10,40)/(10,55), default checked, only shown for tab 2
    // (decompile/773CF0.c: SetShow gated on m_nOption == 2).
    this._cbIncludeDot = new Checkbox();
    this._cbIncludeDot.setPosition(10, 40);
    this._cbIncludeDot.isChecked = true;
    this._allControls.push(this._cbIncludeDot);
    this._cbIncludeSummon = new Checkbox();
    this._cbIncludeSummon.setPosition(10, 55);
    this._cbIncludeSummon.isChecked = true;
    this._allControls.push(this._cbIncludeSummon);

    this._updateCheckboxVisibility();
    this._redrawBg();
  }

  private _makeButton(label: string, x: number, y: number, onClick: () => void): Button {
    const b = new Button(label);
    b.width = 60; b.height = 18;
    b.position = { x, y };
    b.onClick = onClick;
    this.container.addChild(b.container);
    this._allControls.push(b);
    return b;
  }

  private _redrawBg(): void {
    const w = this._extended ? PanelW_Extended : PanelW_Normal;
    this._bg.clear();
    this._bg.roundRect(0, 0, w, PanelH, 4).fill({ color: 0x1a1a2e, alpha: 0.9 });
    this._bg.setStrokeStyle({ width: 1, color: 0x886644 });
    this._bg.roundRect(0, 0, w, PanelH, 4).stroke();
  }

  private get _panelW(): number { return this._extended ? PanelW_Extended : PanelW_Normal; }

  private _updateCheckboxVisibility(): void {
    const show = this._option === 2;
    this._cbIncludeDot.container.visible = show;
    this._cbIncludeSummon.container.visible = show;
  }

  private _selectTab(i: number): void {
    // decompile/773CF0.c: CCtrlTab::SetTab(this->m_pTab.p, this->m_nOption);
    this._option = i;
    this._updateCheckboxVisibility();
  }

  // Browser-only confirm/prompt globals, guarded for the Node target (this
  // client also runs headless via tsx per README) and for vitest's default
  // node environment, which has no `window` at all.
  private _confirm(message: string): boolean {
    return typeof window !== 'undefined' ? window.confirm(message) : true;
  }

  private _prompt(message: string, fallback: string): string | null {
    return typeof window !== 'undefined' ? window.prompt(message, fallback) : null;
  }

  // decompile/773860.c case 0x7D1 (2001). Real OG confirms via a YesNo
  // dialog (StringPool 0x1900) before clearing — simplified to a confirm
  // prompt since this codebase has no generic modal confirm-dialog widget yet.
  private _onTabClear(): void {
    if (!this._confirm('Clear battle record for this tab?')) return;
    this._clearInfo(this._option);
    this._resetTimerButtons();
  }

  // decompile/773860.c case 0x7D2 (2002). ClearInfo(3) = clear-all option.
  private _onAllClear(): void {
    if (!this._confirm('Clear all battle records?')) return;
    this._clearInfo(3);
    this._resetTimerButtons();
  }

  private _clearInfo(_option: number): void {
    this._damageLog = [];
    this._info = makeDamageInfo();
    this._refreshDamageText();
  }

  // OG: CBattleRecordMan::SetBattleDamageInfo (decompile 0x470890) — the
  // regular (non-DoT) per-hit update sequence. `isCritical` is always
  // false at this client's only two call sites (GameStage.ts's melee/
  // ranged damage-number spawns) since this client doesn't track a
  // critical-hit flag on its own outgoing damage anywhere — documented
  // simplification, not guessed.
  AddDamage(damage: number, isCritical: boolean, isSummon: boolean): void {
    if (!this._serverOnCalc) return;
    const info = this._info;
    // OG: ChoiceMaxOrMinDamage/ChoiceCriMaxOrMinDamage (decompile
    // 0x470240/0x470270) — both no-op entirely on a miss (damage === 0),
    // and min starts at 0 (falsy) so the first nonzero hit always sets it.
    if (damage !== 0) {
      if (info.maxDamage < damage) info.maxDamage = damage;
      if (info.minDamage > damage || !info.minDamage) info.minDamage = damage;
    }
    if (isCritical) {
      info.criticalNum++;
      if (damage !== 0) {
        if (info.critMaxDamage < damage) info.critMaxDamage = damage;
        if (info.critMinDamage > damage || !info.critMinDamage) info.critMinDamage = damage;
      }
    }
    if (damage === 0) info.missNum++;
    info.totalAttackNum++;
    info.totalDamage += damage;
    if (info.totalAttackNum > 0) info.averageDamagePerHit = Math.floor(info.totalDamage / info.totalAttackNum);
    this._calcAverageDamagePerSec(damage, false, isSummon);
    this._refreshDamageText();
  }

  // OG: CBattleRecordMan::DamageInfo::CalcAverageDamagePerSec (decompile
  // 0x4702e0) — a time-decaying smoothed DPS estimator, not
  // totalDamage/wallClockElapsed. Resets the timing window if the gap
  // since the last hit exceeds ~6.5s (~7s for DoT/summon hits), else
  // accumulates `1/averageHitPerSec` into a running "total attack time"
  // denominator and divides total damage by that.
  private _calcAverageDamagePerSec(damage: number, isDot: boolean, isSummon: boolean): void {
    const info = this._info;
    const now = Date.now();
    if (!info.tBeforeAttackTime) {
      info.tBeforeAttackTime = now;
      info.dAverageHitPerSec = 1.0;
      info.dTotalAttackTime = 1.0;
      info.averageDamagePerSec = damage;
      return;
    }
    const gapMs = now - info.tBeforeAttackTime;
    let addSeconds: number | null = null;
    if (gapMs < 6500) addSeconds = gapMs / 1000;
    else if (isDot && gapMs < 7000) addSeconds = gapMs / 1000;
    else if (isSummon && gapMs < 7000) addSeconds = gapMs / 1000;
    else if (info.dAverageHitPerSec !== 0) addSeconds = 1.0 / info.dAverageHitPerSec;
    if (addSeconds !== null) info.dTotalAttackTime += addSeconds;
    if (info.dAverageHitPerSec !== 0) {
      info.averageDamagePerSec = Math.floor(info.totalDamage / info.dTotalAttackTime);
      info.tBeforeAttackTime = now;
      info.dAverageHitPerSec = info.totalAttackNum / info.dTotalAttackTime;
    }
  }

  private _resetTimerButtons(): void {
    this._tSetTime = 0;
    this._tStopRemainTime = 0;
    this._btTimerSet.enabled = true;
    this._btTimerStop.enabled = false;
  }

  // decompile/773860.c case 0x7D3 (2003): opens CInputDlg for a duration in
  // seconds. No modal input-dialog widget exists yet, so this uses a prompt
  // as a pragmatic stand-in for CUIBattleRecord::CInputDlg. In the headless
  // Node target (no window), this is a no-op — there's no sensible default
  // duration to fall back to.
  private _onTimerSet(): void {
    const raw = this._prompt('Record for how many seconds?', '60');
    if (raw === null) return;
    const seconds = Number.parseInt(raw, 10);
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    if (!this._confirm(`Recording will stop in ${seconds} seconds. Clear existing records first?`)) return;
    this._clearInfo(3);
    this._tSetTime = Date.now() + seconds * 1000;
    this._btTimerSet.enabled = false;
    this._btTimerStop.enabled = true;
  }

  // decompile/773860.c case 0x7D6 (2006) -> Toggle() (decompile/773170.c).
  private _onFold(): void {
    this._extended = !this._extended;
    this._btFold.label = this._extended ? 'Fold' : 'Unfold';
    this._updateCheckboxVisibility();
    this._redrawBg();
  }

  // decompile/773860.c case 0x7D7 (2007).
  private _onOnOff(): void {
    this._serverOnCalc = !this._serverOnCalc;
    this._refreshCalcText();
  }

  // decompile/773860.c case 0x7D8 (2008): pause/resume the active timer.
  private _onTimerStop(): void {
    const now = Date.now();
    if (this._tStopRemainTime) {
      this._tSetTime = now + this._tStopRemainTime;
      this._tStopRemainTime = 0;
      this._btOnOff.enabled = true;
    } else {
      this._tStopRemainTime = this._tSetTime - now;
      this._tSetTime = 0;
      this._btOnOff.enabled = false;
    }
  }

  // OG: CBattleRecordMan::OnDotDamageInfo (decompile 0x470a60) — loops
  // `count` times updating min/max/attack-num per hit, then a single
  // IncTotalDamage(damage*count) and one CalcAverageDamagePerSec call
  // with the per-hit (not batch-total) damage and isDot=true.
  setDotDamage(args: BattleRecordDotDamageArgs): void {
    this._damageLog.push({ damage: args.damage, count: args.count, attrRate: args.attrRate });
    if (this._damageLog.length > 100) this._damageLog.shift();

    if (this._serverOnCalc) {
      const info = this._info;
      for (let i = 0; i < args.count; i++) {
        if (args.damage !== 0) {
          if (info.maxDamage < args.damage) info.maxDamage = args.damage;
          if (info.minDamage > args.damage || !info.minDamage) info.minDamage = args.damage;
        }
        info.totalAttackNum++;
        if (args.attrRate !== null) info.totalAttrRate += args.attrRate;
      }
      info.totalDamage += args.damage * args.count;
      if (info.totalAttackNum > 0) info.averageDamagePerHit = Math.floor(info.totalDamage / info.totalAttackNum);
      this._calcAverageDamagePerSec(args.damage, true, false);
      if (args.attrRate !== null && info.totalAttackNum > 0) info.averageAttrRate = Math.floor(info.totalAttrRate / info.totalAttackNum);
    }
    this._refreshDamageText();
  }

  private _refreshDamageText(): void {
    const last = this._damageLog[this._damageLog.length - 1];
    const total = this._damageLog.reduce((s, e) => s + e.damage * e.count, 0);
    const dotLine = last
      ? `DoT damage: ${last.damage} x ${last.count}${last.attrRate !== null ? ` (attr ${last.attrRate})` : ''}\nTotal: ${total}`
      : `Total: ${total}`;
    const info = this._info;
    const statsLine = info.totalAttackNum > 0
      ? `\nAvg/hit: ${info.averageDamagePerHit}  DPS: ${info.averageDamagePerSec}\n`
        + `Min/Max: ${info.minDamage}/${info.maxDamage}  Crit: ${info.criticalNum} (${info.critMinDamage}-${info.critMaxDamage})\n`
        + `Miss: ${info.missNum}${info.averageAttrRate ? `  Avg attr: ${info.averageAttrRate}` : ''}`
      : '';
    this._damageText!.text = dotLine + statsLine;
  }

  setServerOnCalc(enabled: boolean): void {
    this._serverOnCalc = enabled;
    this._refreshCalcText();
  }

  getDamageMeterSummary(): { avgDmg: number; maxDmg: number } {
    return {
      avgDmg: this._info.averageDamagePerSec,
      maxDmg: this._info.maxDamage,
    };
  }

  private _refreshCalcText(): void {
    this._calcText!.text = this._serverOnCalc ? 'Server calculation: enabled' : 'Server calculation: disabled';
  }

  // decompile/7730E0.c CUIBattleRecord::Update.
  update(_dt: number): void {
    if (!this.isVisible) return;
    const now = Date.now();
    if (this._tSetTime && this._tSetTime <= now) {
      this._tSetTime = 0;
      this._serverOnCalc = false;
      this._refreshCalcText();
      this._btTimerSet.enabled = true;
      this._btTimerStop.enabled = false;
    }
    if (this._tNextUpdate && now >= this._tNextUpdate) {
      this._tNextUpdate = now + 1000;
    }
    if (this._tSetTime || this._tStopRemainTime) {
      this._tNextUpdate ||= now + 1000;
      const remaining = this._tSetTime ? this._tSetTime - now : this._tStopRemainTime;
      this._timerText!.text = `Timer: ${Math.max(0, Math.ceil(remaining / 1000))}s${this._tStopRemainTime ? ' (paused)' : ''}`;
    } else {
      this._tNextUpdate = 0;
      this._timerText!.text = '';
    }
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    const px = this.container.position.x;
    const py = this.container.position.y;
    const lx = x - px;
    const ly = y - py;
    for (const c of this._allControls) {
      if (c.handleMouseButton(lx, ly, down)) return true;
    }
    if (!down) return true;
    if (lx >= this._panelW - 18 && ly < 22) { this.isVisible = false; return true; }
    return lx >= 0 && lx < this._panelW && ly >= 0 && ly < PanelH;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.isVisible = false; return true; }
    return false;
  }
}
