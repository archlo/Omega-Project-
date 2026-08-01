import { describe, it, expect } from 'vitest';
import {
  MessageType,
  LootSubType,
  QuestRecordState,
  PartyResultType,
  FriendResultType,
  GuildResultType,
  ShopResultType,
  TrunkResultType,
  TrunkFlag,
  MessengerAction,
  InventoryOpType,
  DropEnterType,
  DropLeaveType,
  WhisperFlag,
  ShopItemPrefix,
  FuncKeyInitType,
  MapleStat,
  BodyPart,
  TempStatMask,
  MeleeAttackFlag,
  MovePathAttr,
  CwvsContextType,
  ShopRequestAction,
  TrunkRequestAction,
  QuestRequestAction,
  GuildRequestAction,
  PartyRequestAction,
  FriendRequestAction,
  WhisperSendBit,
  MessengerRequestAction,
  MiniRoomProtocol,
  Job,
} from '../../../src/net/protocol/Enums.js';

describe('Protocol enums — values match the v95 dump (enums.json)', () => {
  it('MessageType sub-cases (CWvsContext::OnMessage, confirmed against decompile/A06C90.c)', () => {
    expect(MessageType.LootWarning).toBe(0);
    expect(MessageType.QuestRecord).toBe(1);
    expect(MessageType.CashItemExpire).toBe(2);
    expect(MessageType.IncExp).toBe(3);
    expect(MessageType.IncSp).toBe(4);
    expect(MessageType.IncFame).toBe(5);
    expect(MessageType.IncMoney).toBe(6);
    expect(MessageType.IncGP).toBe(7);
    expect(MessageType.GiveBuff).toBe(8);
    expect(MessageType.GeneralItemExpire).toBe(9);
    expect(MessageType.System).toBe(10);
    expect(MessageType.QuestRecordEx).toBe(11);
    expect(MessageType.ItemProtectExpire).toBe(12);
    expect(MessageType.ItemExpireReplace).toBe(13);
    expect(MessageType.SkillExpire).toBe(14);
    // Not confirmed against this decompiled switch (its default returns past 14).
    expect(MessageType.EncryptedMessage).toBe(15);
    expect(MessageType.OpenURL).toBe(16);
    expect(MessageType.WheelOfFortune).toBe(17);
  });

  it('LootSubType', () => {
    expect(LootSubType.ItemWarning).toBe(0);
    expect(LootSubType.MoneyWarning).toBe(1);
    expect(LootSubType.MesoGet).toBe(1);
    expect(LootSubType.ItemUnidentified).toBe(0);
    expect(LootSubType.ItemExpire).toBe(2);
  });

  it('QuestRecordState', () => {
    expect(QuestRecordState.Removed).toBe(0);
    expect(QuestRecordState.Started).toBe(1);
    expect(QuestRecordState.Completed).toBe(2);
  });

  // Confirmed against the real switch in CWvsContext::OnPartyResult
  // (decompile/A10AB0.c) — see Enums.ts's PartyResultType doc comment.
  // JoinExisting/Leave/Expel removed: the real switch has no case for
  // 1, 2, or 3 at all (starts at 4) — they were dead code.
  it('PartyResultType', () => {
    expect(PartyResultType.Invite).toBe(4);
    expect(PartyResultType.Load).toBe(7);
    expect(PartyResultType.CreateDone).toBe(8);
    expect(PartyResultType.Withdraw).toBe(12);
    expect(PartyResultType.Join).toBe(15);
    expect(PartyResultType.ReloadParty).toBe(38);
  });

  it('FriendResultType', () => {
    expect(FriendResultType.Load).toBe(7);
    expect(FriendResultType.UpdateFriend).toBe(8);
    expect(FriendResultType.Request).toBe(9);
    expect(FriendResultType.Set).toBe(10);
    expect(FriendResultType.StatusChanged).toBe(20);
    expect(FriendResultType.Delete).toBe(18);
  });

  it('GuildResultType', () => {
    expect(GuildResultType.Load).toBe(28);
    expect(GuildResultType.MemberJoin).toBe(41);
    expect(GuildResultType.OnlineStatus).toBe(63);
    expect(GuildResultType.GradeChange).toBe(66);
    expect(GuildResultType.MarkChange).toBe(69);
    expect(GuildResultType.Leave).toBe(46);
    expect(GuildResultType.Expel).toBe(49);
    expect(GuildResultType.PointLevel).toBe(75);
  });

  it('ShopResultType (CShopDlg::OnPacket, decompile/6EB7D0.c)', () => {
    expect(ShopResultType.Success).toBe(0);
    expect(ShopResultType.NotEnoughMesos).toBe(14);
    expect(ShopResultType.NotEnoughItems).toBe(15);
    expect(ShopResultType.NoItemsInStock).toBe(19);
  });

  it('TrunkResultType (CTrunkDlg::OnPacket, decompile/76A990.c)', () => {
    expect(TrunkResultType.Open).toBe(22);
    expect(TrunkResultType.PutSync).toBe(9);
    expect(TrunkResultType.PutItem).toBe(13);
    expect(TrunkResultType.Store).toBe(15);
    expect(TrunkResultType.SortResult).toBe(19);
    expect(TrunkResultType.SortTrunk).toBe(24);
  });

  it('TrunkFlag (BigInt-mask against a readLong())', () => {
    expect(TrunkFlag.Money).toBe(0x02n);
    expect(TrunkFlag.Equip).toBe(0x04n);
    expect(TrunkFlag.Use).toBe(0x08n);
    expect(TrunkFlag.Setup).toBe(0x10n);
    expect(TrunkFlag.Etc).toBe(0x20n);
    expect(TrunkFlag.Cash).toBe(0x40n);
  });

  it('MessengerAction', () => {
    expect(MessengerAction.Open).toBe(0);
    expect(MessengerAction.Join).toBe(1);
    expect(MessengerAction.Leave).toBe(2);
    expect(MessengerAction.Invite).toBe(3);
    expect(MessengerAction.Hide).toBe(4);
    expect(MessengerAction.DeclineInvite).toBe(5);
    expect(MessengerAction.Chat).toBe(6);
    expect(MessengerAction.Avatar).toBe(7);
    expect(MessengerAction.MigratedIn).toBe(8);
  });

  it('InventoryOpType', () => {
    expect(InventoryOpType.Add).toBe(0);
    expect(InventoryOpType.QuantityChange).toBe(1);
    expect(InventoryOpType.Move).toBe(2);
    expect(InventoryOpType.Remove).toBe(3);
    expect(InventoryOpType.UpdateExp).toBe(4);
  });

  it('DropEnterType', () => {
    expect(DropEnterType.JustShowing).toBe(0);
    expect(DropEnterType.Create).toBe(1);
    expect(DropEnterType.OnTheFoothold).toBe(2);
    expect(DropEnterType.FadingOut).toBe(3);
  });

  it('DropLeaveType', () => {
    expect(DropLeaveType.Timeout).toBe(0);
    expect(DropLeaveType.ScreenScroll).toBe(1);
    expect(DropLeaveType.PickedUpByUser).toBe(2);
    expect(DropLeaveType.PickedUpByMob).toBe(3);
    expect(DropLeaveType.Explode).toBe(4);
    expect(DropLeaveType.PickedUpByPet).toBe(5);
  });

  it('WhisperFlag (ENUM_CField_v3)', () => {
    expect(WhisperFlag.Loc).toBe(0x01);
    expect(WhisperFlag.Ability).toBe(0x02);
    expect(WhisperFlag.Reactor).toBe(0x04);
    expect(WhisperFlag.Shop).toBe(0x08);
    expect(WhisperFlag.Receive).toBe(0x10);
  });

  it('ShopItemPrefix (rechargeable bullet/arrow)', () => {
    expect(ShopItemPrefix.ThrowArrow).toBe(207);
    expect(ShopItemPrefix.Bullet).toBe(233);
  });

  it('FuncKeyInitType', () => {
    expect(FuncKeyInitType.FuncKeyMapped).toBe(398);
    expect(FuncKeyInitType.PetConsumeItem).toBe(399);
    expect(FuncKeyInitType.PetConsumeMP).toBe(400);
  });

  it('MapleStat (22-bit bitfield)', () => {
    expect(MapleStat.Skin).toBe(0x000001);
    expect(MapleStat.Face).toBe(0x000002);
    expect(MapleStat.Hair).toBe(0x000004);
    expect(MapleStat.PetSn1).toBe(0x000008);
    expect(MapleStat.Level).toBe(0x000010);
    expect(MapleStat.Job).toBe(0x000020);
    expect(MapleStat.Str).toBe(0x000040);
    expect(MapleStat.Dex).toBe(0x000080);
    expect(MapleStat.Int).toBe(0x000100);
    expect(MapleStat.Luk).toBe(0x000200);
    expect(MapleStat.Hp).toBe(0x000400);
    expect(MapleStat.MaxHp).toBe(0x000800);
    expect(MapleStat.Mp).toBe(0x001000);
    expect(MapleStat.MaxMp).toBe(0x002000);
    expect(MapleStat.Ap).toBe(0x004000);
    expect(MapleStat.Sp).toBe(0x008000);
    expect(MapleStat.Exp).toBe(0x010000);
    expect(MapleStat.Pop).toBe(0x020000);
    expect(MapleStat.Meso).toBe(0x040000);
    expect(MapleStat.PetSn2).toBe(0x080000);
    expect(MapleStat.PetSn3).toBe(0x100000);
    expect(MapleStat.TempExp).toBe(0x200000);
  });

  it('BodyPart (subset — full 51 entries verified against ENUM_Global_nBodyPart)', () => {
    expect(BodyPart.Hair).toBe(0);
    expect(BodyPart.Cap).toBe(1);
    expect(BodyPart.FaceAcc).toBe(2);
    expect(BodyPart.EyeAcc).toBe(3);
    expect(BodyPart.EarAcc).toBe(4);
    expect(BodyPart.Clothes).toBe(5);
    expect(BodyPart.Pants).toBe(6);
    expect(BodyPart.Shoes).toBe(7);
    expect(BodyPart.Gloves).toBe(8);
    expect(BodyPart.Cape).toBe(9);
    expect(BodyPart.Shield).toBe(10);
    expect(BodyPart.Weapon).toBe(11);
    expect(BodyPart.Pendant).toBe(17);
    expect(BodyPart.Medal).toBe(49);
    expect(BodyPart.Belt).toBe(50);
    expect(BodyPart.Shoulder).toBe(51);
    expect(BodyPart.CashBase).toBe(100);
    expect(BodyPart.CashWeapon).toBe(111);
  });

  it('TempStatMask bits (first 12 named bits)', () => {
    // Bit positions (0-128), not bit flags. Used by SecondaryStat.decode()
    // to map entry index → stat field. Bit N means the stat is at position N
    // in the 128-bit mask.
    expect(TempStatMask.Str).toBe(0);
    expect(TempStatMask.Dex).toBe(1);
    expect(TempStatMask.Int).toBe(2);
    expect(TempStatMask.Luk).toBe(3);
    expect(TempStatMask.Pad).toBe(4);
    expect(TempStatMask.Mad).toBe(5);
    expect(TempStatMask.Pdd).toBe(6);
    expect(TempStatMask.Mdd).toBe(7);
    expect(TempStatMask.Acc).toBe(8);
    expect(TempStatMask.Eva).toBe(9);
    expect(TempStatMask.Speed).toBe(10);
    expect(TempStatMask.Jump).toBe(11);
  });

  it('MeleeAttackFlag (ENUM_CUserLocal_v4)', () => {
    expect(MeleeAttackFlag.Skill).toBe(0x80);
    expect(MeleeAttackFlag.Combo).toBe(0x40);
    expect(MeleeAttackFlag.ShadowMeso).toBe(0x20);
    expect(MeleeAttackFlag.FinalHit).toBe(0x10);
  });

  it('MovePathAttr (ENUM_CAvatar_v4 — sample)', () => {
    expect(MovePathAttr.Normal).toBe(0);
    expect(MovePathAttr.Jump).toBe(1);
    expect(MovePathAttr.StatChange).toBe(9);
    expect(MovePathAttr.StartFallDown).toBe(11);
    expect(MovePathAttr.FlyingBlock).toBe(17);
  });

  it('CwvsContextType (out-header subset)', () => {
    expect(CwvsContextType.InventoryOperation).toBe(28);
    expect(CwvsContextType.StatChanged).toBe(30);
    expect(CwvsContextType.TemporaryStatSet).toBe(31);
    expect(CwvsContextType.TemporaryStatReset).toBe(32);
    expect(CwvsContextType.Message).toBe(38);
    expect(CwvsContextType.PartyResult).toBe(62);
    expect(CwvsContextType.FriendResult).toBe(65);
    expect(CwvsContextType.GuildResult).toBe(67);
    expect(CwvsContextType.ScriptMessage).toBe(363);
    expect(CwvsContextType.OpenShopDlg).toBe(364);
    expect(CwvsContextType.ShopResult).toBe(365);
    expect(CwvsContextType.TrunkResult).toBe(368);
    expect(CwvsContextType.Messenger).toBe(372);
    expect(CwvsContextType.MiniRoom).toBe(373);
    expect(CwvsContextType.FuncKeyMappedInit).toBe(398);
  });

  it('ShopRequestAction (InHeader.UserShopRequest=66)', () => {
    expect(ShopRequestAction.Buy).toBe(0);
    expect(ShopRequestAction.Sell).toBe(1);
    expect(ShopRequestAction.Recharge).toBe(2);
    expect(ShopRequestAction.Close).toBe(3);
  });

  it('TrunkRequestAction (InHeader.UserTrunkRequest=67)', () => {
    expect(TrunkRequestAction.Withdraw).toBe(4);
    expect(TrunkRequestAction.Deposit).toBe(5);
    expect(TrunkRequestAction.Sort).toBe(6);
    expect(TrunkRequestAction.WithdrawMoney).toBe(7);
    expect(TrunkRequestAction.DepositMoney).toBe(7);
    expect(TrunkRequestAction.Close).toBe(8);
  });

  it('QuestRequestAction (InHeader.UserQuestRequest=119)', () => {
    expect(QuestRequestAction.Accept).toBe(1);
    expect(QuestRequestAction.Complete).toBe(2);
    expect(QuestRequestAction.Resign).toBe(3);
    expect(QuestRequestAction.StartScript).toBe(4);
    expect(QuestRequestAction.CompleteScript).toBe(5);
    expect(QuestRequestAction.OpenQuest).toBe(6);
    expect(QuestRequestAction.LostItem).toBe(7);
    expect(QuestRequestAction.CompleteNpcScript).toBe(8);
  });

  it('GuildRequestAction (InHeader.GuildRequest=149)', () => {
    expect(GuildRequestAction.Load).toBe(0);
    expect(GuildRequestAction.Create).toBe(1);
    expect(GuildRequestAction.Join).toBe(2);
    expect(GuildRequestAction.Withdraw).toBe(3);
    expect(GuildRequestAction.Kick).toBe(4);
    expect(GuildRequestAction.Admin).toBe(5);
    expect(GuildRequestAction.Level).toBe(6);
    expect(GuildRequestAction.Leave).toBe(7);
    expect(GuildRequestAction.Expel).toBe(8);
  });

  it('PartyRequestAction (InHeader.PartyRequest=145)', () => {
    expect(PartyRequestAction.JoinExisting).toBe(0);
    expect(PartyRequestAction.Create).toBe(1);
    expect(PartyRequestAction.Leave).toBe(2);
    expect(PartyRequestAction.Join).toBe(3);
    expect(PartyRequestAction.Invite).toBe(4);
    expect(PartyRequestAction.Kick).toBe(5);
    expect(PartyRequestAction.ChangeLevel).toBe(6);
    expect(PartyRequestAction.ChangeJob).toBe(7);
    expect(PartyRequestAction.ChangePartyName).toBe(8);
    expect(PartyRequestAction.Apply).toBe(9);
    expect(PartyRequestAction.WithdrawApply).toBe(10);
    expect(PartyRequestAction.SetMemberGrade).toBe(11);
  });

  it('FriendRequestAction (InHeader.FriendRequest=153)', () => {
    // Load/Add/Accept/Delete confirmed against real senders (CWvsContext::
    // LoadFriend, CField::SendSetFriendMsg/SendAcceptFriendMsg/
    // SendDeleteFriendMsg). There is no separate SetGroup=5 action — OG
    // reuses Add for re-grouping (see FriendRequestAction's own doc comment).
    expect(FriendRequestAction.Load).toBe(0);
    expect(FriendRequestAction.Add).toBe(1);
    expect(FriendRequestAction.Accept).toBe(2);
    expect(FriendRequestAction.Delete).toBe(3);
    expect(FriendRequestAction.Refuse).toBe(4);
    expect(FriendRequestAction.SetMemo).toBe(6);
    expect(FriendRequestAction.CapacityChange).toBe(7);
  });

  it('WhisperSendBit (Phase 5.1 fix — Whisper now uses SendOnly=0x02 per C++ spec)', () => {
    expect(WhisperSendBit.SendOnly).toBe(0x02);
    expect(WhisperSendBit.SendWithEcho).toBe(0x06);
  });

  it('MessengerRequestAction (InHeader.Messenger=143)', () => {
    expect(MessengerRequestAction.Enter).toBe(0);
    expect(MessengerRequestAction.Leave).toBe(2);
    expect(MessengerRequestAction.Invite).toBe(3);
    expect(MessengerRequestAction.Chat).toBe(6);
  });

  it('MiniRoomProtocol (InHeader.MiniRoom=144 — TRP/MRP/PSP family)', () => {
    expect(MiniRoomProtocol.MRP_Create).toBe(0);
    expect(MiniRoomProtocol.MRP_Invite).toBe(2);
    expect(MiniRoomProtocol.MRP_Enter).toBe(4);
    expect(MiniRoomProtocol.MRP_Chat).toBe(6);
    expect(MiniRoomProtocol.MRP_Leave).toBe(10);
    expect(MiniRoomProtocol.MRP_Balloon).toBe(11);
    expect(MiniRoomProtocol.TRP_PutItem).toBe(15);
    expect(MiniRoomProtocol.TRP_PutMoney).toBe(16);
    expect(MiniRoomProtocol.TRP_Trade).toBe(17);
    expect(MiniRoomProtocol.TRP_UnTrade).toBe(18);
    expect(MiniRoomProtocol.PSP_PutItem).toBe(22);
    expect(MiniRoomProtocol.PSP_BuyItem).toBe(23);
    expect(MiniRoomProtocol.PSP_BuyResult).toBe(24);
    expect(MiniRoomProtocol.PSP_Refresh).toBe(25);
    expect(MiniRoomProtocol.PSP_AddSoldItem).toBe(26);
  });

  it('Job (v95 — sample branch + advancement)', () => {
    expect(Job.Beginner).toBe(0);
    expect(Job.Warrior).toBe(100);
    expect(Job.Hero).toBe(112);
    expect(Job.Magician).toBe(200);
    expect(Job.FPArchMage).toBe(212);
    expect(Job.Bowman).toBe(300);
    expect(Job.Bowmaster).toBe(312);
    expect(Job.Thief).toBe(400);
    expect(Job.NightLord).toBe(412);
    expect(Job.Pirate).toBe(500);
    expect(Job.Buccaneer).toBe(512);
    expect(Job.Noblesse).toBe(1000);
    expect(Job.Legend).toBe(2000);
    expect(Job.Evan).toBe(2001);
    expect(Job.Jett).toBe(5000);
  });
});
