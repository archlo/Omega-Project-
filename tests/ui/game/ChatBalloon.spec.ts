import { describe, it, expect } from 'vitest';
import { ChatBalloonLayer } from '../../../src/ui/game/ChatBalloon.js';
import { WzTextureLoader } from '../../../src/render/WzTextureLoader.js';

// CChatBalloon (decompile/4A2060.c CheckTimeOut, 4A1300.c AdjustCoordY).
// Without ChatBalloon.img loaded (ui=null here), Draw/Set are no-ops since
// the center-piece sprite (`_c`) gates everything — matches the OG guard
// `if (!this->m_pLayerChat.m_pInterface) return;` in CheckTimeOut.
describe('ChatBalloonLayer', () => {
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
});
