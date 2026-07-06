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
});
