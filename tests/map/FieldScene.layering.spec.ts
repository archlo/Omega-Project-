import { describe, it, expect } from 'vitest';
import { Container } from 'pixi.js';
import { FieldScene } from '../../src/map/FieldScene.js';
import { GameCamera } from '../../src/map/GameCamera.js';
import { Foothold } from '../../src/map/Foothold.js';

// Regression test for audit pass 24: FieldScene._updateEntityContainers used
// to derive the player's depth layer from `player.FootholdId` and other
// players' from an `'FootholdId' in ch` runtime check. Neither `CharLook
// .FootholdId` nor any property on `OtherCharLook` was EVER assigned by any
// caller in src/ (grepped exhaustively — only this file ever read it), so
// the `in` check always evaluated false and the player's own field was
// permanently stuck at its `=0` default. Since real WZ foothold ids are
// 1-based, `_footholds[0]` never resolves, so both the player and every
// other player were silently pinned to layer 7 (the topmost layer) forever,
// regardless of which foothold layer they actually stood on — defeating the
// per-layer depth sorting this method's own doc comment claims exists.
// Fixed by deriving the layer from `GetFootholdBelow(x, y)` on the entity's
// live position every frame, the same already-correctly-wired mechanism the
// drops loop in this same method already used.

function makeFoothold(id: number, layer: number, x1: number, x2: number, y: number): Foothold {
  const fh = new Foothold();
  fh.Id = id;
  fh.Layer = layer;
  fh.X1 = x1;
  fh.Y1 = y;
  fh.X2 = x2;
  fh.Y2 = y;
  return fh;
}

function makeMockEntity(x: number, y: number) {
  return {
    Position: { x, y },
    FootholdId: 0,
    container: new Container(),
    Draw: () => {},
    draw: () => {},
  };
}

describe('FieldScene entity depth layering', () => {
  function makeScene(): FieldScene {
    const camera = new GameCamera();
    const field = new FieldScene(null, { Load: () => null } as any, camera);
    // Two horizontally-disjoint footholds on different layers, so an entity's
    // x position alone determines which one it resolves to via
    // GetFootholdBelow.
    field.Footholds[1] = makeFoothold(1, 2, -100, 100, 500);
    field.Footholds[2] = makeFoothold(2, 5, 400, 600, 500);
    return field;
  }

  it('places the player container into its own foothold layer, not always layer 7', () => {
    const field = makeScene();
    const player = makeMockEntity(0, 400) as any; // above foothold 1 (layer 2)

    field.UpdateEntities([], player, [], 800, 600);

    const layerContainers = (field as any)._layerContainers as Container[];
    expect(layerContainers[2].children.includes(player.container)).toBe(true);
    expect(layerContainers[7].children.includes(player.container)).toBe(false);
  });

  it('places other-player containers into their own foothold layer, not always layer 7', () => {
    const field = makeScene();
    const other = makeMockEntity(500, 400) as any; // above foothold 2 (layer 5)

    field.UpdateEntities([other], null, [], 800, 600);

    const layerContainers = (field as any)._layerContainers as Container[];
    expect(layerContainers[5].children.includes(other.container)).toBe(true);
    expect(layerContainers[7].children.includes(other.container)).toBe(false);
  });

  it('falls back to layer 7 when no foothold is below the entity', () => {
    const field = makeScene();
    const stray = makeMockEntity(5000, 5000) as any; // far from both footholds

    field.UpdateEntities([stray], null, [], 800, 600);

    const layerContainers = (field as any)._layerContainers as Container[];
    expect(layerContainers[7].children.includes(stray.container)).toBe(true);
  });
});
