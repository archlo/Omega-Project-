import { describe, it, expect } from 'vitest';
import { InPacket } from '../../src/net/packet/InPacket.js';
import { OutPacket } from '../../src/net/packet/OutPacket.js';
import { InHeader } from '../../src/net/packet/OpCodes.js';

describe('InPacket', () => {
  it('round-trips primitives', () => {
    const p = OutPacket.Raw();
    p.writeByte(0xAB);
    p.writeShort(0x1234);
    p.writeInt(0xDEADBEEF);
    p.writeLong(BigInt('0x0102030405060708'));
    p.writeFloat(1.5);
    p.writeDouble(-2.25);

    const r = new InPacket(p.toArray());
    expect(r.readByte()).toBe(0xAB);
    expect(r.readShort()).toBe(0x1234);
    expect(r.readInt()).toBe((0xDEADBEEF | 0));
    expect(r.readLong()).toBe(BigInt('0x0102030405060708'));
    expect(r.readFloat()).toBeCloseTo(1.5);
    expect(r.readDouble()).toBe(-2.25);
    expect(r.remaining).toBe(0);
  });

  it('round-trips strings', () => {
    const p = OutPacket.Raw();
    p.writeString('admin');
    p.writeString('');
    p.writeStringFixed('aaa', 5);
    const r = new InPacket(p.toArray());
    expect(r.readString()).toBe('admin');
    expect(r.readString()).toBe('');
    expect(r.readString(5)).toBe('aaa');
  });

  it('readString with exact length at capacity', () => {
    const p = OutPacket.Raw();
    p.writeStringFixed('ABCDE', 5);
    const r = new InPacket(p.toArray());
    expect(r.readString(5)).toBe('ABCDE');
  });

  it('round-trips bool and bytes', () => {
    const p = OutPacket.Raw();
    p.writeByte(1);
    p.writeByte(0);
    p.writeBytes(new Uint8Array([0x01, 0x02, 0x03, 0x04]));
    const r = new InPacket(p.toArray());
    expect(r.readBool()).toBe(true);
    expect(r.readBool()).toBe(false);
    expect(r.readBytes(4)).toEqual(new Uint8Array([0x01, 0x02, 0x03, 0x04]));
  });

  it('peek does not advance cursor', () => {
    const p = OutPacket.Of(InHeader.CheckPassword);
    const r = new InPacket(p.toArray());
    expect(r.peekShort()).toBe(InHeader.CheckPassword);
    expect(r.peekShort()).toBe(InHeader.CheckPassword);
    expect(r.position).toBe(0);
    expect(r.readShort()).toBe(InHeader.CheckPassword);
  });

  it('read past end throws', () => {
    const r = new InPacket(new Uint8Array([0x01]));
    expect(r.readByte()).toBe(0x01);
    expect(() => r.readByte()).toThrow();
  });

  it('skip advances cursor', () => {
    const p = OutPacket.Raw();
    p.writeBytes(new Uint8Array([0x01, 0x02, 0x03, 0x04]));
    const r = new InPacket(p.toArray());
    r.skip(2);
    expect(r.readByte()).toBe(0x03);
  });

  it('readString fixed-length stops at first NUL', () => {
    const bytes = new Uint8Array([0x41, 0x42, 0x00, 0x58, 0x58]);
    const r = new InPacket(bytes);
    expect(r.readString(5)).toBe('AB');
  });
});
