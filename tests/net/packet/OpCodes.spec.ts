import { describe, it, expect } from 'vitest';
import { InHeader, OutHeader } from '../../../src/net/packet/OpCodes.js';

/**
 * Cross-check OpCodes.ts against the v95 dump (packet_handlers.json +
 * master_report.json) so a future "let me re-order this" PR can't
 * accidentally change a wire value.
 *
 * OutHeader values are taken from `packet_handlers.json` (server→client
 * dispatcher key→handler class).
 *
 * InHeader values are taken from the TS codebase's actual `OutPacket.Of(InHeader.X)`
 * call-sites; they are NOT in packet_handlers.json (which is server-side
 * dispatch only).
 *
 * MobMove (227) and MobApplyCtrl (228) are flagged as wrong-direction in
 * the dump; they remain in InHeader until Phase 5 fixes the GameSender.
 */

describe('OpCodes — InHeader (client → server)', () => {
  it('auth + login lifecycle', () => {
    expect(InHeader.CheckPassword).toBe(1);
    expect(InHeader.GuestIDLogin).toBe(2);
    expect(InHeader.AccountInfoRequest).toBe(3);
    expect(InHeader.WorldInfoRequest).toBe(4);
    expect(InHeader.SelectWorld).toBe(5);
    expect(InHeader.CheckUserLimit).toBe(6);
    expect(InHeader.ConfirmEULA).toBe(7);
    expect(InHeader.SetGender).toBe(8);
    expect(InHeader.CheckPinCode).toBe(9);
    expect(InHeader.UpdatePinCode).toBe(10);
    expect(InHeader.WorldRequest).toBe(11);
    expect(InHeader.LogoutWorld).toBe(12);
    expect(InHeader.ViewAllChar).toBe(13);
    expect(InHeader.SelectCharacterByVAC).toBe(14);
    expect(InHeader.VACFlagSet).toBe(15);
    expect(InHeader.CheckNameChangePossible).toBe(16);
    expect(InHeader.RegisterNewCharacter).toBe(17);
    expect(InHeader.CheckTransferWorldPossible).toBe(18);
    expect(InHeader.SelectCharacter).toBe(19);
    expect(InHeader.MigrateIn).toBe(20);
    expect(InHeader.CheckDuplicatedID).toBe(21);
    expect(InHeader.CreateNewCharacter).toBe(22);
    expect(InHeader.CreateNewCharacterInCS).toBe(23);
    expect(InHeader.DeleteCharacter).toBe(24);
    expect(InHeader.AliveAck).toBe(25);
    expect(InHeader.ExceptionLog).toBe(26);
    expect(InHeader.SecurityPacket).toBe(27);
    expect(InHeader.EnableSPWRequest).toBe(28);
    expect(InHeader.CheckSPWRequest).toBe(29);
    expect(InHeader.EnableSPWRequestByVAC).toBe(30);
    expect(InHeader.CheckSPWRequestByVAC).toBe(31);
    expect(InHeader.CheckOTPRequest).toBe(32);
    expect(InHeader.CheckDeleteCharacterOTP).toBe(33);
    expect(InHeader.CreateSecurityHandle).toBe(34);
    expect(InHeader.SSOErrorLog).toBe(35);
    expect(InHeader.ClientDumpLog).toBe(36);
    expect(InHeader.CheckExtraCharInfo).toBe(37);
    expect(InHeader.CreateNewCharacter_Ex).toBe(38);
  });

  it('field actions (41..52)', () => {
    expect(InHeader.UserTransferFieldRequest).toBe(41);
    expect(InHeader.UserTransferChannelRequest).toBe(42);
    expect(InHeader.UserMigrateToCashShopRequest).toBe(43);
    expect(InHeader.UserMove).toBe(44);
    expect(InHeader.UserSitRequest).toBe(45);
    expect(InHeader.UserPortableChairSitRequest).toBe(46);
    expect(InHeader.UserMeleeAttack).toBe(47);
    expect(InHeader.UserShootAttack).toBe(48);
    expect(InHeader.UserMagicAttack).toBe(49);
    expect(InHeader.UserBodyAttack).toBe(50);
    expect(InHeader.UserMovingShootAttackPrepare).toBe(51);
    expect(InHeader.UserHit).toBe(52);
  });

  it('field actions (54..119)', () => {
    expect(InHeader.UserChat).toBe(54);
    expect(InHeader.UserEmotion).toBe(56);
    expect(InHeader.UserHP).toBe(59);
    expect(InHeader.UserSelectNpc).toBe(63);
    expect(InHeader.UserScriptMessageAnswer).toBe(65);
    expect(InHeader.UserShopRequest).toBe(66);
    expect(InHeader.UserTrunkRequest).toBe(67);
    expect(InHeader.UserEntrustedShopRequest).toBe(68);
    expect(InHeader.UserStoreBankRequest).toBe(69);
    expect(InHeader.UserAdminShopRequest).toBe(74);
    expect(InHeader.UserGatherItemRequest).toBe(75);
    expect(InHeader.UserSortItemRequest).toBe(76);
    expect(InHeader.UserCharacterSaleCreate).toBe(85);
    expect(InHeader.UserConsumeCashItemUseRequest).toBe(85);
    expect(InHeader.UserCharacterSaleCheckId).toBe(311);
    expect(InHeader.UserCashShopRequest).toBe(275);
    expect(InHeader.UserChangeSlotPositionRequest).toBe(77);
    expect(InHeader.UserStatChangeItemUseRequest).toBe(78);
    expect(InHeader.UserStatChangeItemCancelRequest).toBe(79);
    expect(InHeader.UserPortalScrollUseRequest).toBe(92);
    expect(InHeader.UserAbilityUpRequest).toBe(98);
    expect(InHeader.UserAbilityMassUpRequest).toBe(99);
    expect(InHeader.UserStatChangeRequest).toBe(100);
    expect(InHeader.UserStatChangeRequestByItemOption).toBe(101);
    expect(InHeader.UserSkillUpRequest).toBe(102);
    expect(InHeader.UserSkillUseRequest).toBe(103);
    expect(InHeader.UserSkillCancelRequest).toBe(104);
    expect(InHeader.UserSkillPrepareRequest).toBe(105);
    expect(InHeader.UserDropMoneyRequest).toBe(106);
    expect(InHeader.UserCharacterInfoRequest).toBe(109);
    expect(InHeader.UserPortalScriptRequest).toBe(112);
    expect(InHeader.UserPortalTeleportRequest).toBe(113);
    expect(InHeader.UserMapTransferRequest).toBe(114);
    expect(InHeader.SendAntiMacroItemUseRequest).toBe(115);
    expect(InHeader.ClaimRequest).toBe(118);
    expect(InHeader.UserQuestRequest).toBe(119);
    expect(InHeader.SkillMacroFlushToSvr).toBe(122);
    expect(InHeader.UserUseBoxGachaponItemRequest).toBe(127);
    expect(InHeader.UserUseGachaponRemoteRequest).toBe(128);
    expect(InHeader.UserWeddingWishListRequest).toBe(162);
  });

  it('social', () => {
    expect(InHeader.GroupMessage).toBe(140);
    expect(InHeader.Whisper).toBe(141);
    expect(InHeader.Messenger).toBe(143);
    expect(InHeader.MiniRoom).toBe(144);
    expect(InHeader.PartyRequest).toBe(145);
    expect(InHeader.GuildRequest).toBe(149);
    expect(InHeader.FriendRequest).toBe(153);
    expect(InHeader.FuncKeyMappedModified).toBe(159);
    expect(InHeader.UserFamilyChartRequest).toBe(169);
    expect(InHeader.UserFamilyInfoRequest).toBe(170);
    expect(InHeader.UserFamilyInviteResult).toBe(174);
    expect(InHeader.UserFamilySummonResponse).toBe(177);
    expect(InHeader.UserGuildBBSRequest).toBe(179);
  });

  it('field system + mob/npc (216..246)', () => {
    expect(InHeader.QuickslotKeyMappedModified).toBe(216);
    // MobMove (227) and MobApplyCtrl (228) are documented as wrong-direction
    // in OpCodes.ts — they are CUserPool::OnUserRemotePacket sub-cases that
    // are server→client in the dump, but the existing GameSender.MobMove
    // still references them. Phase 5 will move them to OutHeader.
    expect(InHeader.MobMove).toBe(227);
    expect(InHeader.MobApplyCtrl).toBe(228);
    expect(InHeader.NpcMove).toBe(241);
    expect(InHeader.DropPickUpRequest).toBe(246);
    expect(InHeader.UserRaiseWndPutItem).toBe(285);
    expect(InHeader.UserRaisePieceWndPutItem).toBe(286);
  });

  it('found via the full-audit IDA dump sender search', () => {
    expect(InHeader.UserFindFriendRequest).toBe(194);
  });
});

describe('OpCodes — OutHeader (server → client)', () => {
  it('auth + login lifecycle (0..27)', () => {
    expect(OutHeader.CheckPasswordResult).toBe(0);
    expect(OutHeader.GuestIDLoginResult).toBe(1);
    expect(OutHeader.AccountInfoResult).toBe(2);
    expect(OutHeader.CheckUserLimitResult).toBe(3);
    expect(OutHeader.SetAccountResult).toBe(4);
    expect(OutHeader.ConfirmEULAResult).toBe(5);
    expect(OutHeader.CheckPinCodeResult).toBe(6);
    expect(OutHeader.UpdatePinCodeResult).toBe(7);
    expect(OutHeader.ViewAllCharResult).toBe(8);
    expect(OutHeader.SelectCharacterByVACResult).toBe(9);
    expect(OutHeader.WorldInformation).toBe(10);
    expect(OutHeader.SelectWorldResult).toBe(11);
    expect(OutHeader.SelectCharacterResult).toBe(12);
    expect(OutHeader.CheckDuplicatedIDResult).toBe(13);
    expect(OutHeader.CreateNewCharacterResult).toBe(14);
    expect(OutHeader.DeleteCharacterResult).toBe(15);
    expect(OutHeader.MigrateCommand).toBe(16);
    expect(OutHeader.AliveReq).toBe(17);
    expect(OutHeader.AuthenCodeChanged).toBe(18);
    expect(OutHeader.AuthenMessage).toBe(19);
    expect(OutHeader.SecurityPacket).toBe(20);
    expect(OutHeader.EnableSPWResult).toBe(21);
    expect(OutHeader.DeleteCharacterOTPRequest).toBe(22);
    expect(OutHeader.CheckCrcResult).toBe(23);
    expect(OutHeader.LatestConnectedWorld).toBe(24);
    expect(OutHeader.RecommendWorldMessage).toBe(25);
    expect(OutHeader.CheckExtraCharInfoResult).toBe(26);
    expect(OutHeader.CheckSPWResult).toBe(27);
  });

  it('CWvsContext (28..71)', () => {
    expect(OutHeader.InventoryOperation).toBe(28);
    expect(OutHeader.StatChanged).toBe(30);
    expect(OutHeader.TemporaryStatSet).toBe(31);
    expect(OutHeader.TemporaryStatReset).toBe(32);
    expect(OutHeader.ChangeSkillRecordResult).toBe(35);
    expect(OutHeader.SkillUseResult).toBe(36);
    expect(OutHeader.Message).toBe(38);
    expect(OutHeader.AntiMacroResult).toBe(42);
    expect(OutHeader.ClaimResult).toBe(44);
    expect(OutHeader.SetClaimSvrAvailableTime).toBe(45);
    expect(OutHeader.ClaimSvrStatusChanged).toBe(46);
    expect(OutHeader.EntrustedShopCheckResult).toBe(49);
    expect(OutHeader.GuildBBSPacket).toBe(59);
    expect(OutHeader.CharacterInfo).toBe(61);
    expect(OutHeader.PartyResult).toBe(62);
    expect(OutHeader.FriendResult).toBe(65);
    expect(OutHeader.GuildResult).toBe(67);
    expect(OutHeader.BroadcastMsg).toBe(71);
    expect(OutHeader.WeddingGiftResult).toBe(77);
    expect(OutHeader.FamilyChartResult).toBe(98);
    expect(OutHeader.FamilyInfoResult).toBe(99);
    expect(OutHeader.FamilyResult).toBe(100);
    expect(OutHeader.FamilyJoinRequest).toBe(101);
    expect(OutHeader.FamilyJoinRequestResult).toBe(102);
    expect(OutHeader.FamilyJoinAccepted).toBe(103);
    expect(OutHeader.FamilyPrivilegeList).toBe(104);
    expect(OutHeader.FamilyFamousPointIncResult).toBe(105);
    expect(OutHeader.FamilyNotifyLoginOrLogout).toBe(106);
    expect(OutHeader.FamilySetPrivilege).toBe(107);
    expect(OutHeader.FamilySummonRequest).toBe(108);
    expect(OutHeader.DestroyShopResult).toBe(119);
  });

  it('opcodes found via the v95 IDA dump switch-table audit', () => {
    expect(OutHeader.InventoryGrow).toBe(29);
    expect(OutHeader.SetTamingMobInfo).toBe(47);
    expect(OutHeader.QuestClear).toBe(48);
    expect(OutHeader.GatherItemResult).toBe(52);
    expect(OutHeader.SortItemResult).toBe(53);
    expect(OutHeader.SueCharacterResult).toBe(55);
    expect(OutHeader.TradeMoneyLimit).toBe(57);
    expect(OutHeader.SetGender).toBe(58);
    expect(OutHeader.TownPortalNotify).toBe(69);
    expect(OutHeader.OpenGateNotify).toBe(70);
    expect(OutHeader.MarriageRequest).toBe(75);
    expect(OutHeader.MarriageResult).toBe(76);
    expect(OutHeader.NotifyMarriedPartnerMapTransfer).toBe(78);
    expect(OutHeader.CashPetFoodResult).toBe(79);
    expect(OutHeader.SetWeekEventMessage).toBe(80);
    expect(OutHeader.SetPotionDiscountRate).toBe(81);
    expect(OutHeader.MonsterBookSetCard).toBe(86);
    expect(OutHeader.MonsterBookSetCover).toBe(87);
    expect(OutHeader.HourChanged).toBe(88);
    expect(OutHeader.MiniMapOnOff).toBe(89);
    expect(OutHeader.ConsultAuthkeyUpdate).toBe(90);
    expect(OutHeader.ClassCompetitionAuthkeyUpdate).toBe(91);
    expect(OutHeader.WebBoardAuthkeyUpdate).toBe(92);
    expect(OutHeader.SessionValue).toBe(93);
    expect(OutHeader.PartyValue).toBe(94);
    expect(OutHeader.FieldSetVariable).toBe(95);
    expect(OutHeader.BonusExpRateChanged).toBe(96);
    expect(OutHeader.PotionDiscountRateChanged).toBe(97);
    expect(OutHeader.NotifyLevelUp).toBe(109);
    expect(OutHeader.NotifyWedding).toBe(110);
    expect(OutHeader.NotifyJobChange).toBe(111);
    expect(OutHeader.MapleTVUseRes).toBe(113);
    expect(OutHeader.AvatarMegaphoneRes).toBe(114);
    expect(OutHeader.SuccessInUsegachaponBox).toBe(121);
    expect(OutHeader.SetBuyEquipExt).toBe(125);
    expect(OutHeader.SetPassengerRequest).toBe(126);
    expect(OutHeader.ScriptProgressMessage).toBe(127);
    expect(OutHeader.DataCRCCheckFailed).toBe(128);
    expect(OutHeader.UpdateGMBoard).toBe(130);
    expect(OutHeader.ShowSlotMessage).toBe(131);
    expect(OutHeader.AccountMoreInfo).toBe(133);
    expect(OutHeader.FindFriend).toBe(134);
    expect(OutHeader.TransferChannelNotify).toBe(138);
  });

  it('second batch resolved by chasing delegate decode functions', () => {
    expect(OutHeader.ForcedStatSet).toBe(33);
    expect(OutHeader.ForcedStatReset).toBe(34);
    expect(OutHeader.OpenFullClientDownloadLink).toBe(39);
    expect(OutHeader.GivePopularityResult).toBe(37);
    expect(OutHeader.MemoResult).toBe(40);
    expect(OutHeader.MapTransferResult).toBe(41);
    expect(OutHeader.IncubatorResult).toBe(72);
    expect(OutHeader.ShopScannerResult).toBe(73);
    expect(OutHeader.ShopLinkResult).toBe(74);
    expect(OutHeader.BridleMobCatchFail).toBe(82);
    expect(OutHeader.ImitatedNPCResult).toBe(83);
    expect(OutHeader.ImitatedNPCData).toBe(84);
    expect(OutHeader.LimitedNPCDisableInfo).toBe(85);
    expect(OutHeader.SetAvatarMegaphone).toBe(115);
    expect(OutHeader.ClearAvatarMegaphone).toBe(116);
    expect(OutHeader.CancelNameChangeResult).toBe(117);
    expect(OutHeader.CancelTransferWorldResult).toBe(118);
    expect(OutHeader.FakeGMNotice).toBe(120);
    expect(OutHeader.NewYearCardRes).toBe(122);
    expect(OutHeader.RandomMorphRes).toBe(123);
    expect(OutHeader.CancelNameChangebyOther).toBe(124);
    expect(OutHeader.CakePieEventResult).toBe(129);
    expect(OutHeader.WildHunterInfo).toBe(132);
    expect(OutHeader.StageChange).toBe(135);
    expect(OutHeader.DragonBallBox).toBe(136);
    expect(OutHeader.AskWhetherUsePamsSong).toBe(137);
    expect(OutHeader.DisallowedDeliveryQuestList).toBe(139);
  });

  it('IDA_NEW_GAPS.md CUserPool common/remote, pet/dragon, mob, npc opcodes', () => {
    expect(OutHeader.UserChatHistory).toBe(182);
    expect(OutHeader.UserADBoard).toBe(183);
    expect(OutHeader.SetConsumeItemEffect).toBe(185);
    expect(OutHeader.ShowItemUpgradeEffect).toBe(186);
    expect(OutHeader.ShowItemHyperUpgradeEffect).toBe(187);
    expect(OutHeader.ShowItemOptionUpgradeEffect).toBe(188);
    expect(OutHeader.ShowItemReleaseEffect).toBe(189);
    expect(OutHeader.ShowItemUnreleaseEffect).toBe(190);
    expect(OutHeader.UserHitByUser).toBe(191);
    expect(OutHeader.UserTeslaTriangle).toBe(192);
    expect(OutHeader.UserFollowCharacter).toBe(193);
    expect(OutHeader.UserShowPQReward).toBe(194);
    expect(OutHeader.UserSetPhase).toBe(195);
    expect(OutHeader.ShowRecoverUpgradeCountEffect).toBe(197);

    expect(OutHeader.PetActivated).toBe(198);
    expect(OutHeader.PetEvol).toBe(199);
    expect(OutHeader.PetActivatedSilent).toBe(200);
    expect(OutHeader.PetMove).toBe(201);
    expect(OutHeader.PetAction).toBe(202);
    expect(OutHeader.PetNameChange).toBe(203);
    expect(OutHeader.PetLoadExceptionList).toBe(204);
    expect(OutHeader.PetActionCommand).toBe(205);
    expect(OutHeader.DragonMove).toBe(206);
    expect(OutHeader.DragonAfterMove).toBe(207);
    expect(OutHeader.DragonAction).toBe(208);

    expect(OutHeader.UserMovingShootAttackPrepare).toBe(216);
    expect(OutHeader.UserHit).toBe(218);
    expect(OutHeader.UserSetActiveEffectItem).toBe(220);
    expect(OutHeader.UserShowUpgradeTombEffect).toBe(221);
    expect(OutHeader.UserSetTemporaryStat).toBe(225);
    expect(OutHeader.UserResetTemporaryStat).toBe(226);
    expect(OutHeader.UserReceiveHP).toBe(227);
    expect(OutHeader.UserGuildNameChanged).toBe(228);
    expect(OutHeader.UserGuildMarkChanged).toBe(229);
    expect(OutHeader.UserThrowGrenade).toBe(230);

    expect(OutHeader.MobStatSet).toBe(290);
    expect(OutHeader.MobStatReset).toBe(291);
    expect(OutHeader.MobSuspendReset).toBe(292);
    expect(OutHeader.MobAffected).toBe(293);
    expect(OutHeader.MobCatchEffect).toBe(299);
    expect(OutHeader.MobEffectByItem).toBe(300);
    expect(OutHeader.MobIncChargeCount).toBe(302);
    expect(OutHeader.MobEscortFullPath).toBe(304);
    expect(OutHeader.MobEscortStopPerm).toBe(305);
    expect(OutHeader.MobEscortStopSay).toBe(306);
    expect(OutHeader.MobEscortReturnBefore).toBe(307);
    expect(OutHeader.MobNextAttack).toBe(308);
    expect(OutHeader.MobAttackedByMob).toBe(309);
    expect(OutHeader.NpcTemplatePacket).toBe(317);
  });

  it('third batch resolved by chasing per-pool switch tables', () => {
    expect(OutHeader.HontaleTimer).toBe(359);
    expect(OutHeader.ChaosZakumTimer).toBe(360);
    expect(OutHeader.HontailTimer).toBe(361);
    expect(OutHeader.ZakumTimer).toBe(362);
    expect(OutHeader.RPSGameDlg).toBe(371);
    expect(OutHeader.ParcelDlg).toBe(381);
    expect(OutHeader.SummonedAttack).toBe(281);
    expect(OutHeader.SummonedSkill).toBe(282);
    expect(OutHeader.SummonedHit).toBe(283);
    expect(OutHeader.MobCrcKeyChanged).toBe(297);
    expect(OutHeader.NpcChangeController).toBe(313);
    expect(OutHeader.PetConsumeItemInit).toBe(399);
    expect(OutHeader.PetConsumeMPItemInit).toBe(400);
    expect(OutHeader.VegaResult).toBe(429);
    expect(OutHeader.AuthenCodeChanged).toBe(18);
    expect(OutHeader.LogoutGift).toBe(432);
  });

  it('Set-stage + social (140..163)', () => {
    expect(OutHeader.MacroSysDataInit).toBe(140);
    expect(OutHeader.SetField).toBe(141);
    expect(OutHeader.SetITC).toBe(142);
    expect(OutHeader.SetCashShop).toBe(143);
    expect(OutHeader.GroupMessage).toBe(150);
    expect(OutHeader.Whisper).toBe(151);
    expect(OutHeader.Clock).toBe(163);
  });

  it('Quickslot / FootHold / User / CField effects (154..233)', () => {
    expect(OutHeader.QuickslotMappedInit).toBe(175);
    expect(OutHeader.FootHoldInfo).toBe(176);
    expect(OutHeader.UserEnterField).toBe(179);
    expect(OutHeader.UserLeaveField).toBe(180);
    expect(OutHeader.UserChat).toBe(181);
    expect(OutHeader.UserMiniRoomBalloon).toBe(184);
    expect(OutHeader.FieldEffect).toBe(154);
    expect(OutHeader.BlowWeather).toBe(158);
    expect(OutHeader.PlayJukeBox).toBe(159);
    expect(OutHeader.UserMove).toBe(210);
    expect(OutHeader.UserEmotion).toBe(219);
    expect(OutHeader.UserEffectRemote).toBe(224);
    expect(OutHeader.UserEmotionLocal).toBe(232);
    expect(OutHeader.UserEffectLocal).toBe(233);
    expect(OutHeader.MakerResult).toBe(248);
  });

  it('CMobPool (284..298)', () => {
    expect(OutHeader.MobEnterField).toBe(284);
    expect(OutHeader.MobLeaveField).toBe(285);
    expect(OutHeader.MobChangeController).toBe(286);
    expect(OutHeader.MobMove).toBe(287);
    expect(OutHeader.MobCtrlAck).toBe(288);
    expect(OutHeader.MobDamaged).toBe(294);
    expect(OutHeader.MobCrcKeyChanged).toBe(297);
    expect(OutHeader.MobHPIndicator).toBe(298);
  });

  it('CNpcPool + CEmployeePool (311..321)', () => {
    expect(OutHeader.NpcEnterField).toBe(311);
    expect(OutHeader.NpcLeaveField).toBe(312);
    expect(OutHeader.NpcChangeController).toBe(313);
    expect(OutHeader.NpcMove).toBe(314);
    expect(OutHeader.EmployeeEnterField).toBe(319);
    expect(OutHeader.EmployeeLeaveField).toBe(320);
    expect(OutHeader.EmployeeMiniRoomBalloon).toBe(321);
  });

  it('CDropPool + CMessageBoxPool (322..327)', () => {
    expect(OutHeader.DropEnterField).toBe(322);
    expect(OutHeader.DropLeaveField).toBe(324);
    expect(OutHeader.MessageBoxCreateFailed).toBe(325);
    expect(OutHeader.MessageBoxEnterField).toBe(326);
    expect(OutHeader.MessageBoxLeaveField).toBe(327);
  });

  it('CAffectedAreaPool + CTownPortalPool + COpenGatePool (328..333)', () => {
    expect(OutHeader.AffectedAreaCreate).toBe(328);
    expect(OutHeader.AffectedAreaRemove).toBe(329);
    expect(OutHeader.TownPortalEnter).toBe(330);
    expect(OutHeader.TownPortalLeave).toBe(331);
    expect(OutHeader.OpenGateCreate).toBe(332);
    expect(OutHeader.OpenGateRemove).toBe(333);
  });

  it('CReactorPool + CField_SnowBall (334..341)', () => {
    expect(OutHeader.ReactorChangeState).toBe(334);
    expect(OutHeader.ReactorMove).toBe(335);
    expect(OutHeader.ReactorEnterField).toBe(336);
    expect(OutHeader.ReactorLeaveField).toBe(337);
    expect(OutHeader.SnowBallState).toBe(338);
    expect(OutHeader.SnowBallHit).toBe(339);
    expect(OutHeader.SnowBallMsg).toBe(340);
    expect(OutHeader.SnowBallTouch).toBe(341);
  });

  it('CField_MonsterCarnival (346..353)', () => {
    expect(OutHeader.MonsterCarnivalEnter).toBe(346);
    expect(OutHeader.MonsterCarnivalPersonalCp).toBe(347);
    expect(OutHeader.MonsterCarnivalTeamCp).toBe(348);
    expect(OutHeader.MonsterCarnivalRequestResult).toBe(349);
    expect(OutHeader.MonsterCarnivalRequestCanned).toBe(350);
    expect(OutHeader.MonsterCarnivalProcessForDeath).toBe(351);
    expect(OutHeader.MonsterCarnivalMemberOut).toBe(352);
    expect(OutHeader.MonsterCarnivalGameResult).toBe(353);
  });

  it('CField_ContiMove / Battlefield / AriantArena (359..362) — unnamed sub-cases, deferred', () => {
    // 359..362 dispatch through CField::OnPacket but the sub-case names
    // aren't in the dump. Phase 7 will add named entries + handlers.
    // For now, just verify the test exists (this test is a placeholder
    // to track the deferred work).
  });

  it('CScriptMan + CFuncKeyMappedMan (363..400)', () => {
    expect(OutHeader.ScriptMessage).toBe(363);
    expect(OutHeader.OpenShopDlg).toBe(364);
    expect(OutHeader.ShopResult).toBe(365);
    expect(OutHeader.AdminShopDlg).toBe(366);
    expect(OutHeader.AdminShopResult).toBe(367);
    expect(OutHeader.StoreBankResult).toBe(369);
    expect(OutHeader.StoreBankAction).toBe(370);
    expect(OutHeader.TrunkResult).toBe(368);
    expect(OutHeader.Messenger).toBe(372);
    expect(OutHeader.MiniRoom).toBe(373);
    expect(OutHeader.FuncKeyMappedInit).toBe(398);
    expect(OutHeader.PetConsumeItemInit).toBe(399);
    expect(OutHeader.PetConsumeMPItemInit).toBe(400);
  });

  it('CField_Tournament (374..377 — 378 confirmed unhandled, not a missing value)', () => {
    expect(OutHeader.TournamentInfo).toBe(374);
    expect(OutHeader.TournamentMatchTable).toBe(375);
    expect(OutHeader.TournamentSetPrize).toBe(376);
    expect(OutHeader.TournamentUEW).toBe(377);
  });

  it('CField_GuildBoss + CField_KillCount (379..381)', () => {
    expect(OutHeader.GuildBossHealerMove).toBe(379);
    expect(OutHeader.GuildBossPulleyState).toBe(380);
    expect(OutHeader.ParcelDlg).toBe(381);
  });

  it('CCashShop (382..396 — names match decompiled CCashShop::OnPacket handlers)', () => {
    expect(OutHeader.CashShopChargeParamResult).toBe(382);
    expect(OutHeader.CashShopQueryCashResult).toBe(383);
    expect(OutHeader.CashShopCashItemResult).toBe(384);
    expect(OutHeader.CashShopPurchaseExpChanged).toBe(385);
    expect(OutHeader.CashShopGiftMateInfoResult).toBe(386);
    expect(OutHeader.CashShopCheckDuplicatedIDResult).toBe(387);
    expect(OutHeader.CashShopCheckNameChangePossibleResult).toBe(388);
    expect(OutHeader.CashShopCheckTransferWorldPossibleResult).toBe(390);
    expect(OutHeader.CashShopGachaponStampResult).toBe(391);
    expect(OutHeader.CashShopCashItemGachaponResultA).toBe(392);
    expect(OutHeader.CashShopCashItemGachaponResultB).toBe(393);
    expect(OutHeader.CashShopOneADay).toBe(395);
    expect(OutHeader.CashShopNoticeFreeCashItem).toBe(396);
  });

  it('CMapleTVMan (405..407)', () => {
    expect(OutHeader.MapleTVSetMessage).toBe(405);
    expect(OutHeader.MapleTVClearMessage).toBe(406);
    expect(OutHeader.MapleTVSendMessageResult).toBe(407);
  });

  it('CITC (410..412)', () => {
    expect(OutHeader.ITCChargeParamResult).toBe(410);
    expect(OutHeader.ITCQueryCashResult).toBe(411);
    expect(OutHeader.ITCNormalItemResult).toBe(412);
  });

  it('CharacterSale (413..416)', () => {
    expect(OutHeader.CharacterSaleCheckIdResult).toBe(413);
    expect(OutHeader.CharacterSaleCreateResult).toBe(414);
    expect(OutHeader.CharacterSaleUnused415).toBe(415);
    expect(OutHeader.CharacterSaleUnused416).toBe(416);
  });

  it('ItemUpgrade (424..427)', () => {
    expect(OutHeader.ItemUpgradeUnused424).toBe(424);
    expect(OutHeader.ItemUpgradeResult).toBe(425);
    expect(OutHeader.ItemUpgradeUnused426).toBe(426);
    expect(OutHeader.ItemUpgradeUnused427).toBe(427);
  });
});

describe('OpCodes — invariants', () => {
  it('InHeader.AliveAck (25) and OutHeader.AliveReq (17) are a request/response pair', () => {
    expect(InHeader.AliveAck).toBe(25);
    expect(OutHeader.AliveReq).toBe(17);
  });

  it('InHeader.MobMove (227) ≠ OutHeader.MobMove (287) — different opcodes', () => {
    // InHeader.MobMove is a client→server mob-control ack (wrong-direction
    // per the dump; tracked here so the Phase 5 fix doesn't get lost).
    // OutHeader.MobMove is the server→client mob-position update.
    expect(InHeader.MobMove).toBe(227);
    expect(OutHeader.MobMove).toBe(287);
    expect(InHeader.MobMove).not.toBe(OutHeader.MobMove);
  });

  it('OutHeader values are monotonic within each block (no re-ordering)', () => {
    const authBlock = [
      OutHeader.CheckPasswordResult, OutHeader.GuestIDLoginResult, OutHeader.AccountInfoResult,
      OutHeader.CheckUserLimitResult, OutHeader.SetAccountResult, OutHeader.ConfirmEULAResult,
      OutHeader.CheckPinCodeResult, OutHeader.UpdatePinCodeResult, OutHeader.ViewAllCharResult,
      OutHeader.SelectCharacterByVACResult, OutHeader.WorldInformation, OutHeader.SelectWorldResult,
      OutHeader.SelectCharacterResult, OutHeader.CheckDuplicatedIDResult, OutHeader.CreateNewCharacterResult,
      OutHeader.DeleteCharacterResult, OutHeader.MigrateCommand, OutHeader.AliveReq,
      OutHeader.AuthenCodeChanged, OutHeader.AuthenMessage, OutHeader.SecurityPacket,
      OutHeader.EnableSPWResult, OutHeader.DeleteCharacterOTPRequest, OutHeader.CheckCrcResult,
      OutHeader.LatestConnectedWorld, OutHeader.RecommendWorldMessage, OutHeader.CheckExtraCharInfoResult,
      OutHeader.CheckSPWResult,
    ];
    for (let i = 1; i < authBlock.length; i++) {
      expect(authBlock[i]).toBeGreaterThan(authBlock[i - 1]);
    }
  });
});
