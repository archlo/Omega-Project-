// MapleStory v95 — opcode enums (client→server InHeader, server→client OutHeader).
//
// Values are pinned to the v95 reverse-engineering dump
// (C:\Users\jorge\OneDrive\Desktop\Maplestory95.exe_export_for_ai\generated\packet_handlers.json).
// Tests in tests/net/packet/OpCodes.spec.ts assert that every named entry still
// matches the dump — a "let me re-order this" PR can never accidentally
// change a wire value.

export enum InHeader {
  // 0-9 — auth / login lifecycle
  CheckPassword             = 1,
  GuestIDLogin              = 2,
  AccountInfoRequest        = 3,
  WorldInfoRequest          = 4,
  SelectWorld               = 5,
  CheckUserLimit            = 6,
  ConfirmEULA               = 7,
  SetGender                 = 8,
  CheckPinCode              = 9,

  // 10-29 — world / char / select
  UpdatePinCode             = 10,
  WorldRequest              = 11,
  LogoutWorld               = 12,
  ViewAllChar               = 13,
  SelectCharacterByVAC      = 14,
  VACFlagSet                = 15,
  CheckNameChangePossible   = 16,
  RegisterNewCharacter      = 17,
  CheckTransferWorldPossible = 18,
  SelectCharacter           = 19,
  MigrateIn                 = 20,
  CheckDuplicatedID         = 21,
  CreateNewCharacter        = 22,
  CreateNewCharacterInCS    = 23,
  DeleteCharacter           = 24,
  AliveAck                  = 25,
  ExceptionLog              = 26,
  SecurityPacket            = 27,
  EnableSPWRequest          = 28,
  CheckSPWRequest           = 29,
  EnableSPWRequestByVAC     = 30,
  CheckSPWRequestByVAC      = 31,
  CheckOTPRequest           = 32,
  CheckDeleteCharacterOTP   = 33,
  CreateSecurityHandle      = 34,
  SSOErrorLog                = 35,
  ClientDumpLog             = 36,
  CheckExtraCharInfo        = 37,
  CreateNewCharacter_Ex     = 38,

  // 41-52 — field system (movement, combat, hits)
  UserTransferFieldRequest  = 41,
  UserTransferChannelRequest = 42,
  UserMigrateToCashShopRequest = 43,
  UserMove                  = 44,
  UserSitRequest            = 45,
  UserPortableChairSitRequest = 46,
  UserMeleeAttack           = 47,
  UserShootAttack           = 48,
  UserMagicAttack           = 49,
  UserBodyAttack            = 50,
  UserMovingShootAttackPrepare = 51,
  UserHit                   = 52,

  // 54-78 — chat / shop / inventory / skill
  UserChat                  = 54,
  UserEmotion               = 56,
  // OG: CWvsContext::SendActiveEffectItemChange (IDA 0x9F9420) —
  // opcode 57, int(nItemID). Toggles a cosmetic effect item.
  UserActiveEffectItemChange = 57,
  UserHP                    = 59,
  UserSelectNpc             = 63,
  UserScriptMessageAnswer   = 65,
  UserShopRequest           = 66,
  UserTrunkRequest          = 67,
  UserEntrustedShopRequest  = 68,
  // OG: CUserLocal::SendSkillEffectRequest (live IDA decompile,
  // Maplestory95.exe.i64 0x93aeb0) — int skillId, byte slv, byte bSendLocal.
  // Confirmed callers: OnKeyDownSkillEnd (key-up on a hold/charge skill),
  // TryDoingRepeatSkill, TryDoingRocketBoosterEnd, and one site inside
  // DoActiveSkill — all charge/repeat-style skills re-syncing the visual
  // effect's end/continuation, not a generic "every skill use" send. Not
  // wired to a sender yet — this client doesn't model hold-to-charge input.
  UserSkillEffectRequest    = 71,
  // OG: CStoreBankDlg::SendGetAllRequest (decompile/7449f0.c) — only known
  // sub-action is the "get all" fee confirmation, opcode 69 + byte 0x1B.
  UserStoreBankRequest      = 69,
  // OG: CAdminShopDlg::OnPacket (decompile/4310f0.c) sends opcode 74 with a
  // leading sub-action byte: 0 = reopen-after-result(npcTemplateId), 2 = initial
  // request when no dialog instance exists yet. Both share this one opcode.
  UserAdminShopRequest      = 74,
  UserGatherItemRequest     = 75,
  UserSortItemRequest       = 76,
  UserChangeSlotPositionRequest = 77,
  UserStatChangeItemUseRequest = 78,
  // OG: CWvsContext::SendStatChangeItemCancelRequest (v95 IDA dump,
  // func_encode_seq: int(4), send_op=0x4f)
  UserStatChangeItemCancelRequest = 79,
  // OG: CWvsContext::SendMobSummonItemUseRequest (IDA 0x9DE580) —
  // opcode 81, int(updateTime), short(nPOS), int(nItemID).
  UserMobSummonItemUseRequest = 81,
  // OG: CWvsContext::SendPetFoodItemUseRequest (IDA 0x9D9F20) —
  // opcode 82, int(updateTime), short(nPOS), int(nItemID).
  UserPetFoodItemUseRequest = 82,
  // OG: CWvsContext::SendTamingMobFoodItemUseRequest (IDA 0x9D63A0) —
  // opcode 83, int(updateTime), short(nPOS), int(nItemID).
  UserTamingMobFoodItemUseRequest = 83,
  // OG: CWvsContext::SendScriptRunItemRequest (IDA 0x9DE7A0) —
  // opcode 84, int(updateTime), short(nPOS), int(nItemID).
  UserScriptRunItemUseRequest = 84,
  // OG: opcode 85 (0x55) is a generic "consume cash item" sender shared by
  // several unrelated dialogs — confirmed via the v95 IDA dump's
  // func_encode_seq table for CWvsContext::SendConsumeCashItemUseRequest,
  // CUICharacterSaleDlg::SendCreateNewCharacter, CItemSpeakerDlg and
  // CUIKarmaDlg's own `_SendConsumeCashItemUseRequest` (all send_op=0x55).
  // Kept as two names for the two call sites this client actually builds.
  UserCharacterSaleCreate   = 85,
  UserConsumeCashItemUseRequest = 85,
  // OG: CWvsContext::SendBridleItemUseRequest (IDA 0x9E08C0) —
  // opcode 87, int(updateTime), short(nPOS), int(nItemID).
  UserBridleItemUseRequest = 87,
  // OG: CP_UserItemReleaseRequest (0x61 = 97) — CWvsContext::SendItemReleaseRequest(nUPOS, nEPOS)
  UserItemReleaseRequest    = 97,
  // OG: CWvsContext::SendSelectNpcItemUseRequest (IDA 0x9DA430) —
  // opcode 123, short(nPOS), int(nItemID).
  UserSelectNpcItemUseRequest = 123,
  // OG: CWvsContext::SendLotteryItemUseRequest (IDA 0x9D6C50) —
  // opcode 124, short(nPos), int(nItemID).
  UserLotteryItemUseRequest = 124,

  // OG: CWvsContext::SendSkillLearnItemUseRequest/SendSkillResetItemUseRequest
  // (decompile/9d65e0.c, 9de8c0.c) — using a skill book/mastery book or a
  // skill-reset scroll goes through these dedicated opcodes, NOT the
  // generic UserStatChangeItemUseRequest used for potions/buff items.
  SkillLearnItemUseRequest = 88,
  SkillResetItemUseRequest = 89,
  // OG: CWvsContext::SendShopScannerItemUseRequest (IDA 0x9E10E0) —
  // opcode 90, short(nPOS), int(nItemID).
  UserShopScannerItemUseRequest = 90,
  // OG: CWvsContext::SendMapTransferItemUseRequest (IDA 0x9E6020) —
  // opcode 91, short(nPOS), int(nItemID).
  UserMapTransferItemUseRequest = 91,

  // 92-119 — portals / stats / skills / quests
  UserPortalScrollUseRequest = 92,
  UserAbilityUpRequest     = 98,
  UserAbilityMassUpRequest = 99,
  // OG: CWvsContext::SendStatChangeRequest/SendStatChangeRequestByItemOption
  // (v95 IDA dump func_encode_seq, send_op=0x64/0x65) — AP-allocation-style
  // stat change requests, distinct from the item-driven ones at 78/79.
  UserStatChangeRequest     = 100,
  UserStatChangeRequestByItemOption = 101,
  UserSkillUpRequest        = 102,
  UserSkillUseRequest       = 103,
  UserSkillCancelRequest    = 104,
  UserSkillPrepareRequest   = 105,
  UserDropMoneyRequest      = 106,
  UserCharacterInfoRequest  = 109,
  UserPortalScriptRequest   = 112,
  UserPortalTeleportRequest = 113,
  UserMapTransferRequest    = 114,
  // anti-macro challenge response (CWvsContext::SendAntiMacroItemUseRequest)
  SendAntiMacroItemUseRequest = 115,
  // CUIAntiMacro::SetRet (decompile/78c940.c) — the real captcha-answer
  // submit packet (TODO_AUDIT.md "Resolved against the v95 decompile"
  // section, waterfall implementation pass). Single EncodeStr of the typed
  // answer; only sent when the player clicked OK (nRet==1), never on
  // cancel/timeout.
  AntiMacroAnswerRequest    = 117,
  ClaimRequest              = 118,
  UserQuestRequest          = 119,
  // skill-macro save-to-server (CMacroSysMan::FlushToSvr)
  SkillMacroFlushToSvr     = 122,
  // OG: CWvsContext::SendUseBoxGachaponItemRequest /
  // SendUseGachaponRemoteRequest (v95 IDA dump, send_op=0x7f/0x80).
  UserUseBoxGachaponItemRequest = 127,
  UserUseGachaponRemoteRequest = 128,
  // OG: CWvsContext::OnMarriageRequest (decompile/a00bb0.c) — the
  // requestType===0 branch builds and sends this directly inline (not a
  // separate Send* method) right after showing the local YesNo dialog:
  // byte(2), byte(accepted), string(requesterName), int(partnerId).
  MarriageRequestResponse = 161,
  // OG: CWishListGiveDlg::SendPutItemRequest (decompile/9a7140.c, sub 6) /
  // CWishListRecvDlg::SendGetItemRequest (decompile/9aba50.c, sub 7)
  UserWeddingWishListRequest = 162,
  // OG: CUIMiniMap::OnMouseButton sends opcode 166 (0xA6) with no payload
  // when the player clicks their own dot on the minimap. Server-side:
  // CField::OnPacketCField routes it; kinoko-main treats it as a position
  // sync / idle acknowledgement.
  UserMiniMapClick            = 166,

  // OG: CRepairDurabilityDlg::SendRepairDurabilityAll/SendRepairDurability
  // (decompile/6d37b0.c, 6d3980.c, both reached from OnButtonClicked at
  // decompile/6d3a20.c). RepairDurabilityAll has no payload;
  // RepairDurability sends the selected item's nPOS (slot) as Encode4.
  RepairDurabilityAll      = 130,
  RepairDurability         = 131,

  // 140-159 — social / messenger / miniroom / party / guild / friend
  GroupMessage              = 140,
  Whisper                   = 141,
  Messenger                 = 143,
  MiniRoom                  = 144,
  PartyRequest              = 145,
  // OG: ExpeditionIntermediary uses opcode 147 (0x93) for ALL outbound
  // expedition requests (create, invite, response, withdraw, kick,
  // change-master, change-boss, relocate-party). Sub-action byte first.
  ExpeditionRequest         = 147,
  // OG: TabPartyAdver uses opcode 148 (0x94) for all outbound party search
  // / advertisement requests. Sub-action byte first (0x51=RegistCommit,
  // 0x53=AdverRequest, 0x56=ApplyResponse).
  PartyAdverRequest         = 148,
  GuildRequest              = 149,
  FriendRequest             = 153,
  FuncKeyMappedModified     = 159,

  // 167 — Alliance request (CTabGuildAlliance::OnWithdraw/OnInvite/OnKick/
  // OnChangeMaster/OnGradeChange/OnSetNotice — all use COutPacket(0xA7=167),
  // confirmed via IDA decompile in TODO_AUDIT.md Hundred-and-twenty-sixth pass).
  AllianceRequest           = 167,

  // 169-177 — Family system requests (CWvsContext::SendFamilyXxx,
  // decompile/a09860.c, a09d20.c, a09c50.c, a0b0a0.c)
  UserFamilyChartRequest    = 169,
  UserFamilyInfoRequest     = 170,
  UserFamilyInviteResult    = 174,
  // OG: CWvsContext::SendUseFamilyPrivilege (decompile, 0x7b... call site
  // inside CUIFamily::OnButtonClicked's case 0x7D4u). Body is index-only for
  // most privilege types; types <= SP_Summon also prompt for a target name
  // and append it via EncodeStr — that sub-case isn't ported (SP_ enum
  // values aren't recoverable from disassembly without guessing), so this
  // client only sends the plain index, which covers the non-target privileges.
  UserUseFamilyPrivilege    = 175,
  // OG: CWvsContext::SendSetFamilyPrecept.
  UserSetFamilyPrecept      = 176,
  UserFamilySummonResponse  = 177,

  // 179 — Guild BBS requests (CUIGuildBBS::SendLoadListRequest/
  // SendViewEntryRequest/OnRegister/OnComment/OnCommentDelete/OnDelete,
  // decompile/7c3680.c, 7c3710.c, 7c4250.c, 7c4530.c, 7c3b70.c, 7c6520.c)
  UserGuildBBSRequest       = 179,
  // OG: CWvsContext::SendExpUpItemUseRequest (IDA 0x9DB1C0) —
  // opcode 181, int(updateTime), short(nPOS), int(nItemID).
  UserExpUpItemUseRequest   = 181,

  // OG: CWvsContext::SendDragonBallBoxRequest (IDA 0x9D73D0) —
  // opcode 196, no payload.
  UserDragonBallBoxRequest  = 196,
  // 216 — quickslot server-side ack (server→client of FuncKeyMappedInit=398)
  QuickslotKeyMappedModified = 216,

  // 227-246 — mob ack / npc / drop pickup
  // NOTE: the C++ MobMove=227 is the client→server ack for the server→client
  // OutHeader.MobMove=287. Don't confuse it with the receiving opcode.
  MobMove                   = 227,
  MobApplyCtrl              = 228,
  NpcMove                   = 241,
  DropPickUpRequest         = 246,

  // OG: CUIRaiseWnd::SendPutItem / CUIRaisePieceWnd::SendPutItem (v95 IDA
  // dump, send_op=0x11d/0x11e) — pet-evolution "Raise" minigame.
  UserRaiseWndPutItem       = 285,
  UserRaisePieceWndPutItem  = 286,
  // OG: CUIFindFriend::SendMyInfoRequest/SendSearchRequest (v95 IDA dump) —
  // both share opcode 0xc2(194), distinguished by the sub-action byte
  // (confirmed via disassembly: Encode1(0) vs Encode1(1)).
  UserFindFriendRequest     = 194,

  // 275 — Cash Shop request (CCashShop::SendGiftsPacket, decompile/487b60.c).
  // Only sub-action 4 (Gift) is confirmed here; the rest of CCashShop's
  // outgoing request sub-actions are a separate, larger, already-tracked
  // gap (see CashShopHandlers.ts's CashItemResult 54-way sub-dispatch debt)
  // and intentionally not guessed at here.
  UserCashShopRequest       = 275,

  // OG: CUICharacterSaleDlg::SendCheckDuplicateIDPacket (decompile/777d20.c)
  UserCharacterSaleCheckId  = 311,
}

export enum OutHeader {
  // 0-27 — auth / login lifecycle (server→client)
  CheckPasswordResult       = 0,
  GuestIDLoginResult        = 1,
  AccountInfoResult         = 2,
  CheckUserLimitResult      = 3,
  SetAccountResult          = 4,
  ConfirmEULAResult         = 5,
  CheckPinCodeResult        = 6,
  UpdatePinCodeResult       = 7,
  ViewAllCharResult         = 8,
  SelectCharacterByVACResult = 9,
  WorldInformation          = 10,
  SelectWorldResult         = 11,
  SelectCharacterResult     = 12,
  CheckDuplicatedIDResult   = 13,
  CreateNewCharacterResult  = 14,
  DeleteCharacterResult     = 15,
  MigrateCommand            = 16,
  AliveReq                  = 17,
  // AuthenCodeChanged confirmed real but NOT dispatched via CLogin::
  // OnPacket — it's CClientSocket::OnAuthenCodeChanged (decompile/4afe50.c
  // / v95 IDA dump), reached through a separate socket-level path. Per the
  // CLogin::OnPacket switch ground truth (v95 IDA dump switch_entries for
  // 0x5df94d), values 16-20 and 22-23 all share the SAME default-case
  // target (0x5dfaa4) — i.e. CLogin::OnPacket itself never special-cases
  // SecurityPacket(20) or DeleteCharacterOTPRequest(22) at all, and no
  // alternate dispatcher for them was found either. Confirmed dead.
  AuthenCodeChanged         = 18,
  AuthenMessage             = 19,
  SecurityPacket            = 20, // confirmed dead — see comment above
  EnableSPWResult           = 21,
  DeleteCharacterOTPRequest = 22, // confirmed dead — see comment above
  CheckCrcResult            = 23,
  LatestConnectedWorld      = 24,
  RecommendWorldMessage     = 25,
  CheckExtraCharInfoResult  = 26,
  CheckSPWResult            = 27,

  // 28-46 — CWvsContext (inventory, stats, skill, anti-macro, claim, etc.)
  InventoryOperation        = 28,
  StatChanged               = 30,
  TemporaryStatSet          = 31,
  TemporaryStatReset        = 32,
  ChangeSkillRecordResult   = 35,
  SkillUseResult            = 36,
  // OG: CWvsContext::OnGivePopularityResult (decompile/9FEA60.c, opcode 37) —
  // byte subResult: 0=given(charName,accepted,fame), 1-4=notice only, 5=given
  // (charName,accepted). Sub-result determines the notice text.
  GivePopularityResult      = 37,
  Message                   = 38,
  AntiMacroResult           = 42,
  ClaimResult               = 44,
  SetClaimSvrAvailableTime  = 45,
  ClaimSvrStatusChanged     = 46,

  // 49 — EntrustedShop / Hired Merchant check result
  EntrustedShopCheckResult  = 49,

  // 50-51 — skill book / skill reset item results (CWvsContext::OnPacket
  // switch, decompile/9e5830.c case 50/51 -> decompile/9f7af0.c, 9f60b0.c).
  SkillLearnItemResult      = 50,
  SkillResetItemResult      = 51,

  // 59 — Guild BBS (CWvsContext::OnGuildBBSPacket, decompile/9ccf20.c,
  // forwards to CUIGuildBBS::OnGuildBBSPacket, decompile/7c8260.c)
  GuildBBSPacket            = 59,

  // 61-68 — party / expedition / friend / guild / alliance results
  CharacterInfo             = 61,
  PartyResult               = 62,
  // OG: CWvsContext::OnExpedtionResult dispatches after decoding 1 byte
  // (sub-action) to ExpeditionIntermediary::OnPacket. Sub-action char codes:
  // '9'/'='/';'=Get, ':'/'A'/'C'/'D'=Removed, '<'/'@'/'B'=Notice, 'E'=MasterChanged,
  // 'F'=Modified, 'H'=Invite, 'I'=ResponseInvite.
  ExpeditionResult          = 64,
  FriendResult              = 65,
  GuildResult               = 67,
  // TODO_AUDIT.md Hundred-and-twenty-third pass: confirmed against
  // CWvsContext::OnPacket jump table (0xa0fb78, entry 5 → 0xa0f172);
  // cases confirmed via byte_A0FBB8 lookup: 12=clear, 13=member update, 16=full load.
  AllianceResult            = 68,

  // 71 — broadcast message
  BroadcastMsg              = 71,

  // 75-78 — Marriage/Wedding (CWvsContext::OnPacket, decompile/9e5830.c).
  // 75/76 (MarriageRequest/MarriageResult, defined further below in this
  // enum) and 77 (WeddingGiftResult) are implemented; their decode shapes
  // were fixed in a later pass (see AUDIT_OG_V95.md's marriage pass) —
  // this comment was stale, written before that fix landed. 78
  // (NotifyMarriedPartnerMapTransfer) is also implemented below.
  WeddingGiftResult         = 77,

  // 98-108 — Family system (CWvsContext::OnPacket, decompile/9e5830.c).
  // FamilyChartResult's body (CUIFamilyChart::DecodeLocalChart) has no
  // decompiled implementation anywhere in the dump — left fully opaque.
  FamilyChartResult         = 98,
  FamilyInfoResult          = 99,
  FamilyResult              = 100,
  FamilyJoinRequest         = 101,
  FamilyJoinRequestResult   = 102,
  FamilyJoinAccepted        = 103,
  FamilyPrivilegeList       = 104,
  FamilyFamousPointIncResult = 105,
  FamilyNotifyLoginOrLogout = 106,
  FamilySetPrivilege        = 107,
  FamilySummonRequest       = 108,

  // Confirmed via the v95 IDA dump's switch_entries/func_disasm tables for
  // CWvsContext::OnPacket's jump table at 0x9e5840 (ground truth — literal
  // case values resolved to their call targets, not guessed from decompile
  // reading). Field shapes are from the same dump's func_decode_seq table;
  // field names are best-effort from the OG method name where the dump
  // doesn't expose argument names, and are noted as such per-interface in
  // PacketArgs.ts.
  InventoryGrow             = 29,
  SetTamingMobInfo          = 47,
  QuestClear                = 48,
  GatherItemResult          = 52,
  SortItemResult            = 53,
  SueCharacterResult        = 55,
  TradeMoneyLimit           = 57,
  SetGender                 = 58,
  TownPortalNotify          = 69,
  OpenGateNotify            = 70,
  MarriageRequest           = 75,
  MarriageResult            = 76,
  NotifyMarriedPartnerMapTransfer = 78,
  CashPetFoodResult         = 79,
  SetWeekEventMessage       = 80,
  SetPotionDiscountRate     = 81,
  MonsterBookSetCard        = 86,
  MonsterBookSetCover       = 87,
  HourChanged               = 88,
  MiniMapOnOff              = 89,
  ConsultAuthkeyUpdate      = 90,
  ClassCompetitionAuthkeyUpdate = 91,
  WebBoardAuthkeyUpdate     = 92,
  SessionValue              = 93,
  PartyValue                = 94,
  FieldSetVariable          = 95,
  BonusExpRateChanged       = 96,
  PotionDiscountRateChanged = 97,
  NotifyLevelUp             = 109,
  NotifyWedding             = 110,
  NotifyJobChange           = 111,
  MapleTVUseRes             = 113,
  AvatarMegaphoneRes        = 114,
  SuccessInUsegachaponBox   = 121,
  SetBuyEquipExt            = 125,
  SetPassengerRequest       = 126,
  ScriptProgressMessage     = 127,
  DataCRCCheckFailed        = 128,
  UpdateGMBoard             = 130,
  ShowSlotMessage           = 131,
  AccountMoreInfo           = 133,
  FindFriend                = 134,
  TransferChannelNotify     = 138,

  // Second batch from the same v95 IDA dump audit — gated via CWvsContext::OnPacket.
  // All non-empty handler bodies have been decompiled from the .i64 directly;
  // wire shapes are extracted from the pseudocode at the referenced address.
  ForcedStatSet             = 33,
  ForcedStatReset           = 34,             // empty body — no Decode* calls
  OpenFullClientDownloadLink = 39,            // empty body — opens hardcoded URL
  MemoResult                = 40,             // OG: CWvsContext::OnMemoResult (0x9F9DA0)
  MapTransferResult         = 41,             // OG: CWvsContext::OnMapTransferResult (0x9F9F90)
  IncubatorResult           = 72,             // OG: CWvsContext::OnIncubatorResult (0xA00380)
  ShopScannerResult         = 73,             // OG: CWvsContext::OnShopScannerResult (0xA076C0)
  ShopLinkResult            = 74,
  BridleMobCatchFail        = 82,             // OG: CWvsContext::OnBridleMobCatchFail (0x9D9A80)
  ImitatedNPCResult         = 83,             // OG: CWvsContext::OnImitatedNPCResult (0x9CFB30)
  ImitatedNPCData           = 84,             // forwards into CNpcPool::OnNpcImitateData
  LimitedNPCDisableInfo     = 85,             // forwards into CNpcPool::OnUpdateLimitedDisableInfo
  SetAvatarMegaphone        = 115,            // OG: CWvsContext::OnSetAvatarMegaphone (0xA017E0)
  ClearAvatarMegaphone      = 116,            // empty body
  CancelNameChangeResult    = 117,            // OG: CWvsContext::OnCancelNameChangeResult (0xA01B10)
  CancelTransferWorldResult = 118,            // OG: CWvsContext::OnCancelTransferWorldResult (0xA01CF0)
  DestroyShopResult         = 119,
  FakeGMNotice              = 120,            // OG: CWvsContext::OnFakeGMNotice (0x9FB440)
  NewYearCardRes            = 122,            // OG: CWvsContext::OnNewYearCardRes (0xA02730)
  RandomMorphRes            = 123,            // OG: CWvsContext::OnRandomMorphRes (0x9D0040)
  CancelNameChangebyOther   = 124,            // empty body — canned notice only
  CakePieEventResult        = 129,            // OG: CWvsContext::OnCakePieEventResult (0x9E5360)
  WildHunterInfo            = 132,
  AskWhetherUsePamsSong     = 137,            // empty body
  StageChange               = 135,            // OG: CWvsContext::OnStageChange (0x9DB630)
  DragonBallBox             = 136,            // OG: CWvsContext::OnDragonBallBox (0x9E5360)

  DisallowedDeliveryQuestList = 139,

  // 140-151 — macro sync, stage / group / whisper transitions
  MacroSysDataInit          = 140,
  SetField                  = 141,
  SetITC                    = 142,
  SetCashShop               = 143,
  GroupMessage              = 150,
  Whisper                   = 151,

  // 163-176 — clock / func-key / foot-hold (Clock = 163 defined below with full 147-177 block)
  QuickslotMappedInit       = 175,
  FootHoldInfo              = 176,

  // 179-186 — user enter/leave/chat/miniroom-balloon
  UserEnterField            = 179,
  UserLeaveField            = 180,
  UserChat                  = 181,
  UserMiniRoomBalloon       = 184,

  // 147-177 — CField general packet subtypes (CField::OnPacket switch, 0x546d50)
  TransferFieldReqIgnored   = 147,
  TransferChannelReqIgnored = 148,
  FieldSpecificData         = 149,
  CoupleMessage             = 152,
  SummonItemInavailable     = 153,
  FieldEffect               = 154,
  FieldObstacleOnOff        = 155,
  FieldObstacleOnOffStatus  = 156,
  FieldObstacleAllReset     = 157,
  BlowWeather               = 158,
  PlayJukeBox               = 159,
  AdminResult               = 160,
  Quiz                      = 161,
  Desc                      = 162,
  Clock                     = 163,
  DestroyClock              = 170,
  SetQuestClear             = 166,
  SetQuestTime              = 167,
  WarnMessage               = 168,
  SetObjectState            = 169,
  StalkResult               = 172,
  // OG: CField_Massacre::OnPacket (decompile, 0x556460) — only intercepted
  // by the fieldType-23 field subclass. TODO_AUDIT.md Seventy-eighth
  // pass's `CField_Massacre` finding, WZ-confirmed present (351 maps with
  // info/fieldType===23, e.g. 926023401.img).
  MassacreIncGauge          = 173,
  // OG: CField_MassacreResult::OnPacket (decompile, 0x55a1d0) — fieldType
  // 24 sibling field.
  MassacreResult            = 174,
  RequestFootHoldInfo       = 177,
  // OG: CField_KillCount::OnPacket (decompile, 0x554050) — only intercepted
  // by the fieldType-34 field subclass (e.g. kill-count-gated event maps,
  // TODO_AUDIT.md Eighty-third pass's `CField_KillCount` finding,
  // WZ-confirmed present: 10 maps with info/fieldType===34), every other
  // type forwards to the generic `CField::OnPacket`.
  KillCountInfo             = 178,

  // 198-208 — Pet & Dragon pool (CUser::OnPetPacket 0x8e02a0 / CUser::OnDragonPacket,
  // dispatched from CUserPool::OnUserCommonPacket). Re-decompiled against the
  // real v95 IDB (TODO_AUDIT.md pass following IDA_NEW_GAPS.md Section 2a):
  // the previous PetAction/PetAttack/.../PetInteract names+shapes below this
  // comment were fabricated (didn't match CUser::OnPetPacket's actual switch
  // or any CPet::On* body) and have been replaced with the verified shapes.
  //
  // OG dispatch: 198/200 both call CUser::OnPetActivated (summon/remove);
  // only 198 additionally calls PetInterActWithUserAction(0, petIdx) right
  // after (plays the pet's default "activated" reaction, action 0). 199 is a
  // distinct OnPetEvol (pet evolves into a new template at the same slot).
  // 201-205 are read through a *shared* petIdx byte decoded by OnPetPacket
  // itself before dispatch to the matching CPet::On* method, NOT per-handler.
  PetActivated              = 198, // OG case 198/200, CUser::OnPetActivated (0x9547d0/0x90fb90) — see PacketArgs.PetActivatedArgs; 198 also triggers the pet's default interact action.
  PetEvol                   = 199, // OG case 199, CUser::OnPetEvol (0x8e5ce0) — same Init shape as PetActivated, always re-summons at petIdx.
  PetActivatedSilent        = 200, // OG case 200 — identical wire shape to PetActivated(198), but does not trigger PetInterActWithUserAction.
  PetMove                   = 201, // OG case 201, CPet::OnMove (0x69fb60) — petIdx:u8, then CMovePath (reuse DecodeMovePath()).
  PetAction                 = 202, // OG case 202, CPet::OnAction (0x6a3860) — petIdx:u8, type:u8, actionNo:u8, chat:string, flag:u8.
  PetNameChange             = 203, // OG case 203, CPet::OnNameChanged (0x6a11f0) — petIdx:u8, newName:string, showNameTag:u8(bool).
  PetLoadExceptionList      = 204, // OG case 204, CPet::OnLoadExceptionList (0x6a1510) — petIdx:u8, lockerSN:8 bytes, count:u8, itemId:u32[count].
  PetActionCommand          = 205, // OG case 205, CPet::OnActionCommand (0x6a3930) — petIdx:u8, nType:u8, [nType==0: interactionIdx:u8, successFlag:u8] [nType==1: successFlag:u8], then flag:u8. WZ CPetTemplate interaction/food-reaction text not ported — see FieldHandlers.ts handlePetActionCommand.
  DragonMove                = 206, // OG: CUser::OnDragonPacket case 206 — CMovePath
  DragonAfterMove           = 207, // OG: case 207 — CMovePath
  DragonAction              = 208, // OG: case 208 — byte(action), int option

  // 182-197 — CUserPool::OnUserCommonPacket (0x94CDB0, remaining gaps).
  // 181/184 already defined above (UserChat/UserMiniRoomBalloon).
  UserChatHistory           = 182, // OG: CUser::OnChat (scrollback=1 flag variant)
  UserADBoard               = 183, // OG: CUser::OnADBoard — player ad board
  SetConsumeItemEffect      = 185, // OG: CUser::SetConsumeItemEffect — glow/effect on char
  ShowItemUpgradeEffect     = 186, // OG: CUser::ShowItemUpgradeEffect — scroll success/fail
  ShowItemHyperUpgradeEffect = 187, // OG: CUser::ShowItemHyperUpgradeEffect
  ShowItemOptionUpgradeEffect = 188, // OG: CUser::ShowItemOptionUpgradeEffect
  ShowItemReleaseEffect     = 189, // OG: CUser::ShowItemReleaseEffect — clean slating
  ShowItemUnreleaseEffect   = 190, // OG: CUser::ShowItemUnreleaseEffect
  UserHitByUser             = 191, // OG: CUser::OnHitByUser — player bumped
  UserTeslaTriangle         = 192, // OG: CUser::OnTeslaTriangle — priest/FP triangle
  UserFollowCharacter       = 193, // OG: CUser::OnFollowCharacter
  UserShowPQReward          = 194, // OG: CUser::OnShowPQReward
  UserSetPhase              = 195, // OG: CUser::OnSetPhase
  // 196 — CField::OnPacket case 196 (decompile/546D50.c) is an explicit no-op (return;). TODO_AUDIT.md Hundred-and-fifty-sixth pass: confirmed dead case.
  FieldNop196               = 196,
  ShowRecoverUpgradeCountEffect = 197, // OG: CUser::ShowRecoverUpgradeCountEffect

  // 210-233 — CUserPool::OnUserRemotePacket (0x94B390), remaining gaps.
  // 210-215, 217, 219, 222-224, 232-233 already defined below.
  UserMove                  = 210,
  // OG: CUserPool::OnUserRemotePacket (live IDA decompile,
  // Maplestory95.exe.i64 0x94b390) dispatches 211-214 to
  // CUserRemote::OnAttack(nType, iPacket), which itself routes by nType to
  // OnMeleeAttack/OnShootAttack/OnMagicAttack/OnBodyAttack (0x95a670,
  // decompiled in full). These broadcasts had no OutHeader entry in this
  // client at all — other players' attacks were entirely undecoded, not
  // just missing a visual. OnAttack's shared decode prefix (~250 lines,
  // confirmed) is dense with per-skillId special-casing on par with
  // DoActiveSkill (grenade throws, swallow-mob, meso-explosion damage
  // shape, serial-attack flag, per-skill tremble/fade) — out of reach to
  // fully replicate; see FieldHandlers.handleUserAttack for the common-case
  // decode actually implemented.
  MeleeAttack               = 211,
  ShootAttack               = 212,
  MagicAttack               = 213,
  BodyAttack                = 214,
  SkillPrepare              = 215,
  UserMovingShootAttackPrepare = 216, // OG: CUserRemote::OnMovingShootAttackPrepare
  SkillCancel               = 217,
  UserHit                   = 218, // OG: CUserRemote::OnHit
  UserEmotion               = 219,
  UserSetActiveEffectItem   = 220, // OG: CUserRemote::OnSetActiveEffectItem
  UserShowUpgradeTombEffect = 221, // OG: CUserRemote::OnShowUpgradeTombEffect
  UserSetActivePortableChair = 222,
  UserAvatarModified        = 223,
  UserEffectRemote          = 224,
  UserSetTemporaryStat      = 225, // OG: CUserRemote::OnSetTemporaryStat
  UserResetTemporaryStat    = 226, // OG: CUserRemote::OnResetTemporaryStat
  UserReceiveHP             = 227, // OG: CUserRemote::OnReceiveHP
  UserGuildNameChanged      = 228, // OG: CUserRemote::OnGuildNameChanged
  UserGuildMarkChanged      = 229, // OG: CUserRemote::OnGuildMarkChanged
  UserThrowGrenade          = 230, // OG: CUserRemote::OnThrowGrenade

  // 231-275 — CUserLocal::OnPacket switch (decompile/9340C0.c). All confirmed
  // from the complete switch table. Stub-registered to close opcode-parity gap;
  // TODO_AUDIT.md Hundred-and-fifty-sixth pass.
  SitResult                 = 231, // OG: CUserLocal::OnSitResult
  UserEmotionLocal          = 232,
  UserEffectLocal           = 233,
  UserTeleport              = 234, // OG: CUserLocal::OnTeleport
  MesoGiveSucceeded         = 236, // OG: CUserLocal::OnMesoGive_Succeeded
  MesoGiveFailed            = 237, // OG: CUserLocal::OnMesoGive_Failed
  RandomMesobagSucceeded    = 238, // OG: CUserLocal::OnRandomMesobag_Succeeded
  RandomMesobagFailed       = 239, // OG: CUserLocal::OnRandomMesobag_Failed
  FieldFadeInOut            = 240, // OG: CUserLocal::OnFieldFadeInOut
  FieldFadeOutForce         = 241, // OG: CUserLocal::OnFieldFadeOutForce
  QuestResult               = 242, // OG: CUserLocal::OnQuestResult (sub-action dispatch, not yet decoded)
  NotifyHPDecByField        = 243, // OG: CUserLocal::OnNotifyHPDecByField
  BalloonMsg                = 245, // OG: CUserLocal::OnBalloonMsg
  PlayEventSound            = 246, // OG: CUserLocal::OnPlayEventSound
  PlayMinigameSound         = 247, // OG: CUserLocal::OnPlayMinigameSound
  MakerResult               = 248, // OG: CUserLocal::OnMakerResult
  OpenClassCompetitionPage  = 250, // OG: CUserLocal::OnOpenClassCompetitionPage
  OpenUI                    = 251, // OG: CUserLocal::OnOpenUI
  OpenUIWithOption          = 252, // OG: CUserLocal::OnOpenUIWithOption
  SetDirectionMode          = 253, // OG: CUserLocal::OnSetDirectionMode
  SetStandAloneMode         = 254, // OG: CUserLocal::OnSetStandAloneMode
  HireTutor                 = 255, // OG: CUserLocal::OnHireTutor
  TutorMsg                  = 256, // OG: CUserLocal::OnTutorMsg
  IncComboResponse          = 257, // OG: CUserLocal::OnIncComboResponse
  UserRandomEmotion         = 258, // OG: CUser::OnRandomEmotion (CUserLocal dispatch, case 258)
  ResignQuestReturn         = 259, // OG: CUserLocal::OnResignQuestReturn
  PassMateName              = 260, // OG: CUserLocal::OnPassMateName
  RadioSchedule             = 261, // OG: CUserLocal::OnRadioSchedule
  OpenSkillGuide            = 262, // OG: CUserLocal::OnOpenSkillGuide
  NoticeMsg                 = 263, // OG: CUserLocal::OnNoticeMsg
  UserLocalChatMsg          = 264, // OG: CUserLocal::OnChatMsg (local echo)
  BuffzoneEffect            = 265, // OG: CUserLocal::OnBuffzoneEffect
  GoToCommoditySN           = 266, // OG: CUserLocal::OnGoToCommoditySN
  DamageMeterResult         = 267, // OG: CUserLocal::OnDamageMeter
  TimeBombAttack            = 268, // OG: CUserLocal::OnTimeBombAttack
  UserPassiveMove           = 269, // OG: CUser::OnPassiveMove (CUserLocal dispatch)
  FollowCharacterFailed     = 270, // OG: CUserLocal::OnFollowCharacterFailed
  VengeanceSkillApply       = 271, // OG: CUserLocal::OnVengeanceSkillApply
  ExJablinApply             = 272, // OG: CUserLocal::OnExJablinApply
  AskAPSPEvent              = 273, // OG: CUserLocal::OnAskAPSPEvent
  QuestGuideResult          = 274, // OG: CUserLocal::OnQuestGuideResult
  DeliveryQuest             = 275, // OG: CUserLocal::OnDeliveryQuest
  // OG: CUserLocal::OnSkillCooltimeSet (decompile/908b90.c) — int skillId,
  // short remainSec; remainSec==0 clears the cooldown instead of starting
  // one. SkillBook.ts already had dead startCooldown/clearCooldown
  // infrastructure with no caller — this is that caller.
  SkillCooltimeSet          = 276,

  // 278-283 — Summoned pool (CSummonedPool::OnPacketCSummonedPool — 6 cases)
  SummonedEnter             = 278,
  SummonedLeave             = 279,
  SummonedMove              = 280,
  SummonedAttack            = 281,
  SummonedSkill             = 282,
  SummonedHit               = 283,

  // 284-309 — Mob pool (CMobPool::OnMobPacket switch, 0x6570B0)
  MobEnterField             = 284,
  MobLeaveField             = 285,
  MobChangeController       = 286,
  MobMove                   = 287,
  MobCtrlAck                = 288,
  // OG: CMob::OnStatSet (decompile/652660.c, case 290) — 16-byte stat flag
  // bitmask (MobStat::s_nFlagBytes), then MobStat::DecodeTemporary for
  // each stat value shape.
  MobStatSet                = 290,
  MobStatReset              = 291,
  MobSuspendReset           = 292,
  MobAffected               = 293,
  MobDamaged                = 294,
  // OG: CMob::OnSpecialEffectBySkill (decompile/6540b0.c, case 295) — int
  // skillId, int casterCharId, short delay. Rest is CAnimationDisplayer-only.
  SpecialEffectBySkill      = 295,
  MobCrcKeyChanged          = 297, // pool-level, not in per-mob switch
  MobHPIndicator           = 298,
  MobCatchEffect            = 299, // OG: case 299 — CMob::OnCatchEffect
  MobEffectByItem           = 300, // OG: case 300 — CMob::OnEffectByItem
  MobSpeaking               = 301,
  MobIncChargeCount         = 302, // OG: case 302 — CMob::OnIncMobChargeCount
  MobSkillDelay             = 303,
  MobEscortFullPath         = 304, // OG: case 304 — CMob::OnEscortFullPath
  MobEscortStopPerm         = 305, // OG: case 305 — CMob::OnEscortStopEndPermmision (separate if, not in switch)
  MobEscortStopSay          = 306, // OG: case 306 — CMob::OnEscortStopSay
  MobEscortReturnBefore     = 307, // OG: case 307 — CMob::OnEscortReturnBefore
  MobNextAttack             = 308, // OG: case 308 — CMob::OnNextAttack
  MobAttackedByMob          = 309, // OG: case 309 — CMob::OnMobAttackedByMob

  // 311-317 — Npc pool. Read CNpcPool::OnPacket's real switch directly
  // (decompile/679770.c) instead of trusting the previous claim that 314
  // "is NOT a case in that switch" — it is: 314-316 route through
  // CNpcPool::OnNpcPacket (decompile/679260.c), which decodes a leading
  // int npcId before dispatching to CNpc::OnMove/OnUpdateLimitedInfo/
  // OnSetSpecialAction. NpcChangeController(313) is dispatched directly
  // from the outer switch (no leading npcId from a wrapper) and was
  // already correctly byte+int.
  NpcEnterField             = 311,
  NpcLeaveField             = 312,
  NpcChangeController       = 313,
  // OG: CNpc::OnMove (decompile/678060.c) — signed byte actionIdx (-1
  // means "chat trigger", >=0 selects a template action), signed byte
  // chatIdx (only meaningful when actionIdx==-1), then — only if the
  // NPC's template has bMove set — a full CMovePath move-path blob (same
  // decoder as Mob/User movement). This client has no per-NPC bMove
  // template flag exposed and no NPC animation/chat-bubble consumer yet,
  // so only the always-present actionIdx/chatIdx prefix is decoded; the
  // conditional move-path tail is deliberately left unread (relies on the
  // per-message try/catch convention used elsewhere in FieldHandlers).
  NpcMove                   = 314,
  NpcUpdateLimitedInfo      = 315,
  NpcSetSpecialAction       = 316,
  // OG: CNpcPool::OnNpcTemplatePacket (decompile/67d5b0.c, case 317) — int
  // npcId, byte bMove (presence of this flag determines whether NpcMove
  // includes the conditional CMovePath tail). Stores template in a local
  // map for other NPC packets to reference.
  NpcTemplatePacket         = 317,

  // 319-321 — Employee / Hired Merchant pool
  EmployeeEnterField        = 319,
  EmployeeLeaveField        = 320,
  EmployeeMiniRoomBalloon   = 321,

  // 322-324 — Drop pool
  DropEnterField            = 322,
  DropLeaveField            = 324,

  // 325-327 — CMessageBoxPool: the floating shop/trade-room marker shown
  // above a player with an open personal/entrusted shop or trade room.
  // TODO_AUDIT.md Eighty-first pass's `CMessageBoxPool` finding — re-decompiled
  // CMessageBoxPool::OnPacket directly (its 3-case switch on 325/326/327 IS
  // recoverable; the field-shape itself just isn't reachable via
  // CField::OnPacket's own switch, which only forwards to this class's
  // separate if-chain) while waterfalling through implementation. Shapes
  // confirmed via OnCreateFailed/OnMessageBoxEnterField/OnMessageBoxLeaveField:
  MessageBoxCreateFailed    = 325, // empty body — just shows a canned Notice.
  MessageBoxEnterField      = 326, // int4 id, int4 itemId, string hope, string characterName, int2 x, int2 y.
  MessageBoxLeaveField      = 327, // byte immediate, int4 id.

  // 328-333 — AffectedArea / TownPortal / OpenGate pools. Confirmed against
  // decompile/438330.c, decompile/7636B0.c, and decompile/68C8B0.c.
  AffectedAreaCreate        = 328,
  AffectedAreaRemove        = 329,
  TownPortalEnter           = 330,
  TownPortalLeave           = 331,
  OpenGateCreate            = 332,
  OpenGateRemove            = 333,

  // 334-337 — Reactor pool (order confirmed against decompiled CReactorPool::OnPacket)
  ReactorChangeState        = 334,
  ReactorMove               = 335,
  ReactorEnterField         = 336,
  ReactorLeaveField         = 337,

  // 338-345 — Snowball / Coconut / Contest
  SnowBallState             = 338,
  SnowBallHit               = 339,
  SnowBallMsg               = 340,
  SnowBallTouch             = 341,
  CoconutScore              = 342,
  CoconutHit                = 343,
  CoconutMsg                = 344,
  // Also shares CField::OnPacket's switch default-case target in the v95
  // IDA dump — the real dispatcher for it wasn't identified this pass.
  ContestResult             = 345, // unconfirmed — see comment above

  // 346-353 — Monster Carnival (CField_MonsterCarnival::OnPacket,
  // decompile/55bba0.c). Renamed from the previous guessed Start/ObtainCp/
  // Status/PartyResult/PersonalResult/TeamResult/ObtainTeamCp/RemovedTeam
  // names to match OG's actual per-opcode handler method names.
  MonsterCarnivalEnter      = 346, // OnEnter
  MonsterCarnivalPersonalCp = 347, // OnPersonalCP
  MonsterCarnivalTeamCp     = 348, // OnTeamCP
  MonsterCarnivalRequestResult = 349, // OnRequestResult(bResult=1)
  MonsterCarnivalRequestCanned = 350, // OnRequestResult(bResult=null)
  MonsterCarnivalProcessForDeath = 351, // OnProcessForDeath
  MonsterCarnivalMemberOut  = 352, // OnShowMemberOutMsg
  MonsterCarnivalGameResult = 353, // OnShowGameResult

  // 354 — Ariant Arena
  AriantArenaResult         = 354,

  // 359-362 — confirmed via the v95 IDA dump's CField::OnPacket switch
  // (0x546d7e): boss-event timer notifications, NOT a generic "field
  // effect" — CFieldEffect/2/3/4 was a wrong guess (FieldEffect=154 is the
  // real, already-implemented field-effect opcode; these 4 were dead
  // placeholders, never registered).
  HontaleTimer              = 359,
  ChaosZakumTimer           = 360,
  HontailTimer              = 361,
  ZakumTimer                = 362,

  // 363-368 — script / shop / admin shop / trunk
  ScriptMessage             = 363,
  OpenShopDlg               = 364,
  ShopResult                = 365,
  AdminShopDlg              = 366,
  AdminShopResult           = 367,
  TrunkResult               = 368,

  // 369-370 — StoreBank
  StoreBankResult           = 369,
  StoreBankAction           = 370,

  // 371-373 — RPS / Messenger / MiniRoom (371 was formerly misnamed FieldSet)
  RPSGameDlg                = 371,
  Messenger                 = 372,
  MiniRoom                  = 373,

  // 374-378 — Tournament (CField_Tournament::OnPacket decompile/563780.c).
  // 378 is an explicit no-op return in the OG dispatch. TODO_AUDIT.md Hundred-and-fifty-sixth pass.
  TournamentInfo            = 374,
  TournamentMatchTable      = 375,
  TournamentSetPrize        = 376,
  TournamentUEW             = 377,
  TournamentNop378          = 378, // OG: CField_Tournament::OnPacket case 378 — explicit return (dead case)

  // 379-381 — GuildBoss / Parcel
  GuildBossHealerMove       = 379,  // (note: actually 379 belongs to GuildBoss; named per dump)
  GuildBossPulleyState     = 380,
  ParcelDlg                 = 381,

  // 382-396 — Cash Shop (CCashShop::OnPacket — many sub-cases)
  // names below match decompiled CCashShop::OnPacket sub-handler names (values unchanged)
  CashShopChargeParamResult = 382,
  CashShopQueryCashResult   = 383,
  CashShopCashItemResult    = 384,
  CashShopPurchaseExpChanged = 385,
  CashShopGiftMateInfoResult = 386,
  CashShopCheckDuplicatedIDResult = 387,
  CashShopCheckNameChangePossibleResult = 388,
  CashShopCheckTransferWorldPossibleResult = 390,
  CashShopGachaponStampResult = 391,
  // 392 and 393 both dispatch to the same decompiled handler (OnCashItemGachaponResult)
  CashShopCashItemGachaponResultA = 392,
  CashShopCashItemGachaponResultB = 393,
  CashShopOneADay           = 395,
  CashShopNoticeFreeCashItem = 396,

  // 398-400 — FuncKey / PetConsume init
  FuncKeyMappedInit         = 398,
  PetConsumeItemInit        = 399,
  PetConsumeMPItemInit      = 400,

  // 405-409 — MapleTV (404, 408-409 also within this range but unused/unconfirmed)
  MapleTVSetMessage         = 405,
  MapleTVClearMessage       = 406,
  MapleTVSendMessageResult  = 407,

  // 410-412 — ITC
  ITCChargeParamResult      = 410,
  ITCQueryCashResult        = 411,
  ITCNormalItemResult       = 412,

  // 413-416 — CharacterSale (CField::OnCharacterSale forwards to
  // CUICharacterSaleDlg::OnPacket, decompile/778c50.c). That dispatcher only
  // has cases for 413/414 — 415/416 fall through and are confirmed dead on
  // the client (no handler anywhere in the dump), despite being in-range.
  // Renamed from the previous guessed CharacterSaleInfo/Result/Buy/Cancel
  // names, which didn't match OG's actual handler names.
  CharacterSaleCheckIdResult = 413,
  CharacterSaleCreateResult = 414,
  CharacterSaleUnused415    = 415,
  CharacterSaleUnused416    = 416,

  // 420-423 — BattleRecord (CBattleRecordMan::OnPacket)
  BattleRecordDotDamage     = 421,
  BattleRecordServerOnCalc  = 422,

  // 424-427 — ItemUpgrade (CField::OnItemUpgrade forwards to
  // CUIItemUpgrade::OnPacket, decompile/7c2e10.c). That dispatcher only
  // checks `nType == 425` — 424/426/427 are confirmed dead, exactly like
  // CharacterSale's 415/416. Renamed from the previous guessed Result/Log/
  // Innocent/GoldenHammer names (425 is the only one with any real
  // behavior — handled via CUIItemUpgrade::OnItemUpgradeResult).
  ItemUpgradeUnused424      = 424,
  ItemUpgradeResult         = 425,
  ItemUpgradeUnused426      = 426,
  ItemUpgradeUnused427      = 427,

  // 428-431 — Vega (CField::OnVega forwards to CUIVega::OnPacket,
  // decompile/7c0680.c). Confirmed via the v95 IDA dump's disassembly:
  // CUIVega::OnPacket's body is `cmp nType, 0x1AD(429); jnz return` — it
  // ONLY ever handles 429, calling it CUIVega::OnVegaResult. 428/430/431
  // are confirmed dead (CUIVega::OnPacket itself has no case for them at
  // all). The previous VegaResult=428/VegaProtect=429/VegaEnhance=430/
  // VegaSpell=431 spread was a wrong guess — moved the one real handler to
  // its correct value and value 428/430/431 are intentionally undeclared.
  VegaResult                = 429,
  VegaUnused428             = 428,
  VegaUnused430             = 430,
  VegaUnused431             = 431,

  // 432 — LogoutGift (CWvsContext::OnLogoutGift, decompile/9cccb0.c). Body
  // is a pure virtual dispatch (`jmp [vtable+0x34]`) into
  // TSingleton<CUILogoutGift>'s own OnPacket — no static target resolvable
  // from disassembly alone, same as FamilyChartResult. Decoded as opaque
  // raw bytes rather than guessed.
  LogoutGift                = 432,
}
