import { describe, it, expect, vi } from 'vitest';
import { Text } from 'pixi.js';
import { GuildBBS } from '../../../src/ui/game/GuildBBS.js';

// ponytail: avoids pulling in jsdom just to satisfy Text.width/height's canvas measurement in tests
Object.defineProperty(Text.prototype, 'width', { get: () => 0 });
Object.defineProperty(Text.prototype, 'height', { get: () => 0 });

// TODO_AUDIT.md Sixty-third pass: CUIGuildBBS — protocol already fully
// decoded both directions, just with no UI panel to consume it.
describe('GuildBBS', () => {
  it('Open shows the panel and requests the first page of the list', () => {
    const bbs = new GuildBBS();
    let requested = -1;
    bbs.onLoadList = (start) => { requested = start; };
    bbs.Open();
    expect(bbs.isVisible).toBe(true);
    expect(requested).toBe(0);
  });

  it('clicking an entry row requests that entry', () => {
    const bbs = new GuildBBS();
    bbs.isVisible = true;
    bbs.SetList(null, [{ entryId: 42, characterId: 1, title: 'Hi', date: 0n, emoticon: 0, comments: 3 }]);
    let viewed = -1;
    bbs.onViewEntry = (id) => { viewed = id; };
    (bbs as any)._rows[0].emit('pointerdown');
    expect(viewed).toBe(42);
  });

  it('viewing an entry switches to detail mode with Back/Comment/Delete buttons', () => {
    const bbs = new GuildBBS();
    bbs.isVisible = true;
    bbs.SetEntry(42, 1, 'Title', 'Body text', [{ sn: 1, characterId: 1, date: 0n, comment: 'nice' }]);
    const labels = (bbs as any)._buttons.map((b: any) => b.text);
    expect(labels).toEqual(['[Back]', '[Comment]', '[Delete]']);
  });

  it('New Post prompts for title/text and fires onNewPost', () => {
    const bbs = new GuildBBS();
    bbs.isVisible = true;
    bbs.SetList(null, []);
    vi.stubGlobal('window', { prompt: vi.fn().mockReturnValueOnce('My Title').mockReturnValueOnce('My Text') });
    let posted: [string, string] | null = null;
    bbs.onNewPost = (title, text) => { posted = [title, text]; };
    const newPostBtn = (bbs as any)._buttons.find((b: any) => b.text === '[New Post]');
    newPostBtn.emit('pointerdown');
    expect(posted).toEqual(['My Title', 'My Text']);
    vi.unstubAllGlobals();
  });

  it('Escape hides the panel', () => {
    const bbs = new GuildBBS();
    bbs.isVisible = true;
    expect(bbs.onKeyPress('Escape')).toBe(true);
    expect(bbs.isVisible).toBe(false);
  });
});
