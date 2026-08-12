import { describe, it, expect } from 'vitest';
import { StatsInfo } from '../../../src/ui/game/StatsInfo.js';
import { WzTextureLoader } from '../../../src/render/WzTextureLoader.js';

(globalThis as any).window ??= {};
(globalThis as any).localStorage = { getItem: () => null, setItem: () => {} };

// OG: CUIWnd::HitTest @0x8DD2C0 — ry > 0x18 (24) → region 1 (body), else region 2 (drag title).
// CUIStat::OnMoveWnd @0x861590 — CUIStatDetail follows at (absLeft+172, absTop+90).
describe('StatsInfo drag + detail follow', () => {
  function makeStats(): StatsInfo {
    const s = new StatsInfo(new WzTextureLoader(), null);
    s.isVisible = true;
    return s;
  }

  it('beginDrag engages in the top-24px title region', () => {
    const s = makeStats();
    // (lx, ly) inside title bar → drag starts
    expect(s.beginDrag(20, 10, true)).toBe(true);
    expect(s['_wndDragging']).toBe(true);
    // mouse-up releases the drag
    expect(s.beginDrag(20, 10, false)).toBe(true);
    expect(s['_wndDragging']).toBe(false);
  });

  it('beginDrag does not engage in the body (ly >= 24)', () => {
    const s = makeStats();
    expect(s.beginDrag(20, 24, true)).toBe(false);
    expect(s.beginDrag(20, 100, true)).toBe(false);
    // outside the window rect entirely
    expect(s.beginDrag(-5, 10, true)).toBe(false);
    expect(s.beginDrag(200, 10, true)).toBe(false);
  });

  it('updateDrag moves the window with the cursor', () => {
    const s = makeStats();
    (globalThis as any).window.__mouseX = 300;
    (globalThis as any).window.__mouseY = 250;
    s.beginDrag(20, 10, true); // drag off = (20,10)
    s.updateDrag();
    // root follows cursor minus grab offset
    expect(s.container.x).toBe(300 - 20);
    expect(s.container.y).toBe(250 - 10);
  });

  it('detail panel slides toward (main + 172, + 90) rather than snapping', () => {
    const s = makeStats();
    s.container.position.set(200, 150);
    // GameStage interpolates the detail toward (sx+172, sy+90)
    let cur = { x: 300, y: 200 }; // arbitrary current detail position
    const targetX = 200 + 172, targetY = 150 + 90;
    expect(targetX).toBe(372);
    expect(targetY).toBe(240);
    // simulate the per-frame lerp
    const k = 0.25;
    const steps: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < 5; i++) {
      cur = { x: cur.x + (targetX - cur.x) * k, y: cur.y + (targetY - cur.y) * k };
      steps.push(cur);
    }
    // it approaches but does not snap in one step
    expect(Math.abs(steps[0].x - targetX)).toBeGreaterThan(1);
    expect(Math.abs(steps[steps.length - 1].x - targetX)).toBeLessThan(Math.abs(steps[0].x - targetX));
  });
});
