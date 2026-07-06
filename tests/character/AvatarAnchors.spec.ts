import { describe, it, expect } from 'vitest';
import { CharacterRenderer } from '../../src/character/CharacterRenderer.js';
import { CharLook } from '../../src/character/CharLook.js';
import { OtherCharLook } from '../../src/character/OtherCharLook.js';
import { WzTextureLoader } from '../../src/render/WzTextureLoader.js';
import { AvatarLook } from '../../src/domain/AvatarLook.js';

// Real per-frame anchor points (OG CActionFrame::Draw's ptNavel/ptHead/
// ptBrow/ptMuzzle, confirmed live via IDA) replacing the hardcoded
// per-consumer Y-offset guesses ChatBalloon/EmotionBubble/ProjectileOverlay
// previously used. Real-WZ-data behavior (head above brow above navel,
// muzzle from the weapon's own map key) already verified directly against
// Character.wz/Item.wz this session; these guard the no-data fallback path.
describe('CharacterRenderer anchors', () => {
  it('falls back to the draw position for all anchors with no WZ data loaded', () => {
    const renderer = new CharacterRenderer(null, null, null, new WzTextureLoader());
    const result = renderer.Draw(new AvatarLook(), 'stand1', 0, 10, 20, false);
    expect(result.layers).toEqual([[], [], [], [], []]);
    expect(result.anchors).toEqual({
      navel: { x: 10, y: 20 },
      head: { x: 10, y: 20 },
      brow: { x: 10, y: 20 },
      muzzle: { x: 10, y: 20 },
    });
  });
});

describe('CharLook anchor getters', () => {
  it('default to the character\'s own Position with no avatar/renderer loaded', () => {
    const look = new CharLook(0);
    look.Position = { x: 5, y: 7 };
    expect(look.HeadPosition).toEqual({ x: 5, y: 7 });
    expect(look.NavelPosition).toEqual({ x: 5, y: 7 });
    expect(look.BrowPosition).toEqual({ x: 5, y: 7 });
    expect(look.MuzzlePosition).toEqual({ x: 5, y: 7 });
  });
});

describe('OtherCharLook anchor getters', () => {
  it('default to the wrapper\'s own Position with no Look (placeholder) avatar', () => {
    const other = new OtherCharLook(1, 'Test', 50, null);
    other.SetPosition(3, 4);
    expect(other.HeadPosition).toEqual({ x: 3, y: 4 });
    expect(other.MuzzlePosition).toEqual({ x: 3, y: 4 });
  });
});
