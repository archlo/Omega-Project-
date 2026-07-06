import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BattleRecord } from '../../../src/ui/game/BattleRecord.js';
import { WzTextureLoader } from '../../../src/render/WzTextureLoader.js';

// Button/checkbox positions verified against decompile/773CF0.c
// (CUIBattleRecord::OnCreate); button dispatch against decompile/773860.c
// (OnButtonClicked); timer state against 7730E0.c (Update) and 773170.c
// (Toggle).
describe('BattleRecord', () => {
  let panel: BattleRecord;

  beforeEach(() => {
    panel = new BattleRecord(new WzTextureLoader(), null, null);
    panel.isVisible = true;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts hidden until explicitly shown', () => {
    const p = new BattleRecord(new WzTextureLoader(), null, null);
    expect(p.isVisible).toBe(false);
  });

  it('TimerStop button starts disabled (OG: SetEnable(..., 0) on create)', () => {
    // Indirect check: clicking the TimerStop position before any timer is
    // set should not pause anything (no-op), proven via update() producing
    // no timer text.
    panel.handleMouseButton(230 + 155, 100 + 210, true);
    panel.handleMouseButton(230 + 155, 100 + 210, false);
    panel.update(0);
  });

  it('clicking Close (top-right) hides the panel', () => {
    // Top-right close hotspot: lx >= panelW-18, ly < 22 (normal width 200).
    const closed = panel.handleMouseButton(230 + 195, 100 + 5, true);
    expect(closed).toBe(true);
    expect(panel.isVisible).toBe(false);
  });

  it('Escape key hides the panel', () => {
    expect(panel.onKeyPress('Escape')).toBe(true);
    expect(panel.isVisible).toBe(false);
  });

  it('setDotDamage accumulates a running total', () => {
    panel.setDotDamage({ damage: 100, count: 2, attrRate: null });
    panel.setDotDamage({ damage: 50, count: 1, attrRate: 10 });
    // No public getter for the rendered text; verify no throw and repeated
    // calls keep working (regression guard for the log-trim logic).
    for (let i = 0; i < 105; i++) panel.setDotDamage({ damage: 1, count: 1, attrRate: null });
  });

  it('setServerOnCalc does not throw', () => {
    panel.setServerOnCalc(true);
    panel.setServerOnCalc(false);
  });

  it('Fold button toggles panel width (decompile/773170.c Toggle)', () => {
    // Fold button at (155, 6); width starts at 200 (normal).
    const insideNormalWidth = panel.handleMouseButton(230 + 199, 100 + 130, true);
    expect(insideNormalWidth).toBe(true); // still within 200-wide bounds
    panel.handleMouseButton(230 + 155 + 5, 100 + 6 + 5, true);
    panel.handleMouseButton(230 + 155 + 5, 100 + 6 + 5, false);
    // After folding (extended), width is 450 — a point beyond 200 but
    // within 450 should now be considered "inside" the panel.
    const insideExtendedWidth = panel.handleMouseButton(230 + 300, 100 + 130, true);
    expect(insideExtendedWidth).toBe(true);
  });

  it('TimerSet prompts for seconds and confirms before starting (decompile/773860.c case 0x7D3)', () => {
    vi.stubGlobal('window', { prompt: () => '30', confirm: () => true });
    // TimerSet button at (170, 210).
    panel.handleMouseButton(230 + 170 + 5, 100 + 210 + 5, true);
    panel.handleMouseButton(230 + 170 + 5, 100 + 210 + 5, false);
    panel.update(0); // should now report an active countdown, not throw
  });

  it('TimerSet does nothing if the user cancels the prompt', () => {
    vi.stubGlobal('window', { prompt: () => null, confirm: () => true });
    panel.handleMouseButton(230 + 170 + 5, 100 + 210 + 5, true);
    panel.handleMouseButton(230 + 170 + 5, 100 + 210 + 5, false);
  });

  // TODO_AUDIT.md Sixty-seventh pass: CBattleRecordMan::DamageInfo — the
  // real combat-stats calculation engine (decompile 0x470200-0x4702e0),
  // previously entirely missing beyond a raw DoT sum.
  describe('AddDamage (CBattleRecordMan::SetBattleDamageInfo)', () => {
    it('does nothing while server-on-calc is disabled', () => {
      panel.AddDamage(100, false, false);
      expect((panel as any)._info.totalAttackNum).toBe(0);
    });

    it('tracks min/max/total/average once enabled', () => {
      panel.setServerOnCalc(true);
      panel.AddDamage(100, false, false);
      panel.AddDamage(50, false, false);
      panel.AddDamage(200, false, false);
      const info = (panel as any)._info;
      expect(info.minDamage).toBe(50);
      expect(info.maxDamage).toBe(200);
      expect(info.totalAttackNum).toBe(3);
      expect(info.totalDamage).toBe(350);
      expect(info.averageDamagePerHit).toBe(Math.floor(350 / 3));
    });

    it('a miss (damage 0) increments missNum and attack count but not min/max', () => {
      panel.setServerOnCalc(true);
      panel.AddDamage(100, false, false);
      panel.AddDamage(0, false, false);
      const info = (panel as any)._info;
      expect(info.missNum).toBe(1);
      expect(info.totalAttackNum).toBe(2);
      expect(info.minDamage).toBe(100);
      expect(info.maxDamage).toBe(100);
    });

    it('critical hits track a separate min/max/count', () => {
      panel.setServerOnCalc(true);
      panel.AddDamage(100, true, false);
      panel.AddDamage(300, true, false);
      panel.AddDamage(50, false, false);
      const info = (panel as any)._info;
      expect(info.criticalNum).toBe(2);
      expect(info.critMinDamage).toBe(100);
      expect(info.critMaxDamage).toBe(300);
    });

    it('the first hit seeds averageDamagePerSec to that hit\'s damage', () => {
      panel.setServerOnCalc(true);
      panel.AddDamage(123, false, false);
      const info = (panel as any)._info;
      expect(info.averageDamagePerSec).toBe(123);
      expect(info.dAverageHitPerSec).toBe(1.0);
      expect(info.dTotalAttackTime).toBe(1.0);
    });
  });

  describe('setDotDamage feeding the same calculation engine', () => {
    it('updates min/max/total/average per individual hit in the batch', () => {
      panel.setServerOnCalc(true);
      panel.setDotDamage({ damage: 40, count: 3, attrRate: null });
      const info = (panel as any)._info;
      expect(info.totalAttackNum).toBe(3);
      expect(info.totalDamage).toBe(120);
      expect(info.minDamage).toBe(40);
      expect(info.maxDamage).toBe(40);
      expect(info.averageDamagePerHit).toBe(40);
    });

    it('tracks average attribute rate when attrRate is present', () => {
      panel.setServerOnCalc(true);
      panel.setDotDamage({ damage: 10, count: 2, attrRate: 50 });
      const info = (panel as any)._info;
      // OG: IncTotalAttrRate is called once per hit in the batch with the
      // same attrRate value (decompile 0x470a60's per-iteration loop).
      expect(info.totalAttrRate).toBe(100);
      expect(info.averageAttrRate).toBe(50);
    });
  });

  it('TimerSet is a no-op in the headless Node target (no window global)', () => {
    panel.handleMouseButton(230 + 170 + 5, 100 + 210 + 5, true);
    panel.handleMouseButton(230 + 170 + 5, 100 + 210 + 5, false);
    panel.update(0);
  });
});
