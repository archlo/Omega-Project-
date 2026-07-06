import { describe, it, expect } from 'vitest';
import { TipOfTheDay } from '../../src/character/TipOfTheDay.js';
import { WzProperty } from '../../src/wz/WzProperty.js';

// TODO_AUDIT.md Eighty-fourth pass: CTips ambient gameplay tip toast.
// Etc/Tips.img is a fully literal WZ table (info/0..9 + per-group string
// lists), confirmed by opening the real WZ data directly. Mocked here as a
// plain { GetItem } object — TipOfTheDay.Load only calls that one method.
function makeEntry(levelMin: number, levelMax: number, interval: number, tip: string): WzProperty {
  return new WzProperty(null as any, 0, { levelMin, levelMax, interval, tip });
}

function makeFakeEtcWz() {
  const info = new WzProperty(null as any, 0, {
    '0': makeEntry(1, 10, 30000, 'novice'),
    '1': makeEntry(11, 20, 60000, 'novice2'),
  });
  const novice = new WzProperty(null as any, 0, {
    '0': 'Visit town stores.',
    '1': 'Type /trade to request a trade.',
  });
  const novice2 = new WzProperty(null as any, 0, {
    '0': 'The 2nd job advancement is at level 30.',
  });
  const tips = new WzProperty(null as any, 0, { info, novice, novice2 });
  return { GetItem: (path: string) => (path === 'Tips.img' ? tips : null) } as any;
}

describe('TipOfTheDay', () => {
  it('returns a tip from the matching level-range group', () => {
    const tod = new TipOfTheDay();
    tod.Load(makeFakeEtcWz());
    const tip = tod.GetTip(5, 0, 1000);
    expect(['Visit town stores.', 'Type /trade to request a trade.']).toContain(tip);
  });

  it('returns null when no entry matches the level', () => {
    const tod = new TipOfTheDay();
    tod.Load(makeFakeEtcWz());
    expect(tod.GetTip(99, 0, 1000)).toBeNull();
  });

  it('respects the interval rate-limit before showing another tip', () => {
    const tod = new TipOfTheDay();
    tod.Load(makeFakeEtcWz());
    expect(tod.GetTip(5, 0, 1000)).not.toBeNull();
    expect(tod.GetTip(5, 0, 1500)).toBeNull();
    expect(tod.GetTip(5, 0, 1000 + 30000)).not.toBeNull();
  });
});
