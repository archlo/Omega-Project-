import { describe, it, expect, beforeEach } from 'vitest';
import { FieldHandlers } from '../../../src/net/handlers/FieldHandlers.js';
import { OutHeader } from '../../../src/net/packet/OpCodes.js';
import { OutPacket } from '../../../src/net/packet/OutPacket.js';
import { InPacket } from '../../../src/net/packet/InPacket.js';
import type { BroadcastMsgArgs } from '../../../src/net/handlers/PacketArgs.js';

// OG: CWvsContext::OnBroadcastMsg @0xA04160 (opcode 71). Per-type tails after
// the string: T8 byte channel/byte whisperIcon/byte hasItem [+item blob];
// T3/T20 byte channel/byte whisperIcon; T10 byte lineCount/[str x2]/byte
// channel/byte whisperIcon; T6 int itemId; T7 int templateId; T4 byte subFlag.
describe('BroadcastMsg decode (OG OnBroadcastMsg)', () => {
  let handlers: FieldHandlers;
  let seen: BroadcastMsgArgs[];

  beforeEach(() => {
    handlers = new FieldHandlers();
    seen = [];
    handlers.onBroadcastMsg = (args) => { seen.push(args); };
  });

  function payload(build: (p: OutPacket) => void): Uint8Array {
    const p = OutPacket.Of(OutHeader.BroadcastMsg);
    build(p);
    // Strip the 2-byte opcode header — handler reads the body.
    return p.toArray().slice(2);
  }

  function writeEquipBlob(p: OutPacket, itemId: number): void {
    p.writeByte(1); p.writeInt(itemId); p.writeByte(0); p.writeLong(0n);
    p.writeByte(0); p.writeByte(0);
    for (let i = 0; i < 18; i++) p.writeShort(0);
    p.writeString(''); p.writeShort(0);
    p.writeByte(0); p.writeByte(0);
    p.writeInt(0); p.writeInt(0); p.writeInt(0);
    p.writeByte(0); p.writeByte(0);
    for (let i = 0; i < 5; i++) p.writeShort(0);
    p.writeLong(0n); p.writeLong(0n); p.writeInt(0);
  }

  it('type 2 reads the bare string (channel megaphone)', () => {
    (handlers as any).handleBroadcastMsg(new InPacket(payload((p) => {
      p.writeByte(2);
      p.writeString('Hero : hello channel');
    })));
    expect(seen).toEqual([{ msgType: 2, text: 'Hero : hello channel' }]);
  });

  it('type 3 reads channel + whisper tail (super megaphone)', () => {
    (handlers as any).handleBroadcastMsg(new InPacket(payload((p) => {
      p.writeByte(3);
      p.writeString('Hero : hello world');
      p.writeByte(0);
      p.writeByte(1);
    })));
    expect(seen).toEqual([{
      msgType: 3, text: 'Hero : hello world', channel: 0, whisperIcon: true,
    }]);
  });

  it('type 8 reads the item tail (item megaphone)', () => {
    (handlers as any).handleBroadcastMsg(new InPacket(payload((p) => {
      p.writeByte(8);
      p.writeString('Hero : check this');
      p.writeByte(0);
      p.writeByte(0);
      p.writeByte(1);
      writeEquipBlob(p, 1302000);
    })));
    expect(seen.length).toBe(1);
    expect(seen[0].msgType).toBe(8);
    expect(seen[0].channel).toBe(0);
    expect(seen[0].itemId).toBe(1302000);
  });

  it('type 10 reads line-count + extra strings + tail (triple megaphone)', () => {
    (handlers as any).handleBroadcastMsg(new InPacket(payload((p) => {
      p.writeByte(10);
      p.writeString('Hero : one');
      p.writeByte(3);
      p.writeString('Hero : two');
      p.writeString('Hero : three');
      p.writeByte(0);
      p.writeByte(1);
    })));
    expect(seen).toEqual([{
      msgType: 10, text: 'Hero : one',
      extraLines: ['Hero : two', 'Hero : three'],
      channel: 0, whisperIcon: true,
    }]);
  });

  it('type 4 with subFlag 0 clears (null text)', () => {
    (handlers as any).handleBroadcastMsg(new InPacket(payload((p) => {
      p.writeByte(4);
      p.writeByte(0);
    })));
    expect(seen).toEqual([{ msgType: 4, text: null }]);
  });

  it('type 6 reads the item id, type 7 the template id', () => {
    (handlers as any).handleBroadcastMsg(new InPacket(payload((p) => {
      p.writeByte(6);
      p.writeString('gain!');
      p.writeInt(1302000);
    })));
    (handlers as any).handleBroadcastMsg(new InPacket(payload((p) => {
      p.writeByte(7);
      p.writeString('popup');
      p.writeInt(9010023);
    })));
    expect(seen).toEqual([
      { msgType: 6, text: 'gain!', itemId: 1302000 },
      { msgType: 7, text: 'popup', templateId: 9010023 },
    ]);
  });

  it('type 0/1/5 read the bare string', () => {
    for (const t of [0, 1, 5]) {
      (handlers as any).handleBroadcastMsg(new InPacket(payload((p) => {
        p.writeByte(t);
        p.writeString(`n${t}`);
      })));
    }
    expect(seen).toEqual([
      { msgType: 0, text: 'n0' },
      { msgType: 1, text: 'n1' },
      { msgType: 5, text: 'n5' },
    ]);
  });
});
