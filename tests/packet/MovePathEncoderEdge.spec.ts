import { describe, it, expect } from 'vitest';
import { EncodeMovePath, type MoveElement } from '../../src/net/packet/MovePathEncoder.js';
import { InPacket } from '../../src/net/packet/InPacket.js';

describe('MovePathEncoder edge cases', () => {
  it('encodes empty element list', () => {
    const blob = EncodeMovePath(0, 0, 0, 0, []);
    const r = new InPacket(blob);
    expect(r.readShort()).toBe(0); // originX
    expect(r.readShort()).toBe(0); // originY
    expect(r.readShort()).toBe(0); // originVx
    expect(r.readShort()).toBe(0); // originVy
    expect(r.readByte()).toBe(0);  // count
    expect(r.remaining).toBe(0);
  });

  it('NormalWithFhFall includes fhFallStart', () => {
    const elems: MoveElement[] = [{
      attr: 12, x: 100, y: 200, vx: 140, vy: 50,
      fh: 5, fhFallStart: 3, xOffset: 0, yOffset: 0,
      stat: 0, moveAction: 1, elapse: 60,
    }];
    const blob = EncodeMovePath(0, 0, 0, 0, elems);
    const r = new InPacket(blob);
    r.skip(8 + 1 + 1);
    expect(r.readShort()).toBe(100);
    expect(r.readShort()).toBe(200);
    expect(r.readShort()).toBe(140);
    expect(r.readShort()).toBe(50);
    expect(r.readShort()).toBe(5);
    expect(r.readShort()).toBe(3); // fhFallStart
    expect(r.readShort()).toBe(0); // xOffset
    expect(r.readShort()).toBe(0); // yOffset
    expect(r.readByte()).toBe(1);  // moveAction
    expect(r.readShort()).toBe(60); // elapse
    expect(r.remaining).toBe(0);
  });

  it('StartFallDown encodes vx, vy, fhFallStart', () => {
    const elems: MoveElement[] = [{
      attr: 11, x: 0, y: 0, vx: -50, vy: 200,
      fh: 0, fhFallStart: 7, xOffset: 0, yOffset: 0,
      stat: 0, moveAction: 3, elapse: 80,
    }];
    const blob = EncodeMovePath(0, 0, 0, 0, elems);
    const r = new InPacket(blob);
    r.skip(8 + 1 + 1);
    expect(r.readShort()).toBe(-50); // vx
    expect(r.readShort()).toBe(200); // vy
    expect(r.readShort()).toBe(7);   // fhFallStart
    expect(r.readByte()).toBe(3);    // moveAction
    expect(r.readShort()).toBe(80);  // elapse
    expect(r.remaining).toBe(0);
  });

  it('FlyingBlock encodes x, y, vx, vy', () => {
    const elems: MoveElement[] = [{
      attr: 17, x: 300, y: 400, vx: 200, vy: -100,
      fh: 0, fhFallStart: 0, xOffset: 0, yOffset: 0,
      stat: 0, moveAction: 4, elapse: 120,
    }];
    const blob = EncodeMovePath(0, 0, 0, 0, elems);
    const r = new InPacket(blob);
    r.skip(8 + 1 + 1);
    expect(r.readShort()).toBe(300);  // x
    expect(r.readShort()).toBe(400);  // y
    expect(r.readShort()).toBe(200);  // vx
    expect(r.readShort()).toBe(-100); // vy
    expect(r.readByte()).toBe(4);     // moveAction
    expect(r.readShort()).toBe(120);  // elapse
    expect(r.remaining).toBe(0);
  });

  it('Action element (default) only has moveAction+elapse', () => {
    const elems: MoveElement[] = [{
      attr: 0xFF, x: 0, y: 0, vx: 0, vy: 0,
      fh: 0, fhFallStart: 0, xOffset: 0, yOffset: 0,
      stat: 0, moveAction: 7, elapse: 200,
    }];
    const blob = EncodeMovePath(0, 0, 0, 0, elems);
    const r = new InPacket(blob);
    r.skip(8 + 1);
    expect(r.readByte()).toBe(0xFF); // attr
    expect(r.readByte()).toBe(7);    // moveAction
    expect(r.readShort()).toBe(200); // elapse
    expect(r.remaining).toBe(0);
  });

  it('multiple elements of different types', () => {
    const elems: MoveElement[] = [
      { attr: 0, x: 100, y: 200, vx: 140, vy: 0, fh: 5, fhFallStart: 0, xOffset: 0, yOffset: 0, stat: 0, moveAction: 0, elapse: 100 },
      { attr: 1, vx: 50, vy: -200, fh: 0, fhFallStart: 0, xOffset: 0, yOffset: 0, stat: 0, moveAction: 1, elapse: 60, x: 0, y: 0 },
      { attr: 3, x: 500, y: 300, fh: 9, vx: 0, vy: 0, fhFallStart: 0, xOffset: 0, yOffset: 0, stat: 0, moveAction: 2, elapse: 30 },
    ];
    const blob = EncodeMovePath(0, 0, 0, 0, elems);
    const r = new InPacket(blob);
    r.skip(8);
    expect(r.readByte()).toBe(3); // count
    r.skip(1); // attr 0
    r.skip(2 + 2 + 2 + 2 + 2 + 2 + 2); // Normal body: x,y,vx,vy,fh,xOffset,yOffset (7 shorts)
    expect(r.readByte()).toBe(0); // moveAction
    expect(r.readShort()).toBe(100);
    r.skip(1); // attr 1
    r.skip(2 + 2); // jump body
    expect(r.readByte()).toBe(1); // moveAction
    expect(r.readShort()).toBe(60);
    r.skip(1); // attr 3
    r.skip(2 + 2 + 2); // teleport body
    expect(r.readByte()).toBe(2); // moveAction
    expect(r.readShort()).toBe(30);
    expect(r.remaining).toBe(0);
  });
});
