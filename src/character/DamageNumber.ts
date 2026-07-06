import { Container, Text } from 'pixi.js';
import { DamageDigits } from '../ui/DamageDigits.js';

export enum DamageKind {
  DamageNormal,
  DamageCrit,
  DamageMiss,
  HealHp,
  HealMp,
  MobDamage,
  Exp,
}

const KindColors: Record<DamageKind, number> = {
  [DamageKind.DamageNormal]: 0xffffff,
  [DamageKind.DamageCrit]: 0xffdc28,
  [DamageKind.DamageMiss]: 0xa0a0a0,
  [DamageKind.HealHp]: 0x50dc50,
  [DamageKind.HealMp]: 0x50c8ff,
  [DamageKind.MobDamage]: 0xff3c3c,
  [DamageKind.Exp]: 0x78ff50,
};

interface Entry {
  id: number;
  text: string;
  color: number;
  kind: DamageKind;
  worldX: number;
  worldY: number;
  age: number;
  vy: number;
}

export class DamageNumber {
  private static readonly RiseDuration = 0.7;
  private static readonly FadeDuration = 0.3;
  private static readonly TotalLife = DamageNumber.RiseDuration + DamageNumber.FadeDuration;

  readonly container = new Container();
  private _digits: DamageDigits | null = null;
  private _entries: Entry[] = [];
  private _nextId = 1;
  private _fallbackTexts = new Map<number, Text>();

  /** Pass a DamageDigits (loaded from Effect.wz) to render multi-digit damage using
      the v95 white-outlined damage-skin sprites. Falls back to text when unavailable. */
  setDamageDigits(digits: DamageDigits | null): void { this._digits = digits; }

  Add(value: number, worldX: number, worldY: number, kind: DamageKind = DamageKind.MobDamage, hitIndex = 0): void {
    let text: string;
    switch (kind) {
      case DamageKind.DamageMiss: text = 'MISS'; break;
      case DamageKind.HealHp: text = `+${value.toLocaleString()}`; break;
      case DamageKind.HealMp: text = `+${value.toLocaleString()}`; break;
      case DamageKind.Exp: text = `+${value.toLocaleString()} EXP`; break;
      default: text = value.toLocaleString();
    }
    // TODO_AUDIT.md Hundred-and-fifty-third pass: OG critical damage numbers
    // fan out by roughly +/-15px; keep normal hits on the existing small jitter.
    const spreadRange = kind === DamageKind.DamageCrit ? 15 : 10;
    const spread = Math.random() * spreadRange * 2 - spreadRange;
    this._entries.push({
      id: this._nextId++,
      text,
      color: KindColors[kind],
      kind,
      worldX: worldX + spread,
      // TODO_AUDIT.md Hundred-and-fifty-second pass: decoded multi-hit attacks
      // should not stack every number at the same Y; keep the cheap OG-like
      // stagger local to the renderer instead of cloning ZigZagDamage.
      worldY: worldY - Math.max(0, hitIndex) * 14,
      age: 0,
      vy: -80,
    });
  }

  AddMiss(worldX: number, worldY: number): void {
    this.Add(0, worldX, worldY, DamageKind.DamageMiss);
  }

  Update(dt: number): void {
    for (let i = this._entries.length - 1; i >= 0; i--) {
      const e = this._entries[i];
      e.age += dt;
      e.worldY += e.vy * dt;
      e.vy = Math.min(0, e.vy + 40 * dt);
      if (e.age >= DamageNumber.TotalLife) {
        const text = this._fallbackTexts.get(e.id);
        if (text) { text.destroy(); this._fallbackTexts.delete(e.id); }
        this._entries.splice(i, 1);
      }
    }
  }

  RebuildDisplay(worldToScreen: (wx: number, wy: number) => { x: number; y: number }): void {
    if (this._digits && this._digits.container.parent !== this.container) {
      this.container.addChild(this._digits.container);
    }
    if (this._digits) {
      this._digits.beginFrame(new Set(this._entries.map(e => `dmg${e.id}`)));
    }
    // Hide (don't destroy/recreate) every fallback Text not refreshed this
    // frame — these are persistent, per-entry instances now, not a fresh
    // node leaked into the container on every single RebuildDisplay call.
    const liveIds = new Set(this._entries.map(e => e.id));
    for (const [id, text] of this._fallbackTexts) {
      if (!liveIds.has(id)) text.visible = false;
    }

    for (const e of this._entries) {
      let alpha = 1;
      if (e.age >= DamageNumber.RiseDuration) {
        alpha = 1 - (e.age - DamageNumber.RiseDuration) / DamageNumber.FadeDuration;
      }
      alpha = Math.max(0, Math.min(1, alpha));

      const screen = worldToScreen(e.worldX, e.worldY);
      const isMiss = e.text === 'MISS';
      const isNumeric = !isMiss;
      const isCrit = e.kind === DamageKind.DamageCrit;
      let usedDigits = false;
      if (this._digits !== null) {
        const slotKey = `dmg${e.id}`;
        if (isMiss) {
          usedDigits = this._digits.DrawMiss(slotKey, screen, Math.floor(alpha * 255));
        } else if (isNumeric) {
          usedDigits = this._digits.DrawNumber(slotKey, e.text, screen, Math.floor(alpha * 255), isCrit);
        }
      }
      if (usedDigits) continue;

      let text = this._fallbackTexts.get(e.id);
      if (!text) {
        text = new Text({ text: e.text, style: {
          fontSize: 12,
          fill: e.color,
          stroke: { color: '#000000' },
        } });
        text.anchor.set(0.5, 1);
        this._fallbackTexts.set(e.id, text);
        this.container.addChild(text);
      } else {
        text.text = e.text;
      }
      text.visible = true;
      text.alpha = alpha;
      text.position.set(screen.x, screen.y);
    }
  }
}
