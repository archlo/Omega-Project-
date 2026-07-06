// MapleStory v95 — protocol enums derived from the v95 reverse-engineering dump
// (C:\Users\jorge\OneDrive\Desktop\Maplestory95.exe_export_for_ai\generated\*).
//
// Each enum carries a JSDoc that names the C++ source class and points to the
// dump line (enums.json:LINENO or master_report.json:LINENO) for traceability.
// Wire values are unchanged — this file is purely a renumbering of the
// "case N:" / "writeByte(N)" magic numbers that used to live in FieldHandlers,
// GameSender, MeleeAttackEncoder, and MovePathEncoder.
//
// Sixteenth-pass note (re-sweep of every enum in this file individually
// against the decompile, the same way the ninth pass found the MessageType
// off-by-one): the following OUTBOUND-only sub-action enums are confirmed
// UNCONFIRMABLE against this decompile export — searched function_index.txt
// exhaustively for their real C++ sender classes (`CQuest::`, `CGuild::`,
// `CParty::`, `CFriend::`, `SendQuestRequest`, `SendGuildRequest`,
// `SendPartyRequest`, `SendFriendRequest`, `SendWhisper`,
// `ScriptMessageAnswer`, `SendShopRequest`, `SendMessengerRequest`,
// `OnDropEnterField`/`OnDropLeaveField`) and none exist in this dump:
// `QuestRequestAction`, `GuildRequestAction` (no `CGuild` class body exists
// at all, only the display-only `CTabGuild` UI wrapper), `PartyRequestAction`
// (no `CParty` class body either, only `CTabParty`),
// `ScriptAnswerAction`, `WhisperFlag`, `WhisperSendBit`,
// `DropEnterType`/`DropLeaveType` (`CDropPool`/`CQuest` are both
// destructor-only vtable stubs in this export — no real method bodies were
// recovered for either class), `ShopRequestAction`, `MessengerRequestAction`.
// None of these are receive-side opcodes this client ever decodes, so there
// is no inbound dispatch switch to check them against either. Also: this
// file's own `QuestRecordState` citation ("enums.json:910-935") was found to
// be stale/wrong (that range is an unrelated weapon-type enum) and has been
// corrected at its own declaration below to cite the real source
// (`CWvsContext::OnQuestRecordMessage`, decompile/A03920.c, already used to
// fix `MessageType.QuestRecord`'s sibling bug in an earlier pass). None of
// the unconfirmable enums above show any internal inconsistency (no
// duplicate values, no obviously-wrong gaps) — flagged as unconfirmed rather
// than guess-fixed or false-confidently left uncommented.

/* ═══════════════════════════════════════════════════════════════════════════
 *  Script dialog — C++ CScriptMan::OnScriptMessage sub-cases.
 *  (kept here for documentation; the active enum lives in ScriptMessageType.ts
 *   so existing imports keep working)
 * ═══════════════════════════════════════════════════════════════════════════ */

/** CWvsContext::OnMessage sub-cases (OutHeader.Message=38 first payload byte).
 *  Confirmed byte-for-byte against the decompiled switch in
 *  CWvsContext::OnMessage (decompile/A06C90.c) — cases 0-14, `default: return;`
 *  for anything else. The previous values here had a cascading off-by-one
 *  starting at 5 (a missing IncFame/"IncPOP" case shifted every value after
 *  it by one) plus a genuine duplicate (System and QuestRecordEx both = 11),
 *  which made System notices always get misdecoded as QuestRecordEx (reading
 *  the wrong fields and desyncing the rest of the packet). */
export const enum MessageType {
  LootWarning       = 0,
  QuestRecord       = 1,
  CashItemExpire    = 2,
  IncExp            = 3,
  IncSp             = 4,
  /** Case 5 in the decompile is "IncPOP" — POP = popularity = Fame. */
  IncFame           = 5,
  IncMoney          = 6,
  IncGP             = 7,
  GiveBuff          = 8,
  GeneralItemExpire = 9,
  System            = 10,
  QuestRecordEx     = 11,
  ItemProtectExpire = 12,
  ItemExpireReplace = 13,
  SkillExpire       = 14,
  // Not confirmed against this decompiled switch (its `default` returns for
  // anything past 14) — may belong to a different dispatch path, or may be
  // wrong. Kept rather than deleted since real handlers already consume
  // them; flagged here so nobody mistakes these for decompile-verified.
  EncryptedMessage  = 15,
  OpenURL           = 16,
  WheelOfFortune    = 17,
}

/** LootWarning (MessageType.LootWarning) sub-type byte.
 *  enums.json:2687-2700 (subset) */
export const enum LootSubType {
  ItemUnidentified = 0,
  MoneyWarning     = 1,
  MesoGet          = 1,
  ItemWarning      = 0,
  ItemExpire       = 2,
}

/** QuestRecord (MessageType.QuestRecord) state byte.
 *  Confirmed against `CWvsContext::OnQuestRecordMessage` (decompile/A03920.c,
 *  already read in full during the tenth pass's `MessageType.QuestRecord`
 *  fix): `state byte == 1` is Started (reads a trailing string), `== 2` is
 *  Completed (reads a trailing 8-byte FILETIME), the `else` branch (state 0,
 *  anything else) is Removed and reads nothing further. Values 0/1/2 below
 *  match exactly. The previous doc comment here ("enums.json:910-935,
 *  ENUM_Global_result") was a stale/wrong citation — that line range is an
 *  unrelated 18-case weapon-type enum (cases 30-49, used by
 *  `get_weapon_type`), not a quest-record-state enum at all; corrected to
 *  cite the real source instead of leaving a bogus pointer in place. */
export const enum QuestRecordState {
  Removed   = 0,
  Started   = 1,
  Completed = 2,
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  Party / Friend / Guild / Messenger / Trunk / Shop result sub-cases.
 *  These are the bytes that FieldHandlers.ts:587-693 switch on.
 * ═══════════════════════════════════════════════════════════════════════════ */

/** Party result (OutHeader.PartyResult=62) first payload byte.
 *  Confirmed against the real switch in CWvsContext::OnPartyResult
 *  (decompile/A10AB0.c) — same "guessed enum doesn't match the real
 *  switch" problem already found and fixed for Friend/GuildResultType
 *  below. The real switch has NO case for 1, 2, or 3, and starts at 4 —
 *  `JoinExisting`(1)/`Leave`(2)/`Expel`(5) never existed and are dead code
 *  (a real server byte of 1/2/5 would just hit `default`). `Invite`(4),
 *  `Load`(7), `Withdraw`(12), and `Join`(15) are confirmed correct both
 *  in value and decode shape. `CreateDone`(8) is the right *value* but the
 *  old decode shape was wrong — see the fix in FieldHandlers.ts. `LoadDone`
 *  (10) and `Migration`(38) were both wrong: case 10 is one of many
 *  generic chat-log-only notification cases (9/10/13/16/17/18/29/32/33/
 *  34/36 — different StringPool message ids, no further packet bytes),
 *  and case 38 is actually a second unconditional `PARTYDATA::Decode`
 *  (effectively a full reload, closer to "LoadDone" than 10 ever was) —
 *  renamed to `ReloadParty` to avoid re-guessing what it's "really" called.
 *  Many more real cases exist (31 changes the party boss, 39/40/46 decode
 *  member status updates, 41-43 are Pyramid/PQ-reward-specific, 75-80
 *  route to `CUIPartySearch::OnPacket`) that aren't enumerated here yet —
 *  see AUDIT_OG_V95.md's party pass for the full case list. Treat this as
 *  partially-fixed debt, not a complete correction. */
export const enum PartyResultType {
  Invite         = 4,
  Load           = 7,
  CreateDone     = 8,
  Withdraw       = 12,
  Join           = 15,
  /** int newBossCharId, byte (0=auto/disconnect, 1=manual transfer). */
  ChangeBoss     = 31,
  /** int charId, int level, int job — member stat update. */
  LevelJobChanged = 39,
  ReloadParty    = 38,
}

/** Friend result (OutHeader.FriendResult=65) first payload byte.
 *  Confirmed byte-for-byte against the decompiled switch in
 *  CWvsContext::OnFriendResult (decompile/A12630.c). Cases 7 (0x7), 10 (0xA),
 *  and 18 (0x12) ALL share one case label in the real switch and dispatch to
 *  the same `CFriend::Reset` full-list decode (count:byte then count×
 *  (GW_Friend:39-byte record) then count×(inShop:int) — confirmed against
 *  `CFriend::Reset`, decompile/A10760.c, and the 39-byte `GW_Friend::Decode`,
 *  decompile/4F2B30.c) — kept as one TS case group (`Load`/`Set`/`Delete`),
 *  which already matched. Case 8 dispatches to `CFriend::UpdateFriend`
 *  (decompile/A125D0.c): a single friendId:int + one GW_Friend record (39
 *  bytes) + inShop:byte — genuinely missing from the previous switch (no
 *  enum member existed for value 8 at all, so it silently fell to
 *  `default`). Case 0x14=20 is a separate single-friend status update
 *  (friendId:int, inShop:byte, channel:int) — also missing previously. */
export const enum FriendResultType {
  Load            = 7,
  UpdateFriend    = 8,
  Request         = 9,
  Set             = 10,
  StatusChanged   = 20,
  Delete          = 18,
}

/** Guild result (OutHeader.GuildResult=67) first payload byte.
 *  Confirmed against the decompiled switch in CWvsContext::OnGuildResult
 *  (decompile/A0D3B0.c). The previous values (6, 7, 9, 14, 23, 29) do not
 *  exist as case labels in the real switch AT ALL — only 28 (Load) was
 *  correct. Every other named case here (NotifyLogin/NotifyLogout/Expel/
 *  MarkChange/LevelUp/LoadDone) was unreachable dead code that could never
 *  fire against a real server, since the server never sends those byte
 *  values for those meanings; traffic for the real "leave/expel" (46/49),
 *  "online status" (63), "grade change" (66), "mark change" (69), and
 *  "point/level" (75) cases all silently fell through to `default`. */
export const enum GuildResultType {
  Load           = 28,
  /** Member-join broadcast: guildId:int, charId:int, then (if charId !=
   *  self) GUILDMEMBER record (37 bytes, decompile/4F2B40.c). */
  MemberJoin     = 41,
  /** Member online/offline: guildId:int, charId:int, online:byte. */
  OnlineStatus   = 63,
  /** Member grade change: guildId:int, charId:int, grade:byte. */
  GradeChange    = 66,
  /** Guild mark/emblem change: guildId:int, markBg:short, markBgColor:byte,
   *  mark:short, markColor:byte. */
  MarkChange     = 69,
  /** Member leave (46) or expelled (49) — same payload shape, share one
   *  case label in the real switch: guildId:int, charId:int, name:string. */
  Leave          = 46,
  Expel          = 49,
  /** Guild point/level update: guildId:int, point:int, level:int. */
  PointLevel     = 75,
  /** Guild notice text changed: guildId:int + notice:string. OG shows notice
   *  in chat log (decompile/A0D3B0.c case 71). TODO_AUDIT.md Hundred-and-sixty-sixth pass. */
  NoticeChange   = 71,
  /** Prompts the guild master to pick a guild mark/emblem — opens
   *  CSetGuildMarkDlg locally (AmIGuildMaster-gated), no further packet
   *  bytes read. TODO_AUDIT.md Seventy-ninth pass's `CSetGuildMarkDlg`
   *  finding (decompile, CWvsContext::OnGuildResult case 17). */
  SetMarkPrompt  = 17,
}

/** Alliance result (OutHeader.AllianceResult=68) first payload byte.
 *  Confirmed via CWvsContext::OnAllianceResult (0xa0ef60) jump table
 *  byte_A0FBB8 + jpt_A0EFD2 cross-reference (TODO_AUDIT.md Hundred-and-
 *  twenty-third pass). Raw sub-type 3 (case 0), 15 (case 4), 18 (case 6),
 *  and 23-30 (cases 7-14) also exist but their semantics were not traced
 *  this pass. Sub-type 14 (grade change) dispatches to case 3 (0xa0f06b)
 *  which shows a CUIFadeYesNo confirm dialog — no user-visible text decoded
 *  (StringPool-blocked), deferred. */
export const enum AllianceResultType {
  /** Clear alliance data locally — no further packet bytes.
   *  Dispatches to ALLIANCEDATA::Clear + ZArray<GUILDDATA>::RemoveAll. */
  Clear              = 12,
  /** N x GUILDDATA updates: int(count) then count × GUILDDATA::Decode.
   *  This is the main member-list packet; fired after sub-type 16 on load. */
  MemberUpdate       = 13,
  /** Member grade changed. Decode: int(allianceId)+int(guildId)+int(charId)+byte(grade).
   *  TODO_AUDIT.md Hundred-and-twenty-sixth pass: jpt[3] @ 0xa0f06b. */
  MemberGradeChange  = 14,
  /** Full alliance load: ALLIANCEDATA::Decode + int + GUILDDATA::Decode (own guild).
   *  Followed immediately by sub-type 13 with all allied-guild member data. */
  FullLoad           = 16,
  /** Notice set broadcast. Decode: int(guildId)+str(notice)+str(setterName).
   *  TODO_AUDIT.md Hundred-and-twenty-sixth pass: jpt[0] @ 0xa0f546. */
  SetNotice          = 3,
  /** Member level/job updated. Decode: int(allianceId)+int(guildId)+int(charId)+int(level)+int(job).
   *  TODO_AUDIT.md Hundred-and-twenty-sixth pass: jpt[8] @ 0xa0f78d. */
  MemberStatUpdate   = 24,
  /** Guild master changed. Decode: int(allianceId)+int(oldMasterCharId)+int(newMasterCharId).
   *  TODO_AUDIT.md Hundred-and-twenty-sixth pass: jpt[9] @ 0xa0f843. */
  ChangeMasterResult = 25,
  /** Full reload: ALLIANCEDATA::Decode then guildCount×GUILDDATA::Decode.
   *  TODO_AUDIT.md Hundred-and-twenty-seventh pass: jpt[4] @ 0xa0f710. */
  FullReload         = 15,
  /** Guild joins alliance: ALLIANCEDATA::Decode + int(guildId) + GUILDDATA::Decode.
   *  TODO_AUDIT.md Hundred-and-twenty-seventh pass: jpt[6] @ 0xa0f307. */
  GuildJoin          = 18,
  /** Alliance metadata update (name/grade-name change): ALLIANCEDATA::Decode only.
   *  TODO_AUDIT.md Hundred-and-twenty-seventh pass: jpt[7] @ 0xa0f6ba. */
  MetadataUpdate     = 23,
  /** Alliance grade names updated: int(allianceId) + 5×str(grade names).
   *  TODO_AUDIT.md Hundred-and-twenty-seventh pass: jpt[10] @ 0xa0f927. */
  GradeNamesUpdate   = 26,
  /** Own-guild member grade changed: int(charId) + byte(newGrade).
   *  TODO_AUDIT.md Hundred-and-twenty-seventh pass: jpt[11] @ 0xa0f98a. */
  OwnGradeChange     = 27,
}

/** Shop result (OutHeader.ShopResult=365) first payload byte.
 *  Confirmed against the decompiled switch in `CShopDlg::OnPacket`
 *  (decompile/6EB7D0.c): cases 1/5/9, 2/0xA, 3, 0xD, 0x10, 0x11, 0x12 are all
 *  generic string-table notice cases with no extra packet read (string ids
 *  869/6795/870/5439/872/5869/4018 respectively); 4/8 are a silent no-op
 *  `return` with no notice at all. Only TWO real cases read anything further:
 *  case 0xE(14) reads one `int` and formats it into the "not enough mesos"
 *  notice (StringPool id 0x154F = 5455), and case 0xF(15) reads one `int`
 *  and formats it into the "not enough items" notice (StringPool id
 *  0x154E = 5454) — NEITHER case is a level check; this client's
 *  `CShopDlg::OnPacket` has no level-gating case at all. The previous
 *  `NotEnoughMesos=2`/`NotEnoughItems=4`/`NotEnoughStock=5`/`LevelTooLow=14`/
 *  `LevelTooHigh=15` names did not match the real case semantics (2/4/5 are
 *  either generic or silent no-ops; 14/15 are mesos/items shortage, not
 *  level checks) even though the byte VALUES read by
 *  `FieldHandlers.handleShopResult` for 14/15 (a bare `readInt()`) happen to
 *  still byte-match both real cases. Renamed to the real semantics; case
 *  0x13(19) reads `bool` then conditionally a `string` — confirmed exact
 *  match for `NoItemsInStock`. */
export const enum ShopResultType {
  Success         = 0,
  /** Case 0xE(14): reads one int, "not enough mesos" notice. */
  NotEnoughMesos  = 14,
  /** Case 0xF(15): reads one int, "not enough items" notice. */
  NotEnoughItems  = 15,
  NoItemsInStock  = 19,
}

/** Trunk result (OutHeader.TrunkResult=368) first payload byte.
 *  Confirmed against the decompiled switch in `CTrunkDlg::OnPacket`
 *  (decompile/76A990.c): cases 10, 11/16, 12, 17, 23 are generic
 *  string-table notices (870/6795/884/883/5869) with no extra read; case 9
 *  is the PUT-item-list refresh path (`CmpPutItem`/`m_pSBPut`, not a "get"
 *  path — the previous `GetItem` name was a misnomer for this case); cases
 *  13/15/19 all share one label calling `SetGetItems` (the real
 *  get/withdraw-list refresh, despite 9 also touching `m_pTab`/scrollbar
 *  state for the put side — both call into the same trunk-contents decode,
 *  `_decodeTrunk` in `FieldHandlers.ts`, which matches); case 22 is
 *  `Open` (allocates+shows the dialog); case 24 reads `bool` then
 *  conditionally a `string` (or falls to the generic notice). There is NO
 *  case 26 anywhere in this switch — any value not explicitly listed
 *  (including 26) falls to `default`, the same generic msg-873 notice path
 *  as every other unhandled byte. The previous `MoneyResult=26` was
 *  fabricated; removed rather than kept as a fictitious case. */
export const enum TrunkResultType {
  Open         = 22,
  /** Case 9: put-item-list refresh (`CmpPutItem`). Kept the name `PutSync`
   *  rather than the old, backwards `GetItem` name. */
  PutSync      = 9,
  PutItem      = 13,
  Store        = 15,
  SortResult   = 19,
  SortTrunk    = 24,
}

/** Messenger (OutHeader.Messenger=372) action byte.
 *  Confirmed byte-for-byte against `CUIMessenger::OnPacket`
 *  (decompile/7F5E40.c): `0->OnEnter, 1->OnSelfEnterResult, 2->OnLeave,
 *  3->OnInvite (checked first, before the rest of the switch),
 *  4->OnInviteResult, 5->OnBlocked, 6->OnChat, 7->OnAvatar, 8->OnMigrated`,
 *  default falls through with no action. All 9 numeric values (0-8) match
 *  exactly — only `Hide`/`DeclineInvite` are naming drift from the real
 *  function names (`OnInviteResult`/`OnBlocked`); left as-is rather than
 *  renamed since the values are correct and renaming would touch every
 *  call site in FieldHandlers.ts/GameStage.ts for a purely cosmetic gain. */
export const enum MessengerAction {
  Open          = 0,
  Join          = 1,
  Leave         = 2,
  Invite        = 3,
  /** Real name: OnInviteResult (an invite the local player sent was
   *  accepted/declined by the recipient). */
  Hide          = 4,
  /** Real name: OnBlocked (the recipient has messenger invites blocked). */
  DeclineInvite = 5,
  Chat          = 6,
  Avatar        = 7,
  MigratedIn    = 8,
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  Inventory op + drop + item-flag sub-cases.
 * ═══════════════════════════════════════════════════════════════════════════ */

/** Inventory op (OutHeader.InventoryOperation=28) opType byte.
 *  Confirmed against CWvsContext::OnInventoryOperation (decompile/A08A70.c)'s
 *  switch: case 4 is "UpdateExp" (reads a single int, the new equip EXP via
 *  GW_ItemSlotEquip::SetEXP) — there is no separate "Expire" case at all in
 *  this client. The previous `Expire=4`/`UpdateExp=5` pair meant case 4 was
 *  misnamed (decoded as a discard-int "expire" instead of feeding the int
 *  into anything) and case 5 (true UpdateExp, same wire value as the real
 *  case 4) was unreachable dead code. */
export const enum InventoryOpType {
  Add            = 0,
  QuantityChange = 1,
  Move           = 2,
  Remove         = 3,
  UpdateExp      = 4,
}

/** DropEnter (OutHeader.DropEnterField=322) enterType byte. */
export const enum DropEnterType {
  Show     = 0,
  Existing = 1,
  Tween    = 2,
  Fade     = 3,
  ShowFade = 4,
  ShowDrop = 5,
  MoneyShow = 6,
  Fade2    = 7,
}

/** DropLeave (OutHeader.DropLeaveField=324) leaveType byte. */
export const enum DropLeaveType {
  Timeout        = 0,
  PickedUp       = 1,
  PickupOther    = 2,
  PickedUpByRemote = 3,
  RemovedByAdmin = 4,
  PickedUpBySelf = 5,
}

/** Trunk payload flag bits — FieldHandlers.ts:810-820 (BigInt-mask against a readLong()).
 *  Can't be a TS enum (BigInt isn't a valid enum member type), so this is a
 *  typed `as const` object for documentation. The values match the C++
 *  CTrunkDlg decoder (per dump). */
export const TrunkFlag = {
  Money: 0x02n,
  Equip: 0x04n,
  Use:   0x08n,
  Setup: 0x10n,
  Etc:   0x20n,
  Cash:  0x40n,
} as const;
export type TrunkFlag = (typeof TrunkFlag)[keyof typeof TrunkFlag];

/* ═══════════════════════════════════════════════════════════════════════════
 *  Whispers / chat / func-key / shop-item prefix.
 * ═══════════════════════════════════════════════════════════════════════════ */

/** Whisper (OutHeader.Whisper=151) flag byte. ENUM_CField_v3 enums.json:3040-3052. */
export enum WhisperFlag {
  Loc      = 0x01,
  Ability  = 0x02,
  Reactor  = 0x04,
  Shop     = 0x08,
  Receive  = 0x10,
}

/** ShopItem prefix range for rechargeable bullets/arrows (UI.nItemID/10000). */
export enum ShopItemPrefix {
  ThrowArrow = 207,
  Bullet     = 233,
}

/** FuncKey init type (OutHeader.FuncKeyMappedInit=398 and friends). */
export enum FuncKeyInitType {
  FuncKeyMapped     = 398,
  PetConsumeItem    = 399,
  PetConsumeMP      = 400,
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  OutHeader.OutPacket sub-actions (GameSender.ts writeByte(N) values).
 *  These are the first payload byte of each InHeader.
 * ═══════════════════════════════════════════════════════════════════════════ */

/** InHeader.UserShopRequest=66 sub-action. */
export const enum ShopRequestAction {
  Buy      = 0,
  Sell     = 1,
  Recharge = 2,
  Close    = 3,
}

/** InHeader.UserTrunkRequest=67 sub-action. */
export const enum TrunkRequestAction {
  Withdraw      = 4,
  Deposit       = 5,
  Sort          = 6,
  WithdrawMoney = 7,
  DepositMoney  = 7,
  Close         = 8,
}

/** InHeader.UserQuestRequest=119 sub-action. */
export const enum QuestRequestAction {
  Accept           = 1,
  Complete         = 2,
  Resign           = 3,
  StartScript      = 4,
  CompleteScript   = 5,
  OpenQuest        = 6,
  LostItem         = 7,
  CompleteNpcScript = 8,
}

/** InHeader.GuildRequest=149 sub-action. */
export const enum GuildRequestAction {
  Load      = 0,
  Create    = 1,
  Join      = 2,
  Withdraw  = 3,
  Kick      = 4,
  Admin     = 5,
  Level     = 6,
  Leave     = 7,
  Expel     = 8,
  // OG: CField::SendSetGuildMarkMsg (decompile) — guild master only
  // (CWvsContext::AmIGuildMaster gate). TODO_AUDIT.md Seventy-ninth pass's
  // `CSetGuildMarkDlg` finding.
  SetMark   = 15,
}

/** InHeader.PartyRequest=145 sub-action. */
export const enum PartyRequestAction {
  JoinExisting     = 0,
  Create           = 1,
  Leave            = 2,
  Join             = 3,
  Invite           = 4,
  Kick             = 5,
  ChangeLevel      = 6,
  ChangeJob        = 7,
  ChangePartyName  = 8,
  Apply            = 9,
  WithdrawApply    = 10,
  SetMemberGrade   = 11,
}

/** InHeader.FriendRequest=153 sub-action.
 *  Load/Add/Accept/Delete are now CONFIRMED against real senders found under
 *  `CField`/`CWvsContext` (not `CFriend` — that's why the search noted in the
 *  file-header comment above missed them): `CWvsContext::LoadFriend`
 *  (decompile/a10240.c, Encode1(0)), `CField::SendSetFriendMsg`
 *  (decompile/535240.c, Encode1(1) + EncodeStr(targetName) +
 *  EncodeStr(group)), `CField::SendAcceptFriendMsg` (decompile/52f290.c,
 *  Encode1(2) + Encode4(friendId)), `CField::SendDeleteFriendMsg`
 *  (decompile/52f170.c, Encode1(3) + Encode4(friendId)).
 *  There is NO separate "SetGroup" action — `SendSetFriendMsg` is reused for
 *  both inviting a new friend into a group AND re-grouping an existing
 *  confirmed friend (OG compares the friend's current `sFriendGroup` by name
 *  and falls into the same Encode1(1) path if it differs). The previous
 *  `SetGroup=5` value here was unconfirmed guesswork with the wrong payload
 *  shape (friendId:int instead of targetName:string) — removed; use `Add`
 *  for both flows. Refuse/SetMemo/CapacityChange remain unconfirmed — no
 *  sender for them exists anywhere in this dump either. */
export const enum FriendRequestAction {
  Load           = 0,
  Add            = 1,
  Accept         = 2,
  Delete         = 3,
  Refuse         = 4,
  SetMemo        = 6,
  CapacityChange = 7,
}

/** ScriptMessage answer wire byte (sent in body of InHeader.UserScriptMessageAnswer). */
export const enum ScriptAnswerAction {
  Cancel = 0,
  Select = 1,
}

/** InHeader.Whisper=141 first payload byte (send-side).
 *  Per the C++ send code, the bit is 0x02 (WhisperSendBit), not 0x06.
 *  (Phase 5.1 fix — Whisper now sends 0x02.) */
export const enum WhisperSendBit {
  /** C++ spec: 0x02 = "send only". This is what the v95 client sends. */
  SendOnly = 0x02,
  /** Legacy: 0x06 = "send and receive echo" — what the v83-and-earlier clients sent.
   *  Kept for tests/reference; not used by the live sender. */
  SendWithEcho = 0x06,
}

/** @deprecated use `WhisperSendBit.SendOnly` */
export const WhisperSendBit_Send = 0x06;

/** InHeader.Messenger=143 sub-action. */
export const enum MessengerRequestAction {
  Enter  = 0,
  Leave  = 2,
  Invite = 3,
  Chat   = 6,
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  MiniRoom (InHeader.MiniRoom=144) sub-actions — shared by the TRP_/MRP_/PSP_
 *  family used by Trade, Hired Merchant, Omok, etc.
 * ═══════════════════════════════════════════════════════════════════════════ */

export const enum MiniRoomProtocol {
  /** MiniRoom create/enter/leave/chat/invite */
  MRP_Create           = 0,
  MRP_CreateResult     = 1,
  MRP_Invite           = 2,
  MRP_InviteResult     = 3,
  MRP_Enter            = 4,
  MRP_EnterResult      = 5,
  MRP_Chat             = 6,
  MRP_Leave            = 10,
  MRP_Balloon          = 11,

  /** Trade sub-actions */
  TRP_PutItem          = 15,
  TRP_PutMoney         = 16,
  TRP_Trade            = 17,
  TRP_UnTrade          = 18,
  TRP_MoveItemToInventory = 19,

  /** Personal shop (Hired Merchant) sub-actions */
  PSP_PutItem          = 22,
  PSP_BuyItem          = 23,
  PSP_BuyResult        = 24,
  PSP_Refresh          = 25,
  PSP_AddSoldItem      = 26,
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  MapleStat — full 22-bit bitfield (OutHeader.StatChanged=30 mask).
 *  Replaces the partial enum in GameSender.ts. Confirmed bit-for-bit against
 *  GW_CharacterStat::DecodeChangeStat (decompile/4FA000.c).
 * ═══════════════════════════════════════════════════════════════════════════ */

export const enum MapleStat {
  Skin    = 0x000001,
  Face    = 0x000002,
  Hair    = 0x000004,
  PetSn1  = 0x000008,
  Level   = 0x000010,
  Job     = 0x000020,
  Str     = 0x000040,
  Dex     = 0x000080,
  Int     = 0x000100,
  Luk     = 0x000200,
  Hp      = 0x000400,
  MaxHp   = 0x000800,
  Mp      = 0x001000,
  MaxMp   = 0x002000,
  Ap      = 0x004000,
  /** Plain short UNLESS the character's current job is Cygnus (job/1000==3),
   *  Aran (job/100==22), or Evan (job==2001) — those read a variable-length
   *  `ExtendSP::Decode` structure instead (decompile/4F9CB0.c). Not
   *  implementable as a context-free bit read; see the long comment at the
   *  `MapleStat.Sp` read site in FieldHandlers.handleStatChanged. */
  Sp      = 0x008000,
  Exp     = 0x010000,
  Pop     = 0x020000,
  Meso    = 0x040000,
  PetSn2  = 0x080000,
  PetSn3  = 0x100000,
  /** Was misnamed "Fatigue" — the real field is `_ZtlSecureTear_nTempEXP`
   *  (TempEXP), confirmed in decompile/4FA000.c. There is no Fatigue field
   *  anywhere in GW_CharacterStat::DecodeChangeStat. The read shape itself
   *  (discard one int) was already correct — only the name was wrong. */
  TempExp = 0x200000,
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  Body part — full 40+ entry set.
 *  Replaces src/domain/BodyPartSlot.ts (which is left as-is for back-compat).
 *
 *  Sixteenth-pass note: this enum has ZERO call sites anywhere in `src/`
 *  (re-confirmed by grep — `CharacterRenderer.ts`/`CharCreationStage.ts`/
 *  `GameStage.ts` all still use the older `domain/BodyPartSlot.ts` exclusively),
 *  contradicting this comment's own "Replaces" claim — dead code, not wired.
 *  Partially corroborated against `ENUM_Global_nBodyPart`/`get_bodyaprt_name`
 *  (decompile/59EE20.c): real case labels include a SHARED label for 17 and
 *  59 (both resolve to the string "Pendant") — this enum is missing a second
 *  Pendant-equivalent slot at 59 entirely. Also corroborated structurally via
 *  `CDraggableItem::WearEquipItem` (decompile/5043E0.c): `nBodyPart-1000<=3`
 *  and `nBodyPart-1100<=4` range checks match this enum's
 *  `CashPetWear1-3=1001-1003`/`CashPetLabel1-5=1100-1104` ranges, and
 *  `v70 = -100 - nBodyPart` confirms the "+100 = cash version" convention
 *  behind `CashBase=100`/`CashWeapon=111`/etc. Could not independently
 *  confirm `Medal`'s alternate value 196 (`TamingMobMedal`) or the exact
 *  1001-1003/1100-1104 boundaries one-by-one — flagged, not guessed at
 *  further. Since this enum is provably unreachable dead code right now, the
 *  missing Pendant@59 member is a latent gap, not a live bug; not adding a
 *  member for it speculatively without exercising the real wire shape.
 * ═══════════════════════════════════════════════════════════════════════════ */

export const enum BodyPart {
  Hair        = 0,
  Cap         = 1,
  FaceAcc     = 2,
  EyeAcc      = 3,
  EarAcc      = 4,
  Clothes     = 5,
  Pants       = 6,
  Shoes       = 7,
  Gloves      = 8,
  Cape        = 9,
  Shield      = 10,
  Weapon      = 11,
  Ring1       = 12,
  Ring2       = 13,
  Ring3       = 15,
  Ring4       = 16,
  Pendant     = 17,
  TamingMob   = 18,
  Saddle      = 19,
  MobEquip    = 20,
  Medal       = 49,
  Belt        = 50,
  Shoulder    = 51,
  PetWear1    = 52,
  PetWear2    = 53,
  PetWear3    = 54,
  PetLabel    = 120,
  TamingMobMedal = 196,

  // Cash-prefixed body parts (>= 100)
  CashBase    = 100,
  CashWeapon  = 111,
  CashRing1   = 112,
  CashRing2   = 113,
  CashRing3   = 115,
  CashRing4   = 116,

  // Cash-shop pet wears (1001-1003)
  CashPetWear1 = 1001,
  CashPetWear2 = 1002,
  CashPetWear3 = 1003,

  // Cash-shop label (1100-1104)
  CashPetLabel1 = 1100,
  CashPetLabel2 = 1101,
  CashPetLabel3 = 1102,
  CashPetLabel4 = 1103,
  CashPetLabel5 = 1104,
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  Temp-stat mask bits (OutHeader.TemporaryStatSet=31 mask).
 *  FieldHandlers.ts:929-942 uses (mask & (1 << i)) to gate per-stat reads;
 *  the bit positions are also re-used as the order in which per-stat
 *  (value short, skillId int, seconds int) tuples are read.
 *
 *  Sixteenth-pass note: re-checked `SecondaryStat::DecodeForLocal` (called
 *  from `CWvsContext::OnTemporaryStatSet`, decompile/A02FC0.c) directly —
 *  the real mask is a 128-bit `UINT128` (`UINT128::UINT128(&uFlagTemp, v7,
 *  0x80u)`), matched against opaque global bit-constants
 *  (`CTS_ComboAbilityBuff_1`, `CTS_NotDamaged_1`, `CTS_Aura_1`,
 *  `CTS_RideVehicle_2`, `CTS_Barrier_2`, `CTS_GuidedBullet_0`,
 *  `CTS_MaxHP_1`, etc. — no header in this dump defines their numeric
 *  values). This TS enum models only a 14-bit subset as a plain sequential
 *  `0x1..0x2000` int, which is the right *shape* for the low bits
 *  (`TemporaryStatSet`/`Reset`'s mask read was already fixed to the full
 *  16-byte/128-bit width in the tenth pass — see `FieldHandlers.ts`), but
 *  the individual bit-to-stat assignments for Str/Dex/Int/Luk/Pad/Mad/Pdd/
 *  Mdd/Acc/Eva/Speed/Jump/MagicAtk/MagicDef could not be independently
 *  confirmed against this decompile (the named globals' values aren't
 *  present). Not touched — no contradicting evidence found, just no
 *  positive confirmation either; same "genuinely unconfirmable" category as
 *  `StatDerived.ts`'s formulas (pass 12).
 * ═══════════════════════════════════════════════════════════════════════════ */

export const enum TempStatMask {
  Str       = 0x0000001,
  Dex       = 0x0000002,
  Int       = 0x0000004,
  Luk       = 0x0000008,
  Pad       = 0x0000010,
  Mad       = 0x0000020,
  Pdd       = 0x0000040,
  Mdd       = 0x0000080,
  Acc       = 0x0000100,
  Eva       = 0x0000200,
  Speed     = 0x0000400,
  Jump      = 0x0000800,
  MagicAtk  = 0x0001000,
  MagicDef  = 0x0002000,
  /*
   * Beyond this point, the mask uses per-stat sub-encodings rather than a
   * single bit, so FieldHandlers only enumerates the first 12 named bits.
   * Extend here as more are decoded.
   */
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  MeleeAttackEncoder flag + per-target hit byte (InHeader.UserMeleeAttack=47).
 *  Per dump ENUM_CUserLocal_v4.
 *
 *  Sixteenth-pass note: `MeleeAttackEncoder.ts`'s own doc comment cites
 *  "CWvsContext::SendMeleeAttack at master_report.json:9340c0" as its
 *  source — checked decompile/9340C0.c directly and it is actually
 *  `CUserLocal::OnPacket` (an unrelated INBOUND dispatcher for opcodes
 *  231-276), not an outbound attack-packet builder at all; that citation is
 *  stale/wrong. No `SendAttack`/`SendMeleeAttack`-named function exists
 *  anywhere in `function_index.txt`. This enum is also currently dead code
 *  — `MeleeAttackEncoder.ts` imports it but never reads any of its members
 *  (the `flag` parameter is always passed as a raw `number`, default 0), so
 *  Skill/Combo/ShadowMeso/FinalHit are unconfirmed AND unreachable. Flagged,
 *  not guessed at further; not touched since there's no contradicting
 *  evidence, just no source to confirm against in this dump.
 * ═══════════════════════════════════════════════════════════════════════════ */

export const enum MeleeAttackFlag {
  /** Skill-typed attack (vs plain attack). */
  Skill      = 0x80,
  /** Combo attack (combo cards). */
  Combo      = 0x40,
  /** Shadow-meso special (meso-explosion). */
  ShadowMeso = 0x20,
  /** Final-hit / finishing blow. */
  FinalHit   = 0x10,
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  MovePath encoder per-element attr byte.
 *  Per dump ENUM_CAvatar_v4 (38 named values). MovePathEncoder.ts groups
 *  these into MoveCategory buckets; the raw attr values themselves are
 *  what the wire carries.
 *
 *  Sixteenth-pass note: this citation is MISATTRIBUTED. Checked
 *  `generated/enums.json` directly — the real `ENUM_CAvatar_v4` has only
 *  11 cases (`2,3,4,5,6,7,8,9,10,17,18`), sourced from
 *  `CAvatar::MoveAction2RawAction` (decompile/45FA30.c), a function that
 *  converts a local move-*input* action id into a sprite "raw action"
 *  index for the RENDERING system — entirely unrelated to this wire-level
 *  per-element type byte. No `CMovePath::Decode`/`CMovePath::Encode`/
 *  `CMovePath::ELEM::Decode`/`Encode` function exists anywhere in this
 *  decompile dump (grepped `function_index.txt` for all four names plus
 *  "MovePath" generally — the only hits are mob-side `CVecCtrl`/
 *  `CVecCtrlUser::MakeNewMovePathElem`/`MakeContinuousMovePath`, which
 *  build move paths internally rather than decode/encode them on the wire,
 *  and an unrelated recyclable-buffer-pool static initializer for
 *  `CMovePath::ELEM`). This enum DOES have live call sites
 *  (`MovePathEncoder.ts` switches on nearly every member) — if any of
 *  these 38 values are wrong, real movement packets would be malformed —
 *  but no decompiled function was found in this export to check them
 *  against, confirmed or refuted. Not touched: this already has dedicated
 *  test coverage from an earlier pass (`MobMove.spec.ts`) with no
 *  contradicting evidence found this pass either; flagging the bad
 *  citation rather than leaving false confidence in place, and flagging
 *  the values overall as still only test-self-consistent, not
 *  decompile-verified.
 * ═══════════════════════════════════════════════════════════════════════════ */

export const enum MovePathAttr {
  Normal            = 0,
  Jump              = 1,
  JumpAlert         = 2,
  Teleport          = 3,
  TeleportAlert     = 4,
  Normal2           = 5,
  NormalAlert       = 6,
  Teleport2         = 7,
  TeleportAlert2    = 8,
  StatChange        = 9,
  Normal3           = 10,
  StartFallDown     = 11,
  NormalWithFhFall  = 12,
  Jump2             = 13,
  Normal4           = 14,
  Jump3             = 16,
  FlyingBlock       = 17,
  Jump4             = 18,
  Jump5             = 31,
  Jump6             = 32,
  Jump7             = 33,
  Jump8             = 34,
  Normal5           = 35,
  Normal6           = 36,
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  CWvsContext opcode range — only the subset the TS actually dispatches.
 *  These are the *out-header* (server→client) values for the C++ main
 *  message dispatcher. The InHeader.OutHeader split lives in OpCodes.ts.
 *
 *  Sixteenth-pass note: re-read `CWvsContext::OnPacket` (decompile/9E5830.c)
 *  directly and spot-checked the 10 highest-traffic values independent of
 *  earlier passes' citations — `28->OnInventoryOperation,
 *  30->OnStatChanged, 31->OnTemporaryStatSet, 32->OnTemporaryStatReset,
 *  38->OnMessage, 61->OnCharacterInfo, 62->OnPartyResult,
 *  65->OnFriendResult, 67->OnGuildResult` all match real case labels
 *  exactly. `SetField=141` is NOT actually a `CWvsContext::OnPacket` case
 *  (that function `default: return`s at 141+) — it's dispatched one layer
 *  down, in `CStage::OnPacket` (decompile/71B0B0.c: `case 141:
 *  CStage::OnSetField`), confirmed present in that function's case list.
 *  The numeric value 141 is still correct, just routed through a different
 *  real function than this enum's class-name implies; noted for accuracy,
 *  not a bug.
 * ═══════════════════════════════════════════════════════════════════════════ */

export const enum CwvsContextType {
  InventoryOperation       = 28,
  StatChanged               = 30,
  TemporaryStatSet          = 31,
  TemporaryStatReset        = 32,
  ChangeSkillRecordResult   = 35,
  SkillUseResult            = 36,
  Message                   = 38,
  EntrustedShopCheckResult  = 49,
  CharacterInfo             = 61,
  PartyResult               = 62,
  FriendResult              = 65,
  GuildResult               = 67,
  BroadcastMsg              = 71,
  DestroyShopResult         = 119,
  SetField                  = 141,
  SetITC                    = 142,
  SetCashShop               = 143,
  GroupMessage              = 150,
  Whisper                   = 151,
  Clock                     = 163,
  QuickslotMappedInit       = 175,
  FootHoldInfo              = 176,
  UserEnterField            = 179,
  UserLeaveField            = 180,
  UserChat                  = 181,
  UserMiniRoomBalloon       = 184,
  UserMove                  = 210,
  UserEmotion               = 219,
  UserEffectRemote          = 224,
  UserEmotionLocal          = 232,
  UserEffectLocal           = 233,
  MobEnterField             = 284,
  MobLeaveField             = 285,
  MobChangeController       = 286,
  MobMove                   = 287,
  MobCtrlAck                = 288,
  MobDamaged                = 294,
  MobHPIndicator            = 298,
  NpcEnterField             = 311,
  NpcLeaveField             = 312,
  NpcMove                   = 314,
  EmployeeMiniRoomBalloon   = 321,
  DropEnterField            = 322,
  DropLeaveField            = 324,
  ScriptMessage             = 363,
  OpenShopDlg               = 364,
  ShopResult                = 365,
  TrunkResult               = 368,
  Messenger                 = 372,
  MiniRoom                  = 373,
  FuncKeyMappedInit         = 398,
  PetConsumeItemInit        = 399,
  PetConsumeMPItemInit      = 400,
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  Job / class id (v95 release).
 * ═══════════════════════════════════════════════════════════════════════════ */

/** `Math.floor(jobId / 100)` — the 6 main adventurer branches.
 *  ENUM_CalcDamage_nWT / ENUM_Global_nJobCode. */
export const enum JobBranch {
  Beginner = 0,
  Warrior  = 1,
  Magician = 2,
  Bowman   = 3,
  Thief    = 4,
  Pirate   = 5,
}

export const enum Job {
  Beginner     = 0,
  Warrior      = 100,
  Fighter      = 110,
  Crusader     = 111,
  Hero         = 112,
  Page         = 120,
  WhiteKnight  = 121,
  Paladin      = 122,
  Spearman     = 130,
  DragonKnight = 131,
  DarkKnight   = 132,

  Magician     = 200,
  FPWizard     = 210,
  FPMage       = 211,
  FPArchMage   = 212,
  ILWizard     = 220,
  ILMage       = 221,
  ILArchMage   = 222,
  Cleric       = 230,
  Priest       = 231,
  Bishop       = 232,

  Bowman       = 300,
  Hunter       = 310,
  Ranger       = 311,
  Bowmaster    = 312,
  Crossbowman  = 320,
  Sniper       = 321,
  Marksman     = 322,

  Thief        = 400,
  Assassin     = 410,
  Hermit       = 411,
  NightLord    = 412,
  Bandit       = 420,
  ChiefBandit  = 421,
  Shadower     = 422,

  Pirate       = 500,
  Brawler      = 510,
  Marauder     = 511,
  Buccaneer    = 512,
  Gunslinger   = 520,
  Outlaw       = 521,
  Corsair      = 522,

  GM           = 500,
  SuperGM      = 510,

  Noblesse     = 1000,
  DawnWarrior  = 1100,
  BlazeWizard  = 1200,
  WindArcher   = 1300,
  NightWalker  = 1400,
  ThunderBreaker = 1500,

  Legend       = 2000,
  Aran         = 2100,

  Evan         = 2001,
  // (Evan's job id is intentionally 2001 — it shares the beginner root with
  //  Legend/Aran but takes a different advancement path.)

  Citizen      = 3000,
  BattleMage   = 3200,
  WildHunter   = 3300,
  Mechanic     = 3500,

  Jett         = 5000,
}
