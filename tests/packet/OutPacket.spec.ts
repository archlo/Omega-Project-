import { describe, it, expect } from 'vitest';
import { OutPacket } from '../../src/net/packet/OutPacket.js';
import { InHeader } from '../../src/net/packet/OpCodes.js';

describe('OutPacket', () => {
  it('ofHeader writes opcode little-endian', () => {
    const p = OutPacket.Of(InHeader.CheckPassword);
    const bytes = p.toArray();
    expect(bytes).toHaveLength(2);
    expect(bytes[0]).toBe(0x01);
    expect(bytes[1]).toBe(0x00);
  });

  it('primitives write little-endian', () => {
    const p = OutPacket.Raw();
    p.writeByte(0xAB);
    p.writeShort(0x1234);
    p.writeInt(0xDEADBEEF);
    p.writeLong(BigInt('0x0102030405060708'));
    const bytes = p.toArray();
    expect(bytes).toEqual(new Uint8Array([
      0xAB,
      0x34, 0x12,
      0xEF, 0xBE, 0xAD, 0xDE,
      0x08, 0x07, 0x06, 0x05, 0x04, 0x03, 0x02, 0x01,
    ]));
  });

  it('writeString length-prefixed ASCII', () => {
    const p = OutPacket.Raw();
    p.writeString('admin');
    const bytes = p.toArray();
    expect(bytes).toEqual(new Uint8Array([
      0x05, 0x00, 0x61, 0x64, 0x6D, 0x69, 0x6E,
    ]));
  });

  it('writeStringFixed null-pads', () => {
    const p = OutPacket.Raw();
    p.writeStringFixed('Hi', 5);
    const bytes = p.toArray();
    expect(bytes).toEqual(new Uint8Array([
      0x48, 0x69, 0x00, 0x00, 0x00,
    ]));
  });

  it('writeStringFixed truncates', () => {
    const p = OutPacket.Raw();
    p.writeStringFixed('HelloWorld', 5);
    const bytes = p.toArray();
    expect(bytes).toEqual(new Uint8Array([
      0x48, 0x65, 0x6C, 0x6C, 0x6F,
    ]));
  });

  it('writeString null treated as empty', () => {
    const p = OutPacket.Raw();
    p.writeString(null);
    const bytes = p.toArray();
    expect(bytes).toEqual(new Uint8Array([0x00, 0x00]));
  });

  it('grow handles large payloads', () => {
    const p = OutPacket.Raw(8);
    for (let i = 0; i < 1024; i++) {
      p.writeInt(i);
    }
    expect(p.size).toBe(4096);
    const bytes = p.toArray();
    expect(bytes).toHaveLength(4096);
    expect(bytes[0]).toBe(0);
    expect(bytes[4]).toBe(1);
    expect(bytes[4092]).toBe(0xFF);
    expect(bytes[4093]).toBe(0x03);
  });
});
