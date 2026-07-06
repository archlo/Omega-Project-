import { describe, expect, it } from 'vitest';
import { FindFriend } from '../../../src/ui/game/FindFriend.js';

describe('FindFriend', () => {
  it('shows decoded result bytes and emits verified request actions', () => {
    const panel = new FindFriend();
    let myInfo = 0;
    let search = 0;
    panel.onMyInfo = () => { myInfo++; };
    panel.onSearch = () => { search++; };

    panel.SetResult(2, 7);

    const text = (panel as any)._body.text as string;
    expect(text).toContain('Result flag1: 2');
    expect(text).toContain('Result flag2: 7');

    expect(panel.handleMouseButton(338 + 24, 178 + 92, true)).toBe(true);
    expect(panel.handleMouseButton(338 + 104, 178 + 92, true)).toBe(true);
    expect(myInfo).toBe(1);
    expect(search).toBe(1);
  });
});
