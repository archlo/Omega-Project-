import { describe, it, expect, vi } from 'vitest';
import { Text } from 'pixi.js';
import { Memo } from '../../../src/ui/game/Memo.js';

// ponytail: avoids pulling in jsdom just to satisfy Text.width/height's canvas measurement in tests
Object.defineProperty(Text.prototype, 'width', { get: () => 0 });
Object.defineProperty(Text.prototype, 'height', { get: () => 0 });

// TODO_AUDIT.md Fifty-seventh pass: Memo's compose flow reset target/text
// to empty strings and never let the player type anything, so OnSend could
// never fire (the `target && text` guard was always false).
describe('Memo compose', () => {
  it('New prompts for target and text, then Send fires OnSend with both', () => {
    const memo = new Memo(null as any, null, null);
    vi.stubGlobal('window', { prompt: vi.fn().mockReturnValueOnce('Bob').mockReturnValueOnce('Hello there') });
    (memo as any)._startCompose();
    let sent: [string, string] | null = null;
    memo.OnSend = (t, x) => { sent = [t, x]; };
    (memo as any)._doSend();
    expect(sent).toEqual(['Bob', 'Hello there']);
    vi.unstubAllGlobals();
  });

  it('cancelling the target prompt does not enter compose mode', () => {
    const memo = new Memo(null as any, null, null);
    vi.stubGlobal('window', { prompt: vi.fn().mockReturnValueOnce(null) });
    (memo as any)._startCompose();
    expect((memo as any)._composing).toBe(false);
    vi.unstubAllGlobals();
  });
});
