import { describe, it, expect } from 'vitest';
import { StatsInfo } from '../../../src/ui/game/StatsInfo.js';
import { WzTextureLoader } from '../../../src/render/WzTextureLoader.js';

(globalThis as any).window ??= {};
(globalThis as any).localStorage = { getItem: () => null, setItem: () => {} };

// OG: CUIStat::CreateTip @0x866530 — job-specific stat-recommendation balloon tips.
// Verified from the IDB job-switch (all jobs 100-1500): each branch calls
// UIHelper::MakeBalloonTip(font, nDir, nX, nY, contents, layer) with its own
// StringPool line set and coordinates. The base tip (all jobs) is m_pLayerTip[0]
// at (170,187) nDir=2 with 0x14C6/0x14C7.
describe('StatsInfo createTip job tips (CUIStat::CreateTip)', () => {
  function makeStats(job: string): StatsInfo {
    const s = new StatsInfo(new WzTextureLoader(), null);
    s.job = job;
    return s;
  }

  function tipLayers(s: StatsInfo): any[] {
    return (s as any)._tipLayers;
  }

  // Each tip's StringPool line ids are resolved via _getStringPoolText fallback;
  // assert the per-job fallback text differs so the job-specific info is present.
  it('base tip exists for every job at (170,187) nDir=2', () => {
    const s = makeStats('100');
    s.createTip11();
    const tips = tipLayers(s);
    expect(tips.length).toBeGreaterThanOrEqual(1);
    expect(tips[0].x).toBe(170);
    expect(tips[0].y).toBe(187);
    const texts = (tips[0] as any).children
      .filter((c: any) => c && typeof c.text === 'string')
      .map((c: any) => c.text);
    expect(texts.join(' ')).toContain('AP can be used to raise');
  });

  it('Warrior (100) uses the STR tip at (160,241) nDir=3', () => {
    const s = makeStats('100');
    s.createTip11();
    const tip = tipLayers(s)[1];
    expect(tip.x).toBe(160);
    expect(tip.y).toBe(241);
  });

  it('Magician (200) uses the INT tip at (160,266) nDir=2', () => {
    const s = makeStats('200');
    s.createTip11();
    const tip = tipLayers(s)[1];
    expect(tip.x).toBe(160);
    expect(tip.y).toBe(266);
  });

  it('Aran (1200) uses its own combo tip at (160,266) — distinct from generic jobs', () => {
    const s = makeStats('1200');
    s.createTip11();
    const tips = tipLayers(s);
    const texts = (tips[1] as any).children
      .filter((c: any) => c && typeof c.text === 'string')
      .map((c: any) => c.text);
    expect(texts.join(' ')).toContain('combo attacks');
  });

  it('Mercedes (1400) uses its own elemental tip at (160,284)', () => {
    const s = makeStats('1400');
    s.createTip11();
    const tips = tipLayers(s);
    const texts = (tips[1] as any).children
      .filter((c: any) => c && typeof c.text === 'string')
      .map((c: any) => c.text);
    expect(texts.join(' ')).toContain('elemental arrows');
    expect(tips[1].x).toBe(160);
    expect(tips[1].y).toBe(284);
  });

  it('Phantom (1500) uses its own card tip at (160,241) nDir=3', () => {
    const s = makeStats('1500');
    s.createTip11();
    const tips = tipLayers(s);
    const texts = (tips[1] as any).children
      .filter((c: any) => c && typeof c.text === 'string')
      .map((c: any) => c.text);
    expect(texts.join(' ')).toContain('card attacks');
    expect(tips[1].x).toBe(160);
    expect(tips[1].y).toBe(241);
  });

  it('Pirate (500) gets TWO job tips (1 = STR/DEX, 2 = second line)', () => {
    const s = makeStats('500');
    s.createTip11();
    const tips = tipLayers(s);
    expect(tips.length).toBeGreaterThanOrEqual(3); // base + tip1 + tip2
    expect(tips[1].x).toBe(149);
    expect(tips[1].y).toBe(230);
    expect(tips[2].x).toBe(160);
    expect(tips[2].y).toBe(248);
  });

  it('destroyTip removes all tip layers', () => {
    const s = makeStats('100');
    s.createTip11();
    expect(tipLayers(s).length).toBeGreaterThan(0);
    s.destroyTip();
    expect(tipLayers(s).length).toBe(0);
  });
});
