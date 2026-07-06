import { describe, it, expect } from 'vitest';
import { CharacterRenderer } from '../../src/character/CharacterRenderer.js';
import { CharLook } from '../../src/character/CharLook.js';
import { WzTextureLoader } from '../../src/render/WzTextureLoader.js';
import { AvatarLook } from '../../src/domain/AvatarLook.js';

describe('CharLook container', () => {
  it('sets scale.x = 1 when facing left (no flip)', () => {
    const look = new CharLook(0);
    look.SetAvatar(new AvatarLook());
    look.Update(0, { x: 100, y: 200 }, true, false);
    look.Draw(0, 0, 0, 0);
    expect(look.container.scale.x).toBe(1);
  });

  it('sets scale.x = -1 when facing right (container-level flip)', () => {
    const look = new CharLook(0);
    look.SetAvatar(new AvatarLook());
    look.Update(0, { x: 100, y: 200 }, false, false);
    look.Draw(0, 0, 0, 0);
    expect(look.container.scale.x).toBe(-1);
  });

  it('positions container at world-to-screen coordinates', () => {
    const look = new CharLook(0);
    look.Position = { x: 100, y: 200 };
    look.Draw(50, 70, 800, 600);
    expect(look.container.position.x).toBe(850);
    expect(look.container.position.y).toBe(730);
  });
});

describe('CharacterRenderer anchor mirroring', () => {
  it('does not mirror anchors when facing left', () => {
    const renderer = new CharacterRenderer(null, null, null, new WzTextureLoader());
    const result = renderer.Draw(new AvatarLook(), 'stand1', 0, 50, 100, true);
    expect(result.anchors).toEqual({
      navel: { x: 50, y: 100 },
      head: { x: 50, y: 100 },
      brow: { x: 50, y: 100 },
      muzzle: { x: 50, y: 100 },
    });
  });

  it('mirrors anchor X when facing right (positionX=50 → 2*50 - x)', () => {
    const renderer = new CharacterRenderer(null, null, null, new WzTextureLoader());
    const result = renderer.Draw(new AvatarLook(), 'stand1', 0, 50, 100, false);
    expect(result.anchors).toEqual({
      navel: { x: 50, y: 100 },
      head: { x: 50, y: 100 },
      brow: { x: 50, y: 100 },
      muzzle: { x: 50, y: 100 },
    });
  });

  it('mirrors from draw position when positionX is non-zero', () => {
    const renderer = new CharacterRenderer(null, null, null, new WzTextureLoader());
    const result = renderer.Draw(new AvatarLook(), 'stand1', 0, 30, 40, false);
    // mirror: { x: 2*30 - 30, y: 40 } = { x: 30, y: 40 }
    expect(result.anchors).toEqual({
      navel: { x: 30, y: 40 },
      head: { x: 30, y: 40 },
      brow: { x: 30, y: 40 },
      muzzle: { x: 30, y: 40 },
    });
  });
});

describe('CharLook anchor getters after container flip', () => {
  it('NavelPosition reflects Position + mirrored anchor when facing right', () => {
    const look = new CharLook(0);
    look.SetAvatar(new AvatarLook());
    look.Position = { x: 100, y: 200 };
    // facing right — anchors get mirrored (negated X, since positionX=0 internally)
    look.Update(0, { x: 100, y: 200 }, false, false);
    look.Draw(0, 0, 0, 0);
    // With no WZ data, all anchors = {x: 0, y: 0} (from positionX=0)
    // After mirror when facing right: {x: -0, y: 0} = {x: 0, y: 0}
    expect(look.NavelPosition).toEqual({ x: 100, y: 200 });
  });

  it('NavelPosition unchanged when facing left', () => {
    const look = new CharLook(0);
    look.SetAvatar(new AvatarLook());
    look.Position = { x: 100, y: 200 };
    look.Update(0, { x: 100, y: 200 }, true, false);
    look.Draw(0, 0, 0, 0);
    expect(look.NavelPosition).toEqual({ x: 100, y: 200 });
  });
});
