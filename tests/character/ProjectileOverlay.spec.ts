import { describe, it, expect } from 'vitest';
import { ProjectileOverlay } from '../../src/character/ProjectileOverlay.js';

describe('ProjectileOverlay', () => {
  it('interpolates from start to end over the spawn duration', () => {
    const overlay = new ProjectileOverlay();
    overlay.Spawn(0, 0, 100, 0, 100);
    overlay.Update(0.05); // 50ms of 100ms
    const mid = overlay.RebuildDisplay((wx, wy) => ({ x: wx, y: wy }));
    expect(mid.children).toHaveLength(1);
    expect(mid.children[0].x).toBeCloseTo(50, 0);
  });

  it('expires and is removed after its duration elapses', () => {
    const overlay = new ProjectileOverlay();
    overlay.Spawn(0, 0, 100, 0, 100);
    overlay.Update(0.2); // past 100ms
    const after = overlay.RebuildDisplay((wx, wy) => ({ x: wx, y: wy }));
    expect(after.children).toHaveLength(0);
  });

  it('Clear removes all in-flight projectiles', () => {
    const overlay = new ProjectileOverlay();
    overlay.Spawn(0, 0, 100, 0, 100);
    overlay.Clear();
    const display = overlay.RebuildDisplay((wx, wy) => ({ x: wx, y: wy }));
    expect(display.children).toHaveLength(0);
  });

  it('draws chain lightning as one segmented graphic and expires it', () => {
    const overlay = new ProjectileOverlay();
    overlay.SpawnChainLightning([{ x: 0, y: 0 }, { x: 96, y: 0 }, { x: 144, y: 48 }], 100);
    const display = overlay.RebuildDisplay((wx, wy) => ({ x: wx, y: wy }));
    expect(display.children).toHaveLength(1);

    overlay.Update(0.2);
    expect(overlay.RebuildDisplay((wx, wy) => ({ x: wx, y: wy })).children).toHaveLength(0);
  });

  it('can fade projectiles over their lifetime', () => {
    const overlay = new ProjectileOverlay();
    overlay.Spawn(0, 0, 100, 0, 100, undefined, true);
    overlay.Update(0.05);
    const mid = overlay.RebuildDisplay((wx, wy) => ({ x: wx, y: wy }));
    expect(mid.children[0].alpha).toBeCloseTo(0.5, 1);
  });
});
