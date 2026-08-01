// OG: CUserLocal::DrawKeyDownBar (decompile 0x510BA0)
// Horizontal keyboard input visualization bar for charge/gauge skills.
// Shows bar background, graduated gauge marks, and a moving pointer.
// Canvas: 72×12 px. Three asset modes based on skill type.
//
// Skill modes (from decompiled WZ path branching):
//   - Charging (repeatSkill 35121003): aUi_228 / aUi_231 / aUi_185
//   - Preparing (specific skill IDs):  aUi_80  / aUi_28  / aUi_119
//   - Default:                         aUi_243 / aUi_165 / aUi_16
//
// Each mode loads 3 canvases: bar, gauge, graduation marks.
// The bar is drawn at 72×12 (0x48 × 0xC), gauge marks drawn from position 2
// up to the canvas width, and a pointer indicates the current hold position.

import { Container, Graphics } from 'pixi.js';

/** OG: canvas 0x48 × 0xC */
const BAR_W = 72;
const BAR_H = 12;

/** OG: gauge marks start at position 2, drawn at each pixel position up to bar width */
const GAUGE_MARK_START = 2;

/** Visual themes for each skill mode — colors chosen to differentiate them */
const MODE_THEMES = {
  charging: { bar: 0x1A1A3A, gauge: 0x4466CC, pointer: 0xFFD700, mark: 0x6688CC },
  preparing: { bar: 0x1A2A1A, gauge: 0x44AA44, pointer: 0xFFD700, mark: 0x66CC66 },
  default: { bar: 0x2A1A1A, gauge: 0xCC4444, pointer: 0xFFD700, mark: 0xCC6666 },
} as const;

type BarMode = keyof typeof MODE_THEMES;

/** Skill IDs that trigger specific bar modes (from decompiled pointer comparisons) */
const CHARGING_SKILL = 35121003;

export class KeyDownBar {
  readonly container = new Container();
  private _bar = new Graphics();
  private _gauge = new Graphics();
  private _graduation = new Graphics();
  private _pointer = new Graphics();
  private _visible = false;
  private _position = 0;
  private _mode: BarMode = 'default';
  private _repeatSkillId = 0;
  private _preparingSkillId = 0;

  constructor() {
    this.container.addChild(this._bar);
    this.container.addChild(this._gauge);
    this.container.addChild(this._graduation);
    this.container.addChild(this._pointer);
    this.container.visible = false;
  }

  /**
   * Show the key-down bar at a given fill fraction (0–1).
   * Automatically selects the correct visual mode based on skill state.
   */
  show(fillFraction: number): void {
    this._position = Math.max(0, Math.min(1, fillFraction));
    this._visible = true;
    this.container.visible = true;
    this._resolveMode();
    this._redraw();
  }

  hide(): void {
    this._visible = false;
    this.container.visible = false;
  }

  get isVisible(): boolean { return this._visible; }

  /** Set the current repeat/preparing skill IDs for mode resolution */
  setSkillState(repeatSkillId: number, preparingSkillId: number): void {
    this._repeatSkillId = repeatSkillId;
    this._preparingSkillId = preparingSkillId;
  }

  /** Resolve bar mode from current skill state (OG branching logic) */
  private _resolveMode(): void {
    if (this._repeatSkillId === CHARGING_SKILL) {
      this._mode = 'charging';
    } else if (this._preparingSkillId !== 0) {
      // OG: checks specific pointer values (off_423D0A, loc_4DD5C8+4, byte_E66C4B)
      // These correspond to specific preparing-skill IDs; we treat any active
      // preparing skill as this mode since the exact IDs are pointer-based.
      this._mode = 'preparing';
    } else {
      this._mode = 'default';
    }
  }

  private _redraw(): void {
    const theme = MODE_THEMES[this._mode];

    // Bar background
    this._bar.clear();
    this._bar.roundRect(0, 0, BAR_W, BAR_H, 2).fill({ color: theme.bar, alpha: 0.85 });
    this._bar.roundRect(0, 0, BAR_W, BAR_H, 2).stroke({ color: 0x333333, width: 1 });

    // Gauge fill
    this._gauge.clear();
    const fillW = this._position * (BAR_W - GAUGE_MARK_START);
    if (fillW > 0) {
      this._gauge.roundRect(GAUGE_MARK_START, 1, Math.max(0, fillW - 1), BAR_H - 2, 1)
        .fill({ color: theme.gauge, alpha: 0.85 });
    }

    // Graduation marks — OG draws from position 2 up to canvas width
    this._graduation.clear();
    for (let i = GAUGE_MARK_START; i < BAR_W; i++) {
      const isMajor = i % 10 === 0;
      this._graduation.moveTo(i, isMajor ? 0 : 3)
        .lineTo(i, isMajor ? BAR_H : BAR_H - 3)
        .stroke({ color: theme.mark, alpha: isMajor ? 0.5 : 0.2, width: 1 });
    }

    // Pointer
    this._pointer.clear();
    const ptrX = GAUGE_MARK_START + this._position * (BAR_W - GAUGE_MARK_START);
    this._pointer.roundRect(ptrX - 1, -1, 3, BAR_H + 2, 1).fill({ color: theme.pointer });
  }
}
