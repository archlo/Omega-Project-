// MapleStory v95 — opcode enums (client→server InHeader, server→client OutHeader).
//
// Values are pinned to the v95 reverse-engineering dump
// (C:\Users\jorge\OneDrive\Desktop\Maplestory95.exe_export_for_ai\generated\packet_handlers.json).
// Tests in tests/net/packet/OpCodes.spec.ts assert that every named entry still
// matches the dump — a "let me re-order this" PR can never accidentally
// change a wire value.
export var InHeader;
(function (InHeader) {
    // 0-9 — auth / login lifecycle
    InHeader[InHeader["CheckPassword"] = 1] = "CheckPassword";
    InHeader[InHeader["GuestIDLogin"] = 2] = "GuestIDLogin";
    InHeader[InHeader["AccountInfoRequest"] = 3] = "AccountInfoRequest";
    InHeader[InHeader["WorldInfoRequest"] = 4] = "WorldInfoRequest";
    InHeader[InHeader["SelectWorld"] = 5] = "SelectWorld";
    InHeader[InHeader["CheckUserLimit"] = 6] = "CheckUserLimit";
    InHeader[InHeader["ConfirmEULA"] = 7] = "ConfirmEULA";
    InHeader[InHeader["SetGender"] = 8] = "SetGender";
    InHeader[InHeader["CheckPinCode"] = 9] = "CheckPinCode";
    // 10-29 — world / char / select
    InHeader[InHeader["UpdatePinCode"] = 10] = "UpdatePinCode";
    InHeader[InHeader["WorldRequest"] = 11] = "WorldRequest";
    InHeader[InHeader["LogoutWorld"] = 12] = "LogoutWorld";
    InHeader[InHeader["ViewAllChar"] = 13] = "ViewAllChar";
    InHeader[InHeader["SelectCharacterByVAC"] = 14] = "SelectCharacterByVAC";
    InHeader[InHeader["VACFlagSet"] = 15] = "VACFlagSet";
    InHeader[InHeader["CheckNameChangePossible"] = 16] = "CheckNameChangePossible";
    InHeader[InHeader["RegisterNewCharacter"] = 17] = "RegisterNewCharacter";
    InHeader[InHeader["CheckTransferWorldPossible"] = 18] = "CheckTransferWorldPossible";
    InHeader[InHeader["SelectCharacter"] = 19] = "SelectCharacter";
    InHeader[InHeader["MigrateIn"] = 20] = "MigrateIn";
    InHeader[InHeader["CheckDuplicatedID"] = 21] = "CheckDuplicatedID";
    InHeader[InHeader["CreateNewCharacter"] = 22] = "CreateNewCharacter";
    InHeader[InHeader["CreateNewCharacterInCS"] = 23] = "CreateNewCharacterInCS";
    InHeader[InHeader["DeleteCharacter"] = 24] = "DeleteCharacter";
    InHeader[InHeader["AliveAck"] = 25] = "AliveAck";
    InHeader[InHeader["ExceptionLog"] = 26] = "ExceptionLog";
    InHeader[InHeader["SecurityPacket"] = 27] = "SecurityPacket";
    InHeader[InHeader["EnableSPWRequest"] = 28] = "EnableSPWRequest";
    InHeader[InHeader["CheckSPWRequest"] = 29] = "CheckSPWRequest";
    InHeader[InHeader["EnableSPWRequestByVAC"] = 30] = "EnableSPWRequestByVAC";
    InHeader[InHeader["CheckSPWRequestByVAC"] = 31] = "CheckSPWRequestByVAC";
    InHeader[InHeader["CheckOTPRequest"] = 32] = "CheckOTPRequest";
    InHeader[InHeader["CheckDeleteCharacterOTP"] = 33] = "CheckDeleteCharacterOTP";
    InHeader[InHeader["CreateSecurityHandle"] = 34] = "CreateSecurityHandle";
    InHeader[InHeader["SSOErrorLog"] = 35] = "SSOErrorLog";
    InHeader[InHeader["ClientDumpLog"] = 36] = "ClientDumpLog";
    InHeader[InHeader["CheckExtraCharInfo"] = 37] = "CheckExtraCharInfo";
    InHeader[InHeader["CreateNewCharacter_Ex"] = 38] = "CreateNewCharacter_Ex";
    // 41-52 — field system (movement, combat, hits)
    InHeader[InHeader["UserTransferFieldRequest"] = 41] = "UserTransferFieldRequest";
    InHeader[InHeader["UserTransferChannelRequest"] = 42] = "UserTransferChannelRequest";
    InHeader[InHeader["UserMigrateToCashShopRequest"] = 43] = "UserMigrateToCashShopRequest";
    InHeader[InHeader["UserMove"] = 44] = "UserMove";
    InHeader[InHeader["UserSitRequest"] = 45] = "UserSitRequest";
    InHeader[InHeader["UserPortableChairSitRequest"] = 46] = "UserPortableChairSitRequest";
    InHeader[InHeader["UserMeleeAttack"] = 47] = "UserMeleeAttack";
    InHeader[InHeader["UserShootAttack"] = 48] = "UserShootAttack";
    InHeader[InHeader["UserMagicAttack"] = 49] = "UserMagicAttack";
    InHeader[InHeader["UserBodyAttack"] = 50] = "UserBodyAttack";
    InHeader[InHeader["UserMovingShootAttackPrepare"] = 51] = "UserMovingShootAttackPrepare";
    InHeader[InHeader["UserHit"] = 52] = "UserHit";
    // 54-78 — chat / shop / inventory / skill
    InHeader[InHeader["UserChat"] = 54] = "UserChat";
    InHeader[InHeader["UserEmotion"] = 56] = "UserEmotion";
    // OG: CWvsContext::SendActiveEffectItemChange (IDA 0x9F9420) —
    // opcode 57, int(nItemID). Toggles a cosmetic effect item.
    InHeader[InHeader["UserActiveEffectItemChange"] = 57] = "UserActiveEffectItemChange";
    InHeader[InHeader["UserHP"] = 59] = "UserHP";
    InHeader[InHeader["UserSelectNpc"] = 63] = "UserSelectNpc";
    InHeader[InHeader["UserScriptMessageAnswer"] = 65] = "UserScriptMessageAnswer";
    InHeader[InHeader["UserShopRequest"] = 66] = "UserShopRequest";
    InHeader[InHeader["UserTrunkRequest"] = 67] = "UserTrunkRequest";
    InHeader[InHeader["UserEntrustedShopRequest"] = 68] = "UserEntrustedShopRequest";
    // OG: CUserLocal::SendSkillEffectRequest (live IDA decompile,
    // Maplestory95.exe.i64 0x93aeb0) — int skillId, byte slv, byte bSendLocal.
    // Confirmed callers: OnKeyDownSkillEnd (key-up on a hold/charge skill),
    // TryDoingRepeatSkill, TryDoingRocketBoosterEnd, and one site inside
    // DoActiveSkill — all charge/repeat-style skills re-syncing the visual
    // effect's end/continuation, not a generic "every skill use" send. Not
    // wired to a sender yet — this client doesn't model hold-to-charge input.
    InHeader[InHeader["UserSkillEffectRequest"] = 71] = "UserSkillEffectRequest";
    // OG: CStoreBankDlg::SendGetAllRequest (decompile/7449f0.c) — only known
    // sub-action is the "get all" fee confirmation, opcode 69 + byte 0x1B.
    InHeader[InHeader["UserStoreBankRequest"] = 69] = "UserStoreBankRequest";
    // OG: CAdminShopDlg::OnPacket (decompile/4310f0.c) sends opcode 74 with a
    // leading sub-action byte: 0 = reopen-after-result(npcTemplateId), 2 = initial
    // request when no dialog instance exists yet. Both share this one opcode.
    InHeader[InHeader["UserAdminShopRequest"] = 74] = "UserAdminShopRequest";
    InHeader[InHeader["UserGatherItemRequest"] = 75] = "UserGatherItemRequest";
    InHeader[InHeader["UserSortItemRequest"] = 76] = "UserSortItemRequest";
    InHeader[InHeader["UserChangeSlotPositionRequest"] = 77] = "UserChangeSlotPositionRequest";
    InHeader[InHeader["UserStatChangeItemUseRequest"] = 78] = "UserStatChangeItemUseRequest";
    // OG: CWvsContext::SendStatChangeItemCancelRequest (v95 IDA dump,
    // func_encode_seq: int(4), send_op=0x4f)
    InHeader[InHeader["UserStatChangeItemCancelRequest"] = 79] = "UserStatChangeItemCancelRequest";
    // OG: CWvsContext::SendMobSummonItemUseRequest (IDA 0x9DE580) —
    // opcode 81, int(updateTime), short(nPOS), int(nItemID).
    InHeader[InHeader["UserMobSummonItemUseRequest"] = 81] = "UserMobSummonItemUseRequest";
    // OG: CWvsContext::SendPetFoodItemUseRequest (IDA 0x9D9F20) —
    // opcode 82, int(updateTime), short(nPOS), int(nItemID).
    InHeader[InHeader["UserPetFoodItemUseRequest"] = 82] = "UserPetFoodItemUseRequest";
    // OG: CWvsContext::SendTamingMobFoodItemUseRequest (IDA 0x9D63A0) —
    // opcode 83, int(updateTime), short(nPOS), int(nItemID).
    InHeader[InHeader["UserTamingMobFoodItemUseRequest"] = 83] = "UserTamingMobFoodItemUseRequest";
    // OG: CWvsContext::SendScriptRunItemRequest (IDA 0x9DE7A0) —
    // opcode 84, int(updateTime), short(nPOS), int(nItemID).
    InHeader[InHeader["UserScriptRunItemUseRequest"] = 84] = "UserScriptRunItemUseRequest";
    // OG: opcode 85 (0x55) is a generic "consume cash item" sender shared by
    // several unrelated dialogs — confirmed via the v95 IDA dump's
    // func_encode_seq table for CWvsContext::SendConsumeCashItemUseRequest,
    // CUICharacterSaleDlg::SendCreateNewCharacter, CItemSpeakerDlg and
    // CUIKarmaDlg's own `_SendConsumeCashItemUseRequest` (all send_op=0x55).
    // Kept as two names for the two call sites this client actually builds.
    InHeader[InHeader["UserCharacterSaleCreate"] = 85] = "UserCharacterSaleCreate";
    InHeader[InHeader["UserConsumeCashItemUseRequest"] = 85] = "UserConsumeCashItemUseRequest";
    // OG: CWvsContext::SendBridleItemUseRequest (IDA 0x9E08C0) —
    // opcode 87, int(updateTime), short(nPOS), int(nItemID).
    InHeader[InHeader["UserBridleItemUseRequest"] = 87] = "UserBridleItemUseRequest";
    // OG: CP_UserItemReleaseRequest (0x61 = 97) — CWvsContext::SendItemReleaseRequest(nUPOS, nEPOS)
    InHeader[InHeader["UserItemReleaseRequest"] = 97] = "UserItemReleaseRequest";
    // OG: CWvsContext::SendSelectNpcItemUseRequest (IDA 0x9DA430) —
    // opcode 123, short(nPOS), int(nItemID).
    InHeader[InHeader["UserSelectNpcItemUseRequest"] = 123] = "UserSelectNpcItemUseRequest";
    // OG: CWvsContext::SendLotteryItemUseRequest (IDA 0x9D6C50) —
    // opcode 124, short(nPos), int(nItemID).
    InHeader[InHeader["UserLotteryItemUseRequest"] = 124] = "UserLotteryItemUseRequest";
    // OG: CWvsContext::SendSkillLearnItemUseRequest/SendSkillResetItemUseRequest
    // (decompile/9d65e0.c, 9de8c0.c) — using a skill book/mastery book or a
    // skill-reset scroll goes through these dedicated opcodes, NOT the
    // generic UserStatChangeItemUseRequest used for potions/buff items.
    InHeader[InHeader["SkillLearnItemUseRequest"] = 88] = "SkillLearnItemUseRequest";
    InHeader[InHeader["SkillResetItemUseRequest"] = 89] = "SkillResetItemUseRequest";
    // OG: CWvsContext::SendShopScannerItemUseRequest (IDA 0x9E10E0) —
    // opcode 90, short(nPOS), int(nItemID).
    InHeader[InHeader["UserShopScannerItemUseRequest"] = 90] = "UserShopScannerItemUseRequest";
    // OG: CWvsContext::SendMapTransferItemUseRequest (IDA 0x9E6020) —
    // opcode 91, short(nPOS), int(nItemID).
    InHeader[InHeader["UserMapTransferItemUseRequest"] = 91] = "UserMapTransferItemUseRequest";
    // 92-119 — portals / stats / skills / quests
    InHeader[InHeader["UserPortalScrollUseRequest"] = 92] = "UserPortalScrollUseRequest";
    InHeader[InHeader["UserAbilityUpRequest"] = 98] = "UserAbilityUpRequest";
    InHeader[InHeader["UserAbilityMassUpRequest"] = 99] = "UserAbilityMassUpRequest";
    // OG: CWvsContext::SendStatChangeRequest/SendStatChangeRequestByItemOption
    // (v95 IDA dump func_encode_seq, send_op=0x64/0x65) — AP-allocation-style
    // stat change requests, distinct from the item-driven ones at 78/79.
    InHeader[InHeader["UserStatChangeRequest"] = 100] = "UserStatChangeRequest";
    InHeader[InHeader["UserStatChangeRequestByItemOption"] = 101] = "UserStatChangeRequestByItemOption";
    InHeader[InHeader["UserSkillUpRequest"] = 102] = "UserSkillUpRequest";
    InHeader[InHeader["UserSkillUseRequest"] = 103] = "UserSkillUseRequest";
    InHeader[InHeader["UserSkillCancelRequest"] = 104] = "UserSkillCancelRequest";
    InHeader[InHeader["UserSkillPrepareRequest"] = 105] = "UserSkillPrepareRequest";
    InHeader[InHeader["UserDropMoneyRequest"] = 106] = "UserDropMoneyRequest";
    InHeader[InHeader["UserCharacterInfoRequest"] = 109] = "UserCharacterInfoRequest";
    InHeader[InHeader["UserPortalScriptRequest"] = 112] = "UserPortalScriptRequest";
    InHeader[InHeader["UserPortalTeleportRequest"] = 113] = "UserPortalTeleportRequest";
    InHeader[InHeader["UserMapTransferRequest"] = 114] = "UserMapTransferRequest";
    // anti-macro challenge response (CWvsContext::SendAntiMacroItemUseRequest)
    InHeader[InHeader["SendAntiMacroItemUseRequest"] = 115] = "SendAntiMacroItemUseRequest";
    // CUIAntiMacro::SetRet (decompile/78c940.c) — the real captcha-answer
    // submit packet (TODO_AUDIT.md "Resolved against the v95 decompile"
    // section, waterfall implementation pass). Single EncodeStr of the typed
    // answer; only sent when the player clicked OK (nRet==1), never on
    // cancel/timeout.
    InHeader[InHeader["AntiMacroAnswerRequest"] = 117] = "AntiMacroAnswerRequest";
    InHeader[InHeader["ClaimRequest"] = 118] = "ClaimRequest";
    InHeader[InHeader["UserQuestRequest"] = 119] = "UserQuestRequest";
    // skill-macro save-to-server (CMacroSysMan::FlushToSvr)
    InHeader[InHeader["SkillMacroFlushToSvr"] = 122] = "SkillMacroFlushToSvr";
    // OG: CWvsContext::SendUseBoxGachaponItemRequest /
    // SendUseGachaponRemoteRequest (v95 IDA dump, send_op=0x7f/0x80).
    InHeader[InHeader["UserUseBoxGachaponItemRequest"] = 127] = "UserUseBoxGachaponItemRequest";
    InHeader[InHeader["UserUseGachaponRemoteRequest"] = 128] = "UserUseGachaponRemoteRequest";
    // OG: CWvsContext::OnMarriageRequest (decompile/a00bb0.c) — the
    // requestType===0 branch builds and sends this directly inline (not a
    // separate Send* method) right after showing the local YesNo dialog:
    // byte(2), byte(accepted), string(requesterName), int(partnerId).
    InHeader[InHeader["MarriageRequestResponse"] = 161] = "MarriageRequestResponse";
    // OG: CWishListGiveDlg::SendPutItemRequest (decompile/9a7140.c, sub 6) /
    // CWishListRecvDlg::SendGetItemRequest (decompile/9aba50.c, sub 7)
    InHeader[InHeader["UserWeddingWishListRequest"] = 162] = "UserWeddingWishListRequest";
    // OG: CUIMiniMap::OnMouseButton sends opcode 166 (0xA6) with no payload
    // when the player clicks their own dot on the minimap. Server-side:
    // CField::OnPacketCField routes it; kinoko-main treats it as a position
    // sync / idle acknowledgement.
    InHeader[InHeader["UserMiniMapClick"] = 166] = "UserMiniMapClick";
    // OG: CRepairDurabilityDlg::SendRepairDurabilityAll/SendRepairDurability
    // (decompile/6d37b0.c, 6d3980.c, both reached from OnButtonClicked at
    // decompile/6d3a20.c). RepairDurabilityAll has no payload;
    // RepairDurability sends the selected item's nPOS (slot) as Encode4.
    InHeader[InHeader["RepairDurabilityAll"] = 130] = "RepairDurabilityAll";
    InHeader[InHeader["RepairDurability"] = 131] = "RepairDurability";
    // 140-159 — social / messenger / miniroom / party / guild / friend
    InHeader[InHeader["GroupMessage"] = 140] = "GroupMessage";
    InHeader[InHeader["Whisper"] = 141] = "Whisper";
    InHeader[InHeader["Messenger"] = 143] = "Messenger";
    InHeader[InHeader["MiniRoom"] = 144] = "MiniRoom";
    InHeader[InHeader["PartyRequest"] = 145] = "PartyRequest";
    // OG: ExpeditionIntermediary uses opcode 147 (0x93) for ALL outbound
    // expedition requests (create, invite, response, withdraw, kick,
    // change-master, change-boss, relocate-party). Sub-action byte first.
    InHeader[InHeader["ExpeditionRequest"] = 147] = "ExpeditionRequest";
    // OG: TabPartyAdver uses opcode 148 (0x94) for all outbound party search
    // / advertisement requests. Sub-action byte first (0x51=RegistCommit,
    // 0x53=AdverRequest, 0x56=ApplyResponse).
    InHeader[InHeader["PartyAdverRequest"] = 148] = "PartyAdverRequest";
    InHeader[InHeader["GuildRequest"] = 149] = "GuildRequest";
    InHeader[InHeader["FriendRequest"] = 153] = "FriendRequest";
    InHeader[InHeader["FuncKeyMappedModified"] = 159] = "FuncKeyMappedModified";
    // 167 — Alliance request (CTabGuildAlliance::OnWithdraw/OnInvite/OnKick/
    // OnChangeMaster/OnGradeChange/OnSetNotice — all use COutPacket(0xA7=167),
    // confirmed via IDA decompile in TODO_AUDIT.md Hundred-and-twenty-sixth pass).
    InHeader[InHeader["AllianceRequest"] = 167] = "AllianceRequest";
    // 169-177 — Family system requests (CWvsContext::SendFamilyXxx,
    // decompile/a09860.c, a09d20.c, a09c50.c, a0b0a0.c)
    InHeader[InHeader["UserFamilyChartRequest"] = 169] = "UserFamilyChartRequest";
    InHeader[InHeader["UserFamilyInfoRequest"] = 170] = "UserFamilyInfoRequest";
    InHeader[InHeader["UserFamilyInviteResult"] = 174] = "UserFamilyInviteResult";
    // OG: CWvsContext::SendUseFamilyPrivilege (decompile, 0x7b... call site
    // inside CUIFamily::OnButtonClicked's case 0x7D4u). Body is index-only for
    // most privilege types; types <= SP_Summon also prompt for a target name
    // and append it via EncodeStr — that sub-case isn't ported (SP_ enum
    // values aren't recoverable from disassembly without guessing), so this
    // client only sends the plain index, which covers the non-target privileges.
    InHeader[InHeader["UserUseFamilyPrivilege"] = 175] = "UserUseFamilyPrivilege";
    // OG: CWvsContext::SendSetFamilyPrecept.
    InHeader[InHeader["UserSetFamilyPrecept"] = 176] = "UserSetFamilyPrecept";
    InHeader[InHeader["UserFamilySummonResponse"] = 177] = "UserFamilySummonResponse";
    // 179 — Guild BBS requests (CUIGuildBBS::SendLoadListRequest/
    // SendViewEntryRequest/OnRegister/OnComment/OnCommentDelete/OnDelete,
    // decompile/7c3680.c, 7c3710.c, 7c4250.c, 7c4530.c, 7c3b70.c, 7c6520.c)
    InHeader[InHeader["UserGuildBBSRequest"] = 179] = "UserGuildBBSRequest";
    // OG: CWvsContext::SendExpUpItemUseRequest (IDA 0x9DB1C0) —
    // opcode 181, int(updateTime), short(nPOS), int(nItemID).
    InHeader[InHeader["UserExpUpItemUseRequest"] = 181] = "UserExpUpItemUseRequest";
    // OG: CWvsContext::SendDragonBallBoxRequest (IDA 0x9D73D0) —
    // opcode 196, no payload.
    InHeader[InHeader["UserDragonBallBoxRequest"] = 196] = "UserDragonBallBoxRequest";
    // 197-205 — Pet C→S opcodes (CPet::DoAction / ParseCommand / SendDropPickUpRequest / SendUpdateExceptionListRequest)
    InHeader[InHeader["UserPetAction"] = 200] = "UserPetAction";
    InHeader[InHeader["UserPetInteractionRequest"] = 201] = "UserPetInteractionRequest";
    InHeader[InHeader["UserPetDropPickUpRequest"] = 202] = "UserPetDropPickUpRequest";
    InHeader[InHeader["UserPetUpdateExceptionList"] = 204] = "UserPetUpdateExceptionList";
    // 216 — quickslot server-side ack (server→client of FuncKeyMappedInit=398)
    InHeader[InHeader["QuickslotKeyMappedModified"] = 216] = "QuickslotKeyMappedModified";
    // 227-246 — mob ack / npc / drop pickup
    // NOTE: the C++ MobMove=227 is the client→server ack for the server→client
    // OutHeader.MobMove=287. Don't confuse it with the receiving opcode.
    InHeader[InHeader["MobMove"] = 227] = "MobMove";
    InHeader[InHeader["MobApplyCtrl"] = 228] = "MobApplyCtrl";
    InHeader[InHeader["NpcMove"] = 241] = "NpcMove";
    InHeader[InHeader["DropPickUpRequest"] = 246] = "DropPickUpRequest";
    // OG: CUIRaiseWnd::SendPutItem / CUIRaisePieceWnd::SendPutItem (v95 IDA
    // dump, send_op=0x11d/0x11e) — pet-evolution "Raise" minigame.
    InHeader[InHeader["UserRaiseWndPutItem"] = 285] = "UserRaiseWndPutItem";
    InHeader[InHeader["UserRaisePieceWndPutItem"] = 286] = "UserRaisePieceWndPutItem";
    // OG: CUIFindFriend::SendMyInfoRequest/SendSearchRequest (v95 IDA dump) —
    // both share opcode 0xc2(194), distinguished by the sub-action byte
    // (confirmed via disassembly: Encode1(0) vs Encode1(1)).
    InHeader[InHeader["UserFindFriendRequest"] = 194] = "UserFindFriendRequest";
    // 275 — Cash Shop request (CCashShop::SendGiftsPacket, decompile/487b60.c).
    // Only sub-action 4 (Gift) is confirmed here; the rest of CCashShop's
    // outgoing request sub-actions are a separate, larger, already-tracked
    // gap (see CashShopHandlers.ts's CashItemResult 54-way sub-dispatch debt)
    // and intentionally not guessed at here.
    InHeader[InHeader["UserCashShopRequest"] = 275] = "UserCashShopRequest";
    // OG: CUICharacterSaleDlg::SendCheckDuplicateIDPacket (decompile/777d20.c)
    InHeader[InHeader["UserCharacterSaleCheckId"] = 311] = "UserCharacterSaleCheckId";
    // OG: CWvsContext::SendWaterOfLife (0x9f28e0) — push 81h (129).
    // No payload. Triggers the Water of Life revive flow.
    InHeader[InHeader["UserWaterOfLife"] = 129] = "UserWaterOfLife";
    // OG: CWvsContext::SendUnregisterParent (0xa098d0) — push 0ADh (173).
    // No payload. Unregisters the current parent in the Family system.
    InHeader[InHeader["UserFamilyUnregisterParent"] = 173] = "UserFamilyUnregisterParent";
    // OG: CWvsContext::SendCancelPartyWanted (0xa0ffd0) — push 10Bh (267).
    // No payload. Cancels the party recruitment advertisement.
    InHeader[InHeader["UserCancelPartyWanted"] = 267] = "UserCancelPartyWanted";
    // OG: CWvsContext::SendGivePopularityRequest (0x9f67e0) — int(4) byte(1).
    // Target character name + inc/dec flag. Opcode TBD from MCP decompilation.
    InHeader[InHeader["UserGivePopularityRequest"] = 99] = "UserGivePopularityRequest";
    // OG: CWvsContext::SendTempExpUseRequest (0x9db430) — int(4).
    // Uses accumulated temporary EXP. Opcode TBD from MCP decompilation.
    InHeader[InHeader["UserTempExpUseRequest"] = 130] = "UserTempExpUseRequest";
    // OG: CWvsContext::SendUIOpenItemRequest (0x9d64d0) — int(4) short(2) int(4).
    // Uses a UI-opening item. Opcode TBD from MCP decompilation.
    InHeader[InHeader["UserUIOpenItemRequest"] = 131] = "UserUIOpenItemRequest";
    // OG: CWvsContext::SendRemoteShopOpenRequest (0x9f30d0) — short(2).
    // Opens a hired merchant remotely. Opcode TBD from MCP decompilation.
    InHeader[InHeader["UserRemoteShopOpenRequest"] = 132] = "UserRemoteShopOpenRequest";
    // OG: CWvsContext::SendBoobyTrapAlert (0xa09680) — int(4).
    // Notifies server about booby trap pickup. Opcode TBD from MCP decompilation.
    InHeader[InHeader["UserBoobyTrapAlert"] = 133] = "UserBoobyTrapAlert";
    // OG: CWvsContext::SendPartyWanted (0xa10100) — int(4)*4.
    // Party recruitment: minLv, maxLv, count, jobFlag. Opcode TBD.
    InHeader[InHeader["UserPartyWanted"] = 134] = "UserPartyWanted";
    // OG: CWvsContext::SendRegisterJunior (0xa09dd0) — string.
    // Registers a junior in the Family system. Opcode TBD.
    InHeader[InHeader["UserFamilyRegisterJunior"] = 174] = "UserFamilyRegisterJunior";
    // OG: CWvsContext::SendUnregisterJunior (0xa099e0) — int(4).
    // Unregisters a junior by character ID. Opcode TBD.
    InHeader[InHeader["UserFamilyUnregisterJunior"] = 175] = "UserFamilyUnregisterJunior";
    // OG: CWvsContext::SendRingDropRequest (0x9d6810) — byte(1) int(4).
    // Drops a ring item. Opcode TBD.
    InHeader[InHeader["UserRingDropRequest"] = 135] = "UserRingDropRequest";
    // OG: CWvsContext::SendInvitationQuery (0x9da630) — byte(1) int(4) int(4).
    // Queries an invitation. Opcode TBD.
    InHeader[InHeader["UserInvitationQuery"] = 136] = "UserInvitationQuery";
    // OG: CWvsContext::SendNewYearCardUseRequest (0x9da380) — short(2) int(4).
    // Uses a New Year card item. Opcode TBD.
    InHeader[InHeader["UserNewYearCardUseRequest"] = 137] = "UserNewYearCardUseRequest";
    // OG: CWvsContext::SendRandomMorphOtherRequest (0x9cced0) — short(2) int(4).
    // Uses a random morph item on another player. Opcode TBD.
    InHeader[InHeader["UserRandomMorphOtherRequest"] = 138] = "UserRandomMorphOtherRequest";
    // OG: CWvsContext::SendFollowCharacterRequest (0x9f9530) — int(4) byte(1) byte(1).
    // Follows another character. Opcode TBD.
    InHeader[InHeader["UserFollowCharacterRequest"] = 139] = "UserFollowCharacterRequest";
    // OG: CWvsContext::SendRequestSessionValue (0x9e1a90) — string byte(1).
    // Requests a session value. Opcode TBD.
    InHeader[InHeader["UserSessionValueRequest"] = 140] = "UserSessionValueRequest";
})(InHeader || (InHeader = {}));
export var OutHeader;
(function (OutHeader) {
    // 0-27 — auth / login lifecycle (server→client)
    OutHeader[OutHeader["CheckPasswordResult"] = 0] = "CheckPasswordResult";
    OutHeader[OutHeader["GuestIDLoginResult"] = 1] = "GuestIDLoginResult";
    OutHeader[OutHeader["AccountInfoResult"] = 2] = "AccountInfoResult";
    OutHeader[OutHeader["CheckUserLimitResult"] = 3] = "CheckUserLimitResult";
    OutHeader[OutHeader["SetAccountResult"] = 4] = "SetAccountResult";
    OutHeader[OutHeader["ConfirmEULAResult"] = 5] = "ConfirmEULAResult";
    OutHeader[OutHeader["CheckPinCodeResult"] = 6] = "CheckPinCodeResult";
    OutHeader[OutHeader["UpdatePinCodeResult"] = 7] = "UpdatePinCodeResult";
    OutHeader[OutHeader["ViewAllCharResult"] = 8] = "ViewAllCharResult";
    OutHeader[OutHeader["SelectCharacterByVACResult"] = 9] = "SelectCharacterByVACResult";
    OutHeader[OutHeader["WorldInformation"] = 10] = "WorldInformation";
    OutHeader[OutHeader["SelectWorldResult"] = 11] = "SelectWorldResult";
    OutHeader[OutHeader["SelectCharacterResult"] = 12] = "SelectCharacterResult";
    OutHeader[OutHeader["CheckDuplicatedIDResult"] = 13] = "CheckDuplicatedIDResult";
    OutHeader[OutHeader["CreateNewCharacterResult"] = 14] = "CreateNewCharacterResult";
    OutHeader[OutHeader["DeleteCharacterResult"] = 15] = "DeleteCharacterResult";
    OutHeader[OutHeader["MigrateCommand"] = 16] = "MigrateCommand";
    OutHeader[OutHeader["AliveReq"] = 17] = "AliveReq";
    // AuthenCodeChanged confirmed real but NOT dispatched via CLogin::
    // OnPacket — it's CClientSocket::OnAuthenCodeChanged (decompile/4afe50.c
    // / v95 IDA dump), reached through a separate socket-level path. Per the
    // CLogin::OnPacket switch ground truth (v95 IDA dump switch_entries for
    // 0x5df94d), values 16-20 and 22-23 all share the SAME default-case
    // target (0x5dfaa4) — i.e. CLogin::OnPacket itself never special-cases
    // SecurityPacket(20) or DeleteCharacterOTPRequest(22) at all, and no
    // alternate dispatcher for them was found either. Confirmed dead.
    OutHeader[OutHeader["AuthenCodeChanged"] = 18] = "AuthenCodeChanged";
    OutHeader[OutHeader["AuthenMessage"] = 19] = "AuthenMessage";
    OutHeader[OutHeader["SecurityPacket"] = 20] = "SecurityPacket";
    OutHeader[OutHeader["EnableSPWResult"] = 21] = "EnableSPWResult";
    OutHeader[OutHeader["DeleteCharacterOTPRequest"] = 22] = "DeleteCharacterOTPRequest";
    OutHeader[OutHeader["CheckCrcResult"] = 23] = "CheckCrcResult";
    OutHeader[OutHeader["LatestConnectedWorld"] = 24] = "LatestConnectedWorld";
    OutHeader[OutHeader["RecommendWorldMessage"] = 25] = "RecommendWorldMessage";
    OutHeader[OutHeader["CheckExtraCharInfoResult"] = 26] = "CheckExtraCharInfoResult";
    OutHeader[OutHeader["CheckSPWResult"] = 27] = "CheckSPWResult";
    // 28-46 — CWvsContext (inventory, stats, skill, anti-macro, claim, etc.)
    OutHeader[OutHeader["InventoryOperation"] = 28] = "InventoryOperation";
    OutHeader[OutHeader["StatChanged"] = 30] = "StatChanged";
    OutHeader[OutHeader["TemporaryStatSet"] = 31] = "TemporaryStatSet";
    OutHeader[OutHeader["TemporaryStatReset"] = 32] = "TemporaryStatReset";
    OutHeader[OutHeader["ChangeSkillRecordResult"] = 35] = "ChangeSkillRecordResult";
    OutHeader[OutHeader["SkillUseResult"] = 36] = "SkillUseResult";
    // OG: CWvsContext::OnGivePopularityResult (decompile/9FEA60.c, opcode 37) —
    // byte subResult: 0=given(charName,accepted,fame), 1-4=notice only, 5=given
    // (charName,accepted). Sub-result determines the notice text.
    OutHeader[OutHeader["GivePopularityResult"] = 37] = "GivePopularityResult";
    OutHeader[OutHeader["Message"] = 38] = "Message";
    OutHeader[OutHeader["AntiMacroResult"] = 42] = "AntiMacroResult";
    OutHeader[OutHeader["ClaimResult"] = 44] = "ClaimResult";
    OutHeader[OutHeader["SetClaimSvrAvailableTime"] = 45] = "SetClaimSvrAvailableTime";
    OutHeader[OutHeader["ClaimSvrStatusChanged"] = 46] = "ClaimSvrStatusChanged";
    // 49 — EntrustedShop / Hired Merchant check result
    OutHeader[OutHeader["EntrustedShopCheckResult"] = 49] = "EntrustedShopCheckResult";
    // 50-51 — skill book / skill reset item results (CWvsContext::OnPacket
    // switch, decompile/9e5830.c case 50/51 -> decompile/9f7af0.c, 9f60b0.c).
    OutHeader[OutHeader["SkillLearnItemResult"] = 50] = "SkillLearnItemResult";
    OutHeader[OutHeader["SkillResetItemResult"] = 51] = "SkillResetItemResult";
    // 59 — Guild BBS (CWvsContext::OnGuildBBSPacket, decompile/9ccf20.c,
    // forwards to CUIGuildBBS::OnGuildBBSPacket, decompile/7c8260.c)
    OutHeader[OutHeader["GuildBBSPacket"] = 59] = "GuildBBSPacket";
    // 61-68 — party / expedition / friend / guild / alliance results
    OutHeader[OutHeader["CharacterInfo"] = 61] = "CharacterInfo";
    OutHeader[OutHeader["PartyResult"] = 62] = "PartyResult";
    // OG: CWvsContext::OnExpedtionResult dispatches after decoding 1 byte
    // (sub-action) to ExpeditionIntermediary::OnPacket. Sub-action char codes:
    // '9'/'='/';'=Get, ':'/'A'/'C'/'D'=Removed, '<'/'@'/'B'=Notice, 'E'=MasterChanged,
    // 'F'=Modified, 'H'=Invite, 'I'=ResponseInvite.
    OutHeader[OutHeader["ExpeditionResult"] = 64] = "ExpeditionResult";
    OutHeader[OutHeader["FriendResult"] = 65] = "FriendResult";
    OutHeader[OutHeader["GuildResult"] = 67] = "GuildResult";
    // TODO_AUDIT.md Hundred-and-twenty-third pass: confirmed against
    // CWvsContext::OnPacket jump table (0xa0fb78, entry 5 → 0xa0f172);
    // cases confirmed via byte_A0FBB8 lookup: 12=clear, 13=member update, 16=full load.
    OutHeader[OutHeader["AllianceResult"] = 68] = "AllianceResult";
    // 71 — broadcast message
    OutHeader[OutHeader["BroadcastMsg"] = 71] = "BroadcastMsg";
    // 75-78 — Marriage/Wedding (CWvsContext::OnPacket, decompile/9e5830.c).
    // 75/76 (MarriageRequest/MarriageResult, defined further below in this
    // enum) and 77 (WeddingGiftResult) are implemented; their decode shapes
    // were fixed in a later pass (see AUDIT_OG_V95.md's marriage pass) —
    // this comment was stale, written before that fix landed. 78
    // (NotifyMarriedPartnerMapTransfer) is also implemented below.
    OutHeader[OutHeader["WeddingGiftResult"] = 77] = "WeddingGiftResult";
    // 98-108 — Family system (CWvsContext::OnPacket, decompile/9e5830.c).
    // FamilyChartResult's body (CUIFamilyChart::DecodeLocalChart) has no
    // decompiled implementation anywhere in the dump — left fully opaque.
    OutHeader[OutHeader["FamilyChartResult"] = 98] = "FamilyChartResult";
    OutHeader[OutHeader["FamilyInfoResult"] = 99] = "FamilyInfoResult";
    OutHeader[OutHeader["FamilyResult"] = 100] = "FamilyResult";
    OutHeader[OutHeader["FamilyJoinRequest"] = 101] = "FamilyJoinRequest";
    OutHeader[OutHeader["FamilyJoinRequestResult"] = 102] = "FamilyJoinRequestResult";
    OutHeader[OutHeader["FamilyJoinAccepted"] = 103] = "FamilyJoinAccepted";
    OutHeader[OutHeader["FamilyPrivilegeList"] = 104] = "FamilyPrivilegeList";
    OutHeader[OutHeader["FamilyFamousPointIncResult"] = 105] = "FamilyFamousPointIncResult";
    OutHeader[OutHeader["FamilyNotifyLoginOrLogout"] = 106] = "FamilyNotifyLoginOrLogout";
    OutHeader[OutHeader["FamilySetPrivilege"] = 107] = "FamilySetPrivilege";
    OutHeader[OutHeader["FamilySummonRequest"] = 108] = "FamilySummonRequest";
    // Confirmed via the v95 IDA dump's switch_entries/func_disasm tables for
    // CWvsContext::OnPacket's jump table at 0x9e5840 (ground truth — literal
    // case values resolved to their call targets, not guessed from decompile
    // reading). Field shapes are from the same dump's func_decode_seq table;
    // field names are best-effort from the OG method name where the dump
    // doesn't expose argument names, and are noted as such per-interface in
    // PacketArgs.ts.
    OutHeader[OutHeader["InventoryGrow"] = 29] = "InventoryGrow";
    OutHeader[OutHeader["SetTamingMobInfo"] = 47] = "SetTamingMobInfo";
    OutHeader[OutHeader["QuestClear"] = 48] = "QuestClear";
    OutHeader[OutHeader["GatherItemResult"] = 52] = "GatherItemResult";
    OutHeader[OutHeader["SortItemResult"] = 53] = "SortItemResult";
    OutHeader[OutHeader["SueCharacterResult"] = 55] = "SueCharacterResult";
    OutHeader[OutHeader["TradeMoneyLimit"] = 57] = "TradeMoneyLimit";
    OutHeader[OutHeader["SetGender"] = 58] = "SetGender";
    OutHeader[OutHeader["TownPortalNotify"] = 69] = "TownPortalNotify";
    OutHeader[OutHeader["OpenGateNotify"] = 70] = "OpenGateNotify";
    OutHeader[OutHeader["MarriageRequest"] = 75] = "MarriageRequest";
    OutHeader[OutHeader["MarriageResult"] = 76] = "MarriageResult";
    OutHeader[OutHeader["NotifyMarriedPartnerMapTransfer"] = 78] = "NotifyMarriedPartnerMapTransfer";
    OutHeader[OutHeader["CashPetFoodResult"] = 79] = "CashPetFoodResult";
    OutHeader[OutHeader["SetWeekEventMessage"] = 80] = "SetWeekEventMessage";
    OutHeader[OutHeader["SetPotionDiscountRate"] = 81] = "SetPotionDiscountRate";
    OutHeader[OutHeader["MonsterBookSetCard"] = 86] = "MonsterBookSetCard";
    OutHeader[OutHeader["MonsterBookSetCover"] = 87] = "MonsterBookSetCover";
    OutHeader[OutHeader["HourChanged"] = 88] = "HourChanged";
    OutHeader[OutHeader["MiniMapOnOff"] = 89] = "MiniMapOnOff";
    OutHeader[OutHeader["ConsultAuthkeyUpdate"] = 90] = "ConsultAuthkeyUpdate";
    OutHeader[OutHeader["ClassCompetitionAuthkeyUpdate"] = 91] = "ClassCompetitionAuthkeyUpdate";
    OutHeader[OutHeader["WebBoardAuthkeyUpdate"] = 92] = "WebBoardAuthkeyUpdate";
    OutHeader[OutHeader["SessionValue"] = 93] = "SessionValue";
    OutHeader[OutHeader["PartyValue"] = 94] = "PartyValue";
    OutHeader[OutHeader["FieldSetVariable"] = 95] = "FieldSetVariable";
    OutHeader[OutHeader["BonusExpRateChanged"] = 96] = "BonusExpRateChanged";
    OutHeader[OutHeader["PotionDiscountRateChanged"] = 97] = "PotionDiscountRateChanged";
    OutHeader[OutHeader["NotifyLevelUp"] = 109] = "NotifyLevelUp";
    OutHeader[OutHeader["NotifyWedding"] = 110] = "NotifyWedding";
    OutHeader[OutHeader["NotifyJobChange"] = 111] = "NotifyJobChange";
    OutHeader[OutHeader["MapleTVUseRes"] = 113] = "MapleTVUseRes";
    OutHeader[OutHeader["AvatarMegaphoneRes"] = 114] = "AvatarMegaphoneRes";
    OutHeader[OutHeader["SuccessInUsegachaponBox"] = 121] = "SuccessInUsegachaponBox";
    OutHeader[OutHeader["SetBuyEquipExt"] = 125] = "SetBuyEquipExt";
    OutHeader[OutHeader["SetPassengerRequest"] = 126] = "SetPassengerRequest";
    OutHeader[OutHeader["ScriptProgressMessage"] = 127] = "ScriptProgressMessage";
    OutHeader[OutHeader["DataCRCCheckFailed"] = 128] = "DataCRCCheckFailed";
    OutHeader[OutHeader["UpdateGMBoard"] = 130] = "UpdateGMBoard";
    OutHeader[OutHeader["ShowSlotMessage"] = 131] = "ShowSlotMessage";
    OutHeader[OutHeader["AccountMoreInfo"] = 133] = "AccountMoreInfo";
    OutHeader[OutHeader["FindFriend"] = 134] = "FindFriend";
    OutHeader[OutHeader["TransferChannelNotify"] = 138] = "TransferChannelNotify";
    // Second batch from the same v95 IDA dump audit — gated via CWvsContext::OnPacket.
    // All non-empty handler bodies have been decompiled from the .i64 directly;
    // wire shapes are extracted from the pseudocode at the referenced address.
    OutHeader[OutHeader["ForcedStatSet"] = 33] = "ForcedStatSet";
    OutHeader[OutHeader["ForcedStatReset"] = 34] = "ForcedStatReset";
    OutHeader[OutHeader["OpenFullClientDownloadLink"] = 39] = "OpenFullClientDownloadLink";
    OutHeader[OutHeader["MemoResult"] = 40] = "MemoResult";
    OutHeader[OutHeader["MapTransferResult"] = 41] = "MapTransferResult";
    OutHeader[OutHeader["IncubatorResult"] = 72] = "IncubatorResult";
    OutHeader[OutHeader["ShopScannerResult"] = 73] = "ShopScannerResult";
    OutHeader[OutHeader["ShopLinkResult"] = 74] = "ShopLinkResult";
    OutHeader[OutHeader["BridleMobCatchFail"] = 82] = "BridleMobCatchFail";
    OutHeader[OutHeader["ImitatedNPCResult"] = 83] = "ImitatedNPCResult";
    OutHeader[OutHeader["ImitatedNPCData"] = 84] = "ImitatedNPCData";
    OutHeader[OutHeader["LimitedNPCDisableInfo"] = 85] = "LimitedNPCDisableInfo";
    OutHeader[OutHeader["SetAvatarMegaphone"] = 115] = "SetAvatarMegaphone";
    OutHeader[OutHeader["ClearAvatarMegaphone"] = 116] = "ClearAvatarMegaphone";
    OutHeader[OutHeader["CancelNameChangeResult"] = 117] = "CancelNameChangeResult";
    OutHeader[OutHeader["CancelTransferWorldResult"] = 118] = "CancelTransferWorldResult";
    OutHeader[OutHeader["DestroyShopResult"] = 119] = "DestroyShopResult";
    OutHeader[OutHeader["FakeGMNotice"] = 120] = "FakeGMNotice";
    OutHeader[OutHeader["NewYearCardRes"] = 122] = "NewYearCardRes";
    OutHeader[OutHeader["RandomMorphRes"] = 123] = "RandomMorphRes";
    OutHeader[OutHeader["CancelNameChangebyOther"] = 124] = "CancelNameChangebyOther";
    OutHeader[OutHeader["CakePieEventResult"] = 129] = "CakePieEventResult";
    OutHeader[OutHeader["WildHunterInfo"] = 132] = "WildHunterInfo";
    OutHeader[OutHeader["AskWhetherUsePamsSong"] = 137] = "AskWhetherUsePamsSong";
    OutHeader[OutHeader["StageChange"] = 135] = "StageChange";
    OutHeader[OutHeader["DragonBallBox"] = 136] = "DragonBallBox";
    OutHeader[OutHeader["DisallowedDeliveryQuestList"] = 139] = "DisallowedDeliveryQuestList";
    // 140-151 — macro sync, stage / group / whisper transitions
    OutHeader[OutHeader["MacroSysDataInit"] = 140] = "MacroSysDataInit";
    OutHeader[OutHeader["SetField"] = 141] = "SetField";
    OutHeader[OutHeader["SetITC"] = 142] = "SetITC";
    OutHeader[OutHeader["SetCashShop"] = 143] = "SetCashShop";
    OutHeader[OutHeader["GroupMessage"] = 150] = "GroupMessage";
    OutHeader[OutHeader["Whisper"] = 151] = "Whisper";
    // 163-176 — clock / func-key / foot-hold (Clock = 163 defined below with full 147-177 block)
    OutHeader[OutHeader["QuickslotMappedInit"] = 175] = "QuickslotMappedInit";
    OutHeader[OutHeader["FootHoldInfo"] = 176] = "FootHoldInfo";
    // 179-186 — user enter/leave/chat/miniroom-balloon
    OutHeader[OutHeader["UserEnterField"] = 179] = "UserEnterField";
    OutHeader[OutHeader["UserLeaveField"] = 180] = "UserLeaveField";
    OutHeader[OutHeader["UserChat"] = 181] = "UserChat";
    OutHeader[OutHeader["UserMiniRoomBalloon"] = 184] = "UserMiniRoomBalloon";
    // 147-177 — CField general packet subtypes (CField::OnPacket switch, 0x546d50)
    OutHeader[OutHeader["TransferFieldReqIgnored"] = 147] = "TransferFieldReqIgnored";
    OutHeader[OutHeader["TransferChannelReqIgnored"] = 148] = "TransferChannelReqIgnored";
    OutHeader[OutHeader["FieldSpecificData"] = 149] = "FieldSpecificData";
    OutHeader[OutHeader["CoupleMessage"] = 152] = "CoupleMessage";
    OutHeader[OutHeader["SummonItemInavailable"] = 153] = "SummonItemInavailable";
    OutHeader[OutHeader["FieldEffect"] = 154] = "FieldEffect";
    OutHeader[OutHeader["FieldObstacleOnOff"] = 155] = "FieldObstacleOnOff";
    OutHeader[OutHeader["FieldObstacleOnOffStatus"] = 156] = "FieldObstacleOnOffStatus";
    OutHeader[OutHeader["FieldObstacleAllReset"] = 157] = "FieldObstacleAllReset";
    OutHeader[OutHeader["BlowWeather"] = 158] = "BlowWeather";
    OutHeader[OutHeader["PlayJukeBox"] = 159] = "PlayJukeBox";
    OutHeader[OutHeader["AdminResult"] = 160] = "AdminResult";
    OutHeader[OutHeader["Quiz"] = 161] = "Quiz";
    OutHeader[OutHeader["Desc"] = 162] = "Desc";
    OutHeader[OutHeader["Clock"] = 163] = "Clock";
    OutHeader[OutHeader["DestroyClock"] = 170] = "DestroyClock";
    OutHeader[OutHeader["SetQuestClear"] = 166] = "SetQuestClear";
    OutHeader[OutHeader["SetQuestTime"] = 167] = "SetQuestTime";
    OutHeader[OutHeader["WarnMessage"] = 168] = "WarnMessage";
    OutHeader[OutHeader["SetObjectState"] = 169] = "SetObjectState";
    OutHeader[OutHeader["StalkResult"] = 172] = "StalkResult";
    // OG: CField_Massacre::OnPacket (decompile, 0x556460) — only intercepted
    // by the fieldType-23 field subclass. TODO_AUDIT.md Seventy-eighth
    // pass's `CField_Massacre` finding, WZ-confirmed present (351 maps with
    // info/fieldType===23, e.g. 926023401.img).
    OutHeader[OutHeader["MassacreIncGauge"] = 173] = "MassacreIncGauge";
    // OG: CField_MassacreResult::OnPacket (decompile, 0x55a1d0) — fieldType
    // 24 sibling field.
    OutHeader[OutHeader["MassacreResult"] = 174] = "MassacreResult";
    OutHeader[OutHeader["RequestFootHoldInfo"] = 177] = "RequestFootHoldInfo";
    // OG: CField_KillCount::OnPacket (decompile, 0x554050) — only intercepted
    // by the fieldType-34 field subclass (e.g. kill-count-gated event maps,
    // TODO_AUDIT.md Eighty-third pass's `CField_KillCount` finding,
    // WZ-confirmed present: 10 maps with info/fieldType===34), every other
    // type forwards to the generic `CField::OnPacket`.
    OutHeader[OutHeader["KillCountInfo"] = 178] = "KillCountInfo";
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
    OutHeader[OutHeader["PetActivated"] = 198] = "PetActivated";
    OutHeader[OutHeader["PetEvol"] = 199] = "PetEvol";
    OutHeader[OutHeader["PetActivatedSilent"] = 200] = "PetActivatedSilent";
    OutHeader[OutHeader["PetMove"] = 201] = "PetMove";
    OutHeader[OutHeader["PetAction"] = 202] = "PetAction";
    OutHeader[OutHeader["PetNameChange"] = 203] = "PetNameChange";
    OutHeader[OutHeader["PetLoadExceptionList"] = 204] = "PetLoadExceptionList";
    OutHeader[OutHeader["PetActionCommand"] = 205] = "PetActionCommand";
    OutHeader[OutHeader["DragonMove"] = 206] = "DragonMove";
    OutHeader[OutHeader["DragonAfterMove"] = 207] = "DragonAfterMove";
    OutHeader[OutHeader["DragonAction"] = 208] = "DragonAction";
    // 182-197 — CUserPool::OnUserCommonPacket (0x94CDB0, remaining gaps).
    // 181/184 already defined above (UserChat/UserMiniRoomBalloon).
    OutHeader[OutHeader["UserChatHistory"] = 182] = "UserChatHistory";
    OutHeader[OutHeader["UserADBoard"] = 183] = "UserADBoard";
    OutHeader[OutHeader["SetConsumeItemEffect"] = 185] = "SetConsumeItemEffect";
    OutHeader[OutHeader["ShowItemUpgradeEffect"] = 186] = "ShowItemUpgradeEffect";
    OutHeader[OutHeader["ShowItemHyperUpgradeEffect"] = 187] = "ShowItemHyperUpgradeEffect";
    OutHeader[OutHeader["ShowItemOptionUpgradeEffect"] = 188] = "ShowItemOptionUpgradeEffect";
    OutHeader[OutHeader["ShowItemReleaseEffect"] = 189] = "ShowItemReleaseEffect";
    OutHeader[OutHeader["ShowItemUnreleaseEffect"] = 190] = "ShowItemUnreleaseEffect";
    OutHeader[OutHeader["UserHitByUser"] = 191] = "UserHitByUser";
    OutHeader[OutHeader["UserTeslaTriangle"] = 192] = "UserTeslaTriangle";
    OutHeader[OutHeader["UserFollowCharacter"] = 193] = "UserFollowCharacter";
    OutHeader[OutHeader["UserShowPQReward"] = 194] = "UserShowPQReward";
    OutHeader[OutHeader["UserSetPhase"] = 195] = "UserSetPhase";
    // 196 — CField::OnPacket case 196 (decompile/546D50.c) is an explicit no-op (return;). TODO_AUDIT.md Hundred-and-fifty-sixth pass: confirmed dead case.
    OutHeader[OutHeader["FieldNop196"] = 196] = "FieldNop196";
    OutHeader[OutHeader["ShowRecoverUpgradeCountEffect"] = 197] = "ShowRecoverUpgradeCountEffect";
    // 210-233 — CUserPool::OnUserRemotePacket (0x94B390), remaining gaps.
    // 210-215, 217, 219, 222-224, 232-233 already defined below.
    OutHeader[OutHeader["UserMove"] = 210] = "UserMove";
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
    OutHeader[OutHeader["MeleeAttack"] = 211] = "MeleeAttack";
    OutHeader[OutHeader["ShootAttack"] = 212] = "ShootAttack";
    OutHeader[OutHeader["MagicAttack"] = 213] = "MagicAttack";
    OutHeader[OutHeader["BodyAttack"] = 214] = "BodyAttack";
    OutHeader[OutHeader["SkillPrepare"] = 215] = "SkillPrepare";
    OutHeader[OutHeader["UserMovingShootAttackPrepare"] = 216] = "UserMovingShootAttackPrepare";
    OutHeader[OutHeader["SkillCancel"] = 217] = "SkillCancel";
    OutHeader[OutHeader["UserHit"] = 218] = "UserHit";
    OutHeader[OutHeader["UserEmotion"] = 219] = "UserEmotion";
    OutHeader[OutHeader["UserSetActiveEffectItem"] = 220] = "UserSetActiveEffectItem";
    OutHeader[OutHeader["UserShowUpgradeTombEffect"] = 221] = "UserShowUpgradeTombEffect";
    OutHeader[OutHeader["UserSetActivePortableChair"] = 222] = "UserSetActivePortableChair";
    OutHeader[OutHeader["UserAvatarModified"] = 223] = "UserAvatarModified";
    OutHeader[OutHeader["UserEffectRemote"] = 224] = "UserEffectRemote";
    OutHeader[OutHeader["UserSetTemporaryStat"] = 225] = "UserSetTemporaryStat";
    OutHeader[OutHeader["UserResetTemporaryStat"] = 226] = "UserResetTemporaryStat";
    OutHeader[OutHeader["UserReceiveHP"] = 227] = "UserReceiveHP";
    OutHeader[OutHeader["UserGuildNameChanged"] = 228] = "UserGuildNameChanged";
    OutHeader[OutHeader["UserGuildMarkChanged"] = 229] = "UserGuildMarkChanged";
    OutHeader[OutHeader["UserThrowGrenade"] = 230] = "UserThrowGrenade";
    // 231-275 — CUserLocal::OnPacket switch (decompile/9340C0.c). All confirmed
    // from the complete switch table. Stub-registered to close opcode-parity gap;
    // TODO_AUDIT.md Hundred-and-fifty-sixth pass.
    OutHeader[OutHeader["SitResult"] = 231] = "SitResult";
    OutHeader[OutHeader["UserEmotionLocal"] = 232] = "UserEmotionLocal";
    OutHeader[OutHeader["UserEffectLocal"] = 233] = "UserEffectLocal";
    OutHeader[OutHeader["UserTeleport"] = 234] = "UserTeleport";
    OutHeader[OutHeader["MesoGiveSucceeded"] = 236] = "MesoGiveSucceeded";
    OutHeader[OutHeader["MesoGiveFailed"] = 237] = "MesoGiveFailed";
    OutHeader[OutHeader["RandomMesobagSucceeded"] = 238] = "RandomMesobagSucceeded";
    OutHeader[OutHeader["RandomMesobagFailed"] = 239] = "RandomMesobagFailed";
    OutHeader[OutHeader["FieldFadeInOut"] = 240] = "FieldFadeInOut";
    OutHeader[OutHeader["FieldFadeOutForce"] = 241] = "FieldFadeOutForce";
    OutHeader[OutHeader["QuestResult"] = 242] = "QuestResult";
    OutHeader[OutHeader["NotifyHPDecByField"] = 243] = "NotifyHPDecByField";
    OutHeader[OutHeader["BalloonMsg"] = 245] = "BalloonMsg";
    OutHeader[OutHeader["PlayEventSound"] = 246] = "PlayEventSound";
    OutHeader[OutHeader["PlayMinigameSound"] = 247] = "PlayMinigameSound";
    OutHeader[OutHeader["MakerResult"] = 248] = "MakerResult";
    OutHeader[OutHeader["OpenClassCompetitionPage"] = 250] = "OpenClassCompetitionPage";
    OutHeader[OutHeader["OpenUI"] = 251] = "OpenUI";
    OutHeader[OutHeader["OpenUIWithOption"] = 252] = "OpenUIWithOption";
    OutHeader[OutHeader["SetDirectionMode"] = 253] = "SetDirectionMode";
    OutHeader[OutHeader["SetStandAloneMode"] = 254] = "SetStandAloneMode";
    OutHeader[OutHeader["HireTutor"] = 255] = "HireTutor";
    OutHeader[OutHeader["TutorMsg"] = 256] = "TutorMsg";
    OutHeader[OutHeader["IncComboResponse"] = 257] = "IncComboResponse";
    OutHeader[OutHeader["UserRandomEmotion"] = 258] = "UserRandomEmotion";
    OutHeader[OutHeader["ResignQuestReturn"] = 259] = "ResignQuestReturn";
    OutHeader[OutHeader["PassMateName"] = 260] = "PassMateName";
    OutHeader[OutHeader["RadioSchedule"] = 261] = "RadioSchedule";
    OutHeader[OutHeader["OpenSkillGuide"] = 262] = "OpenSkillGuide";
    OutHeader[OutHeader["NoticeMsg"] = 263] = "NoticeMsg";
    OutHeader[OutHeader["UserLocalChatMsg"] = 264] = "UserLocalChatMsg";
    OutHeader[OutHeader["BuffzoneEffect"] = 265] = "BuffzoneEffect";
    OutHeader[OutHeader["GoToCommoditySN"] = 266] = "GoToCommoditySN";
    OutHeader[OutHeader["DamageMeterResult"] = 267] = "DamageMeterResult";
    OutHeader[OutHeader["TimeBombAttack"] = 268] = "TimeBombAttack";
    OutHeader[OutHeader["UserPassiveMove"] = 269] = "UserPassiveMove";
    OutHeader[OutHeader["FollowCharacterFailed"] = 270] = "FollowCharacterFailed";
    OutHeader[OutHeader["VengeanceSkillApply"] = 271] = "VengeanceSkillApply";
    OutHeader[OutHeader["ExJablinApply"] = 272] = "ExJablinApply";
    OutHeader[OutHeader["AskAPSPEvent"] = 273] = "AskAPSPEvent";
    OutHeader[OutHeader["QuestGuideResult"] = 274] = "QuestGuideResult";
    OutHeader[OutHeader["DeliveryQuest"] = 275] = "DeliveryQuest";
    // OG: CUserLocal::OnSkillCooltimeSet (decompile/908b90.c) — int skillId,
    // short remainSec; remainSec==0 clears the cooldown instead of starting
    // one. SkillBook.ts already had dead startCooldown/clearCooldown
    // infrastructure with no caller — this is that caller.
    OutHeader[OutHeader["SkillCooltimeSet"] = 276] = "SkillCooltimeSet";
    // 278-283 — Summoned pool (CSummonedPool::OnPacketCSummonedPool — 6 cases)
    OutHeader[OutHeader["SummonedEnter"] = 278] = "SummonedEnter";
    OutHeader[OutHeader["SummonedLeave"] = 279] = "SummonedLeave";
    OutHeader[OutHeader["SummonedMove"] = 280] = "SummonedMove";
    OutHeader[OutHeader["SummonedAttack"] = 281] = "SummonedAttack";
    OutHeader[OutHeader["SummonedSkill"] = 282] = "SummonedSkill";
    OutHeader[OutHeader["SummonedHit"] = 283] = "SummonedHit";
    // 284-309 — Mob pool (CMobPool::OnMobPacket switch, 0x6570B0)
    OutHeader[OutHeader["MobEnterField"] = 284] = "MobEnterField";
    OutHeader[OutHeader["MobLeaveField"] = 285] = "MobLeaveField";
    OutHeader[OutHeader["MobChangeController"] = 286] = "MobChangeController";
    OutHeader[OutHeader["MobMove"] = 287] = "MobMove";
    OutHeader[OutHeader["MobCtrlAck"] = 288] = "MobCtrlAck";
    // OG: CMob::OnStatSet (decompile/652660.c, case 290) — 16-byte stat flag
    // bitmask (MobStat::s_nFlagBytes), then MobStat::DecodeTemporary for
    // each stat value shape.
    OutHeader[OutHeader["MobStatSet"] = 290] = "MobStatSet";
    OutHeader[OutHeader["MobStatReset"] = 291] = "MobStatReset";
    OutHeader[OutHeader["MobSuspendReset"] = 292] = "MobSuspendReset";
    OutHeader[OutHeader["MobAffected"] = 293] = "MobAffected";
    OutHeader[OutHeader["MobDamaged"] = 294] = "MobDamaged";
    // OG: CMob::OnSpecialEffectBySkill (decompile/6540b0.c, case 295) — int
    // skillId, int casterCharId, short delay. Rest is CAnimationDisplayer-only.
    OutHeader[OutHeader["SpecialEffectBySkill"] = 295] = "SpecialEffectBySkill";
    OutHeader[OutHeader["MobCrcKeyChanged"] = 297] = "MobCrcKeyChanged";
    OutHeader[OutHeader["MobHPIndicator"] = 298] = "MobHPIndicator";
    OutHeader[OutHeader["MobCatchEffect"] = 299] = "MobCatchEffect";
    OutHeader[OutHeader["MobEffectByItem"] = 300] = "MobEffectByItem";
    OutHeader[OutHeader["MobSpeaking"] = 301] = "MobSpeaking";
    OutHeader[OutHeader["MobIncChargeCount"] = 302] = "MobIncChargeCount";
    OutHeader[OutHeader["MobSkillDelay"] = 303] = "MobSkillDelay";
    OutHeader[OutHeader["MobEscortFullPath"] = 304] = "MobEscortFullPath";
    OutHeader[OutHeader["MobEscortStopPerm"] = 305] = "MobEscortStopPerm";
    OutHeader[OutHeader["MobEscortStopSay"] = 306] = "MobEscortStopSay";
    OutHeader[OutHeader["MobEscortReturnBefore"] = 307] = "MobEscortReturnBefore";
    OutHeader[OutHeader["MobNextAttack"] = 308] = "MobNextAttack";
    OutHeader[OutHeader["MobAttackedByMob"] = 309] = "MobAttackedByMob";
    // 311-317 — Npc pool. Read CNpcPool::OnPacket's real switch directly
    // (decompile/679770.c) instead of trusting the previous claim that 314
    // "is NOT a case in that switch" — it is: 314-316 route through
    // CNpcPool::OnNpcPacket (decompile/679260.c), which decodes a leading
    // int npcId before dispatching to CNpc::OnMove/OnUpdateLimitedInfo/
    // OnSetSpecialAction. NpcChangeController(313) is dispatched directly
    // from the outer switch (no leading npcId from a wrapper) and was
    // already correctly byte+int.
    OutHeader[OutHeader["NpcEnterField"] = 311] = "NpcEnterField";
    OutHeader[OutHeader["NpcLeaveField"] = 312] = "NpcLeaveField";
    OutHeader[OutHeader["NpcChangeController"] = 313] = "NpcChangeController";
    // OG: CNpc::OnMove (decompile/678060.c) — signed byte actionIdx (-1
    // means "chat trigger", >=0 selects a template action), signed byte
    // chatIdx (only meaningful when actionIdx==-1), then — only if the
    // NPC's template has bMove set — a full CMovePath move-path blob (same
    // decoder as Mob/User movement). This client has no per-NPC bMove
    // template flag exposed and no NPC animation/chat-bubble consumer yet,
    // so only the always-present actionIdx/chatIdx prefix is decoded; the
    // conditional move-path tail is deliberately left unread (relies on the
    // per-message try/catch convention used elsewhere in FieldHandlers).
    OutHeader[OutHeader["NpcMove"] = 314] = "NpcMove";
    OutHeader[OutHeader["NpcUpdateLimitedInfo"] = 315] = "NpcUpdateLimitedInfo";
    OutHeader[OutHeader["NpcSetSpecialAction"] = 316] = "NpcSetSpecialAction";
    // OG: CNpcPool::OnNpcTemplatePacket (decompile/67d5b0.c, case 317) — int
    // npcId, byte bMove (presence of this flag determines whether NpcMove
    // includes the conditional CMovePath tail). Stores template in a local
    // map for other NPC packets to reference.
    OutHeader[OutHeader["NpcTemplatePacket"] = 317] = "NpcTemplatePacket";
    // 319-321 — Employee / Hired Merchant pool
    OutHeader[OutHeader["EmployeeEnterField"] = 319] = "EmployeeEnterField";
    OutHeader[OutHeader["EmployeeLeaveField"] = 320] = "EmployeeLeaveField";
    OutHeader[OutHeader["EmployeeMiniRoomBalloon"] = 321] = "EmployeeMiniRoomBalloon";
    // 322-324 — Drop pool
    OutHeader[OutHeader["DropEnterField"] = 322] = "DropEnterField";
    OutHeader[OutHeader["DropLeaveField"] = 324] = "DropLeaveField";
    // 325-327 — CMessageBoxPool: the floating shop/trade-room marker shown
    // above a player with an open personal/entrusted shop or trade room.
    // TODO_AUDIT.md Eighty-first pass's `CMessageBoxPool` finding — re-decompiled
    // CMessageBoxPool::OnPacket directly (its 3-case switch on 325/326/327 IS
    // recoverable; the field-shape itself just isn't reachable via
    // CField::OnPacket's own switch, which only forwards to this class's
    // separate if-chain) while waterfalling through implementation. Shapes
    // confirmed via OnCreateFailed/OnMessageBoxEnterField/OnMessageBoxLeaveField:
    OutHeader[OutHeader["MessageBoxCreateFailed"] = 325] = "MessageBoxCreateFailed";
    OutHeader[OutHeader["MessageBoxEnterField"] = 326] = "MessageBoxEnterField";
    OutHeader[OutHeader["MessageBoxLeaveField"] = 327] = "MessageBoxLeaveField";
    // 328-333 — AffectedArea / TownPortal / OpenGate pools. Confirmed against
    // decompile/438330.c, decompile/7636B0.c, and decompile/68C8B0.c.
    OutHeader[OutHeader["AffectedAreaCreate"] = 328] = "AffectedAreaCreate";
    OutHeader[OutHeader["AffectedAreaRemove"] = 329] = "AffectedAreaRemove";
    OutHeader[OutHeader["TownPortalEnter"] = 330] = "TownPortalEnter";
    OutHeader[OutHeader["TownPortalLeave"] = 331] = "TownPortalLeave";
    OutHeader[OutHeader["OpenGateCreate"] = 332] = "OpenGateCreate";
    OutHeader[OutHeader["OpenGateRemove"] = 333] = "OpenGateRemove";
    // 334-337 — Reactor pool (order confirmed against decompiled CReactorPool::OnPacket)
    OutHeader[OutHeader["ReactorChangeState"] = 334] = "ReactorChangeState";
    OutHeader[OutHeader["ReactorMove"] = 335] = "ReactorMove";
    OutHeader[OutHeader["ReactorEnterField"] = 336] = "ReactorEnterField";
    OutHeader[OutHeader["ReactorLeaveField"] = 337] = "ReactorLeaveField";
    // 338-345 — Snowball / Coconut / Contest
    OutHeader[OutHeader["SnowBallState"] = 338] = "SnowBallState";
    OutHeader[OutHeader["SnowBallHit"] = 339] = "SnowBallHit";
    OutHeader[OutHeader["SnowBallMsg"] = 340] = "SnowBallMsg";
    OutHeader[OutHeader["SnowBallTouch"] = 341] = "SnowBallTouch";
    OutHeader[OutHeader["CoconutScore"] = 342] = "CoconutScore";
    OutHeader[OutHeader["CoconutHit"] = 343] = "CoconutHit";
    OutHeader[OutHeader["CoconutMsg"] = 344] = "CoconutMsg";
    // Also shares CField::OnPacket's switch default-case target in the v95
    // IDA dump — the real dispatcher for it wasn't identified this pass.
    OutHeader[OutHeader["ContestResult"] = 345] = "ContestResult";
    // 346-353 — Monster Carnival (CField_MonsterCarnival::OnPacket,
    // decompile/55bba0.c). Renamed from the previous guessed Start/ObtainCp/
    // Status/PartyResult/PersonalResult/TeamResult/ObtainTeamCp/RemovedTeam
    // names to match OG's actual per-opcode handler method names.
    OutHeader[OutHeader["MonsterCarnivalEnter"] = 346] = "MonsterCarnivalEnter";
    OutHeader[OutHeader["MonsterCarnivalPersonalCp"] = 347] = "MonsterCarnivalPersonalCp";
    OutHeader[OutHeader["MonsterCarnivalTeamCp"] = 348] = "MonsterCarnivalTeamCp";
    OutHeader[OutHeader["MonsterCarnivalRequestResult"] = 349] = "MonsterCarnivalRequestResult";
    OutHeader[OutHeader["MonsterCarnivalRequestCanned"] = 350] = "MonsterCarnivalRequestCanned";
    OutHeader[OutHeader["MonsterCarnivalProcessForDeath"] = 351] = "MonsterCarnivalProcessForDeath";
    OutHeader[OutHeader["MonsterCarnivalMemberOut"] = 352] = "MonsterCarnivalMemberOut";
    OutHeader[OutHeader["MonsterCarnivalGameResult"] = 353] = "MonsterCarnivalGameResult";
    // 354 — Ariant Arena
    OutHeader[OutHeader["AriantArenaResult"] = 354] = "AriantArenaResult";
    // 359-362 — confirmed via the v95 IDA dump's CField::OnPacket switch
    // (0x546d7e): boss-event timer notifications, NOT a generic "field
    // effect" — CFieldEffect/2/3/4 was a wrong guess (FieldEffect=154 is the
    // real, already-implemented field-effect opcode; these 4 were dead
    // placeholders, never registered).
    OutHeader[OutHeader["HontaleTimer"] = 359] = "HontaleTimer";
    OutHeader[OutHeader["ChaosZakumTimer"] = 360] = "ChaosZakumTimer";
    OutHeader[OutHeader["HontailTimer"] = 361] = "HontailTimer";
    OutHeader[OutHeader["ZakumTimer"] = 362] = "ZakumTimer";
    // 363-368 — script / shop / admin shop / trunk
    OutHeader[OutHeader["ScriptMessage"] = 363] = "ScriptMessage";
    OutHeader[OutHeader["OpenShopDlg"] = 364] = "OpenShopDlg";
    OutHeader[OutHeader["ShopResult"] = 365] = "ShopResult";
    OutHeader[OutHeader["AdminShopDlg"] = 366] = "AdminShopDlg";
    OutHeader[OutHeader["AdminShopResult"] = 367] = "AdminShopResult";
    OutHeader[OutHeader["TrunkResult"] = 368] = "TrunkResult";
    // 369-370 — StoreBank
    OutHeader[OutHeader["StoreBankResult"] = 369] = "StoreBankResult";
    OutHeader[OutHeader["StoreBankAction"] = 370] = "StoreBankAction";
    // 371-373 — RPS / Messenger / MiniRoom (371 was formerly misnamed FieldSet)
    OutHeader[OutHeader["RPSGameDlg"] = 371] = "RPSGameDlg";
    OutHeader[OutHeader["Messenger"] = 372] = "Messenger";
    OutHeader[OutHeader["MiniRoom"] = 373] = "MiniRoom";
    // 374-378 — Tournament (CField_Tournament::OnPacket decompile/563780.c).
    // 378 is an explicit no-op return in the OG dispatch. TODO_AUDIT.md Hundred-and-fifty-sixth pass.
    OutHeader[OutHeader["TournamentInfo"] = 374] = "TournamentInfo";
    OutHeader[OutHeader["TournamentMatchTable"] = 375] = "TournamentMatchTable";
    OutHeader[OutHeader["TournamentSetPrize"] = 376] = "TournamentSetPrize";
    OutHeader[OutHeader["TournamentUEW"] = 377] = "TournamentUEW";
    OutHeader[OutHeader["TournamentNop378"] = 378] = "TournamentNop378";
    // 379-381 — GuildBoss / Parcel
    OutHeader[OutHeader["GuildBossHealerMove"] = 379] = "GuildBossHealerMove";
    OutHeader[OutHeader["GuildBossPulleyState"] = 380] = "GuildBossPulleyState";
    OutHeader[OutHeader["ParcelDlg"] = 381] = "ParcelDlg";
    // 382-396 — Cash Shop (CCashShop::OnPacket — many sub-cases)
    // names below match decompiled CCashShop::OnPacket sub-handler names (values unchanged)
    OutHeader[OutHeader["CashShopChargeParamResult"] = 382] = "CashShopChargeParamResult";
    OutHeader[OutHeader["CashShopQueryCashResult"] = 383] = "CashShopQueryCashResult";
    OutHeader[OutHeader["CashShopCashItemResult"] = 384] = "CashShopCashItemResult";
    OutHeader[OutHeader["CashShopPurchaseExpChanged"] = 385] = "CashShopPurchaseExpChanged";
    OutHeader[OutHeader["CashShopGiftMateInfoResult"] = 386] = "CashShopGiftMateInfoResult";
    OutHeader[OutHeader["CashShopCheckDuplicatedIDResult"] = 387] = "CashShopCheckDuplicatedIDResult";
    OutHeader[OutHeader["CashShopCheckNameChangePossibleResult"] = 388] = "CashShopCheckNameChangePossibleResult";
    OutHeader[OutHeader["CashShopCheckTransferWorldPossibleResult"] = 390] = "CashShopCheckTransferWorldPossibleResult";
    OutHeader[OutHeader["CashShopGachaponStampResult"] = 391] = "CashShopGachaponStampResult";
    // 392 and 393 both dispatch to the same decompiled handler (OnCashItemGachaponResult)
    OutHeader[OutHeader["CashShopCashItemGachaponResultA"] = 392] = "CashShopCashItemGachaponResultA";
    OutHeader[OutHeader["CashShopCashItemGachaponResultB"] = 393] = "CashShopCashItemGachaponResultB";
    OutHeader[OutHeader["CashShopOneADay"] = 395] = "CashShopOneADay";
    OutHeader[OutHeader["CashShopNoticeFreeCashItem"] = 396] = "CashShopNoticeFreeCashItem";
    // 398-400 — FuncKey / PetConsume init
    OutHeader[OutHeader["FuncKeyMappedInit"] = 398] = "FuncKeyMappedInit";
    OutHeader[OutHeader["PetConsumeItemInit"] = 399] = "PetConsumeItemInit";
    OutHeader[OutHeader["PetConsumeMPItemInit"] = 400] = "PetConsumeMPItemInit";
    // 405-409 — MapleTV (404, 408-409 also within this range but unused/unconfirmed)
    OutHeader[OutHeader["MapleTVSetMessage"] = 405] = "MapleTVSetMessage";
    OutHeader[OutHeader["MapleTVClearMessage"] = 406] = "MapleTVClearMessage";
    OutHeader[OutHeader["MapleTVSendMessageResult"] = 407] = "MapleTVSendMessageResult";
    // 410-412 — ITC
    OutHeader[OutHeader["ITCChargeParamResult"] = 410] = "ITCChargeParamResult";
    OutHeader[OutHeader["ITCQueryCashResult"] = 411] = "ITCQueryCashResult";
    OutHeader[OutHeader["ITCNormalItemResult"] = 412] = "ITCNormalItemResult";
    // 413-416 — CharacterSale (CField::OnCharacterSale forwards to
    // CUICharacterSaleDlg::OnPacket, decompile/778c50.c). That dispatcher only
    // has cases for 413/414 — 415/416 fall through and are confirmed dead on
    // the client (no handler anywhere in the dump), despite being in-range.
    // Renamed from the previous guessed CharacterSaleInfo/Result/Buy/Cancel
    // names, which didn't match OG's actual handler names.
    OutHeader[OutHeader["CharacterSaleCheckIdResult"] = 413] = "CharacterSaleCheckIdResult";
    OutHeader[OutHeader["CharacterSaleCreateResult"] = 414] = "CharacterSaleCreateResult";
    OutHeader[OutHeader["CharacterSaleUnused415"] = 415] = "CharacterSaleUnused415";
    OutHeader[OutHeader["CharacterSaleUnused416"] = 416] = "CharacterSaleUnused416";
    // 420-423 — BattleRecord (CBattleRecordMan::OnPacket)
    OutHeader[OutHeader["BattleRecordDotDamage"] = 421] = "BattleRecordDotDamage";
    OutHeader[OutHeader["BattleRecordServerOnCalc"] = 422] = "BattleRecordServerOnCalc";
    // 424-427 — ItemUpgrade (CField::OnItemUpgrade forwards to
    // CUIItemUpgrade::OnPacket, decompile/7c2e10.c). That dispatcher only
    // checks `nType == 425` — 424/426/427 are confirmed dead, exactly like
    // CharacterSale's 415/416. Renamed from the previous guessed Result/Log/
    // Innocent/GoldenHammer names (425 is the only one with any real
    // behavior — handled via CUIItemUpgrade::OnItemUpgradeResult).
    OutHeader[OutHeader["ItemUpgradeUnused424"] = 424] = "ItemUpgradeUnused424";
    OutHeader[OutHeader["ItemUpgradeResult"] = 425] = "ItemUpgradeResult";
    OutHeader[OutHeader["ItemUpgradeUnused426"] = 426] = "ItemUpgradeUnused426";
    OutHeader[OutHeader["ItemUpgradeUnused427"] = 427] = "ItemUpgradeUnused427";
    // 428-431 — Vega (CField::OnVega forwards to CUIVega::OnPacket,
    // decompile/7c0680.c). Confirmed via the v95 IDA dump's disassembly:
    // CUIVega::OnPacket's body is `cmp nType, 0x1AD(429); jnz return` — it
    // ONLY ever handles 429, calling it CUIVega::OnVegaResult. 428/430/431
    // are confirmed dead (CUIVega::OnPacket itself has no case for them at
    // all). The previous VegaResult=428/VegaProtect=429/VegaEnhance=430/
    // VegaSpell=431 spread was a wrong guess — moved the one real handler to
    // its correct value and value 428/430/431 are intentionally undeclared.
    OutHeader[OutHeader["VegaResult"] = 429] = "VegaResult";
    OutHeader[OutHeader["VegaUnused428"] = 428] = "VegaUnused428";
    OutHeader[OutHeader["VegaUnused430"] = 430] = "VegaUnused430";
    OutHeader[OutHeader["VegaUnused431"] = 431] = "VegaUnused431";
    // 432 — LogoutGift (CWvsContext::OnLogoutGift, decompile/9cccb0.c). Body
    // is a pure virtual dispatch (`jmp [vtable+0x34]`) into
    // TSingleton<CUILogoutGift>'s own OnPacket — no static target resolvable
    // from disassembly alone, same as FamilyChartResult. Decoded as opaque
    // raw bytes rather than guessed.
    OutHeader[OutHeader["LogoutGift"] = 432] = "LogoutGift";
})(OutHeader || (OutHeader = {}));
//# sourceMappingURL=OpCodes.js.map