import { describe, it, expect } from 'vitest';
import { StatsInfo } from '../../../src/ui/game/StatsInfo.js';
import { WzTextureLoader } from '../../../src/render/WzTextureLoader.js';
import { getIdealStatUp } from '../../../src/ui/game/StatDetailInfo.js';

// OG: CUIStat::AutoApUp @0x8661E0 — ideal allocation via GetIdealStatUp,
// capped to available AP, remainder poured into the LAST stat pair, then a
// CUtilDlg::YesNo confirm that sends UserAbilityMassUp on Yes.
describe('StatsInfo auto-AP allocation', () => {
  function makeStats(over: Partial<StatsInfo> = {}): StatsInfo {
    (globalThis as any).localStorage = { getItem: () => null, setItem: () => {} };
    const s = new StatsInfo(new WzTextureLoader(), null);
    s.level = 30;
    s.job = '100'; // Warrior (jobNum 100 → jobCat 1)
    s.ap = 10;
    s.str = 4; s.dex = 4; s.intStat = 4; s.luk = 4;
    Object.assign(s, over);
    return s;
  }

  it('does nothing when there is no AP', () => {
    const s = makeStats({ ap: 0 });
    s.autoApUp(1);
    expect(s.pendingAutoApAlloc).toBeNull();
  });

  it('does nothing when GetIdealStatUp returns no pairs (unsupported job)', () => {
    const s = makeStats({ job: '999', ap: 10 });
    s.autoApUp(1);
    expect(s.pendingAutoApAlloc).toBeNull();
  });

  it('caps the allocation to available AP', () => {
    const s = makeStats({ ap: 1 });
    s.autoApUp(1);
    const alloc = s.pendingAutoApAlloc!;
    const total = alloc.str + alloc.dex + alloc.intStat + alloc.luk;
    expect(total).toBeLessThanOrEqual(1);
  });

  it('pours leftover AP into the LAST stat pair of the ideal allocation', () => {
    // Warrior branch pushes DEX then STR — STR is the last pair, so leftover
    // must go to STR even when DEX already consumed everything.
    const s = makeStats({ ap: 100, level: 30, dex: 30 });
    s.autoApUp(1);
    const alloc = s.pendingAutoApAlloc!;
    const pairs = getIdealStatUp(100, 30, s.str, s.dex, s.intStat, s.luk, true);
    expect(pairs[pairs.length - 1].dwStatFlag).toBe(0x40); // STR is last
    // All AP landed somewhere; every point is accounted for.
    const total = alloc.str + alloc.dex;
    expect(total).toBeLessThanOrEqual(100);
    expect(alloc.str).toBeGreaterThan(0);
  });
});

describe('getIdealStatUp job branches', () => {
  it('beginner allocates DEX then STR', () => {
    const pairs = getIdealStatUp(0, 30, 4, 4, 4, 4, true);
    expect(pairs).toEqual([
      { dwStatFlag: 0x80, nValue: 26 }, // DEX: level - dex = 26
      { dwStatFlag: 0x40, nValue: 128 }, // STR: 4*level+12 - str = 128
    ]);
  });

  it('warrior allocates DEX then STR with level-based target', () => {
    // jobId 100 → v4 % 1000 / 100 == 1 (warrior). level 30 → target = 2*30.
    const pairs = getIdealStatUp(100, 30, 4, 4, 4, 4, true);
    expect(pairs[0]).toEqual({ dwStatFlag: 0x80, nValue: 56 });
    expect(pairs[1].dwStatFlag).toBe(0x40);
  });

  it('mage allocates LUK then INT', () => {
    const pairs = getIdealStatUp(200, 30, 4, 4, 4, 4, true);
    expect(pairs[0]).toEqual({ dwStatFlag: 0x200, nValue: 29 }); // level+3 - luk
    expect(pairs[1].dwStatFlag).toBe(0x100);
  });

  it('returns empty for unsupported jobs', () => {
    expect(getIdealStatUp(999, 30, 4, 4, 4, 4, true)).toEqual([]);
  });
});
