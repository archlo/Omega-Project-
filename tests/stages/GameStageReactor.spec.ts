import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Container, Text } from 'pixi.js';
import { GameStage } from '../../src/stages/GameStage.js';
import { WzPackage } from '../../src/wz/WzPackage.js';
import { ReactorLook } from '../../src/character/ReactorLook.js';

Object.defineProperty(Text.prototype, 'width', { get: () => 0 });
function installCanvasShim(): void {
  if ((globalThis as any).__mapleclaudeCanvasShim) return;
  (globalThis as any).__mapleclaudeCanvasShim = true;
  class Fake2DContext {
    measureText(t: string) { return { width: String(t).length * 8, actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 3 }; }
    fillText() {} strokeText() {} clearRect() {} fillRect() {}
  }
  class FakeCanvas {
    width = 0; height = 0;
    getContext() { return new Fake2DContext(); }
  }
  (globalThis as any).CanvasRenderingContext2D = Fake2DContext;
  (globalThis as any).OffscreenCanvas = FakeCanvas;
  (globalThis as any).document = { createElement: (tag: string) => (tag === 'canvas' ? new FakeCanvas() : {}) };
}
installCanvasShim();

const nxDir = process.env.MAPLECLAUDE_NX_DIR ?? 'wz_client';

// Loader stub producing WzSprite-shaped objects from any canvas.
function makeLoaderStub() {
  return {
    Load: (_canvas: unknown) => ({
      Texture: { width: 58, height: 66 },
      OriginX: 29, OriginY: 33, Width: 58, Height: 66,
      ToPixi: () => new Container(),
      NewSprite: () => new Container(),
    }),
  } as never;
}

describe.skipIf(!existsSync(join(nxDir, 'Reactor.nx')))('GameStage reactor render path', () => {
  it('reactor enter -> Update -> draw puts a textured sprite on the entity layer', async () => {
    const stage: any = Object.create(GameStage.prototype);
    const reactorWz = WzPackage.Open(join(nxDir, 'Reactor.nx'));
    stage._reactorWz = reactorWz;
    stage._loader = makeLoaderStub();
    stage._reactors = new Map();
    stage._employees = new Map();
    stage._summons = new Map();
    stage._townPortals = new Map();
    stage._affectedAreas = new Map();
    stage._openGates = new Map();
    stage._pets = new Map();
    stage._dragons = new Map();
    stage._fieldFx = [];
    stage._coupleHearts = [];
    stage._mobs = new Map();
    stage._npcs = [];
    stage._otherChars = new Map();
    stage._drops = [];
    stage._entityLayer = new Container();
    stage._shopMarkerLayer = new Container();
    stage._skillEffectLayer = new Container();
    stage._itemEffectLayer = new Container();
    stage._projectileLayer = new Container();
    stage._fieldFxLayer = new Container();
    stage._coupleHeartLayer = new Container();
    stage._limitedView = { draw: () => {}, hide: () => {} };
    stage._camera = { WorldToScreen: (x: number, y: number) => ({ x: x + 500, y: y + 300 }) };
    stage._field = {
      Info: { FieldType: 0 },
      GetFootholdBelow: () => null,
      UpdateEntities: () => {},
    };
    stage._bg = { clear: () => {} };
    (stage as any).game = { pixiApp: { screen: { width: 1366, height: 768 } } };
    stage._dmgNumbers = null;
    stage._shopMarker = null;
    stage._tombstone = null;
    stage._chatBalloon = null;
    stage._skillEffects = null;
    stage._itemEffects = null;
    stage._projectiles = { RebuildDisplay: () => new Container() };

    // Same as _onReactorEnter
    const look = new ReactorLook(777, 1012000, 0);
    look.Load(stage._loader, stage._reactorWz);
    look.Position = { x: -408, y: 596 };
    stage._reactors.set(777, look);

    look.Update(0.016); // per-frame update tick (GameStage:2838)
    stage.draw();

    expect(stage._entityLayer.children.length).toBe(1);
    const placed = stage._entityLayer.children[0];
    expect(placed.x).toBe(-408 + 500);
    expect(placed.y).toBe(596 + 300);
    // Real WZ load: container holds a Sprite child (not the placeholder box)
    expect((look as unknown as { _loaded: boolean })._loaded).toBe(true);
    expect(look.container.children.length).toBeGreaterThan(0);
  });

  it('OpenBaseAsync resolves the Reactor package the way _loadWzAsync opens it', async () => {
    // GameStage uses WzPackage.OpenBaseAsync(dir, 'Reactor') — pin that it
    // returns a package whose GetItem finds template imgs.
    const pkg = await WzPackage.OpenBaseAsync(nxDir, 'Reactor');
    expect(pkg).not.toBeNull();
    const node = (pkg as unknown as { GetItem: (p: string) => unknown }).GetItem('1012000.img');
    expect(node).toBeTruthy();
  });
});

describe('GameStage._onReactorEnter (OG CReactorPool::OnReactorEnterField 0x6CF490)', () => {
  // Harness mirroring the warp window: SetField clears + starts the fade, the
  // terrain swap happens later, so reactor packets arrive while _field is
  // still the PREVIOUS map.
  function makeStageDuringTransition(): any {
    const stage: any = Object.create(GameStage.prototype);
    stage._reactorWz = null; // batch-2 WZ load not finished
    stage._loader = makeLoaderStub();
    stage._reactors = new Map();
    stage._employees = new Map();
    stage._summons = new Map();
    stage._townPortals = new Map();
    stage._affectedAreas = new Map();
    stage._openGates = new Map();
    stage._pets = new Map();
    stage._dragons = new Map();
    stage._fieldFx = [];
    stage._coupleHearts = [];
    stage._mobs = new Map();
    stage._npcs = [];
    stage._otherChars = new Map();
    stage._drops = [];
    stage._entityLayer = new Container();
    stage._shopMarkerLayer = new Container();
    stage._skillEffectLayer = new Container();
    stage._itemEffectLayer = new Container();
    stage._projectileLayer = new Container();
    stage._fieldFxLayer = new Container();
    stage._coupleHeartLayer = new Container();
    stage._limitedView = { draw: () => {}, hide: () => {} };
    stage._camera = { WorldToScreen: (x: number, y: number) => ({ x: x + 500, y: y + 300 }) };
    // OLD field still mounted during the fade — its footholds must NOT touch
    // newly-entered reactors.
    stage._field = {
      Info: { FieldType: 0 },
      GetFootholdBelow: () => { throw new Error('clamp must be gone'); },
      UpdateEntities: () => {},
    };
    stage._bg = { clear: () => {} };
    (stage as any).game = { pixiApp: { screen: { width: 1366, height: 768 } } };
    stage._dmgNumbers = null;
    stage._shopMarker = null;
    stage._tombstone = null;
    stage._chatBalloon = null;
    stage._skillEffects = null;
    stage._itemEffects = null;
    stage._projectiles = { RebuildDisplay: () => new Container() };
    return stage;
  }

  it('keeps the exact wire x/y — no foothold clamp against the old map', () => {
    const stage = makeStageDuringTransition();
    stage._onReactorEnter({ objId: 1, templateId: 1012000, state: 0, x: -408, y: 596, flip: false, name: '' });
    const r = stage._reactors.get(1);
    expect(r.Position).toEqual({ x: -408, y: 596 });
  });

  it('applies bFlip to the container and builds the display immediately', () => {
    const stage = makeStageDuringTransition();
    stage._onReactorEnter({ objId: 2, templateId: 1012000, state: 0, x: 10, y: 20, flip: true, name: '' });
    const r = stage._reactors.get(2);
    expect(r.container.scale.x).toBe(-1);
    // EnsureDisplay ran even though Reactor.wz was still opening (placeholder).
    expect(r.container.children.length).toBeGreaterThan(0);
  });

  it('retries Load once Reactor.wz becomes available (late WZ sweep in update)', async () => {
    const stage = makeStageDuringTransition();
    stage._onReactorEnter({ objId: 3, templateId: 1012000, state: 0, x: 0, y: 0, flip: false, name: '' });
    let r = stage._reactors.get(3);
    expect(r.Loaded).toBe(false);

    stage._reactorWz = WzPackage.Open(join(nxDir, 'Reactor.nx'));
    (stage as unknown as { _sweepReactorLoads(): void })._sweepReactorLoads();
    expect(r.Loaded).toBe(true);
    expect((r as unknown as { _anims: Map<number, unknown[]> })._anims.size).toBeGreaterThanOrEqual(4);
  });
});
