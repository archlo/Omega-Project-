import { describe, it, expect } from 'vitest';
import { WzPackage } from '../../../src/wz/WzPackage.js';
import { ToolTipHelper } from '../../../src/ui/game/ToolTipHelper.js';

(globalThis as any).window ??= {};

// OG: CToolTipHelper — loads ToolTipHelp.img/Game/UIWnd/<Panel> from String.wz.
// CUIStat uses StringPool 1993 → "Stat" subtree (13 entries), CUIStatDetail uses
// StringPool 1978 → "StatDetail" (11 entries). CheckAndShow @0x8A0980 PtInRect's
// the cursor and shows the matching entry's Title + Desc.
describe('ToolTipHelper (CToolTipHelper)', () => {
  const nx = process.env.MAPLECLAUDE_NX_DIR;

  it('loads the Stat subtree from the real String.nx (Stat index → Title)', () => {
    if (!nx) return; // env-gated
    const string = WzPackage.Open(`${nx}/String.nx`);
    const h = new ToolTipHelper();
    h.LoadToolTip(string, 'Stat');
    expect(h.count).toBe(13);
    // index 8 = STR, 9 = DEX, 10 = INT, 11 = LUK
    expect(h.entries[8].title).toBe('Strength (STR)');
    expect(h.entries[10].title).toBe('Intelligence (INT)');
    expect(h.entries[12].title).toBe('AP(Ability Point)');
    expect(h.entries[4].title).toBe('Health Point');
    // hit rects parsed from lt/rb Vector2D
    expect(h.entries[8].lt).toEqual({ x: 8, y: 234 });
    expect(h.entries[8].rb).toEqual({ x: 55, y: 250 });
  });

  it('loads the StatDetail subtree from the real String.nx', () => {
    if (!nx) return;
    const string = WzPackage.Open(`${nx}/String.nx`);
    const h = new ToolTipHelper();
    h.LoadToolTip(string, 'StatDetail');
    expect(h.count).toBe(11);
    expect(h.entries[0].title).toBe('Attack');
    expect(h.entries[10].title).toBe('Jump');
    expect(h.entries[2].title).toBe('Weapon Defense');
  });

  it('checkAndShow returns -1 and clears when cursor is outside every rect', () => {
    const h = new ToolTipHelper();
    h.LoadToolTip(null, 'Stat');
    const toolTip = { clearToolTip: () => {}, setToolTipString2: () => {} } as any;
    expect(h.checkAndShow(toolTip, -10, -10, null)).toBe(-1);
  });

  it('hit-tests entries in order and respects maxCount (beginner offset 8)', () => {
    if (!nx) return;
    const string = WzPackage.Open(`${nx}/String.nx`);
    const h = new ToolTipHelper();
    h.LoadToolTip(string, 'Stat');
    let shown = '';
    const toolTip = {
      clearToolTip: () => {},
      setToolTipString2: (_x: number, _y: number, title: string, _desc: string) => { shown = title; },
    } as any;
    // STR row rect is (8,234)-(55,250); cursor inside → index 8.
    expect(h.checkAndShow(toolTip, 20, 240, null)).toBe(8);
    expect(shown).toBe('Strength (STR)');
    // Same cursor with maxCount=8 (beginner) → no entry ≤ 8 contains it → -1.
    shown = '';
    expect(h.checkAndShow(toolTip, 20, 240, 8)).toBe(-1);
    // A row inside the first 8 (HP: (8,104)-(55,119)) still shows for beginners.
    expect(h.checkAndShow(toolTip, 20, 110, 8)).toBe(4);
    expect(shown).toBe('Health Point');
  });
});
