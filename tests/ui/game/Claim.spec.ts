import { describe, expect, it } from 'vitest';
import { Claim } from '../../../src/ui/game/Claim.js';

describe('Claim', () => {
  it('shows decoded result and service status', () => {
    const panel = new Claim({} as any, null, null);

    panel.ShowResult(2, false, 15);
    expect((panel as any)._msgText.text).toContain('Claim rejected (15min delay).');
    expect(panel.isVisible).toBe(true);

    panel.ShowServiceStatus('Claim service online.');
    expect((panel as any)._msgText.text).toBe('Claim service online.');
  });
});
