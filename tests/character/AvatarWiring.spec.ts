import { describe, it, expect } from 'vitest';
import { CharLook } from '../../src/character/CharLook.js';
import { OtherCharLook } from '../../src/character/OtherCharLook.js';
import { AvatarLook } from '../../src/domain/AvatarLook.js';

// Regression test for audit pass 24: CharLook.SetAvatar had exactly one real
// caller anywhere in src/ before this fix (CharSelectStage.ts's char-select
// preview screen). Neither GameStage._onSetField (the local player's own
// on-field CharLook, `_player`) nor OtherCharLook's constructor (every other
// player's inner CharLook) ever called it — so `_avatar` stayed permanently
// null for every on-field character, and CharLook._rebuildDisplay's
// `this._avatar === null` branch (the generic placeholder-rectangle path)
// fired unconditionally regardless of whether real WZ equip/skin/face/hair
// art was loaded and ready to draw. `_avatar` itself is private, so these
// tests check it the same way `FieldScene.layering.spec.ts` reaches into
// `_layerContainers` — direct (as any) access to confirm the real internal
// state, not just an external behavioral proxy.

describe('avatar-look wiring', () => {
  it('CharLook.SetAvatar actually assigns the avatar (sanity-check of the field used by both fixes below)', () => {
    const look = new AvatarLook();
    look.skin = 3;
    const charLook = new CharLook(0);
    expect((charLook as any)._avatar).toBeNull();
    charLook.SetAvatar(look);
    expect((charLook as any)._avatar).toBe(look);
  });

  it('OtherCharLook wires its inner CharLook to the real AvatarLook on construction', () => {
    const look = new AvatarLook();
    look.skin = 5;
    look.face = 20000;
    const other = new OtherCharLook(1, 'Tester', 50, look);

    const inner = (other as any)._charLook as CharLook;
    expect(inner).not.toBeNull();
    expect((inner as any)._avatar).toBe(look);
  });

  it('OtherCharLook with no Look data has no inner CharLook at all (placeholder path)', () => {
    const other = new OtherCharLook(2, 'NoLook', 1, null);
    expect((other as any)._charLook).toBeNull();
  });

  it('OtherCharLook creates its inner CharLook when a later avatar update arrives', () => {
    const other = new OtherCharLook(3, 'LateLook', 1, null);
    const look = new AvatarLook();
    look.skin = 2;

    other.UpdateAvatar(look);

    const inner = (other as any)._charLook as CharLook;
    expect(inner).toBeInstanceOf(CharLook);
    expect(inner.AvatarLook).toBe(look);
    expect(other.Look).toBe(look);
  });
});
