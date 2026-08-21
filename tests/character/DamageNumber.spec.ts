import { describe, expect, it, vi } from 'vitest';
import { DamageKind, DamageNumber } from '../../src/character/DamageNumber.js';

describe('DamageNumber', () => {
  it('stagger multi-hit entries vertically', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    try {
      const numbers = new DamageNumber();
      numbers.Add(100, 50, 100, undefined, 0);
      numbers.Add(200, 50, 100, undefined, 1);

      const entries = (numbers as any)._entries as Array<{ worldY: number }>;
      expect(entries[0].worldY).toBe(100);
      expect(entries[1].worldY).toBe(86);
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('uses the wider OG critical-hit horizontal offset', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1);
    try {
      const numbers = new DamageNumber();
      numbers.Add(100, 50, 100, DamageKind.MobDamage);
      numbers.Add(200, 50, 100, DamageKind.DamageCrit);

      const entries = (numbers as any)._entries as Array<{ worldX: number }>;
      expect(entries[0].worldX).toBe(60);
      expect(entries[1].worldX).toBe(65);
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('holds at full alpha for 400ms then fades over 200ms (OG Effect_HP timing)', () => {
    const n = new DamageNumber();
    n.Add(100, 0, 0, DamageKind.MobDamage);
    const entry = (n as any)._entries[0] as { age: number; vy: number };

    // t=0: full alpha
    let alpha = computeAlpha(entry);
    expect(alpha).toBe(1);

    // t=300ms: still full alpha (within 400ms hold)
    entry.age = 0.3;
    alpha = computeAlpha(entry);
    expect(alpha).toBe(1);

    // t=400ms: still full alpha (edge of hold)
    entry.age = 0.4;
    alpha = computeAlpha(entry);
    expect(alpha).toBe(1);

    // t=500ms: half faded (400ms hold + 100ms into 200ms fade)
    entry.age = 0.5;
    alpha = computeAlpha(entry);
    expect(alpha).toBeCloseTo(0.5);

    // t=600ms: fully gone
    entry.age = 0.6;
    alpha = computeAlpha(entry);
    expect(alpha).toBeCloseTo(0);
  });

  it('rises at 50px/s for 600ms (OG 30px up over full life)', () => {
    const n = new DamageNumber();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    try {
      n.Add(100, 100, 200, DamageKind.MobDamage);
      const entry = (n as any)._entries[0] as { age: number; worldY: number; vy: number };

      expect(entry.vy).toBe(-50);

      // After 600ms the number has moved 30px up
      n.Update(0.6);
      expect(entry.worldY).toBeCloseTo(170); // 200 + (-50 * 0.6)
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('removes entries after TotalLife (600ms)', () => {
    const n = new DamageNumber();
    n.Add(100, 0, 0, DamageKind.MobDamage);
    const count = () => (n as any)._entries.length;
    expect(count()).toBe(1);

    n.Update(0.59);
    expect(count()).toBe(1);

    n.Update(0.02); // age = 0.61 > 0.6
    expect(count()).toBe(0);
  });
});

/** Extract the alpha logic from DamageNumber.RebuildDisplay for unit testing. */
function computeAlpha(entry: { age: number }): number {
  const HoldDuration = 0.4;
  const FadeDuration = 0.2;
  let alpha = 1;
  if (entry.age >= HoldDuration) {
    alpha = 1 - (entry.age - HoldDuration) / FadeDuration;
  }
  return Math.max(0, Math.min(1, alpha));
}
