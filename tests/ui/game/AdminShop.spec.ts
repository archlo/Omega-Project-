import { describe, expect, it } from 'vitest';
import { AdminShop } from '../../../src/ui/game/AdminShop.js';
import { WzTextureLoader } from '../../../src/render/WzTextureLoader.js';

describe('AdminShop', () => {
  it('shows decoded result/action state and emits reopen for confirmed actions', () => {
    const panel = new AdminShop(new WzTextureLoader(), null);
    let reopened = 0;
    panel.onReopen = (npcTemplateId) => { reopened = npcTemplateId; };

    panel.SetResult(9001000, 3);
    panel.SetAction(1, true);

    expect(panel.isVisible).toBe(true);
    expect((panel as any)._body.text).toContain('NPC: 9001000');
    expect((panel as any)._body.text).toContain('Items: 3');
    expect((panel as any)._body.text).toContain('Last action: 1');

    expect(panel.handleMouseButton(300 + 42, 150 + 120, true)).toBe(true);
    expect(reopened).toBe(9001000);
  });
});
