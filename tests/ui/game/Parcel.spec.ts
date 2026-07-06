import { describe, expect, it } from 'vitest';
import { Parcel } from '../../../src/ui/game/Parcel.js';

describe('Parcel', () => {
  it('shows decoded sub-action', () => {
    const panel = new Parcel();

    panel.SetSubAction(9);

    expect((panel as any)._body.text).toContain('Sub-action: 9');
    expect(panel.isVisible).toBe(true);
  });
});
