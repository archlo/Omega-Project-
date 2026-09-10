import { describe, it, expect, beforeEach } from 'vitest';
import { Text } from 'pixi.js';
import { MegaphoneCompose } from '../../../src/ui/game/MegaphoneCompose.js';

// ponytail: avoids jsdom just for Text measurement in tests
Object.defineProperty(Text.prototype, 'width', { get: () => 0 });
Object.defineProperty(Text.prototype, 'height', { get: () => 0 });

// OG: CItemSpeakerDlg. OnCreate @0x5CA210 — backgrnd 236x182,
// BtOK id 1 @(149,153), BtCancle id 2 @(188,153), edit id 1001 @(18,129)
// 202x15 max 60 chars, checkbox id 1000 @(11,155) default CHECKED,
// item-drop layer at (103,65). Constructed without WZ here (null loader),
// so buttons fall back to text buttons at the same OG coordinates.
describe('MegaphoneCompose (CItemSpeakerDlg port)', () => {
  let dlg: MegaphoneCompose;

  beforeEach(() => {
    dlg = new MegaphoneCompose(null, null);
    dlg.container.position.set(0, 0);
  });

  it('opens with cleared state and whisper checked by default', () => {
    dlg.Open(3, 5071000);
    expect(dlg.isVisible).toBe(true);
    expect((dlg as any)._invPos).toBe(3);
    expect((dlg as any)._itemId).toBe(5071000);
    expect((dlg as any)._checked).toBe(true);
    expect((dlg as any)._edit.text).toBe('');
    expect((dlg as any)._targetTI).toBe(0);
  });

  it('checkbox toggles at the OG (11,155,14x14) rect', () => {
    dlg.Open(3, 5071000);
    // Click inside the 14x14 box (dialog at origin).
    dlg.handleMouseButton(15, 160, true);
    expect((dlg as any)._checked).toBe(false);
    dlg.handleMouseButton(15, 160, true);
    expect((dlg as any)._checked).toBe(true);
  });

  it('sends through OnSend with whisper + target on Enter', () => {
    dlg.Open(3, 5072000);
    const sent: any[] = [];
    dlg.OnSend = (invPos, itemId, message, isWhisper, targetTI, targetPOS) => {
      sent.push([invPos, itemId, message, isWhisper, targetTI, targetPOS]);
    };
    for (const ch of 'hello') dlg.onKeyPress(ch);
    // Drag an equip onto the dialog (OG PutItem stores nTI/nPOS).
    dlg.tryAcceptDrag({ itemId: 1302000, invType: 1, slotPos: 5 } as any, 103, 65);
    expect(dlg.onKeyPress('Enter')).toBe(true);
    expect(sent).toEqual([[3, 5072000, 'hello', true, 1, 5]]);
    expect(dlg.isVisible).toBe(false);
  });

  it('does not send empty messages', () => {
    dlg.Open(3, 5071000);
    let sent = false;
    dlg.OnSend = () => { sent = true; };
    expect(dlg.onKeyPress('Enter')).toBe(true);
    expect(sent).toBe(false);
    expect(dlg.isVisible).toBe(true);
  });

  it('caps input at the OG 60-char max', () => {
    dlg.Open(3, 5071000);
    for (const ch of 'x'.repeat(100)) dlg.onKeyPress(ch);
    expect((dlg as any)._edit.text.length).toBe(60);
  });

  it('Escape closes without sending', () => {
    dlg.Open(3, 5071000);
    let sent = false;
    dlg.OnSend = () => { sent = true; };
    for (const ch of 'hi') dlg.onKeyPress(ch);
    expect(dlg.onKeyPress('Escape')).toBe(true);
    expect(sent).toBe(false);
    expect(dlg.isVisible).toBe(false);
  });

  it('sender wire shape matches the OG opcode-85 layout', async () => {
    const { GameSender } = await import('../../../src/net/senders/GameSender.js');
    const { InPacket } = await import('../../../src/net/packet/InPacket.js');
    const { InHeader } = await import('../../../src/net/packet/OpCodes.js');
    const raw = GameSender.MegaphoneCompose(3, 5071000, 'hi', true, 1, 5).toArray();
    const p = new InPacket(raw);
    expect(p.readShort()).toBe(InHeader.UserConsumeCashItemUseRequest);
    p.readInt(); // update_time
    expect(p.readShort()).toBe(3);
    expect(p.readInt()).toBe(5071000);
    expect(p.readString()).toBe('hi');
    expect(p.readByte()).toBe(1);
    expect(p.readByte()).toBe(1);
    expect(p.readInt()).toBe(1);
    expect(p.readInt()).toBe(5);
  });
});
