import { describe, it, expect, vi } from 'vitest';
import { Text } from 'pixi.js';
import { GuildBBS } from '../../../src/ui/game/GuildBBS.js';

// ponytail: avoids pulling in jsdom just to satisfy Text.width/height's canvas measurement in tests
Object.defineProperty(Text.prototype, 'width', { get: () => 0 });
Object.defineProperty(Text.prototype, 'height', { get: () => 0 });

describe('GuildBBS', () => {
  it('Open shows the panel and requests the first page of the list', () => {
    const bbs = new GuildBBS();
    let requested = -1;
    bbs.onLoadList = (start) => { requested = start; };
    bbs.Open();
    expect(bbs.isVisible).toBe(true);
    expect(requested).toBe(0);
  });

  it('SetEntry switches to view mode', () => {
    const bbs = new GuildBBS();
    bbs.isVisible = true;
    bbs.SetEntry(42, 1, 'Title', 'Body text', [{ sn: 1, characterId: 1, date: 0n, comment: 'nice' }]);
    expect((bbs as any)._mode).toBe('view');
    expect((bbs as any)._viewing?.entryId).toBe(42);
  });

  it('escape hides the panel', () => {
    const bbs = new GuildBBS();
    bbs.isVisible = true;
    expect(bbs.onKeyPress('Escape')).toBe(true);
    expect(bbs.isVisible).toBe(false);
  });

  it('SetList populates entries', () => {
    const bbs = new GuildBBS();
    bbs.isVisible = true;
    bbs.SetList(null, [
      { entryId: 1, characterId: 1, title: 'Post A', date: 0n, emoticon: 0, comments: 2 },
      { entryId: 2, characterId: 2, title: 'Post B', date: 0n, emoticon: 0, comments: 0 },
    ]);
    expect((bbs as any)._entries.length).toBe(2);
    expect((bbs as any)._mode).toBe('list');
  });

  it('back button returns to list and requests reload', () => {
    const bbs = new GuildBBS();
    bbs.isVisible = true;
    bbs.SetEntry(42, 1, 'Title', 'Body', []);
    let reloaded = -1;
    bbs.onLoadList = (start) => { reloaded = start; };
    // Simulate back: the _goBack method is private, trigger via Escape then reopen
    // Or call directly via cast
    (bbs as any)._goBack();
    expect((bbs as any)._mode).toBe('list');
    expect(reloaded).toBe(0);
  });

  it('notice entry appears in list when set', () => {
    const bbs = new GuildBBS();
    bbs.isVisible = true;
    bbs.SetList(
      { entryId: 99, characterId: 1, title: 'Important', date: 0n, emoticon: 0, comments: 0 },
      [{ entryId: 1, characterId: 2, title: 'Normal', date: 0n, emoticon: 0, comments: 0 }],
    );
    expect((bbs as any)._notice?.title).toBe('Important');
    expect((bbs as any)._entries.length).toBe(1);
  });

  it('comment mode fires onComment with entryId', () => {
    const bbs = new GuildBBS();
    bbs.isVisible = true;
    bbs.SetEntry(42, 1, 'Title', 'Body', []);
    let commented: [number, string] | null = null;
    bbs.onComment = (id, text) => { commented = [id, text]; };
    vi.stubGlobal('window', { prompt: vi.fn().mockReturnValueOnce('Great post!') });
    (bbs as any)._enterCommentMode();
    expect(commented).toEqual([42, 'Great post!']);
    expect((bbs as any)._mode).toBe('view');
    vi.unstubAllGlobals();
  });

  it('delete fires onDeleteEntry with entryId', () => {
    const bbs = new GuildBBS();
    bbs.isVisible = true;
    bbs.SetEntry(42, 1, 'Title', 'Body', []);
    let deleted = -1;
    bbs.onDeleteEntry = (id) => { deleted = id; };
    (bbs as any)._onDelete();
    expect(deleted).toBe(42);
  });
});
