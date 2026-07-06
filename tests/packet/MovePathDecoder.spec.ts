import { describe, it, expect } from 'vitest';
import { EncodeMovePath, MoveElement } from '../../src/net/packet/MovePathEncoder.js';
import { DecodeMovePath } from '../../src/net/packet/MovePathDecoder.js';
import { InPacket } from '../../src/net/packet/InPacket.js';
import { MoveActionToStance } from '../../src/character/Stance.js';
import { Stance, StanceMoveAction } from '../../src/character/Stance.js';

// Mirrors CMovePath::Decode (live IDA decompile, Maplestory95.exe.i64
// 0x667920) for the bPassive=0 case used by CUserRemote::OnMove. Roundtrips
// through the already-confirmed MovePathEncoder so both sides are checked
// against the same per-attr field groupings.
describe('DecodeMovePath', () => {
  it('roundtrips a Normal element', () => {
    const elems: MoveElement[] = [
      { attr: 0, x: 100, y: 200, vx: 140, vy: 0, fh: 5, fhFallStart: 0, xOffset: 0, yOffset: 0, stat: 0, moveAction: 0x12, elapse: 100 },
    ];
    const blob = EncodeMovePath(80, 200, 140, 0, elems);
    const path = DecodeMovePath(new InPacket(blob));
    expect(path.originX).toBe(80);
    expect(path.originY).toBe(200);
    expect(path.elements).toHaveLength(1);
    const e = path.elements[0];
    expect(e.attr).toBe(0);
    expect(e.x).toBe(100);
    expect(e.y).toBe(200);
    expect(e.vx).toBe(140);
    expect(e.fh).toBe(5);
    expect(e.moveAction).toBe(0x12);
    expect(e.elapse).toBe(100);
  });

  it('Jump element carries over x/y from origin, reads only velocity', () => {
    const elems: MoveElement[] = [
      { attr: 1, vx: 50, vy: -200, moveAction: 0, elapse: 50 } as MoveElement,
    ];
    const blob = EncodeMovePath(10, 20, 0, 0, elems);
    const path = DecodeMovePath(new InPacket(blob));
    const e = path.elements[0];
    expect(e.x).toBe(10);
    expect(e.y).toBe(20);
    expect(e.vx).toBe(50);
    expect(e.vy).toBe(-200);
    expect(e.fh).toBe(0);
  });

  it('StatChange element reads only the stat byte, no moveAction/elapse', () => {
    const elems: MoveElement[] = [
      { attr: 9, stat: 7 } as MoveElement,
    ];
    const blob = EncodeMovePath(5, 6, 0, 0, elems);
    const path = DecodeMovePath(new InPacket(blob));
    const e = path.elements[0];
    expect(e.attr).toBe(9);
    expect(e.stat).toBe(7);
    expect(e.elapse).toBe(0);
  });

  it('Teleport element reads x/y/fh, zeroes velocity', () => {
    const elems: MoveElement[] = [
      { attr: 3, x: 50, y: 100, fh: 9, moveAction: 2, elapse: 30 } as MoveElement,
    ];
    const blob = EncodeMovePath(0, 0, 0, 0, elems);
    const path = DecodeMovePath(new InPacket(blob));
    const e = path.elements[0];
    expect(e.x).toBe(50);
    expect(e.y).toBe(100);
    expect(e.fh).toBe(9);
    expect(e.vx).toBe(0);
    expect(e.vy).toBe(0);
    expect(e.moveAction).toBe(2);
  });

  it('FlyingBlock element reads x/y/vx/vy', () => {
    const elems: MoveElement[] = [
      { attr: 17, x: 11, y: 22, vx: 33, vy: 44, moveAction: 0, elapse: 0 } as MoveElement,
    ];
    const blob = EncodeMovePath(0, 0, 0, 0, elems);
    const path = DecodeMovePath(new InPacket(blob));
    const e = path.elements[0];
    expect(e.x).toBe(11);
    expect(e.y).toBe(22);
    expect(e.vx).toBe(33);
    expect(e.vy).toBe(44);
  });

  it('multiple elements carry position forward correctly', () => {
    const elems: MoveElement[] = [
      { attr: 0, x: 0, y: 0, vx: 10, vy: 0, fh: 1, fhFallStart: 0, xOffset: 0, yOffset: 0, stat: 0, moveAction: 0, elapse: 50 },
      { attr: 1, vx: 5, vy: -100, moveAction: 0, elapse: 20 } as MoveElement,
    ];
    const blob = EncodeMovePath(0, 0, 0, 0, elems);
    const path = DecodeMovePath(new InPacket(blob));
    expect(path.elements).toHaveLength(2);
    // Jump (2nd element) should carry over x/y from the 1st element's x/y (0,0 here, both zero — verify it inherits, not zeros independently)
    expect(path.elements[1].x).toBe(path.elements[0].x);
    expect(path.elements[1].y).toBe(path.elements[0].y);
  });
});

describe('MoveActionToStance', () => {
  it('inverts StanceMoveAction for every stance it can produce', () => {
    for (const stance of [Stance.Stand1, Stance.Stand2, Stance.Walk1, Stance.Walk2, Stance.Jump, Stance.Alert, Stance.Prone, Stance.Sit]) {
      for (const facingLeft of [true, false]) {
        const byte = StanceMoveAction(stance, facingLeft);
        const back = MoveActionToStance(byte);
        expect(back.stance).toBe(stance);
        expect(back.facingLeft).toBe(facingLeft);
      }
    }
  });
});
