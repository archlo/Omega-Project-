import { describe, it, expect } from 'vitest';
import { Sprite } from 'pixi.js';
import { SkillEffectOverlay } from '../../src/character/SkillEffectOverlay.js';
import { WzTextureLoader } from '../../src/render/WzTextureLoader.js';

// Skill.wz's effect/effect0/screen nodes are confirmed (live WZ inspection)
// to be numeric-keyed canvas sequences with gaps (e.g. 0..18 then 27), each
// canvas carrying its own `delay`. Without real WZ data loaded these calls
// are no-ops, matching the same "missing asset" guard pattern as
// ChatBalloonLayer/EmotionBubble.
describe('SkillEffectOverlay', () => {
  it('does nothing for null/unresolvable nodes', () => {
    const overlay = new SkillEffectOverlay(new WzTextureLoader());
    overlay.PlayAtCaster(null, 1);
    overlay.PlayAtCaster(undefined, 1);
    overlay.PlayFullScreen(null);
    overlay.Update(1);
    const world = overlay.RebuildWorldDisplay(() => ({ x: 0, y: 0 }));
    const screen = overlay.RebuildScreenDisplay({ x: 0, y: 0 });
    expect(world.children.length).toBe(0);
    expect(screen.children.length).toBe(0);
  });

  it('Clear empties both layers with no throw', () => {
    const overlay = new SkillEffectOverlay(new WzTextureLoader());
    overlay.PlayAtCaster(null, 1);
    overlay.PlayFullScreen(null);
    overlay.Clear();
    for (let i = 0; i < 5; i++) overlay.Update(1);
  });

  it('RebuildWorldDisplay drops entries whose charScreenPos resolves to null', () => {
    const overlay = new SkillEffectOverlay(new WzTextureLoader());
    const world = overlay.RebuildWorldDisplay(() => null);
    expect(world.children.length).toBe(0);
  });

  it('RebuildWorldDisplay uses live caster facing when provided', () => {
    const overlay = new SkillEffectOverlay(new WzTextureLoader());
    (overlay as any)._worldEntries.push({
      Animation: { Frames: [{ sprite: { NewSprite: (flip: boolean) => { const s = new Sprite(); s.scale.x = flip ? -1 : 1; return s; } }, delayMs: 100 }], TotalDurationMs: 100 },
      CharId: 7,
      FacingLeft: true,
      FrameIndex: 0,
      FrameTimerMs: 0,
      TotalAgeMs: 0,
      Hold: false,
    });

    const world = overlay.RebuildWorldDisplay(() => ({ x: 0, y: 0, facingLeft: false }));
    expect((world.children[0] as Sprite).scale.x).toBe(-1);
  });

  it('loops keyed caster effects until cancelled', () => {
    const overlay = new SkillEffectOverlay(new WzTextureLoader());
    (overlay as any)._worldEntries.push({
      Animation: {
        Frames: [
          { sprite: { NewSprite: () => new Sprite() }, delayMs: 100 },
          { sprite: { NewSprite: () => new Sprite() }, delayMs: 100 },
        ],
        TotalDurationMs: 200,
      },
      CharId: 7,
      Key: 'activeItem',
      FacingLeft: true,
      FrameIndex: 0,
      FrameTimerMs: 0,
      TotalAgeMs: 0,
      Hold: false,
      Repeat: true,
    });

    overlay.Update(0.25);
    expect((overlay as any)._worldEntries[0].FrameIndex).toBe(0);
    overlay.CancelLoopAtCaster('activeItem', 7);
    expect((overlay as any)._worldEntries.length).toBe(0);
  });
});
