import { describe, expect, it } from 'vitest';
import { WeddingWishList } from '../../../src/ui/game/WeddingWishList.js';

describe('WeddingWishList', () => {
  it('shows decoded wishes/item tabs and emits get-item for the first item', () => {
    const panel = new WeddingWishList();
    let requested: [number, number] | null = null;
    panel.onGetItem = (tab, idx) => { requested = [tab, idx]; };

    panel.SetResult(10, ['apple', 'ring'], [{ tab: 2, items: [{ itemId: 2000000, quantity: 1 } as any] }]);

    const text = (panel as any)._body.text as string;
    expect(text).toContain('Sub-action: 10');
    expect(text).toContain('apple, ring');
    expect(text).toContain('tab 2: 1 item(s)');

    expect(panel.handleMouseButton(292 + 54, 138 + 158, true)).toBe(true);
    expect(requested).toEqual([2, 0]);
  });
});
