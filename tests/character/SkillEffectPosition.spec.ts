import { describe, expect, it, vi } from 'vitest';
import { Sprite } from 'pixi.js';
import { SkillEffectOverlay } from '../../src/character/SkillEffectOverlay.js';
import { WzProperty } from '../../src/wz/WzProperty.js';
import { WzCanvas } from '../../src/wz/WzCanvas.js';
import { GameStage } from '../../src/stages/GameStage.js';

// OG ground truth (live IDA):
// - CUser::ShowSkillEffect anchors ordinary skill effects at the character
//   position (feet origin) on the under-face layer, flip follows the avatar.
// - Shoot skills load the effect into m_pLayerMuzzle at the muzzle origin.
// - The target-side `hit` splash comes from the mob's HITEFFECT queue:
//   ONE indexed variant (SKILLENTRY::GetHitUOLByIndex) at the mob's own
//   position, flipped by the mob's facing.

function prop(items: Record<string, unknown>): WzProperty {
  return new WzProperty(null as any, 0, items);
}

function canvas(offset = 0): WzCanvas {
  const c = new WzCanvas(null as any, offset);
  // Shadow the decoding Property getter — loadFrameSequence only reads delay.
  Object.defineProperty(c, 'Property', { value: prop({}) });
  return c;
}

describe('resolveHitVariant', () => {
  it('selects one indexed variant instead of concatenating all', () => {
    const v0 = prop({ '0': canvas(), '1': canvas() });
    const v1 = prop({ '0': canvas() });
    const hit = prop({ '0': v0, '1': v1 });
    expect(SkillEffectOverlay.resolveHitVariant(hit, 0)).toBe(v0);
    expect(SkillEffectOverlay.resolveHitVariant(hit, 1)).toBe(v1);
    expect(SkillEffectOverlay.resolveHitVariant(hit, 2)).toBe(v0); // wraps
  });

  it('passes through bare canvases and variant-less nodes', () => {
    const c = canvas();
    expect(SkillEffectOverlay.resolveHitVariant(c, 0)).toBe(c);
    expect(SkillEffectOverlay.resolveHitVariant(null, 0)).toBe(null);
    const flat = prop({ '0': canvas(), '1': canvas() });
    // No property-typed children -> returned as-is for the frame loader.
    expect(SkillEffectOverlay.resolveHitVariant(flat, 0)).toBe(flat);
  });
});

describe('PlayAtPosition', () => {
  it('renders at the projected world anchor without consulting char lookup', () => {
    const overlay = new SkillEffectOverlay(null as any);
    const drawn: Sprite[] = [];
    (overlay as any)._buildAnim = () => ({
      Frames: [{
        sprite: {
          NewSprite: () => {
            const s = new Sprite();
            drawn.push(s);
            return s;
          },
        },
        delayMs: 100,
      }],
      TotalDurationMs: 100,
    });
    overlay.PlayAtPosition({}, 111, 222, false);
    const lookup = vi.fn(() => { throw new Error('must not consult char lookup'); });
    const root = overlay.RebuildWorldDisplay(lookup, (wx, wy) => ({ x: wx + 10, y: wy + 20 }));
    expect(lookup).not.toHaveBeenCalled();
    expect(drawn.length).toBe(1);
    expect(drawn[0].position.x).toBe(121);
    expect(drawn[0].position.y).toBe(242);
    expect(root.children.length).toBe(1);
  });
});

describe('_playSkillHit', () => {
  function makeStage(hit: unknown): any {
    const stage: any = Object.create(GameStage.prototype);
    stage._fieldFx = [];
    stage._skillService = { GetCastInfo: () => ({ Hit: hit }) };
    stage._loader = { Load: vi.fn((c: unknown) => ({ canvas: c })) };
    return stage;
  }

  it('anchors the splash at mob feet flipped by mob facing', () => {
    const splash = canvas();
    const stage = makeStage(prop({ '0': splash }));
    stage._playSkillHit(1111003, 500, 600, false, 0);
    expect(stage._loader.Load).toHaveBeenCalledWith(splash);
    expect(stage._fieldFx.length).toBe(1);
    // Feet anchor (no -40 lift), flip follows facing (facingLeft=false -> flip).
    expect(stage._fieldFx[0].x).toBe(500);
    expect(stage._fieldFx[0].y).toBe(600);
    expect(stage._fieldFx[0].flip).toBe(true);
  });

  it('plays exactly the indexed variant', () => {
    // NOTE: distinct canvas offsets — vitest matches calls by deep equality,
    // so structurally identical canvases would be indistinguishable.
    const v0c = canvas(5);
    const v1c = canvas(6);
    const stage = makeStage(prop({ '0': prop({ '0': v0c }), '1': prop({ '0': v1c }) }));
    stage._playSkillHit(1111003, 0, 0, true, 1);
    expect(stage._loader.Load).toHaveBeenCalledWith(v1c);
    expect(stage._loader.Load).not.toHaveBeenCalledWith(v0c);
    expect(stage._fieldFx.length).toBe(1);
  });
});
