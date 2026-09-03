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
/** Trunk payload flag bits — FieldHandlers.ts:810-820 (BigInt-mask against a readLong()).
 *  Can't be a TS enum (BigInt isn't a valid enum member type), so this is a
 *  typed `as const` object for documentation. The values match the C++
 *  CTrunkDlg decoder (per dump). */
export const TrunkFlag = {
    Money: 0x02n,
    Equip: 0x04n,
    Use: 0x08n,
    Setup: 0x10n,
    Etc: 0x20n,
    Cash: 0x40n,
};
/* ═══════════════════════════════════════════════════════════════════════════
 *  Whispers / chat / func-key / shop-item prefix.
 * ═══════════════════════════════════════════════════════════════════════════ */
/** Whisper (OutHeader.Whisper=151) flag byte. ENUM_CField_v3 enums.json:3040-3052. */
export var WhisperFlag;
(function (WhisperFlag) {
    WhisperFlag[WhisperFlag["Loc"] = 1] = "Loc";
    WhisperFlag[WhisperFlag["Ability"] = 2] = "Ability";
    WhisperFlag[WhisperFlag["Reactor"] = 4] = "Reactor";
    WhisperFlag[WhisperFlag["Shop"] = 8] = "Shop";
    WhisperFlag[WhisperFlag["Receive"] = 16] = "Receive";
})(WhisperFlag || (WhisperFlag = {}));
/** ShopItem prefix range for rechargeable bullets/arrows (UI.nItemID/10000). */
export var ShopItemPrefix;
(function (ShopItemPrefix) {
    ShopItemPrefix[ShopItemPrefix["ThrowArrow"] = 207] = "ThrowArrow";
    ShopItemPrefix[ShopItemPrefix["Bullet"] = 233] = "Bullet";
})(ShopItemPrefix || (ShopItemPrefix = {}));
/** FuncKey init type (OutHeader.FuncKeyMappedInit=398 and friends). */
export var FuncKeyInitType;
(function (FuncKeyInitType) {
    FuncKeyInitType[FuncKeyInitType["FuncKeyMapped"] = 398] = "FuncKeyMapped";
    FuncKeyInitType[FuncKeyInitType["PetConsumeItem"] = 399] = "PetConsumeItem";
    FuncKeyInitType[FuncKeyInitType["PetConsumeMP"] = 400] = "PetConsumeMP";
})(FuncKeyInitType || (FuncKeyInitType = {}));
/** @deprecated use `WhisperSendBit.SendOnly` */
export const WhisperSendBit_Send = 0x06;
//# sourceMappingURL=Enums.js.map