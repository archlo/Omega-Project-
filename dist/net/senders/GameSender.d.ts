import { OutPacket } from '../packet/OutPacket.js';
import { InventoryType } from '../../domain/InventoryItem.js';
import { ScriptMessageType } from '../packet/ScriptMessageType.js';
import { MoveElement } from '../packet/MovePathEncoder.js';
import { MapleStat } from '../protocol/Enums.js';
export { MapleStat } from '../protocol/Enums.js';
export declare enum ChatGroupType {
    Friend = 3,// server ChatType.GROUPFRIEND = 3
    Party = 2,// server ChatType.GROUPPARTY = 2
    Guild = 4,// server ChatType.GROUPGUILD = 4
    Alliance = 5,// server ChatType.GROUPALLIANCE = 5
    Expedition = 6
}
export interface SkillMacroSaveEntry {
    slot: number;
    name?: string;
    mute?: boolean;
    skills: number[];
}
export interface ClaimRequestArgs {
    chatClaim: boolean;
    targetCharacterName: string;
    claimType: number;
    context: string;
    chatLog?: string;
}
export declare class GameSender {
    static AliveAck(): OutPacket;
    static UserCharacterInfoRequest(characterId: number): OutPacket;
    static ChangeSlotPosition(invType: InventoryType, oldPos: number, newPos: number, count: number): OutPacket;
    static DropItem(invType: InventoryType, slotPos: number, count: number): OutPacket;
    static ItemSplit(invType: InventoryType, fromSlot: number, toSlot: number, count: number): OutPacket;
    static UseItem(pos: number, itemId: number): OutPacket;
    static MobSummonItemUseRequest(pos: number, itemId: number): OutPacket;
    static PetFoodItemUseRequest(pos: number, itemId: number): OutPacket;
    static TamingMobFoodItemUseRequest(pos: number, itemId: number): OutPacket;
    static ScriptRunItemUseRequest(pos: number, itemId: number): OutPacket;
    static BridleItemUseRequest(pos: number, itemId: number, mobTemplateId: number): OutPacket;
    static ShopScannerItemUseRequest(pos: number, itemId: number): OutPacket;
    static MapTransferItemUseRequest(pos: number, itemId: number, mapName: string, mapId: number): OutPacket;
    static SelectNpcItemUseRequest(pos: number, itemId: number): OutPacket;
    static LotteryItemUseRequest(pos: number, itemId: number): OutPacket;
    static ExpUpItemUseRequest(pos: number, itemId: number): OutPacket;
    static ConsumeCashItemUseRequest(pos: number, itemId: number): OutPacket;
    static ActiveEffectItemChange(itemId: number): OutPacket;
    static DragonBallBoxRequest(): OutPacket;
    static SkillLearnItemUseRequest(pos: number, itemId: number): OutPacket;
    static SkillResetItemUseRequest(pos: number, itemId: number): OutPacket;
    static StatChangeItemCancel(itemId: number): OutPacket;
    static StatChangeRequest(a: number, b: number, c: number, d: number, e: number): OutPacket;
    static StatChangeRequestByItemOption(a: number, b: number, c: number, d: number): OutPacket;
    static UseBoxGachaponItem(pos: number, itemId: number): OutPacket;
    static UseGachaponRemote(npcId: number, value: number): OutPacket;
    static RaiseWndPutItem(itemTI: number, pos: number, itemId: number): OutPacket;
    static RaisePieceWndPutItem(itemTI: number, pos: number, itemId: number): OutPacket;
    static FindFriendMyInfoRequest(): OutPacket;
    static FindFriendSearchRequest(): OutPacket;
    static DropMoney(amount: number): OutPacket;
    static ItemReleaseRequest(useSlot: number, equipSlot: number): OutPacket;
    static PickUpDrop(fieldKey: number, x: number, y: number, dropId: number): OutPacket;
    static SkillUp(skillId: number): OutPacket;
    static UseSkill(skillId: number, slv: number, updateTime: number): OutPacket;
    static SkillMacroFlushToSvr(macros: SkillMacroSaveEntry[]): OutPacket;
    static ClaimRequest(args: ClaimRequestArgs): OutPacket;
    static UserChat(message: string, shout?: boolean): OutPacket;
    static UserEmotion(emotion: number, duration?: number, byItemOption?: boolean): OutPacket;
    /**
     * Allocate a single AP into an ability stat. `stat` is the 22-bit MapleStat
     * bitfield (Str=0x40, Dex=0x80, Int=0x100, Luk=0x200, MaxHp=0x800,
     * MaxMp=0x2000). OG CUIStat sends this for HP/MP and STR/DEX/INT/LUK.
     */
    static UserAbilityUp(stat: MapleStat): OutPacket;
    /**
     * Allocate multiple APs at once. Each entry is `[mapleStat, count]`.
     * Per the C++ UserAbilityMassUpRequest decoder, the wire is just a flat
     * list of int pairs with no per-entry opcode byte.
     */
    static UserAbilityMassUp(entries: Array<[stat: MapleStat, value: number]>): OutPacket;
    static TransferChannel(channelId: number): OutPacket;
    static TransferField(fieldKey: number, targetMap: number, portal: string, x: number, y: number): OutPacket;
    static Revive(fieldKey: number, premium: boolean): OutPacket;
    static MigrateToCashShop(): OutPacket;
    static ReturnFromCashShop(): OutPacket;
    static UserMove(fieldKey: number, movePathBlob: Uint8Array): OutPacket;
    static MobMove(mobId: number, mobCtrlSn: number, action: number, left: boolean, movePathBlob: Uint8Array, chasing?: boolean, targetInfo?: number, multiTargetForBall?: [number, number][], randTimeForAreaAttack?: number[]): OutPacket;
    /**
     * Mirrors `CUserLocal::SetDamaged` (decompile/9343C0.c)'s `pMob`-present
     * branch — the "I took damage from a real mob" ack. Real wire (after the
     * update_time): attackIdx(1), magicElemAttr(1), damage(4), templateId(4),
     * mobId(4) — written TWICE (a duplicate Encode4 of the same mob object id,
     * once early and again mid-packet, confirmed by reading the decompiled
     * function directly, not a typo in this port), dir(1), nX-flag(1),
     * bGuard(1), blockedFlag(1), powerGuardFlag(1), pGuard.gap0(1), hitX(2),
     * hitY(2), userX(2), userY(2), then an unconditional trailing stance byte.
     * The hit/user position block is unconditional on this branch — there is
     * no real "knockback>1" gate; the previous code's conditional 7-field
     * block (guarded by knockback>1) didn't correspond to any real branch and
     * was also missing the duplicate mobId field entirely. Confirmed dead code
     * (zero call sites anywhere in src/ — no PvP/self-damage system exists
     * client-side yet to call this from, per the existing "Needs new gameplay
     * systems" log entry), so this fix has no live behavior at risk; it makes
     * the encode correct for whenever a combat system does get built.
     * NOTE: the real wire's blockedFlag is `bBlocked ? (bKnockback?2:1) : 0` —
     * a genuine `bBlocked` boolean distinct from knockback that this method
     * has no parameter for. Rather than fabricate that distinction, `knockback`
     * here gates both: 0 = unblocked (flag 0), 1 = blocked no-knockback
     * (flag 1), >1 = blocked with knockback (flag 2) — an honest approximation
     * pending a real combat system threading a separate blocked flag through.
     */
    static UserHit(attackIndex: number, magicElemAttr: number, damage: number, templateId: number, mobId: number, dir: number, knockback?: number, userX?: number, userY?: number, hitX?: number, hitY?: number): OutPacket;
    static ShopBuy(shopSlot: number, itemId: number, count: number, price: number): OutPacket;
    static ShopSell(pos: number, itemId: number, count: number): OutPacket;
    static ShopRecharge(pos: number): OutPacket;
    static ShopClose(): OutPacket;
    static AdminShopRequest(): OutPacket;
    static AdminShopReopen(npcTemplateId: number): OutPacket;
    static FamilyChartRequest(characterName: string): OutPacket;
    static FamilyInfoRequest(): OutPacket;
    static FamilyInviteResult(inviterId: number, inviterName: string, accepted: boolean): OutPacket;
    static MarriageRequestResponse(requesterName: string, partnerId: number, accepted: boolean): OutPacket;
    static MarriageRequest(targetCharacterName: string, ringItemId: number): OutPacket;
    static FamilySummonResponse(accepted: boolean): OutPacket;
    static UseFamilyPrivilege(privilegeIndex: number): OutPacket;
    static SetFamilyPrecept(precept: string): OutPacket;
    static GuildBBSRegister(title: string, text: string, emoticonId: number, isNotice: boolean, modifyEntryId?: number): OutPacket;
    static GuildBBSDeleteEntry(entryId: number): OutPacket;
    static GuildBBSLoadList(startIndex: number): OutPacket;
    static GuildBBSViewEntry(entryId: number): OutPacket;
    static GuildBBSComment(entryId: number, comment: string): OutPacket;
    static GuildBBSCommentDelete(entryId: number, commentSn: number): OutPacket;
    static CashShopSendGift(spw: string, commoditySN: number, requestBuyOneADay: boolean, recipientName: string, giftMessage: string): OutPacket;
    static WeddingWishListPutItem(pos: number, itemId: number, count: number): OutPacket;
    static WeddingWishListGetItem(tab: number, idx: number): OutPacket;
    static ItemUpgradeApply(scrollPos: number, scrollItemId: number, targetItemTI: number, targetSlotPos: number, ts1: number, ts2: number): OutPacket;
    static ItemProtectorApply(scrollPos: number, scrollItemId: number, targetItemTI: number, targetSlotPos: number, ts1: number, ts2: number): OutPacket;
    static KarmaApply(scrollPos: number, scrollItemId: number, targetItemTI: number, targetSlotPos: number, ts: number): OutPacket;
    static MegaphoneCompose(invPos: number, itemId: number, message: string, isWhisper: boolean, targetTI?: number, targetPOS?: number): OutPacket;
    static VegaApply(cashPos: number, cashItemId: number, equipItemTI: number, equipSlotPos: number, scrollItemTI: number, scrollSlotPos: number, whiteScrollUse: number): OutPacket;
    static SkillResetRequest(itemId: number): OutPacket;
    static PetRename(itemId: number, petId: number, newName: string): OutPacket;
    static NameChange(itemId: number, newName: string): OutPacket;
    static MapTransfer(itemId: number, mapId: number): OutPacket;
    static AvatarMegaphone(itemId: number, message: string): OutPacket;
    static WorldSpeaker(itemId: number, message: string): OutPacket;
    static MapleTV(itemId: number, recipientName: string, message: string): OutPacket;
    static ShopScanner(itemId: number): OutPacket;
    static PersonalShopName(itemId: number, shopName: string): OutPacket;
    static Incubator(itemId: number): OutPacket;
    static ChatDonation(itemId: number): OutPacket;
    static WeatherEffect(itemId: number): OutPacket;
    static CoupleRing(itemId: number, partnerName: string): OutPacket;
    static FriendshipRing(itemId: number, friendName: string): OutPacket;
    static GuildEmblem(itemId: number): OutPacket;
    static MerchantNameTag(itemId: number, nameTag: string): OutPacket;
    static PackageDeliver(itemId: number): OutPacket;
    static QuestHelper(itemId: number): OutPacket;
    static SpReset(itemId: number): OutPacket;
    static APReset(itemId: number): OutPacket;
    static StoreBankGetAllConfirm(): OutPacket;
    static RepairDurabilityAll(): OutPacket;
    static RepairDurability(pos: number): OutPacket;
    static CharacterSaleCheckId(name: string): OutPacket;
    static CharacterSaleCreate(pos: number, itemId: number, name: string, abilityLevels: [number, number, number, number], gender: number, currentClass: number, sp: number, timestamp: number): OutPacket;
    static TrunkWithdraw(invType: number, position: number): OutPacket;
    static TrunkDeposit(inventoryPos: number, itemId: number, quantity: number): OutPacket;
    static TrunkSort(): OutPacket;
    static TrunkWithdrawMoney(amount: number): OutPacket;
    static TrunkDepositMoney(amount: number): OutPacket;
    static TrunkClose(): OutPacket;
    static MessengerEnter(messengerId: number): OutPacket;
    static MessengerLeave(): OutPacket;
    static MessengerInvite(targetName: string): OutPacket;
    static MessengerChat(text: string): OutPacket;
    static QuestAccept(questId: number, npcId: number, x: number, y: number): OutPacket;
    static QuestComplete(questId: number, npcId: number, x: number, y: number, rewardIndex?: number): OutPacket;
    static QuestResign(questId: number): OutPacket;
    static QuestStartScript(questId: number, npcTemplateId: number, x: number, y: number): OutPacket;
    static QuestCompleteScript(questId: number, npcTemplateId: number, x: number, y: number): OutPacket;
    /** QuestRequestAction.OpenQuest = 6. Opens the quest UI to view progress. */
    static QuestOpen(questId: number): OutPacket;
    /** QuestRequestAction.LostItem = 7. Returns a lost quest item to its owner. */
    static QuestLostItem(questId: number, itemId: number): OutPacket;
    /** QuestRequestAction.CompleteNpcScript = 8. Completes a quest started via NPC script. */
    static QuestCompleteNpcScript(questId: number, npcTemplateId: number): OutPacket;
    static GuildLoad(): OutPacket;
    static GuildLeave(characterId: number, characterName: string): OutPacket;
    /** GuildRequestAction.Create = 1. Creates a new guild. */
    static GuildCreate(name: string): OutPacket;
    /** GuildRequestAction.Join = 2. Joins an existing guild. */
    static GuildJoin(characterId: number, characterName: string): OutPacket;
    /** GuildRequestAction.Withdraw = 3. Withdraws a pending application. */
    static GuildWithdraw(characterId: number): OutPacket;
    /** GuildRequestAction.Kick = 4. Expels a guild member. */
    static GuildKick(characterId: number, characterName: string): OutPacket;
    /** GuildRequestAction.Admin = 5. Sets a member's guild rank to admin. */
    static GuildAdmin(characterId: number, characterName: string): OutPacket;
    /** GuildRequestAction.Level = 6. Promotes/demotes a guild member. */
    static GuildLevel(characterId: number, level: number): OutPacket;
    /** GuildRequestAction.Expel = 8. Hard-expels a member (vs. soft "kick"). */
    static GuildExpel(characterId: number, characterName: string): OutPacket;
    static GuildSetMark(markBg: number, markBgColor: number, mark: number, markColor: number): OutPacket;
    /** Sub-type 2: leave the current alliance. No extra data. */
    static AllianceWithdraw(): OutPacket;
    /** Sub-type 3: invite a character by name to the alliance. */
    static AllianceInvite(targetName: string): OutPacket;
    /** Sub-type 6: kick a member from the alliance.
     *  Requires guildId (the member's guild) and charId. */
    static AllianceKick(guildId: number, charId: number): OutPacket;
    /** Sub-type 7: transfer alliance master to another character. */
    static AllianceChangeMaster(charId: number): OutPacket;
    /** Sub-type 9: change an alliance member's grade up (bUp=1) or down (bUp=0). */
    static AllianceGradeChange(charId: number, up: boolean): OutPacket;
    /** Sub-type 10: set the alliance notice text. */
    static AllianceSetNotice(text: string): OutPacket;
    static UserSelectNpc(npcObjId: number, userX: number, userY: number): OutPacket;
    static ScriptAnswerSay(type: ScriptMessageType, action: number): OutPacket;
    static ScriptAnswerNumber(type: ScriptMessageType, answer: number): OutPacket;
    static ScriptAnswerText(type: ScriptMessageType, answer: string): OutPacket;
    static ScriptAnswerCancel(type: ScriptMessageType): OutPacket;
    static ScriptAnswerNext(msgType: number): OutPacket;
    static ScriptAnswerYesNo(yes: boolean): OutPacket;
    static ScriptAnswerTextOnly(answer: string): OutPacket;
    static ScriptAnswerNumberOnly(answer: number): OutPacket;
    static GroupChat(type: ChatGroupType, memberIds: number[], text: string): OutPacket;
    static Whisper(targetName: string, text: string): OutPacket;
    static PartyCreate(): OutPacket;
    static PartyLeave(): OutPacket;
    static PartyJoin(inviterId: number): OutPacket;
    static PartyInvite(targetName: string): OutPacket;
    static PartyKick(characterId: number): OutPacket;
    /** PartyRequestAction.ChangeLevel = 6. Adjusts the party's level range. */
    static PartyChangeLevel(level: number): OutPacket;
    /** PartyRequestAction.ChangeJob = 7. Restricts the party to a job id. */
    static PartyChangeJob(jobId: number): OutPacket;
    /** PartyRequestAction.ChangePartyName = 8. Updates the party name. */
    static PartyChangeName(name: string): OutPacket;
    /** PartyRequestAction.Apply = 9. Applies to join an open party. */
    static PartyApply(partyId: number): OutPacket;
    /** PartyRequestAction.WithdrawApply = 10. Withdraws a pending application. */
    static PartyWithdrawApply(partyId: number): OutPacket;
    /** PartyRequestAction.SetMemberGrade = 11. Promotes/demotes a party member. */
    static PartySetMemberGrade(characterId: number, grade: number): OutPacket;
    static FriendLoad(): OutPacket;
    static FriendAdd(targetName: string, group?: string): OutPacket;
    static FriendAccept(friendId: number): OutPacket;
    static FriendDelete(friendId: number): OutPacket;
    /** FriendRequestAction.Refuse = 4. Refuses a pending friend invite. */
    static FriendRefuse(friendId: number): OutPacket;
    /** OG: `CField::SendSetFriendMsg` (decompile/535240.c) — there is no
     *  separate "set group" action; re-grouping an existing friend reuses the
     *  same Add (action 1) packet, keyed by name rather than friend id. */
    static FriendSetGroup(targetName: string, group: string): OutPacket;
    /** FriendRequestAction.SetMemo = 6. Sets a friend note. */
    static FriendSetMemo(friendId: number, memo: string): OutPacket;
    static FriendBlock(friendId: number, block: boolean): OutPacket;
    /** FriendRequestAction.CapacityChange = 7. Adjusts the friend-list capacity. */
    static FriendCapacityChange(delta: number): OutPacket;
    static MiniRoomCreate(roomType: number, title: string, password: string, gameSpec: number): OutPacket;
    static MiniRoomCreateTrade(): OutPacket;
    static MiniRoomEnter(miniRoomId: number, password: string): OutPacket;
    static MiniRoomLeave(): OutPacket;
    static MiniRoomChat(text: string): OutPacket;
    static MiniRoomInvite(targetId: number): OutPacket;
    static TradePutItem(index: number, invType: number, position: number, quantity: number): OutPacket;
    static TradePutMoney(amount: number): OutPacket;
    static TradeConfirm(): OutPacket;
    static TradeCancel(): OutPacket;
    static ShopPutItem(invType: number, position: number, setCount: number, setSize: number, price: number): OutPacket;
    static ShopBuyItem(itemIndex: number, count: number): OutPacket;
    static ShopBalloonOpen(open: boolean): OutPacket;
    static EntrustedShopGoOut(): OutPacket;
    static EntrustedShopWithdrawMoney(): OutPacket;
    static EntrustedShopArrange(): OutPacket;
    static EntrustedShopBuyItem(index: number, count: number): OutPacket;
    /** Client sends when flipping a card. Opcode byte + MGP_TurnUpCard(68) + cardIdx + bSelected. */
    static MemoryGameTurnUpCard(cardIdx: number, bSelected: boolean): OutPacket;
    static MemoryGameReady(bReady: boolean): OutPacket;
    static MemoryGameStart(): OutPacket;
    static MemoryGameTieRequest(): OutPacket;
    static MemoryGameGiveUp(): OutPacket;
    static MemoryGameBan(): OutPacket;
    static RPSGameStart(): OutPacket;
    static RPSGameSelection(rpsChoice: number): OutPacket;
    static RPSGameTimeout(): OutPacket;
    static RPSGameContinue(): OutPacket;
    static RPSGameExit(): OutPacket;
    static RPSGameRetry(): OutPacket;
    static CheckNameChangePossible(characterId: number, secondaryPassword: string): OutPacket;
    static CheckTransferWorldPossible(characterId: number, secondaryPassword: string): OutPacket;
    static GatherItemRequest(updateTime: number, inventoryType: number): OutPacket;
    static SortItemRequest(updateTime: number, inventoryType: number): OutPacket;
    static SkillCancelRequest(skillId: number): OutPacket;
    static MapTransferRequest(transferType: number, canTransferContinent: boolean, targetField?: number): OutPacket;
    static AntiMacroItemUseRequest(targetCharacterName: string, pos: number, itemId: number): OutPacket;
    static AntiMacroAnswerRequest(answer: string): OutPacket;
    static PortableChairSitRequest(itemId: number): OutPacket;
    static PortalScrollUseRequest(updateTime: number, pos: number, itemId: number): OutPacket;
    static EntrustedShopCheckRequest(cashItemSn: bigint): OutPacket;
    static FuncKeyMappedModified(changes: ReadonlyArray<{
        keyIndex: number;
        type: number;
        actionId: number;
    }>): OutPacket;
    static QuickslotKeyMappedModified(keys: ReadonlyArray<number>): OutPacket;
    static PortalTeleportRequest(fieldKey: number, portalName: string, posX: number, posY: number, portalField12: number, portalField16: number): OutPacket;
    static NpcMoveRequest(objectId: number, oneTimeAction: number, chatIndex: number, movePath?: {
        originX: number;
        originY: number;
        originVx: number;
        originVy: number;
        elements: MoveElement[];
    }): OutPacket;
    static MobApplyCtrl(objectId: number, crc?: number): OutPacket;
    static UserSitRequest(fieldSeatId: number): OutPacket;
    static UserSkillPrepareRequest(skillId: number, slv: number, actionAndDir: number, attackSpeed: number, swallowMobId?: number): OutPacket;
    static UserPortalScriptRequest(fieldKey: number, portalName: string, posX: number, posY: number): OutPacket;
    /** 0x31: Create an expedition for the given quest ID. */
    static ExpeditionCreate(questId: number): OutPacket;
    /** 0x32: Invite a character by name to the expedition. */
    static ExpeditionInvite(targetName: string): OutPacket;
    /** 0x33: Response to an expedition invite. accept=9, reject=8. */
    static ExpeditionResponseInvite(masterName: string, accepted: boolean): OutPacket;
    /** 0x34: Withdraw from the current expedition. */
    static ExpeditionWithdraw(): OutPacket;
    /** 0x35: Kick a member from the expedition. */
    static ExpeditionKick(charId: number): OutPacket;
    /** 0x36: Change expedition master. */
    static ExpeditionChangeMaster(charId: number): OutPacket;
    /** 0x37: Change sub-party boss. */
    static ExpeditionChangeBoss(charId: number): OutPacket;
    /** 0x38: Relocate a party member to another sub-party. */
    static ExpeditionRelocateParty(charId: number, toIndex: number): OutPacket;
    /** 0x51: Register a party advertisement with the given quest group ID and title. */
    static PartyAdverRegisterCommit(questId: number, title: string): OutPacket;
    /** 0x53: Request party advertisement listings for the given quest ID. */
    static PartyAdverRequest(questId: number): OutPacket;
    /** 0x56: Response to a party/expedition apply request. result: 10=accept, 11=reject, 12=blocked. */
    static PartyAdverApplyResponse(result: number, partyId: number): OutPacket;
    static UserMiniMapClick(): OutPacket;
    /** Sub-action 0: CCashShop::SendLoadLockerRequest — request locker contents. */
    static CashShopLoadLocker(): OutPacket;
    /** Sub-action 1: CCashShop::SendLoadGiftRequest — request gift box contents. */
    static CashShopLoadGift(): OutPacket;
    /** Sub-action 2: CCashShop::SendLoadWishRequest — request wishlist. */
    static CashShopLoadWish(): OutPacket;
    /** Sub-action 3: CCashShop::SendBuyRequest — buy a single item by SN. */
    static CashShopBuy(sn: number): OutPacket;
    /** Sub-action 5: CCashShop::SendSetWishRequest — set the 10-slot wishlist. */
    static CashShopSetWish(sns: number[]): OutPacket;
    /** Sub-action 6: CCashShop::SendMoveLtoSRequest — move item from locker to inventory. */
    static CashShopMoveLtoS(sn: number): OutPacket;
    /** Sub-action 7: CCashShop::SendMoveStoLRequest — move item from inventory to locker. */
    static CashShopMoveStoL(sn: number): OutPacket;
    /** Sub-action 8: CCashShop::SendUseCouponRequest — redeem a coupon code. */
    static CashShopUseCoupon(couponCode: string): OutPacket;
    /** Sub-action 9: CCashShop::SendGiftCouponRequest — gift a coupon to a player. */
    static CashShopGiftCoupon(receiverName: string, couponCode: string): OutPacket;
    /** Sub-action 10: CCashShop::SendIncSlotCountRequest — purchase extra inventory slots. */
    static CashShopIncSlotCount(invType: number): OutPacket;
    /** Sub-action 11: CCashShop::SendIncTrunkCountRequest — purchase extra trunk slots. */
    static CashShopIncTrunkCount(): OutPacket;
    /** Sub-action 12: CCashShop::SendIncCharSlotCountRequest — purchase extra character slot. */
    static CashShopIncCharSlotCount(): OutPacket;
    /** Sub-action 13: CCashShop::SendIncBuyCharCountRequest — purchase extra buy-character count. */
    static CashShopIncBuyCharCount(): OutPacket;
    /** Sub-action 14: CCashShop::SendEnableEquipSlotExtRequest — extend an equip slot by days. */
    static CashShopEnableEquipSlotExt(bodyPartIndex: number, days: number): OutPacket;
    /** Sub-action 15: CCashShop::SendDestroyRequest — destroy a locker item by SN. */
    static CashShopDestroy(sn: number): OutPacket;
    /** Sub-action 16: CCashShop::SendExpireRequest — expire a locker item by SN. */
    static CashShopExpire(sn: number): OutPacket;
    /** Sub-action 17: CCashShop::SendRebateRequest — request rebate for a locker item. */
    static CashShopRebate(sn: number): OutPacket;
    /** Sub-action 18: CCashShop::SendCoupleRequest — buy a couple/linked item for a partner. */
    static CashShopCouple(sn: number, receiverName: string): OutPacket;
    /** Sub-action 19: CCashShop::SendBuyPackageRequest — buy a package deal by SNs. */
    static CashShopBuyPackage(sns: number[]): OutPacket;
    /** Sub-action 20: CCashShop::SendGiftPackageRequest — gift a package to a player. */
    static CashShopGiftPackage(receiverName: string, sn: number): OutPacket;
    /** Sub-action 21: CCashShop::SendBuyNormalRequest — buy multiple normal items at once. */
    static CashShopBuyNormal(count: number, sns: number[]): OutPacket;
    /** Sub-action 22: CCashShop::SendFriendShipRequest — buy a friendship item for another player. */
    static CashShopFriendShip(sn: number, receiverName: string): OutPacket;
    /** Sub-action 23: CCashShop::SendFreeCashItemRequest — claim a free cash item. */
    static CashShopFreeCashItem(sn: number): OutPacket;
    /** Sub-action 24: CCashShop::SendPurchaseRecordRequest — check purchase record for an item. */
    static CashShopPurchaseRecord(sn: number): OutPacket;
    /** Sub-action 25: CCashShop::SendChangeMaplePointRequest — convert Maple Points for an item. */
    static CashShopChangeMaplePoint(sn: number, amount: number): OutPacket;
    /** Sub-action 27: CCashShop::SendQueryCashRequest — query current NX/MaplePoint/Prepaid balances. */
    static CashShopQueryCash(): OutPacket;
    /** Sub-action 26: CCashShop::SendCashGachaponOpenRequest — open a cash gachapon ticket. */
    static CashShopCashGachaponOpen(sn: number): OutPacket;
    /** CCashShop::SendCheckNameChangePossiblePacket (decompile/488190.c). */
    static CashShopCheckNameChange(itemId: number, newName: string): OutPacket;
    /** CCashShop::SendNameChangeRequest — confirm name change after checking. */
    static CashShopNameChange(sn: number, newName: string): OutPacket;
    /** CCashShop::SendCheckTransferWorldPossiblePacket (decompile/4884C0.c). */
    static CashShopCheckTransferWorld(): OutPacket;
    /** CCashShop::SendTransferWorldRequest — transfer character to another world. */
    static CashShopTransferWorld(sn: number, worldName: string): OutPacket;
    static SitRequest(tTimeInterval: number): OutPacket;
    static GivePopularityRequest(targetName: string, incFame: boolean): OutPacket;
    static ActivatePetRequest(pos: number): OutPacket;
    static WaterOfLife(): OutPacket;
    static MigrateToShopRequest(bFromWishItem: boolean): OutPacket;
    static MigrateToITCRequest(): OutPacket;
    static TempExpUseRequest(): OutPacket;
    static UIOpenItemRequest(pos: number, itemId: number): OutPacket;
    static RemoteShopOpenRequest(pos: number): OutPacket;
    static BoobyTrapAlert(trapType: number): OutPacket;
    static PartyWanted(minLv: number, maxLv: number, count: number, jobFlag: number): OutPacket;
    static CancelPartyWanted(): OutPacket;
    static RegisterJunior(charName: string): OutPacket;
    static UnregisterJunior(charId: number): OutPacket;
    static UnregisterParent(): OutPacket;
    static RingDropRequest(itemId: number): OutPacket;
    static InvitationQuery(pos: number, itemId: number): OutPacket;
    static NewYearCardUseRequest(pos: number, itemId: number): OutPacket;
    static RandomMorphOtherRequest(pos: number, itemId: number): OutPacket;
    static WishListInput(wishList: string[], count: number): OutPacket;
    static RequestSessionValue(key: string, reset: boolean): OutPacket;
    static OpenShopRequest(pos: number, itemId: number, name: string, desc: string, minLevel: number, flags: number): OutPacket;
    static FollowCharacterRequest(charId: number, action: number): OutPacket;
    static StatChangeItemUseRequest(pos: number, itemId: number): OutPacket;
    static StatChangeItemUseRequestByPetQ(petName: string, pos: number, itemId: number): OutPacket;
    static DropMoneyRequest(amount: number): OutPacket;
    static SendInvitationRequest(pos: number, itemId: number): OutPacket;
    static PetAction(petLockerSN: bigint, type: number, action: number, chat: string): OutPacket;
    static PetInteractionRequest(petLockerSN: bigint, hasName: boolean, interactionIdx: number): OutPacket;
    static PetDropPickUpRequest(petLockerSN: bigint, x: number, y: number, dropId: number, cliCrc: number, pickupOthers: boolean, sweepForDrop: boolean, longRange: boolean, posCRC?: number, rectCrc?: number): OutPacket;
    static PetUpdateExceptionList(petLockerSN: bigint, itemIds: number[]): OutPacket;
}
//# sourceMappingURL=GameSender.d.ts.map