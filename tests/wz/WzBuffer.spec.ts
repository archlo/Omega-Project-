import { describe, it, expect } from 'vitest';
import { WzBuffer } from '../../src/wz/WzBuffer.js';

function makeBuffer(...bytes: number[]): WzBuffer {
  return new WzBuffer(new Uint8Array(bytes).buffer);
}

describe('WzBuffer', () => {
  it('ReadByte returns unsigned byte at position', () => {
    const b = makeBuffer(0x00, 0x01, 0x80, 0xFF);
    expect(b.ReadByte()).toBe(0x00);
    expect(b.Position).toBe(1);
    expect(b.ReadByte()).toBe(0x01);
    expect(b.ReadByte()).toBe(0x80);
    expect(b.ReadByte()).toBe(0xFF);
  });

  it('ReadSByte returns signed byte', () => {
    const b = makeBuffer(0x00, 0x7F, 0x80, 0xFF);
    expect(b.ReadSByte()).toBe(0);
    expect(b.ReadSByte()).toBe(127);
    expect(b.ReadSByte()).toBe(-128);
    expect(b.ReadSByte()).toBe(-1);
  });

  it('ReadShort returns signed 16-bit LE', () => {
    const b = makeBuffer(0x00, 0x00, 0x01, 0x00, 0x00, 0x80, 0xFF, 0xFF);
    expect(b.ReadShort()).toBe(0);
    expect(b.ReadShort()).toBe(1);
    expect(b.ReadShort()).toBe(-32768);
    expect(b.ReadShort()).toBe(-1);
  });

  it('ReadUShort returns unsigned 16-bit LE', () => {
    const b = makeBuffer(0x00, 0x00, 0xFF, 0xFF);
    expect(b.ReadUShort()).toBe(0);
    expect(b.ReadUShort()).toBe(65535);
  });

  it('ReadInt returns signed 32-bit LE', () => {
    const b = makeBuffer(0x00, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0xFF, 0xFF);
    expect(b.ReadInt()).toBe(0);
    expect(b.ReadInt()).toBe(-1);
  });

  it('ReadLong returns BigInt 64-bit LE', () => {
    const b = makeBuffer(0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF);
    expect(b.ReadLong()).toBe(0n);
    expect(b.ReadLong()).toBe(-1n);
  });

  it('ReadFloat returns 32-bit LE float', () => {
    const b = makeBuffer(0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x80, 0x3F);
    expect(b.ReadFloat()).toBe(0);
    expect(b.ReadFloat()).toBeCloseTo(1.0, 5);
  });

  it('ReadDouble returns 64-bit LE double', () => {
    const b = makeBuffer(0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xF0, 0x3F);
    expect(b.ReadDouble()).toBe(0);
    expect(b.ReadDouble()).toBeCloseTo(1.0, 10);
  });

  it('ReadBytes copies slice', () => {
    const b = makeBuffer(1, 2, 3, 4, 5);
    const slice = b.ReadBytes(3);
    expect([...slice]).toEqual([1, 2, 3]);
    expect(b.Position).toBe(3);
  });

  it('ReadBytes zero count returns empty', () => {
    const b = makeBuffer(1, 2, 3);
    const slice = b.ReadBytes(0);
    expect(slice).toHaveLength(0);
    expect(b.Position).toBe(0);
  });

  it('Position tracks reads', () => {
    const b = makeBuffer(0, 0, 0, 0, 0, 0, 0, 0);
    expect(b.Position).toBe(0);
    b.ReadByte(); expect(b.Position).toBe(1);
    b.ReadShort(); expect(b.Position).toBe(3);
    b.ReadInt(); expect(b.Position).toBe(7);
    b.ReadByte(); expect(b.Position).toBe(8);
  });

  it('Position setter allows seeking', () => {
    const b = makeBuffer(0x10, 0x20, 0x30, 0x40);
    b.Position = 2;
    expect(b.ReadByte()).toBe(0x30);
    b.Position = 0;
    expect(b.ReadByte()).toBe(0x10);
  });

  it('Length returns buffer size', () => {
    const b = makeBuffer(...Array(100).keys());
    expect(b.Length).toBe(100);
  });
});
