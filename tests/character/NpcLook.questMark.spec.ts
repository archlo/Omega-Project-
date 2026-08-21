import { describe, expect, it } from 'vitest';
import { Container, Texture, BufferImageSource } from 'pixi.js';
import { NpcLook, NPC_QUEST_STATE } from '../../src/character/NpcLook.js';
import { WzProperty } from '../../src/wz/WzProperty.js';
import { WzImage } from '../../src/wz/WzImage.js';
import { WzCanvas } from '../../src/wz/WzCanvas.js';

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

/** WZ-sprite stand-in with the surface NpcRead/_drawQuestIcon consumes. */
function fakeSprite(ox: number, oy: number, w = 44, h = 46): any {
  const src = new BufferImageSource({ data: new Uint8Array(w * h * 4), width: w, height: h });
  const holder: any = new Container();
  holder.Width = w; holder.Height = h; holder.OriginX = ox; holder.OriginY = oy;
  holder.Texture = new Texture(src);
  holder.ToPixi = () => new Container();
  return holder;
}

function questIconBaseWz(): any {
  // UIWindow2.img/QuestIcon/1 (Perform) = 2 animated frames.
  // GetItem descends into the img, so the QuestIcon subtree arrives as a
  // plain property node (same shape as StatsInfo's 'UIWindow2.img/Stat/main').
  const questIcon = prop({
    '1': prop({ '0': new WzCanvas(null as any, 0), '1': new WzCanvas(null as any, 0) }),
  });
  return {
    GetItem: (path: string): unknown => {
      if (path === 'UIWindow2.img/QuestIcon') return questIcon;
      return null;
    },
  };
}

function npcTemplateWz(): any {
  return {
    GetItem: (path: string): unknown => {
      if (path === '9999999.img') {
        const img = Object.create(WzImage.prototype);
        Object.defineProperty(img, 'Root', { get: () => prop({ info: prop({}) }) });
        return img;
      }
      return null;
    },
  };
}

describe('NpcLook quest mark (OG CNpc::SetQuestList @0x671980)', () => {
  function makeNpc(): NpcLook {
    const loader = { Load: (_raw: any) => fakeSprite(21, 24) } as any;
    const npc = new NpcLook(9999999, questIconBaseWz() as any);
    npc.Load(loader, npcTemplateWz());
    (npc as any)._anims = new Map([['stand', [{ sprite: fakeSprite(20, 86), delayMs: 150 }]]]);
    (npc as any)._loaded = true;
    (npc as any)._state = 'stand';
    return npc;
  }

  it('renders the state mark anchored at balloonOffset + OG offset math', () => {
    const npc = makeNpc();
    npc.SetQuestList(NPC_QUEST_STATE.Perform);

    expect(npc.QuestState).toBe(NPC_QUEST_STATE.Perform);
    expect(npc.QuestInfoVisible).toBe(true);
    expect((npc as any)._questFrames.length).toBe(2);

    // x = BalloonOffset.x + 20, y = -15 - BalloonOffset.y - height (stand OriginY=86)
    const c = (npc as any)._questIconContainer as Container;
    expect(c.position.x).toBe(20);
    expect(c.position.y).toBe(-101);
    expect(c.children.length).toBe(1);
    expect(npc.QuestList).toEqual([NPC_QUEST_STATE.Perform]);
  });

  it('SetBalloonOffset shifts the mark like the OG m_ptBalloonOffset', () => {
    const npc = makeNpc();
    npc.SetBalloonOffset(10, -20); // e.g. NPC 1300000 special case
    npc.SetQuestList(NPC_QUEST_STATE.Perform);

    const c = (npc as any)._questIconContainer as Container;
    expect(c.position.x).toBe(30);
    expect(c.position.y).toBe(-15 - (-20) - 86);
  });

  it('None hides the layer and clears frames', () => {
    const npc = makeNpc();
    npc.SetQuestList(NPC_QUEST_STATE.PreStart);
    expect(npc.QuestInfoVisible).toBe(true);

    npc.SetQuestList(NPC_QUEST_STATE.None);
    expect(npc.QuestInfoVisible).toBe(false);
    expect(npc.QuestList).toEqual([]);
    expect(((npc as any)._questIconContainer as Container).children.length).toBe(0);
  });

  it('same-state calls early-out; bReload forces a rebuild back to frame 0', () => {
    const npc = makeNpc();
    npc.SetQuestList(NPC_QUEST_STATE.Perform);
    (npc as any)._questFrame = 1;

    npc.SetQuestList(NPC_QUEST_STATE.Perform); // no-op via m_nLastQuestState guard
    expect((npc as any)._questFrame).toBe(1);

    npc.SetQuestList(NPC_QUEST_STATE.Perform, true); // bReload rebuilds
    expect((npc as any)._questFrame).toBe(0);
  });

  it('advances the GA_REPEAT frame animation on Update by the WZ delay', () => {
    const npc = makeNpc();
    npc.SetQuestList(NPC_QUEST_STATE.Perform); // 2 frames, default delay 150ms

    npc.Update(0.1); // 100ms < delay — still frame 0
    expect((npc as any)._questFrame).toBe(0);

    npc.Update(0.1); // cumulative 200ms > 150ms — advance to frame 1
    expect((npc as any)._questFrame).toBe(1);

    npc.Update(0.16); // wraps to frame 0
    expect((npc as any)._questFrame).toBe(0);
  });
});
