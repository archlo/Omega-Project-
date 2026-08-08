import { describe, it, expect } from 'vitest';
import { QuickSlotConfig, GetSlotPos } from '../../../src/ui/game/QuickSlotConfig.js';
import { FuncKeyMapped, FuncKeyMappedNone, FuncKeyType } from '../../../src/domain/FuncKeyMapped.js';

// OG = CQuickslotConfigDialog — modal quickslot-key remap dialog.
// Keyboard state lives in a sentinel: -1 idle (Esc closes), 0 slot-capture
// (digits/scancodes assign to the focused slot, arrows move it), 1 OK/Cancel
// mode (Left/Right toggles which button Enter activates). We keep it in an
// explicit field instead of aliasing it over slot 7 (a decompile artifact that
// makes the real client's 8th slot un-remappable).
describe('QuickSlotConfig', () => {
  function makeDialog(over: Record<string, unknown> = {}): any {
    const dlg = new QuickSlotConfig({ Load: () => null } as any, null, null) as any;
    dlg.keysOf = () => [0x2A, 0x52, 0x47, 0x49, 0x1D, 0x53, 0x4F, 0x51];
    Object.assign(dlg, over);
    return dlg;
  }

  it('GetSlotPos places 8 slots in a 4x2 grid', () => {
    expect(GetSlotPos(0)).toEqual({ x: 50, y: 97 });
    expect(GetSlotPos(3)).toEqual({ x: 149, y: 97 });
    expect(GetSlotPos(4)).toEqual({ x: 50, y: 130 });
    expect(GetSlotPos(7)).toEqual({ x: 149, y: 130 });
  });

  it('re-snapshots keys from the manager on Open, resets to idle', () => {
    const dlg = makeDialog();
    dlg.keysOf = () => [1, 2, 3, 4, 5, 6, 7, 8];
    dlg._mode = 1;
    dlg._slotFocus = 3;
    dlg.Open();
    expect(dlg.GetKeys()).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(dlg._mode).toBe(-1);
    expect(dlg._slotFocus).toBe(0);
  });

it('capture mode assigns a digit to the focused slot', () => {
    const dlg = makeDialog();
    dlg.Open();
    dlg.onKeyPress('2'); // idle → no-op
    expect(dlg.GetKeys()[0]).toBe(0x2A);
    const slot0 = { x: dlg._root.x + GetSlotPos(0).x, y: dlg._root.y + GetSlotPos(0).y };
    dlg.handleMouseButton(slot0.x + 4, slot0.y + 4, true); // slot 0
    expect(dlg._mode).toBe(0);
    dlg.onKeyPress('2');
    expect(dlg.GetKeys()[0]).toBe(3);
  });

  it('arrows move slot focus in capture mode (4 column-wrap rows)', () => {
    const dlg = makeDialog();
    dlg.Open();
    dlg._mode = 0;
    dlg._slotFocus = 0;
    dlg.onKeyPress('ArrowRight');
    expect(dlg._slotFocus).toBe(1);
    dlg.onKeyPress('ArrowDown');
    expect(dlg._slotFocus).toBe(5);
    dlg._slotFocus = 0;
    dlg.onKeyPress('ArrowLeft'); // can't wrap off the left edge
    expect(dlg._slotFocus).toBe(0);
    dlg._slotFocus = 3;
    dlg.onKeyPress('ArrowRight'); // can't wrap off the right edge
    expect(dlg._slotFocus).toBe(3);
  });

  it('Esc in capture mode returns to idle instead of closing', () => {
    const dlg = makeDialog();
    dlg.Open();
    dlg._mode = 0;
    dlg.onKeyPress('Escape');
    expect(dlg.isVisible).toBe(true);
    expect(dlg._mode).toBe(-1);
  });

  it('Esc while idle closes the dialog', () => {
    const dlg = makeDialog();
    dlg.Open();
    dlg.onKeyPress('Escape');
    expect(dlg.isVisible).toBe(false);
  });

  it('Tab cycles capture and OK/Cancel modes; Enter confirms with the 8 keys', () => {
    const dlg = makeDialog();
    let confirmed: number[] | null = null;
    dlg.onConfirm = (keys: number[]) => { confirmed = keys; };
    dlg.Open();
    dlg.onKeyPress('Tab');
    expect(dlg._mode).toBe(0);
    dlg.onKeyPress('Tab');
    expect(dlg._mode).toBe(1);
    dlg._okCancelFocus = 1;
    dlg.onKeyPress('ArrowLeft'); // Left → OK
    expect(dlg._okCancelFocus).toBe(0);
    dlg.onKeyPress('Enter');
    expect(confirmed).not.toBeNull();
    expect(confirmed!.length).toBe(8);
    expect(dlg.isVisible).toBe(false);
  });

  it('rejects keys with no keycap sprite and duplicate keys, with a notice', () => {
    let msg = '';
    const dlg = makeDialog({
      _keycapRoot: { Get: () => { return null; } },
      notify: (m: string) => { msg = m; },
      _slotFocus: 0,
    });
    dlg.Open();
    dlg._mode = 0;
    dlg.onKeyPress('2');
    expect(msg).toMatch(/invalid/i);

    msg = '';
    dlg._keycapRoot = { Get: () => ({}) };
    dlg._keys = [0x2A, 0x2A, 3, 4, 5, 6, 7, 8];
    dlg._slotFocus = 1;
    dlg.onKeyPress('2');
    expect(msg).toMatch(/in use/i);
  });

  it('writes a valid scancode to the focused slot', () => {
    const dlg = makeDialog({ _keycapRoot: { Get: () => ({}) } });
    dlg.Open();
    dlg._mode = 0;
    dlg._slotFocus = 0;
    dlg.onKeyPress('z');
    expect(dlg._keys[0]).toBe(44);
  });

  it('draws bound func-key icons via the resolvers', () => {
    const fk: FuncKeyMapped = { type: FuncKeyType.Skill, id: 1000 };
    const itemFk: FuncKeyMapped = { type: FuncKeyType.Item, id: 2002 };
    const dlg = makeDialog({
      skillIcon: (id: number) => (id === 1000 ? ({ spr: true } as any) : null),
      itemIcon: (id: number) => (id === 2002 ? ({ spr: true } as any) : null),
    });
    expect(dlg._boundIcon(fk)).toEqual({ spr: true });
    expect(dlg._boundIcon(itemFk)).toEqual({ spr: true });
    expect(dlg._boundIcon(FuncKeyMappedNone)).toBeNull();
    expect(dlg._boundIcon({ type: FuncKeyType.MacroSkill, id: 0 } as FuncKeyMapped)).toBeNull();
  });

  it('clicking outside the slot pad while open clears capture mode', () => {
    const dlg = makeDialog();
    dlg.Open();
    dlg._mode = 0;
    // Inside the window (title strip) but outside the (65,113)-(202,180) pad.
    dlg.handleMouseButton(dlg._root.x + 10, dlg._root.y + 20, true);
    expect(dlg._mode).toBe(-1);
  });
});