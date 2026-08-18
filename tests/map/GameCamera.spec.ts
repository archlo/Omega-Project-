import { describe, it, expect } from 'vitest';
import { GameCamera } from '../../src/map/GameCamera.js';

describe('GameCamera.Shake', () => {
  it('WorldToScreen is exact (no jitter) when no shake is active', () => {
    const cam = new GameCamera({ x: 100, y: 100 });
    cam.ViewWidth = 800;
    cam.ViewHeight = 600;
    const screen = cam.WorldToScreen(100, 100);
    expect(screen.x).toBe(400);
    expect(screen.y).toBe(300);
  });

  it('Shake adds jitter bounded by intensity, decaying to 0 after duration', () => {
    const cam = new GameCamera({ x: 0, y: 0 });
    cam.Shake(20, 100);
    cam.Update(0.05); // 50ms into a 100ms shake
    const mid = cam.WorldToScreen(0, 0);
    expect(Math.abs(mid.x - cam.ViewWidth / 2)).toBeLessThanOrEqual(20);

    cam.Update(0.1); // past the 100ms duration
    const after = cam.WorldToScreen(0, 0);
    expect(after.x).toBe(cam.ViewWidth / 2);
    expect(after.y).toBe(cam.ViewHeight / 2);
  });

  it('centers the camera when the map is narrower than the viewport (211042400 on widescreen)', () => {
    const cam = new GameCamera({ x: -1532, y: -432 });
    cam.ViewWidth = 1920;
    cam.ViewHeight = 1080;
    // Map 211042400 bounds (x -1770..-480, y -638..-200) — 1290px wide, much
    // narrower than the 1920 viewport. Old clamp pinned the camera to
    // left+960 = -810, leaving the map stuck left and objects scattered.
    cam.MapBounds = { left: -1770, top: -638, right: -480, bottom: -200 };
    cam.Target = { x: -1532, y: -432 };
    cam.Update(1);
    // Centered on the map, not pinned to the left edge:
    expect(cam.Position.x).toBeCloseTo((-1770 + -480) / 2);
    expect(cam.Position.y).toBeCloseTo((-638 + -200) / 2);
    // And the full map is visible in the viewport.
    const left = cam.WorldToScreen(-1770, 0).x;
    const right = cam.WorldToScreen(-480, 0).x;
    expect(left).toBeGreaterThanOrEqual(0);
    expect(right).toBeLessThanOrEqual(1920);
  });

  it('still scrolls a map that is wider than the viewport', () => {
    const cam = new GameCamera({ x: 1000, y: 700 });
    cam.ViewWidth = 800;
    cam.ViewHeight = 600;
    cam.MapBounds = { left: 0, top: 0, right: 2000, bottom: 1200 };
    cam.Update(1); // snap-follow → camera lands exactly on the target (1000,700)
    expect(cam.Position.x).toBeCloseTo(1000); // free to follow the target
    // Near the left edge, clamped to left + halfViewport.
    cam.Target = { x: 0, y: 0 };
    cam.Update(1);
    expect(cam.Position.x).toBeCloseTo(400);
    // Near the right edge, clamped to right - halfViewport.
    cam.Target = { x: 2000, y: 1200 };
    cam.Update(1);
    expect(cam.Position.x).toBeCloseTo(1600);
  });

  it('snap-follows the target so the character stays at screen center (OG native-engine camera)', () => {
    const cam = new GameCamera({ x: 500, y: 300 });
    cam.ViewWidth = 800;
    cam.ViewHeight = 600;
    cam.MapBounds = { left: 0, top: 0, right: 2000, bottom: 1200 };
    // A single Update() at any dt snaps the camera onto the target — the
    // character's world position maps to the exact viewport center, matching
    // the v95 native-engine camera that follows the user 1:1 every frame.
    cam.Target = { x: 700, y: 400 };
    cam.Update(0.016);
    const screen = cam.WorldToScreen(700, 400);
    expect(screen.x).toBeCloseTo(400);
    expect(screen.y).toBeCloseTo(300);
    // Continuing to move the target keeps the character pinned at center.
    cam.Target = { x: 900, y: 500 };
    cam.Update(0.016);
    const moved = cam.WorldToScreen(900, 500);
    expect(moved.x).toBeCloseTo(400);
    expect(moved.y).toBeCloseTo(300);
  });
});
