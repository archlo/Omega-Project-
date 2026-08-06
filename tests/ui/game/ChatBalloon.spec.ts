import { describe, it, expect } from 'vitest';
import { ChatBalloonLayer, computeChatBalloonLayout, decodeClr } from '../../../src/ui/game/ChatBalloon.js';
import { WzTextureLoader } from '../../../src/render/WzTextureLoader.js';

// CChatBalloon (decompile/4A2060.c CheckTimeOut, 4A1300.c AdjustCoordY).
// Without ChatBalloon.img loaded (ui=null here), Draw/Set are no-ops since
// the center-piece sprite (`_c`) gates everything — matches the OG guard
// `if (!this->m_pLayerChat.m_pInterface) return;` in CheckTimeOut.
describe('ChatBalloonLayer', () => {
  it('matches the v95 nine-piece bounds and head anchor math', () => {
    const layout = computeChatBalloonLayout(80, 2, 13,
      { left: 6, right: 6, top: 5, bottom: 5 }, 8, 7, { x: 100, y: 200 });
    expect(layout).toEqual({ x: 54, y: 152, width: 92, height: 36, arrowX: 96, arrowY: 187 });
  });

  it('does nothing without a loaded balloon sprite sheet', () => {
    const layer = new ChatBalloonLayer(new WzTextureLoader(), null, null);
    layer.Set(1, 'hello');
    layer.Update(1);
    layer.Draw(() => ({ x: 0, y: 0 }));
    expect(layer.root.children.length).toBe(0);
  });

  it('Update expires balloons after their TTL with no throw', () => {
    const layer = new ChatBalloonLayer(new WzTextureLoader(), null, null);
    layer.Set(1, 'hello');
    for (let i = 0; i < 10; i++) layer.Update(1);
  });

  it('accepts an explicit fade delay separately from the visible timeout', () => {
    const layer = new ChatBalloonLayer(new WzTextureLoader(), null, null);
    layer.Set(7, 'hello', 2, 0, 0.5);
    expect(layer.activeCount).toBe(0); // no WZ center canvas, matching OG load guard
  });

  // OG CreateCanvas @0x4A59D0: node `clr` is a signed BigInt ARGB — decoded by
  // masking off alpha. Verified against ChatBalloon.img (player 0xFF000000,
  // npc 0xFF800000).
  describe('decodeClr', () => {
    it('decodes a signed BigInt ARGB to RGB', () => {
      expect(decodeClr(-16777216n)).toBe(0x000000); // 0xFF000000 player
      expect(decodeClr(-8388608n)).toBe(0x800000);  // 0xFF800000 npc
    });
    it('masks a plain number', () => {
      expect(decodeClr(0xFF112233)).toBe(0x112233);
    });
    it('defaults to white when no clr is present', () => {
      expect(decodeClr(undefined)).toBe(0xFFFFFF);
      expect(decodeClr(null)).toBe(0xFFFFFF);
    });
  });
});
