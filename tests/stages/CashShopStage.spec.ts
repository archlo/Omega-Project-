import { describe, expect, it } from 'vitest';
import { CashShopStage } from '../../src/stages/CashShopStage.js';
import { CashShopDecoder } from '../../src/net/packet/CashShopDecoder.js';

describe('CashShopStage', () => {
  it('creates instance without errors', () => {
    const stage = new CashShopStage(null);
    expect(stage).toBeDefined();
  });

  it('onSetCashShop populates commodities with discount rates and notSaleSNs', () => {
    const stage = new CashShopStage(null) as any;
    // Mock minimal game with fieldHandlers and cashShopHandlers
    const mockFieldHandlers = { onSetCashShop: null as any };
    const mockGame = {
      fieldHandlers: mockFieldHandlers,
      cashShopHandlers: { clear: () => {} },
    };
    stage._wireHandlers(mockGame);

    // Simulate SetCashShop args (7-digit itemIds for proper category detection)
    const args = {
      best: new Uint8Array(0x438),
      characterData: { characterStat: { characterId: 1, name: 'Test', level: 100, job: 100 } },
      cashShopAuthorized: true,
      modifiedCommodities: [
        { sn: 1001, data: { itemId: 1002000, price: 1000, onSale: true, gender: 0 } },
        { sn: 1002, data: { itemId: 2003000, price: 500, onSale: true, gender: 0 } },
        { sn: 1003, data: { itemId: 3004000, price: 800, onSale: false, gender: 0 } },
      ],
      discountRates: [{ category: 1, index: 0, rate: 10 }],
      notSaleSNs: [1002],
    };
    mockFieldHandlers.onSetCashShop(args);

    // Should have 2 items (1003 is onSale=false, 1002 is in notSaleSNs)
    expect(stage._commodities.length).toBe(2);
    expect(stage._commodities[0].sn).toBe(1001);
    expect(stage._commodities[1].sn).toBe(1003);

    // Discount rate should be applied to first item
    expect(stage._commodities[0].discountRate).toBe(10);
    expect(stage._commodities[0].price).toBe(1000);
  });

  it('decodeBestArray parses 90 entries from 1080-byte buffer', () => {
    const raw = new Uint8Array(0x438);
    const view = new DataView(raw.buffer);
    // First entry: category=1, gender=2, sn=300
    view.setInt32(0, 1, true);
    view.setInt32(4, 2, true);
    view.setInt32(8, 300, true);
    // Last entry (index 89): category=9, gender=1, sn=9999
    const lastOff = 89 * 12;
    view.setInt32(lastOff, 9, true);
    view.setInt32(lastOff + 4, 1, true);
    view.setInt32(lastOff + 8, 9999, true);

    const entries = CashShopDecoder.decodeBestArray(raw);
    expect(entries).toHaveLength(90);
    expect(entries[0]).toEqual({ category: 1, gender: 2, sn: 300 });
    expect(entries[89]).toEqual({ category: 9, gender: 1, sn: 9999 });
  });

  it('status bar values sit at OG positions (y 9/23/38, right-aligned at x 220)', () => {
    (globalThis as any).window ??= {};
    const stage = new CashShopStage(null) as any;
    stage._nxCredit = 12345;
    stage._maplePoints = 678;
    stage._nxPrepaid = 0;
    stage._clearDynamic = () => { stage._dynamicTexts = []; };
    stage._drawStatusBar();

    const texts = stage._dynamicTexts.map((t: any) => t.text);
    expect(texts).toContain('12345');
    expect(texts).toContain('678');
    expect(texts).toContain('0');

    // OG CCSWnd_Status::Draw @0x4CBCD0: values right-aligned at
    // x = 220 - width, y = 9 (NexonCash), 23 (PrepaidNX), 38 (MaplePoint),
    // relative to the status window at (254, 530).
    const nxc = stage._dynamicTexts.find((t: any) => t.text === '12345');
    expect(nxc.y).toBe(530 + 9);
    const mp = stage._dynamicTexts.find((t: any) => t.text === '678');
    expect(mp.y).toBe(530 + 38);
    const prepaid = stage._dynamicTexts.find((t: any) => t.text === '0');
    expect(prepaid.y).toBe(530 + 23);

    // Right-aligned: x + width ≈ 254 + 220. '12345' = 5 chars * 7 = 35 wide.
    expect(nxc.x).toBe(254 + 220 - 35);
  });

  it('status buttons render at y offset +13 per CCSWnd_Status::OnCreate', () => {
    (globalThis as any).window ??= {};
    const stage = new CashShopStage(null) as any;
    stage._clearDynamic = () => { stage._dynamicTexts = []; };
    const drawn: any[] = [];
    stage._drawWzSprite = (sprite: any, x: number, y: number) => drawn.push({ x, y });
    stage._btCharge = { ToPixi: () => ({}) };
    stage._btCheck = { ToPixi: () => ({}) };
    stage._btCoupon = { ToPixi: () => ({}) };
    stage._btExit = { ToPixi: () => ({}) };
    stage._drawStatusBar();

    // OG CreateCtrl_2 y=13 relative to status window (y=530) → 543.
    expect(drawn.filter((d) => d.y === 543).length).toBe(4);
    // x positions 248/289/330/378 relative to status window (x=254).
    expect(drawn.map((d) => d.x)).toEqual([502, 543, 584, 632]);
  });

  it('item grid plates place name/price at OG CCSWnd_List::Draw coords', () => {
    (globalThis as any).window ??= {};
    const stage = new CashShopStage(null) as any;
    stage._clearDynamic = () => { stage._dynamicTexts = []; };
    stage._getCurrentPageItems = () => [{ sn: 1001, itemId: 1302000, name: 'Test Sword', price: 100, discountRate: 0 }];
    stage._page = 0;
    stage._selectedPlate = -1;
    stage._focusedPlate = -1;
    stage._drawItemGrid();

    const name = stage._dynamicTexts.find((t: any) => t.text === 'Test Sword');
    const price = stage._dynamicTexts.find((t: any) => t.text === '100 NX');
    // OG: name at rect.left+82, rect.top+6; price at rect.left+78, rect.top+32.
    // First plate: left = 275 + 0, top = 95 + 0 + 2.
    expect(name.x).toBe(275 + 82);
    expect(name.y).toBe(95 + 2 + 6);
    expect(price.x).toBe(275 + 78);
    expect(price.y).toBe(95 + 2 + 32);
  });
});
