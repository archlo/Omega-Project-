import { describe, it, expect } from 'vitest';
import { Container } from 'pixi.js';
import { FieldScene } from '../../src/map/FieldScene.js';
import { GameCamera } from '../../src/map/GameCamera.js';
import { WzPackage } from '../../src/wz/WzPackage.js';
import { WzTextureLoader } from '../../src/render/WzTextureLoader.js';

// Regression test for the "nothing visible in-game" bug fixed in audit pass 22:
// FieldScene.UpdateEntities()'s job is to re-parent each entity's already-
// constructed `.container` into the scene's per-layer display tree every
// frame. Before the fix, `Draw()` only repositioned each entity's container —
// nothing anywhere ever called `addChild` on it, so the player, other
// players, mobs/npcs, and drops were fully simulated but never actually
// inserted into the Pixi tree (silently invisible, no error). This test
// doesn't need real WZ data — FieldScene's constructor builds its
// `_layerContainers` independently of `Load()`, and `UpdateEntities` only
// touches those layer containers plus the entities passed in.

function makeMockEntity(y: number) {
  return {
    Position: { x: 0, y },
    FootholdId: 0,
    container: new Container(),
    Draw: () => {},
    draw: () => {},
  };
}

describe('FieldScene.UpdateEntities', () => {
  function makeScene(): FieldScene {
    const camera = new GameCamera();
    return new FieldScene(null, { Load: () => null } as any, camera);
  }

  it('parents the player container into the scene graph', () => {
    const field = makeScene();
    const player = makeMockEntity(100) as any;

    expect(player.container.parent).toBeNull();
    field.UpdateEntities([], player, [], null, null, 800, 600);
    expect(player.container.parent).not.toBeNull();
    // Must be a descendant of the field's own root container.
    expect(field.container.children.includes(player.container.parent!)).toBe(true);
  });

  it('parents other-player containers into the scene graph', () => {
    const field = makeScene();
    const other = makeMockEntity(50) as any;

    field.UpdateEntities([other], null, [], null, null, 800, 600);
    expect(other.container.parent).not.toBeNull();
    expect(field.container.children.includes(other.container.parent!)).toBe(true);
  });

  it('parents drop containers into the scene graph', () => {
    const field = makeScene();
    const drop = makeMockEntity(75) as any;

    field.UpdateEntities([], null, [drop], null, null, 800, 600);
    expect(drop.container.parent).not.toBeNull();
    expect(field.container.children.includes(drop.container.parent!)).toBe(true);
  });

  it('re-parents on every call without accumulating duplicate children', () => {
    const field = makeScene();
    const player = makeMockEntity(100) as any;

    field.UpdateEntities([], player, [], null, null, 800, 600);
    const layer = player.container.parent!;
    const countAfterFirst = layer.children.length;
    field.UpdateEntities([], player, [], null, null, 800, 600);
    expect(layer.children.length).toBe(countAfterFirst);
  });
});

describe('FieldScene mob layering (real Henesys map)', () => {
  it('renders a mob in the layer of the foothold it stands on', () => {
    const map = WzPackage.OpenBase('wz_client', 'Map');
    const field = new FieldScene(map, new WzTextureLoader(), new GameCamera({ x: 0, y: 0 }));
    field.Load(100000000);

    // Pick any real foothold and its layer.
    const footholds = field['_footholds'] as Record<number, { Layer: number; X1: number; X2: number; YAt(x: number): number | null }>;
    const fh = Object.values(footholds)[0];
    expect(fh).toBeTruthy();
    const x = (fh.X1 + fh.X2) / 2;
    const y = fh.YAt(x) ?? 0;

    const mob = {
      Position: { x, y },
      Layer: 7, // stale default — must be corrected by LayerAt
      container: new Container(),
    } as any;

    field.UpdateEntities(new Map(), null, [], [mob], null, 800, 600);
    // The mob's container must be attached to the foothold's layer container,
    // not the stale default layer 7.
    const parent = mob.container.parent;
    expect(parent).not.toBeNull();
    const parentIndex = (field['_layerContainers'] as Container[]).indexOf(parent);
    expect(parentIndex).toBe(fh.Layer);
  });
});
