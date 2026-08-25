import { describe, it, expect } from 'vitest';
import { Text } from 'pixi.js';
import { Messenger } from '../../../src/ui/game/Messenger.js';

Object.defineProperty(Text.prototype, 'width', { get: () => 0 });

// CUIMessenger (v95 IDB): SetState @0x7F4200, SetLayer @0x7F1920,
// SetCtrl @0x7F34C0, DrawTextA @0x7F2A90, AddChatText @0x7F4250,
// ProcessChat/HandleSlashCommand @0x7F6140/@0x7F5EE0, OnKey @0x7F6400.
describe('Messenger (authentic CUIMessenger)', () => {
  function lines(m: Messenger): string[] {
    return ((m as unknown as { _lines: { text: string }[] })._lines).map((l) => l.text);
  }

  it('Open() shows the Max window and seeds the OG help block', () => {
    const m = new Messenger();
    m.Open();
    expect(m.isVisible).toBe(true);
    expect(m.state).toBe(0);
    const ls = lines(m);
    expect(ls[0]).toBe('[ Maple Messenger Help ]');
    expect(ls.filter((t) => t === '-------------------------').length).toBe(2);
    expect(ls.some((t) => t.startsWith('Invite : /invite'))).toBe(true);
    expect(ls.some((t) => t.startsWith('End : /q'))).toBe(true);
  });

  it('BtMin/BtMax cycle the three states Max→Min→Min2', () => {
    const m = new Messenger();
    m.Open();
    m.SetState(1); // BtMin: (state+1)%3
    expect(m.state).toBe(1);
    m.SetState(-1); // JS modulo normalization → Min2 (2)
    expect(m.state).toBe(2);
    m.SetState(4); // (4)%3 = 1 → Min
    expect(m.state).toBe(1);
  });

  it('AddChatText wraps at the 240px budget with a 4-space continuation indent', () => {
    const m = new Messenger();
    m.Open();
    const before = lines(m).length; // welcome block
    const long = 'A'.repeat(90);
    m.AddChat(long);
    const ls = lines(m).slice(before);
    // budget ≈ 240/6 = 40 chars first line; continuation prefixed with spaces
    expect(ls.length).toBeGreaterThan(1);
    for (let i = 1; i < ls.length; i++) {
      expect(ls[i].startsWith('    ')).toBe(true);
    }
    const totalChars = ls.join('').replace(/ {4}/g, '');
    expect(totalChars.length).toBeGreaterThanOrEqual(86);
  });

  it('ProcessChat echoes "name : text" locally + fires onSubmit; /q closes; /invite fires onInvite', () => {
    const m = new Messenger();
    m.Open();
    m.selfName = 'Me';
    m.SetSelf(0);
    m.onKeyPress('Enter'); // focus the edit (OG SetFocusChild)
    const sent: string[] = [];
    m.onSubmit = (t) => sent.push(t);

    m.onKeyPress('h');
    m.onKeyPress('i');
    m.onKeyPress('Enter');
    expect(sent).toEqual(['hi']);
    expect(lines(m)).toContain('Me : hi');

    let invited: string | null = null;
    m.onInvite = (n) => { invited = n; };
    m.onKeyPress('/');
    'invite Bob'.split('').forEach((c) => m.onKeyPress(c));
    m.onKeyPress('Enter');
    expect(invited).toBe('Bob');

    let closed = false;
    m.onClosed = () => { closed = true; };
    m.onKeyPress('/');
    m.onKeyPress('q');
    m.onKeyPress('Enter');
    expect(closed).toBe(true);
    expect(m.isVisible).toBe(false);
  });

  it('Escape asks to exit via TryDelete (closes + resets + fires onClosed)', () => {
    const m = new Messenger();
    m.Open();
    m.SetParticipant(1, 'Bob');
    let closed = false;
    m.onClosed = () => { closed = true; };
    m.onKeyPress('Escape');
    expect(closed).toBe(true);
    expect(m.isVisible).toBe(false);
    // Reset cleared participants
    expect((m as unknown as { _slots: (string | null)[] })._slots.every((s) => s === null)).toBe(true);
  });

  it('ArrowUp recalls history (CChatHelper)', () => {
    const m = new Messenger();
    m.Open();
    m.selfName = 'Me';
    m.SetSelf(0);
    m.onKeyPress('Enter'); // focus
    m.onKeyPress('a');
    m.onKeyPress('Enter'); // refocuses per OG
    m.onKeyPress('b');
    m.onKeyPress('Enter');
    m.onKeyPress('ArrowUp');
    m.onKeyPress('ArrowUp');
    expect((m as unknown as { _input: string })._input).toBe('a');
  });

  it('status strip joins member names + " is typing." beside the state icon', () => {
    const m = new Messenger();
    m.Open();
    m.SetSelf(0);
    m.SetParticipant(1, 'Bob');
    m.draw();
    const status = (m as unknown as { _statusNode: Text | null })._statusNode;
    expect(status).not.toBeNull();
    expect(status!.text).toBe('Bob is typing.');
    expect([status!.x, status!.y]).toEqual([29, 332]); // icon at (12,332), text at x=17+12
  });
});
