import { describe, it, expect } from 'vitest';
import { GameSender, MapleStat } from '../../../src/net/senders/GameSender.js';
import { InHeader } from '../../../src/net/packet/OpCodes.js';
import { InPacket } from '../../../src/net/packet/InPacket.js';
import { ScriptMessageType } from '../../../src/net/packet/ScriptMessageType.js';
import { WhisperSendBit } from '../../../src/net/protocol/Enums.js';

function opcode(pkt: { toArray(): Uint8Array }): number {
  const arr = pkt.toArray();
  return arr[0] | (arr[1] << 8);
}

function payload(pkt: { toArray(): Uint8Array }): Uint8Array {
  return pkt.toArray().subarray(2);
}

describe('GameSender', () => {
  it('AliveAck sends opcode 25 with no body', () => {
    const pkt = GameSender.AliveAck();
    expect(opcode(pkt)).toBe(InHeader.AliveAck);
    expect(payload(pkt).length).toBe(0);
  });

  it('UserChat writes string + null terminator', () => {
    const pkt = GameSender.UserChat('hello');
    expect(opcode(pkt)).toBe(InHeader.UserChat);
    const body = payload(pkt);
    // int(0) + length-prefixed "hello" (2 + 5 = 7 bytes) + 1 null byte = 12
    expect(body.length).toBe(12);
    expect(new DataView(body.buffer, body.byteOffset, 4).getInt32(0, true)).toBe(0); // update_time
    expect(body[4]).toBe(5); // string length (5)
    expect(body[5]).toBe(0);
    expect(body[6]).toBe(104); // 'h'
    expect(body[7]).toBe(101); // 'e'
    expect(body[8]).toBe(108); // 'l'
    expect(body[9]).toBe(108); // 'l'
    expect(body[10]).toBe(111); // 'o'
    expect(body[11]).toBe(0);   // null terminator
  });

  it('DropItem encodes a slot move to the sentinel destination slot 0', () => {
    // v95 CDraggableItem::OnDropped: drop = UserChangeSlotPositionRequest with
    // nToSlotPos = 0. body: int(0) + byte invType + short from + short to(0) + short count.
    const pkt = GameSender.DropItem(2 /* Use */, 5, 3);
    expect(opcode(pkt)).toBe(InHeader.UserChangeSlotPositionRequest);
    const body = payload(pkt);
    const dv = new DataView(body.buffer, body.byteOffset, body.length);
    expect(body.length).toBe(4 + 1 + 2 + 2 + 2);
    expect(dv.getInt32(0, true)).toBe(0);   // update_time
    expect(body[4]).toBe(2);                 // invType
    expect(dv.getInt16(5, true)).toBe(5);    // from slot
    expect(dv.getInt16(7, true)).toBe(0);    // to slot = 0 (drop)
    expect(dv.getInt16(9, true)).toBe(3);    // count
  });

  it('UserAbilityUp writes padding + stat value', () => {
    const pkt = GameSender.UserAbilityUp(MapleStat.Str);
    expect(opcode(pkt)).toBe(InHeader.UserAbilityUpRequest);
    const body = payload(pkt);
    // update_time (4 bytes) + stat value (4 bytes)
    expect(body.length).toBe(8);
    expect(new DataView(body.buffer, body.byteOffset, 4).getInt32(0, true)).toBe(0); // update_time
    // MapleStat.Str = 0x40 = 64
    expect(new DataView(body.buffer, body.byteOffset + 4, 4).getInt32(0, true)).toBe(0x40);
  });

  it('SkillUp writes skill ID', () => {
    const pkt = GameSender.SkillUp(12345);
    expect(opcode(pkt)).toBe(InHeader.UserSkillUpRequest);
    const body = payload(pkt);
    expect(body.length).toBe(8);
    expect(new DataView(body.buffer, body.byteOffset, 4).getInt32(0, true)).toBe(0); // update_time
    expect(new DataView(body.buffer, body.byteOffset + 4, 4).getInt32(0, true)).toBe(12345);
  });

  it('UseSkill writes skill ID, slv, tDelay', () => {
    const pkt = GameSender.UseSkill(1000, 3);
    expect(opcode(pkt)).toBe(InHeader.UserSkillUseRequest);
    const body = payload(pkt);
    expect(body.length).toBe(4 + 4 + 1 + 2); // update_time + skillId + slv + tDelay = 11
    expect(new DataView(body.buffer, body.byteOffset, 4).getInt32(0, true)).toBe(0); // update_time
    expect(new DataView(body.buffer, body.byteOffset + 4, 4).getInt32(0, true)).toBe(1000);
    expect(body[8]).toBe(3); // slv
    expect(new DataView(body.buffer, body.byteOffset + 9, 2).getInt16(0, true)).toBe(0); // tDelay
  });

  it('SkillMacroFlushToSvr encodes empty MACROSYSDATA', () => {
    const pkt = GameSender.SkillMacroFlushToSvr([]);
    expect(opcode(pkt)).toBe(InHeader.SkillMacroFlushToSvr);
    expect(Array.from(payload(pkt))).toEqual([0]);
  });

  it('SkillMacroFlushToSvr encodes slot-ordered SINGLEMACRO rows', () => {
    const pkt = GameSender.SkillMacroFlushToSvr([
      { slot: 1, name: 'Bossing', mute: true, skills: [100, 200, 300] },
    ]);
    const p = new InPacket(pkt.toArray());
    expect(p.readShort()).toBe(InHeader.SkillMacroFlushToSvr);
    expect(p.readByte()).toBe(2);
    expect(p.readString()).toBe('');
    expect(p.readByte()).toBe(0);
    expect(p.readInt()).toBe(0);
    expect(p.readInt()).toBe(0);
    expect(p.readInt()).toBe(0);
    expect(p.readString()).toBe('Bossing');
    expect(p.readByte()).toBe(1);
    expect(p.readInt()).toBe(100);
    expect(p.readInt()).toBe(200);
    expect(p.readInt()).toBe(300);
    expect(p.remaining).toBe(0);
  });

  it('ClaimRequest encodes personal claim without chat log', () => {
    const p = new InPacket(GameSender.ClaimRequest({
      chatClaim: false,
      targetCharacterName: 'Target',
      claimType: 9,
      context: 'bad behavior',
    }).toArray());
    expect(p.readShort()).toBe(InHeader.ClaimRequest);
    expect(p.readByte()).toBe(0);
    expect(p.readString()).toBe('Target');
    expect(p.readByte()).toBe(9);
    expect(p.readString()).toBe('bad behavior');
    expect(p.remaining).toBe(0);
  });

  it('ClaimRequest encodes chat claim with chat log', () => {
    const p = new InPacket(GameSender.ClaimRequest({
      chatClaim: true,
      targetCharacterName: 'Target',
      claimType: 2,
      context: 'spam',
      chatLog: 'Target: spam',
    }).toArray());
    expect(p.readShort()).toBe(InHeader.ClaimRequest);
    expect(p.readByte()).toBe(1);
    expect(p.readString()).toBe('Target');
    expect(p.readByte()).toBe(2);
    expect(p.readString()).toBe('spam');
    expect(p.readString()).toBe('Target: spam');
    expect(p.remaining).toBe(0);
  });

  it('TransferChannel writes channel byte + update_time', () => {
    const pkt = GameSender.TransferChannel(7);
    expect(opcode(pkt)).toBe(InHeader.UserTransferChannelRequest);
    const body = payload(pkt);
    expect(body.length).toBe(5);
    expect(body[0]).toBe(7); // channelId
    expect(new DataView(body.buffer, body.byteOffset + 1, 4).getInt32(0, true)).toBe(0); // update_time
  });

  it('UserSelectNpc writes NPC object id + position', () => {
    const pkt = GameSender.UserSelectNpc(500, 100, 200);
    expect(opcode(pkt)).toBe(InHeader.UserSelectNpc);
    const body = payload(pkt);
    expect(body.length).toBe(4 + 2 + 2); // int + short + short
    expect(new DataView(body.buffer, body.byteOffset, 4).getInt32(0, true)).toBe(500);
    expect(new DataView(body.buffer, body.byteOffset + 4, 2).getInt16(0, true)).toBe(100);
    expect(new DataView(body.buffer, body.byteOffset + 6, 2).getInt16(0, true)).toBe(200);
  });

  it('ScriptAnswerNext writes msgType=0, action=Select (continues the script — Cancel would close it)', () => {
    const pkt = GameSender.ScriptAnswerNext(0);
    expect(opcode(pkt)).toBe(InHeader.UserScriptMessageAnswer);
    const body = payload(pkt);
    expect(body.length).toBe(2);
    expect(body[0]).toBe(0); // msgType
    expect(body[1]).toBe(1); // ScriptAnswerAction.Select
  });

  it('ScriptAnswerYesNo writes 1 for yes, 0 for no', () => {
    const yes = GameSender.ScriptAnswerYesNo(true);
    expect(opcode(yes)).toBe(InHeader.UserScriptMessageAnswer);
    expect(payload(yes)[0]).toBe(ScriptMessageType.AskYesNo); // 2
    expect(payload(yes)[1]).toBe(1);

    const no = GameSender.ScriptAnswerYesNo(false);
    expect(payload(no)[0]).toBe(ScriptMessageType.AskYesNo); // 2
    expect(payload(no)[1]).toBe(0);
  });

  it('ScriptAnswerText writes string', () => {
    const pkt = GameSender.ScriptAnswerTextOnly('maple');
    expect(opcode(pkt)).toBe(InHeader.UserScriptMessageAnswer);
    const body = pkt.toArray().subarray(2);
    expect(body[0]).toBe(ScriptMessageType.AskText); // 3
    expect(body[1]).toBe(1); // selected
    // length-prefixed "maple": 2 bytes length + 5 bytes = 7
    expect(body[2]).toBe(5); // string length
    expect(body[3]).toBe(0);
    expect(new TextDecoder().decode(body.subarray(4))).toBe('maple');
  });

  it('ScriptAnswerNumber writes int', () => {
    const pkt = GameSender.ScriptAnswerNumberOnly(42);
    expect(opcode(pkt)).toBe(InHeader.UserScriptMessageAnswer);
    const body = pkt.toArray().subarray(2);
    expect(body[0]).toBe(ScriptMessageType.AskNumber); // 4
    expect(body[1]).toBe(1); // selected
    expect(new DataView(body.buffer, body.byteOffset + 2, 4).getInt32(0, true)).toBe(42);
  });

  it('Whisper writes 0x02 (C++ spec — Phase 5.1 fix)', () => {
    const pkt = GameSender.Whisper('Bob', 'hi');
    expect(opcode(pkt)).toBe(InHeader.Whisper);
    const body = payload(pkt);
    expect(body[0]).toBe(WhisperSendBit.SendOnly); // 0x02
  });
});

describe('GameSender — Phase 5 additions', () => {
  it('UserAbilityUp takes typed MapleStat (Str=0x40)', () => {
    const pkt = GameSender.UserAbilityUp(MapleStat.Str);
    const body = payload(pkt);
    // update_time (4) + stat value (4) = 8 bytes total
    expect(body.length).toBe(8);
    expect(new DataView(body.buffer, body.byteOffset + 4, 4).getInt32(0, true)).toBe(0x40);
  });

  it('UserAbilityUp takes typed MapleStat (Int=0x100)', () => {
    const pkt = GameSender.UserAbilityUp(MapleStat.Int);
    const body = payload(pkt);
    expect(new DataView(body.buffer, body.byteOffset + 4, 4).getInt32(0, true)).toBe(0x100);
  });

  it('UserAbilityMassUp takes typed [MapleStat, number] pairs', () => {
    const pkt = GameSender.UserAbilityMassUp([[MapleStat.Str, 5], [MapleStat.Dex, 3]]);
    const body = payload(pkt);
    // update_time (4) + count (4) + 2 * (stat int + value int) = 20 bytes
    expect(body.length).toBe(4 + 4 + 2 * 8);
    expect(new DataView(body.buffer, body.byteOffset + 8, 4).getInt32(0, true)).toBe(MapleStat.Str);
    expect(new DataView(body.buffer, body.byteOffset + 12, 4).getInt32(0, true)).toBe(5);
    expect(new DataView(body.buffer, body.byteOffset + 16, 4).getInt32(0, true)).toBe(MapleStat.Dex);
    expect(new DataView(body.buffer, body.byteOffset + 20, 4).getInt32(0, true)).toBe(3);
  });

  // ─── QuestRequest additions (5.3) ──────────────────────────────────────

  it('QuestOpen encodes type=6 + questId', () => {
    const pkt = GameSender.QuestOpen(1234);
    const body = payload(pkt);
    expect(opcode(pkt)).toBe(InHeader.UserQuestRequest);
    expect(body[0]).toBe(6); // QuestRequestAction.OpenQuest
    expect(body.length).toBe(1 + 2);
    expect(new DataView(body.buffer, body.byteOffset + 1, 2).getInt16(0, true)).toBe(1234);
  });

  it('QuestLostItem encodes type=7 + questId + itemId', () => {
    const pkt = GameSender.QuestLostItem(1234, 2000000);
    const body = payload(pkt);
    expect(body[0]).toBe(7); // QuestRequestAction.LostItem
    expect(new DataView(body.buffer, body.byteOffset + 1, 2).getInt16(0, true)).toBe(1234);
    expect(new DataView(body.buffer, body.byteOffset + 3, 4).getInt32(0, true)).toBe(2000000);
  });

  it('QuestCompleteNpcScript encodes type=8 + questId + npcTemplateId', () => {
    const pkt = GameSender.QuestCompleteNpcScript(1234, 9010000);
    const body = payload(pkt);
    expect(body[0]).toBe(8); // QuestRequestAction.CompleteNpcScript
    expect(new DataView(body.buffer, body.byteOffset + 1, 2).getInt16(0, true)).toBe(1234);
    expect(new DataView(body.buffer, body.byteOffset + 3, 4).getInt32(0, true)).toBe(9010000);
  });

  // ─── PartyRequest additions (5.4) ─────────────────────────────────────

  it('PartyChangeLevel encodes type=6 + level', () => {
    const pkt = GameSender.PartyChangeLevel(50);
    const body = payload(pkt);
    expect(opcode(pkt)).toBe(InHeader.PartyRequest);
    expect(body[0]).toBe(6); // PartyRequestAction.ChangeLevel
    expect(new DataView(body.buffer, body.byteOffset + 1, 4).getInt32(0, true)).toBe(50);
  });

  it('PartyChangeJob encodes type=7 + jobId', () => {
    const pkt = GameSender.PartyChangeJob(100);
    const body = payload(pkt);
    expect(body[0]).toBe(7); // PartyRequestAction.ChangeJob
    expect(new DataView(body.buffer, body.byteOffset + 1, 4).getInt32(0, true)).toBe(100);
  });

  it('PartyChangeName encodes type=8 + name', () => {
    const pkt = GameSender.PartyChangeName('Hunting');
    const body = payload(pkt);
    expect(body[0]).toBe(8); // PartyRequestAction.ChangePartyName
    // length-prefixed string: 2 bytes length + name bytes + null
    expect(body[1]).toBe(7);
    expect(body[2]).toBe(0);
    expect(new TextDecoder().decode(body.subarray(3, 3 + 7))).toBe('Hunting');
  });

  it('PartyApply encodes type=9 + partyId', () => {
    const pkt = GameSender.PartyApply(123);
    const body = payload(pkt);
    expect(body[0]).toBe(9); // PartyRequestAction.Apply
    expect(new DataView(body.buffer, body.byteOffset + 1, 4).getInt32(0, true)).toBe(123);
  });

  it('PartyWithdrawApply encodes type=10 + partyId', () => {
    const pkt = GameSender.PartyWithdrawApply(123);
    const body = payload(pkt);
    expect(body[0]).toBe(10); // PartyRequestAction.WithdrawApply
    expect(new DataView(body.buffer, body.byteOffset + 1, 4).getInt32(0, true)).toBe(123);
  });

  it('PartySetMemberGrade encodes type=11 + characterId + grade', () => {
    const pkt = GameSender.PartySetMemberGrade(42, 3);
    const body = payload(pkt);
    expect(body[0]).toBe(11); // PartyRequestAction.SetMemberGrade
    expect(new DataView(body.buffer, body.byteOffset + 1, 4).getInt32(0, true)).toBe(42);
    expect(body[5]).toBe(3);
  });

  // ─── GuildRequest additions (5.5) ─────────────────────────────────────

  it('GuildCreate encodes type=1 + name', () => {
    const pkt = GameSender.GuildCreate('Maplers');
    const body = payload(pkt);
    expect(opcode(pkt)).toBe(InHeader.GuildRequest);
    expect(body[0]).toBe(1); // GuildRequestAction.Create
    expect(body[1]).toBe(7); // string length
    expect(new TextDecoder().decode(body.subarray(3, 3 + 7))).toBe('Maplers');
  });

  it('GuildJoin encodes type=2 + characterId + name', () => {
    const pkt = GameSender.GuildJoin(42, 'Hero');
    const body = payload(pkt);
    expect(body[0]).toBe(2); // GuildRequestAction.Join
    expect(new DataView(body.buffer, body.byteOffset + 1, 4).getInt32(0, true)).toBe(42);
    expect(body[1 + 4]).toBe(4);
  });

  it('GuildWithdraw encodes type=3 + characterId', () => {
    const pkt = GameSender.GuildWithdraw(42);
    const body = payload(pkt);
    expect(body[0]).toBe(3); // GuildRequestAction.Withdraw
    expect(new DataView(body.buffer, body.byteOffset + 1, 4).getInt32(0, true)).toBe(42);
  });

  it('GuildKick encodes type=4 + characterId + name', () => {
    const pkt = GameSender.GuildKick(42, 'Hero');
    const body = payload(pkt);
    expect(body[0]).toBe(4); // GuildRequestAction.Kick
    expect(new DataView(body.buffer, body.byteOffset + 1, 4).getInt32(0, true)).toBe(42);
  });

  it('GuildAdmin encodes type=5 + characterId + name', () => {
    const pkt = GameSender.GuildAdmin(42, 'Hero');
    const body = payload(pkt);
    expect(body[0]).toBe(5); // GuildRequestAction.Admin
    expect(new DataView(body.buffer, body.byteOffset + 1, 4).getInt32(0, true)).toBe(42);
  });

  it('GuildLevel encodes type=6 + characterId + level', () => {
    const pkt = GameSender.GuildLevel(42, 3);
    const body = payload(pkt);
    expect(body[0]).toBe(6); // GuildRequestAction.Level
    expect(new DataView(body.buffer, body.byteOffset + 1, 4).getInt32(0, true)).toBe(42);
    expect(body[5]).toBe(3);
  });

  it('GuildExpel encodes type=8 + characterId + name', () => {
    const pkt = GameSender.GuildExpel(42, 'Hero');
    const body = payload(pkt);
    expect(body[0]).toBe(8); // GuildRequestAction.Expel
    expect(new DataView(body.buffer, body.byteOffset + 1, 4).getInt32(0, true)).toBe(42);
  });

  // ─── FriendRequest additions (5.6) ────────────────────────────────────

  it('FriendRefuse encodes type=4 + friendId', () => {
    const pkt = GameSender.FriendRefuse(42);
    const body = payload(pkt);
    expect(opcode(pkt)).toBe(InHeader.FriendRequest);
    expect(body[0]).toBe(4); // FriendRequestAction.Refuse
    expect(new DataView(body.buffer, body.byteOffset + 1, 4).getInt32(0, true)).toBe(42);
  });

  it('FriendSetGroup reuses the Add action (no separate SetGroup opcode in OG)', () => {
    const pkt = GameSender.FriendSetGroup('Bob', 'Family');
    const body = payload(pkt);
    expect(body[0]).toBe(1); // FriendRequestAction.Add
    expect(body[1]).toBe(3); // "Bob" string length
  });

  it('FriendSetMemo encodes type=6 + friendId + memo', () => {
    const pkt = GameSender.FriendSetMemo(42, 'Best friend');
    const body = payload(pkt);
    expect(body[0]).toBe(6); // FriendRequestAction.SetMemo
    expect(new DataView(body.buffer, body.byteOffset + 1, 4).getInt32(0, true)).toBe(42);
  });

  it('FriendCapacityChange encodes type=7 + delta', () => {
    const pkt = GameSender.FriendCapacityChange(5);
    const body = payload(pkt);
    expect(body[0]).toBe(7); // FriendRequestAction.CapacityChange
    expect(new DataView(body.buffer, body.byteOffset + 1, 4).getInt32(0, true)).toBe(5);
  });

  it('CheckNameChangePossible encodes characterId + secondaryPassword', () => {
    const p = new InPacket(GameSender.CheckNameChangePossible(101, 'hunter2').toArray());
    expect(p.readShort()).toBe(InHeader.CheckNameChangePossible);
    expect(p.readInt()).toBe(101);
    expect(p.readString()).toBe('hunter2');
    expect(p.remaining).toBe(0);
  });

  it('CheckTransferWorldPossible encodes characterId + secondaryPassword', () => {
    const p = new InPacket(GameSender.CheckTransferWorldPossible(202, 'spw1234').toArray());
    expect(p.readShort()).toBe(InHeader.CheckTransferWorldPossible);
    expect(p.readInt()).toBe(202);
    expect(p.readString()).toBe('spw1234');
    expect(p.remaining).toBe(0);
  });

  it('GatherItemRequest encodes updateTime + inventoryType', () => {
    const p = new InPacket(GameSender.GatherItemRequest(12345, 3).toArray());
    expect(p.readShort()).toBe(InHeader.UserGatherItemRequest);
    expect(p.readInt()).toBe(12345);
    expect(p.readByte()).toBe(3);
    expect(p.remaining).toBe(0);
  });

  it('SortItemRequest encodes updateTime + inventoryType', () => {
    const p = new InPacket(GameSender.SortItemRequest(6789, 2).toArray());
    expect(p.readShort()).toBe(InHeader.UserSortItemRequest);
    expect(p.readInt()).toBe(6789);
    expect(p.readByte()).toBe(2);
    expect(p.remaining).toBe(0);
  });

  it('SkillCancelRequest encodes the skillId unchanged for an ordinary skill', () => {
    const p = new InPacket(GameSender.SkillCancelRequest(1001005).toArray());
    expect(p.readShort()).toBe(InHeader.UserSkillCancelRequest);
    expect(p.readInt()).toBe(1001005);
    expect(p.remaining).toBe(0);
  });

  it('SkillCancelRequest remaps the 3 legacy skill ids', () => {
    const a = new InPacket(GameSender.SkillCancelRequest(32120000).toArray()); a.readShort();
    expect(a.readInt()).toBe(32001003);
    const b = new InPacket(GameSender.SkillCancelRequest(32110000).toArray()); b.readShort();
    expect(b.readInt()).toBe(32101002);
    const c = new InPacket(GameSender.SkillCancelRequest(32120001).toArray()); c.readShort();
    expect(c.readInt()).toBe(32101003);
  });

  it('MapTransferRequest writes targetField only when transferType===0', () => {
    const p = new InPacket(GameSender.MapTransferRequest(0, true, 999000).toArray());
    expect(p.readShort()).toBe(InHeader.UserMapTransferRequest);
    expect(p.readByte()).toBe(0);
    expect(p.readByte()).toBe(1);
    expect(p.readInt()).toBe(999000);
    expect(p.remaining).toBe(0);
  });

  it('MapTransferRequest omits targetField when transferType!==0', () => {
    const p = new InPacket(GameSender.MapTransferRequest(1, false).toArray());
    expect(p.readShort()).toBe(InHeader.UserMapTransferRequest);
    expect(p.readByte()).toBe(1);
    expect(p.readByte()).toBe(0);
    expect(p.remaining).toBe(0);
  });

  it('AntiMacroItemUseRequest encodes name + pos + itemId', () => {
    const p = new InPacket(GameSender.AntiMacroItemUseRequest('Target1', 5, 2000000).toArray());
    expect(p.readShort()).toBe(InHeader.SendAntiMacroItemUseRequest);
    expect(p.readString()).toBe('Target1');
    expect(p.readShort()).toBe(5);
    expect(p.readInt()).toBe(2000000);
    expect(p.remaining).toBe(0);
  });

  it('PortableChairSitRequest encodes only the chair itemId', () => {
    const p = new InPacket(GameSender.PortableChairSitRequest(3011000).toArray());
    expect(p.readShort()).toBe(InHeader.UserPortableChairSitRequest);
    expect(p.readInt()).toBe(3011000);
    expect(p.remaining).toBe(0);
  });

  it('PortalScrollUseRequest encodes updateTime + pos + itemId', () => {
    const p = new InPacket(GameSender.PortalScrollUseRequest(1000, 7, 2030000).toArray());
    expect(p.readShort()).toBe(InHeader.UserPortalScrollUseRequest);
    expect(p.readInt()).toBe(1000);
    expect(p.readShort()).toBe(7);
    expect(p.readInt()).toBe(2030000);
    expect(p.remaining).toBe(0);
  });

  it('EntrustedShopCheckRequest encodes a leading zero byte then the cash item SN', () => {
    const p = new InPacket(GameSender.EntrustedShopCheckRequest(123456789n).toArray());
    expect(p.readShort()).toBe(InHeader.UserEntrustedShopRequest);
    expect(p.readByte()).toBe(0);
    expect(p.readLong()).toBe(123456789n);
    expect(p.remaining).toBe(0);
  });

  it('FuncKeyMappedModified with no changes sends only the leading zero int', () => {
    const p = new InPacket(GameSender.FuncKeyMappedModified([]).toArray());
    expect(p.readShort()).toBe(InHeader.FuncKeyMappedModified);
    expect(p.readInt()).toBe(0);
    expect(p.remaining).toBe(0);
  });

  it('FuncKeyMappedModified with changes appends count + per-entry data', () => {
    const p = new InPacket(GameSender.FuncKeyMappedModified([
      { keyIndex: 5, type: 1, actionId: 1001 },
      { keyIndex: 10, type: 2, actionId: 2002 },
    ]).toArray());
    expect(p.readShort()).toBe(InHeader.FuncKeyMappedModified);
    expect(p.readInt()).toBe(0);
    expect(p.readInt()).toBe(2);
    expect(p.readInt()).toBe(5);
    expect(p.readByte()).toBe(1);
    expect(p.readInt()).toBe(1001);
    expect(p.readInt()).toBe(10);
    expect(p.readByte()).toBe(2);
    expect(p.readInt()).toBe(2002);
    expect(p.remaining).toBe(0);
  });

  it('QuickslotKeyMappedModified encodes exactly 8 raw ints', () => {
    const keys = [1, 2, 3, 4, 5, 6, 7, 8];
    const p = new InPacket(GameSender.QuickslotKeyMappedModified(keys).toArray());
    expect(p.readShort()).toBe(InHeader.QuickslotKeyMappedModified);
    for (const k of keys) expect(p.readInt()).toBe(k);
    expect(p.remaining).toBe(0);
  });

  it('QuickslotKeyMappedModified rejects a non-8-length array', () => {
    expect(() => GameSender.QuickslotKeyMappedModified([1, 2, 3])).toThrow();
  });

  it('PortalTeleportRequest encodes fieldKey + portalName + 4 shorts', () => {
    const p = new InPacket(GameSender.PortalTeleportRequest(100, 'sp', 250, 300, 11, 22).toArray());
    expect(p.readShort()).toBe(InHeader.UserPortalTeleportRequest);
    expect(p.readByte()).toBe(100);
    expect(p.readString()).toBe('sp');
    expect(p.readShort()).toBe(250);
    expect(p.readShort()).toBe(300);
    expect(p.readShort()).toBe(11);
    expect(p.readShort()).toBe(22);
    expect(p.remaining).toBe(0);
  });

  it('MobApplyCtrl encodes objectId + crc', () => {
    const p = new InPacket(GameSender.MobApplyCtrl(123, 456).toArray());
    expect(p.readShort()).toBe(InHeader.MobApplyCtrl);
    expect(p.readInt()).toBe(123);
    expect(p.readInt()).toBe(456);
    expect(p.remaining).toBe(0);
  });

  it('MobApplyCtrl defaults crc to 0', () => {
    const p = new InPacket(GameSender.MobApplyCtrl(123).toArray());
    p.readShort(); p.readInt();
    expect(p.readInt()).toBe(0);
  });

  it('UserSitRequest encodes the seat id as a short', () => {
    const p = new InPacket(GameSender.UserSitRequest(-1).toArray());
    expect(p.readShort()).toBe(InHeader.UserSitRequest);
    expect(p.readShort()).toBe(-1);
    expect(p.remaining).toBe(0);
  });

  it('UserSkillPrepareRequest encodes skillId/slv/actionAndDir/attackSpeed', () => {
    const p = new InPacket(GameSender.UserSkillPrepareRequest(1101006, 10, 0x8001, 5).toArray());
    expect(p.readShort()).toBe(InHeader.UserSkillPrepareRequest);
    expect(p.readInt()).toBe(1101006);
    expect(p.readByte()).toBe(10);
    expect(p.readUShort()).toBe(0x8001);
    expect(p.readByte()).toBe(5);
    expect(p.remaining).toBe(0);
  });

  it('UserSkillPrepareRequest writes swallowMobId only when provided', () => {
    const withSwallow = GameSender.UserSkillPrepareRequest(33001005, 1, 0, 5, 999);
    const without = GameSender.UserSkillPrepareRequest(33001005, 1, 0, 5);
    expect(withSwallow.toArray().length).toBe(without.toArray().length + 4);
  });

  it('UserPortalScriptRequest encodes fieldKey + portalName + pos', () => {
    const p = new InPacket(GameSender.UserPortalScriptRequest(42, 'tutorial', 100, 200).toArray());
    expect(p.readShort()).toBe(InHeader.UserPortalScriptRequest);
    expect(p.readByte()).toBe(42);
    expect(p.readString()).toBe('tutorial');
    expect(p.readShort()).toBe(100);
    expect(p.readShort()).toBe(200);
    expect(p.remaining).toBe(0);
  });

  it('NpcMoveRequest with no movePath encodes only objectId/oneTimeAction/chatIndex', () => {
    const p = new InPacket(GameSender.NpcMoveRequest(555, 1, 2).toArray());
    expect(p.readShort()).toBe(InHeader.NpcMove);
    expect(p.readInt()).toBe(555);
    expect(p.readByte()).toBe(1);
    expect(p.readByte()).toBe(2);
    expect(p.remaining).toBe(0);
  });

  it('NpcMoveRequest with a movePath appends the encoded move path', () => {
    const p = new InPacket(GameSender.NpcMoveRequest(555, 0, 0, {
      originX: 10, originY: 20, originVx: 0, originVy: 0, elements: [],
    }).toArray());
    expect(p.readShort()).toBe(InHeader.NpcMove);
    p.readInt(); p.readByte(); p.readByte();
    expect(p.readShort()).toBe(10); // originX
    expect(p.readShort()).toBe(20); // originY
    expect(p.readShort()).toBe(0); expect(p.readShort()).toBe(0); // originVx, originVy
    expect(p.readByte()).toBe(0); // element count
    expect(p.remaining).toBe(0);
  });

  it('ExpeditionResponseInvite encodes accept/reject codes', () => {
    const yes = new InPacket(GameSender.ExpeditionResponseInvite('Alice', true).toArray());
    expect(yes.readShort()).toBe(InHeader.ExpeditionRequest);
    expect(yes.readByte()).toBe(0x33);
    expect(yes.readString()).toBe('Alice');
    expect(yes.readInt()).toBe(9);

    const no = new InPacket(GameSender.ExpeditionResponseInvite('Alice', false).toArray());
    no.readShort(); no.readByte(); no.readString();
    expect(no.readInt()).toBe(8);
  });

  it('PartyAdverApplyResponse encodes result and party id', () => {
    const p = new InPacket(GameSender.PartyAdverApplyResponse(10, 1234).toArray());
    expect(p.readShort()).toBe(InHeader.PartyAdverRequest);
    expect(p.readByte()).toBe(0x56);
    expect(p.readInt()).toBe(10);
    expect(p.readInt()).toBe(1234);
    expect(p.remaining).toBe(0);
  });
});
