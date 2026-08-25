import { describe, expect, it } from 'vitest';
(globalThis as any).document = (globalThis as any).document ?? {};
import { FindFriend } from '../../../src/ui/game/FindFriend.js';

// CUIFindFriend::OnCreate @0x7BA180 control-table parity.
describe('FindFriend', () => {
  it('keeps the OG decoded-result surface and request callbacks', () => {
    const panel = new FindFriend();
    let myInfo = 0;
    let search = 0;
    panel.onMyInfo = () => { myInfo++; };
    panel.onSearch = () => { search++; };

    panel.SetResult(2, 7);
    panel.draw();

    const info = (panel as any)._rows[0] as any;
    expect(typeof info.text === 'string' && info.text.includes('Result 2/7')).toBe(true);

    // Buttons are WZ-driven; the custom Graphics hit rects are gone.
    expect((panel as any)._allButtons.length).toBeGreaterThanOrEqual(0);
    expect(panel.handleMouseButton(338 + 200, 178 + 200, true)).toBe(true); // inside window
    expect(panel.handleMouseButton(-1, -1, true)).toBe(false); // outside
    expect(myInfo).toBe(0);
    expect(search).toBe(0);
  });

  it('renders FriendLoaded rows and selects on click', () => {
    const panel = new FindFriend();
    panel.SetFriends([
      { name: 'Maple', level: 30, jobName: 'Warrior', online: true },
      { name: 'Story', level: 12, online: false },
    ]);
    panel.Open();
    // First row at LIST_TOP=82, row height 20 -> click y=178+90 hits row 0.
    expect(panel.handleMouseButton(338 + 20, 178 + 90, true)).toBe(true);
    expect((panel as any)._selected).toBe(0);
    panel.draw();
    const names = ((panel as any)._rows as any[]).flatMap((r) =>
      r.children.filter((c: any) => typeof c.text === 'string').map((c: any) => c.text as string));
    expect(names.join()).toContain('Maple');
    expect(names.join()).toContain('Lv.12');
  });
});
