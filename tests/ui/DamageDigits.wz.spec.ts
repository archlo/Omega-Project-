import { describe, it, expect } from 'vitest';
import { WzPackage } from '../../src/wz/WzPackage.js';
import { WzTextureLoader } from '../../src/render/WzTextureLoader.js';
import { DamageDigits } from '../../src/ui/DamageDigits.js';

(globalThis as any).window ??= { innerWidth: 800, innerHeight: 600 };

describe('DamageDigits WZ parity (real Effect.nx)', () => {
  const nx = process.env.MAPLECLAUDE_NX_DIR;
  if (!nx) {
    it('skipped', () => console.log('MAPLECLAUDE_NX_DIR not set'));
    return;
  }
  it('loads white + crit digit sets and the miss glyph from BasicEff.img', () => {
    const effect = WzPackage.Open(`${nx}/Effect.nx`);
    const digits = new DamageDigits(effect, new WzTextureLoader());
    expect(digits.LoadedWhite).toBe(true);
    expect(digits.LoadedCrit).toBe(true);
    expect(digits.LoadedMiss).toBe(true);
  });
});