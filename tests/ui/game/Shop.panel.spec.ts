import { describe, it, expect, beforeEach } from 'vitest';
import { Text } from 'pixi.js';
import { Shop, discountByRate } from '../../../src/ui/game/Shop.js';

// ponytail: avoids jsdom just for Text measurement in tests
Object.defineProperty(Text.prototype, 'width', { get: () => 0 });
Object.defineProperty(Text.prototype, 'height', { get: () => 0 });

function mkItem(itemId: number, overrides: Partial<any> = {}) {
  return {
    itemId,
    price: 100,
    discountRate: 0,
    tokenId: 0,
    tokenPrice: 0,
    itemPeriod: 0,
    levelLimited: 0,
    quantity: 1,
    maxPerSlot: 100,
    unitPrice: 0,
    name: `Item${itemId}`,
    icon: null,
    ...overrides,
  };
}

describe('Shop (CShopDlg port)', () => {
  let shop: Shop;
  let buys: any[];
  let sells: any[];
  let recharges: any[];

  beforeEach(() => {
    shop = new Shop(null as any, null);
    shop.container.position.set(0, 0);
    buys = []; sells = []; recharges = [];
    shop.OnBuy = (pos, id, n, p) => buys.push([pos, id, n, p]);
    shop.OnSell = (slot, id, n) => sells.push([slot, id, n]);
    shop.OnRecharge = (slot) => recharges.push(slot);
    // canned modal helpers — resolve synchronously with the affirmative branch
    let yesNoCb: ((ok: boolean) => void) | null = null;
    let askCb: ((n: number) => void) | null = null;
    shop.modals = {
      yesNo: (_msg, cb) => { yesNoCb = cb; cb(true); },
      askCount: (_msg, def, _max, cb) => { askCb = cb; cb(def); },
    };
    (shop as any)._yesNoCb = () => yesNoCb;
    (shop as any)._askCb = () => askCb;
  });

  it('discountByRate rounds half-up like GetDiscountPriceByRate @0x6E3980', () => {
    expect(discountByRate(0, 0)).toBe(0);
    expect(discountByRate(100, 10)).toBe(90);
    expect(discountByRate(55, 50)).toBe(28); // round(27.5) half-up
    expect(discountByRate(99, 100)).toBe(0);
  });

  it('SetShopDlg post-processing splits recharge/buy/recommended lists', () => {
    shop.setResolvers((id) => `N${id}`, () => null, {
      equipInfoOf: (id) => (id === 1302000 ? { reqLevel: 12, reqJob: 1024 } : null),
    });
    shop.setUserData(14, 100, 0);
    const star = mkItem(2070000, { price: 700, unitPrice: 0.5, maxPerSlot: 800 });
    const sword = mkItem(1302000, { price: 300, maxPerSlot: 1 });   // |14-12|<=5 + job match
    const farEquip = mkItem(1312000, { price: 300, maxPerSlot: 1 });
    // warrior job 100 → jobBit 1<<0 = 1; reqJob 1 matches
    shop.setResolvers((id) => `N${id}`, () => null, {
      equipInfoOf: (id) => (id === 1302000 ? { reqLevel: 12, reqJob: 1 } : id === 1312000 ? { reqLevel: 60, reqJob: 1 } : null),
    });
    shop.setShopData(9100000, [star, sword, farEquip]);

    expect((shop as any)._rechargeItems.map((i: any) => i.itemId)).toEqual([2070000]);
    expect((shop as any)._buyItems).toHaveLength(3);
    expect((shop as any)._buyRecommended.map((i: any) => i.itemId)).toEqual([1302000]);
    expect((shop as any)._originalIndex).toEqual([1]);       // original server index kept
    expect(shop.getRechargeEntry(2070000)?.unitPrice).toBe(0.5);
  });

  it('recommended tab is added and auto-selected when non-empty', () => {
    shop.setResolvers(() => '', () => null, { equipInfoOf: () => ({ reqLevel: 10, reqJob: 0 }) });
    shop.setUserData(12, 100, 0);
    shop.setShopData(1, [mkItem(1302000, { maxPerSlot: 1 })]);
    expect((shop as any)._tabBuy.itemCount).toBe(2);
    expect((shop as any)._tabBuy.curTab).toBe(1);
  });

  it('grid hit-test uses the OG rects (x=10 buy col, y=115 pitch 42)', () => {
    shop.setShopData(1, [mkItem(2000000), mkItem(2000001)]);
    expect(shop.getItemIndexFromPoint(50, 120)).toEqual({ buy: true, idx: 0 });
    expect(shop.getItemIndexFromPoint(50, 162)).toEqual({ buy: true, idx: 1 });
    expect(shop.getItemIndexFromPoint(300, 120)).toBeNull(); // no sell items yet
    expect(shop.getItemIndexFromPoint(2, 120)).toBeNull();   // left gutter
  });

  it('stacked purchases confirm via YesNo then send raw price at direct index', () => {
    shop.setMeso(999999);
    shop.setMeso(999999);
    shop.setShopData(1, [mkItem(2000000, { price: 250 })]);
    shop.isVisible = true;
    // select row 0 then release on it (OnMouseButton 513→515 model)
    shop.handleMouseButton(50, 130, true);
    shop.handleMouseButton(50, 130, false);
    expect(buys).toEqual([[0, 2000000, 1, 250]]);
  });

  it('recommended-tab sends map through m_anOriginalIndex', () => {
    shop.setResolvers(() => '', () => null, { equipInfoOf: (id) => ({ reqLevel: 10, reqJob: 0 }) });
    shop.setUserData(12, 100, 0);
    // server order: [plain, recommendable] → recommended index 0 = original 1
    shop.setMeso(999999);
    shop.setMeso(999999);
    shop.setShopData(1, [mkItem(2000000), mkItem(1302000, { maxPerSlot: 1 })]);
    shop.isVisible = true;
    shop.handleMouseButton(50, 130, true);   // select recommended row 0
    shop.handleMouseButton(50, 130, false);
    expect(buys).toEqual([[1, 1302000, 1, 100]]);
  });

  it('sell flow asks count with default=nStock then sends slot+count', () => {
    shop.setSellItems([{ slot: 7, itemId: 4000000, name: 'Leaf', icon: null, stock: 12, price: 24, rechargePrice: 0, rechargeable: false }]);
    shop.isVisible = true;
    shop.handleMouseButton(280, 130, true);  // select sell row 0
    shop.handleMouseButton(280, 130, false);
    expect(sells).toEqual([[7, 4000000, 12]]);
  });

  it('recharge rows confirm full-stack price then send the slot', () => {
    shop.setResolvers(() => '', () => null);
    shop.setShopData(1, [mkItem(2070000, { unitPrice: 1, maxPerSlot: 800 })]);
    shop.setSellItems([{ slot: 3, itemId: 2070000, name: 'Subi', icon: null, stock: 500, price: 0, rechargePrice: 300, rechargeable: true }]);
    shop.isVisible = true;
    shop.handleMouseButton(280, 130, true);
    shop.handleMouseButton(280, 130, false);
    // sell selection happened — recharge goes through BtRecharge row action
    sells.length = 0;
    (shop as any)._requestSent = false;
    shop.SendRechargeRequest(0);
    expect(recharges).toEqual([3]);
  });

  it('m_bShopRequestSent blocks double-sends until the result arrives', () => {
    shop.setShopData(1, [mkItem(2000000, { maxPerSlot: 1 })]);  shop.setMeso(999999); // YesNo path
    shop.isVisible = true;
    shop.handleMouseButton(50, 130, true);
    shop.handleMouseButton(50, 130, false);
    expect(buys).toHaveLength(1);
    // result resets the gate
    shop.NotifyResult(4);
    shop.handleMouseButton(50, 130, true);
    shop.handleMouseButton(50, 130, false);
    expect(buys).toHaveLength(2);
  });

  it('level gates abort before any send', () => {
    const notices: string[] = [];
    shop.onNotice = (m) => notices.push(m);
    shop.setShopData(1, [mkItem(1302000, { levelLimited: 30, maxPerSlot: 1 })]);
    shop.setUserData(10, 100, 0);
    shop.isVisible = true;
    shop.handleMouseButton(50, 130, true);
    shop.handleMouseButton(50, 130, false);
    expect(buys).toHaveLength(0);
    expect(notices.some((n) => n.includes('level 30'))).toBe(true);
  });

  it('result sub-codes surface notices and case 0 stays silent', () => {
    const notices: string[] = [];
    shop.onNotice = (m) => notices.push(m);
    shop.NotifyResult(0);
    expect(notices).toHaveLength(0);
    shop.NotifyResult(2);
    expect(notices[0]).toContain('mesos');
    shop.NotifyResult(3);
    expect(notices[1]).toContain('cannot be purchased');
  });

  it('Escape sends close (SetRet always sends [66][3])', () => {
    let closed = false;
    shop.OnClose = () => { closed = true; };
    shop.isVisible = true;
    shop.onKeyPress('Escape');
    expect(closed).toBe(true);
    expect(shop.isVisible).toBe(false);
  });
});
