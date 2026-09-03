import { describe, expect, it, vi } from 'vitest';
import { Sprite } from 'pixi.js';
import { WzProperty } from '../../src/wz/WzProperty.js';
import { WzCanvas } from '../../src/wz/WzCanvas.js';
import { FieldScene } from '../../src/map/FieldScene.js';
import { GameCamera } from '../../src/map/GameCamera.js';

// OG ground truth (live IDB):
// - CMapLoadable::MakeObj registers map entries with a non-empty `name` in
//   m_mNamedObj with per-state layers from the Obj.wz node's s0/s1/... children.
// - CMapLoadable::SetObjectState flips the named layer (range-checked) and
//   restarts its animation; CField::OnSetObjectState and
//   CField::OnFieldObstacleOnOff both feed it (name, state) pairs.
// - MakeObstacles gates on the Obj.wz `obstacle` flag; safe-zone rects come
//   from `safeZoneByMob` objs at the placed position (canvas lt/rb).
// - SetFieldMagLevel rebuilds obj/back layers on video-detail change.

function prop(items: Record<string, unknown>): WzProperty {
  return new WzProperty(null as any, 0, items);
}

function canvas(): WzCanvas {
  const c = new WzCanvas(null as any, 0);
  Object.defineProperty(c, 'Property', { value: prop({}) });
  return c;
}

function frameSprite() {
  return { OriginX: 5, OriginY: 5, Width: 20, Height: 20, Lt: { x: 1, y: 1 }, Rb: { x: 18, y: 18 } };
}

function anim() {
  return { Current: frameSprite(), Update: vi.fn(), Restart: vi.fn(), Draw: () => new Sprite(), FrameCount: 1 };
}

function makeScene(objNode: unknown): any {
  const loader = { Load: () => frameSprite(), LoadAnimation: () => anim() };
  const mapWz = { GetItem: (p: string) => (p.startsWith('Obj/') ? objNode : null) };
  const scene: any = new FieldScene(mapWz as any, loader as any, new GameCamera());
  return scene;
}

function layerWith(entryItems: Record<string, unknown>): WzProperty {
  return prop({ info: prop({}), obj: prop({ '0': prop(entryItems) }) });
}

describe('FieldScene named obj states', () => {
  it('registers named objs with s0/s1 states and flips on SetObjectState', () => {
    const objNode = prop({ s0: prop({ '0': canvas() }), s1: prop({ '0': canvas() }) });
    const scene = makeScene(objNode);
    const root = prop({ '0': layerWith({ oS: 'acc1', l0: 'a', l1: 'b', l2: 'c', x: 100, y: 200, z: 1, f: 0, name: 'door1' }) });
    scene._loadLayers(root);
    const named = scene._namedObjs.get('door1');
    expect(named).toBeDefined();
    expect(named.draw.states.length).toBe(2);
    expect(named.draw.stateIndex).toBe(0);
    expect(scene.SetObjectState('door1', 1)).toBe(true);
    expect(named.draw.stateIndex).toBe(1);
    expect(named.draw.states[1].Restart).toHaveBeenCalled();
    expect(scene.SetObjectState('door1', 2)).toBe(false);
    expect(scene.SetObjectState('nope', 0)).toBe(false);
    expect(named.draw.stateIndex).toBe(1);
  });

  it('treats stateless objs as a single state and skips the registry', () => {
    const objNode = prop({ '0': canvas() });
    const scene = makeScene(objNode);
    const root = prop({ '0': layerWith({ oS: 'acc1', l0: 'a', l1: 'b', l2: 'c', x: 0, y: 0, z: 0, f: 0 }) });
    scene._loadLayers(root);
    expect(scene._objLayers[0].length).toBe(1);
    expect(scene._objLayers[0][0].states.length).toBe(1);
    expect(scene._namedObjs.size).toBe(0);
  });

  it('builds safe-zone rects only for safeZoneByMob obstacles', () => {
    const safeNode = prop({ '0': canvas(), obstacle: 1, safeZoneByMob: 1 });
    const plainNode = prop({ '0': canvas(), obstacle: 1 });
    let which = 0;
    const loader = { Load: () => frameSprite(), LoadAnimation: () => anim() };
    const mapWz = { GetItem: () => (which++ === 0 ? safeNode : plainNode) };
    const scene: any = new FieldScene(mapWz as any, loader as any, new GameCamera());
    const root = prop({
      '0': prop({
        info: prop({}),
        obj: prop({
          '0': prop({ oS: 'a', l0: 'a', l1: 'a', l2: 'a', x: 100, y: 200, z: 0, f: 0 }),
          '1': prop({ oS: 'b', l0: 'b', l1: 'b', l2: 'b', x: 500, y: 500, z: 0, f: 0 }),
        }),
      }),
    });
    scene._loadLayers(root);
    // Sprite 20x20 at origin (5,5), lt (1,1), rb (18,18), placed at (100,200).
    expect(scene._safeZones).toEqual([{ left: 96, top: 196, right: 113, bottom: 213 }]);
    expect(scene.IsInSafeZone({ x: 100, y: 200, w: 10, h: 10 })).toBe(true);
    expect(scene.IsInSafeZone({ x: 500, y: 500, w: 10, h: 10 })).toBe(false);
    expect(scene.IsInSafeZone({ x: 0, y: 0, w: 10, h: 10 })).toBe(false);
  });

  it('RefreshMagLevel rebuilds layers and resets named states', () => {
    const objNode = prop({ s0: prop({ '0': canvas() }), s1: prop({ '0': canvas() }) });
    const scene = makeScene(objNode);
    const root = prop({ '0': layerWith({ oS: 'acc1', l0: 'a', l1: 'b', l2: 'c', x: 0, y: 0, z: 0, f: 0, name: 'door1' }) });
    scene._loadLayers(root);
    scene._loaded = true;
    scene._lastRoot = root;
    scene._mapScene = { Load: vi.fn(), update: vi.fn(), SetCamera: vi.fn() };
    expect(scene.SetObjectState('door1', 1)).toBe(true);
    scene.RefreshMagLevel();
    expect(scene._mapScene.Load).toHaveBeenCalledWith(root);
    expect(scene._namedObjs.get('door1').draw.stateIndex).toBe(0);
  });

  it('RefreshMagLevel is a no-op before any map loads', () => {
    const scene = makeScene(prop({}));
    scene._mapScene = { Load: vi.fn() };
    expect(() => scene.RefreshMagLevel()).not.toThrow();
    expect(scene._mapScene.Load).not.toHaveBeenCalled();
  });
});
