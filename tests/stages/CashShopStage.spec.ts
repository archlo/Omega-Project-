import { describe, expect, it } from 'vitest';
import { CashShopStage } from '../../src/stages/CashShopStage.js';

describe('CashShopStage', () => {
  it('maps decoded CashItemResult sub-actions to readable status messages', () => {
    const stage = new CashShopStage(null) as any;

    expect(stage._describeCashItemResult({ subAction: 0x6B, receiverName: 'Rina', itemId: 100200, quantity: 2, nxCost: 3000 }))
      .toBe('Gift sent to Rina: item 100200 x2.');
    expect(stage._describeCashItemResult({ subAction: 0x65, reason: 30, itemId: 100200 }))
      .toBe('Cash item request failed (sub 0x65, reason 30).');
  });
});
