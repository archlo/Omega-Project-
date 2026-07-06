import { describe, expect, it } from 'vitest';
import { ShopScanner } from '../../../src/ui/game/ShopScanner.js';

describe('ShopScanner', () => {
  it('shows decoded subtype and item prices', () => {
    const panel = new ShopScanner();

    panel.SetResult(2, [
      { id: 2000000, name: 'Red Potion', price: 50 },
      { id: 2000001, name: 'Orange Potion', price: 1_000 },
    ]);

    const text = (panel as any)._body.text as string;
    expect(text).toContain('Sub-type: 2');
    expect(text).toContain('Items: 2');
    expect(text).toContain('Red Potion: 50');
    expect(text).toContain('Orange Potion: 1,000');
  });
});
