import { describe, it, expect } from 'vitest';
import { Text } from 'pixi.js';
import { PersonalShop } from '../../../src/ui/game/PersonalShop.js';

// ponytail: avoids pulling in jsdom just to satisfy Text.width/height's canvas measurement in tests
Object.defineProperty(Text.prototype, 'width', { get: () => 0 });
Object.defineProperty(Text.prototype, 'height', { get: () => 0 });

// TODO_AUDIT.md Fifty-fourth pass: PSP_AddSoldItem's decoded `quantity` is a
// multiplier against the listing's own bundle size, not a raw count.
describe('PersonalShop.NotifySoldItem', () => {
  it('multiplies the decoded count by the listing setSize at that index', () => {
    const shop = new PersonalShop(null as any, null, null);
    shop.OpenAsOwner('My Shop', [{ index: 2, itemId: 2000000, name: 'Potion', setCount: 5, setSize: 10, price: 100 }]);
    let notified: [number, number, string] | null = null;
    shop.OnSoldItem = (idx, qty, buyer) => { notified = [idx, qty, buyer]; };
    shop.NotifySoldItem(2, 3, 'Bob');
    expect(notified).toEqual([2, 30, 'Bob']);
  });

  it('falls back to a setSize of 1 when the slot index is unknown', () => {
    const shop = new PersonalShop(null as any, null, null);
    shop.OpenAsOwner('My Shop', []);
    let notified: [number, number, string] | null = null;
    shop.OnSoldItem = (idx, qty, buyer) => { notified = [idx, qty, buyer]; };
    shop.NotifySoldItem(0, 4, 'Alice');
    expect(notified).toEqual([0, 4, 'Alice']);
  });

  it('shows decoded shop status messages', () => {
    const shop = new PersonalShop(null as any, null, null);

    shop.SetShopStatus('Shop link result 3');

    expect((shop as any)._statusLine).toBe('Shop link result 3');
    expect(shop.isVisible).toBe(true);
  });
});
