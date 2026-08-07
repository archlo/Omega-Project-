import { describe, expect, it } from 'vitest';
import { Texture, BufferImageSource, Text } from 'pixi.js';
import { NpcLook } from '../../src/character/NpcLook.js';
import { Foothold } from '../../src/map/Foothold.js';
import { WzProperty } from '../../src/wz/WzProperty.js';
import { WzImage } from '../../src/wz/WzImage.js';

// Text.width measurement needs a canvas 2D context; provide the minimal shim.
function installCanvasShim(): void {
  if ((globalThis as any).__mapleclaudeCanvasShim) return;
  (globalThis as any).__mapleclaudeCanvasShim = true;
  class Fake2DContext {
    measureText(text: string) {
      const width = String(text).length * 8;
      return { width, actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 3 };
    }
    fillText() {} strokeText() {} clearRect() {} fillRect() {}
  }
  class FakeOffscreenCanvas {
    width = 0; height = 0;
    private _ctx: any;
    getContext() { if (!this._ctx) this._ctx = new Fake2DContext(); return this._ctx; }
  }
  (globalThis as any).CanvasRenderingContext2D = Fake2DContext;
  (globalThis as any).OffscreenCanvas = FakeOffscreenCanvas;
  (globalThis as any).document = {
    createElement(tag: string) { return tag === 'canvas' ? new FakeOffscreenCanvas() as any : {}; },
  };
}
installCanvasShim();

function prop(items: Record<string, unknown>): WzProperty {
  return new WzProperty(null as any, 0, items);
}

function canvasFrame(w: number, h: number, ox: number, oy: number): any {
  const src = new BufferImageSource({ data: new Uint8Array(w * h * 4), width: w, height: h });
  return { Width: w, Height: h, OriginX: ox, OriginY: oy, Texture: new Texture(src) };
}

describe('NpcLook', () => {
  it('transitions packed movement actions at path element boundaries', () => {
    const npc = new NpcLook(1);
    const animations = new Map<string, any[]>([
      ['stand', [{}]], ['move', [{}]], ['wave', [{}]],
    ]);
    (npc as any)._anims = animations;
    (npc as any)._actionNames = ['wave'];

    npc.ReplayMove({
      originX: 0, originY: 0, originVx: 0, originVy: 0,
      elements: [
        { attr: 0, x: 10, y: 0, vx: 0, vy: 0, fh: 0, moveAction: 2, elapse: 100 },
        { attr: 20, x: 10, y: 0, vx: 0, vy: 0, fh: 0, moveAction: 4, elapse: 0 },
      ],
    } as any);

    expect((npc as any)._state).toBe('move');
    npc.Update(0.1);
    expect((npc as any)._state).toBe('wave');
  });

  it('resolves OG speak labels through String/Npc text', () => {
    const npcRoot = prop({
      speak: prop({ group: prop({ text: 'n0' }) }),
    });
    const npcWz = {
      GetItem(path: string) {
        if (path !== '2071010.img') return null;
        const image = Object.create(WzImage.prototype);
        Object.defineProperty(image, 'Root', { get: () => npcRoot });
        return image;
      },
    } as any;

    const npc = new NpcLook(2071010);
    npc.Load({ Load: () => { throw new Error('no sprites in this fixture'); } } as any, npcWz, (_id, key) => key === 'n0' ? 'Resolved speech' : undefined);

    expect(npc.GetRandomSpeech()).toBe('Resolved speech');
  });

  it('loads OG separate name/function tag fields and hideName flag', () => {
    const npcRoot = prop({
      info: prop({ hideName: 1 }),
    });
    const npcWz = {
      GetItem(path: string) {
        if (path !== '1002005.img') return null;
        const image = Object.create(WzImage.prototype);
        Object.defineProperty(image, 'Root', { get: () => npcRoot });
        return image;
      },
    } as any;

    const npc = new NpcLook(1002005);
    npc.Load({ Load: () => { throw new Error('no sprites in this fixture'); } } as any, npcWz, (_id, key) => {
      if (key === 'name') return 'Mr. Kim';
      if (key === 'func') return 'Storage Keeper';
      return undefined;
    });

    expect(npc.Name).toBe('Mr. Kim');
    expect(npc.FuncName).toBe('Storage Keeper');
    expect(npc.ShowNameTag).toBe(false);
  });

  it('delegates OnChat to the WZ balloon layer via onChatBalloon', () => {
    const npc = new NpcLook(2071010);
    (npc as any)._bEnabled = true;
    (npc as any)._speak = ['{NAME}: hello'];
    const npcWz = {
      GetItem(path: string) {
        if (path !== '2071010.img') return null;
        const image = Object.create(WzImage.prototype);
        Object.defineProperty(image, 'Root', { get: () => prop({}) });
        return image;
      },
    } as any;
    npc.Load({ Load: () => { throw new Error('no sprites in this fixture'); } } as any, npcWz, (_id, key) => key === 'name' ? 'Ellinia' : undefined);

    let bubble: string | null = null;
    npc.onChatBalloon = (text) => { bubble = text; };
    npc.OnChat(0);

    expect(bubble).toBe('Ellinia: hello');
  });

  it('places the name tag BELOW the feet and refreshes the sprite anchor per frame', () => {
    const npc = new NpcLook(1012000);
    // stand frame with a 122x90 canvas, origin (61, 90) = feet at bottom.
    const frame = { sprite: canvasFrame(122, 90, 61, 90), delayMs: 5000 };
    (npc as any)._loaded = true;
    (npc as any)._anims = new Map<string, any[]>([['stand', [frame]]]);
    (npc as any)._state = 'stand';
    (npc as any)._frame = 0;
    (npc as any)._facingLeft = false;
    npc.Name = 'Heena';
    npc.ShowNameTag = true;
    npc.Position = { x: 0, y: 0 };

    // Use a real PixiJS Text so addChild works; the canvas shim handles width.
    (npc as any)._nameText = new Text({ text: 'Heena', style: { fontFamily: 'Arial', fontSize: 12 } });

    (npc as any)._rebuildDisplay();

    // Body sprite anchored at feet: anchor.y = 90/90 = 1 (bottom at position).
    const body = (npc as any)._bodySprite;
    expect(body.anchor.y).toBeCloseTo(1);
    // Name tag container placed BELOW the feet (positive Y, OG v95 name plate).
    const tag = (npc as any)._nameTagContainer;
    expect(tag).not.toBeNull();
    expect(tag.position.y).toBeGreaterThan(0);
    // feet at Height - OriginY = 0; tag at 0 + 30 = 30 (below feet).
    expect(tag.position.y).toBeCloseTo(30);

    // Switch to a taller frame — the anchor must refresh so the NPC stays grounded.
    (npc as any)._anims.set('stand', [{ sprite: canvasFrame(100, 140, 50, 140), delayMs: 5000 }]);
    (npc as any)._rebuildDisplay();
    expect(body.anchor.y).toBeCloseTo(1);
  });

  it('snaps an idle NPC flush to its foothold ground line', () => {
    const npc = new NpcLook(1012000);
    const foothold = new Foothold();
    foothold.Id = 7; foothold.X1 = 100; foothold.Y1 = 200; foothold.X2 = 300; foothold.Y2 = 400;
    npc.FootholdId = 7;
    npc.Position = { x: 200, y: 180 };
    npc.SetFootholds([foothold]);
    // Life y (180) sits 120px above the foothold line — SnapToFoothold pulls
    // the feet down to the ground (interpolated y at x=200 → 300).
    npc.SnapToFoothold();
    expect(npc.Position.y).toBe(300);
  });

  it('skips the foothold snap while a server move path is active', () => {
    const npc = new NpcLook(1012000);
    const foothold = new Foothold();
    foothold.Id = 7; foothold.X1 = 100; foothold.Y1 = 200; foothold.X2 = 300; foothold.Y2 = 400;
    npc.FootholdId = 7;
    npc.Position = { x: 200, y: 180 };
    npc.SetFootholds([foothold]);
    npc.ReplayMove({
      originX: 200, originY: 300, originVx: 0, originVy: 0,
      elements: [{ attr: 0, x: 210, y: 300, vx: 0, vy: 0, fh: 7, moveAction: 2, elapse: 1000 }],
    } as any);
    // Activate the path so the replay reports isMoving.
    npc.Update(0.05);
    npc.Position = { x: 205, y: 299 };
    npc.SnapToFoothold();
    // Position untouched — the server owns movement while active.
    expect(npc.Position).toEqual({ x: 205, y: 299 });
  });
});
