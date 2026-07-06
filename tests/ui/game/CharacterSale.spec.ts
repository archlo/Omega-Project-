import { afterEach, describe, expect, it, vi } from 'vitest';
import { CharacterSale } from '../../../src/ui/game/CharacterSale.js';

describe('CharacterSale', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('shows decoded check/create results and emits name checks', () => {
    const panel = new CharacterSale();
    let checked = '';
    panel.onCheckName = (name) => { checked = name; };
    vi.stubGlobal('prompt', () => '  SaleName  ');

    panel.SetCheckResult('SaleName', 0);
    panel.SetCreateResult(56, 3);

    const text = (panel as any)._body.text as string;
    expect(text).toContain('SaleName: available');
    expect(text).toContain('mode 56, code 3');

    expect(panel.handleMouseButton(320 + 44, 164 + 112, true)).toBe(true);
    expect(checked).toBe('SaleName');
  });
});
