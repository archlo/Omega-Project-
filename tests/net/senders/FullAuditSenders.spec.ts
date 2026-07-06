import { describe, it, expect } from 'vitest';
import { InHeader } from '../../../src/net/packet/OpCodes.js';
import { InPacket } from '../../../src/net/packet/InPacket.js';
import { GameSender } from '../../../src/net/senders/GameSender.js';

describe('Senders found via the full IDA-dump audit', () => {
  it('StatChangeItemCancel encodes an itemId', () => {
    const p = new InPacket(GameSender.StatChangeItemCancel(2000000).toArray());
    expect(p.readShort()).toBe(InHeader.UserStatChangeItemCancelRequest);
    expect(p.readInt()).toBe(2000000);
    expect(p.remaining).toBe(0);
  });

  it('StatChangeRequest encodes int int short short byte', () => {
    const p = new InPacket(GameSender.StatChangeRequest(1, 2, 3, 4, 5).toArray());
    expect(p.readShort()).toBe(InHeader.UserStatChangeRequest);
    expect(p.readInt()).toBe(1);
    expect(p.readInt()).toBe(2);
    expect(p.readShort()).toBe(3);
    expect(p.readShort()).toBe(4);
    expect(p.readByte()).toBe(5);
    expect(p.remaining).toBe(0);
  });

  it('StatChangeRequestByItemOption encodes int int short short', () => {
    const p = new InPacket(GameSender.StatChangeRequestByItemOption(1, 2, 3, 4).toArray());
    expect(p.readShort()).toBe(InHeader.UserStatChangeRequestByItemOption);
    expect(p.readInt()).toBe(1);
    expect(p.readInt()).toBe(2);
    expect(p.readShort()).toBe(3);
    expect(p.readShort()).toBe(4);
    expect(p.remaining).toBe(0);
  });

  it('UseBoxGachaponItem encodes pos + itemId', () => {
    const p = new InPacket(GameSender.UseBoxGachaponItem(3, 5040000).toArray());
    expect(p.readShort()).toBe(InHeader.UserUseBoxGachaponItemRequest);
    expect(p.readShort()).toBe(3);
    expect(p.readInt()).toBe(5040000);
    expect(p.remaining).toBe(0);
  });

  it('UseGachaponRemote encodes npcId + value', () => {
    const p = new InPacket(GameSender.UseGachaponRemote(9010000, 1).toArray());
    expect(p.readShort()).toBe(InHeader.UserUseGachaponRemoteRequest);
    expect(p.readInt()).toBe(9010000);
    expect(p.readInt()).toBe(1);
    expect(p.remaining).toBe(0);
  });

  it('RaiseWndPutItem / RaisePieceWndPutItem encode byte short int', () => {
    for (const [fn, header] of [
      [GameSender.RaiseWndPutItem, InHeader.UserRaiseWndPutItem],
      [GameSender.RaisePieceWndPutItem, InHeader.UserRaisePieceWndPutItem],
    ] as const) {
      const p = new InPacket(fn(1, 3, 5070000).toArray());
      expect(p.readShort()).toBe(header);
      expect(p.readByte()).toBe(1);
      expect(p.readShort()).toBe(3);
      expect(p.readInt()).toBe(5070000);
      expect(p.remaining).toBe(0);
    }
  });

  it('FindFriendMyInfoRequest / FindFriendSearchRequest encode distinct sub-action bytes', () => {
    const p1 = new InPacket(GameSender.FindFriendMyInfoRequest().toArray());
    expect(p1.readShort()).toBe(InHeader.UserFindFriendRequest);
    expect(p1.readByte()).toBe(0);
    expect(p1.remaining).toBe(0);

    const p2 = new InPacket(GameSender.FindFriendSearchRequest().toArray());
    expect(p2.readShort()).toBe(InHeader.UserFindFriendRequest);
    expect(p2.readByte()).toBe(1);
    expect(p2.remaining).toBe(0);
  });

  it('RepairDurabilityAll has no payload (decompile/6d37b0.c)', () => {
    const p = new InPacket(GameSender.RepairDurabilityAll().toArray());
    expect(p.readShort()).toBe(InHeader.RepairDurabilityAll);
    expect(p.remaining).toBe(0);
  });

  it('RepairDurability encodes the selected item nPOS (decompile/6d3980.c)', () => {
    const p = new InPacket(GameSender.RepairDurability(7).toArray());
    expect(p.readShort()).toBe(InHeader.RepairDurability);
    expect(p.readInt()).toBe(7);
    expect(p.remaining).toBe(0);
  });

  it('SkillLearnItemUseRequest encodes update_time(0)/pos/itemId (decompile/9d65e0.c)', () => {
    const p = new InPacket(GameSender.SkillLearnItemUseRequest(5, 2280000).toArray());
    expect(p.readShort()).toBe(InHeader.SkillLearnItemUseRequest);
    expect(p.readInt()).toBe(0);
    expect(p.readShort()).toBe(5);
    expect(p.readInt()).toBe(2280000);
    expect(p.remaining).toBe(0);
  });

  it('SkillResetItemUseRequest encodes update_time(0)/pos/itemId (decompile/9de8c0.c)', () => {
    const p = new InPacket(GameSender.SkillResetItemUseRequest(3, 2500000).toArray());
    expect(p.readShort()).toBe(InHeader.SkillResetItemUseRequest);
    expect(p.readInt()).toBe(0);
    expect(p.readShort()).toBe(3);
    expect(p.readInt()).toBe(2500000);
    expect(p.remaining).toBe(0);
  });

  it('MarriageRequestResponse encodes byte(2)/accepted/requesterName/partnerId (decompile/a00bb0.c)', () => {
    const p = new InPacket(GameSender.MarriageRequestResponse('Alice', 2002, true).toArray());
    expect(p.readShort()).toBe(InHeader.MarriageRequestResponse);
    expect(p.readByte()).toBe(2);
    expect(p.readByte()).toBe(1);
    expect(p.readString()).toBe('Alice');
    expect(p.readInt()).toBe(2002);
    expect(p.remaining).toBe(0);
  });

  // TODO_AUDIT.md Eighty-fifth pass: CEngageDlg's real sender,
  // CWvsContext::SendEngagementRequest — shares opcode 161 with
  // MarriageRequestResponse but action byte 0, not 2.
  it('MarriageRequest encodes byte(0)/targetName/ringItemId (decompile 0x9e1410)', () => {
    const p = new InPacket(GameSender.MarriageRequest('Bob', 2240000).toArray());
    expect(p.readShort()).toBe(InHeader.MarriageRequestResponse);
    expect(p.readByte()).toBe(0);
    expect(p.readString()).toBe('Bob');
    expect(p.readInt()).toBe(2240000);
    expect(p.remaining).toBe(0);
  });
});
