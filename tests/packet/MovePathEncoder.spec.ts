import { describe, it, expect } from 'vitest';
import { EncodeMovePath, MoveElement } from '../../src/net/packet/MovePathEncoder.js';
import { InPacket } from '../../src/net/packet/InPacket.js';

describe('MovePathEncoder', () => {
  it('normal element encodes expected shape', () => {
    const elems: MoveElement[] = [
      {
        attr: 0,
        x: 100, y: 200,
        vx: 140, vy: 0,
        fh: 5,
        fhFallStart: 0,
        xOffset: 0, yOffset: 0,
        stat: 0,
        moveAction: 0,
        elapse: 100,
      },
    ];
    const blob = EncodeMovePath(80, 200, 140, 0, elems);

    const r = new InPacket(blob);
    expect(r.readShort()).toBe(80);
    expect(r.readShort()).toBe(200);
    expect(r.readShort()).toBe(140);
    expect(r.readShort()).toBe(0);
    expect(r.readByte()).toBe(1);
    expect(r.readByte()).toBe(0);
    expect(r.readShort()).toBe(100);
    expect(r.readShort()).toBe(200);
    expect(r.readShort()).toBe(140);
    expect(r.readShort()).toBe(0);
    expect(r.readShort()).toBe(5);
    expect(r.readShort()).toBe(0);
    expect(r.readShort()).toBe(0);
    expect(r.readByte()).toBe(0);
    expect(r.readShort()).toBe(100);
    expect(r.remaining).toBe(0);
  });

  it('jump element only encodes velocity', () => {
    const elems: MoveElement[] = [
      { attr: 1, vx: 50, vy: -200, moveAction: 0, elapse: 50 } as MoveElement,
    ];
    const blob = EncodeMovePath(0, 0, 0, 0, elems);
    const r = new InPacket(blob);
    r.skip(8 + 1 + 1);
    expect(r.readShort()).toBe(50);
    expect(r.readShort()).toBe(-200);
    expect(r.readByte()).toBe(0);
    expect(r.readShort()).toBe(50);
    expect(r.remaining).toBe(0);
  });

  it('stat change element skips moveAction and elapse', () => {
    const elems: MoveElement[] = [
      { attr: 9, stat: 7 } as MoveElement,
    ];
    const blob = EncodeMovePath(0, 0, 0, 0, elems);
    const r = new InPacket(blob);
    r.skip(8 + 1);
    expect(r.readByte()).toBe(9);
    expect(r.readByte()).toBe(7);
    expect(r.remaining).toBe(0);
  });

  it('teleport element encodes XYFh', () => {
    const elems: MoveElement[] = [
      { attr: 3, x: 50, y: 100, fh: 9, moveAction: 2, elapse: 30 } as MoveElement,
    ];
    const blob = EncodeMovePath(0, 0, 0, 0, elems);
    const r = new InPacket(blob);
    r.skip(8 + 1 + 1);
    expect(r.readShort()).toBe(50);
    expect(r.readShort()).toBe(100);
    expect(r.readShort()).toBe(9);
    expect(r.readByte()).toBe(2);
    expect(r.readShort()).toBe(30);
    expect(r.remaining).toBe(0);
  });
});
