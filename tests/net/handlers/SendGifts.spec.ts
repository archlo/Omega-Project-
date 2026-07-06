import { describe, it, expect } from 'vitest';
import { InHeader } from '../../../src/net/packet/OpCodes.js';
import { InPacket } from '../../../src/net/packet/InPacket.js';
import { GameSender } from '../../../src/net/senders/GameSender.js';

describe('CashShopSendGift (CUISendGifts)', () => {
  it('opcode has canonical value', () => {
    expect(InHeader.UserCashShopRequest).toBe(275);
  });

  it('encodes sub-action, SPW, commSN, buyOneADay, recipient, and message', () => {
    const p = new InPacket(GameSender.CashShopSendGift('123456', 90001, false, 'Bob', 'Happy birthday!').toArray());
    expect(p.readShort()).toBe(InHeader.UserCashShopRequest);
    expect(p.readByte()).toBe(4);
    expect(p.readString()).toBe('123456');
    expect(p.readInt()).toBe(90001);
    expect(p.readByte()).toBe(0);
    expect(p.readString()).toBe('Bob');
    expect(p.readString()).toBe('Happy birthday!');
    expect(p.remaining).toBe(0);
  });

  it('encodes the buyOneADay flag when set', () => {
    const p = new InPacket(GameSender.CashShopSendGift('123456', 90001, true, 'Bob', '').toArray());
    p.readShort(); p.readByte(); p.readString(); p.readInt();
    expect(p.readByte()).toBe(1);
  });
});
