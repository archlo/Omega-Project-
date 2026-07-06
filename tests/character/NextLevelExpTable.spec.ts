import { describe, it, expect } from 'vitest';
import { NextLevelExpTable } from '../../src/character/NextLevelExpTable.js';

// TODO_AUDIT.md Forty-first/Forty-sixth passes: the real per-level EXP
// table, decompile-extracted (0xc6d3b4) but left unwired until this pass.
describe('NextLevelExpTable', () => {
  it('is monotonically non-decreasing across all 199 real entries (the real table has flat plateaus at some level bands)', () => {
    for (let i = 1; i < NextLevelExpTable.length; i++) {
      expect(NextLevelExpTable[i]).toBeGreaterThanOrEqual(NextLevelExpTable[i - 1]);
    }
  });

  it('has exactly 199 entries (level 1->2 through 199->200); level 200 has no entry', () => {
    expect(NextLevelExpTable.length).toBe(199);
    expect(NextLevelExpTable[199]).toBeUndefined(); // index 199 = level 200, out of range by design
  });

  it('matches the known first values (level 1->2 through 9->10)', () => {
    expect(NextLevelExpTable.slice(0, 9)).toEqual([15, 34, 57, 92, 135, 372, 560, 840, 1242]);
  });
});
