import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { BuiltInFont } from '../BuiltInFont.js';
import { Button } from '../Button.js';
import { computeDerived, defaultStatInputs, DerivedStats, StatInputs, getWeaponType } from './StatDerived.js';

// OG CUIStatDetail (3040 bytes, inherits CUIWnd) — 1:1 from IDA
// Window size: 178×247 (ctor at 0x867560)
// All text at X=74, 18px vertical spacing (Draw @ 0x8625F0)
const COL_VALUE = 74;

// OG Draw rows (from disassembly of 0x8625F0):
// Y=15:  Damage Range — StringPool 1980 "%d~%d"
// Y=33:  Critical % — StringPool 1981 "%d"
// Y=51:  PDD (base+buff) — StringPool 1979 "%d + %d = %d"
// Y=69:  MDD (base+buff) — StringPool 1979
// Y=87:  ACC (base+buff) — StringPool 1979
// Y=105: ACC delta (secondary stat comparison) — StringPool 1979
// Y=123: EVA (base+buff) — StringPool 1979
// Y=141: EVA delta (secondary stat comparison) — StringPool 1979
// Y=159: Speed buff value — StringPool 1979 (complex)
// Y=177: Jump — StringPool 1981 (clamped [80, 123])
// Y=195: Speed — StringPool 1981 (clamped [70, 190])
const ROW_Y = [15, 33, 51, 69, 87, 105, 123, 141, 159, 177, 195] as const;

// OG StringPool IDs used in Draw:
// 0x7BC (1980): "%d~%d" — damage range (2 args: min, max)
// 0x7BD (1981): "%d" — single value (1 arg)
// 0x7BB (1979): "%d + %d = %d" — buff display (3 args: base, buff, total)
const SP_DAMAGE_FMT = 0x7BC;  // "%d~%d"
const SP_SINGLE_VAL = 0x7BD;  // "%d"
const SP_BUFF_FMT = 0x7BB;    // "%d + %d = %d"

// OG font types from get_basic_font() (Draw @ 0x8625F0):
// fType=0x18 → normal white (pFontNo)
// fType=0x2C → yellow (pFontNoY)
// fType=0x1C → blue (pFontNoB) — debuffed
// fType=0x22 → red (pFontNoR) — buffed
const COLOR_NORMAL = 0x332A21;
const COLOR_RED = 0xCC0000;     // buffed (positive)
const COLOR_BLUE = 0x0000CC;    // debuffed (negative)

// OG: StatPair struct — { dwStatFlag, nValue }
// dwStatFlag values: 0x40=STR, 0x80=DEX, 0x100=INT, 0x200=LUK
const STAT_FLAG_STR = 0x40;
const STAT_FLAG_DEX = 0x80;
const STAT_FLAG_INT = 0x100;
const STAT_FLAG_LUK = 0x200;

export interface StatPair {
  dwStatFlag: number;
  nValue: number;
}

// OG class: CUIStatDetail (TSingleton, ctor ??0CUIStatDetail@@QAE@JJ@Z,
// OnCreate/Draw confirmed). GetCriticalProp@CUIStatDetail confirms this
// class owns at least some derived-stat formula logic inline — see
// StatDerived.ts, which has no standalone OG equivalent (folded in here).
export class StatDetailInfo extends GamePanel {
  Inputs: StatInputs = defaultStatInputs();

  private _loader: WzTextureLoader;
  private _font: BuiltInFont | null;
  private _bg: WzSprite | null;
  private _bg2: WzSprite | null;
  private _bg3: WzSprite | null;
  private _btHpUp: Button | null;
  private _bgSprite: Sprite | null = null;
  private _bg2Sprite: Sprite | null = null;
  private _bg3Sprite: Sprite | null = null;
  private _statTexts: Text[] = [];

  // OG: buff amounts per stat (from GetPasssiveSkillBuffing)
  // These are computed from secondary stats + passive skills
  buffStr = 0; buffDex = 0; buffInt = 0; buffLuk = 0;
  buffPad = 0; buffMad = 0; buffPdd = 0; buffMdd = 0;
  buffAcc = 0; buffEva = 0;

  // OG: secondary stat values for delta comparison rows
  // These come from SecondaryStat offsets in the Draw function
  secPdd = 0; secPddBuff = 0;
  secMdd = 0; secMddBuff = 0;
  secAcc = 0; secAccBuff = 0;
  secEva = 0; secEvaBuff = 0;
  secSpeed = 0; secSpeedBuff = 0;

  constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null) {
    super();
    this._loader = loader;
    this._font = font;
    this.isVisible = false;

    const detail = ui?.GetItem('UIWindow2.img/Stat/detail');
    const detailProp = detail instanceof WzProperty ? detail : null;
    this._bg = detailProp?.Get('backgrnd') instanceof WzCanvas ? loader.Load(detailProp!.Get('backgrnd') as WzCanvas) : null;
    this._bg2 = detailProp?.Get('backgrnd2') instanceof WzCanvas ? loader.Load(detailProp!.Get('backgrnd2') as WzCanvas) : null;
    this._bg3 = detailProp?.Get('backgrnd3') instanceof WzCanvas ? loader.Load(detailProp!.Get('backgrnd3') as WzCanvas) : null;
    this._btHpUp = detailProp?.Get('BtHpUp') instanceof WzProperty ? new Button('HP Up') : null;
    // OG: CUIWnd close button
    this.createCloseButton(null, null, 1, 184);
  }

  update(_dt: number): void {
    if (!this.isVisible) return;
    this.draw();
  }

  draw(): void {
    if (!this.isVisible) return;
    // OG: 3 background layers (backgrnd, backgrnd2, backgrnd3)
    if (this._bg?.Texture && !this._bgSprite) {
      this._bgSprite = this._bg.ToPixi();
      this._root.addChild(this._bgSprite);
    }
    if (this._bg2?.Texture && !this._bg2Sprite) {
      this._bg2Sprite = this._bg2.ToPixi();
      this._root.addChild(this._bg2Sprite);
    }
    if (this._bg3?.Texture && !this._bg3Sprite) {
      this._bg3Sprite = this._bg3.ToPixi();
      this._root.addChild(this._bg3Sprite);
    }
    if (this._bgSprite) this._bgSprite.visible = true;
    if (this._bg2Sprite) this._bg2Sprite.visible = true;
    if (this._bg3Sprite) this._bg3Sprite.visible = true;

    const d = computeDerived(this.Inputs);

    // clear old texts
    for (const t of this._statTexts) { this._root.removeChild(t); t.destroy(); }
    this._statTexts = [];

    const makeText = (rowIdx: number, val: string, color: number): Text => {
      const t = new Text({ text: val, style: new TextStyle({ fontFamily: 'monospace', fontSize: 9, fill: color }) });
      t.x = COL_VALUE;
      t.y = ROW_Y[rowIdx];
      this._root.addChild(t);
      this._statTexts.push(t);
      return t;
    };

    // OG: Format a stat with optional buff — StringPool 1979 "%d + %d = %d"
    // When delta == 0: just itoa(base)
    // When delta != 0: Format(sFormat, "%d + %d = %d", delta, base, base+delta)
    const fmtBuff = (base: number, buff: number): { text: string; color: number } => {
      const total = base + buff;
      if (buff === 0) return { text: `${total}`, color: COLOR_NORMAL };
      const color = buff > 0 ? COLOR_RED : COLOR_BLUE;
      return { text: `${base} + ${buff} = ${total}`, color };
    };

    // Row 0 (Y=15): Damage Range — StringPool 1980 "%d~%d"
    makeText(0, `${d.minDamage}~${d.maxDamage}`, COLOR_NORMAL);

    // Row 1 (Y=33): Critical % — StringPool 1981 "%d"
    makeText(1, `${d.criticalPercent}`, COLOR_NORMAL);

    // Row 2 (Y=51): PDD (base+buff) — StringPool 1979
    const pdd = fmtBuff(this.Inputs.pddBonus, this.buffPdd);
    makeText(2, pdd.text, pdd.color);

    // Row 3 (Y=69): MDD (base+buff) — StringPool 1979
    const mdd = fmtBuff(this.Inputs.mddBonus, this.buffMdd);
    makeText(3, mdd.text, mdd.color);

    // Row 4 (Y=87): ACC (base+buff) — StringPool 1979
    const acc = fmtBuff(this.Inputs.accBonus, this.buffAcc);
    makeText(4, acc.text, acc.color);

    // Row 5 (Y=105): ACC delta (secondary stat comparison) — StringPool 1979
    const accDelta = fmtBuff(this.secAcc, this.secAccBuff);
    makeText(5, accDelta.text, accDelta.color);

    // Row 6 (Y=123): EVA (base+buff) — StringPool 1979
    const eva = fmtBuff(this.Inputs.evaBonus, this.buffEva);
    makeText(6, eva.text, eva.color);

    // Row 7 (Y=141): EVA delta (secondary stat comparison) — StringPool 1979
    const evaDelta = fmtBuff(this.secEva, this.secEvaBuff);
    makeText(7, evaDelta.text, evaDelta.color);

    // Row 8 (Y=159): Speed buff value — StringPool 1979 (complex)
    // OG: checks taming mob template, morph bonuses, mechanic vehicle
    const speedBuff = fmtBuff(this.secSpeed, this.secSpeedBuff);
    makeText(8, speedBuff.text, speedBuff.color);

    // Row 9 (Y=177): Jump — StringPool 1981, clamped [80, 123]
    const jump = Math.max(80, Math.min(123, d.jump));
    makeText(9, `${jump}`, COLOR_NORMAL);

    // Row 10 (Y=195): Speed — StringPool 1981, clamped [70, 190]
    const speed = Math.max(70, Math.min(190, d.speed));
    makeText(10, `${speed}`, COLOR_NORMAL);
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    if (this._btHpUp?.handleMouseButton(x, y, down) === true) return true;
    const px = this.container.position.x;
    const py = this.container.position.y;
    const pw = this._bg?.Width ?? 178;
    const ph = this._bg?.Height ?? 247;
    return x >= px && x < px + pw && y >= py && y < py + ph;
  }

  // ── OG: GetCriticalProp (0x861BF0) ────────────────────────────────
  // Computes critical hit probability from:
  // 1. Weapon item options (ApplyWeaponOption on equipped weapon + sub-weapon)
  // 2. Skill-based critical (get_critical_skill_level)
  // 3. SharpEyes buff (nSharpEyes >> 8)
  // 4. ThornsEffect buff (nThornsEffect >> 8)
  // 5. ComboAbilityBuff (with skill level lookup for 21110000 or 20000018)
  // 6. PassiveSkillData critical bonus
  // 7. WildHunterJaguarVehicle (skill 33001001)
  // 8. Evan skill 22140000 (job/100==22 || job==2001)
  getCriticalProp(): number {
    const s = this.Inputs;
    // Base critical from skill (get_critical_skill_level)
    let crit = this._getSkillCritical(s.jobId) + 5;

    // Weapon item option critical (ApplyWeaponOption)
    crit += this._weaponOptionCritical;

    // SharpEyes buff: nSharpEyes >> 8, clamped [0, 100]
    const sharpEyes = Math.max(0, Math.min(100, this._sharpEyesCrit >> 8));
    crit += sharpEyes;

    // ThornsEffect: nThornsEffect >> 8, clamped [0, 100]
    const thorns = Math.max(0, Math.min(100, this._thornsEffect >> 8));
    if (thorns > sharpEyes) crit += thorns - sharpEyes;

    // ComboAbilityBuff: skill level lookup
    const comboCrit = this._getComboAbilityCritical(s.jobId);
    crit += comboCrit;

    // PassiveSkillData critical bonus
    crit += this._passiveSkillCritical;

    // WildHunterJaguarVehicle (skill 33001001)
    if (this._isWildHunterJaguar) {
      crit += this._jaguarCritical;
    }

    // Evan skill 22140000
    const jobCat = Math.floor((s.jobId / 100) % 10);
    if (jobCat === 22 || s.jobId === 2001) {
      crit += this._evanCritical;
    }

    return Math.max(0, Math.min(100, crit));
  }

  // OG: get_critical_skill_level — returns base critical prop from skill
  private _getSkillCritical(jobId: number): number {
    // Simplified: returns 0 if no critical skill learned
    // Full OG checks job-specific critical skills
    return this._skillCriticalProp;
  }

  private _getComboAbilityCritical(jobId: number): number {
    // OG: checks ComboAbilityBuff stacks, looks up skill 21110000 or 20000018
    // Returns critical bonus based on combo count
    return this._comboAbilityCritical;
  }

  // Settable from GameStage to wire real data
  _weaponOptionCritical = 0;
  _sharpEyesCrit = 0;
  _thornsEffect = 0;
  _comboAbilityCritical = 0;
  _passiveSkillCritical = 0;
  _isWildHunterJaguar = false;
  _jaguarCritical = 0;
  _evanCritical = 0;
  _skillCriticalProp = 0;
}

// ── OG: GetIdealStatUp (0x73DDB0) ────────────────────────────────
// Computes ideal AP allocation based on job category.
// Returns array of { statFlag, amount } pairs.
export function getIdealStatUp(jobId: number, level: number, str: number, dex: number, intStat: number, luk: number, bWantToBeInfighter: boolean): StatPair[] {
  const result: StatPair[] = [];
  const job = jobId % 1000;
  const jobCat = Math.floor(job / 100);

  switch (jobCat) {
    case 0: { // Beginner
      if (job === 0 || jobId === 2001) {
        // DEX first: max(0, level - currentDEX)
        const dexTarget = Math.max(0, level - dex);
        result.push({ dwStatFlag: STAT_FLAG_DEX, nValue: dexTarget });
        // STR: max(0, 4*level+12 - currentSTR)
        const strTarget = Math.max(0, 4 * level + 12 - str);
        result.push({ dwStatFlag: STAT_FLAG_STR, nValue: strTarget });
      }
      break;
    }
    case 1: { // Warrior
      const dexTarget = level > 30 ? level + 30 : 2 * level;
      const dexVal = Math.max(0, dexTarget - dex);
      result.push({ dwStatFlag: STAT_FLAG_DEX, nValue: dexVal });
      const strTarget = 5 * level - dexTarget + 12;
      const strVal = Math.max(0, strTarget - str);
      result.push({ dwStatFlag: STAT_FLAG_STR, nValue: strVal });
      break;
    }
    case 2: { // Mage
      const lukTarget = Math.max(0, level + 3 - luk);
      result.push({ dwStatFlag: STAT_FLAG_LUK, nValue: lukTarget });
      const intTarget = 5 * level - (level + 3) + 12 - intStat;
      result.push({ dwStatFlag: STAT_FLAG_INT, nValue: Math.max(0, intTarget) });
      break;
    }
    case 3: { // Archer
      let strTarget: number;
      switch (jobId) {
        case 300: case 310: case 311: case 312:
          strTarget = level + 5;
          break;
        case 320: case 321: case 322:
          strTarget = level;
          break;
        default:
          return result;
      }
      // WildHunter override
      if (jobId >= 1300 && jobId < 1400) strTarget = level;
      const strVal = Math.max(0, strTarget - str);
      result.push({ dwStatFlag: STAT_FLAG_STR, nValue: strVal });
      const dexVal = Math.max(0, 5 * level - strTarget + 12 - dex);
      result.push({ dwStatFlag: STAT_FLAG_DEX, nValue: dexVal });
      break;
    }
    case 4: { // Thief
      const dexTarget = level > 40 ? level + 40 : 2 * level;
      const dexVal = Math.max(0, dexTarget - dex);
      result.push({ dwStatFlag: STAT_FLAG_DEX, nValue: dexVal });
      const lukTarget = 5 * level - dexTarget + 12;
      const lukVal = Math.max(0, lukTarget - luk);
      result.push({ dwStatFlag: STAT_FLAG_LUK, nValue: lukVal });
      break;
    }
    case 5: { // Pirate
      const isMechanic = jobId / 100 === 35;
      const isAran = jobId === 500;
      const isCannon = jobId / 10 === 51 || jobId === 1500;
      const isCorsair = jobId / 10 === 52;

      if (isCannon || (isAran && bWantToBeInfighter)) {
        // STR priority
        const dexTarget = level > 20 ? level + 20 : 2 * level;
        const dexVal = Math.max(0, dexTarget - dex);
        result.push({ dwStatFlag: STAT_FLAG_DEX, nValue: dexVal });
        const strTarget = 5 * level - dexTarget + 12;
        const strVal = Math.max(0, strTarget - str);
        result.push({ dwStatFlag: STAT_FLAG_STR, nValue: strVal });
      } else if (isCorsair || (isAran && !bWantToBeInfighter) || isMechanic) {
        // DEX priority
        const strVal = Math.max(0, level - str);
        result.push({ dwStatFlag: STAT_FLAG_STR, nValue: strVal });
        const dexVal = Math.max(0, 4 * level + 12 - dex);
        result.push({ dwStatFlag: STAT_FLAG_DEX, nValue: dexVal });
      }
      break;
    }
  }

  return result;
}
