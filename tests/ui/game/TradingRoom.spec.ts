import { describe, expect, it } from 'vitest';
import { TradingRoom } from '../../../src/ui/game/TradingRoom.js';

describe('TradingRoom', () => {
  it('shows decoded trade money limit type', () => {
    const panel = new TradingRoom({} as any, null, null);

    panel.SetTradeMoneyLimit(3);

    expect((panel as any)._noticeLabel.text).toBe('Trade money limit type 3');
    expect(panel.isVisible).toBe(true);
  });
});
