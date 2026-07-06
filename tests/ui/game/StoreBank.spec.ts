import { describe, expect, it } from 'vitest';
import { StoreBank } from '../../../src/ui/game/StoreBank.js';

describe('StoreBank', () => {
  it('shows decoded get-all fee state and emits confirm', () => {
    const panel = new StoreBank();
    let confirmed = false;
    panel.onGetAllConfirm = () => { confirmed = true; };

    panel.SetResult(7);
    panel.SetAction({ subAction: 0x24, passingDay: 3, fee: 5000 });

    expect(panel.isVisible).toBe(true);
    const text = (panel as any)._body.text as string;
    expect(text).toContain('Result: 7');
    expect(text).toContain('Action: 0x24');
    expect(text).toContain('fee 5000');

    expect(panel.handleMouseButton(330 + 44, 172 + 112, true)).toBe(true);
    expect(confirmed).toBe(true);
  });
});
