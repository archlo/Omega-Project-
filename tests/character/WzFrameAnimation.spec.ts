import { describe, it, expect } from 'vitest';
import { loadFrameSequence, totalDurationMs } from '../../src/character/WzFrameAnimation.js';
import { WzTextureLoader } from '../../src/render/WzTextureLoader.js';

// Shared by EmotionBubble/SkillEffectOverlay/TombstoneEffect — each
// independently reimplemented this exact "numbered WZ canvas children,
// optional single-canvas fallback" shape before this consolidation.
describe('loadFrameSequence', () => {
  it('returns no frames for null/unresolvable nodes', () => {
    const loader = new WzTextureLoader();
    expect(loadFrameSequence(loader, null)).toEqual([]);
    expect(loadFrameSequence(loader, undefined)).toEqual([]);
    expect(loadFrameSequence(loader, 'not a wz node')).toEqual([]);
  });

  it('totalDurationMs sums an empty sequence to 0', () => {
    expect(totalDurationMs([])).toBe(0);
  });

  it('totalDurationMs sums per-frame delays', () => {
    const frames = [
      { sprite: {} as any, delayMs: 50 },
      { sprite: {} as any, delayMs: 120 },
    ];
    expect(totalDurationMs(frames)).toBe(170);
  });
});
