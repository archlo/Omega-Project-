import { describe, it, expect } from 'vitest';
import { Notice } from '../../../src/ui/game/Notice.js';

describe('Notice', () => {
  it('show() displays a single OK button that dismisses', () => {
    const n = new Notice();
    let dismissed = false;
    n.onDismiss = () => { dismissed = true; };
    n.show('Title', 'message');
    expect(n.isVisible).toBe(true);
    expect(n.handleMouseButton(400, 340, false)).toBe(true);
    expect(n.handleMouseButton(400, 340, true)).toBe(true);
    expect(dismissed).toBe(true);
    expect(n.isVisible).toBe(false);
  });

  it('showConfirm() fires onConfirm on Enter and onDismiss on Escape', () => {
    const n = new Notice();
    let confirmed = false;
    n.onConfirm = () => { confirmed = true; };
    n.showConfirm('Title', 'confirm?');
    expect(n.isVisible).toBe(true);
    n.onKeyPress('Enter');
    expect(confirmed).toBe(true);
    expect(n.isVisible).toBe(false);

    let dismissed = false;
    n.onDismiss = () => { dismissed = true; };
    n.showConfirm('Title', 'confirm again?');
    n.onKeyPress('Escape');
    expect(dismissed).toBe(true);
    expect(n.isVisible).toBe(false);
  });
});
