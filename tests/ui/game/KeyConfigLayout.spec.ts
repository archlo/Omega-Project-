import { describe, it, expect } from 'vitest';
import {
  initLayout,
  CellSize,
  ScLShift,
  ScRShift,
  ScLCtrl,
  ScRCtrl,
  ScLAlt,
  ScRAlt,
  getBindableScancodes,
  tryGetCell,
  keyLabelOffset,
  hitTestKey,
} from '../../../src/ui/game/KeyConfigLayout.js';

// OG CUIKeyConfig::CalcKeyIconPosInfo @0x7d83d0 — the 6x17 matrix, line Ys and
// wide-key nudges. Non-bindable scancodes (14 Backspace, 28 Enter, 53 '/',
// 58 CapsLock, 15 Tab) are absent from the grid.
describe('KeyConfigLayout grid', () => {
  initLayout();

  it('excludes non-bindable scancodes 14, 28, 53, 58', () => {
    const scs = getBindableScancodes();
    expect(scs).not.toContain(14);
    expect(scs).not.toContain(28);
    expect(scs).not.toContain(53);
    expect(scs).not.toContain(58);
  });

  it('keeps right modifiers bindable', () => {
    const scs = getBindableScancodes();
    expect(scs).toContain(ScRShift);
    expect(scs).toContain(ScRCtrl);
    expect(scs).toContain(ScRAlt);
  });

  it('row1 Backspace spacer keeps Insert/Home/PgUp at their OG x (511/545/579)', () => {
    // OG mat[1]: 41@11, 2..13 every 34, unassigned 58px Backspace spacer at
    // x=453, then Insert(82), Home(71), PageUp(73)
    expect(tryGetCell(13)!.x).toBe(419);
    expect(tryGetCell(82)!.x).toBe(511);
    expect(tryGetCell(71)!.x).toBe(545);
    expect(tryGetCell(73)!.x).toBe(579);
  });

  it('row3 has CapsLock indented and no Enter cap (30..40 at 78..418)', () => {
    expect(tryGetCell(30)!.x).toBe(78);
    expect(tryGetCell(31)!.x).toBe(112);
    expect(tryGetCell(40)!.x).toBe(418);
  });

  it('row4 LShift at 35 (11+nudge), RShift after the unassigned slot at 451', () => {
    expect(tryGetCell(42)!.x).toBe(35);
    expect(tryGetCell(44)!.x).toBe(95);
    expect(tryGetCell(52)!.x).toBe(367);
    expect(tryGetCell(ScRShift)!.x).toBe(451);
  });

  it('hitTestKey remaps right modifiers to their left counterparts', () => {
    const rs = tryGetCell(ScRShift)!;
    expect(hitTestKey(rs.x + 4, rs.y + 4)).toBe(ScLShift);
    const rc = tryGetCell(ScRCtrl)!;
    expect(hitTestKey(rc.x + 4, rc.y + 4)).toBe(ScLCtrl);
    const ra = tryGetCell(ScRAlt)!;
    expect(hitTestKey(ra.x + 4, ra.y + 4)).toBe(ScLAlt);
  });

  it('does not hit-test empty spacers or removed phantom keys', () => {
    // Row1 Backspace spacer occupies x 453..511 at y 28 (no bindable cap)
    expect(hitTestKey(460, tryGetCell(13)!.y + 4)).toBe(-1);
  });
});

// OG CUIKeyConfig::DrawKeys @0x7da030 label nudges
describe('KeyConfigLayout keyLabelOffset', () => {
  it('normal labels are stamped at +4,+4 from the cell origin', () => {
    expect(keyLabelOffset(30)).toEqual({ dx: 4, dy: 4 });
    expect(keyLabelOffset(2)).toEqual({ dx: 4, dy: 4 });
  });

  it('shift labels at +2,+4 and space at +0,+4', () => {
    expect(keyLabelOffset(ScLShift)).toEqual({ dx: 2, dy: 4 });
    expect(keyLabelOffset(ScRShift)).toEqual({ dx: 2, dy: 4 });
    expect(keyLabelOffset(57)).toEqual({ dx: 0, dy: 4 });
  });

  it('keeps every cell within CellSize of its origin', () => {
    for (const sc of getBindableScancodes()) {
      const { dx, dy } = keyLabelOffset(sc);
      expect(dx).toBeGreaterThanOrEqual(0);
      expect(dy).toBe(4);
      expect(dx).toBeLessThan(CellSize);
    }
  });
});
