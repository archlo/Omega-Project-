import { describe, it, expect } from 'vitest';
import { Text } from 'pixi.js';
import { FamilyWindow } from '../../../src/ui/game/FamilyWindow.js';
import { BuiltInFont } from '../../../src/ui/BuiltInFont.js';

// TODO_AUDIT.md Hundred-and-second pass: PrivilegeItem — family privilege
// carousel (CUIFamily::Draw/OnButtonClicked, decompile at 0x7b2720/0x7b4b50).
Object.defineProperty(Text.prototype, 'width', { get: () => 0 });
// wrapToWidth measures via a real canvas context, which needs jsdom; stub it
// the same way Text.width is stubbed above rather than adding a jsdom dep.
BuiltInFont.prototype.wrapToWidth = function (text: string): string[] { return [text]; };

describe('FamilyWindow privilege carousel', () => {
  function makeWindow() {
    const w = new FamilyWindow({ Load: () => null } as any, null, new BuiltInFont());
    w.isVisible = true;
    w.InFamily = true;
    return w;
  }

  it('pages forward and back through privileges with wraparound', () => {
    const w = makeWindow();
    w.SetPrivileges([
      { type: 0, fame: 100, dayLimit: 1, name: 'Heal', desc: 'd1' },
      { type: 0, fame: 200, dayLimit: 1, name: 'Buff', desc: 'd2' },
    ]);
    w.update(0);
    expect((w as any)._privilegeIndex).toBe(0);
    (w as any)._privButtons.find((t: any) => t.text === '[>]').emit('pointerdown');
    expect((w as any)._privilegeIndex).toBe(1);
    (w as any)._privButtons.find((t: any) => t.text === '[>]').emit('pointerdown');
    expect((w as any)._privilegeIndex).toBe(0);
    (w as any)._privButtons.find((t: any) => t.text === '[<]').emit('pointerdown');
    expect((w as any)._privilegeIndex).toBe(1);
  });

  it('hides the Use button once the daily limit is reached', () => {
    const w = makeWindow();
    w.SetPrivileges([{ type: 0, fame: 100, dayLimit: 2, name: 'Heal', desc: 'd' }]);
    w.SetPrivilegeUse([{ key: 0, value: 2 }]);
    w.update(0);
    expect((w as any)._privButtons.some((t: any) => t.text === '[Use]')).toBe(false);
  });

  it('sends the privilege index via onUsePrivilege', () => {
    const w = makeWindow();
    w.SetPrivileges([{ type: 0, fame: 100, dayLimit: 5, name: 'Heal', desc: 'd' }]);
    w.update(0);
    let used = -1;
    w.onUsePrivilege = (idx) => { used = idx; };
    (w as any)._privButtons.find((t: any) => t.text === '[Use]').emit('pointerdown');
    expect(used).toBe(0);
  });
});
