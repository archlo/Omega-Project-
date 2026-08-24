import { describe, it, expect } from 'vitest';
import { CharacterRenderer } from '../../src/character/CharacterRenderer.js';
import { CharLook } from '../../src/character/CharLook.js';
import { OtherCharLook } from '../../src/character/OtherCharLook.js';
import { WzTextureLoader } from '../../src/render/WzTextureLoader.js';
import { AvatarLook } from '../../src/domain/AvatarLook.js';

// Canvas shim — pixi Text width measurement needs a 2D context.
class Fake2DContext {
  measureText(text: string) {
    return { width: String(text).length * 8, actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 3 };
  }
  fillText() {} strokeText() {} clearRect() {} fillRect() {}
}
class FakeOffscreenCanvas {
  width = 0; height = 0;
  private _ctx: any;
  getContext() { if (!this._ctx) this._ctx = new Fake2DContext(); return this._ctx; }
}
(globalThis as any).CanvasRenderingContext2D ??= Fake2DContext;
(globalThis as any).OffscreenCanvas ??= FakeOffscreenCanvas;
(globalThis as any).document ??= {
  createElement(tag: string) { return tag === 'canvas' ? new FakeOffscreenCanvas() as any : {}; },
};

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
  it('local player (CharLook): renders the white rect plate below the feet', () => {
    const look = new CharLook(0);
    look.charName = 'Heena';
    (look as any)._updateNameTag();
    // OG default tag: hand-drawn white rect group + Arial 12 white text
    const group = (look as any)._nameTagGroup;
    expect(group).not.toBeNull();
    const text = group.children.find((c: any) => typeof c.text === 'string');
    expect(text.text).toBe('Heena');
    expect(group.children.length).toBeGreaterThan(0);
  });

  it('local player (CharLook): tag counter-flips so text never mirrors', () => {
    const look = new CharLook(0);
    look.charName = 'Heena';
    (look as any)._facingLeft = true; // facing left — container.scale.x = -1
    (look as any)._rebuildDisplay();
    (look as any)._updateNameTag();
    const group = (look as any)._nameTagGroup;
    expect(group).not.toBeNull();
    // Tag counter-flips against the avatar container: scale.x * container.scale.x = 1.
    expect(group.scale.x).toBe((look as any).container.scale.x);
  });

  it('remote char (OtherCharLook): places the name BELOW the feet, not above the head', () => {
    const other = new OtherCharLook(1, 'Test', 50, null);
    (other as any)._rebuildDisplay();
    const name = (other as any)._nameText;
    expect(name).not.toBeNull();
    // OG CUser::DrawNameTags draws just m_sCharacterName (no level prefix).
    expect(name.text).toBe('Test');
    // Plate top at 10, height fontH(12)+6=18 → text centered at 10+9-1=18
    expect(name.y).toBe(18);
  });

  it('remote char medal tag resolves the real item name via itemNameOf', () => {
    const other = new OtherCharLook(1, 'Test', 50, null);
    other.itemNameOf = (id) => `MedalName${id}`;
    other.SetMedalItemId(1122184);
    (other as any)._rebuildDisplay();
    const medal = (other as any)._medalText;
    expect(medal).not.toBeNull();
    // OG type-1006 tag uses CItemInfo::GetItemName, not "Medal[<id>]".
    expect(medal.text).toBe('MedalName1122184');
  });
});
