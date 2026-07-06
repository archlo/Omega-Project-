import { describe, it, expect } from 'vitest';
import { Text } from 'pixi.js';
import { AntiMacroDialog } from '../../../src/ui/game/AntiMacroDialog.js';

// ponytail: avoids pulling in jsdom just to satisfy Text.width/height's canvas measurement in tests
Object.defineProperty(Text.prototype, 'width', { get: () => 0 });
Object.defineProperty(Text.prototype, 'height', { get: () => 0 });

// TODO_AUDIT.md "Resolved against the v95 decompile" section: CUIAntiMacro
// captcha — image+answer protocol decoded but had zero UI/sender, until
// CUIAntiMacro::SetRet (decompile/78c940.c) was found this pass.
describe('AntiMacroDialog', () => {
  it('showQuestion makes the panel visible with no jpeg (texture creation skipped without DOM Image)', () => {
    const d = new AntiMacroDialog();
    d.showQuestion(undefined);
    expect(d.isVisible).toBe(true);
  });

  it('Cancel hides the panel and sends nothing', () => {
    const d = new AntiMacroDialog();
    let submitted: string | null = null;
    d.onSubmit = (a) => { submitted = a; };
    d.showQuestion(new Uint8Array());
    (d as any)._btnCancel.emit('pointerdown');
    expect(d.isVisible).toBe(false);
    expect(submitted).toBeNull();
  });

  it('OK on a question prompts for an answer and sends it', () => {
    const d = new AntiMacroDialog();
    let submitted: string | null = null;
    d.onSubmit = (a) => { submitted = a; };
    d.showQuestion(new Uint8Array());
    (globalThis as any).prompt = () => 'ABCD';
    (d as any)._btnOk.emit('pointerdown');
    expect(submitted).toBe('ABCD');
    expect(d.isVisible).toBe(false);
    delete (globalThis as any).prompt;
  });

  it('showNotice hides the OK button — only Cancel/Close is offered', () => {
    const d = new AntiMacroDialog();
    let submitted: string | null = null;
    d.onSubmit = (a) => { submitted = a; };
    d.showNotice('You have been flagged for review.');
    expect(d.isVisible).toBe(true);
    expect((d as any)._btnOk.visible).toBe(false);
    (d as any)._btnOk.emit('pointerdown');
    expect(submitted).toBeNull();
  });

  it('Escape closes the dialog', () => {
    const d = new AntiMacroDialog();
    d.showQuestion(undefined);
    expect(d.onKeyPress('Escape')).toBe(true);
    expect(d.isVisible).toBe(false);
  });
});
