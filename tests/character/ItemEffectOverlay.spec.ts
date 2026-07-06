import { describe, expect, it } from 'vitest';
import { Sprite } from 'pixi.js';
import { ItemEffectOverlay } from '../../src/character/ItemEffectOverlay.js';
import { WzProperty } from '../../src/wz/WzProperty.js';
import { WzVector } from '../../src/wz/WzVector.js';
import { WzTextureLoader } from '../../src/render/WzTextureLoader.js';

function prop(items: Record<string, unknown>): WzProperty {
  return new WzProperty({} as any, 0, items);
}

describe('ItemEffectOverlay', () => {
  it('parses OG CItemEffectManager info/effect metadata', () => {
    const spec = ItemEffectOverlay.ParseSpec(1112905, 12, prop({
      path: 'Effect/CharacterEff.img/1112905',
      emission: 1,
      follow: 1,
      genOnMove: 1,
      interval: 35,
      delay: 900,
      left: -10,
      top: -15,
      right: 10,
      bottom: 5,
      dx: 35,
      theta: 21,
      genPoint: prop({ 0: new WzVector(1, 2), 1: new WzVector(3, 4) }),
      z: -1,
    }));

    expect(spec).toMatchObject({
      itemId: 1112905,
      bodyPart: 12,
      path: 'CharacterEff.img/1112905',
      emission: true,
      follow: true,
      genOnMove: true,
      intervalMs: 35,
      delayMs: 900,
      dx: 35,
      theta: 21,
      anchor: 'face',
    });
    expect(spec?.genPoints).toEqual([{ x: 1, y: 2 }, { x: 3, y: 4 }]);
  });

  it('updates emitter particles and renders relative to the resolved body anchor', () => {
    const overlay = new ItemEffectOverlay(new WzTextureLoader(), null, null, () => 0);
    (overlay as any)._entries.set(7, [{
      spec: {
        itemId: 1002667,
        bodyPart: 1,
        path: 'CharacterEff.img/1002667',
        animate: false,
        follow: true,
        emission: false,
        genOnMove: false,
        noFlip: false,
        fixed: false,
        z: -1,
        intervalMs: 100,
        delayMs: 500,
        left: -10,
        top: -15,
        right: 10,
        bottom: 5,
        dx: 20,
        dy: 10,
        theta: 0,
        genPoints: [],
        anchor: 'body',
      },
      frames: [{ sprite: { NewSprite: () => new Sprite() }, delayMs: 100 }],
      frameIndex: 0,
      frameTimerMs: 0,
      emitTimerMs: 100,
      particles: [],
    }]);

    overlay.Update(0.1);
    const root = overlay.RebuildDisplay(() => ({ face: { x: 0, y: 0 }, body: { x: 50, y: 100 }, facingLeft: false }));
    expect(root.children.length).toBe(1);
    expect(root.children[0].position.x).toBe(60);
    expect(root.children[0].position.y).toBe(95);
  });
});
