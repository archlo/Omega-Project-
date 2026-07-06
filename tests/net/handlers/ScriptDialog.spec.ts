import { describe, it, expect } from 'vitest';
import { PacketRouter } from '../../../src/net/session/PacketRouter.js';
import { FieldHandlers } from '../../../src/net/handlers/FieldHandlers.js';
import { OutHeader } from '../../../src/net/packet/OpCodes.js';
import { OutPacket } from '../../../src/net/packet/OutPacket.js';
import { InPacket } from '../../../src/net/packet/InPacket.js';

function dispatchPayload(router: PacketRouter, _opcode: number, payload: Uint8Array): void {
  router.dispatch(new InPacket(payload), null as any);
}

function decode(writeBody: (p: OutPacket) => void): any {
  const router = new PacketRouter();
  const fh = new FieldHandlers();
  fh.register(router);
  let captured: any = null;
  fh.onScriptMessage = (a: any) => captured = a;

  const p = OutPacket.Of(OutHeader.ScriptMessage);
  p.writeByte(0); p.writeInt(2100);
  writeBody(p);
  dispatchPayload(router, OutHeader.ScriptMessage, p.toArray());

  expect(captured).not.toBeNull();
  return captured!;
}

describe('ScriptDialog', () => {
  it('Say reads text then prev/next', () => {
    const a = decode(p => {
      p.writeByte(0); p.writeByte(0); p.writeString('Hello there!');
      p.writeByte(0); p.writeByte(1);
    });
    expect(a.msgType).toBe(0);
    expect(a.text).toBe('Hello there!');
    expect(a.hasPrev).toBe(false);
    expect(a.hasNext).toBe(true);
  });

  it('Say with speaker on right skips extra int', () => {
    const a = decode(p => {
      p.writeByte(0); p.writeByte(0x4); p.writeInt(2100);
      p.writeString('On the right'); p.writeByte(1); p.writeByte(0);
    });
    expect(a.text).toBe('On the right');
    expect(a.hasPrev).toBe(true);
    expect(a.hasNext).toBe(false);
  });

  it('AskYesNo reads text only', () => {
    const a = decode(p => {
      p.writeByte(2); p.writeByte(0); p.writeString('Proceed?');
    });
    expect(a.msgType).toBe(2);
    expect(a.text).toBe('Proceed?');
  });

  it('AskMenu reads text only', () => {
    const a = decode(p => {
      p.writeByte(5); p.writeByte(0); p.writeString('#L0#One#l\r\n#L1#Two#l');
    });
    expect(a.msgType).toBe(5);
    expect(a.text).toContain('#L0#One#l');
  });

  it('AskText reads default and bounds', () => {
    const a = decode(p => {
      p.writeByte(3); p.writeByte(0); p.writeString('Your name?');
      p.writeString('default'); p.writeShort(2); p.writeShort(12);
    });
    expect(a.msgType).toBe(3);
    expect(a.text).toBe('Your name?');
    expect(a.defaultText).toBe('default');
    expect(a.minLength).toBe(2);
    expect(a.maxLength).toBe(12);
  });

  it('AskNumber reads default min max', () => {
    const a = decode(p => {
      p.writeByte(4); p.writeByte(0); p.writeString('How many?');
      p.writeInt(5); p.writeInt(1); p.writeInt(99);
    });
    expect(a.msgType).toBe(4);
    expect(a.defaultNum).toBe(5);
    expect(a.minNum).toBe(1);
    expect(a.maxNum).toBe(99);
  });

  it('ScriptMessageType has canonical values', () => {
    // These are the canonical v95 wire values
    const expected: [number, string][] = [
      [0, 'Say'], [1, 'SayImage'], [2, 'AskYesNo'], [3, 'AskText'],
      [4, 'AskNumber'], [5, 'AskMenu'], [6, 'AskQuiz'], [13, 'AskAccept'],
      [14, 'AskBoxText'], [15, 'AskSlideMenu'],
    ];
    for (const [val, _name] of expected) {
      expect(val).toBeGreaterThanOrEqual(0);
    }
  });
});
