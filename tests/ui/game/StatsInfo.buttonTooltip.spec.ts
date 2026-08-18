import { describe, it, expect } from 'vitest';
import { StatsInfo } from '../../../src/ui/game/StatsInfo.js';
import { WzTextureLoader } from '../../../src/render/WzTextureLoader.js';
import { WzProperty } from '../../../src/wz/WzProperty.js';
import { WzPackage } from '../../../src/wz/WzPackage.js';
import { Button } from '../../../src/ui/Button.js';

// OG: CUIStat::OnCreate @0x867B90 calls CCtrlButton::LoadToolTip for BtAuto /
// BtAuto1 / BtAuto2 with StringPool 1988/1989/1990 → ToolTipHelp.img/Game/Button/
// StatAuto, StatAuto1, StatAuto2 (Title + Desc children). The button control then
// shows the tooltip on hover. These were never wired in TS — this covers them.
describe('StatsInfo auto-AP button tooltips (OG CCtrlButton::LoadToolTip)', () => {
  function makeStats(): StatsInfo {
    (globalThis as any).localStorage = { getItem: () => null, setItem: () => {} };
    return new StatsInfo(new WzTextureLoader(), null);
  }

  function buttonAt(x: number, y: number, w = 16, h = 16): Button {
    const b = new Button();
    b.position = { x, y };
    b.width = w;
    b.height = h;
    b.container.visible = true;
    return b;
  }

  it('_loadButtonToolTip reads Title + Desc from the Button subtree', () => {
    const s = makeStats();
    const btn = buttonAt(0, 0);
    const stringWz = {
      GetItem: (path: string) =>
        path === 'ToolTipHelp.img/Game/Button/StatAuto'
          ? new WzProperty(null as any, 0, {
              Title: 'Stat Auto-Assign',
              Desc: 'Distributes the remaining AP according to your level and class.',
            })
          : null,
    };
    (s as any)._stringWz = () => stringWz;
    (s as any)._loadButtonToolTip(btn, 'StatAuto');
    expect(btn.toolTipTitle).toBe('Stat Auto-Assign');
    expect(btn.toolTipDesc).toBe('Distributes the remaining AP according to your level and class.');
  });

  it('_loadButtonToolTip leaves the button tooltip empty when the subtree is missing', () => {
    const s = makeStats();
    const btn = buttonAt(0, 0);
    (s as any)._stringWz = () => ({ GetItem: () => null });
    (s as any)._loadButtonToolTip(btn, 'StatAuto');
    expect(btn.toolTipTitle).toBeNull();
  });

  it('hovering an auto-AP button shows its tooltip via SetToolTip_String2', () => {
    const s = makeStats();
    s.isVisible = true;
    s._root.x = 0;
    s._root.y = 0;
    let shownTitle = '';
    let shownDesc = '';
    const fakeTip = {
      container: { parent: {} }, // non-null parent → skips addChild
      clearToolTip: () => {},
      setToolTipString2: (_x: number, _y: number, title: string, desc: string) => {
        shownTitle = title;
        shownDesc = desc;
      },
    };
    (s as any)._toolTip = fakeTip;
    const btn = buttonAt(20, 20);
    btn.setToolTip('Stat Auto-Assign', 'Distributes AP by class.');
    (s as any)._btAuto = btn;

    // Cursor over the button (button bounds 20..36 x 20..36).
    s.handleMouseMove(25, 25);
    expect(shownTitle).toBe('Stat Auto-Assign');
    expect(shownDesc).toBe('Distributes AP by class.');
    expect((s as any)._tooltipShown).toBe(true);
  });

  it('a non-tooltip button does not hijack the stat-row tooltip path', () => {
    const s = makeStats();
    s.isVisible = true;
    s._root.x = 0;
    s._root.y = 0;
    const btn = buttonAt(20, 20); // no tooltip loaded
    (s as any)._btAuto = btn;
    // Falls through to the EXP/CToolTipHelper path without throwing.
    expect(() => s.handleMouseMove(25, 25)).not.toThrow();
  });

  it('loads the real StatAuto subtrees from String.nx (env-gated)', () => {
    const nx = process.env.MAPLECLAUDE_NX_DIR;
    if (!nx) return; // env-gated
    const s = makeStats();
    (s as any)._stringWz = () => WzPackage.Open(`${nx}/String.nx`);

    const auto = buttonAt(0, 0);
    (s as any)._loadButtonToolTip(auto, 'StatAuto');
    expect(auto.toolTipTitle).toBe('Stat Auto-Assign');
    expect(auto.toolTipDesc).toContain('Distributes the remaining AP');

    const auto1 = buttonAt(0, 0);
    (s as any)._loadButtonToolTip(auto1, 'StatAuto1');
    expect(auto1.toolTipTitle).toBe('Stat Auto-Assign (Brawler)');

    const auto2 = buttonAt(0, 0);
    (s as any)._loadButtonToolTip(auto2, 'StatAuto2');
    expect(auto2.toolTipTitle).toBe('Stat Auto-Assign (Gunslinger)');
  });
});

// OG: CUIStat::OnMouseMove @0x8649D0 — EXP tooltip uses StringPool 0x1A37
// Format(exp, next) — exactly 2 args (next-level EXP is NOT on the panel; the
// "%" pct was an invented third value).
describe('StatsInfo EXP tooltip format (OG 0x1A37, 2 args)', () => {
  it('builds a 2-arg EXP tooltip (exp, next) without a pct', () => {
    (globalThis as any).localStorage = { getItem: () => null, setItem: () => {} };
    const s = new StatsInfo(new WzTextureLoader(), null);
    s.isVisible = true;
    s.exp = 100;
    s.nextLevelExp = 500;
    let tipText = '';
    const fakeTip = {
      container: { parent: {} }, // non-null parent → skips addChild
      clearToolTip: () => {},
      setToolTipString: (_x: number, _y: number, text: string) => { tipText = text; },
    };
    (s as any)._toolTip = fakeTip;

    s.handleMouseMove(60, 140); // inside (55,138,110,14)
    expect(tipText).toBe('EXP: 100 / 500');
  });
});
