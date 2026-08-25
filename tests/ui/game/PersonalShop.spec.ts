import { describe, it, expect, beforeEach } from 'vitest';
import { Text } from 'pixi.js';
import { PersonalShop, personalShopTax } from '../../../src/ui/game/PersonalShop.js';

// ponytail: avoids pulling in jsdom just to satisfy Text.width/height's canvas measurement in tests
Object.defineProperty(Text.prototype, 'width', { get: () => 0 });
Object.defineProperty(Text.prototype, 'height', { get: () => 0 });

const ITEMS = [
  { index: 0, itemId: 2000000, name: 'Red Potion', setCount: 5, setSize: 10, price: 100 },
  { index: 1, itemId: 1302000, name: 'Sword', setCount: 1, setSize: 1, price: 50000 },
];

describe('PersonalShop (CPersonalShopDlg port)', () => {
  let shop: PersonalShop;
  beforeEach(() => {
    shop = new PersonalShop(null as any, null, null);
    shop.container.position.set(0, 0);
  });

  // OG OnSoldItemResult @0x69A670 — qty is a bundle multiplier against the
  // listing's own setSize.
  it('NotifySoldItem multiplies the decoded count by the listing setSize', () => {
    // OG m_aItem[idx] is a positional array index — pad to position 2.
    const items = [
      { index: 0, itemId: 2000001, name: 'Orange', setCount: 1, setSize: 1, price: 50 },
      { index: 1, itemId: 2000002, name: 'White', setCount: 1, setSize: 1, price: 60 },
      { index: 2, itemId: 2000000, name: 'Potion', setCount: 5, setSize: 10, price: 100 },
    ];
    shop.OpenAsOwner('My Shop', items);
    let notified: [number, number, string] | null = null;
    shop.OnSoldItem = (idx, qty, buyer) => { notified = [idx, qty, buyer]; };
    shop.NotifySoldItem(2, 3, 'Bob');
    expect(notified).toEqual([2, 30, 'Bob']);
    expect(shop.soldItems).toHaveLength(1);
    expect(shop.soldItems[0].number).toBe(30);
  });

  it('accumulates sold totals with the OG tax tiers', () => {
    shop.OpenAsOwner('My Shop', [{ index: 0, itemId: 2000000, name: 'Potion', setCount: 1000, setSize: 1, price: 150 }]);
    shop.NotifySoldItem(0, 1000, 'Alice'); // 150,000 revenue → 0.4% tax
    expect(shop.totSold).toBe(150_000);
    expect(shop.totReceived).toBe(150_000 - personalShopTax(150_000));
  });

  it('GetPersonalShopTax matches the OG tier table', () => {
    expect(personalShopTax(99_999)).toBe(0);
    expect(personalShopTax(100_000)).toBe(400);
    expect(personalShopTax(1_000_000)).toBe(9000);
    expect(personalShopTax(5_000_000)).toBe(75_000);
    expect(personalShopTax(10_000_000)).toBe(200_000);
    expect(personalShopTax(25_000_000)).toBe(625_000);
    expect(personalShopTax(100_000_000)).toBe(3_000_000);
  });

  it('shows decoded shop status messages', () => {
    shop.SetShopStatus('Shop link result 3');
    expect((shop as any)._statusLine).toBe('Shop link result 3');
    expect(shop.isVisible).toBe(true);
  });

  // ── Geometry: GetItemIndexFromPoint @0x697B90 ──────────────────────────
  it('hit-tests item rows at x[10,208] y[161+42i,200+42i] with absolute indices', () => {
    shop.OpenAsVisitor('Shop', ITEMS, 1);
    expect(shop.getItemIndexFromPoint(50, 180)).toBe(0);   // row 0
    expect(shop.getItemIndexFromPoint(50, 222)).toBe(1);   // row 1 (161+42=203..242)
    expect(shop.getItemIndexFromPoint(5, 180)).toBe(-1);   // left gutter
    expect(shop.getItemIndexFromPoint(300, 180)).toBe(-1); // right of grid
    expect(shop.getItemIndexFromPoint(50, 158)).toBe(-1);  // above first row
  });

  it('scrolls the hit-test anchor with the buy scrollbar', () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ index: i, itemId: 2000000, name: `i${i}`, setCount: 1, setSize: 1, price: 1 }));
    shop.OpenAsOwner('Shop', many);
    (shop as any)._buyScroll.pos = 3;
    expect(shop.getItemIndexFromPoint(50, 180)).toBe(3);
  });

  // ── Mode visibility (OnEnterResult model) ──────────────────────────────
  it('owner sees Start/Close/Item and ban buttons; visitor sees Buy/Info/Exit', () => {
    shop.OpenAsOwner('Shop', ITEMS);
    shop.OnUserEnter(1, 'Guest');
    expect((shop as any)._button(1001).container.visible || (shop as any)._button(1002).container.visible).toBe(true);
    expect((shop as any)._button(1003).container.visible).toBe(false);
    expect((shop as any)._button(1007).container.visible).toBe(true);

    const visitor = new PersonalShop(null as any, null, null);
    visitor.OpenAsVisitor('Shop', ITEMS, 2);
    expect((visitor as any)._button(1003).container.visible).toBe(true);  // BtBuy
    expect((visitor as any)._button(1004).container.visible).toBe(true);  // BtInfo
    expect((visitor as any)._button(1005).container.visible).toBe(false); // BtItem
    expect((visitor as any)._button(1007).container.visible).toBe(false); // BtBan
  });

  it('clears a visitor seat on remote leave and hides its ban button', () => {
    shop.OpenAsOwner('Shop', ITEMS);
    shop.OnUserEnter(2, 'Temp');
    expect(shop.myPosition).toBe(0);
    shop.OnUserLeave(2);
    expect((shop as any)._names[2]).toBe('');
    expect((shop as any)._button(1008).container.visible).toBe(false);
  });

  // ── Buy flow ────────────────────────────────────────────────────────────
  it('visitor row click selects; BtBuy fires with the max total (setCount*setSize)', () => {
    shop.OpenAsVisitor('Shop', ITEMS, 1);
    let bought: [number, number] | null = null;
    shop.OnBuyItem = (idx, total) => { bought = [idx, total]; };
    // click row 0 → selection
    shop.handleMouseButton(50, 180, true);
    shop.handleMouseButton(50, 180, false);
    // BtBuy button is WZ-origin placed; without WZ assets the fallback Button
    // sits at (0,0) sized 120x28 — click inside it.
    shop.handleMouseButton(60, 14, true);
    shop.handleMouseButton(60, 14, false);
    expect(bought).toEqual([0, 10 * 5]);
  });

  it('owner clicking a listed item withdraws it via MoveItemToInventory', () => {
    shop.OpenAsOwner('Shop', ITEMS);
    let moved: number | null = null;
    shop.OnMoveItemToInventory = (idx) => { moved = idx; };
    shop.handleMouseButton(120, 180, true);
    expect(moved).toBe(0);
  });

  it('OnMoveItemResult removes the listing at the echoed index', () => {
    shop.OpenAsOwner('Shop', [...ITEMS]);
    shop.OnMoveItemResult(0);
    expect((shop as any)._items).toHaveLength(1);
    expect((shop as any)._items[0].itemId).toBe(1302000);
  });

  // ── Ban / kick sends ───────────────────────────────────────────────────
  it('ban button click fires OnBan with slot + seated name', () => {
    shop.OpenAsOwner('Shop', ITEMS);
    shop.OnUserEnter(1, 'Griefer');
    let banned: [number, string] | null = null;
    shop.OnBan = (slot, name) => { banned = [slot, name]; };
    (shop as any)._onBanClick(1);
    expect(banned).toEqual([1, 'Griefer']);
  });

  it('owner idle-kick fires after one hour per Update @0x69B340', () => {
    shop.OpenAsOwner('Shop', ITEMS);
    shop.OnUserEnter(1, 'Sleepy');
    let kicked: [number, string] | null = null;
    shop.OnKickTimeOver = (slot, name) => { kicked = [slot, name]; };
    ((shop as any)._enterTimes)[1] = Date.now() - 3_600_001;
    shop.update(16);
    expect(kicked).toEqual([1, 'Sleepy']);
    // fresh visitor is not kicked
    kicked = null;
    shop.OnUserEnter(2, 'Fresh');
    shop.update(16);
    expect(kicked).toBeNull();
  });

  // ── Chat ────────────────────────────────────────────────────────────────
  it('AddChatText wraps at 256px budget with a 4-space continuation indent', () => {
    shop.OpenAsVisitor('Shop', ITEMS, 1);
    shop.AddChatText('aaaa bbbb cccc dddd eeee ffff gggg hhhh iiii jjjj kkkk llll mmmm nnnn oooo pppp qqqq rrrr ssss tttt uuuu vvvv wwww xxxx yyyy zzzz');
    const lines: string[] = (shop as any)._chatLines.map((l: any) => l.text);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines[1].startsWith('    ')).toBe(true);
  });

  it('chat submit clears the edit and fires OnChatSubmit', () => {
    shop.OpenAsVisitor('Shop', ITEMS, 1);
    let sent: string | null = null;
    shop.OnChatSubmit = (t) => { sent = t; };
    (shop as any)._chatEdit.text = 'hello shop';
    (shop as any)._chatEdit.isFocused = true;
    shop.onKeyPress('Enter');
    expect(sent).toBe('hello shop');
    expect((shop as any)._chatEdit.text).toBe('');
  });

  // ── Leave handling ──────────────────────────────────────────────────────
  it('ClosedByServer hides the dialog and surfaces known leave reasons', () => {
    shop.OpenAsVisitor('Shop', ITEMS, 1);
    shop.ClosedByServer(14);
    expect(shop.isVisible).toBe(false);
    expect((shop as any)._statusLine).toContain('sold');
  });
});
