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
});
