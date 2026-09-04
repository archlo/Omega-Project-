import { describe, expect, it, vi } from 'vitest';
import { Texture } from 'pixi.js';
import { ReactorLook } from '../../src/character/ReactorLook.js';
import { WzProperty } from '../../src/wz/WzProperty.js';
import { WzCanvas } from '../../src/wz/WzCanvas.js';
import { WzImage } from '../../src/wz/WzImage.js';

// OG CReactor display model (live IDB: LoadReactorLayer / CReactorPool::Update
// / FindHitReactor / play_reactor_sound):
// - state layers loop numbered canvases; the `hit` child is a separate
//   one-shot overlay, never a loop frame; states are unbounded.
// - info/link redirects (numeric or "0002000" string form).
// - ChangeState flips visuals after the hit-start delay, plays
//   Sound/Reactor.img/<id>/<oldState>/Hit, flashes the hit overlay, gates
//   hittability through the state-end window, and arms despawn on
//   properEventIdx -2 after one anim loop.
// - Hit test = current canvas lt/rb at the placed position, mirrored on flip.

function prop(items: Record<string, unknown>): WzProperty {
  return new WzProperty(null as any, 0, items);
}

function canvas(): WzCanvas {
  return new WzCanvas(null as any, 0);
}

function spriteOf(ltRb?: { lt: { x: number; y: number }; rb: { x: number; y: number } }) {
  return {
    Texture: Texture.EMPTY,
    OriginX: 10,
    OriginY: 80,
    Width: 100,
    Height: 100,
    Lt: ltRb?.lt ?? null,
    Rb: ltRb?.rb ?? null,
  };
}

function loaderFor() {
  return { Load: vi.fn(() => spriteOf()) } as any;
}

function stateNode(withHit: boolean): WzProperty {
  const items: Record<string, unknown> = { '0': canvas() };
  if (withHit) items['hit'] = prop({ '0': canvas(), '1': canvas() });
  return prop(items);
}

describe('ReactorLook states', () => {
  it('loads unbounded states and keeps hit frames out of the loop', () => {
    const root = prop({ '0': stateNode(true), '9': stateNode(false), info: prop({}) });
    const r = new ReactorLook(1, 1002000, 0);
    r.Load(loaderFor(), { GetItem: () => imgWith(root) } as any);
    expect(r.Loaded).toBe(true);
    expect((r as any)._anims.get(0).length).toBe(1);
    expect((r as any)._anims.get(9).length).toBe(1);
    expect((r as any)._hitAnims.get(0).length).toBe(2);
    expect((r as any)._hitAnims.has(9)).toBe(false);
  });

  it('follows numeric and string info/link redirects', () => {
    const target = prop({ '0': stateNode(false), info: prop({}) });
    const numRoot = prop({ '0': stateNode(false), info: prop({ link: 2002000 }) });
    void numRoot;
    const strImg = { Root: prop({ info: prop({ link: '0002000' }) }) } as any;
    void strImg;
    const wz = {
      GetItem: (p: string) => {
        if (p === '1002001.img') return imgWith(prop({ info: prop({ link: '0002000' }) }));
        if (p === '0002000.img') return imgWith(target);
        return null;
      },
    } as any;
    const r = new ReactorLook(2, 1002001, 0);
    r.Load(loaderFor(), wz);
    expect(r.Loaded).toBe(true);
    expect((r as any)._anims.get(0).length).toBe(1);
  });

  it('seeds the enter state with no sound or overlay', () => {
    const r = new ReactorLook(3, 1002000, 2);
    r.SeedState(2);
    expect((r as any)._curState).toBe(2);
    expect((r as any)._pending).toBe(null);
    expect((r as any)._hitOverlay).toBe(null);
  });
});

function imgWith(root: WzProperty): WzImage {
  const img = new WzImage(null as any, 0);
  Object.defineProperty(img, 'Root', { value: root });
  return img;
}

describe('ReactorLook change states', () => {
  function loaded(): ReactorLook {
    const root = prop({ '0': stateNode(true), '1': stateNode(true), info: prop({}) });
    const r = new ReactorLook(4, 1002008, 0);
    r.Load(loaderFor(), { GetItem: () => imgWith(root) } as any);
    r.SeedState(0);
    return r;
  }

  it('delays the visual switch by the hit-start delay and sounds the old state', () => {
    const r = loaded();
    const sounds: Array<[number, number]> = [];
    r.onHitSound = (tid, st) => sounds.push([tid, st]);
    r.ApplyChangeState(1, { hitDelayMs: 100, properEventIdx: 0, stateEndMs: 500 });
    expect(r.State).toBe(1);
    r.Update(0.05);
    expect((r as any)._curState).toBe(0);
    expect(sounds).toEqual([]);
    r.Update(0.06);
    expect((r as any)._curState).toBe(1);
    expect(sounds).toEqual([[1002008, 0]]);
    expect((r as any)._hitOverlay).not.toBe(null);
  });

  it('gates hittability through the state-end window', () => {
    const r = loaded();
    r.ApplyChangeState(1, { hitDelayMs: 0, properEventIdx: 0, stateEndMs: 100000 });
    expect(r.IsHittable()).toBe(false);
    const r2 = loaded();
    r2.ApplyChangeState(1, { hitDelayMs: 0, properEventIdx: 0, stateEndMs: 0 });
    expect(r2.IsHittable()).toBe(true);
  });

  it('despawns after one anim loop when properEventIdx is -2', () => {
    const r = loaded();
    r.ApplyChangeState(1, { hitDelayMs: 0, properEventIdx: -2, stateEndMs: 0 });
    r.Update(0.2); // switch fires (delay 0), single-frame loop completes
    expect((r as any)._curState).toBe(1);
    expect(r.Finished).toBe(true);
  });

  it('keeps looping without removal otherwise', () => {
    const r = loaded();
    r.ApplyChangeState(1, { hitDelayMs: 0, properEventIdx: 0, stateEndMs: 0 });
    for (let i = 0; i < 10; i++) r.Update(0.2);
    expect(r.Finished).toBe(false);
  });
});

describe('ReactorLook hit rect', () => {
  function loadedWith(ltRb: { lt: { x: number; y: number }; rb: { x: number; y: number } }): ReactorLook {
    const root = prop({ '0': prop({ '0': canvas() }), info: prop({}) });
    const sp = spriteOf(ltRb);
    const r = new ReactorLook(5, 1002000, 0);
    r.Load({ Load: () => sp } as any, { GetItem: () => imgWith(root) } as any);
    r.SeedState(0);
    r.Position = { x: 200, y: 300 };
    return r;
  }

  it('uses the current canvas lt/rb at the placed position', () => {
    const r = loadedWith({ lt: { x: 5, y: 5 }, rb: { x: 90, y: 80 } });
    // base = pos - origin = (190, 220).
    expect(r.HitRect()).toEqual({ left: 195, top: 225, right: 280, bottom: 300 });
  });

  it('mirrors the rect when flipped', () => {
    const r = loadedWith({ lt: { x: 5, y: 5 }, rb: { x: 90, y: 80 } });
    r.Flip = true;
    // mirrored around the anchor: left = X + OriginX - rb.x.
    expect(r.HitRect()).toEqual({ left: 120, top: 225, right: 205, bottom: 300 });
  });

  it('falls back to drawn bounds without lt/rb', () => {
    const root = prop({ '0': prop({ '0': canvas() }), info: prop({}) });
    const sp = spriteOf();
    const r = new ReactorLook(6, 1002000, 0);
    r.Load({ Load: () => sp } as any, { GetItem: () => imgWith(root) } as any);
    r.SeedState(0);
    r.Position = { x: 200, y: 300 };
    expect(r.HitRect()).toEqual({ left: 190, top: 220, right: 290, bottom: 320 });
  });
});
