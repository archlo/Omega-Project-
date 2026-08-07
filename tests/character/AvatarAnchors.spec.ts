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

describe('Character name tags BELOW the feet (OG CLife::MakeNameTag type 1000)', () => {
  it('local player (CharLook): renders the name below the feet', () => {
    const look = new CharLook(0);
    look.charName = 'Heena';
    (look as any)._updateNameTag();
    const tag = (look as any)._nameTag;
    expect(tag).not.toBeNull();
    expect(tag.text).toBe('Heena');
    expect(tag.y).toBe(10);           // padding below the feet
    expect(tag.anchor.y).toBe(1);     // bottom-center anchor
    expect(tag.scale.x).toBe(1);      // no flip → not mirrored
  });

  it('local player (CharLook): counter-flips with the avatar so text stays readable', () => {
    const look = new CharLook(0);
    look.charName = 'Heena';
    (look as any)._facingLeft = false; // facing right → container.scale.x = -1
    (look as any)._rebuildDisplay();   // sets container.scale.x = -1
    (look as any)._updateNameTag();
    const tag = (look as any)._nameTag;
    expect(tag).not.toBeNull();
    // tag.scale.x == container.scale.x == -1 → net 1 (reads normally)
    expect(tag.scale.x).toBe(-1);
  });

  it('remote char (OtherCharLook): places the name BELOW the feet, not above the head', () => {
    const other = new OtherCharLook(1, 'Test', 50, null);
    (other as any)._rebuildDisplay();
    const name = (other as any)._nameText;
    expect(name).not.toBeNull();
    expect(name.text).toBe('[50] Test');
    expect(name.y).toBe(10); // below feet (was -78 above the head)
  });
});
