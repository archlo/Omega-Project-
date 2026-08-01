// OG: CUserLocal::DrawCombo (decompile 0x50FA80)
// Combo counter display with skill unlock notifications at 30/100/200.
//
// ComboLevel (OG exact):
//   < 30  → level 0
//   < 100 → level 1
//   < 200 → level 2
//   >= 200 → level 3
//
// Each digit is rendered individually. Digits at/right of the rightmost non-zero
// digit use the "BigAmp" (larger) origin; others use "Normal".
// Alternating x offsets: 169 (odd) and 165 (even) per digit index.
//
// At combo 30/100/200, two skill command layers are shown:
//   30:  attack=21100004, buff=21100005
//   100: attack=21110004, buff=21110005
//   200: attack=21120006, buff=21120007
// The buff layer shifts down by 35px if attack layer is present.
//
// OG: digits fade out after 5 seconds (update_time + 5000).
// OG: bounce animation (FLYORIGIN) applied when comboLevel <= 2.
// OG: skill command layers animate (raw_Animate) and positioned below combo digits.

import { Container, Graphics, Text, TextStyle } from 'pixi.js';

/** OG: alternating x offsets per digit — 169 (odd index) and 165 (even index) */
const ODD_OFFSET = 169;
const EVEN_OFFSET = 165;

/** OG: BigAmp digits are scaled up (digits at/right of rightmost non-zero) */
const BIGAMP_SCALE = 1.3;
const NORMAL_SCALE = 0.85;

/** OG: bounce amplitude constants from FLYORIGIN arrays */
const BOUNCE_AMPLITUDE = 10.0;
const BOUNCE_DECAY = 4.0;
const BOUNCE_PERIOD_MS = 50;
const BOUNCE_SUSTAIN_MS = 300;

/** OG: fade-out delay in ms (update_time + 5000) */
const FADE_DELAY_MS = 5000;

/** OG: skill unlock thresholds → skill IDs */
const SKILL_THRESHOLDS: Record<number, { attack: number; buff: number }> = {
  30:  { attack: 21100004, buff: 21100005 },
  100: { attack: 21110004, buff: 21110005 },
  200: { attack: 21120006, buff: 21120007 },
};

/** OG: combo level → color index for digit rendering */
const LEVEL_COLORS = [0xBBBBBB, 0xFFD700, 0xFF6600, 0xFF0000];

const DIGIT_STYLE = new TextStyle({
  fill: '#FFFFFF',
  fontSize: 20,
  fontFamily: 'Arial Black, Arial, sans-serif',
  fontWeight: 'bold',
  stroke: { color: '#000000', width: 3 },
  dropShadow: { color: '#000000', blur: 2, distance: 1 },
});

const SKILL_CMD_STYLE = new TextStyle({
  fill: '#00FF88',
  fontSize: 11,
  fontFamily: 'Arial, sans-serif',
  fontWeight: 'bold',
  stroke: { color: '#000000', width: 1 },
});

export class ComboDisplay {
  readonly container = new Container();
  private _bg = new Graphics();
  private _digitContainer = new Container();
  private _skillCmdContainer = new Container();
  private _digits: Text[] = [];
  private _comboLevel = 0;
  private _comboCount = 0;
  private _visible = false;

  // OG: fade timer (alpha fade starts after 5 seconds)
  private _fadeTimer = 0;
  private _fading = false;

  // OG: bounce animation state (FLYORIGIN)
  private _bounceActive = false;
  private _bounceStartTime = 0;

  // Skill unlock layers (OG: m_pLayerComboSkillCommand_Attack/Buff)
  private _skillCmdAttackLayer: Container | null = null;
  private _skillCmdBuffLayer: Container | null = null;

  constructor() {
    this.container.addChild(this._bg);
    this.container.addChild(this._digitContainer);
    this.container.addChild(this._skillCmdContainer);
    this.container.visible = false;
  }

  /**
   * Set the combo count. Triggers digit rebuild, level change,
   * and skill unlock notification at 30/100/200.
   */
  setCombo(count: number): void {
    if (count <= 0) {
      this.hide();
      return;
    }
    const prevLevel = this._comboLevel;
    this._comboCount = count;

    // OG: combo level calculation (exact from decompiled code)
    // if (combo < 200) { if (combo < 100) nComboLevel = (combo >= 30); else nComboLevel = 2; }
    // else nComboLevel = 3;
    this._comboLevel = count >= 200 ? 3 : count >= 100 ? 2 : count >= 30 ? 1 : 0;

    this._visible = true;
    this.container.visible = true;
    this._fading = false;
    this.container.alpha = 1;
    this._rebuildDigits();

    // OG: bounce animation when comboLevel <= 2
    if (this._comboLevel <= 2) {
      this._bounceActive = true;
      this._bounceStartTime = performance.now();
    } else {
      this._bounceActive = false;
    }

    // OG: skill unlock notification at exact thresholds (30, 100, 200)
    if (SKILL_THRESHOLDS[count]) {
      this._showSkillUnlock(count);
    }
  }

  hide(): void {
    this._visible = false;
    this.container.visible = false;
    this._fadeTimer = 0;
    this._fading = false;
    this._bounceActive = false;
    this._clearSkillUnlock();
  }

  /** Call every frame with delta time in seconds */
  update(dt: number): void {
    if (!this._visible) return;

    const now = performance.now();

    // OG: fade-out after 5 seconds (alpha RelMove with update_time + 5000)
    if (!this._fading) {
      this._fadeTimer += dt * 1000;
      if (this._fadeTimer >= FADE_DELAY_MS) {
        this._fading = true;
      }
    } else {
      // Smooth alpha fade over 1 second
      this.container.alpha = Math.max(0, this.container.alpha - dt);
      if (this.container.alpha <= 0) {
        this.hide();
        return;
      }
    }

    // OG: bounce animation (FLYORIGIN pattern)
    if (this._bounceActive) {
      const elapsed = now - this._bounceStartTime;
      if (elapsed < BOUNCE_PERIOD_MS) {
        // First bounce: upward velocity
        this._digitContainer.y = -BOUNCE_AMPLITUDE;
      } else if (elapsed < BOUNCE_SUSTAIN_MS) {
        // Decay bounce
        const t = (elapsed - BOUNCE_PERIOD_MS) / (BOUNCE_SUSTAIN_MS - BOUNCE_PERIOD_MS);
        this._digitContainer.y = -BOUNCE_AMPLITUDE * (1 - t * BOUNCE_DECAY / 10);
      } else {
        this._digitContainer.y = 0;
        this._bounceActive = false;
      }
    }

    // OG: skill command layer fade (raw_Animate + alpha RelMove)
    if (this._skillCmdAttackLayer || this._skillCmdBuffLayer) {
      // Skill command layers stay for 3 seconds then fade
      if (this._fadeTimer > 3000) {
        this._skillCmdContainer.alpha = Math.max(0, 1 - (this._fadeTimer - 3000) / 1000);
        if (this._skillCmdContainer.alpha <= 0) {
          this._clearSkillUnlock();
        }
      }
    }
  }

  get isVisible(): boolean { return this._visible; }

  /**
   * OG: rebuild digit display.
   * Each digit is rendered individually. Digits at/right of the rightmost
   * non-zero use BigAmp (larger); others use Normal (smaller).
   * Alternating x offsets per OG: 169 (odd) and 165 (even).
   */
  private _rebuildDigits(): void {
    // Clear old digits
    for (const d of this._digits) {
      this._digitContainer.removeChild(d);
      d.destroy();
    }
    this._digits = [];

    // OG: extract digits right-to-left, track rightmost non-zero
    const count = this._comboCount;
    const digits: number[] = [];
    let tmp = count;
    while (tmp > 0) {
      digits.push(tmp % 10);
      tmp = Math.floor(tmp / 10);
    }
    if (digits.length === 0) {
      this.hide();
      return;
    }
    digits.reverse(); // Now left-to-right

    // OG: find rightmost non-zero digit index
    let rightMostNonZero = -1;
    for (let i = digits.length - 1; i >= 0; i--) {
      if (digits[i] > 0) { rightMostNonZero = i; break; }
    }

    const color = LEVEL_COLORS[this._comboLevel];
    const colorStr = '#' + color.toString(16).padStart(6, '0');

    // OG: v2 & 1 for alternating offset
    const isOddDigitCount = digits.length % 2 === 1;

    // Calculate total width for centering
    const maxDigitW = 22;
    const totalW = digits.length * maxDigitW;
    const startX = -totalW / 2;

    for (let i = 0; i < digits.length; i++) {
      const isBigAmp = i >= rightMostNonZero;
      const fontSize = isBigAmp ? 22 : 15;
      const scale = isBigAmp ? BIGAMP_SCALE : NORMAL_SCALE;

      const text = new Text({
        text: String(digits[i]),
        style: new TextStyle({
          ...DIGIT_STYLE,
          fill: colorStr,
          fontSize,
        }),
      });

      // OG: alternating x offset — 169 (odd index) and 165 (even index)
      const altOffset = (i % 2 === 0) ? EVEN_OFFSET : ODD_OFFSET;
      text.x = startX + i * maxDigitW + (altOffset - 167); // Centered around 0
      text.y = isBigAmp ? -4 : 0;
      text.scale.set(scale);
      text.anchor.set(0.5);

      this._digitContainer.addChild(text);
      this._digits.push(text);
    }

    // Background glow
    this._bg.clear();
    const bgW = totalW + 16;
    const bgH = 36;
    this._bg.roundRect(-bgW / 2, -bgH / 2, bgW, bgH, 6)
      .fill({ color: 0x000000, alpha: 0.5 });
    this._bg.roundRect(-bgW / 2, -bgH / 2, bgW, bgH, 6)
      .stroke({ color, alpha: 0.3, width: 1 });

    this._digitContainer.y = -50;
  }

  /**
   * OG: show skill unlock notification at 30/100/200 combo.
   * Loads two layers: attack command and buff command.
   * Buff layer shifts down by 35px (SKILL_CMD_Y_OFFSET) if attack layer is present.
   */
  private _showSkillUnlock(threshold: number): void {
    const skills = SKILL_THRESHOLDS[threshold];
    if (!skills) return;

    this._clearSkillUnlock();
    this._skillCmdContainer.alpha = 1;
    this._skillCmdContainer.visible = true;

    // Attack skill command layer (OG: m_pLayerComboSkillCommand_Attack)
    this._skillCmdAttackLayer = new Container();
    const attackLabel = new Text({
      text: `Attack Lv.${skills.attack % 10}`,
      style: new TextStyle({
        ...SKILL_CMD_STYLE,
        fill: '#FF4444',
        fontSize: 12,
      }),
    });
    attackLabel.anchor.set(0.5);
    this._skillCmdAttackLayer.addChild(attackLabel);
    this._skillCmdContainer.addChild(this._skillCmdAttackLayer);

    // Buff skill command layer (OG: m_pLayerComboSkillCommand_Buff)
    // OG: positioned 35px below attack if attack layer exists
    this._skillCmdBuffLayer = new Container();
    const buffLabel = new Text({
      text: `Buff Lv.${skills.buff % 10}`,
      style: new TextStyle({
        ...SKILL_CMD_STYLE,
        fill: '#FF88FF',
        fontSize: 12,
      }),
    });
    buffLabel.anchor.set(0.5);
    this._skillCmdBuffLayer.addChild(buffLabel);
    this._skillCmdBuffLayer.y = 35; // OG: v69 = 250 when attack present, 215 otherwise
    this._skillCmdContainer.addChild(this._skillCmdBuffLayer);

    this._skillCmdContainer.y = this._digitContainer.y + 30;
  }

  private _clearSkillUnlock(): void {
    this._skillCmdContainer.removeChildren();
    this._skillCmdContainer.visible = false;
    this._skillCmdAttackLayer = null;
    this._skillCmdBuffLayer = null;
  }
}
