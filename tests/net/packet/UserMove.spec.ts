import { describe, it, expect } from 'vitest';
import { GameSender } from '../../../src/net/senders/GameSender.js';
import { InHeader } from '../../../src/net/packet/OpCodes.js';
import { InPacket } from '../../../src/net/packet/InPacket.js';
import { EncodeMovePath, type MoveElement } from '../../../src/net/packet/MovePathEncoder.js';

describe('GameSender.UserMove C->S framing', () => {
  // The server's handleUserMove reads 2 ints + byte fieldKey + 5 ints (the
  // last two being the anti-cheat dwCrc / Crc32 slots) before MovePath.decode.
  // The move path body must start exactly after that 29-byte header, or the
  // server mis-parses every move (garbage position, no remote movement).
  it('writes the full 29-byte header before the move path body', () => {
    const elems: MoveElement[] = [
      {
        attr: 0, x: 150, y: 250, vx: 140, vy: 0, fh: 5,
        fhFallStart: 0, xOffset: 0, yOffset: 0, stat: 0, moveAction: 0, elapse: 100,
      },
    ];
    const blob = EncodeMovePath(150, 250, 140, 0, elems);

    const p = GameSender.UserMove(2, blob);
    const r = new InPacket(p.toArray());

    expect(r.readShort()).toBe(InHeader.UserMove); // opcode 44
    r.readInt(); // 0
    r.readInt(); // 0
    expect(r.readByte()).toBe(2); // fieldKey
    r.readInt(); // 0
    r.readInt(); // 0
    r.readInt(); // dwCrc slot
    r.readInt(); // 0
    r.readInt(); // Crc32 slot

    // Move path body starts here — same shape MovePathDecoder/server expects.
    expect(r.readShort()).toBe(150);
    expect(r.readShort()).toBe(250);
    expect(r.readShort()).toBe(140);
    expect(r.readShort()).toBe(0);
    expect(r.readByte()).toBe(1);
    expect(r.remaining).toBeGreaterThan(0); // elements remain
  });

  it('header is exactly 29 bytes before the path body', () => {
    const blob = EncodeMovePath(0, 0, 0, 0, [
      { attr: 0, x: 10, y: 10, vx: 0, vy: 0, fh: 0, fhFallStart: 0, xOffset: 0, yOffset: 0, stat: 0, moveAction: 0, elapse: 10 },
    ]);
    const p = GameSender.UserMove(1, blob);
    const r = new InPacket(p.toArray());
    r.readShort(); // opcode
    r.readInt(); r.readInt(); r.readByte(); r.readInt(); r.readInt(); r.readInt(); r.readInt(); r.readInt();
    // The remainder is exactly the path blob.
    expect(r.remaining).toBe(blob.length);
  });

  it('server-side decode reads the move path cleanly after the 29-byte header', () => {
    // Reproduce the server's handleUserMove read order: 2 ints, byte fieldKey,
    // 5 ints (dwCrc + Crc32 slots), then MovePath.decode. If the header were
    // wrong, the origin shorts would read garbage and the element count would
    // land mid-path.
    const elems: MoveElement[] = [
      {
        attr: 0, x: 300, y: 400, vx: 200, vy: 0, fh: 7,
        fhFallStart: 0, xOffset: 0, yOffset: 0, stat: 0, moveAction: 2, elapse: 120,
      },
      { attr: 1, vx: 80, vy: -250, moveAction: 6, elapse: 60 } as MoveElement,
    ];
    const blob = EncodeMovePath(300, 400, 200, 0, elems);
    const p = GameSender.UserMove(2, blob);
    const r = new InPacket(p.toArray());

    // --- server read order ---
    r.readShort(); // opcode
    r.readInt(); r.readInt();
    expect(r.readByte()).toBe(2); // fieldKey
    r.readInt(); r.readInt(); r.readInt(); r.readInt(); r.readInt();

    // --- MovePath.decode ---
    expect(r.readShort()).toBe(300); // originX
    expect(r.readShort()).toBe(400); // originY
    expect(r.readShort()).toBe(200); // originVx
    expect(r.readShort()).toBe(0);   // originVy
    expect(r.readByte()).toBe(2);    // element count
    // element 0: Normal
    expect(r.readByte()).toBe(0);
    expect(r.readShort()).toBe(300); expect(r.readShort()).toBe(400);
    expect(r.readShort()).toBe(200); expect(r.readShort()).toBe(0);
    expect(r.readShort()).toBe(7);
    expect(r.readShort()).toBe(0); expect(r.readShort()).toBe(0); // xOffset/yOffset
    expect(r.readByte()).toBe(2);  // moveAction
    expect(r.readShort()).toBe(120); // elapse
    // element 1: Jump
    expect(r.readByte()).toBe(1);
    expect(r.readShort()).toBe(80); expect(r.readShort()).toBe(-250);
    expect(r.readByte()).toBe(6);  // moveAction
    expect(r.readShort()).toBe(60); // elapse
    expect(r.remaining).toBe(0);
  });
});
