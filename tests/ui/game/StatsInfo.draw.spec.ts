import { describe, it, expect, beforeEach } from 'vitest';
import { Text } from 'pixi.js';
import { StatsInfo } from '../../../src/ui/game/StatsInfo.js';
import { WzTextureLoader } from '../../../src/render/WzTextureLoader.js';

// ponytail: shims Text.width to 0 so the AP right-align measurement doesn't
// need a DOM canvas (same trick as ChatBar.spec.ts)
Object.defineProperty(Text.prototype, 'width', { get: () => 0 });

// OG CUIStat::Draw @0x864BD0 — verified text-row formats:
// - Level/Fame: StringPool 6677 (single %d, label baked in WZ bg)
// - HP/MP: StringPool 6678 (2 args)
// - EXP: StringPool 1994 Format(exp, pct) — exactly 2 args, next-level NOT shown
// - Beginner branch (job%1000==0 || job==2001) && level<=10: copies cover0/cover1
//   overlays, skips stats + AP, keeps Name/Job/Level/Guild/HP/MP/EXP/Fame.
// - EXP tooltip: 0x1A37 Format(exp, next) — 2 args (2 args).
describe('StatsInfo Draw text rows (OG CUIStat::Draw @0x864BD0)', () => {
  function makeStats(over: Partial<StatsInfo> = {}): StatsInfo {
    (globalThis as any).localStorage = { getItem: () => null, setItem: () => {} };
    const s = new StatsInfo(new WzTextureLoader(), null);
    s.isVisible = true;
    s.level = 30;
    s.job = '100'; // Warrior (jobNum 100 → jobCat 1)
    s.exp = 100;
    s.nextLevelExp = 500;
    s.fame = 7;
    Object.assign(s, over);
    return s;
  }

  beforeEach(() => {
    (globalThis as any)._textWidth = 10;
  });

  it('EXP row is exp + pct only (StringPool 1994 = 2 args, next-level NOT shown)', () => {
    const s = makeStats();
    s.update(0);
    expect((s as any)._expText.text).toBe('100 (20%)');
  });

  it('EXP pct clamps to 0 when nextLevelExp <= 0', () => {
    const s = makeStats({ nextLevelExp: 0 });
    s.update(0);
    expect((s as any)._expText.text).toBe('100 (0%)');
  });

  it('EXP pct is floor, not round', () => {
    const s = makeStats({ exp: 199, nextLevelExp: 500 });
    s.update(0);
    expect((s as any)._expText.text).toBe('199 (39%)');
  });

  it('Fame row is the bare number (StringPool 6677 single %d, label baked in bg)', () => {
    const s = makeStats();
    s.update(0);
    expect((s as any)._fameText.text).toBe('7');
    expect((s as any)._fameText.text).not.toContain('Fame');
  });

  it('Level row stays the bare number', () => {
    const s = makeStats();
    s.update(0);
    expect((s as any)._levelText.text).toBe('30');
  });

  it('HP/MP rows are "%d / %d" (StringPool 6678)', () => {
    const s = makeStats({ hp: 120, maxHp: 250, mp: 40, maxMp: 80 });
    s.update(0);
    expect((s as any)._hpText.text).toBe('120 / 250');
    expect((s as any)._mpText.text).toBe('40 / 80');
  });

  it('AP is right-aligned ending at x=85', () => {
    const s = makeStats({ ap: 12 });
    s.update(0);
    expect((s as any)._apValue.visible).toBe(true);
    // x = 85 - textWidth (monospace text width computed at runtime)
    expect(((s as any)._apValue.x as number) + (s as any)._apValue.width).toBe(85);
  });
});

describe('StatsInfo beginner branch (job%1000==0 || job==2001) && level<=10', () => {
  function makeStats(over: Partial<StatsInfo> = {}): StatsInfo {
    (globalThis as any).localStorage = { getItem: () => null, setItem: () => {} };
    const s = new StatsInfo(new WzTextureLoader(), null);
    s.isVisible = true;
    s.level = 8;
    s.job = '0'; // Beginner == jobNum 0
    Object.assign(s, over);
    return s;
  }

  it('keeps Name/Job/Level/Guild/HP/MP/EXP/Fame rows visible', () => {
    const s = makeStats();
    s.update(0);
    expect((s as any)._bBeginner).toBe(true);
    expect((s as any)._nameText.visible).not.toBe(false);
    expect((s as any)._expText.text).toBe('0 (0%)');
  });

  it('hides AP count and the STR/DEX/INT/LUK section', () => {
    const s = makeStats({ ap: 5 });
    s.update(0);
    expect((s as any)._apValue.visible).toBe(false);
    expect((s as any)._strLabel.visible).toBe(false);
    expect((s as any)._strValue.visible).toBe(false);
    expect((s as any)._dexLabel.visible).toBe(false);
    expect((s as any)._lukValue.visible).toBe(false);
  });

  it('sets the beginner flag off for level > 10', () => {
    const s = makeStats({ level: 11 });
    s.update(0);
    expect((s as any)._bBeginner).toBe(false);
    expect((s as any)._apValue.visible).toBe(true);
  });

it('Aran beginner job 2001 also enters beginner mode', () => {
    const s = makeStats({ job: '2001' });
    s.update(0);
    expect((s as any)._bBeginner).toBe(true);
  });

  it('uses the numeric jobId, not the display name (Warrior name must not be beginner)', () => {
    const s = makeStats({ job: 'Warrior', jobId: 100 });
    s.update(0);
    expect((s as any)._bBeginner).toBe(false);
    expect((s as any)._apValue.visible).toBe(true);
  });

  it('jobId 0 (Beginner) enters beginner mode even at level <= 10', () => {
    const s = makeStats({ job: 'Beginner', jobId: 0 });
    s.update(0);
    expect((s as any)._bBeginner).toBe(true);
  });
});
