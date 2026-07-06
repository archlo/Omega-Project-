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
});
