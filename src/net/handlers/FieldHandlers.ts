import { AvatarCodec, IsExtendSpJob } from './AvatarCodec.js';
import { InPacket } from '../packet/InPacket.js';
import { OutPacket } from '../packet/OutPacket.js';
import { CharacterDataDecoder } from '../packet/CharacterDataDecoder.js';
import { OutHeader, InHeader } from '../packet/OpCodes.js';
import { PacketRouter } from '../session/PacketRouter.js';
import { ClientSession } from '../session/ClientSession.js';
import { ScriptMessageType, ScriptMessageParam } from '../packet/ScriptMessageType.js';
import { MiniRoomType, MiniRoomProtocol as MiniRoomProtocolFull } from '../packet/MiniRoomProtocol.js';
import { ItemDecoder } from '../packet/ItemDecoder.js';
import { DecodeMovePath } from '../packet/MovePathDecoder.js';
import { MoveActionToStance } from '../../character/Stance.js';
import { SecondaryStat } from '../../character/SecondaryStat.js';
import {
  MessageType, LootSubType, QuestRecordState,
  PartyResultType, FriendResultType, GuildResultType, AllianceResultType,
  ShopResultType, TrunkResultType, TrunkFlag, MessengerAction,
  InventoryOpType, DropEnterType, DropLeaveType,
  WhisperFlag, ShopItemPrefix, FuncKeyInitType,
  MapleStat, MiniRoomProtocol,
} from '../protocol/Enums.js';
import {
  SetFieldArgs, StatChangedArgs, MobEnterArgs, MobMoveArgs, MobDamagedArgs,
  NpcEnterArgs, OtherCharEnterArgs, OtherCharMoveArgs, UserAttackArgs, AttackTargetInfo,
  DropEnterArgs, DropLeaveArgs, InventoryOpArg, UserChatArgs,
  ScriptMessageArgs, FuncKeyEntry, FootHoldInfoArgs, FootHoldStateEntry, TempStatEntry,
  UserEmotionArgs, UserEffectArgs, MobCtrlAckArgs, LootMessageArgs, QuestRecordArgs,
  PartyMember, PartyInviteArgs, PartyLoadArgs, FriendEntry, GuildLoadArgs,
  ShopOpenArgs, ShopResultArgs, TrunkResultArgs, MessengerResultArgs,
  SkillRecordEntry, QuickslotKey, WhisperReceiveArgs, CharacterInfoArgs,
  ShopItemEntry, CharacterInfoPet, MessengerMigratedEntry, MiniRoomArgs,
  SystemMessageArgs, CashItemExpireArgs, GiveBuffArgs, OpenUrlArgs,
  ReactorEnterArgs, ReactorChangeStateArgs, ReactorMoveArgs, ReactorLeaveArgs,
  EmployeeEnterArgs, SummonedEnterArgs, SummonedLeaveArgs,   SummonedMoveArgs,
  TownPortalEnterArgs, TownPortalLeaveArgs, AffectedAreaArgs,
  OpenGateCreateArgs, OpenGateRemoveArgs, ClaimResultArgs, ClaimSvrAvailableTimeArgs,
  CoupleMessageArgs, ObjectStateEntry, QuestTimeEntry, StalkResultEntry,
  QuizArgs, AdminResultArgs, AntiMacroResultArgs, DestroyShopResultArgs, MacroSlot,
  AdminShopDlgArgs, AdminShopResultArgs, StoreBankResultArgs, StoreBankActionArgs,
  CharacterSaleCheckIdResultArgs, CharacterSaleCreateResultArgs,
  MonsterCarnivalEnterArgs, MonsterCarnivalPersonalCpArgs, MonsterCarnivalTeamCpArgs,
  MonsterCarnivalRequestResultArgs, MonsterCarnivalRequestCannedArgs,
  MonsterCarnivalProcessForDeathArgs, MonsterCarnivalMemberOutArgs, MonsterCarnivalGameResultArgs,
  FamilyChartResultArgs, FamilyInfoResultArgs, FamilyResultArgs, FamilyJoinRequestArgs,
  FamilyJoinRequestResultArgs, FamilyJoinAcceptedArgs, FamilyPrivilegeListArgs,
  FamilyFamousPointIncResultArgs, FamilyNotifyLoginOrLogoutArgs, FamilySetPrivilegeArgs,
  FamilySummonRequestArgs,
  GuildBBSListResultArgs, GuildBBSViewEntryResultArgs, GuildBBSEntry, GuildBBSComment,
  WeddingGiftResultArgs, WeddingItemTab,
  ItemUpgradeResultArgs,
  InventoryGrowArgs, SetTamingMobInfoArgs, QuestClearArgs, GatherItemResultArgs, SortItemResultArgs,
  SueCharacterResultArgs, TradeMoneyLimitArgs, SetGenderArgs, TownPortalNotifyArgs, OpenGateNotifyArgs,
  MarriageRequestArgs, MarriageResultArgs, NotifyMarriedPartnerMapTransferArgs, CashPetFoodResultArgs,
  SetWeekEventMessageArgs, SetPotionDiscountRateArgs, MonsterBookSetCardArgs, MonsterBookSetCoverArgs,
  HourChangedArgs, MiniMapOnOffArgs, ConsultAuthkeyUpdateArgs, ClassCompetitionAuthkeyUpdateArgs,
  WebBoardAuthkeyUpdateArgs, SessionValueArgs, PartyValueArgs, FieldSetVariableArgs,
  BonusExpRateChangedArgs, PotionDiscountRateChangedArgs, NotifyLevelUpArgs, NotifyWeddingArgs,
  NotifyJobChangeArgs, MapleTVUseResArgs, AvatarMegaphoneResArgs, SuccessInUsegachaponBoxArgs,
  SetBuyEquipExtArgs, SetPassengerRequestArgs, ScriptProgressMessageArgs, DataCRCCheckFailedArgs,
  UpdateGMBoardArgs, ShowSlotMessageArgs, AccountMoreInfoArgs, FindFriendArgs, TransferChannelNotifyArgs,
  ForcedStatSetArgs, ShopLinkResultArgs, ImitatedNPCDataArgs, ImitatedNPCDataEntry, LimitedNPCDisableInfoArgs,
  WildHunterInfoArgs, DisallowedDeliveryQuestListArgs,
  HontaleTimerArgs, ChaosZakumTimerArgs, HontailTimerArgs, ZakumTimerArgs,
  RPSGameDlgArgs, ParcelDlgArgs, SummonedAttackArgs, SummonedSkillArgs, SummonedHitArgs,
  MobCrcKeyChangedArgs, NpcChangeControllerArgs, PetConsumeItemInitArgs, PetConsumeMPItemInitArgs,
  VegaResultArgs, AuthenCodeChangedArgs, LogoutGiftArgs, EntrustedShopCheckResultArgs, FieldEffectArgs,
  ClockArgs, KillCountInfoArgs, MessageBoxEnterFieldArgs, MessageBoxLeaveFieldArgs,
  MassacreIncGaugeArgs, MassacreResultArgs,
  AllianceMember, AllianceLoadArgs,
  ExpeditionResultArgs, PartyAdverResultArgs, ExpeditionApplyArgs,
  PartyAdverData, ExpeditionAdverData, ExpeditionData,
  ExpeditionMember, ExpeditionSubPartyData, PartyAdverMember,
  GivePopularityResultArgs, MemoResultArgs, MapTransferResultArgs,
  IncubatorResultArgs, ShopScannerResultArgs, BridleMobCatchFailArgs,
  ImitatedNPCResultArgs, SetAvatarMegaphoneArgs, CancelNameChangeResultArgs,
  CancelTransferWorldResultArgs, FakeGMNoticeArgs, NewYearCardResArgs,
  RandomMorphResArgs, CakePieEventResultArgs, StageChangeArgs, DragonBallBoxArgs,
  UserChatHistoryArgs, UserADBoardArgs,
  SetConsumeItemEffectArgs, ShowItemUpgradeEffectArgs, ShowItemHyperUpgradeEffectArgs,
  ShowItemOptionUpgradeEffectArgs, ShowItemReleaseEffectArgs, ShowItemUnreleaseEffectArgs,
  UserHitByUserArgs, UserTeslaTriangleArgs, UserFollowCharacterArgs,
  UserShowPQRewardArgs, UserSetPhaseArgs, ShowRecoverUpgradeCountEffectArgs,
  UserMovingShootAttackPrepareArgs, UserHitArgs, UserSetActiveEffectItemArgs,
  UserShowUpgradeTombEffectArgs, UserSetTemporaryStatArgs, UserResetTemporaryStatArgs, TempStatBuff,
  UserReceiveHPArgs, UserGuildNameChangedArgs, UserGuildMarkChangedArgs, UserThrowGrenadeArgs,
  PetActivatedArgs, PetEvolArgs, PetMoveArgs, PetActionArgs,
  PetNameChangeArgs, PetLoadExceptionListArgs, PetActionCommandArgs,
  DragonMoveArgs, DragonAfterMoveArgs, DragonActionArgs,
  MobStatSetArgs, MobStatResetArgs, MobSuspendResetArgs, MobAffectedArgs,
  MobCatchEffectArgs, MobEffectByItemArgs, MobIncChargeCountArgs,
  MobEscortFullPathArgs, MobEscortStopPermArgs, MobEscortStopSayArgs,
  MobEscortReturnBeforeArgs, MobNextAttackArgs, MobAttackedByMobArgs,
  NpcTemplatePacketArgs,
} from './PacketArgs.js';
import { SetITCArgs, SetCashShopArgs } from '../../domain/CashShopData.js';
import { CashShopDecoder } from '../packet/CashShopDecoder.js';
import { AvatarLook } from '../../domain/AvatarLook.js';

const PartyMax = 6;

export class FieldHandlers {
  onSetField: ((args: SetFieldArgs) => void) | null = null;
  /** CUIEventAlarm trigger: fired when SetField carries nNotifierCheck > 0. OG decompile/71A0A0.c. TODO_AUDIT.md Hundred-and-sixty-eighth pass. */
  onEventAlarm: ((title: string, lines: string[]) => void) | null = null;

  private _currentJob = 0;
  // OG: CField::FieldFactory's WZ `info/fieldType` switch (TODO_AUDIT.md
  // Eighty-ninth pass) — 11 is CField_MonsterCarnivalRevive, which decodes
  // a different (1-byte) shape for opcode 346 than the normal 10-byte
  // CField_MonsterCarnival room. Set by the caller (GameStage) right after
  // loading each map, mirroring the `_currentJob` precedent above.
  private _currentFieldType = 0;
  setCurrentFieldType(fieldType: number): void { this._currentFieldType = fieldType; }
  onMigrateCommand: ((host: Uint8Array, port: number) => void) | null = null;
  onStatChanged: ((args: StatChangedArgs) => void) | null = null;
  onMobEnter: ((args: MobEnterArgs) => void) | null = null;
  onMobLeave: ((mobId: number, leaveType: number) => void) | null = null;
  onMobMove: ((args: MobMoveArgs) => void) | null = null;
  onMobDamaged: ((args: MobDamagedArgs) => void) | null = null;
  onMobChangeController: ((mobId: number, isCtrl: boolean) => void) | null = null;
  onMobCtrlAck: ((args: MobCtrlAckArgs) => void) | null = null;
  onMobHpIndicator: ((mobId: number, pct: number) => void) | null = null;
  onMobSpecialEffectBySkill: ((args: { mobId: number; skillId: number; casterCharId: number; delay: number }) => void) | null = null;
  onMobSkillDelay: ((args: { mobId: number; delayTime: number; skillId: number; slv: number; option: number }) => void) | null = null;
  onMobSpeaking: ((args: { mobId: number; speakInfoIdx: number; speechLineIdx: number }) => void) | null = null;
  onNpcEnter: ((args: NpcEnterArgs) => void) | null = null;
  onNpcLeave: ((objId: number) => void) | null = null;
  onUserEnter: ((args: OtherCharEnterArgs) => void) | null = null;
  onUserLeave: ((charId: number) => void) | null = null;
  onUserMove: ((args: OtherCharMoveArgs) => void) | null = null;
  onUserAttack: ((args: UserAttackArgs) => void) | null = null;
  onUserEmotion: ((args: UserEmotionArgs) => void) | null = null;
  onUserEffect: ((args: UserEffectArgs) => void) | null = null;
  onUserSetActivePortableChair: ((args: { charId: number; itemId: number }) => void) | null = null;
  // OG CUserRemote::OnAvatarModified (0x954110): flag byte + optional fields.
  onUserAvatarModified: ((args: {
    charId: number;
    look?: AvatarLook;
    speed?: number;
    carryItemEffect?: number;
    coupleItemSN?: bigint;
    pairItemSN?: bigint;
    coupleCharacterId?: number;
    friendshipItemSN?: bigint;
    friendshipPairItemSN?: bigint;
    friendCharacterId?: number;
    marriageCharacterId?: number;
    marriagePairCharacterId?: number;
    weddingRingId?: number;
    completedSetItemId: number;
  }) => void) | null = null;
  onCharacterInfo: ((args: CharacterInfoArgs) => void) | null = null;
  onDropEnter: ((args: DropEnterArgs) => void) | null = null;
  onDropLeave: ((args: DropLeaveArgs) => void) | null = null;
  onIncExp: ((exp: number) => void) | null = null;
  onIncMoney: ((money: number) => void) | null = null;
  onLootMessage: ((args: LootMessageArgs) => void) | null = null;
  onSystemMessage: ((args: SystemMessageArgs) => void) | null = null;
  onCashItemExpire: ((args: CashItemExpireArgs) => void) | null = null;
  onGiveBuff: ((args: GiveBuffArgs) => void) | null = null;
  onIncSp: ((value: number) => void) | null = null;
  onIncFame: ((value: number) => void) | null = null;
  onIncGp: ((value: number) => void) | null = null;
  onOpenUrl: ((args: OpenUrlArgs) => void) | null = null;
  onGeneralItemExpire: ((itemIds: number[]) => void) | null = null;
  onItemProtectExpire: ((itemIds: number[]) => void) | null = null;
  onItemExpireReplace: ((messages: string[]) => void) | null = null;
  onWheelOfFortune: ((text: string) => void) | null = null;
  onSkillExpire: ((skillIds: number[]) => void) | null = null;
  onInventoryOperation: ((ops: InventoryOpArg[]) => void) | null = null;
  onUserChat: ((args: UserChatArgs) => void) | null = null;
  onGroupMessage: ((groupType: number, fromName: string, text: string, charId: number) => void) | null = null;
  onWhisper: ((args: WhisperReceiveArgs) => void) | null = null;
  onPartyInvite: ((args: PartyInviteArgs) => void) | null = null;
  onPartyLoad: ((args: PartyLoadArgs) => void) | null = null;
  onPartyBossChanged: ((newBossCharId: number) => void) | null = null;
  onPartyMemberStatChanged: ((args: { charId: number; level: number; job: number }) => void) | null = null;
  onFriendList: ((friends: FriendEntry[]) => void) | null = null;
  onFriendRequest: ((args: { friendId: number; message: string; x: number; y: number }) => void) | null = null;
  onFriendStatusChanged: ((args: { charId: number; online: boolean; channel: number }) => void) | null = null;
  onFriendUpdate: ((charId: number, channel: number) => void) | null = null;
  onGuildMemberOnline: ((charId: number, online: boolean) => void) | null = null;
  onGuildMemberJoin: ((charId: number, name: string, job: number, level: number, grade: number, online: boolean) => void) | null = null;
  onGuildMemberLeave: ((charId: number) => void) | null = null;
  onGuildLoad: ((args: GuildLoadArgs | null) => void) | null = null;
  onGuildSetMarkPrompt: (() => void) | null = null;
  onAllianceLoad: ((args: AllianceLoadArgs | null) => void) | null = null;
  onScriptMessage: ((args: ScriptMessageArgs) => void) | null = null;
  onShopOpen: ((args: ShopOpenArgs) => void) | null = null;
  onShopResult: ((args: ShopResultArgs) => void) | null = null;
  onAdminShopDlg: ((args: AdminShopDlgArgs) => void) | null = null;
  onAdminShopResult: ((args: AdminShopResultArgs) => void) | null = null;
  onStoreBankResult: ((args: StoreBankResultArgs) => void) | null = null;
  onStoreBankAction: ((args: StoreBankActionArgs) => void) | null = null;
  onCharacterSaleCheckIdResult: ((args: CharacterSaleCheckIdResultArgs) => void) | null = null;
  onCharacterSaleCreateResult: ((args: CharacterSaleCreateResultArgs) => void) | null = null;
  onMonsterCarnivalEnter: ((args: MonsterCarnivalEnterArgs) => void) | null = null;
  onMonsterCarnivalPersonalCp: ((args: MonsterCarnivalPersonalCpArgs) => void) | null = null;
  onMonsterCarnivalTeamCp: ((args: MonsterCarnivalTeamCpArgs) => void) | null = null;
  onMonsterCarnivalRequestResult: ((args: MonsterCarnivalRequestResultArgs) => void) | null = null;
  onMonsterCarnivalRequestCanned: ((args: MonsterCarnivalRequestCannedArgs) => void) | null = null;
  onMonsterCarnivalProcessForDeath: ((args: MonsterCarnivalProcessForDeathArgs) => void) | null = null;
  onMonsterCarnivalMemberOut: ((args: MonsterCarnivalMemberOutArgs) => void) | null = null;
  onMonsterCarnivalGameResult: ((args: MonsterCarnivalGameResultArgs) => void) | null = null;
  onFamilyChartResult: ((args: FamilyChartResultArgs) => void) | null = null;
  onFamilyInfoResult: ((args: FamilyInfoResultArgs) => void) | null = null;
  onFamilyResult: ((args: FamilyResultArgs) => void) | null = null;
  onFamilyJoinRequest: ((args: FamilyJoinRequestArgs) => void) | null = null;
  onFamilyJoinRequestResult: ((args: FamilyJoinRequestResultArgs) => void) | null = null;
  onFamilyJoinAccepted: ((args: FamilyJoinAcceptedArgs) => void) | null = null;
  onFamilyPrivilegeList: ((args: FamilyPrivilegeListArgs) => void) | null = null;
  onFamilyFamousPointIncResult: ((args: FamilyFamousPointIncResultArgs) => void) | null = null;
  onFamilyNotifyLoginOrLogout: ((args: FamilyNotifyLoginOrLogoutArgs) => void) | null = null;
  onFamilySetPrivilege: ((args: FamilySetPrivilegeArgs) => void) | null = null;
  onFamilySummonRequest: ((args: FamilySummonRequestArgs) => void) | null = null;
  onGuildBBSListResult: ((args: GuildBBSListResultArgs) => void) | null = null;
  onGuildBBSViewEntryResult: ((args: GuildBBSViewEntryResultArgs) => void) | null = null;
  onGuildBBSEntryNotFound: (() => void) | null = null;
  onWeddingGiftResult: ((args: WeddingGiftResultArgs) => void) | null = null;
  onItemUpgradeResult: ((args: ItemUpgradeResultArgs) => void) | null = null;
  onInventoryGrow: ((args: InventoryGrowArgs) => void) | null = null;
  onSetTamingMobInfo: ((args: SetTamingMobInfoArgs) => void) | null = null;
  onQuestClear: ((args: QuestClearArgs) => void) | null = null;
  onGatherItemResult: ((args: GatherItemResultArgs) => void) | null = null;
  onSortItemResult: ((args: SortItemResultArgs) => void) | null = null;
  onSueCharacterResult: ((args: SueCharacterResultArgs) => void) | null = null;
  onTradeMoneyLimit: ((args: TradeMoneyLimitArgs) => void) | null = null;
  onExpeditionResult: ((args: ExpeditionResultArgs) => void) | null = null;
  onPartyAdverResult: ((args: PartyAdverResultArgs) => void) | null = null;
  onExpeditionApply: ((args: ExpeditionApplyArgs) => void) | null = null;
  onSetGender: ((args: SetGenderArgs) => void) | null = null;
  onTownPortalNotify: ((args: TownPortalNotifyArgs) => void) | null = null;
  onOpenGateNotify: ((args: OpenGateNotifyArgs) => void) | null = null;
  onMarriageRequest: ((args: MarriageRequestArgs) => void) | null = null;
  onMarriageResult: ((args: MarriageResultArgs) => void) | null = null;
  onNotifyMarriedPartnerMapTransfer: ((args: NotifyMarriedPartnerMapTransferArgs) => void) | null = null;
  onCashPetFoodResult: ((args: CashPetFoodResultArgs) => void) | null = null;
  onSetWeekEventMessage: ((args: SetWeekEventMessageArgs) => void) | null = null;
  onSetPotionDiscountRate: ((args: SetPotionDiscountRateArgs) => void) | null = null;
  onMonsterBookSetCard: ((args: MonsterBookSetCardArgs) => void) | null = null;
  onMonsterBookSetCover: ((args: MonsterBookSetCoverArgs) => void) | null = null;
  onHourChanged: ((args: HourChangedArgs) => void) | null = null;
  onMiniMapOnOff: ((args: MiniMapOnOffArgs) => void) | null = null;
  onConsultAuthkeyUpdate: ((args: ConsultAuthkeyUpdateArgs) => void) | null = null;
  onClassCompetitionAuthkeyUpdate: ((args: ClassCompetitionAuthkeyUpdateArgs) => void) | null = null;
  onWebBoardAuthkeyUpdate: ((args: WebBoardAuthkeyUpdateArgs) => void) | null = null;
  onSessionValue: ((args: SessionValueArgs) => void) | null = null;
  onPartyValue: ((args: PartyValueArgs) => void) | null = null;
  onFieldSetVariable: ((args: FieldSetVariableArgs) => void) | null = null;
  onBonusExpRateChanged: ((args: BonusExpRateChangedArgs) => void) | null = null;
  onPotionDiscountRateChanged: ((args: PotionDiscountRateChangedArgs) => void) | null = null;
  onNotifyLevelUp: ((args: NotifyLevelUpArgs) => void) | null = null;
  onNotifyWedding: ((args: NotifyWeddingArgs) => void) | null = null;
  onNotifyJobChange: ((args: NotifyJobChangeArgs) => void) | null = null;
  onMapleTVUseRes: ((args: MapleTVUseResArgs) => void) | null = null;
  onAvatarMegaphoneRes: ((args: AvatarMegaphoneResArgs) => void) | null = null;
  onSuccessInUsegachaponBox: ((args: SuccessInUsegachaponBoxArgs) => void) | null = null;
  onSetBuyEquipExt: ((args: SetBuyEquipExtArgs) => void) | null = null;
  onSetPassengerRequest: ((args: SetPassengerRequestArgs) => void) | null = null;
  onScriptProgressMessageNotify: ((args: ScriptProgressMessageArgs) => void) | null = null;
  onDataCRCCheckFailed: ((args: DataCRCCheckFailedArgs) => void) | null = null;
  onUpdateGMBoard: ((args: UpdateGMBoardArgs) => void) | null = null;
  onShowSlotMessage: ((args: ShowSlotMessageArgs) => void) | null = null;
  onAccountMoreInfo: ((args: AccountMoreInfoArgs) => void) | null = null;
  onFindFriend: ((args: FindFriendArgs) => void) | null = null;
  onTransferChannelNotify: ((args: TransferChannelNotifyArgs) => void) | null = null;
  onForcedStatSet: ((args: ForcedStatSetArgs) => void) | null = null;
  onForcedStatReset: (() => void) | null = null;
  onOpenFullClientDownloadLink: (() => void) | null = null;
  onShopLinkResult: ((args: ShopLinkResultArgs) => void) | null = null;
  onImitatedNPCData: ((args: ImitatedNPCDataArgs) => void) | null = null;
  onLimitedNPCDisableInfo: ((args: LimitedNPCDisableInfoArgs) => void) | null = null;
  onClearAvatarMegaphone: (() => void) | null = null;
  onCancelNameChangebyOther: (() => void) | null = null;
  onWildHunterInfo: ((args: WildHunterInfoArgs) => void) | null = null;
  onAskWhetherUsePamsSong: (() => void) | null = null;
  onDisallowedDeliveryQuestList: ((args: DisallowedDeliveryQuestListArgs) => void) | null = null;
  onHontaleTimer: ((args: HontaleTimerArgs) => void) | null = null;
  onChaosZakumTimer: ((args: ChaosZakumTimerArgs) => void) | null = null;
  onHontailTimer: ((args: HontailTimerArgs) => void) | null = null;
  onZakumTimer: ((args: ZakumTimerArgs) => void) | null = null;
  onRPSGameDlg: ((args: RPSGameDlgArgs) => void) | null = null;
  onParcelDlg: ((args: ParcelDlgArgs) => void) | null = null;
  onSummonedAttack: ((args: SummonedAttackArgs) => void) | null = null;
  onSummonedSkill: ((args: SummonedSkillArgs) => void) | null = null;
  onSummonedHit: ((args: SummonedHitArgs) => void) | null = null;
  onMobCrcKeyChanged: ((args: MobCrcKeyChangedArgs) => void) | null = null;
  onNpcChangeController: ((args: NpcChangeControllerArgs) => void) | null = null;
  onNpcMove: ((args: { npcId: number; actionIdx: number; chatIdx: number }) => void) | null = null;
  onNpcUpdateLimitedInfo: ((args: { npcId: number; enabled: boolean }) => void) | null = null;
  onNpcSetSpecialAction: ((args: { npcId: number; actionName: string }) => void) | null = null;
  onPetConsumeItemInit: ((args: PetConsumeItemInitArgs) => void) | null = null;
  onPetConsumeMPItemInit: ((args: PetConsumeMPItemInitArgs) => void) | null = null;
  onVegaResult: ((args: VegaResultArgs) => void) | null = null;
  onAuthenCodeChanged: ((args: AuthenCodeChangedArgs) => void) | null = null;
  onLogoutGift: ((args: LogoutGiftArgs) => void) | null = null;
  onTrunkResult: ((args: TrunkResultArgs) => void) | null = null;
  onMessengerResult: ((args: MessengerResultArgs) => void) | null = null;
  onQuestRecord: ((args: QuestRecordArgs) => void) | null = null;
  onSkillRecordResult: ((records: SkillRecordEntry[]) => void) | null = null;
  onTemporaryStatSet: ((entries: TempStatEntry[]) => void) | null = null;
  onTemporaryStatReset: ((mask: number) => void) | null = null;
  secondaryStat = new SecondaryStat();
  onFuncKeyMappedInit: ((entries: FuncKeyEntry[]) => void) | null = null;
  onQuickslotInit: ((keys: QuickslotKey[]) => void) | null = null;
  onFootHoldInfo: ((args: FootHoldInfoArgs) => void) | null = null;
  onMiniRoom: ((action: number, args: MiniRoomArgs) => void) | null = null;
  onReactorEnter: ((args: ReactorEnterArgs) => void) | null = null;
  onReactorLeave: ((args: ReactorLeaveArgs) => void) | null = null;
  onReactorChangeState: ((args: ReactorChangeStateArgs) => void) | null = null;
  onReactorMove: ((args: ReactorMoveArgs) => void) | null = null;
  onEmployeeEnter: ((args: EmployeeEnterArgs) => void) | null = null;
  onEmployeeLeave: ((objId: number) => void) | null = null;
  onSummonedEnter: ((args: SummonedEnterArgs) => void) | null = null;
  onSummonedLeave: ((args: SummonedLeaveArgs) => void) | null = null;
  onSummonedMove: ((args: SummonedMoveArgs) => void) | null = null;
  onTownPortalEnter: ((args: TownPortalEnterArgs) => void) | null = null;
  onTownPortalLeave: ((args: TownPortalLeaveArgs) => void) | null = null;
  onOpenSkillGuide: (() => void) | null = null;
  onAffectedAreaCreate: ((args: AffectedAreaArgs) => void) | null = null;
  onAffectedAreaRemove: ((objId: number) => void) | null = null;
  onOpenGateCreate: ((args: OpenGateCreateArgs) => void) | null = null;
  onOpenGateRemove: ((args: OpenGateRemoveArgs) => void) | null = null;
  onClaimResult: ((args: ClaimResultArgs) => void) | null = null;
  onClaimSvrAvailableTime: ((args: ClaimSvrAvailableTimeArgs) => void) | null = null;
  onClaimSvrStatusChanged: ((connected: boolean) => void) | null = null;
  onMakerResult: ((recipeId: number, success: boolean, items: Array<{ itemId: number; count: number }>) => void) | null = null;
  onFieldEffect: ((args: FieldEffectArgs) => void) | null = null;
  onBlowWeather: ((weatherId: number, text: string) => void) | null = null;
  onPlayJukeBox: ((musicId: number) => void) | null = null;
  onClock: ((args: ClockArgs) => void) | null = null;
  onDestroyClock: (() => void) | null = null;
  onKillCountInfo: ((args: KillCountInfoArgs) => void) | null = null;
  onMessageBoxCreateFailed: (() => void) | null = null;
  onMessageBoxEnterField: ((args: MessageBoxEnterFieldArgs) => void) | null = null;
  onMessageBoxLeaveField: ((args: MessageBoxLeaveFieldArgs) => void) | null = null;
  onMassacreIncGauge: ((args: MassacreIncGaugeArgs) => void) | null = null;
  onMassacreResult: ((args: MassacreResultArgs) => void) | null = null;
  onBroadcastMsg: ((msgType: number, text: string | null) => void) | null = null;
  onEntrustedShopCheckResult: ((args: EntrustedShopCheckResultArgs) => void) | null = null;
  onSkillUseResult: ((ack: number) => void) | null = null;
  onSkillLearnItemResult: ((args: { charId: number; isMasterybook: boolean; used: boolean; succeed: boolean }) => void) | null = null;
  onSkillResetItemResult: ((args: { charId: number; succeed: boolean }) => void) | null = null;
  onSkillCooltimeSet: ((skillId: number, remainSec: number) => void) | null = null;
  onSkillPrepare: ((args: { charId: number; skillId: number; slv: number; actionAndDir: number; attackSpeed: number }) => void) | null = null;
  onSkillCancel: ((args: { charId: number; skillId: number }) => void) | null = null;
  onTransferFieldReqIgnored: ((reason: number) => void) | null = null;
  onTransferChannelReqIgnored: ((reason: number) => void) | null = null;
  onFieldSpecificData: (() => void) | null = null;
  onCoupleMessage: ((args: CoupleMessageArgs) => void) | null = null;
  onSummonItemInavailable: (() => void) | null = null;
  onFieldObstacleOnOff: ((entries: ObjectStateEntry[]) => void) | null = null;
  onFieldObstacleAllReset: (() => void) | null = null;
  onAdminResult: ((args: AdminResultArgs) => void) | null = null;
  onQuiz: ((args: QuizArgs) => void) | null = null;
  onFieldDesc: ((index: number) => void) | null = null;
  onSetQuestClear: (() => void) | null = null;
  onSetQuestTime: ((entries: QuestTimeEntry[]) => void) | null = null;
  onWarnMessage: ((text: string) => void) | null = null;
  onSetObjectState: ((entries: ObjectStateEntry[]) => void) | null = null;
  onStalkResult: ((entries: StalkResultEntry[]) => void) | null = null;
  onRequestFootHoldInfo: (() => void) | null = null;
  onAntiMacroResult: ((args: AntiMacroResultArgs) => void) | null = null;
  onDestroyShopResult: ((args: DestroyShopResultArgs) => void) | null = null;
  // OG: CUserLocal::OnFieldFadeInOut (decompile 0x9057a3)
  onFieldFadeInOut: ((color: number, duration: number, fadeOut: number, fadeTime: number) => void) | null = null;
  // OG: CUserLocal::OnFieldFadeOutForce (decompile 0x9057f4)
  onFieldFadeOutForce: ((color: number) => void) | null = null;
  // OG: CUserLocal::OnNotifyHPDecByField (decompile 0x90fedb)
  onNotifyHPDecByField: ((hpDec: number) => void) | null = null;
  // OG: CUserLocal::OnSetDirectionMode (decompile 0x905502)
  onSetDirectionMode: ((bDirection: boolean, afterDelay: number) => void) | null = null;
  onMacroSysDataInit: ((slots: MacroSlot[]) => void) | null = null;
  onSetITC: ((args: SetITCArgs) => void) | null = null;
  onSetCashShop: ((args: SetCashShopArgs) => void) | null = null;

  // ── CWvsContext pure-gap callbacks (IDA_NEW_GAPS.md) ─────────────────
  onGivePopularityResult: ((args: GivePopularityResultArgs) => void) | null = null;
  onMemoResult: ((args: MemoResultArgs) => void) | null = null;
  onMapTransferResult: ((args: MapTransferResultArgs) => void) | null = null;
  onIncubatorResult: ((args: IncubatorResultArgs) => void) | null = null;
  onShopScannerResult: ((args: ShopScannerResultArgs) => void) | null = null;
  onBridleMobCatchFail: ((args: BridleMobCatchFailArgs) => void) | null = null;
  onImitatedNPCResult: ((args: ImitatedNPCResultArgs) => void) | null = null;
  onSetAvatarMegaphone: ((args: SetAvatarMegaphoneArgs) => void) | null = null;
  onCancelNameChangeResult: ((args: CancelNameChangeResultArgs) => void) | null = null;
  onCancelTransferWorldResult: ((args: CancelTransferWorldResultArgs) => void) | null = null;
  onFakeGMNotice: ((args: FakeGMNoticeArgs) => void) | null = null;
  onNewYearCardRes: ((args: NewYearCardResArgs) => void) | null = null;
  onRandomMorphRes: ((args: RandomMorphResArgs) => void) | null = null;
  onCakePieEventResult: ((args: CakePieEventResultArgs) => void) | null = null;
  onStageChange: ((args: StageChangeArgs) => void) | null = null;
  onDragonBallBox: ((args: DragonBallBoxArgs) => void) | null = null;

  // ── CUserPool common-packet callbacks (IDA_NEW_GAPS.md) ────────────
  onUserChatHistory: ((args: UserChatHistoryArgs) => void) | null = null;
  onUserADBoard: ((args: UserADBoardArgs) => void) | null = null;
  onSetConsumeItemEffect: ((args: SetConsumeItemEffectArgs) => void) | null = null;
  onShowItemUpgradeEffect: ((args: ShowItemUpgradeEffectArgs) => void) | null = null;
  onShowItemHyperUpgradeEffect: ((args: ShowItemHyperUpgradeEffectArgs) => void) | null = null;
  onShowItemOptionUpgradeEffect: ((args: ShowItemOptionUpgradeEffectArgs) => void) | null = null;
  onShowItemReleaseEffect: ((args: ShowItemReleaseEffectArgs) => void) | null = null;
  onShowItemUnreleaseEffect: ((args: ShowItemUnreleaseEffectArgs) => void) | null = null;
  onUserHitByUser: ((args: UserHitByUserArgs) => void) | null = null;
  onUserTeslaTriangle: ((args: UserTeslaTriangleArgs) => void) | null = null;
  onUserFollowCharacter: ((args: UserFollowCharacterArgs) => void) | null = null;
  onUserShowPQReward: ((args: UserShowPQRewardArgs) => void) | null = null;
  onUserSetPhase: ((args: UserSetPhaseArgs) => void) | null = null;
  onShowRecoverUpgradeCountEffect: ((args: ShowRecoverUpgradeCountEffectArgs) => void) | null = null;

  // ── CUserPool remote-packet callbacks (IDA_NEW_GAPS.md) ────────────
  onUserMovingShootAttackPrepare: ((args: UserMovingShootAttackPrepareArgs) => void) | null = null;
  onUserHit: ((args: UserHitArgs) => void) | null = null;
  onUserSetActiveEffectItem: ((args: UserSetActiveEffectItemArgs) => void) | null = null;
  onUserShowUpgradeTombEffect: ((args: UserShowUpgradeTombEffectArgs) => void) | null = null;
  onUserSetTemporaryStat: ((args: UserSetTemporaryStatArgs) => void) | null = null;
  onUserResetTemporaryStat: ((args: UserResetTemporaryStatArgs) => void) | null = null;
  onUserReceiveHP: ((args: UserReceiveHPArgs) => void) | null = null;
  onUserGuildNameChanged: ((args: UserGuildNameChangedArgs) => void) | null = null;
  onUserGuildMarkChanged: ((args: UserGuildMarkChangedArgs) => void) | null = null;
  onUserThrowGrenade: ((args: UserThrowGrenadeArgs) => void) | null = null;

  // ── CUserLocal packet callbacks (medium-priority gaps) ─────────────
  // OG: CUserLocal::OnPlayEventSound (0x916d60) — decodeStr → play_field_sound(name, 100)
  onPlayEventSound: ((soundName: string) => void) | null = null;
  // OG: CUserLocal::OnPlayMinigameSound (0x916e10) — decodeStr → play_minigame_sound(name, 100)
  onPlayMinigameSound: ((soundName: string) => void) | null = null;
  // OG: CUserLocal::OnOpenClassCompetitionPage (0x9055a8) — creates CClassCompetition UI if not exists
  onOpenClassCompetitionPage: (() => void) | null = null;
  // OG: CUserLocal::OnHireTutor (0x90e5b9) — decode1(bSpawn), creates/removes CTutor
  onHireTutor: ((bSpawn: boolean) => void) | null = null;
  // OG: CUserLocal::OnTutorMsg (0x916f60) — decode1(flag), then idx+duration or msg+width+duration
  onTutorMsg: ((isIndex: boolean, idxOrMsg: number | string, duration: number, width?: number) => void) | null = null;
  // OG: CUserLocal::OnResignQuestReturn (0x905720) — decode2(questId) → TryRegisterAutoStartQuest + DeleteQuest
  onResignQuestReturn: ((questId: number) => void) | null = null;
  // OG: CUserLocal::OnPassMateName (0x918283) — decode2(questId) + decodeStr(mateName) → SetQuestMateName
  onPassMateName: ((questId: number, mateName: string) => void) | null = null;
  // OG: CUserLocal::OnBuffzoneEffect (0x9183a0) — decode4(itemId), loads WZ item property for buff zone visual
  onBuffzoneEffect: ((itemId: number) => void) | null = null;
  // OG: CUserLocal::OnGoToCommoditySN (0x90576f) — decode4(commoditySN) → SendMigrateToShopRequest
  onGoToCommoditySN: ((commoditySN: number) => void) | null = null;
  // OG: CUserLocal::OnDamageMeter (0x905620) — decode4(duration) → CDamageMeter::SetTimer
  onDamageMeter: ((duration: number) => void) | null = null;
  // OG: CUserLocal::OnTimeBombAttack (0x9323f0) — decode5(skillId,nUnknown,nInvincible,nImpactDeg,nDamage)
  onTimeBombAttack: ((args: { skillId: number; nUnknown: number; nInvincible: number; nUserImpactDeg: number; nDamage: number }) => void) | null = null;
  // OG: CUser::OnPassiveMove (0x8dea10) — decode charId, then CMovePath::OnMovePacket for driven chars
  onUserPassiveMove: ((charId: number) => void) | null = null;
  // OG: CUserLocal::OnFollowCharacterFailed (0x910e92) — decode4(failedCharId) + decode4(reason)
  onFollowCharacterFailed: ((failedCharId: number, reason: number) => void) | null = null;
  // OG: CUserLocal::OnVengeanceSkillApply (0x909b10) — decode4(skillId), if 3120010 → DoActiveSkill_MeleeAttack
  onVengeanceSkillApply: ((skillId: number) => void) | null = null;
  // OG: CUserLocal::OnExJablinApply (0x9034e0) — no decode, sets m_bNextShootExJablin = 1
  onExJablinApply: (() => void) | null = null;
  // OG: CUserLocal::OnAskAPSPEvent (0x90f10c) — decode4(charId) + decode4(nReason), shows YesNo dialog
  onAskAPSPEvent: ((charId: number, nReason: number) => void) | null = null;
  // OG: CUser::OnRandomEmotion (0x8e34b0) — decode4(itemId) → random emotion from AreaBuffItem
  onUserRandomEmotion: ((itemId: number) => void) | null = null;
  // OG: CUserLocal::OnSetStandAloneMode (0x90555f) — decode1(standAloneMode)
  onSetStandAloneMode: ((standAloneMode: number) => void) | null = null;
  // OG: CUserLocal::OnQuestResult (0x914080) — decode1(subAction), 13-case switch, complex quest UI
  onQuestResult: ((subAction: number, payload: Uint8Array) => void) | null = null;
  // OG: CUserLocal::OnTeleport (0x913ff0) — server confirms teleport position
  onUserTeleport: ((args: { x: number; y: number }) => void) | null = null;
  // OG: CUserLocal::OnIncComboResponse (0x91a970) — server sends combo count
  onIncComboResponse: ((nCombo: number) => void) | null = null;
  // OG: CUserLocal::OnRadioSchedule (0x918120) — decodeStr + decode4 → CRadioManager::Play
  onRadioSchedule: ((musicFile: string, duration: number) => void) | null = null;
  // OG: CUserLocal::OnQuestGuideResult (case 274) — pure UI minimap arrow, no-op in this client
  onQuestGuideResult: ((questId: number) => void) | null = null;
  // OG: CUserLocal::OnDeliveryQuest (case 275) — delivery quest notification
  onDeliveryQuest: ((questId: number) => void) | null = null;
  // OG: CUserLocal::OnOpenUI (0x9055f0) — decode1 → CWvsContext::UI_Open
  onOpenUI: ((uiType: number) => void) | null = null;
  // OG: CUserLocal::OnOpenUIWithOption (0x932320) — decode4+decode4 → UI_Open + special cases
  onOpenUIWithOption: ((uiType: number, option: number) => void) | null = null;
  // OG: CUserLocal::OnNoticeMsg (0x9181f0) — decodeStr → CUtilDlg::Notice
  onNoticeMsg: ((message: string) => void) | null = null;
  // OG: CUser::OnChatMsg (local echo) — decodeStr → chat log add
  onUserLocalChatMsg: ((message: string) => void) | null = null;
  // OG: CUser::OnMiniRoomBalloon — decode mini room balloon info
  onMiniRoomBalloon: ((args: { charId: number; miniRoomType: number; sn: number; title: string; bPrivate: boolean; gameKind: number; curUsers: number; maxUsers: number; gameOn: boolean }) => void) | null = null;

  // ── Pet & Dragon callbacks (IDA_NEW_GAPS.md) ───────────────────────
  onPetActivated: ((args: PetActivatedArgs) => void) | null = null;
  onPetEvol: ((args: PetEvolArgs) => void) | null = null;
  onPetMove: ((args: PetMoveArgs) => void) | null = null;
  onPetAction: ((args: PetActionArgs) => void) | null = null;
  onPetNameChange: ((args: PetNameChangeArgs) => void) | null = null;
  onPetLoadExceptionList: ((args: PetLoadExceptionListArgs) => void) | null = null;
  onPetActionCommand: ((args: PetActionCommandArgs) => void) | null = null;
  onDragonMove: ((args: DragonMoveArgs) => void) | null = null;
  onDragonAfterMove: ((args: DragonAfterMoveArgs) => void) | null = null;
  onDragonAction: ((args: DragonActionArgs) => void) | null = null;

  // ── CMob gap callbacks (IDA_NEW_GAPS.md) ───────────────────────────
  onMobStatSet: ((args: MobStatSetArgs) => void) | null = null;
  onMobStatReset: ((args: MobStatResetArgs) => void) | null = null;
  onMobSuspendReset: ((args: MobSuspendResetArgs) => void) | null = null;
  onMobAffected: ((args: MobAffectedArgs) => void) | null = null;
  onMobCatchEffect: ((args: MobCatchEffectArgs) => void) | null = null;
  onMobEffectByItem: ((args: MobEffectByItemArgs) => void) | null = null;
  onMobIncChargeCount: ((args: MobIncChargeCountArgs) => void) | null = null;
  onMobEscortFullPath: ((args: MobEscortFullPathArgs) => void) | null = null;
  onMobEscortStopPerm: ((args: MobEscortStopPermArgs) => void) | null = null;
  onMobEscortStopSay: ((args: MobEscortStopSayArgs) => void) | null = null;
  onMobEscortReturnBefore: ((args: MobEscortReturnBeforeArgs) => void) | null = null;
  onMobNextAttack: ((args: MobNextAttackArgs) => void) | null = null;
  onMobAttackedByMob: ((args: MobAttackedByMobArgs) => void) | null = null;

  // ── CNpc gap callbacks (IDA_NEW_GAPS.md) ──────────────────────────
  onNpcTemplatePacket: ((args: NpcTemplatePacketArgs) => void) | null = null;

  clearAllExceptSetField(): void {
    this.onEventAlarm = null;
    this.onMigrateCommand = null;
    this.onStatChanged = null;
    this.onMobEnter = null;
    this.onMobLeave = null;
    this.onMobMove = null;
    this.onMobDamaged = null;
    this.onMobChangeController = null;
    this.onMobCtrlAck = null;
    this.onMobHpIndicator = null;
    this.onMobSpecialEffectBySkill = null;
    this.onMobSkillDelay = null;
    this.onMobSpeaking = null;
    this.onNpcEnter = null;
    this.onNpcLeave = null;
    this.onUserEnter = null;
    this.onUserLeave = null;
    this.onUserMove = null;
    this.onUserAttack = null;
    this.onUserEmotion = null;
    this.onUserEffect = null;
    this.onUserSetActivePortableChair = null;
    this.onUserAvatarModified = null;
    this.onCharacterInfo = null;
    this.onDropEnter = null;
    this.onDropLeave = null;
    this.onIncExp = null;
    this.onIncMoney = null;
    this.onLootMessage = null;
    this.onSystemMessage = null;
    this.onCashItemExpire = null;
    this.onGiveBuff = null;
    this.onIncSp = null;
    this.onIncFame = null;
    this.onIncGp = null;
    this.onOpenUrl = null;
    this.onGeneralItemExpire = null;
    this.onItemProtectExpire = null;
    this.onItemExpireReplace = null;
    this.onWheelOfFortune = null;
    this.onSkillExpire = null;
    this.onInventoryOperation = null;
    this.onUserChat = null;
    this.onGroupMessage = null;
    this.onWhisper = null;
    this.onPartyInvite = null;
    this.onPartyLoad = null;
    this.onPartyBossChanged = null;
    this.onPartyMemberStatChanged = null;
    this.onFriendList = null;
    this.onFriendRequest = null;
    this.onFriendStatusChanged = null;
    this.onFriendUpdate = null;
    this.onGuildMemberOnline = null;
    this.onGuildMemberJoin = null;
    this.onGuildMemberLeave = null;
    this.onGuildLoad = null;
    this.onGuildSetMarkPrompt = null;
    this.onAllianceLoad = null;
    this.onScriptMessage = null;
    this.onShopOpen = null;
    this.onShopResult = null;
    this.onAdminShopDlg = null;
    this.onAdminShopResult = null;
    this.onStoreBankResult = null;
    this.onStoreBankAction = null;
    this.onCharacterSaleCheckIdResult = null;
    this.onCharacterSaleCreateResult = null;
    this.onMonsterCarnivalEnter = null;
    this.onMonsterCarnivalPersonalCp = null;
    this.onMonsterCarnivalTeamCp = null;
    this.onMonsterCarnivalRequestResult = null;
    this.onMonsterCarnivalRequestCanned = null;
    this.onMonsterCarnivalProcessForDeath = null;
    this.onMonsterCarnivalMemberOut = null;
    this.onMonsterCarnivalGameResult = null;
    this.onFamilyChartResult = null;
    this.onFamilyInfoResult = null;
    this.onFamilyResult = null;
    this.onFamilyJoinRequest = null;
    this.onFamilyJoinRequestResult = null;
    this.onFamilyJoinAccepted = null;
    this.onFamilyPrivilegeList = null;
    this.onFamilyFamousPointIncResult = null;
    this.onFamilyNotifyLoginOrLogout = null;
    this.onFamilySetPrivilege = null;
    this.onFamilySummonRequest = null;
    this.onGuildBBSListResult = null;
    this.onGuildBBSViewEntryResult = null;
    this.onGuildBBSEntryNotFound = null;
    this.onWeddingGiftResult = null;
    this.onItemUpgradeResult = null;
    this.onInventoryGrow = null;
    this.onSetTamingMobInfo = null;
    this.onQuestClear = null;
    this.onGatherItemResult = null;
    this.onSortItemResult = null;
    this.onSueCharacterResult = null;
    this.onTradeMoneyLimit = null;
    this.onSetGender = null;
    this.onTownPortalNotify = null;
    this.onOpenGateNotify = null;
    this.onMarriageRequest = null;
    this.onMarriageResult = null;
    this.onNotifyMarriedPartnerMapTransfer = null;
    this.onCashPetFoodResult = null;
    this.onSetWeekEventMessage = null;
    this.onSetPotionDiscountRate = null;
    this.onMonsterBookSetCard = null;
    this.onMonsterBookSetCover = null;
    this.onHourChanged = null;
    this.onMiniMapOnOff = null;
    this.onConsultAuthkeyUpdate = null;
    this.onClassCompetitionAuthkeyUpdate = null;
    this.onWebBoardAuthkeyUpdate = null;
    this.onSessionValue = null;
    this.onPartyValue = null;
    this.onFieldSetVariable = null;
    this.onBonusExpRateChanged = null;
    this.onPotionDiscountRateChanged = null;
    this.onNotifyLevelUp = null;
    this.onNotifyWedding = null;
    this.onNotifyJobChange = null;
    this.onMapleTVUseRes = null;
    this.onAvatarMegaphoneRes = null;
    this.onSuccessInUsegachaponBox = null;
    this.onSetBuyEquipExt = null;
    this.onSetPassengerRequest = null;
    this.onScriptProgressMessageNotify = null;
    this.onDataCRCCheckFailed = null;
    this.onUpdateGMBoard = null;
    this.onShowSlotMessage = null;
    this.onAccountMoreInfo = null;
    this.onFindFriend = null;
    this.onTransferChannelNotify = null;
    this.onForcedStatSet = null;
    this.onForcedStatReset = null;
    this.onOpenFullClientDownloadLink = null;
    this.onShopLinkResult = null;
    this.onImitatedNPCData = null;
    this.onLimitedNPCDisableInfo = null;
    this.onClearAvatarMegaphone = null;
    this.onCancelNameChangebyOther = null;
    this.onWildHunterInfo = null;
    this.onAskWhetherUsePamsSong = null;
    this.onDisallowedDeliveryQuestList = null;
    this.onHontaleTimer = null;
    this.onChaosZakumTimer = null;
    this.onHontailTimer = null;
    this.onZakumTimer = null;
    this.onRPSGameDlg = null;
    this.onParcelDlg = null;
    this.onSummonedAttack = null;
    this.onSummonedSkill = null;
    this.onSummonedHit = null;
    this.onMobCrcKeyChanged = null;
    this.onNpcChangeController = null;
    this.onNpcMove = null;
    this.onNpcUpdateLimitedInfo = null;
    this.onNpcSetSpecialAction = null;
    this.onPetConsumeItemInit = null;
    this.onPetConsumeMPItemInit = null;
    this.onVegaResult = null;
    this.onAuthenCodeChanged = null;
    this.onLogoutGift = null;
    this.onTrunkResult = null;
    this.onMessengerResult = null;
    this.onQuestRecord = null;
    this.onSkillRecordResult = null;
    this.onTemporaryStatSet = null;
    this.onTemporaryStatReset = null;
    this.onFuncKeyMappedInit = null;
    this.onQuickslotInit = null;
    this.onFootHoldInfo = null;
    this.onMiniRoom = null;
    this.onReactorEnter = null;
    this.onReactorLeave = null;
    this.onReactorChangeState = null;
    this.onReactorMove = null;
    this.onEmployeeEnter = null;
    this.onEmployeeLeave = null;
    this.onSummonedEnter = null;
    this.onSummonedLeave = null;
    this.onSummonedMove = null;
    this.onTownPortalEnter = null;
    this.onTownPortalLeave = null;
    this.onOpenSkillGuide = null;
    this.onAffectedAreaCreate = null;
    this.onAffectedAreaRemove = null;
    this.onOpenGateCreate = null;
    this.onOpenGateRemove = null;
    this.onClaimResult = null;
    this.onClaimSvrAvailableTime = null;
    this.onClaimSvrStatusChanged = null;
    this.onMakerResult = null;
    this.onFieldEffect = null;
    this.onBlowWeather = null;
    this.onPlayJukeBox = null;
    this.onClock = null;
    this.onDestroyClock = null;
    this.onKillCountInfo = null;
    this.onMessageBoxCreateFailed = null;
    this.onMessageBoxEnterField = null;
    this.onMessageBoxLeaveField = null;
    this.onMassacreIncGauge = null;
    this.onMassacreResult = null;
    this.onBroadcastMsg = null;
    this.onEntrustedShopCheckResult = null;
    this.onSkillUseResult = null;
    this.onSkillLearnItemResult = null;
    this.onSkillResetItemResult = null;
    this.onSkillCooltimeSet = null;
    this.onSkillPrepare = null;
    this.onSkillCancel = null;
    this.onTransferFieldReqIgnored = null;
    this.onTransferChannelReqIgnored = null;
    this.onFieldSpecificData = null;
    this.onCoupleMessage = null;
    this.onSummonItemInavailable = null;
    this.onFieldObstacleOnOff = null;
    this.onFieldObstacleAllReset = null;
    this.onAdminResult = null;
    this.onQuiz = null;
    this.onFieldDesc = null;
    this.onSetQuestClear = null;
    this.onSetQuestTime = null;
    this.onWarnMessage = null;
    this.onSetObjectState = null;
    this.onStalkResult = null;
    this.onRequestFootHoldInfo = null;
    this.onAntiMacroResult = null;
    this.onDestroyShopResult = null;
    this.onMacroSysDataInit = null;
    this.onSetITC = null;
    this.onSetCashShop = null;
    this.onGivePopularityResult = null;
    this.onMemoResult = null;
    this.onMapTransferResult = null;
    this.onIncubatorResult = null;
    this.onShopScannerResult = null;
    this.onBridleMobCatchFail = null;
    this.onImitatedNPCResult = null;
    this.onSetAvatarMegaphone = null;
    this.onCancelNameChangeResult = null;
    this.onCancelTransferWorldResult = null;
    this.onFakeGMNotice = null;
    this.onNewYearCardRes = null;
    this.onRandomMorphRes = null;
    this.onCakePieEventResult = null;
    this.onStageChange = null;
    this.onDragonBallBox = null;
    this.onUserChatHistory = null;
    this.onUserADBoard = null;
    this.onSetConsumeItemEffect = null;
    this.onShowItemUpgradeEffect = null;
    this.onShowItemHyperUpgradeEffect = null;
    this.onShowItemOptionUpgradeEffect = null;
    this.onShowItemReleaseEffect = null;
    this.onShowItemUnreleaseEffect = null;
    this.onUserHitByUser = null;
    this.onUserTeslaTriangle = null;
    this.onUserFollowCharacter = null;
    this.onUserShowPQReward = null;
    this.onUserSetPhase = null;
    this.onShowRecoverUpgradeCountEffect = null;
    this.onUserMovingShootAttackPrepare = null;
    this.onUserHit = null;
    this.onUserSetActiveEffectItem = null;
    this.onUserShowUpgradeTombEffect = null;
    this.onUserSetTemporaryStat = null;
    this.onUserResetTemporaryStat = null;
    this.onUserReceiveHP = null;
    this.onUserGuildNameChanged = null;
    this.onUserGuildMarkChanged = null;
    this.onUserThrowGrenade = null;
    this.onPlayEventSound = null;
    this.onPlayMinigameSound = null;
    this.onOpenClassCompetitionPage = null;
    this.onHireTutor = null;
    this.onTutorMsg = null;
    this.onResignQuestReturn = null;
    this.onPassMateName = null;
    this.onBuffzoneEffect = null;
    this.onGoToCommoditySN = null;
    this.onDamageMeter = null;
    this.onTimeBombAttack = null;
    this.onUserPassiveMove = null;
    this.onFollowCharacterFailed = null;
    this.onVengeanceSkillApply = null;
    this.onExJablinApply = null;
    this.onAskAPSPEvent = null;
    this.onUserRandomEmotion = null;
    this.onSetStandAloneMode = null;
    this.onQuestResult = null;
    this.onUserTeleport = null;
    this.onIncComboResponse = null;
    this.onRadioSchedule = null;
    this.onQuestGuideResult = null;
    this.onDeliveryQuest = null;
    this.onOpenUI = null;
    this.onOpenUIWithOption = null;
    this.onNoticeMsg = null;
    this.onUserLocalChatMsg = null;
    this.onMiniRoomBalloon = null;
    this.onPetActivated = null;
    this.onPetEvol = null;
    this.onPetMove = null;
    this.onPetAction = null;
    this.onPetNameChange = null;
    this.onPetLoadExceptionList = null;
    this.onPetActionCommand = null;
    this.onDragonMove = null;
    this.onDragonAfterMove = null;
    this.onDragonAction = null;
    this.onMobStatSet = null;
    this.onMobStatReset = null;
    this.onMobSuspendReset = null;
    this.onMobAffected = null;
    this.onMobCatchEffect = null;
    this.onMobEffectByItem = null;
    this.onMobIncChargeCount = null;
    this.onMobEscortFullPath = null;
    this.onMobEscortStopPerm = null;
    this.onMobEscortStopSay = null;
    this.onMobEscortReturnBefore = null;
    this.onMobNextAttack = null;
    this.onMobAttackedByMob = null;
    this.onNpcTemplatePacket = null;
  }

  register(router: PacketRouter): void {
    router.register(OutHeader.SetField, (p, s) => this.handleSetField(p, s));
    router.register(OutHeader.MigrateCommand, (p, s) => this.handleMigrateCommand(p));
    router.register(OutHeader.AliveReq, (p, s) => this.handleAliveReq(s));
    router.register(OutHeader.StatChanged, (p, s) => this.handleStatChanged(p));
    router.register(OutHeader.MobEnterField, (p, s) => this.handleMobEnter(p));
    router.register(OutHeader.MobLeaveField, (p, s) => this.handleMobLeave(p));
    router.register(OutHeader.MobChangeController, (p, s) => this.handleMobChangeController(p));
    router.register(OutHeader.MobMove, (p, s) => this.handleMobMove(p));
    router.register(OutHeader.MobDamaged, (p, s) => this.handleMobDamaged(p));
    router.register(OutHeader.MobCtrlAck, (p, s) => this.handleMobCtrlAck(p));
    router.register(OutHeader.MobHPIndicator, (p, s) => this.handleMobHpIndicator(p));
    router.register(OutHeader.SpecialEffectBySkill, (p, s) => this.handleMobSpecialEffectBySkill(p));
    router.register(OutHeader.MobSkillDelay, (p, s) => this.handleMobSkillDelay(p));
    router.register(OutHeader.MobSpeaking, (p, s) => this.handleMobSpeaking(p));
    router.register(OutHeader.NpcEnterField, (p, s) => this.handleNpcEnter(p));
    router.register(OutHeader.NpcLeaveField, (p, s) => this.handleNpcLeave(p));
    router.register(OutHeader.UserEnterField, (p, s) => this.handleUserEnter(p));
    router.register(OutHeader.UserLeaveField, (p, s) => this.handleUserLeave(p));
    router.register(OutHeader.UserMove, (p, s) => this.handleUserMove(p));
    router.register(OutHeader.MeleeAttack, (p, s) => this.handleUserAttack(p, 'melee'));
    router.register(OutHeader.ShootAttack, (p, s) => this.handleUserAttack(p, 'shoot'));
    router.register(OutHeader.MagicAttack, (p, s) => this.handleUserAttack(p, 'magic'));
    router.register(OutHeader.BodyAttack, (p, s) => this.handleUserAttack(p, 'body'));
    router.register(OutHeader.UserEmotion, (p, s) => this.handleUserEmotion(p));
    router.register(OutHeader.UserEffectRemote, (p, s) => this.handleUserEffect(p, false));
    router.register(OutHeader.UserEmotionLocal, (p, s) => this.handleUserEmotionLocal(p));
    router.register(OutHeader.UserEffectLocal, (p, s) => this.handleUserEffect(p, true));
    // TODO_AUDIT.md Hundred-and-fifty-sixth pass: CUserLocal::OnPacket stubs — all confirmed from decompile/9340C0.c switch table.
    router.register(OutHeader.SitResult, (_p) => {});
    // OG: CUserLocal::OnTeleport (0x913ff0) — reads short(x) + short(y),
    // moves the player via CVecCtrlUser::raw_Move. Server teleport confirmation.
    router.register(OutHeader.UserTeleport, (p) => {
      const x = p.readShort();
      const y = p.readShort();
      this.onUserTeleport?.({ x, y });
    });
    // OG: CUserLocal::OnMesoGive_Succeeded (0x90f950) — reads int(nInc),
    // the meso amount successfully given to another player.
    router.register(OutHeader.MesoGiveSucceeded, (p) => {
      const nInc = p.readInt();
      this.onIncMoney?.(nInc);
    });
    // OG: CUserLocal::OnMesoGive_Failed (0x90d530) — reads int(nDec),
    // the meso amount that was deducted then returned on failure.
    router.register(OutHeader.MesoGiveFailed, (p) => {
      const nDec = p.readInt();
      this.onIncMoney?.(-nDec);
    });
    // OG: CUserLocal::OnRandomMesobag_Succeeded (0x90fa30) — reads int(nInc),
    // the meso amount obtained from the random meso bag.
    router.register(OutHeader.RandomMesobagSucceeded, (p) => {
      const nInc = p.readInt();
      this.onIncMoney?.(nInc);
    });
    // OG: CUserLocal::OnRandomMesobag_Failed (0x90d560) — no further data,
    // the bag was empty.
    router.register(OutHeader.RandomMesobagFailed, (_p) => {});
    router.register(OutHeader.FieldFadeInOut, (p) => {
      // OG: CUserLocal::OnFieldFadeInOut — reads 4 ints: color, duration, fadeOut, fadeTime
      const color = p.readInt();
      const duration = p.readInt();
      const fadeOut = p.readInt();
      const fadeTime = p.readInt();
      this.onFieldFadeInOut?.(color, duration, fadeOut, fadeTime);
    });
    router.register(OutHeader.FieldFadeOutForce, (p) => {
      // OG: CUserLocal::OnFieldFadeOutForce — reads 1 int: color
      const color = p.readInt();
      this.onFieldFadeOutForce?.(color);
    });
    router.register(OutHeader.NotifyHPDecByField, (p) => {
      // OG: CUserLocal::OnNotifyHPDecByField — reads 1 int: HP drain amount
      const hpDec = p.readInt();
      this.onNotifyHPDecByField?.(hpDec);
    });
    router.register(OutHeader.BalloonMsg, (p, s) => this.handleBalloonMsg(p));
    // OG: CUserLocal::OnPlayEventSound (0x916d60) — decodeStr → play_field_sound(name, 100)
    router.register(OutHeader.PlayEventSound, (p) => {
      const soundName = p.readString();
      this.onPlayEventSound?.(soundName);
    });
    // OG: CUserLocal::OnPlayMinigameSound (0x916e10) — decodeStr → play_minigame_sound(name, 100)
    router.register(OutHeader.PlayMinigameSound, (p) => {
      const soundName = p.readString();
      this.onPlayMinigameSound?.(soundName);
    });
    // OG: CUserLocal::OnOpenClassCompetitionPage (0x9055a8) — no decode, creates CClassCompetition UI
    router.register(OutHeader.OpenClassCompetitionPage, (_p) => {
      this.onOpenClassCompetitionPage?.();
    });
    router.register(OutHeader.OpenUI, (p, s) => this.handleOpenUI(p));
    router.register(OutHeader.OpenUIWithOption, (p, s) => this.handleOpenUIWithOption(p));
    router.register(OutHeader.SetDirectionMode, (p) => {
      // OG: CUserLocal::OnSetDirectionMode — reads byte(bDirection) + int(afterDelay)
      const bDirection = p.readByte() !== 0;
      const afterDelay = p.readInt();
      this.onSetDirectionMode?.(bDirection, afterDelay);
    });
    // OG: CUserLocal::OnSetStandAloneMode (0x90555f) — decode1(standAloneMode) → CWvsContext
    router.register(OutHeader.SetStandAloneMode, (p) => {
      const standAloneMode = p.readByte();
      this.onSetStandAloneMode?.(standAloneMode);
    });
    // OG: CUserLocal::OnHireTutor (0x90e5b9) — decode1(bSpawn), creates/removes CTutor
    router.register(OutHeader.HireTutor, (p) => {
      const bSpawn = p.readByte() !== 0;
      this.onHireTutor?.(bSpawn);
    });
    // OG: CUserLocal::OnTutorMsg (0x916f60) — decode1(flag), then idx+duration or msg+width+duration
    router.register(OutHeader.TutorMsg, (p) => {
      const isIndex = p.readByte() !== 0;
      if (isIndex) {
        const idx = p.readInt();
        const duration = p.readInt();
        this.onTutorMsg?.(isIndex, idx, duration);
      } else {
        const msg = p.readString();
        const width = p.readInt();
        const duration = p.readInt();
        this.onTutorMsg?.(isIndex, msg, duration, width);
      }
    });
    // OG: CUserLocal::OnIncComboResponse (0x91a970) — reads int(nCombo),
    // sets m_tLastSetCombo = get_update_time(), calls DrawCombo.
    router.register(OutHeader.IncComboResponse, (p) => {
      const nCombo = p.readInt();
      this.onIncComboResponse?.(nCombo);
    });
    // OG: CUser::OnRandomEmotion (0x8e34b0) — decode4(itemId) → random emotion from AreaBuffItem
    router.register(OutHeader.UserRandomEmotion, (p) => {
      const itemId = p.readInt();
      this.onUserRandomEmotion?.(itemId);
    });
    // OG: CUserLocal::OnResignQuestReturn (0x905720) — decode2(questId) → TryRegisterAutoStartQuest + DeleteQuest
    router.register(OutHeader.ResignQuestReturn, (p) => {
      const questId = p.readShort();
      this.onResignQuestReturn?.(questId);
    });
    // OG: CUserLocal::OnPassMateName (0x918283) — decode2(questId) + decodeStr(mateName)
    router.register(OutHeader.PassMateName, (p) => {
      const questId = p.readShort();
      const mateName = p.readString();
      this.onPassMateName?.(questId, mateName);
    });
    router.register(OutHeader.RadioSchedule, (p) => {
      // OG: CUserLocal::OnRadioSchedule — decodeStr(musicFile) + decode4(duration)
      const musicFile = p.readString();
      const duration = p.readInt();
      this.onRadioSchedule?.(musicFile, duration);
    });
    router.register(OutHeader.NoticeMsg, (p, s) => this.handleNoticeMsg(p));
    router.register(OutHeader.UserLocalChatMsg, (p, s) => this.handleUserLocalChatMsg(p));
    // OG: CUserLocal::OnBuffzoneEffect (0x9183a0) — decode4(itemId), loads WZ item property for buff zone visual
    router.register(OutHeader.BuffzoneEffect, (p) => {
      const itemId = p.readInt();
      this.onBuffzoneEffect?.(itemId);
    });
    // OG: CUserLocal::OnGoToCommoditySN (0x90576f) — decode4(commoditySN) → SendMigrateToShopRequest
    router.register(OutHeader.GoToCommoditySN, (p) => {
      const commoditySN = p.readInt();
      this.onGoToCommoditySN?.(commoditySN);
    });
    // OG: CUserLocal::OnDamageMeter (0x905620) — decode4(duration) → CDamageMeter::SetTimer
    router.register(OutHeader.DamageMeterResult, (p) => {
      const duration = p.readInt();
      this.onDamageMeter?.(duration);
    });
    // OG: CUserLocal::OnTimeBombAttack (0x9323f0) — decode5(skillId,nUnknown,nInvincible,nImpactDeg,nDamage)
    router.register(OutHeader.TimeBombAttack, (p) => {
      const skillId = p.readInt();
      const nUnknown = p.readInt();
      const nInvincible = p.readInt();
      const nUserImpactDeg = p.readInt();
      const nDamage = p.readInt();
      this.onTimeBombAttack?.({ skillId, nUnknown, nInvincible, nUserImpactDeg, nDamage });
    });
    // OG: CUser::OnPassiveMove (0x8dea10) — decode charId, then CMovePath::OnMovePacket for driven chars
    router.register(OutHeader.UserPassiveMove, (p) => {
      const charId = p.readInt();
      this.onUserPassiveMove?.(charId);
    });
    // OG: CUserLocal::OnFollowCharacterFailed (0x910e92) — decode4(failedCharId) + decode4(reason)
    router.register(OutHeader.FollowCharacterFailed, (p) => {
      const failedCharId = p.readInt();
      const reason = p.readInt();
      this.onFollowCharacterFailed?.(failedCharId, reason);
    });
    // OG: CUserLocal::OnExJablinApply (0x9034e0) — no decode, sets m_bNextShootExJablin = 1
    router.register(OutHeader.ExJablinApply, (_p) => {
      this.onExJablinApply?.();
    });
    // OG: CUserLocal::OnAskAPSPEvent (0x90f10c) — decode4(charId) + decode4(nReason), shows YesNo dialog
    router.register(OutHeader.AskAPSPEvent, (p) => {
      const charId = p.readInt();
      const nReason = p.readInt();
      this.onAskAPSPEvent?.(charId, nReason);
    });
    // OG: CUserLocal::OnDeliveryQuest (case 275) — reads questId(4) for delivery quest notification
    router.register(OutHeader.DeliveryQuest, (p) => {
      const questId = p.readInt();
      this.onDeliveryQuest?.(questId);
    });
    // CField::OnPacket case 196 is an explicit no-op in the OG (decompile/546D50.c — return;).
    router.register(OutHeader.FieldNop196, (_p) => {});
    router.register(OutHeader.UserSetActivePortableChair, (p, s) => this.handleUserSetActivePortableChair(p));
    router.register(OutHeader.UserAvatarModified, (p, s) => this.handleUserAvatarModified(p));
    router.register(OutHeader.CharacterInfo, (p, s) => this.handleCharacterInfo(p));
    router.register(OutHeader.DropEnterField, (p, s) => this.handleDropEnter(p));
    router.register(OutHeader.DropLeaveField, (p, s) => this.handleDropLeave(p));
    router.register(OutHeader.Message, (p, s) => this.handleMessage(p));
    router.register(OutHeader.InventoryOperation, (p, s) => this.handleInventoryOp(p));
    router.register(OutHeader.ClaimResult, (p, s) => this.handleClaimResult(p));
    router.register(OutHeader.SetClaimSvrAvailableTime, (p, s) => this.handleSetClaimSvrAvailableTime(p));
    router.register(OutHeader.ClaimSvrStatusChanged, (p, s) => this.onClaimSvrStatusChanged?.(p.readByte() !== 0));
    router.register(OutHeader.UserChat, (p, s) => this.handleUserChat(p));
    router.register(OutHeader.GroupMessage, (p, s) => this.handleGroupMessage(p));
    router.register(OutHeader.Whisper, (p, s) => this.handleWhisper(p));
    router.register(OutHeader.PartyResult, (p, s) => this.handlePartyResult(p));
    router.register(OutHeader.ExpeditionResult, (p, s) => this.handleExpeditionResult(p));
    router.register(OutHeader.FriendResult, (p, s) => this.handleFriendResult(p));
    router.register(OutHeader.GuildResult, (p, s) => this.handleGuildResult(p));
    router.register(OutHeader.AllianceResult, (p, s) => this.handleAllianceResult(p));
    router.register(OutHeader.ScriptMessage, (p, s) => this.handleScriptMessage(p));
    router.register(OutHeader.OpenShopDlg, (p, s) => this.handleOpenShopDlg(p));
    router.register(OutHeader.ShopResult, (p, s) => this.handleShopResult(p));
    router.register(OutHeader.AdminShopDlg, (p, s) => this.handleAdminShopDlg(p));
    router.register(OutHeader.AdminShopResult, (p, s) => this.handleAdminShopResult(p));
    router.register(OutHeader.StoreBankResult, (p, s) => this.handleStoreBankResult(p));
    router.register(OutHeader.StoreBankAction, (p, s) => this.handleStoreBankAction(p));
    router.register(OutHeader.CharacterSaleCheckIdResult, (p, s) => this.handleCharacterSaleCheckIdResult(p));
    router.register(OutHeader.CharacterSaleCreateResult, (p, s) => this.handleCharacterSaleCreateResult(p));
    router.register(OutHeader.MonsterCarnivalEnter, (p, s) => this.handleMonsterCarnivalEnter(p));
    router.register(OutHeader.MonsterCarnivalPersonalCp, (p, s) => this.handleMonsterCarnivalPersonalCp(p));
    router.register(OutHeader.MonsterCarnivalTeamCp, (p, s) => this.handleMonsterCarnivalTeamCp(p));
    router.register(OutHeader.MonsterCarnivalRequestResult, (p, s) => this.handleMonsterCarnivalRequestResult(p));
    router.register(OutHeader.MonsterCarnivalRequestCanned, (p, s) => this.handleMonsterCarnivalRequestCanned(p));
    router.register(OutHeader.MonsterCarnivalProcessForDeath, (p, s) => this.handleMonsterCarnivalProcessForDeath(p));
    router.register(OutHeader.MonsterCarnivalMemberOut, (p, s) => this.handleMonsterCarnivalMemberOut(p));
    router.register(OutHeader.MonsterCarnivalGameResult, (p, s) => this.handleMonsterCarnivalGameResult(p));
    router.register(OutHeader.FamilyChartResult, (p, s) => this.handleFamilyChartResult(p));
    router.register(OutHeader.FamilyInfoResult, (p, s) => this.handleFamilyInfoResult(p));
    router.register(OutHeader.FamilyResult, (p, s) => this.handleFamilyResult(p));
    router.register(OutHeader.FamilyJoinRequest, (p, s) => this.handleFamilyJoinRequest(p));
    router.register(OutHeader.FamilyJoinRequestResult, (p, s) => this.handleFamilyJoinRequestResult(p));
    router.register(OutHeader.FamilyJoinAccepted, (p, s) => this.handleFamilyJoinAccepted(p));
    router.register(OutHeader.FamilyPrivilegeList, (p, s) => this.handleFamilyPrivilegeList(p));
    router.register(OutHeader.FamilyFamousPointIncResult, (p, s) => this.handleFamilyFamousPointIncResult(p));
    router.register(OutHeader.FamilyNotifyLoginOrLogout, (p, s) => this.handleFamilyNotifyLoginOrLogout(p));
    router.register(OutHeader.FamilySetPrivilege, (p, s) => this.handleFamilySetPrivilege(p));
    router.register(OutHeader.FamilySummonRequest, (p, s) => this.handleFamilySummonRequest(p));
    router.register(OutHeader.GuildBBSPacket, (p, s) => this.handleGuildBBSPacket(p));
    router.register(OutHeader.WeddingGiftResult, (p, s) => this.handleWeddingGiftResult(p));
    router.register(OutHeader.ItemUpgradeResult, (p, s) => this.handleItemUpgradeResult(p));
    router.register(OutHeader.InventoryGrow, (p, s) => { this.onInventoryGrow?.({ invType: p.readByte(), slotCount: p.readByte() }); });
    // OG: CWvsContext::OnSetTamingMobInfo (IDA: 0x9f7280) — charId(4) +
    // tamingMobLevel(4) + tamingMobExp(4) + tamingMobFatigue(4) + flag(1).
    router.register(OutHeader.SetTamingMobInfo, (p, s) => { this.onSetTamingMobInfo?.({ charId: p.readInt(), tamingMobLevel: p.readInt(), tamingMobExp: p.readInt(), tamingMobFatigue: p.readInt(), flag: p.readByte() }); });
    router.register(OutHeader.QuestClear, (p, s) => { this.onQuestClear?.({ questId: p.readShort() }); });
    router.register(OutHeader.GatherItemResult, (p, s) => { this.onGatherItemResult?.({ invType: p.readByte(), resultCode: p.readByte() }); });
    router.register(OutHeader.SortItemResult, (p, s) => { this.onSortItemResult?.({ invType: p.readByte(), resultCode: p.readByte() }); });
    router.register(OutHeader.SueCharacterResult, (p, s) => { this.onSueCharacterResult?.({ resultCode: p.readByte() }); });
    router.register(OutHeader.TradeMoneyLimit, (p, s) => { this.onTradeMoneyLimit?.({ limitType: p.readByte() }); });
    router.register(OutHeader.SetGender, (p, s) => { this.onSetGender?.({ gender: p.readByte() }); });
    // OG: CWvsContext::OnTownPortal (IDA: 0x9f1330) — townId(4) + fieldId(4),
    // then ONLY if neither equals the "no portal" sentinel 999999999:
    // skillId(4) + x(i16) + y(i16). See TODO_AUDIT.md "Forty-eighth pass".
    router.register(OutHeader.TownPortalNotify, (p, s) => {
      const townId = p.readInt();
      const fieldId = p.readInt();
      if (townId === 999999999 || fieldId === 999999999) {
        this.onTownPortalNotify?.({ townId, fieldId });
        return;
      }
      const skillId = p.readInt();
      const x = p.readShort();
      const y = p.readShort();
      this.onTownPortalNotify?.({ townId, fieldId, skillId, x, y });
    });
    router.register(OutHeader.OpenGateNotify, (p, s) => { this.onOpenGateNotify?.({ x: p.readShort(), y: p.readShort() }); });
    // OG: CWvsContext::OnMarriageRequest (decompile/a00bb0.c) — byte
    // requestType. Only requestType===0 (an actual marriage proposal) has
    // any further bytes: string partnerName, int partnerId. requestType
    // ===9 opens a local wishlist-input dialog with no further packet
    // data; every other value is a no-op. The previous shape read
    // partnerName/partnerId unconditionally, which would throw (no
    // try/catch) on every requestType!==0 packet.
    router.register(OutHeader.MarriageRequest, (p, s) => {
      const requestType = p.readByte();
      if (requestType === 0) {
        const partnerName = p.readString();
        const partnerId = p.readInt();
        this.onMarriageRequest?.({ requestType, partnerName, partnerId });
      } else {
        this.onMarriageRequest?.({ requestType });
      }
    });
    // OG: CWvsContext::OnMarriageResult (decompile/a00da0.c) — byte
    // resultCode, then conditionally: 11/12 -> a 48-byte GW_MarriageRecord
    // (decompile/4f2b50.c, raw DecodeBuffer) followed by a canned notice;
    // 15 -> string groomName, string brideName, short ringItemId (wedding
    // invitation dialog); 36 -> byte flag, and only if set, a string
    // message; every other code (13/14/16/18-32/34, and anything not
    // listed) has NO further bytes at all, just a canned/no notice. The
    // previous shape unconditionally read name1/name2/ringItemId/flag/
    // message for every result code, which is wrong for the vast
    // majority of real server responses.
    router.register(OutHeader.MarriageResult, (p, s) => {
      const resultCode = p.readByte();
      if (resultCode === 11 || resultCode === 12) {
        p.readBytes(0x30);
        this.onMarriageResult?.({ resultCode });
      } else if (resultCode === 15) {
        const groomName = p.readString();
        const brideName = p.readString();
        const ringItemId = p.readShort();
        this.onMarriageResult?.({ resultCode, groomName, brideName, ringItemId });
      } else if (resultCode === 36) {
        const message = p.readByte() !== 0 ? p.readString() : undefined;
        this.onMarriageResult?.({ resultCode, message });
      } else {
        this.onMarriageResult?.({ resultCode });
      }
    });
    router.register(OutHeader.NotifyMarriedPartnerMapTransfer, (p, s) => { this.onNotifyMarriedPartnerMapTransfer?.({ mapId: p.readInt(), partnerId: p.readInt() }); });
    // OG: CWvsContext::OnCashPetFoodResult (IDA: 0x9f7180) — result(1), then
    // ONLY if result == 0: one more byte (a pet-food table index used for a
    // sound effect). result == 1 shows a notice with no further bytes; any
    // other value also reads nothing further. See TODO_AUDIT.md
    // "Fifty-second pass".
    router.register(OutHeader.CashPetFoodResult, (p, s) => {
      const result = p.readByte();
      if (result === 0) {
        this.onCashPetFoodResult?.({ result, foodIndex: p.readByte() });
      } else {
        this.onCashPetFoodResult?.({ result });
      }
    });
    router.register(OutHeader.SetWeekEventMessage, (p, s) => { this.onSetWeekEventMessage?.({ flag: p.readByte(), message: p.readString() }); });
    router.register(OutHeader.SetPotionDiscountRate, (p, s) => { this.onSetPotionDiscountRate?.({ rate: p.readByte() }); });
    // OG: CWvsContext::OnMonsterBookSetCard (IDA: 0x9ddcb0) — flag(1), then
    // ONLY if flag is truthy: cardId(4) + count(4). See TODO_AUDIT.md
    // "Fifty-first pass".
    router.register(OutHeader.MonsterBookSetCard, (p, s) => {
      const flag = p.readByte();
      if (flag === 0) { this.onMonsterBookSetCard?.({ flag }); return; }
      const cardId = p.readInt();
      const count = p.readInt();
      this.onMonsterBookSetCard?.({ flag, cardId, count });
    });
    router.register(OutHeader.MonsterBookSetCover, (p, s) => { this.onMonsterBookSetCover?.({ coverId: p.readInt() }); });
    router.register(OutHeader.HourChanged, (p, s) => { this.onHourChanged?.({ hour: p.readShort(), minute: p.readShort() }); });
    router.register(OutHeader.MiniMapOnOff, (p, s) => { this.onMiniMapOnOff?.({ onOff: p.readByte() !== 0 }); });
    router.register(OutHeader.ConsultAuthkeyUpdate, (p, s) => { this.onConsultAuthkeyUpdate?.({ authkey: p.readString() }); });
    router.register(OutHeader.ClassCompetitionAuthkeyUpdate, (p, s) => { this.onClassCompetitionAuthkeyUpdate?.({ authkey: p.readString() }); });
    router.register(OutHeader.WebBoardAuthkeyUpdate, (p, s) => { this.onWebBoardAuthkeyUpdate?.({ flag: p.readByte(), authkey: p.readString() }); });
    router.register(OutHeader.SessionValue, (p, s) => { this.onSessionValue?.({ key: p.readString(), value: p.readString() }); });
    router.register(OutHeader.PartyValue, (p, s) => { this.onPartyValue?.({ key: p.readString(), value: p.readString() }); });
    router.register(OutHeader.FieldSetVariable, (p, s) => { this.onFieldSetVariable?.({ key: p.readString(), value: p.readString() }); });
    router.register(OutHeader.BonusExpRateChanged, (p, s) => { this.onBonusExpRateChanged?.({ rate: p.readInt(), startTime: p.readInt(), endTime: p.readInt() }); });
    router.register(OutHeader.PotionDiscountRateChanged, (p, s) => { this.onPotionDiscountRateChanged?.({ rate: p.readInt(), duration: p.readInt() }); });
    router.register(OutHeader.NotifyLevelUp, (p, s) => { this.onNotifyLevelUp?.({ flag: p.readByte(), level: p.readInt(), name: p.readString() }); });
    router.register(OutHeader.NotifyWedding, (p, s) => { this.onNotifyWedding?.({ flag: p.readByte(), name: p.readString() }); });
    router.register(OutHeader.NotifyJobChange, (p, s) => { this.onNotifyJobChange?.({ flag: p.readByte(), job: p.readInt(), name: p.readString() }); });
    router.register(OutHeader.MapleTVUseRes, (p, s) => { this.onMapleTVUseRes?.({ message: p.readString() }); });
    router.register(OutHeader.AvatarMegaphoneRes, (p, s) => { this.onAvatarMegaphoneRes?.({ result: p.readByte(), message: p.readString() }); });
    router.register(OutHeader.SuccessInUsegachaponBox, (p, s) => { this.onSuccessInUsegachaponBox?.({ itemId: p.readInt() }); });
    router.register(OutHeader.SetBuyEquipExt, (p, s) => { this.onSetBuyEquipExt?.({ flag: p.readByte() !== 0 }); });
    router.register(OutHeader.SetPassengerRequest, (p, s) => { this.onSetPassengerRequest?.({ npcId: p.readInt() }); });
    router.register(OutHeader.ScriptProgressMessage, (p, s) => { this.onScriptProgressMessageNotify?.({ message: p.readString() }); });
    router.register(OutHeader.DataCRCCheckFailed, (p, s) => { this.onDataCRCCheckFailed?.({ message: p.readString() }); });
    router.register(OutHeader.UpdateGMBoard, (p, s) => { this.onUpdateGMBoard?.({ boardId: p.readInt(), message: p.readString() }); });
    router.register(OutHeader.ShowSlotMessage, (p, s) => { this.onShowSlotMessage?.({ slot: p.readByte() }); });
    router.register(OutHeader.AccountMoreInfo, (p, s) => { this.onAccountMoreInfo?.({ flag: p.readByte() }); });
    router.register(OutHeader.FindFriend, (p, s) => { this.onFindFriend?.({ flag1: p.readByte(), flag2: p.readByte() }); });
    router.register(OutHeader.TransferChannelNotify, (p, s) => { this.onTransferChannelNotify?.({ channel: p.readInt(), message: p.readString() }); });
    // OG: ForcedStat::Decode (IDA: 0x727600) — a 4-byte mask, then each of 13
    // fields is decoded ONLY if its bit is set: str/dex/int/luk (1/2/4/8,
    // short each), pad/pdd/mad/mdd (0x10/0x20/0x40/0x80, short each),
    // acc/eva (0x100/0x200, short each), speed/jump/speedMax
    // (0x400/0x800/0x1000, byte each). See TODO_AUDIT.md "Forty-ninth pass".
    router.register(OutHeader.ForcedStatSet, (p, s) => {
      const mask = p.readInt();
      const args: ForcedStatSetArgs = { mask };
      if ((mask & 0x1) !== 0) args.str = p.readShort();
      if ((mask & 0x2) !== 0) args.dex = p.readShort();
      if ((mask & 0x4) !== 0) args.int = p.readShort();
      if ((mask & 0x8) !== 0) args.luk = p.readShort();
      if ((mask & 0x10) !== 0) args.pad = p.readShort();
      if ((mask & 0x20) !== 0) args.pdd = p.readShort();
      if ((mask & 0x40) !== 0) args.mad = p.readShort();
      if ((mask & 0x80) !== 0) args.mdd = p.readShort();
      if ((mask & 0x100) !== 0) args.acc = p.readShort();
      if ((mask & 0x200) !== 0) args.eva = p.readShort();
      if ((mask & 0x400) !== 0) args.speed = p.readByte();
      if ((mask & 0x800) !== 0) args.jump = p.readByte();
      if ((mask & 0x1000) !== 0) args.speedMax = p.readByte();
      this.onForcedStatSet?.(args);
    });
    router.register(OutHeader.ForcedStatReset, (p, s) => { this.onForcedStatReset?.(); });
    router.register(OutHeader.OpenFullClientDownloadLink, (p, s) => { this.onOpenFullClientDownloadLink?.(); });
    router.register(OutHeader.ShopLinkResult, (p, s) => { this.onShopLinkResult?.({ resultCode: p.readByte() }); });
    // OG: CWvsContext::OnImitatedNPCData -> CNpcPool::OnPacket(84) ->
    // CNpcPool::OnNpcImitateData (IDA: 0x679500) — count(1), then `count`
    // repeats of {templateId(4), name(string), AvatarLook(variable)}. See
    // TODO_AUDIT.md "Fifty-second pass".
    router.register(OutHeader.ImitatedNPCData, (p, s) => {
      const count = p.readByte();
      const entries: ImitatedNPCDataEntry[] = [];
      for (let i = 0; i < count; i++) {
        const templateId = p.readInt();
        const name = p.readString();
        const avatarLook = AvatarCodec.DecodeAvatarLook(p);
        entries.push({ templateId, name, avatarLook });
      }
      this.onImitatedNPCData?.({ entries });
    });
    // OG: CWvsContext::OnLimitedNPCDisableInfo -> CNpcPool::OnPacket(85) ->
    // CNpcPool::OnUpdateLimitedDisableInfo (IDA: 0x679210) — count(1), then
    // `count` repeats of templateId(4). No string field exists. See
    // TODO_AUDIT.md "Fifty-second pass".
    router.register(OutHeader.LimitedNPCDisableInfo, (p, s) => {
      const count = p.readByte();
      const templateIds: number[] = [];
      for (let i = 0; i < count; i++) templateIds.push(p.readInt());
      this.onLimitedNPCDisableInfo?.({ templateIds });
    });
    router.register(OutHeader.ClearAvatarMegaphone, (p, s) => { this.onClearAvatarMegaphone?.(); });
    router.register(OutHeader.CancelNameChangebyOther, (p, s) => { this.onCancelNameChangebyOther?.(); });
    // OG: CWvsContext::OnWildHunterInfo -> GW_WildHunterInfo::Decode (IDA:
    // 0x4f2bc0) — packedByte(1, two base-10 digits packed into one byte) +
    // 5x capturedMobId(int4) = 21 bytes total. See TODO_AUDIT.md
    // "Fifty-second pass".
    router.register(OutHeader.WildHunterInfo, (p, s) => {
      const packedByte = p.readByte();
      const capturedMobIds = [0, 1, 2, 3, 4].map(() => p.readInt());
      this.onWildHunterInfo?.({ packedByte, capturedMobIds });
    });
    router.register(OutHeader.AskWhetherUsePamsSong, (p, s) => { this.onAskWhetherUsePamsSong?.(); });
    router.register(OutHeader.DisallowedDeliveryQuestList, (p, s) => { this.onDisallowedDeliveryQuestList?.({ field1: p.readInt(), field2: p.readInt() }); });
    router.register(OutHeader.HontaleTimer, (p, s) => { this.onHontaleTimer?.({ flag: p.readByte(), value: p.readByte() }); });
    router.register(OutHeader.ChaosZakumTimer, (p, s) => { this.onChaosZakumTimer?.({ flag: p.readByte(), value: p.readInt() }); });
    router.register(OutHeader.HontailTimer, (p, s) => { this.onHontailTimer?.({ flag: p.readByte(), value: p.readInt() }); });
    router.register(OutHeader.ZakumTimer, (p, s) => { this.onZakumTimer?.({ flag: p.readByte(), value: p.readInt() }); });
    router.register(OutHeader.RPSGameDlg, (p, s) => {
      const subAction = p.readByte();
      // OG: CRPSGameDlg::OnPacket decodes subAction byte, then for case 11
      // reads two more bytes: npcSelect and cntStraightVictories.
      let npcSelect = -1;
      let cntStraightVictories = 0;
      if (subAction === 11) {
        npcSelect = p.readByte();
        cntStraightVictories = p.readByte();
        // OG: signed — negative means loss
      }
      this.onRPSGameDlg?.({ subAction, npcSelect, cntStraightVictories });
    });
    router.register(OutHeader.ParcelDlg, (p, s) => { this.onParcelDlg?.({ subAction: p.readByte() }); });
    // OG: CSummonedPool::OnPacket (decompile/75ac70.c) decodes a leading
    // int charId before dispatching by sub-opcode to CSummonedPool::
    // OnAttack/OnSkill/OnHit, which each decode a second int summonedId
    // before forwarding to CUser::OnSummonedAttack/Skill/Hit. The previous
    // shape here only read one int (mislabeled "summonedId") and was
    // actually consuming the charId while never reading the real
    // summonedId at all.
    //
    // OG: CSummoned::OnAttack (decompile/753340.c) is a large per-target
    // damage-array packet (byte charLevel, byte, byte attackType, then a
    // conditional int mobId + N*(byte,int) damage pairs + trailing byte) —
    // too complex to safely reproduce from this dump without risking a
    // wrong shape (see this audit's note on the virtualized melee/shoot/
    // magic attack encoders for the same caution). Only the proven
    // charId+summonedId prefix is decoded; the rest of the payload is left
    // unread/unexposed rather than guessed.
    router.register(OutHeader.SummonedAttack, (p, s) => { this.onSummonedAttack?.({ charId: p.readInt(), summonedId: p.readInt() }); });
    // OG: CUser::OnSummonedSkill -> CSummoned::OnSkill (decompile/8e3980.c,
    // 74a940.c) — int summonedId, then ONE byte action code (masked &0x7F
    // by OG before use).
    router.register(OutHeader.SummonedSkill, (p, s) => { this.onSummonedSkill?.({ charId: p.readInt(), summonedId: p.readInt(), action: p.readByte() & 0x7F }); });
    // OG: CSummoned::OnHit (decompile/74bc80.c) — signed byte attackIdx,
    // int damage, then (only if attackIdx > -2) int mobTemplateId + byte
    // isLeft.
    router.register(OutHeader.SummonedHit, (p, s) => {
      const charId = p.readInt();
      const summonedId = p.readInt();
      const attackIdx = p.readSByte();
      const damage = p.readInt();
      if (attackIdx > -2) {
        const mobTemplateId = p.readInt();
        const isLeft = p.readByte() !== 0;
        this.onSummonedHit?.({ charId, summonedId, attackIdx, damage, mobTemplateId, isLeft });
      } else {
        this.onSummonedHit?.({ charId, summonedId, attackIdx, damage });
      }
    });
    router.register(OutHeader.MobCrcKeyChanged, (p, s) => { this.onMobCrcKeyChanged?.({ crcKey: p.readInt() }); });
    router.register(OutHeader.NpcChangeController, (p, s) => { this.onNpcChangeController?.({ flag: p.readByte(), npcId: p.readInt() }); });
    // OG: CNpcPool::OnNpcPacket (decompile/679260.c) decodes a leading int
    // npcId before routing to CNpc::OnMove/OnUpdateLimitedInfo/
    // OnSetSpecialAction (decompile/678060.c, 676340.c, 6750f0.c).
    router.register(OutHeader.NpcMove, (p, s) => {
      // CNpc::OnMove also conditionally decodes a full CMovePath blob
      // after these two bytes (only when the NPC template has bMove set,
      // which this client doesn't expose) — deliberately left unread,
      // matching the per-message try/catch convention used elsewhere.
      const npcId = p.readInt();
      const actionIdx = p.readSByte();
      const chatIdx = p.readSByte();
      this.onNpcMove?.({ npcId, actionIdx, chatIdx });
    });
    router.register(OutHeader.NpcUpdateLimitedInfo, (p, s) => {
      const npcId = p.readInt();
      const enabled = p.readByte() !== 0;
      this.onNpcUpdateLimitedInfo?.({ npcId, enabled });
    });
    router.register(OutHeader.NpcSetSpecialAction, (p, s) => {
      const npcId = p.readInt();
      const actionName = p.readString();
      this.onNpcSetSpecialAction?.({ npcId, actionName });
    });
    router.register(OutHeader.PetConsumeItemInit, (p, s) => { this.onPetConsumeItemInit?.({ itemId: p.readInt() }); });
    router.register(OutHeader.PetConsumeMPItemInit, (p, s) => { this.onPetConsumeMPItemInit?.({ itemId: p.readInt() }); });
    router.register(OutHeader.VegaResult, (p, s) => { this.onVegaResult?.({ resultCode: p.readByte() }); });
    router.register(OutHeader.AuthenCodeChanged, (p, s) => { this.onAuthenCodeChanged?.({ nSet: p.readByte(), value: p.readInt() }); });
    // OG: CWvsContext::OnLogoutGift (decompile/9CCCB0.c) reads zero bytes —
    // a pure trigger, not a payload to decode.
    router.register(OutHeader.LogoutGift, (p, s) => { this.onLogoutGift?.({}); });
    router.register(OutHeader.TrunkResult, (p, s) => this.handleTrunkResult(p));
    router.register(OutHeader.Messenger, (p, s) => this.handleMessenger(p));
    router.register(OutHeader.FuncKeyMappedInit, (p, s) => this.handleFuncKeyMappedInit(p));
    router.register(OutHeader.QuickslotMappedInit, (p, s) => this.handleQuickslotMappedInit(p));
    router.register(OutHeader.FootHoldInfo, (p, s) => this.handleFootHoldInfo(p));
    router.register(OutHeader.ChangeSkillRecordResult, (p, s) => this.handleChangeSkillRecord(p));
    router.register(OutHeader.TemporaryStatSet, (p, s) => this.handleTemporaryStatSet(p));
    router.register(OutHeader.TemporaryStatReset, (p, s) => this.handleTemporaryStatReset(p));
    router.register(OutHeader.MiniRoom, (p, s) => this.handleMiniRoom(p));
    router.register(OutHeader.UserMiniRoomBalloon, (p, s) => this.handleUserMiniRoomBalloon(p));
    router.register(OutHeader.EmployeeMiniRoomBalloon, (p, s) => this.handleEmployeeMiniRoomBalloon(p));
    router.register(OutHeader.ReactorEnterField, (p, s) => this.handleReactorEnter(p));
    router.register(OutHeader.ReactorLeaveField, (p, s) => this.handleReactorLeave(p));
    router.register(OutHeader.ReactorChangeState, (p, s) => this.handleReactorChangeState(p));
    router.register(OutHeader.ReactorMove, (p, s) => this.handleReactorMove(p));
    router.register(OutHeader.EmployeeEnterField, (p, s) => this.handleEmployeeEnter(p));
    router.register(OutHeader.EmployeeLeaveField, (p, s) => this.handleEmployeeLeave(p));
    router.register(OutHeader.SummonedEnter, (p, s) => this.handleSummonedEnter(p));
    router.register(OutHeader.SummonedLeave, (p, s) => this.handleSummonedLeave(p));
    router.register(OutHeader.SummonedMove, (p, s) => this.handleSummonedMove(p));
    router.register(OutHeader.TownPortalEnter, (p, s) => this.handleTownPortalEnter(p));
    router.register(OutHeader.TownPortalLeave, (p, s) => this.handleTownPortalLeave(p));
    router.register(OutHeader.AffectedAreaCreate, (p, s) => this.handleAffectedAreaCreate(p));
    router.register(OutHeader.AffectedAreaRemove, (p, s) => this.handleAffectedAreaRemove(p));
    router.register(OutHeader.OpenGateCreate, (p, s) => this.handleOpenGateCreate(p));
    router.register(OutHeader.OpenGateRemove, (p, s) => this.handleOpenGateRemove(p));
    router.register(OutHeader.MakerResult, (p, s) => this.handleMakerResult(p));
    // OG: CUserLocal::OnQuestResult (0x914080) — decode1(subAction), 13-case switch, complex quest UI
    router.register(OutHeader.QuestResult, (p) => {
      const subAction = p.readByte();
      const payload = p.readBytes(p.remaining);
      this.onQuestResult?.(subAction, payload);
    });
    // OG: CUserLocal::OnOpenSkillGuide (0x90e6aa) — no decode, opens UI(3,1) + OpenCurSkillGuide
    router.register(OutHeader.OpenSkillGuide, (_p) => { this.onOpenSkillGuide?.(); });
    // OG: CUserLocal::OnVengeanceSkillApply (0x909b10) — decode4(skillId), if 3120010 → DoActiveSkill_MeleeAttack
    router.register(OutHeader.VengeanceSkillApply, (p) => {
      const skillId = p.readInt();
      this.onVengeanceSkillApply?.(skillId);
    });
    // OG: CUserLocal::OnQuestGuideResult (case 274) — reads questId(4) for minimap arrow direction
    router.register(OutHeader.QuestGuideResult, (p) => {
      const questId = p.readInt();
      this.onQuestGuideResult?.(questId);
    });
    router.register(OutHeader.FieldEffect, (p, s) => this.handleFieldEffect(p));
    router.register(OutHeader.BlowWeather, (p, s) => this.handleBlowWeather(p));
    router.register(OutHeader.PlayJukeBox, (p, s) => this.handlePlayJukeBox(p));
    router.register(OutHeader.Clock, (p, s) => this.handleClock(p));
    router.register(OutHeader.DestroyClock, (p, s) => this.handleDestroyClock(p));
    router.register(OutHeader.KillCountInfo, (p, s) => this.handleKillCountInfo(p));
    router.register(OutHeader.MessageBoxCreateFailed, (p, s) => this.onMessageBoxCreateFailed?.());
    router.register(OutHeader.MessageBoxEnterField, (p, s) => this.handleMessageBoxEnterField(p));
    router.register(OutHeader.MessageBoxLeaveField, (p, s) => this.handleMessageBoxLeaveField(p));
    router.register(OutHeader.MassacreIncGauge, (p, s) => { this.onMassacreIncGauge?.({ incGauge: p.readInt() }); });
    router.register(OutHeader.MassacreResult, (p, s) => { this.onMassacreResult?.({ won: p.readByte() !== 0, finalGauge: p.readInt() }); });
    router.register(OutHeader.BroadcastMsg, (p, s) => this.handleBroadcastMsg(p));
    router.register(OutHeader.EntrustedShopCheckResult, (p, s) => this.handleEntrustedShopCheckResult(p));
    router.register(OutHeader.SkillUseResult, (p, s) => this.handleSkillUseResult(p));
    router.register(OutHeader.SkillLearnItemResult, (p, s) => this.handleSkillLearnItemResult(p));
    router.register(OutHeader.SkillResetItemResult, (p, s) => this.handleSkillResetItemResult(p));
    router.register(OutHeader.SkillCooltimeSet, (p, s) => this.handleSkillCooltimeSet(p));
    router.register(OutHeader.SkillPrepare, (p, s) => this.handleSkillPrepare(p));
    router.register(OutHeader.SkillCancel, (p, s) => this.handleSkillCancel(p));
    router.register(OutHeader.TransferFieldReqIgnored, (p, s) => this.handleTransferFieldReqIgnored(p));
    router.register(OutHeader.TransferChannelReqIgnored, (p, s) => this.handleTransferChannelReqIgnored(p));
    router.register(OutHeader.FieldSpecificData, (p, s) => this.handleFieldSpecificData(p));
    router.register(OutHeader.CoupleMessage, (p, s) => this.handleCoupleMessage(p));
    router.register(OutHeader.SummonItemInavailable, (p, s) => this.handleSummonItemInavailable(p));
    router.register(OutHeader.FieldObstacleOnOff, (p, s) => this.handleFieldObstacleOnOff(p));
    router.register(OutHeader.FieldObstacleOnOffStatus, (p, s) => this.handleFieldObstacleOnOffStatus(p));
    router.register(OutHeader.FieldObstacleAllReset, (p, s) => this.handleFieldObstacleAllReset(p));
    router.register(OutHeader.AdminResult, (p, s) => this.handleAdminResult(p));
    router.register(OutHeader.Quiz, (p, s) => this.handleQuiz(p));
    router.register(OutHeader.Desc, (p, s) => this.handleFieldDesc(p));
    router.register(OutHeader.SetQuestClear, (p, s) => this.handleSetQuestClear(p));
    router.register(OutHeader.SetQuestTime, (p, s) => this.handleSetQuestTime(p));
    router.register(OutHeader.WarnMessage, (p, s) => this.handleWarnMessage(p));
    router.register(OutHeader.SetObjectState, (p, s) => this.handleSetObjectState(p));
    router.register(OutHeader.StalkResult, (p, s) => this.handleStalkResult(p));
    router.register(OutHeader.RequestFootHoldInfo, (p, s) => this.handleRequestFootHoldInfo(p));
    router.register(OutHeader.AntiMacroResult, (p, s) => this.handleAntiMacroResult(p));
    router.register(OutHeader.DestroyShopResult, (p, s) => this.handleDestroyShopResult(p));
    router.register(OutHeader.MacroSysDataInit, (p, s) => this.handleMacroSysDataInit(p));
    router.register(OutHeader.SetITC, (p, s) => this.handleSetITC(p));
    router.register(OutHeader.SetCashShop, (p, s) => this.handleSetCashShop(p));

    // ── CWvsContext pure-gap handlers (IDA_NEW_GAPS.md) ─────────────────
    router.register(OutHeader.GivePopularityResult, (p, s) => this.handleGivePopularityResult(p));
    router.register(OutHeader.MemoResult, (p, s) => this.handleMemoResult(p));
    router.register(OutHeader.MapTransferResult, (p, s) => this.handleMapTransferResult(p));
    router.register(OutHeader.IncubatorResult, (p, s) => this.handleIncubatorResult(p));
    router.register(OutHeader.ShopScannerResult, (p, s) => this.handleShopScannerResult(p));
    router.register(OutHeader.BridleMobCatchFail, (p, s) => this.handleBridleMobCatchFail(p));
    router.register(OutHeader.ImitatedNPCResult, (p, s) => this.handleImitatedNPCResult(p));
    router.register(OutHeader.SetAvatarMegaphone, (p, s) => this.handleSetAvatarMegaphone(p));
    router.register(OutHeader.CancelNameChangeResult, (p, s) => this.handleCancelNameChangeResult(p));
    router.register(OutHeader.CancelTransferWorldResult, (p, s) => this.handleCancelTransferWorldResult(p));
    router.register(OutHeader.FakeGMNotice, (p, s) => this.handleFakeGMNotice(p));
    router.register(OutHeader.NewYearCardRes, (p, s) => this.handleNewYearCardRes(p));
    router.register(OutHeader.RandomMorphRes, (p, s) => this.handleRandomMorphRes(p));
    router.register(OutHeader.CakePieEventResult, (p, s) => this.handleCakePieEventResult(p));
    router.register(OutHeader.StageChange, (p, s) => this.handleStageChange(p));
    router.register(OutHeader.DragonBallBox, (p, s) => this.handleDragonBallBox(p));

    // ── CUserPool common-packet handlers (IDA_NEW_GAPS.md) ──────────────
    router.register(OutHeader.UserChatHistory, (p, s) => this.handleUserChatHistory(p));
    router.register(OutHeader.UserADBoard, (p, s) => this.handleUserADBoard(p));
    router.register(OutHeader.SetConsumeItemEffect, (p, s) => this.handleSetConsumeItemEffect(p));
    router.register(OutHeader.ShowItemUpgradeEffect, (p, s) => this.handleShowItemUpgradeEffect(p));
    router.register(OutHeader.ShowItemHyperUpgradeEffect, (p, s) => this.handleShowItemHyperUpgradeEffect(p));
    router.register(OutHeader.ShowItemOptionUpgradeEffect, (p, s) => this.handleShowItemOptionUpgradeEffect(p));
    router.register(OutHeader.ShowItemReleaseEffect, (p, s) => this.handleShowItemReleaseEffect(p));
    router.register(OutHeader.ShowItemUnreleaseEffect, (p, s) => this.handleShowItemUnreleaseEffect(p));
    router.register(OutHeader.UserHitByUser, (p, s) => this.handleUserHitByUser(p));
    router.register(OutHeader.UserTeslaTriangle, (p, s) => this.handleUserTeslaTriangle(p));
    router.register(OutHeader.UserFollowCharacter, (p, s) => this.handleUserFollowCharacter(p));
    router.register(OutHeader.UserShowPQReward, (p, s) => this.handleUserShowPQReward(p));
    router.register(OutHeader.UserSetPhase, (p, s) => this.handleUserSetPhase(p));
    router.register(OutHeader.ShowRecoverUpgradeCountEffect, (p, s) => this.handleShowRecoverUpgradeCountEffect(p));

    // ── CUserPool remote-packet handlers (IDA_NEW_GAPS.md) ─────────────
    router.register(OutHeader.UserMovingShootAttackPrepare, (p, s) => this.handleUserMovingShootAttackPrepare(p));
    router.register(OutHeader.UserHit, (p, s) => this.handleUserHit(p));
    router.register(OutHeader.UserSetActiveEffectItem, (p, s) => this.handleUserSetActiveEffectItem(p));
    router.register(OutHeader.UserShowUpgradeTombEffect, (p, s) => this.handleUserShowUpgradeTombEffect(p));
    router.register(OutHeader.UserSetTemporaryStat, (p, s) => this.handleUserSetTemporaryStat(p));
    router.register(OutHeader.UserResetTemporaryStat, (p, s) => this.handleUserResetTemporaryStat(p));
    router.register(OutHeader.UserReceiveHP, (p, s) => this.handleUserReceiveHP(p));
    router.register(OutHeader.UserGuildNameChanged, (p, s) => this.handleUserGuildNameChanged(p));
    router.register(OutHeader.UserGuildMarkChanged, (p, s) => this.handleUserGuildMarkChanged(p));
    router.register(OutHeader.UserThrowGrenade, (p, s) => this.handleUserThrowGrenade(p));

    // ── Pet & Dragon handlers (IDA_NEW_GAPS.md, re-decompiled — see PacketArgs.ts) ──
    router.register(OutHeader.PetActivated, (p, s) => this.handlePetActivated(p, true));
    router.register(OutHeader.PetActivatedSilent, (p, s) => this.handlePetActivated(p, false));
    router.register(OutHeader.PetEvol, (p, s) => this.handlePetEvol(p));
    router.register(OutHeader.PetMove, (p, s) => this.handlePetMove(p));
    router.register(OutHeader.PetAction, (p, s) => this.handlePetAction(p));
    router.register(OutHeader.PetNameChange, (p, s) => this.handlePetNameChange(p));
    router.register(OutHeader.PetLoadExceptionList, (p, s) => this.handlePetLoadExceptionList(p));
    router.register(OutHeader.PetActionCommand, (p, s) => this.handlePetActionCommand(p));
    router.register(OutHeader.DragonMove, (p, s) => this.handleDragonMove(p));
    router.register(OutHeader.DragonAfterMove, (p, s) => this.handleDragonAfterMove(p));
    router.register(OutHeader.DragonAction, (p, s) => this.handleDragonAction(p));

    // ── CMob gap handlers (IDA_NEW_GAPS.md) ────────────────────────────
    router.register(OutHeader.MobStatSet, (p, s) => this.handleMobStatSet(p));
    router.register(OutHeader.MobStatReset, (p, s) => this.handleMobStatReset(p));
    router.register(OutHeader.MobSuspendReset, (p, s) => this.handleMobSuspendReset(p));
    router.register(OutHeader.MobAffected, (p, s) => this.handleMobAffected(p));
    router.register(OutHeader.MobCatchEffect, (p, s) => this.handleMobCatchEffect(p));
    router.register(OutHeader.MobEffectByItem, (p, s) => this.handleMobEffectByItem(p));
    router.register(OutHeader.MobIncChargeCount, (p, s) => this.handleMobIncChargeCount(p));
    router.register(OutHeader.MobEscortFullPath, (p, s) => this.handleMobEscortFullPath(p));
    router.register(OutHeader.MobEscortStopPerm, (p, s) => this.handleMobEscortStopPerm(p));
    router.register(OutHeader.MobEscortStopSay, (p, s) => this.handleMobEscortStopSay(p));
    router.register(OutHeader.MobEscortReturnBefore, (p, s) => this.handleMobEscortReturnBefore(p));
    router.register(OutHeader.MobNextAttack, (p, s) => this.handleMobNextAttack(p));
    router.register(OutHeader.MobAttackedByMob, (p, s) => this.handleMobAttackedByMob(p));

    // ── CNpc gap handler (IDA_NEW_GAPS.md) ─────────────────────────────
    router.register(OutHeader.NpcTemplatePacket, (p, s) => this.handleNpcTemplatePacket(p));
  }

  /**
   * Decode `OutHeader.SetField` (141). Per C++ CField::SetField + ENUM_CField_int32
   * (enums.json:476-510). 4.1: removed the try/catch + opaque `p.readInt` discards;
   * every field now has a named reader.
   *
   * Layout:
   *   short  client-op (echo — not stored)
   *   int    channelId
   *   int    characterId
   *   byte   fieldKey
   *   byte   isMigrate (0/1)
   *   short  nNotifierCheck  (was mislabelled 'mapType' — see decompile/71A0A0.c)
   *   [if nNotifierCheck > 0: title string + nNotifierCheck content strings]
   *   if migrate:
   *     int × 3  calcDamageSeed1/2/3
   *     long     dwFlag
   *     byte     gender
   *     byte     skin
   *     stat     AvatarCodec::DecodeCharacterStat
   *     look     AvatarLook (the C++ decoder ends with AvatarLook, not stat.look)
   *   else:
   *     byte   nFieldType
   *     int    posMap
   *     byte   portal
   *     int    mobCapacity
   *     byte   unk
   */
  private handleSetField(p: InPacket, session: ClientSession): void {
    // TODO_AUDIT.md live entry-debug pass: v95 CStage::OnSetField first calls
    // CClientOptMan::DecodeOpt (ushort count, then count x { int type, int value }).
    // Treating the count as a fixed echo word desynced every following field
    // whenever the server sent options, so AvatarLook decoded as empty/garbage.
    const optCount = p.readUShort();
    for (let i = 0; i < optCount; i++) {
      p.readInt();
      p.readInt();
    }
    const channelId = p.readInt();
    const characterId = p.readInt();
    const fieldKey = p.readByte();
    const isMigrate = p.readByte() !== 0;
    // TODO_AUDIT.md Hundred-and-sixty-eighth pass: OG CStage::OnSetField (decompile/71A0A0.c)
    // reads Decode2 here as nNotifierCheck (event-alarm count), NOT a mapType. Earlier passes
    // mislabelled this 'mapType'. When nNotifierCheck > 0 the notifier strings must be decoded
    // or all subsequent reads desync.
    const nNotifierCheck = p.readShort();
    const args: SetFieldArgs = { channelId, characterId, fieldKey, isMigrate, nNotifierCheck };
    if (nNotifierCheck > 0) {
      const title = p.readString();
      const lines: string[] = [];
      for (let i = 0; i < nNotifierCheck; i++) lines.push(p.readString());
      args.eventAlarm = { title, lines };
    }
    if (isMigrate) {
      args.calcDamageSeed1 = p.readInt();
      args.calcDamageSeed2 = p.readInt();
      args.calcDamageSeed3 = p.readInt();
      // TODO_AUDIT.md channel-migration entry fix: the migrate remainder IS the
      // full CharacterData block, which begins with dwFlag. CharacterDataDecoder
      // reads that long itself, so reading it here too consumed 8 bytes twice and
      // desynced the whole CharacterStat/AvatarLook — handleSetField then ran off
      // the buffer, threw, was swallowed in drainInbound, and onSetField never
      // fired (black screen, never entered the field). Let Decode read dwFlag.
      const characterData = CharacterDataDecoder.Decode(p);
      args.dwFlag = characterData.flag;
      if (characterData.characterStat) {
        args.stat = characterData.characterStat;
        args.gender = characterData.characterStat.gender;
        args.skin = characterData.characterStat.skin;
        args.look = AvatarCodec.FromCharacterData(characterData.characterStat, characterData.equipped, characterData.equippedCash);
      }
      // OG: CharacterData.money — exposed for CUIItem meso display.
      if (characterData.money !== undefined) args.money = characterData.money;
      // OG: CharacterData.equipped — populate equip panel on field entry
      if (characterData.equipped) args.equipped = characterData.equipped;
      if (characterData.equippedCash) args.equippedCash = characterData.equippedCash;
    } else {
      args.nFieldType = p.readByte();
      args.posMap = p.readInt();
      args.portal = p.readByte();
      args.mobCapacity = p.readInt();
      p.readByte(); // unk
    }
    this.onSetField?.(args);
    if (args.eventAlarm) this.onEventAlarm?.(args.eventAlarm.title, args.eventAlarm.lines);
  }

  private handleMigrateCommand(p: InPacket): void {
    p.readByte();
    const host = p.readBytes(4);
    const port = p.readUShort();
    this.onMigrateCommand?.(host, port);
  }

  private handleAliveReq(session: ClientSession): void {
    const ack = OutPacket.Of(InHeader.AliveAck);
    session.send(ack);
  }

  private handleStatChanged(p: InPacket): void {
    p.readByte();
    const mask = Number(p.readLong());
    const args: StatChangedArgs = { mask: BigInt(mask) };
    const m = mask;
    if ((m & MapleStat.Skin)    !== 0) args.skin = p.readByte();
    if ((m & MapleStat.Face)    !== 0) args.face = p.readInt();
    if ((m & MapleStat.Hair)    !== 0) args.hair = p.readInt();
    if ((m & MapleStat.PetSn1)  !== 0) p.readLong();
    if ((m & MapleStat.Level)   !== 0) args.level = p.readByte();
    if ((m & MapleStat.Job)     !== 0) { args.job = p.readShort(); this._currentJob = args.job; }
    if ((m & MapleStat.Str)     !== 0) args.str = p.readShort();
    if ((m & MapleStat.Dex)     !== 0) args.dex = p.readShort();
    if ((m & MapleStat.Int)     !== 0) args.int = p.readShort();
    if ((m & MapleStat.Luk)     !== 0) args.luk = p.readShort();
    if ((m & MapleStat.Hp)      !== 0) args.hp = p.readInt();
    if ((m & MapleStat.MaxHp)   !== 0) args.maxHp = p.readInt();
    if ((m & MapleStat.Mp)      !== 0) args.mp = p.readInt();
    if ((m & MapleStat.MaxMp)   !== 0) args.maxMp = p.readInt();
    if ((m & MapleStat.Ap)      !== 0) args.ap = p.readShort();
    // FIXED 2026-06-20: FieldHandlers now tracks _currentJob across
    // StatChanged packets. When Sp bit is set for Cygnus (job/1000==3),
    // Aran (job/100==22), or Evan (job==2001), ExtendSP::Decode is used:
    // count:byte then count×(jobLevel:byte, sp:byte). For all other jobs
    // (or when _currentJob is 0 / unknown), falls back to plain short read.
    if ((m & MapleStat.Sp) !== 0) {
      if (IsExtendSpJob(this._currentJob)) {
        const count = p.readByte();
        const buf = new Uint8Array(1 + count * 2);
        buf[0] = count;
        const sub = p.readBytes(count * 2);
        buf.set(sub, 1);
        args.extendedSp = buf;
      } else {
        args.sp = p.readShort();
      }
    }
    if ((m & MapleStat.Exp)     !== 0) args.exp = p.readInt();
    if ((m & MapleStat.Pop)     !== 0) args.pop = p.readShort();
    if ((m & MapleStat.Meso)    !== 0) args.meso = p.readInt();
    if ((m & MapleStat.PetSn2)  !== 0) p.readLong();
    if ((m & MapleStat.PetSn3)  !== 0) p.readLong();
    // CONFIRMED real-name fix: decompile/4FA000.c shows bit 0x200000 is
    // "TempEXP" (_ZtlSecureTear_nTempEXP), not "Fatigue" — there is no
    // Fatigue field anywhere in GW_CharacterStat::DecodeChangeStat. Renamed
    // the enum member below (MapleStat.Fatigue -> MapleStat.TempExp); the
    // read shape itself (a single discarded int) was already correct.
    if ((m & MapleStat.TempExp) !== 0) p.readInt();
    this.onStatChanged?.(args);
  }

  private handleMobEnter(p: InPacket): void {
    const mobId = p.readInt();
    p.readByte(); // bSummoned (always 0)
    const templateId = p.readInt();
    const moveAction = p.readByte();
    const controllerFlag = p.readByte() !== 0;
    p.readShort(); // usCtrlSN (control sequence number)
    const dwMobStatFlag = p.readInt();
    const x = p.readShort();
    const y = p.readShort();
    const fhId = p.readShort();
    const rx0 = p.readShort();
    const rx1 = p.readShort();
    const summonType = p.readSByte();
    let summonId: number | undefined;
    if (summonType === -3 || summonType >= 0) summonId = p.readInt();
    const maxHp = p.readInt();
    const curHp = p.readInt();
    const team = p.readByte();
    p.readByte(); // bEffect
    const isBoss = p.readByte() !== 0;
    this.onMobEnter?.({ mobId, templateId, x, y, fhId, moveAction, controllerFlag, dwMobStatFlag, rx0, rx1, summonType, summonId, maxHp, curHp, team, isBoss });
  }

  private handleMobLeave(p: InPacket): void {
    const mobId = p.readInt();
    const leaveType = p.readByte();
    this.onMobLeave?.(mobId, leaveType);
  }

  private handleMobChangeController(p: InPacket): void {
    const isCtrl = p.readByte() !== 0;
    const mobId = p.readInt();
    this.onMobChangeController?.(mobId, isCtrl);
  }

  private handleMobMove(p: InPacket): void {
    // OG: CMob::OnMove (0x652200)
    // Packet: mobId(4) bNotForceLandingWhenDiscard(1) bNotChangeAction(1) bNextAttackPossible(1) bLeft(1)
    //         skillEffectId(4) multiTargetCount(4) [targets...] randTimeCount(4) [randTimes...] MovePath(variable)
    const mobId = p.readInt();
    const bNotForceLandingWhenDiscard = p.readByte();
    const bNotChangeAction = p.readByte() !== 0;
    const bNextAttackPossible = p.readByte() !== 0;
    const bLeft = p.readByte();
    // skill effect ID (4 bytes) — used for mob skill visual effects
    p.readInt();
    // multi-target ball positions
    const multiCount = p.readInt();
    for (let i = 0; i < multiCount; i++) { p.readInt(); p.readInt(); }
    // random times for area attack
    const randCount = p.readInt();
    for (let i = 0; i < randCount; i++) p.readInt();
    // Decode the full MovePath blob
    const movePath = DecodeMovePath(p);
    this.onMobMove?.({ mobId, bNotForceLandingWhenDiscard, bNotChangeAction, bNextAttackPossible, bLeft, movePath });
  }

  private handleMobDamaged(p: InPacket): void {
    const mobId = p.readInt();
    p.readByte();
    const damage = p.readInt();
    let hp = -1, maxHp = -1;
    try { hp = p.readInt(); maxHp = p.readInt(); } catch { /* skip */ }
    this.onMobDamaged?.({ mobId, damage, hp, maxHp });
  }

  private handleMobCtrlAck(p: InPacket): void {
    const mobId = p.readInt();
    const mobCtrlSn = p.readShort();
    const nextAttack = p.readByte();
    const mp = p.readShort();
    const skill = p.readByte();
    const slv = p.readByte();
    this.onMobCtrlAck?.({
      mobId, mobCtrlSn, nextAttackPossible: nextAttack !== 0,
      mp, nextSkillId: skill, nextSkillLevel: slv,
    });
  }

  private handleMobHpIndicator(p: InPacket): void {
    const mobId = p.readInt();
    const pct = p.readByte();
    this.onMobHpIndicator?.(mobId, pct);
  }

  private handleMobSpecialEffectBySkill(p: InPacket): void {
    // OG: CMob::OnSpecialEffectBySkill (decompile/6540b0.c) — int mobId
    // (decoded by the dispatcher), int skillId, int casterCharId, short
    // delay.
    const mobId = p.readInt();
    const skillId = p.readInt();
    const casterCharId = p.readInt();
    const delay = p.readShort();
    this.onMobSpecialEffectBySkill?.({ mobId, skillId, casterCharId, delay });
  }

  private handleMobSkillDelay(p: InPacket): void {
    // OG: CMob::OnMobSkillDelay (decompile/63d560.c) — int mobId (decoded
    // by the dispatcher), int delayTime, int skillId, int slv, int option.
    const mobId = p.readInt();
    const delayTime = p.readInt();
    const skillId = p.readInt();
    const slv = p.readInt();
    const option = p.readInt();
    this.onMobSkillDelay?.({ mobId, delayTime, skillId, slv, option });
  }

  private handleMobSpeaking(p: InPacket): void {
    // OG: CMob::OnMobSpeaking (decompile/650000.c, opcode 301) — int mobId,
    // int nSpeakInfo (entry index into apSpeakInformation), int nSpeech
    // (line index, passed as raw int cast to ZXString pointer then used as
    // unsigned array index). Server-driven; triggers an explicit speech line.
    const mobId = p.readInt();
    const speakInfoIdx = p.readInt();
    const speechLineIdx = p.readInt();
    this.onMobSpeaking?.({ mobId, speakInfoIdx, speechLineIdx });
  }

  private handleNpcEnter(p: InPacket): void {
    // OG: CNpcPool::OnNpcEnterField (0x679680) → CNpc::Init (0x676770)
    // Packet: objId(4) templateId(4) x(2) y(2) moveAction(1) footholdId(2) rgHorzLow(2) rgHorzHigh(2) bEnabled(1)
    const objId = p.readInt();
    const templateId = p.readInt();
    const x = p.readShort();
    const y = p.readShort();
    const moveAction = p.readByte();
    const footholdId = p.readShort();
    const rgHorzLow = p.readShort();
    const rgHorzHigh = p.readShort();
    const bEnabled = p.readByte() !== 0;
    this.onNpcEnter?.({ objId, templateId, x, y, moveAction, footholdId, rgHorzLow, rgHorzHigh, bEnabled });
  }

  private handleNpcLeave(p: InPacket): void {
    this.onNpcLeave?.(p.readInt());
  }

  private handleUserEnter(p: InPacket): void {
    const charId = p.readInt();
    const level = p.readByte();
    const name = p.readString(13);
    try {
      const guildName = p.readString(12);
      const guildMarkBg = p.readShort();
      const guildMarkBgColor = p.readByte();
      const guildMark = p.readShort();
      const guildMarkColor = p.readByte();
      const look = AvatarCodec.DecodeAvatarLook(p);
      const job = p.readInt();
      const grade = p.readInt();
      const chHair = p.readInt();
      const chHairColor = p.readInt();
      const chFace = p.readInt();
      const sex = p.readInt();
      const x = p.readShort();
      const y = p.readShort();
      this.onUserEnter?.({ charId, level, name, look, x, y, guildName, guildMarkBg, guildMarkBgColor, guildMark, guildMarkColor, job, grade, chHair, chHairColor, chFace, sex });
    } catch {
      this.onUserEnter?.({ charId, level, name, x: 0, y: 0 });
    }
  }

  private handleUserLeave(p: InPacket): void {
    this.onUserLeave?.(p.readInt());
  }

  private handleUserAttack(p: InPacket, attackType: 'melee' | 'shoot' | 'magic' | 'body'): void {
    // OG: CUserPool::OnUserRemotePacket dispatches nType 211-214 to
    // CUserRemote::OnAttack(nType, iPacket) (live IDA decompile,
    // Maplestory95.exe.i64 0x94b390/0x95a670) after reading a leading int
    // charId. Common-case decode only — see UserAttackArgs doc comment for
    // what's intentionally not replicated (it'll just throw and the whole
    // packet is dropped for those skillIds, same as other deferred edge
    // cases in this codebase).
    const charId = p.readInt();
    try {
      const countAndDamage = p.readByte();
      const targetCount = countAndDamage >> 4;
      const damagePerMob = countAndDamage & 0xF;
      p.readByte(); // level — server-authoritative, not needed client-side
      const slv = p.readByte();
      const skillId = slv !== 0 ? p.readInt() : 0;
      // OG special-cases skillId 3211006 here (an extra byte+int passive-
      // skill linkage read) — not handled; that skill will desync below.
      p.readByte(); // flag (bSerialAttack = flag & 0x20 — meso-explosion
                    // damage-array shape switch, not replicated)
      const actionAndDir = p.readShort();
      const facingLeft = (actionAndDir & 0x8000) !== 0;
      const action = actionAndDir & 0x7FFF;
      if (action > 0x110) { this.onUserAttack?.({ charId, attackType, skillId, slv, action, facingLeft, actionSpeed: 0, mastery: 0, bulletItemId: 0, targets: [] }); return; }

      const actionSpeed = p.readByte();
      const mastery = p.readByte();
      const bulletItemId = p.readInt();
      const targets: AttackTargetInfo[] = [];
      for (let i = 0; i < targetCount; i++) {
        const mobId = p.readInt();
        if (mobId === 0) continue;
        const hitAction = p.readByte();
        const damage: number[] = [];
        for (let j = 0; j < damagePerMob; j++) {
          p.readByte(); // per-hit byte (delay-like) — not exposed, unconfirmed exact meaning
          damage.push(p.readInt());
        }
        targets.push({ mobId, hitAction, damage });
      }

      let ballStart: { x: number; y: number } | undefined;
      if (attackType === 'shoot') {
        ballStart = { x: p.readShort(), y: p.readShort() };
      }

      this.onUserAttack?.({ charId, attackType, skillId, slv, action, facingLeft, actionSpeed, mastery, bulletItemId, targets, ballStart });
    } catch { /* skip — likely an unreplicated special-cased skillId */ }
  }

  private handleUserMove(p: InPacket): void {
    // OG: CUserRemote::OnMove -> CMovePath::OnMovePacket(iPacket, bPassive=0)
    // -> CMovePath::Decode (live IDA decompile, Maplestory95.exe.i64
    // 0x948a80/0x6683f0/0x667920) — was previously only reading the final
    // x/y short pair and discarding the entire MoveElement list (stance,
    // facing, per-element velocity), so other players never animated or
    // faced the right direction regardless of how they moved.
    const charId = p.readInt();
    try {
      const path = DecodeMovePath(p);
      const last = path.elements[path.elements.length - 1];
      const x = last?.x ?? path.originX;
      const y = last?.y ?? path.originY;
      if (last) {
        const { stance, facingLeft } = MoveActionToStance(last.moveAction);
        this.onUserMove?.({ charId, x, y, stance, facingLeft });
      } else {
        this.onUserMove?.({ charId, x, y });
      }
    } catch { /* skip */ }
  }

  private handleUserEmotion(p: InPacket): void {
    const charId = p.readInt();
    const emotion = p.readInt();
    const duration = p.readInt();
    const byItem = p.readBool();
    this.onUserEmotion?.({ charId, emotion, durationMs: duration, byItemOption: byItem });
  }

  private handleUserEmotionLocal(p: InPacket): void {
    const emotion = p.readInt();
    const duration = p.readInt();
    const byItem = p.readBool();
    this.onUserEmotion?.({ charId: 0, emotion, durationMs: duration, byItemOption: byItem });
  }

  private handleUserEffect(p: InPacket, isLocal: boolean): void {
    const charId = isLocal ? 0 : p.readInt();
    const effectType = p.readByte();
    const payload = p.readBytes(p.remaining);
    this.onUserEffect?.({ charId, effectType, payload, isLocal });
  }

  private handleUserSetActivePortableChair(p: InPacket): void {
    const charId = p.readInt();
    const itemId = p.readInt();
    this.onUserSetActivePortableChair?.({ charId, itemId });
  }

  private handleUserAvatarModified(p: InPacket): void {
    const charId = p.readInt();
    const flags = p.readByte();
    let look: AvatarLook | undefined;
    if (flags & 1) look = AvatarCodec.DecodeAvatarLook(p);
    let speed: number | undefined;
    if (flags & 2) speed = p.readByte();
    let carryItemEffect: number | undefined;
    if (flags & 4) carryItemEffect = p.readByte();

    let coupleItemSN: bigint | undefined;
    let pairItemSN: bigint | undefined;
    let coupleCharacterId: number | undefined;
    if (p.readByte()) {
      coupleItemSN = p.readLong(); pairItemSN = p.readLong(); coupleCharacterId = p.readInt();
    }
    let friendshipItemSN: bigint | undefined;
    let friendshipPairItemSN: bigint | undefined;
    let friendCharacterId: number | undefined;
    if (p.readByte()) {
      friendshipItemSN = p.readLong(); friendshipPairItemSN = p.readLong(); friendCharacterId = p.readInt();
    }
    let marriageCharacterId: number | undefined;
    let marriagePairCharacterId: number | undefined;
    let weddingRingId: number | undefined;
    if (p.readByte()) {
      marriageCharacterId = p.readInt(); marriagePairCharacterId = p.readInt(); weddingRingId = p.readInt();
    }
    const completedSetItemId = p.readInt();
    this.onUserAvatarModified?.({
      charId, look, speed, carryItemEffect,
      coupleItemSN, pairItemSN, coupleCharacterId,
      friendshipItemSN, friendshipPairItemSN, friendCharacterId,
      marriageCharacterId, marriagePairCharacterId, weddingRingId,
      completedSetItemId,
    });
  }

  private handleCharacterInfo(p: InPacket): void {
    this.onCharacterInfo?.(this._decodeCharacterInfo(p));
  }

  static DecodeCharacterInfo(p: InPacket): any {
    const dummy = new FieldHandlers();
    return dummy._decodeCharacterInfo(p);
  }

  private _decodeCharacterInfo(p: InPacket): CharacterInfoArgs {
    const charId = p.readInt();
    const level = p.readByte();
    const job = p.readShort();
    const fame = p.readShort();
    const married = p.readByte() !== 0;
    const guild = p.readString();
    const alliance = p.readString();
    const pets: CharacterInfoPet[] = [];
    // CWvsContext::OnCharacterInfo (decompile/A05750.c) reads TWO bytes here,
    // not one: a discarded scratch byte (`pMedalInfo.gap0`) then a second byte
    // (`v9`) that's passed as the pet count to CUIUserInfo::SetMultiPetInfo.
    // OG: CUIUserInfo::SetMultiPetInfo (IDA: 0x8b66a0) — confirmed via fresh
    // decompile (TODO_AUDIT.md "Fiftieth pass") to be a do-while: decode one
    // pet's full field block FIRST, unconditionally, THEN read a trailing
    // continuation byte and loop only if nonzero. So the wire shape for N
    // pets is [pet1][byte] [pet2][byte] ... [petN][byte=0] — no leading byte
    // before the first pet. The previous `while (readByte()) { ...fields }`
    // read a byte *before* every pet including the first, consuming the
    // first byte of pet 1's real templateId as a bogus "has next" flag and
    // shifting every pet's fields by one byte for the rest of the list.
    p.readByte();
    const petCount = p.readByte();
    if (petCount > 0) {
      let hasMore = true;
      while (hasMore) {
        pets.push({
          templateId: p.readInt(),
          name: p.readString(),
          level: p.readByte(),
          tameness: p.readShort(),
          repleteness: p.readByte(),
          petSkill: p.readShort(),
          petWear: p.readInt(),
        });
        hasMore = p.readByte() !== 0;
      }
    }
    return { charId, level, job, fame, married, guild, alliance, pets };
  }

  private handleDropEnter(p: InPacket): void {
    // OG: CDropPool::OnDropEnterField (decompile/516670.c). A real int
    // dwSourceID is encoded right after pt2.y (the landing position) and
    // before the conditional pt1.x/pt1.y/tDelay (source position) block —
    // this was previously missing entirely, which misaligned every read
    // after it: the exposed sourceX/sourceY were actually reading
    // dwSourceID's bytes instead of the real source position, so every
    // animated drop arced in from a wrong/garbage position instead of the
    // mob/player that dropped it.
    const enterType = p.readByte();
    const dropId = p.readInt();
    const isMoney = p.readBool();
    const info = p.readInt();
    const ownerId = p.readInt();
    p.readByte();
    const x = p.readShort();
    const y = p.readShort();
    const sourceId = p.readInt();
    // OG: source position block is written for all enter types except
    // ON_THE_FOOTHOLD (server writes it whenever enterType != 2).
    // Only Create (1) triggers the parabolic fall animation in DropSprite.
    const hasSourcePos = enterType !== DropEnterType.OnTheFoothold;
    const animated = enterType === DropEnterType.Create;
    let sx = x, sy = y;
    if (hasSourcePos) {
      try {
        sx = p.readShort();
        sy = p.readShort();
        p.readShort();
      } catch { /* source position not available */ }
    }
    this.onDropEnter?.({ dropId, isMoney, itemIdOrAmount: info, ownerId, sourceId, x, y, sourceX: sx, sourceY: sy, animated });
  }

  private handleDropLeave(p: InPacket): void {
    const leaveType = p.readByte();
    const dropId = p.readInt();
    let pickUpId = 0;
    if (leaveType === DropLeaveType.PickedUpByUser
        || leaveType === DropLeaveType.PickedUpByMob
        || leaveType === DropLeaveType.PickedUpByPet) {
      try { pickUpId = p.readInt(); } catch {}
    }
    this.onDropLeave?.({ dropId, leaveType, pickUpId });
  }

  private handleMessage(p: InPacket): void {
    const msgType = p.readByte();
    switch (msgType) {
      case MessageType.IncExp:
        // CWvsContext::OnIncEXPMessage (decompile/9F86C0.c): the first two
        // fields are flag:byte then exp:int, confirmed matching this read —
        // the real message has many more optional bonus-breakdown fields
        // after (mob-event/party/item/wedding/premium/quest/rainbow-week/
        // cake-pie bonus EXP) that nothing in this client's UI consumes
        // (only the base exp value feeds onIncExp); under-reading the rest
        // is safe since each OutHeader opcode is its own independently
        // framed packet (PacketRouter.dispatch reads exactly one opcode's
        // payload per call) — leftover unread bytes are simply discarded,
        // not carried into the next packet.
        p.readByte();
        this.onIncExp?.(p.readInt());
        break;
      case MessageType.IncMoney:
        this.onIncMoney?.(p.readInt());
        break;
      case MessageType.LootWarning: {
        // CWvsContext::OnDropPickUpMessage (decompile/9FE190.c). The subtype
        // byte is signed (case -2/-3 are real, distinct branches) and each
        // shape differs:
        //   subtype 1 (money, checked first, separately from the switch):
        //     byte, money:int, short
        //   subtype 0 (item warning/unidentified): itemId:int, quantity:int
        //   subtype 2 (item EXPIRE): itemId:int ONLY — no quantity field at
        //     all on the wire. The previous code shared one case label for
        //     both 0 and 2, reading a quantity int that doesn't exist for
        //     subtype 2 — harmless only because this is the last read in the
        //     packet (nothing after it to desync), but still a wrong field
        //     read/reported value.
        const subtype = p.readSByte();
        const args: LootMessageArgs = { warning: subtype, isMoney: false };
        switch (subtype) {
          case LootSubType.ItemWarning:
            args.itemId = p.readInt();
            args.quantity = p.readInt();
            break;
          case LootSubType.ItemExpire:
            args.itemId = p.readInt();
            break;
          case LootSubType.MoneyWarning:
            args.isMoney = true;
            p.readByte();
            args.money = p.readInt();
            p.readShort();
            break;
        }
        this.onLootMessage?.(args);
        break;
      }
      case MessageType.QuestRecord: {
        // CWvsContext::OnQuestRecordMessage (decompile/A03920.c): questId:
        // short, state:byte, then state==1(Started) reads value:string,
        // state==2(Completed) reads an 8-byte FILETIME, and the else branch
        // (state==0/Removed) reads NOTHING further — confirmed no extra byte
        // exists on the wire for Removed. The previous code read a phantom
        // discard byte for Removed that doesn't exist on the real wire.
        const questId = p.readShort();
        const state = p.readByte();
        let value = '';
        if (state === QuestRecordState.Started) value = p.readString();
        else if (state === QuestRecordState.Completed) p.readLong();
        this.onQuestRecord?.({ questId, state, value, isEx: false });
        break;
      }
      case MessageType.QuestRecordEx: {
        const questId = p.readShort();
        const value = p.readString();
        this.onQuestRecord?.({ questId, state: QuestRecordState.Started, value, isEx: true });
        break;
      }
      case MessageType.CashItemExpire: {
        const itemId = p.readInt();
        this.onCashItemExpire?.({ itemId });
        break;
      }
      case MessageType.IncSp: {
        // CWvsContext::OnIncSPMessage (decompile/9F8570.c): job:short(2),
        // spGain:byte(1) — NOT byte+int(5). The previous read shape was both
        // the wrong field types AND tried to read 2 more bytes than this
        // 3-byte message actually contains, which throws inside
        // InPacket.ensureRemaining — meaning every IncSp notification was
        // silently dropped (PacketRouter.dispatch's catch swallows the
        // exception and logs it, but onIncSp never fires).
        const job = p.readShort();
        const sp = p.readByte();
        void job;
        this.onIncSp?.(sp);
        break;
      }
      case MessageType.IncFame: {
        // CWvsContext::OnIncPOPMessage (decompile/9F90A0.c): value:int(4)
        // ONLY — no leading discard byte. Previous code read byte+int (5
        // bytes) from a 4-byte message, same over-read-and-drop bug as IncSp.
        const fame = p.readInt();
        this.onIncFame?.(fame);
        break;
      }
      case MessageType.IncGP: {
        // CWvsContext::OnIncGPMessage (decompile/9F91E0.c): value:int(4)
        // ONLY — same fix as IncFame above.
        const gp = p.readInt();
        this.onIncGp?.(gp);
        break;
      }
      case MessageType.GiveBuff: {
        const itemId = p.readInt();
        this.onGiveBuff?.({ itemId });
        break;
      }
      case MessageType.System: {
        const text = p.readString();
        this.onSystemMessage?.({ text, type: msgType });
        break;
      }
      case MessageType.OpenURL: {
        const url = p.readString();
        this.onOpenUrl?.({ url });
        break;
      }
      case MessageType.EncryptedMessage: {
        const text = p.readString();
        console.debug('EncryptedMessage:', text);
        break;
      }
      case MessageType.GeneralItemExpire: {
        // CWvsContext::OnGeneralItemExpireMessage (decompile/9F8180.c):
        // count:byte then count× itemId:int — a LIST, not a single item.
        // Previously read only one bare itemId:int with no count prefix at
        // all, dropping every item past the first whenever more than one
        // item expired in the same notification.
        const count = p.readByte();
        const itemIds: number[] = [];
        for (let i = 0; i < count; i++) itemIds.push(p.readInt());
        this.onGeneralItemExpire?.(itemIds);
        break;
      }
      case MessageType.ItemProtectExpire: {
        // CWvsContext::OnItemProtectExpireMessage (decompile/9F82E0.c): count:byte +
        // count×itemId:int. OG looks up item name then ChatLogAdd(type=12). TODO_AUDIT.md Hundred-and-sixty-sixth pass.
        const count = p.readByte();
        const itemIds: number[] = [];
        for (let i = 0; i < count; i++) itemIds.push(p.readInt());
        this.onItemProtectExpire?.(itemIds);
        break;
      }
      case MessageType.ItemExpireReplace: {
        // CWvsContext::OnItemExpireReplaceMessage (decompile/9FE7A0.c):
        // count:byte then count×string (item NAME text, not itemId:int —
        // previously read a single bare int with no count prefix and the
        // wrong field type entirely). OG: ChatLogAdd(type=12) for each.
        // TODO_AUDIT.md Hundred-and-sixty-sixth pass.
        const count = p.readByte();
        const messages: string[] = [];
        for (let i = 0; i < count; i++) messages.push(p.readString());
        this.onItemExpireReplace?.(messages);
        break;
      }
      case MessageType.WheelOfFortune: {
        const text = p.readString();
        this.onWheelOfFortune?.(text);
        break;
      }
      case MessageType.SkillExpire: {
        const count = p.readByte();
        const skillIds: number[] = [];
        for (let i = 0; i < count; i++) skillIds.push(p.readInt());
        this.onSkillExpire?.(skillIds);
        break;
      }
      default:
        console.debug('Unhandled Message type', msgType);
        break;
    }
  }

  private handleInventoryOp(p: InPacket): void {
    // CWvsContext::OnInventoryOperation (decompile/A08A70.c).
    p.readByte();
    const count = p.readByte();
    const ops: InventoryOpArg[] = [];
    // Set when any Move/Remove op touches equip slot 1 (invType===1) with a
    // negative position — the real client's `nCurItemPos` flag, which gates
    // a trailing byte after the whole op list (SetSecondaryStatChangedPoint).
    let hasEquipSlotChange = false;
    for (let i = 0; i < count; i++) {
      const opType = p.readByte();
      const invType = p.readByte();
      const pos = p.readShort();
      const op: InventoryOpArg & { item?: any } = { opType, invType, pos };
      switch (opType) {
        case InventoryOpType.Add:
          op.item = ItemDecoder.Decode(p);
          op.itemId = op.item.itemId;
          if (op.item.equip) op.equipStats = op.item.equip;
          op.petLevel = op.item.petLevel;
          op.petTameness = op.item.petTameness;
          op.petRepleteness = op.item.petRepleteness;
          op.petRemainLife = op.item.petRemainLife;
          break;
        case InventoryOpType.QuantityChange: op.quantity = p.readShort(); break;
        case InventoryOpType.Move: {
          const newPos = p.readShort();
          op.newPos = newPos;
          if (invType === 1 && (pos < 0 || newPos < 0)) hasEquipSlotChange = true;
          break;
        }
        case InventoryOpType.Remove:
          if (invType === 1 && pos < 0) hasEquipSlotChange = true;
          break;
        case InventoryOpType.UpdateExp: op.equipExp = p.readInt(); break;
      }
      ops.push(op);
    }
    // Trailing byte is NOT unconditional — only sent when hasEquipSlotChange
    // (confirmed against the `if (nCurItemPos)` guard in the decompile).
    // Reading it unconditionally desynced every InventoryOperation packet
    // that didn't hit that specific equip-slot-1 condition.
    if (hasEquipSlotChange) p.readByte();
    this.onInventoryOperation?.(ops);
  }

  private handleClaimResult(p: InPacket): void {
    const result = p.readByte();
    if (result === 2) {
      const success = p.readByte() !== 0;
      const claimDelayMinutes = p.readInt();
      this.onClaimResult?.({ result, success, claimDelayMinutes });
      return;
    }
    this.onClaimResult?.({ result });
  }

  private handleSetClaimSvrAvailableTime(p: InPacket): void {
    const openHour = p.readByte();
    const closeHour = p.readByte();
    this.onClaimSvrAvailableTime?.({ openHour, closeHour });
  }

  private handleUserChat(p: InPacket): void {
    const charId = p.readInt();
    const chatType = p.readByte();
    const text = p.readString();
    p.readBool(); // onlyBalloon
    this.onUserChat?.({ charId, chatType, text });
  }

  private handleGroupMessage(p: InPacket): void {
    const groupType = p.readByte();
    const fromName = p.readString();
    const text = p.readString();
    const charId = p.readInt();
    this.onGroupMessage?.(groupType, fromName, text, charId);
  }

  private handleWhisper(p: InPacket): void {
    const flag = p.readByte();
    try {
      switch (flag) {
        case 2: { // Receive
          const fromName = p.readString();
          const channelId = p.readByte();
          p.readByte();
          const text = p.readString();
          this.onWhisper?.({ fromName, channelId, text });
          break;
        }
        case 3: { // Send echo
          const fromName = p.readString();
          const channelId = p.readByte();
          p.readByte();
          const text = p.readString();
          this.onWhisper?.({ fromName, channelId, text, isAdmin: true });
          break;
        }
        case 9: { // Character not found
          // OG decompile/5448A0.c: DecodeStr(name) + Decode1(subResult) + Decode4(mapId). ChatLogAdd type=12.
          // TODO_AUDIT.md Hundred-and-sixty-sixth pass.
          const targetName = p.readString();
          p.readByte(); // subResult
          p.readInt();  // mapId / channel
          this.onSystemMessage?.({ text: `"${targetName}" is not online.`, type: 9 });
          break;
        }
        case 72: { // Character in cash shop (0x48)
          // OG decompile/5448A0.c: DecodeStr(name) + Decode1(subResult) + Decode4(mapId). ChatLogAdd type=12.
          // TODO_AUDIT.md Hundred-and-sixty-sixth pass.
          const targetName = p.readString();
          p.readByte(); // subResult
          p.readInt();  // channel / mapId
          this.onSystemMessage?.({ text: `"${targetName}" is in the Cash Shop.`, type: 9 });
          break;
        }
        default: {
          if ((flag & WhisperFlag.Receive) !== 0) {
            const fromName = p.readString();
            const channelId = p.readByte();
            p.readByte();
            const text = p.readString();
            this.onWhisper?.({ fromName, channelId, text });
          }
          break;
        }
      }
    } catch (ex) {
      console.debug('Whisper partial decode', ex);
    }
  }

  private handlePartyResult(p: InPacket): void {
    const resultType = p.readByte();
    switch (resultType) {
      case PartyResultType.Invite: {
        const inviterId = p.readInt();
        const inviterName = p.readString();
        p.readInt(); p.readInt(); p.readByte();
        this.onPartyInvite?.({ inviterId, inviterName });
        break;
      }
      case PartyResultType.Load:
        p.readInt();
        this._emitPartyData(p);
        break;
      case PartyResultType.Join:
        p.readInt(); p.readString();
        this._emitPartyData(p);
        break;
      case PartyResultType.Withdraw:
        p.readInt(); p.readInt();
        if (p.readBool()) {
          p.readByte(); p.readString();
          this._emitPartyData(p);
        } else {
          this.onPartyLoad?.({ members: [], bossId: 0 });
        }
        break;
      case PartyResultType.CreateDone:
        p.readInt(); p.readInt(); p.readInt(); p.readInt(); p.readShort(); p.readShort();
        break;
      case PartyResultType.ReloadParty:
        try { this._emitPartyData(p); } catch { /* skip */ }
        break;
      case PartyResultType.ChangeBoss: {
        const newBossCharId = p.readInt();
        p.readByte();
        this.onPartyBossChanged?.(newBossCharId);
        break;
      }
      case PartyResultType.LevelJobChanged: {
        const charId = p.readInt();
        const level = p.readInt();
        const job = p.readInt();
        this.onPartyMemberStatChanged?.({ charId, level, job });
        break;
      }
      // PartyAdver sub-action dispatch (PartyResult=62, sub-actions 75-80).
      // OG: CWvsContext::OnPartyResult (decompile/A10AB0.c) routes these to
      // CUIPartySearch::OnPacket -> TabPartyAdver::OnPacket.
      case 75: { // 'K' — load single advert result
        const groupId = p.readInt();
        const isExpedition = groupId > 1000000; // heuristic: expedition quest IDs are large
        const adver = this._decodeAdverCommon(p, groupId, isExpedition);
        this.onPartyAdverResult?.({ subAction: 'K', adver });
        break;
      }
      case 76: { // 'L' — delete advert
        const nPartyGroupID = p.readInt();
        const nPartyID = p.readInt();
        this.onPartyAdverResult?.({ subAction: 'L', nPartyGroupID, nPartyID });
        break;
      }
      case 77: { // 'M' — advert list result
        const groupId = p.readInt();
        const count = p.readInt();
        const isExpedition = groupId > 1000000;
        const advertList: (PartyAdverData | ExpeditionAdverData)[] = [];
        for (let i = 0; i < count; i++) {
          advertList.push(this._decodeAdverCommon(p, groupId, isExpedition));
        }
        this.onPartyAdverResult?.({ subAction: 'M', advertList });
        break;
      }
      case 78: { // 'N' — expedition apply response (CUIFadeYesNo trigger)
        const nPartyID = p.readInt();
        const sApplierName = p.readString();
        const nLevel = p.readInt();
        const nJob = p.readInt();
        this.onExpeditionApply?.({ nPartyID, sApplierName, nLevel, nJob });
        break;
      }
      case 79: { // 'O' — notice result
        const bSuccess = p.readInt();
        const nType = p.readInt();
        const sCharacterName = p.readString();
        this.onPartyAdverResult?.({ subAction: 'O', bSuccess, nType, sCharacterName });
        break;
      }
      case 80: { // 'P' — regist result
        const nResult = p.readInt();
        this.onPartyAdverResult?.({ subAction: 'P', nResult });
        break;
      }
      default:
        console.debug('PartyResult type', resultType, 'not handled');
        break;
    }
  }

  private _decodeAdverCommon(p: InPacket, nGroupID: number, isExpedition: boolean): PartyAdverData | ExpeditionAdverData {
    // ADVER_COMMON factory: PARTYADVER (260 B) vs EXPEDITION_ADVER (980 B).
    // Both start with sName[61] + nGroupID + party member list.
    // EXPEDITION_ADVER has the full EXPEDITION struct (900 B) appended.
    const sName = p.readString();
    // Skip remaining name buffer (61 bytes of name field, string was length-prefixed)
    // Partial version: read member data
    const members: PartyAdverMember[] = [];
    const memberCount = p.readByte();
    for (let i = 0; i < memberCount; i++) {
      members.push({
        dwCharacterID: p.readInt(),
        sCharacterName: p.readString(),
        nLevel: p.readInt(),
        nJob: p.readInt(),
        nChannel: p.readInt(),
      });
    }
    if (isExpedition) {
      // Read expedition-specific 0x384=900 byte block after common prefix.
      const nGroupID_exp = p.readInt();
      const dwMasterID = p.readInt();
      const subPartyCount = p.readByte();
      const aSubParty: ExpeditionSubPartyData[] = [];
      for (let sp = 0; sp < subPartyCount; sp++) {
        const memCount = p.readByte();
        const members: ExpeditionMember[] = [];
        for (let m = 0; m < memCount; m++) {
          members.push({
            charId: p.readInt(),
            name: p.readString(),
            job: p.readInt(),
            level: p.readInt(),
            channel: p.readInt(),
          });
        }
        aSubParty.push({ members });
      }
      return { sName, nGroupID, members, expedition: { nGroupID: nGroupID_exp, dwMasterID, aSubParty } };
    }
    return { sName, nGroupID, members };
  }

  // OG: CWvsContext::OnExpedtionResult (decompile/A0FDF0.c) — opcode 64.
  // Routes to ExpeditionIntermediary::OnPacket (decompile/522A30.c) via
  // a single-byte sub-action dispatch (char codes).
  private handleExpeditionResult(p: InPacket): void {
    try {
      const subActionChar = String.fromCharCode(p.readByte());
      switch (subActionChar) {
        case '9': case ';': case '=': { // Get
          const data = this._decodeExpeditionData(p);
          this.onExpeditionResult?.({ subAction: 'Get', data });
          break;
        }
        case ':': case 'A': case 'C': case 'D': { // Removed
          const nPartyIndex = p.readInt();
          this.onExpeditionResult?.({ subAction: 'Removed', nPartyIndex });
          break;
        }
        case '<': case '@': case 'B': { // Notice
          const data = this._decodeExpeditionData(p);
          this.onExpeditionResult?.({ subAction: 'Notice', data });
          break;
        }
        case '>': { // ChatLog — just consume, no exposed callback yet
          break;
        }
        case 'E': { // MasterChanged
          const data = this._decodeExpeditionData(p);
          this.onExpeditionResult?.({ subAction: 'MasterChanged', data });
          break;
        }
        case 'F': { // Modified
          const data = this._decodeExpeditionData(p);
          this.onExpeditionResult?.({ subAction: 'Modified', data });
          break;
        }
        case 'H': { // Invite
          const inviterName = p.readString();
          const nQuestID = p.readInt();
          this.onExpeditionResult?.({ subAction: 'Invite', inviterName, nQuestID });
          break;
        }
        case 'I': { // ResponseInvite
          const accepted = p.readByte() === 9;
          const sMasterName = p.readString();
          this.onExpeditionResult?.({ subAction: 'ResponseInvite', accepted, sMasterName });
          break;
        }
        default:
          console.debug('ExpeditionResult sub-action', subActionChar, 'not handled');
          break;
      }
    } catch { /* malformed */ }
  }

  private _decodeExpeditionData(p: InPacket): ExpeditionData {
    const nGroupID = p.readInt();
    const dwMasterID = p.readInt();
    const subPartyCount = p.readByte();
    const aSubParty: ExpeditionSubPartyData[] = [];
    for (let sp = 0; sp < subPartyCount; sp++) {
      const memCount = p.readByte();
      const members: ExpeditionMember[] = [];
      for (let m = 0; m < memCount; m++) {
        members.push({
          charId: p.readInt(),
          name: p.readString(),
          job: p.readInt(),
          level: p.readInt(),
          channel: p.readInt(),
        });
      }
      aSubParty.push({ members });
    }
    return { nGroupID, dwMasterID, aSubParty };
  }

  private _emitPartyData(p: InPacket): void {
    const charIds: number[] = [];
    const names: string[] = [];
    const jobs: number[] = [];
    const levels: number[] = [];
    const channels: number[] = [];
    for (let i = 0; i < PartyMax; i++) charIds.push(p.readInt());
    for (let i = 0; i < PartyMax; i++) names.push(p.readString(13));
    for (let i = 0; i < PartyMax; i++) jobs.push(p.readInt());
    for (let i = 0; i < PartyMax; i++) levels.push(p.readInt());
    for (let i = 0; i < PartyMax; i++) channels.push(p.readInt());
    const bossId = p.readInt();
    // TODO_AUDIT.md Hundred-and-twenty-eighth pass: PARTYDATA layout confirmed via GetPartyMemberData offsets.
    // fieldIds[6] at PARTYDATA+202, townPortals[6×5] at +226, hp[6] at +322, maxHp[6] at +346, 2 ints at +370.
    for (let i = 0; i < PartyMax; i++) p.readInt(); // fieldIds
    for (let i = 0; i < PartyMax; i++) {
      p.readInt(); p.readInt(); p.readInt(); p.readInt(); p.readInt(); // town portals (5 ints each)
    }
    const hps: number[] = [];
    const maxHps: number[] = [];
    for (let i = 0; i < PartyMax; i++) hps.push(p.readInt());
    for (let i = 0; i < PartyMax; i++) maxHps.push(p.readInt());
    p.readInt(); p.readInt(); // trailing 2 ints
    const members: PartyMember[] = [];
    for (let i = 0; i < PartyMax; i++) {
      if (charIds[i] === 0) continue;
      members.push({ charId: charIds[i], name: names[i], job: jobs[i], level: levels[i], channel: channels[i], hp: hps[i], maxHp: maxHps[i] });
    }
    this.onPartyLoad?.({ members, bossId });
  }

  private handleFriendResult(p: InPacket): void {
    const resultType = p.readByte();
    switch (resultType) {
      case FriendResultType.Load:
      case FriendResultType.Set:
      case FriendResultType.Delete: {
        const count = p.readByte();
        const friends: FriendEntry[] = [];
        for (let i = 0; i < count; i++) {
          const friendId = p.readInt();
          const name = p.readString(13);
          const flag = p.readByte();
          const channel = p.readInt();
          const group = p.readString(17);
          friends.push({ charId: friendId, name, flag, channel, online: channel >= 0, group });
        }
        for (let i = 0; i < count; i++) p.readInt();
        this.onFriendList?.(friends);
        break;
      }
      case FriendResultType.Request: {
        const friendId = p.readInt();
        const message = p.readString();
        const x = p.readInt();
        const y = p.readInt();
        this.onFriendRequest?.({ friendId, message, x, y });
        break;
      }
      case FriendResultType.UpdateFriend: {
        // CWvsContext::CFriend::UpdateFriend (decompile/A125D0.c): friendId:int +
        // GW_Friend record (name[13]+flag:byte+channel:int+group[17]) + inShop:byte.
        // OG: updates in-memory friend entry. TODO_AUDIT.md Hundred-and-sixty-sixth pass.
        const friendId = p.readInt();
        p.readString(13); // name (fixed-width)
        p.readByte();     // flag
        const channel = p.readInt();
        p.readString(17); // group (fixed-width)
        p.readByte();     // inShop
        this.onFriendUpdate?.(friendId, channel);
        break;
      }
      case FriendResultType.StatusChanged: {
        const friendId = p.readInt();
        const online = p.readByte() !== 0;
        const channel = p.readInt();
        this.onFriendStatusChanged?.({ charId: friendId, online, channel });
        break;
      }
      default:
        console.debug('FriendResult type', resultType, 'not handled');
        break;
    }
  }

  private handleGuildResult(p: InPacket): void {
    const resultType = p.readByte();
    switch (resultType) {
      case GuildResultType.Load: {
        if (!p.readBool()) {
          this.onGuildLoad?.(null);
          return;
        }
        const members: { characterId: number; name: string; job: number; level: number; rank: number; online: boolean }[] = [];
        const guildId = p.readInt();
        const name = p.readString();
        for (let i = 0; i < 5; i++) p.readString();
        const memberCount = p.readByte();
        const ids: number[] = [];
        for (let i = 0; i < memberCount; i++) ids.push(p.readInt());
        for (let i = 0; i < memberCount; i++) {
          const mname = p.readString(13);
          const mjob = p.readInt();
          const mlevel = p.readInt();
          const mrank = p.readInt();
          const online = p.readInt();
          p.readInt(); p.readInt();
          members.push({ characterId: ids[i], name: mname, job: mjob, level: mlevel, rank: mrank, online: online !== 0 });
        }
        this.onGuildLoad?.({ guildId, name, members });
        break;
      }
      case GuildResultType.MemberJoin:
        // OG decompile/A0D3B0.c case 41: guildId:int, charId:int, then (if charId != self)
        // GUILDMEMBER record. For self-join OG sends GuildRequest(action=0) to reload.
        // TODO_AUDIT.md Hundred-and-sixty-seventh pass.
        try {
          p.readInt(); // guildId
          const charId = p.readInt();
          if (p.remaining >= 37) {
            // Other player joined: decode GUILDMEMBER record
            const name = p.readString(13);
            const job = p.readInt();
            const level = p.readInt();
            const grade = p.readInt();
            const online = p.readInt() !== 0;
            p.readInt(); p.readInt(); // trailing fields
            this.onGuildMemberJoin?.(charId, name, job, level, grade, online);
          }
          // Self-join: OG reloads guild via GuildRequest; we'll receive a fresh GuildResult.Load.
        } catch { /* skip */ }
        break;
      case GuildResultType.OnlineStatus:
        // OG decompile/A0D3B0.c case 63: guildId:int (check), charId:int, online:byte.
        // Updates member bOnLine in-memory; shows CUIFadeYesNo on login. TODO_AUDIT.md Hundred-and-sixty-sixth pass.
        try {
          p.readInt(); // guildId (check in OG; we omit the check)
          const charId = p.readInt();
          const online = p.readByte() !== 0;
          this.onGuildMemberOnline?.(charId, online);
        } catch { /* skip */ }
        break;
      case GuildResultType.GradeChange:
        // OG decompile/A0D3B0.c case 66: guildId:int (check), charId:int, grade:byte. Shows chat log.
        // Grade names are StringPool-opaque; silently consume. TODO_AUDIT.md Hundred-and-sixty-seventh pass.
        try {
          p.readInt(); // guildId
          p.readInt(); // charId
          p.readByte(); // grade
        } catch { /* skip */ }
        break;
      case GuildResultType.MarkChange:
        // OG decompile/A0D3B0.c case 69: guildId:int + markBg:short + markBgColor:byte + mark:short + markColor:byte.
        // No guild-emblem rendering in TS; silently consume. TODO_AUDIT.md Hundred-and-sixty-seventh pass.
        try {
          p.readInt(); p.readShort(); p.readByte(); p.readShort(); p.readByte();
        } catch { /* skip */ }
        break;
      case GuildResultType.Leave:
      case GuildResultType.Expel:
        // OG decompile/A0D3B0.c case 46/49: guildId:int, charId:int, name:string. Removes member from guild.
        // TODO_AUDIT.md Hundred-and-sixty-seventh pass.
        try {
          p.readInt(); // guildId
          const leaveCharId = p.readInt();
          p.readString(); // name (for chat log in OG — StringPool-opaque here)
          this.onGuildMemberLeave?.(leaveCharId);
          this.onGuildLoad?.(null);
        } catch { /* skip */ }
        break;
      case GuildResultType.SetMarkPrompt:
        this.onGuildSetMarkPrompt?.();
        break;
      case GuildResultType.NoticeChange:
        // OG decompile/A0D3B0.c case 71: guildId:int + notice:string. ChatLogAdd(type=12). TODO_AUDIT.md Hundred-and-sixty-sixth pass.
        try {
          p.readInt(); // guildId
          const notice = p.readString();
          if (notice) this.onSystemMessage?.({ text: `[Guild Notice] ${notice}`, type: 12 });
        } catch { /* skip */ }
        break;
      case GuildResultType.PointLevel:
        // OG decompile/A0D3B0.c case 75: guildId:int + point:int + level:int. No visible UI in OG.
        try {
          p.readInt(); // guildId
          p.readInt(); // point
          p.readInt(); // level
        } catch { /* skip */ }
        break;
      default:
        console.debug('GuildResult type', resultType, 'not handled');
        break;
    }
  }

  // TODO_AUDIT.md Hundred-and-twenty-third pass: CTabGuildAlliance — alliance
  // member list. Sub-type values confirmed from byte_A0FBB8 + jpt_A0EFD2.
  // GUILDDATA::SKILLENTRY::Decode confirmed: short(2) + buffer(8) + string.
  // ALLIANCEDATA::Decode: int + str + 5×str + byte + N×int + int + str.
  private _allianceName = '';
  private _allianceMembers: AllianceMember[] = [];

  // Decodes ALLIANCEDATA::Decode wire format and returns name + guild count.
  // Shape: int(allianceId) + str(name) + 5×str(gradeNames) + byte(gc) + gc×int(guildIds) + int + str.
  private _decodeAllianceHeader(p: InPacket): { allianceName: string; guildCount: number } {
    p.readInt();                                 // allianceId
    const allianceName = p.readString();
    for (let i = 0; i < 5; i++) p.readString(); // grade names
    const guildCount = p.readByte();
    for (let i = 0; i < guildCount; i++) p.readInt(); // guild IDs
    p.readInt(); p.readString();                 // +10h, +14h tail fields
    return { allianceName, guildCount };
  }

  private _decodeGuildDataMembers(p: InPacket): AllianceMember[] {
    // TODO_AUDIT.md Hundred-and-twenty-sixth pass: guildId now captured and
    // propagated to each member so Kick/ChangeMaster buttons can reference it.
    const guildId = p.readInt();
    p.readString(); // guild name
    for (let i = 0; i < 5; i++) p.readString(); // grade names
    const n = p.readByte();
    const ids: number[] = [];
    for (let i = 0; i < n; i++) ids.push(p.readInt());
    const members: AllianceMember[] = [];
    for (let i = 0; i < n; i++) {
      const name = p.readString(13);
      const job = p.readInt();
      const level = p.readInt();
      const grade = p.readInt();
      p.readInt(); p.readInt(); p.readInt(); // online + 2 more
      members.push({ characterId: ids[i], name, job, level, grade, guildId });
    }
    // Skip remaining GUILDDATA fields (points/emblem/notice/skills).
    p.readInt(); p.readShort(); p.readByte(); p.readShort(); p.readByte();
    p.readString(); // notice
    p.readInt(); p.readInt(); p.readByte(); // 3 more plain fields
    const skillCount = p.readShort();
    for (let i = 0; i < skillCount; i++) {
      p.readInt();   // skill ID
      p.readShort(); p.skip(8); p.readString(); // GUILDDATA::SKILLENTRY: nLevel(Decode2) + dateExpire(DecodeBuffer 8) + strBuyCharacterName(DecodeStr) — confirmed decompile/4F8A10.c
    }
    return members;
  }

  private handleAllianceResult(p: InPacket): void {
    // TODO_AUDIT.md Hundred-and-twenty-sixth pass: sub-types 3/14/24/25 added;
    // decode shapes confirmed via IDA jpt_A0EFD2 + byte_A0FBB8 cross-reference.
    const subType = p.readByte();
    switch (subType) {
      case AllianceResultType.Clear:
        this._allianceName = '';
        this._allianceMembers = [];
        this.onAllianceLoad?.(null);
        break;
      case AllianceResultType.FullLoad:
        // TODO_AUDIT.md Hundred-and-twenty-seventh pass: refactored to use shared helper.
        // OG: ALLIANCEDATA::Decode + int(guildId) + GUILDDATA::Decode (own guild).
        // Members arrive via sub-type 13 immediately after.
        try {
          const fl = this._decodeAllianceHeader(p);
          this._allianceName = fl.allianceName;
          this._allianceMembers = [];
          p.readInt(); // extra guildId after ALLIANCEDATA::Decode (case-16-specific)
          this._decodeGuildDataMembers(p); // own guild — members come from MemberUpdate
          this.onAllianceLoad?.({ allianceName: this._allianceName, members: [] });
        } catch { /* partial decode ok — members arrive via MemberUpdate */ }
        break;
      case AllianceResultType.FullReload:
        // TODO_AUDIT.md Hundred-and-twenty-seventh pass: jpt[4] @ 0xa0f710.
        // OG: ALLIANCEDATA::Clear + ALLIANCEDATA::Decode + guildCount×GUILDDATA::Decode.
        try {
          const fr = this._decodeAllianceHeader(p);
          this._allianceName = fr.allianceName;
          this._allianceMembers = [];
          for (let i = 0; i < fr.guildCount; i++)
            this._allianceMembers.push(...this._decodeGuildDataMembers(p));
          this.onAllianceLoad?.({ allianceName: this._allianceName, members: this._allianceMembers });
        } catch { /* use whatever decoded so far */ }
        break;
      case AllianceResultType.GuildJoin:
        // TODO_AUDIT.md Hundred-and-twenty-seventh pass: jpt[6] @ 0xa0f307.
        // OG: ALLIANCEDATA::Decode + int(guildId) + GUILDDATA::Decode.
        // If guildId == own guild → GUILDDATA is own, sends ack; else adds allied guild.
        try {
          const gj = this._decodeAllianceHeader(p);
          this._allianceName = gj.allianceName;
          p.readInt(); // guildId (whether own or allied)
          this._allianceMembers.push(...this._decodeGuildDataMembers(p));
          this.onAllianceLoad?.({ allianceName: this._allianceName, members: this._allianceMembers });
        } catch { /* partial */ }
        break;
      case AllianceResultType.MetadataUpdate:
        // TODO_AUDIT.md Hundred-and-twenty-seventh pass: jpt[7] @ 0xa0f6ba.
        // OG: ALLIANCEDATA::Decode only; assigns alliance name/grade-names to context.
        try {
          const mu = this._decodeAllianceHeader(p);
          this._allianceName = mu.allianceName;
          this.onAllianceLoad?.({ allianceName: this._allianceName, members: this._allianceMembers });
        } catch { /* partial */ }
        break;
      case AllianceResultType.GradeNamesUpdate:
        // TODO_AUDIT.md Hundred-and-twenty-seventh pass: jpt[10] @ 0xa0f927.
        // OG: int(allianceId) + 5×str(grade names). We don't display grade names; just consume.
        try { p.readInt(); for (let i = 0; i < 5; i++) p.readString(); } catch { /* ok */ }
        break;
      case AllianceResultType.OwnGradeChange:
        // TODO_AUDIT.md Hundred-and-twenty-seventh pass: jpt[11] @ 0xa0f98a.
        // OG: int(charId) + byte(newGrade). Updates grade in own guild or allied guild member.
        try {
          const ogCharId = p.readInt();
          const ogNewGrade = p.readByte();
          const m = this._allianceMembers.find((x) => x.characterId === ogCharId);
          if (m) { m.grade = ogNewGrade; this.onAllianceLoad?.({ allianceName: this._allianceName, members: this._allianceMembers }); }
        } catch { /* partial */ }
        break;
      case AllianceResultType.MemberUpdate:
        try {
          const count = p.readInt();
          this._allianceMembers = [];
          for (let i = 0; i < count; i++)
            this._allianceMembers.push(...this._decodeGuildDataMembers(p));
          this.onAllianceLoad?.({ allianceName: this._allianceName, members: this._allianceMembers });
        } catch { /* use whatever decoded so far */ }
        break;
      case AllianceResultType.SetNotice:
        // Server broadcasts the new notice to all alliance members.
        // Decode: int (guildId) + str (notice) + str (setterName).
        try { p.readInt(); p.readString(); p.readString(); } catch { /* consume only */ }
        break;
      case AllianceResultType.MemberGradeChange:
        // A member's grade changed in another guild of the alliance.
        // Decode: int (allianceId) + int (guildId) + int (charId) + byte (newGrade).
        try {
          p.readInt(); // allianceId
          const gcGuildId = p.readInt();
          const gcCharId = p.readInt();
          const gcNewGrade = p.readByte();
          const m = this._allianceMembers.find((x) => x.characterId === gcCharId && x.guildId === gcGuildId);
          if (m) { m.grade = gcNewGrade; this.onAllianceLoad?.({ allianceName: this._allianceName, members: this._allianceMembers }); }
        } catch { /* ignore partial */ }
        break;
      case AllianceResultType.MemberStatUpdate:
        // A member's level/job changed (e.g., levelled up).
        // Decode: int (allianceId) + int (guildId) + int (charId) + int (level) + int (job).
        try {
          p.readInt(); // allianceId
          const suGuildId = p.readInt();
          const suCharId = p.readInt();
          const suLevel = p.readInt();
          const suJob = p.readInt();
          const m = this._allianceMembers.find((x) => x.characterId === suCharId && x.guildId === suGuildId);
          if (m) { m.level = suLevel; m.job = suJob; this.onAllianceLoad?.({ allianceName: this._allianceName, members: this._allianceMembers }); }
        } catch { /* ignore partial */ }
        break;
      case AllianceResultType.ChangeMasterResult:
        // Guild master changed within the alliance.
        // Decode: int (allianceId) + int (oldMasterCharId) + int (newMasterCharId).
        try {
          p.readInt(); // allianceId
          const oldId = p.readInt();
          const newId = p.readInt();
          for (const m of this._allianceMembers) {
            if (m.characterId === oldId) m.grade = 2;
            if (m.characterId === newId) m.grade = 1;
          }
          this.onAllianceLoad?.({ allianceName: this._allianceName, members: this._allianceMembers });
        } catch { /* ignore partial */ }
        break;
      default:
        break;
    }
  }

  private handleScriptMessage(p: InPacket): void {
    p.readByte();
    const speakerId = p.readInt();
    const msgType = p.readByte();
    const messageParam = p.readByte();
    const args: ScriptMessageArgs & { messageParam: number } = { speakerId, msgType, messageParam, text: '', hasPrev: false, hasNext: false };
    try {
      switch (msgType) {
        case ScriptMessageType.Say:
          if ((messageParam & ScriptMessageParam.SpeakerOnRight) !== 0) p.readInt();
          args.text = p.readString();
          args.hasPrev = p.readBool();
          args.hasNext = p.readBool();
          break;
        case ScriptMessageType.SayImage:
        case ScriptMessageType.AskYesNo:
          args.text = p.readString();
          break;
        case ScriptMessageType.AskAccept: {
          args.text = p.readString();
          const questRe = /#q(\d+)#/;
          const qm = questRe.exec(args.text);
          args.questId = qm ? parseInt(qm[1]) : 0;
          break;
        }
        case ScriptMessageType.AskMenu: {
          args.text = p.readString();
          const menuItems: string[] = [];
          const menuRe = /#L(\d+)#([^#l]*)#l/g;
          let m;
          while ((m = menuRe.exec(args.text)) !== null) {
            menuItems.push(m[2]);
          }
          args.menu = menuItems;
          break;
        }
        case ScriptMessageType.AskText:
          args.text = p.readString();
          args.defaultText = p.readString();
          args.minLength = p.readShort();
          args.maxLength = p.readShort();
          break;
        case ScriptMessageType.AskQuiz:
          args.text = p.readString();
          args.quizHint = p.readString();
          args.quizMinLength = p.readShort();
          args.quizMaxLength = p.readShort();
          args.quizRemainTime = p.readInt();
          break;
        case ScriptMessageType.AskBoxText:
          args.text = p.readString();
          args.defaultText = p.readString();
          args.minLength = p.readShort();
          args.maxLength = p.readShort();
          args.boxWidth = p.readShort();
          args.boxHeight = p.readShort();
          break;
        case ScriptMessageType.AskNumber:
          args.text = p.readString();
          args.defaultNum = p.readInt();
          args.minNum = p.readInt();
          args.maxNum = p.readInt();
          break;
        case ScriptMessageType.AskAvatar:
        case ScriptMessageType.AskMemberShopAvatar: {
          args.text = p.readString();
          const count = p.readByte();
          args.avatars = [];
          for (let i = 0; i < count; i++) args.avatars.push(p.readInt());
          break;
        }
        case ScriptMessageType.AskPet:
        case ScriptMessageType.AskPetAll: {
          args.text = p.readString();
          const petCount = p.readByte();
          args.pets = [];
          for (let i = 0; i < petCount; i++) args.pets.push(p.readInt());
          break;
        }
        case ScriptMessageType.AskSlideMenu: {
          args.text = p.readString();
          args.slideMenuType = p.readByte();
          args.defaultNum = p.readInt();
          break;
        }
        default:
          args.text = p.readString();
          break;
      }
    } catch (ex) {
      console.debug('ScriptMessage trailing decode', ex);
    }
    this.onScriptMessage?.(args);
  }

  private handleOpenShopDlg(p: InPacket): void {
    const npcId = p.readInt();
    const count = p.readShort();
    const items: ShopItemEntry[] = [];
    for (let i = 0; i < count; i++) {
      // OG: CShopDlg::SetShopDlg (0x6EAB00) — per-item decode
      const itemId = p.readInt();
      const price = p.readInt();
      const discountRate = p.readByte();
      const tokenId = p.readInt();
      const tokenPrice = p.readInt();
      const itemPeriod = p.readInt();
      const levelLimited = p.readInt();
      let unitPrice = 0;
      let quantity = 0;
      let maxPerSlot = 0;
      const prefix = Math.floor(itemId / 10000);
      // OG: if prefix==207 or 233, read double unitPrice; else read short quantity + short maxPerSlot
      if (prefix === ShopItemPrefix.ThrowArrow || prefix === ShopItemPrefix.Bullet) {
        unitPrice = p.readDouble();
        quantity = p.readShort();
      } else {
        quantity = p.readShort();
        maxPerSlot = p.readShort();
      }
      items.push({ itemId, price, discountRate, tokenId, tokenPrice, itemPeriod, levelLimited, quantity, maxPerSlot, unitPrice });
    }
    this.onShopOpen?.({ npcId, items });
  }

  private handleShopResult(p: InPacket): void {
    const resultType = p.readByte();
    const args: ShopResultArgs = { resultType };
    try {
      if (resultType === ShopResultType.NotEnoughMesos || resultType === ShopResultType.NotEnoughItems) args.shortfall = p.readInt();
      else if (resultType === ShopResultType.NoItemsInStock && p.readBool()) args.message = p.readString();
    } catch { /* skip */ }
    this.onShopResult?.(args);
  }

  private static readonly ADMIN_SHOP_REOPEN_ACTIONS = new Set([1, 2, 3, 6, 7, 8, 11]);

  private handleAdminShopDlg(p: InPacket): void {
    const action = p.readByte();
    this.onAdminShopDlg?.({ action, shouldReopen: FieldHandlers.ADMIN_SHOP_REOPEN_ACTIONS.has(action) });
  }

  private handleAdminShopResult(p: InPacket): void {
    const npcTemplateId = p.readInt();
    const itemCount = p.readShort();
    this.onAdminShopResult?.({ npcTemplateId, itemCount });
  }

  private handleStoreBankResult(p: InPacket): void {
    const resultCode = p.readByte();
    this.onStoreBankResult?.({ resultCode });
  }

  private handleStoreBankAction(p: InPacket): void {
    const subAction = p.readByte();
    const args: StoreBankActionArgs = { subAction };
    if (subAction === 0x24) {
      args.passingDay = p.readInt();
      args.fee = p.readInt();
    } else if (subAction === 0x25) {
      args.accountId = p.readInt();
      args.value = p.readInt();
      args.channel = p.readByte();
    }
    // 0x23 '#': CStoreBankDlg::SetStoreBankDlg's own tail isn't decompiled —
    // left undecoded. 0x26 '&': no further fields per OG.
    this.onStoreBankAction?.(args);
  }

  private handleCharacterSaleCheckIdResult(p: InPacket): void {
    const id = p.readString();
    const resultCode = p.readSByte();
    this.onCharacterSaleCheckIdResult?.({ id, resultCode });
  }

  private handleCharacterSaleCreateResult(p: InPacket): void {
    const mode = p.readByte();
    const code = p.readInt();
    this.onCharacterSaleCreateResult?.({ mode, code });
  }

  private handleMonsterCarnivalEnter(p: InPacket): void {
    const team = p.readByte();
    // FIXED (TODO_AUDIT.md Eighty-ninth pass): CField_MonsterCarnivalRevive
    // (WZ info/fieldType === 11) only ever sends this one byte — reading
    // the normal room's extra 9 bytes here would desync every packet after
    // it. See MonsterCarnivalEnterArgs's doc comment for the decompile refs.
    if (this._currentFieldType === 11) {
      this.onMonsterCarnivalEnter?.({ team });
      return;
    }
    const personalCp = p.readShort();
    const personalCpDiff = p.readShort();
    const myTeamCp = p.readShort();
    const myTeamCpTotal = p.readShort();
    const enemyCpRest = p.readShort();
    const enemyCpTotal = p.readShort();
    // Per-summoned-mob spell-cast tail intentionally left unconsumed — see
    // MonsterCarnivalEnterArgs doc comment.
    this.onMonsterCarnivalEnter?.({ team, personalCp, personalCpDiff, myTeamCp, myTeamCpTotal, enemyCpRest, enemyCpTotal });
  }

  private handleMonsterCarnivalPersonalCp(p: InPacket): void {
    const cp = p.readShort();
    const cpDiff = p.readShort();
    this.onMonsterCarnivalPersonalCp?.({ cp, cpDiff });
  }

  private handleMonsterCarnivalTeamCp(p: InPacket): void {
    const team = p.readByte();
    const cp = p.readShort();
    const cpDiff = p.readShort();
    this.onMonsterCarnivalTeamCp?.({ team, cp, cpDiff });
  }

  private handleMonsterCarnivalRequestResult(p: InPacket): void {
    const code1 = p.readByte();
    const code2 = p.readByte();
    const message = p.readString();
    this.onMonsterCarnivalRequestResult?.({ code1, code2, message });
  }

  private handleMonsterCarnivalRequestCanned(p: InPacket): void {
    const resultCode = p.readByte();
    this.onMonsterCarnivalRequestCanned?.({ resultCode });
  }

  private handleMonsterCarnivalProcessForDeath(p: InPacket): void {
    const teamFlag = p.readByte();
    const characterName = p.readString();
    const remainingCount = p.readByte();
    this.onMonsterCarnivalProcessForDeath?.({ teamFlag, characterName, remainingCount });
  }

  private handleMonsterCarnivalMemberOut(p: InPacket): void {
    const flag1 = p.readByte();
    const flag2 = p.readByte();
    const characterName = p.readString();
    this.onMonsterCarnivalMemberOut?.({ flag1, flag2, characterName });
  }

  private handleMonsterCarnivalGameResult(p: InPacket): void {
    const resultCode = p.readByte();
    this.onMonsterCarnivalGameResult?.({ resultCode });
  }

  private handleFamilyChartResult(p: InPacket): void {
    this.onFamilyChartResult?.({ raw: p.readBytes(p.remaining) });
  }

  private handleFamilyInfoResult(p: InPacket): void {
    const famousPoint = p.readInt();
    const totalFamousPoint = p.readInt();
    const todaySavePoint = p.readInt();
    const childCount = p.readShort();
    const childLimit = p.readShort();
    const totalChildCount = p.readShort();
    const bossId = p.readInt();
    const familyName = p.readString();
    const precept = p.readString();
    const count = p.readInt();
    const privilegeUse: { key: number; value: number }[] = [];
    for (let i = 0; i < count; i++) privilegeUse.push({ key: p.readInt(), value: p.readInt() });
    this.onFamilyInfoResult?.({
      famousPoint, totalFamousPoint, todaySavePoint, childCount, childLimit,
      totalChildCount, bossId, familyName, precept, privilegeUse,
    });
  }

  private handleFamilyResult(p: InPacket): void {
    const resultCode = p.readInt();
    const value = p.readInt();
    this.onFamilyResult?.({ resultCode, value });
  }

  private handleFamilyJoinRequest(p: InPacket): void {
    const inviterId = p.readInt();
    const field2 = p.readInt();
    const jobCode = p.readInt();
    const inviterName = p.readString();
    this.onFamilyJoinRequest?.({ inviterId, field2, jobCode, inviterName });
  }

  private handleFamilyJoinRequestResult(p: InPacket): void {
    const accepted = p.readBool();
    const characterName = p.readString();
    this.onFamilyJoinRequestResult?.({ accepted, characterName });
  }

  private handleFamilyJoinAccepted(p: InPacket): void {
    const characterName = p.readString();
    this.onFamilyJoinAccepted?.({ characterName });
  }

  private handleFamilyPrivilegeList(p: InPacket): void {
    const count = p.readInt();
    const privileges: FamilyPrivilegeListArgs['privileges'] = [];
    for (let i = 0; i < count; i++) {
      const type = p.readByte();
      const fame = p.readInt();
      const dayLimit = p.readInt();
      const name = p.readString();
      const desc = p.readString();
      privileges.push({ type, fame, dayLimit, name, desc });
    }
    this.onFamilyPrivilegeList?.({ privileges });
  }

  private handleFamilyFamousPointIncResult(p: InPacket): void {
    const deltaPoint = p.readInt();
    const characterName = p.readString();
    this.onFamilyFamousPointIncResult?.({ deltaPoint, characterName });
  }

  private handleFamilyNotifyLoginOrLogout(p: InPacket): void {
    const isLogin = p.readBool();
    const characterName = p.readString();
    this.onFamilyNotifyLoginOrLogout?.({ isLogin, characterName });
  }

  private handleFamilySetPrivilege(p: InPacket): void {
    const type = p.readByte();
    if (type === 0) { this.onFamilySetPrivilege?.({ type }); return; }
    const index = p.readInt();
    const incExpRate = p.readInt();
    const incDropRate = p.readInt();
    const timeSign = p.readByte();
    const timeDeltaMs = p.readInt();
    this.onFamilySetPrivilege?.({ type, index, incExpRate, incDropRate, timeSign, timeDeltaMs });
  }

  private handleFamilySummonRequest(p: InPacket): void {
    const characterName = p.readString();
    const fieldName = p.readString();
    this.onFamilySummonRequest?.({ characterName, fieldName });
  }

  // OG: CUIGuildBBS::OnGuildBBSPacket (decompile/7c8260.c) — sub-action byte
  // minus 6 selects the handler: 6=LoadListResult, 7=ViewEntryResult,
  // 8=EntryNotFound.
  private handleGuildBBSPacket(p: InPacket): void {
    const sub = p.readByte();
    if (sub === 6) this._handleGuildBBSLoadListResult(p);
    else if (sub === 7) this._handleGuildBBSViewEntryResult(p);
    else if (sub === 8) this.onGuildBBSEntryNotFound?.();
  }

  private _readGuildBBSEntry(p: InPacket): GuildBBSEntry {
    const entryId = p.readInt();
    const characterId = p.readInt();
    const title = p.readString();
    const date = p.readLong();
    const emoticon = p.readInt();
    const comments = p.readInt();
    return { entryId, characterId, title, date, emoticon, comments };
  }

  private _handleGuildBBSLoadListResult(p: InPacket): void {
    const hasNotice = p.readByte();
    const notice = hasNotice ? this._readGuildBBSEntry(p) : null;
    const totalCount = p.readInt();
    const listCount = p.readInt();
    const entries: GuildBBSEntry[] = [];
    for (let i = 0; i < listCount; i++) entries.push(this._readGuildBBSEntry(p));
    this.onGuildBBSListResult?.({ notice, totalCount, entries });
  }

  private _handleGuildBBSViewEntryResult(p: InPacket): void {
    const entryId = p.readInt();
    const characterId = p.readInt();
    const date = p.readLong();
    const title = p.readString();
    const text = p.readString();
    const emoticon = p.readInt();
    const commentCount = p.readInt();
    const comments: GuildBBSComment[] = [];
    for (let i = 0; i < commentCount; i++) {
      const sn = p.readInt();
      const cCharacterId = p.readInt();
      const cDate = p.readLong();
      const comment = p.readString();
      comments.push({ sn, characterId: cCharacterId, date: cDate, comment });
    }
    this.onGuildBBSViewEntryResult?.({ entryId, characterId, date, title, text, emoticon, comments });
  }

  private static readonly WEDDING_TAB_BITS = [4, 8, 16, 32, 64];

  private _readWeddingItemTabs(p: InPacket): WeddingItemTab[] {
    const flag = p.readLong();
    const itemTabs: WeddingItemTab[] = [];
    for (let tab = 1; tab <= 5; tab++) {
      const bit = FieldHandlers.WEDDING_TAB_BITS[tab - 1];
      if ((flag & BigInt(bit)) === 0n) continue;
      const count = p.readByte();
      const items = [];
      for (let i = 0; i < count; i++) items.push(ItemDecoder.Decode(p));
      itemTabs.push({ tab, items });
    }
    return itemTabs;
  }

  // OG: CWvsContext::OnWeddingGiftResult (decompile/9f1670.c) — opcode 77.
  private handleWeddingGiftResult(p: InPacket): void {
    const subAction = p.readByte();
    if (subAction === 9) {
      const count = p.readByte();
      const wishList: string[] = [];
      for (let i = 0; i < count; i++) wishList.push(p.readString());
      this.onWeddingGiftResult?.({ subAction, wishList });
    } else if (subAction === 11) {
      const count = p.readByte();
      const wishList: string[] = [];
      for (let i = 0; i < count; i++) wishList.push(p.readString());
      const itemTabs = this._readWeddingItemTabs(p);
      this.onWeddingGiftResult?.({ subAction, wishList, itemTabs });
    } else if (subAction === 10 || subAction === 15) {
      const itemTabs = this._readWeddingItemTabs(p);
      this.onWeddingGiftResult?.({ subAction, itemTabs });
    } else if (subAction === 12 || subAction === 13 || subAction === 14 || subAction === 16) {
      // Canned no-field notice/ack — literal text not ported (StringPool).
      this.onWeddingGiftResult?.({ subAction });
    }
    // 17 exists in CWishListRecvDlg::OnPacket's own switch but this
    // dispatcher never sends it — dead code, intentionally not handled.
  }

  private handleItemUpgradeResult(p: InPacket): void {
    const resultByte = p.readByte();
    if (resultByte === 65) {
      const errorCode = p.readInt();
      this.onItemUpgradeResult?.({ resultByte, errorCode });
    } else if (resultByte === 66) {
      const subResult = p.readInt();
      this.onItemUpgradeResult?.({ resultByte, subResult });
    } else {
      const result = p.readInt();
      const iuc = p.readInt();
      this.onItemUpgradeResult?.({ resultByte, result, iuc });
    }
  }

  private handleTrunkResult(p: InPacket): void {
    const resultType = p.readByte();
    const args: TrunkResultArgs = { resultType, items: [] };
    try {
      switch (resultType) {
        case TrunkResultType.Open:
          args.templateId = p.readInt();
          this._decodeTrunk(p, args);
          break;
        case TrunkResultType.PutSync:
        case TrunkResultType.PutItem:
        case TrunkResultType.Store:
        case TrunkResultType.SortResult:
          this._decodeTrunk(p, args);
          break;
        case TrunkResultType.SortTrunk:
          if (p.readBool()) args.message = p.readString();
          break;
      }
    } catch { /* skip */ }
    this.onTrunkResult?.(args);
  }

  private _decodeTrunk(p: InPacket, args: TrunkResultArgs): void {
    args.hasContents = true;
    args.slotCount = p.readByte();
    const flag = p.readLong();
    if ((flag & TrunkFlag.Money) !== 0n) args.money = p.readInt();
    this._readTrunkBlock(p, flag, TrunkFlag.Equip, 1, args);
    this._readTrunkBlock(p, flag, TrunkFlag.Use,   2, args);
    this._readTrunkBlock(p, flag, TrunkFlag.Setup, 3, args);
    this._readTrunkBlock(p, flag, TrunkFlag.Etc,   4, args);
    this._readTrunkBlock(p, flag, TrunkFlag.Cash,  5, args);
  }

  private _readTrunkBlock(p: InPacket, flag: bigint, bit: bigint, invType: number, args: TrunkResultArgs): void {
    if ((flag & bit) === 0n) return;
    const count = p.readByte();
    for (let i = 0; i < count; i++) {
      const item = ItemDecoder.Decode(p);
      args.items.push({ invType, positionInType: i, itemId: item.itemId, quantity: item.quantity === 0 ? 1 : item.quantity });
    }
  }

  private handleMessenger(p: InPacket): void {
    const action = p.readByte();
    const args: MessengerResultArgs = { action, migrated: [] };
    try {
      switch (action) {
        case MessengerAction.Open:
          args.userIndex = p.readByte();
          AvatarCodec.DecodeAvatarLook(p);
          args.name = p.readString();
          args.channel = p.readByte();
          args.flag = p.readBool();
          break;
        case MessengerAction.Join:
        case MessengerAction.Leave:
          args.userIndex = p.readByte();
          break;
        case MessengerAction.Invite:
          args.name = p.readString();
          args.channel = p.readByte();
          args.messengerId = p.readInt();
          p.readByte();
          break;
        case MessengerAction.Hide:
          args.name = p.readString();
          args.flag = p.readBool();
          break;
        case MessengerAction.DeclineInvite:
          args.name = p.readString();
          args.flag = p.readBool();
          break;
        case MessengerAction.Chat:
          args.chat = p.readString();
          break;
        case MessengerAction.Avatar:
          args.userIndex = p.readByte();
          AvatarCodec.DecodeAvatarLook(p);
          break;
        case MessengerAction.MigratedIn:
          while (true) {
            const idx = p.readByte();
            if (idx === 0xFF) break;
            AvatarCodec.DecodeAvatarLook(p);
            const name = p.readString();
            const ch = p.readByte();
            args.migrated.push({ index: idx, name, channel: ch });
          }
          break;
      }
    } catch { /* skip */ }
    this.onMessengerResult?.(args);
  }

  private handleFuncKeyMappedInit(p: InPacket): void {
    const isDefault = p.readBool();
    const entries: FuncKeyEntry[] = [];
    if (!isDefault) {
      for (let i = 0; i < 89; i++) {
        const type = p.readByte();
        const actionId = p.readInt();
        entries.push({ keyIndex: i, type, actionId });
      }
    }
    this.onFuncKeyMappedInit?.(entries);
  }

  private handleQuickslotMappedInit(p: InPacket): void {
    p.readBool();
    if (p.remaining < 32) return;
    const keys: QuickslotKey[] = [];
    for (let i = 0; i < 8; i++) keys.push({ key: p.readInt() });
    this.onQuickslotInit?.(keys);
  }

  // TODO_AUDIT.md Twenty-eighth pass: real wire (CField::OnFootHoldInfo,
  // decompile/53a810.c) is `count`, then per entry: `objName(string),
  // curState(int), snCount(int), snCount×footholdSN(int)`, then iff
  // curState===2 (moving): `speed,x1,x2,y1,y2,curX,curY(int×7),
  // reverseVertical,reverseHorizontal(byte×2)`. The previous decode here
  // read this as a 7-short static-foothold-geometry record with no string
  // at all — would desync on the very first real packet.
  private handleFootHoldInfo(p: InPacket): void {
    const count = p.readInt();
    const entries: FootHoldStateEntry[] = [];
    for (let i = 0; i < count; i++) {
      const objName = p.readString();
      const curState = p.readInt();
      const snCount = p.readInt();
      const footholdSns: number[] = [];
      for (let j = 0; j < snCount; j++) footholdSns.push(p.readInt());
      const entry: FootHoldStateEntry = { objName, curState, footholdSns };
      if (curState === 2) {
        entry.moving = {
          speed: p.readInt(), x1: p.readInt(), x2: p.readInt(), y1: p.readInt(), y2: p.readInt(),
          curX: p.readInt(), curY: p.readInt(),
          reverseVertical: p.readByte() !== 0, reverseHorizontal: p.readByte() !== 0,
        };
      }
      entries.push(entry);
    }
    this.onFootHoldInfo?.({ entries });
  }

  private handleChangeSkillRecord(p: InPacket): void {
    // CWvsContext::OnChangeSkillRecordResult (decompile/9F5F30.c).
    p.readByte();
    const count = p.readShort();
    const records: SkillRecordEntry[] = [];
    for (let i = 0; i < count; i++) {
      const skillId = p.readInt();
      const level = p.readInt();
      const masterLevel = p.readInt();
      p.readLong();
      records.push({ skillId, level, masterLevel });
    }
    // Trailing byte (SetSecondaryStatChangedPoint) is unconditional here,
    // unlike the gated trailing byte in OnInventoryOperation — confirmed
    // always read after the loop in the decompile. Harmless to omit in
    // isolation (nothing follows it in this packet), but kept for
    // completeness/symmetry with the real decode.
    p.readByte();
    this.onSkillRecordResult?.(records);
  }

  private handleTemporaryStatSet(p: InPacket): void {
    // CWvsContext::OnTemporaryStatSet (decompile/A02FC0.c) delegates to
    // SecondaryStat::DecodeForLocal (0x7350e0) — 128-bit mask, per-bit
    // decode shapes. The generic popcount loop handles 90%+ of buffs.
    try {
      this.secondaryStat.decode(p);
      // Rebuild TempStatEntry[] for existing callers
      const entries: TempStatEntry[] = [];
      for (const [skillId, v] of this.secondaryStat.allEntries()) {
        entries.push({ skillId, value: v.value, seconds: v.seconds });
      }
      this.onTemporaryStatSet?.(entries);
    } catch { /* skip */ }
  }

  private handleTemporaryStatReset(p: InPacket): void {
    // CWvsContext::OnTemporaryStatReset (decompile/9F2AB0.c): the mask is an
    // explicit 16-byte DecodeBuffer (0x10), confirming the same UINT128
    // shape as OnTemporaryStatSet above — not a 4-byte int.
    try {
      const maskLo = p.readLong();
      const maskHi = p.readLong();
      this.secondaryStat.clear();
      this.onTemporaryStatReset?.(Number(maskLo & 0xFFFFFFFFn));
    } catch { /* skip */ }
  }

  private handleMiniRoom(p: InPacket): void {
    const action = p.readByte();
    const args: MiniRoomArgs = { action };
    try {
      switch (action) {
        case MiniRoomProtocol.MRP_CreateResult:
          args.roomType = p.readByte();
          break;
        case MiniRoomProtocol.MRP_InviteResult:
          args.inviteType = p.readByte();
          if (args.inviteType !== 1) args.targetName = p.readString();
          break;
        case MiniRoomProtocol.MRP_EnterResult:
          args.roomType = p.readByte();
          if (args.roomType === 0) {
            // resultType 0 = error (no room / full / etc.) — see EnterResultType in MiniRoomProtocol.ts
            args.resultType = p.readByte();
          } else {
            args.maxUsers = p.readByte();
            args.myPosition = p.readByte();
            args.users = [];
            while (true) {
              const idx = p.readByte();
              if (idx === -1) break;
              AvatarCodec.DecodeAvatarLook(p);
              args.users.push({
                index: idx,
                name: p.readString(),
                job: p.readShort(),
              });
            }
            if (args.roomType === MiniRoomType.TradingRoom) {
              // Trade room — no further fields
            } else if (args.roomType === MiniRoomType.PersonalShop || args.roomType === MiniRoomType.EntrustedShop) {
              args.title = p.readString();
              const slotMax = p.readByte();
              const itemCount = p.readByte();
              args.items = [];
              for (let i = 0; i < itemCount; i++) {
                const setCount = p.readShort();
                const setSize = p.readShort();
                const price = p.readInt();
                const item = ItemDecoder.Decode(p);
                args.items.push({ setCount, setSize, price, item });
              }
            }
          }
          break;
        case MiniRoomProtocol.MRP_Chat:
          const chatSub = p.readByte();
          args.chatSub = chatSub;
          if (chatSub === 7) {
            args.msgType = p.readByte();
            args.charName = p.readString();
          } else if (chatSub === 8) {
            args.userIndex = p.readByte();
            args.text = p.readString();
          }
          break;
        case MiniRoomProtocol.MRP_Leave:
          args.userIndex = p.readByte();
          args.leaveType = p.readByte();
          break;
        case MiniRoomProtocol.TRP_PutItem:
          args.userIndex = p.readByte();
          args.index = p.readByte();
          args.item = ItemDecoder.Decode(p);
          break;
        case MiniRoomProtocol.TRP_PutMoney:
          args.userIndex = p.readByte();
          args.money = p.readInt();
          break;
        case MiniRoomProtocol.TRP_Trade:
          break;
        case MiniRoomProtocol.TRP_MoveItemToInventory:
          break;
        case MiniRoomProtocol.PSP_BuyResult:
          args.resultCode = p.readByte();
          break;
        case MiniRoomProtocol.PSP_Refresh:
          const count = p.readByte();
          args.items = [];
          for (let i = 0; i < count; i++) {
            const setCount = p.readShort();
            const setSize = p.readShort();
            const price = p.readInt();
            const item = ItemDecoder.Decode(p);
            args.items.push({ setCount, setSize, price, item });
          }
          break;
        case MiniRoomProtocol.PSP_AddSoldItem:
          args.itemIndex = p.readByte();
          args.quantity = p.readShort();
          args.buyerName = p.readString();
          break;
        case MiniRoomProtocol.MRP_Create:
          break;
        case MiniRoomProtocol.MRP_Invite:
          args.targetName = p.readString();
          break;
        case MiniRoomProtocol.MRP_Enter:
          break;
        case MiniRoomProtocol.TRP_UnTrade:
          break;
        case MiniRoomProtocol.PSP_PutItem:
          args.index = p.readByte();
          args.item = ItemDecoder.Decode(p);
          break;
        case MiniRoomProtocol.PSP_BuyItem:
          args.index = p.readByte();
          args.quantity = p.readShort();
          break;
        // ── MemoryGame sub-protocol ────────────────────────────────────
        case MiniRoomProtocolFull.MGRP_TieRequest:
          args.userIndex = p.readByte();
          break;
        case MiniRoomProtocolFull.MGRP_TieResult:
          args.userIndex = p.readByte();
          args.resultCode = p.readByte();
          break;
        case MiniRoomProtocolFull.MGRP_GiveUpRequest:
          args.userIndex = p.readByte();
          break;
        case MiniRoomProtocolFull.MGRP_GiveUpResult:
          args.userIndex = p.readByte();
          break;
        case MiniRoomProtocolFull.MGRP_RetreatRequest:
          args.userIndex = p.readByte();
          break;
        case MiniRoomProtocolFull.MGRP_RetreatResult:
          args.userIndex = p.readByte();
          break;
        case MiniRoomProtocolFull.MGRP_LeaveEngage:
          args.userIndex = p.readByte();
          break;
        case MiniRoomProtocolFull.MGRP_LeaveEngageCancel:
          args.userIndex = p.readByte();
          break;
        case MiniRoomProtocolFull.MGRP_Ready:
          args.userIndex = p.readByte();
          break;
        case MiniRoomProtocolFull.MGRP_CancelReady:
          args.userIndex = p.readByte();
          break;
        case MiniRoomProtocolFull.MGRP_Ban:
          args.userIndex = p.readByte();
          break;
        case MiniRoomProtocolFull.MGRP_Start:
          args.round = p.readByte();
          args.userIndex = p.readByte();
          args.cardOrder = [];
          while (p.remaining > 0) {
            args.cardOrder.push(p.readByte());
          }
          break;
        case MiniRoomProtocolFull.MGRP_GameResult:
          args.winnerIndex = p.readByte();
          args.gameResultType = p.readByte();
          break;
        case MiniRoomProtocolFull.MGRP_TimeOver:
          args.userIndex = p.readByte();
          break;
        case MiniRoomProtocolFull.MGP_TurnUpCard:
          args.cardIndex = p.readByte();
          args.cardType = p.readByte();
          args.showState = p.readByte();
          args.userIndex = p.readByte();
          break;
        default:
          console.debug('MiniRoom action', action, 'not decoded');
          break;
      }
    } catch { /* skip trailing */ }
    this.onMiniRoom?.(action, args);
  }

  private handleUserMiniRoomBalloon(p: InPacket): void {
    const ownerId = p.readInt();
    const miniRoomType = p.readByte();
    p.readByte();
    const title = p.readString();
    const pwd = p.readByte() !== 0;
    this.onMiniRoom?.(MiniRoomProtocol.MRP_Balloon, { action: MiniRoomProtocol.MRP_Balloon, balloon: true, ownerId, miniRoomType, title, pwd });
  }

  private handleEmployeeMiniRoomBalloon(p: InPacket): void {
    const ownerId = p.readInt();
    const miniRoomType = p.readByte();
    p.readByte();
    const title = p.readString();
    const pwd = p.readByte() !== 0;
    this.onMiniRoom?.(MiniRoomProtocol.MRP_Balloon, { action: MiniRoomProtocol.MRP_Balloon, balloon: true, ownerId, miniRoomType, title, pwd, isEmployee: true });
  }

  private handleReactorEnter(p: InPacket): void {
    // OG: CReactorPool::OnReactorEnterField (IDA: 0x6cf490) — objId(4) +
    // templateId(4) + state(1) + x(i16) + y(i16) + bFlip(1) +
    // name(length-prefixed string). See TODO_AUDIT.md "Forty-seventh pass".
    try {
      const objId = p.readInt();
      const templateId = p.readInt();
      const state = p.readByte();
      const x = p.readShort();
      const y = p.readShort();
      const flip = p.readByte() !== 0;
      const name = p.readString();
      this.onReactorEnter?.({ objId, templateId, state, x, y, flip, name });
    } catch { /* skip */ }
  }

  private handleReactorLeave(p: InPacket): void {
    // OG: CReactorPool::OnReactorLeaveField (IDA: 0x6ccea0) — objId(4) +
    // state(1) + x(i16) + y(i16).
    try {
      const objId = p.readInt();
      const state = p.readByte();
      const x = p.readShort();
      const y = p.readShort();
      this.onReactorLeave?.({ objId, state, x, y });
    } catch { /* skip */ }
  }

  private handleReactorChangeState(p: InPacket): void {
    // OG: CReactorPool::OnReactorChangeState (IDA: 0x6ccd60) — objId(4) +
    // state(1) + x(i16) + y(i16) + aniDelay(u16) + properEventIdx(i8) +
    // stateEndDeciseconds(i8). See TODO_AUDIT.md "Forty-seventh pass".
    try {
      const objId = p.readInt();
      const state = p.readByte();
      const x = p.readShort();
      const y = p.readShort();
      const aniDelay = p.readUShort();
      const properEventIdx = p.readSByte();
      const stateEndDeciseconds = p.readSByte();
      this.onReactorChangeState?.({ objId, state, x, y, aniDelay, properEventIdx, stateEndDeciseconds });
    } catch { /* skip */ }
  }

  private handleReactorMove(p: InPacket): void {
    // OG: CReactorPool::OnReactorMove (IDA: 0x6cd110) — objId(4) + dx(i16) +
    // dy(i16), fed to IWzVector2D::RelMove as a *relative* delta, not an
    // absolute position.
    try {
      const objId = p.readInt();
      const dx = p.readShort();
      const dy = p.readShort();
      this.onReactorMove?.({ objId, dx, dy });
    } catch { /* skip */ }
  }

  private handleEmployeeEnter(p: InPacket): void {
    try {
      const objId = p.readInt();
      const employerObjId = p.readInt();
      const x = p.readShort();
      const y = p.readShort();
      const nameTag = p.readByte(); // TODO_AUDIT.md follow-up: IDA CEmployee::Init formats this field into CLife::MakeNameTag type 1000.
      this.onEmployeeEnter?.({ objId, employerObjId, x, y, nameTag });
    } catch { /* skip */ }
  }

  private handleEmployeeLeave(p: InPacket): void {
    try {
      const objId = p.readInt();
      this.onEmployeeLeave?.(objId);
    } catch { /* skip */ }
  }

  private handleSummonedEnter(p: InPacket): void {
    // OG: CSummonedPool::OnPacket (IDA: 0x75ac70) decodes charId before
    // dispatching to OnCreated (0x75a9a0) -> CSummoned::Init(CInPacket&)
    // (0x755740). Real wire: charId(4) -> summonedId(4) -> skillId(4) ->
    // charLevel(1) -> skillLevel(1) -> x(i16) -> y(i16) -> moveAction(1) ->
    // curFoothold(i16) -> moveAbility(1) -> assistType(1) -> enterType(1) ->
    // hasAvatarLook(1) -> [AvatarLook if set] -> [Tesla Coil extras if
    // skillId == 35111002]. See TODO_AUDIT.md "Forty-eighth pass".
    try {
      const charId = p.readInt();
      const objId = p.readInt();
      const skillId = p.readInt();
      const charLevel = p.readByte();
      const skillLevel = p.readByte();
      const x = p.readShort();
      const y = p.readShort();
      const moveAction = p.readByte();
      const curFoothold = p.readShort();
      const moveAbility = p.readByte();
      const assistType = p.readByte();
      const enterType = p.readByte();
      const hasAvatarLook = p.readByte() !== 0;
      const avatarLook = hasAvatarLook ? AvatarCodec.DecodeAvatarLook(p) : null;
      let teslaCoilState: number | undefined;
      let teslaTriangle: { x: number; y: number }[] | undefined;
      if (skillId === 35111002) {
        teslaCoilState = p.readByte();
        if (teslaCoilState === 1) {
          teslaTriangle = [0, 1, 2].map(() => ({ x: p.readShort(), y: p.readShort() }));
        }
      }
      this.onSummonedEnter?.({
        charId, objId, skillId, charLevel, skillLevel, x, y, moveAction, curFoothold,
        moveAbility, assistType, enterType, avatarLook, teslaCoilState, teslaTriangle,
      });
    } catch { /* skip */ }
  }

  private handleSummonedLeave(p: InPacket): void {
    try {
      const objId = p.readInt();
      const leaveType = p.readByte();
      this.onSummonedLeave?.({ objId, leaveType });
    } catch { /* skip */ }
  }

  private handleSummonedMove(p: InPacket): void {
    try {
      const objId = p.readInt();
      const x = p.readShort();
      const y = p.readShort();
      this.onSummonedMove?.({ objId, x, y });
    } catch { /* skip */ }
  }

  private handleTownPortalEnter(p: InPacket): void {
    // CTownPortalPool::OnTownPortalCreated (decompile/762C00.c):
    // state:1 + characterId:4 + x:2 + y:2.
    const state = p.readByte();
    const characterId = p.readInt();
    const x = p.readShort();
    const y = p.readShort();
    this.onTownPortalEnter?.({ objId: characterId, state, characterId, x, y });
  }

  private handleTownPortalLeave(p: InPacket): void {
    // CTownPortalPool::OnTownPortalRemoved (decompile/761920.c):
    // state/removeType:1 + characterId:4.
    const state = p.readByte();
    const objId = p.readInt();
    this.onTownPortalLeave?.({ objId, state });
  }

  private handleAffectedAreaCreate(p: InPacket): void {
    // CAffectedAreaPool::OnAffectedAreaCreated (decompile/437EC0.c):
    // id:4 + type:4 + ownerId:4 + skillId:4 + skillLevel:1 + elemAttr:2
    // + tagRECT(left/top/right/bottom):16 + nPhase:4.
    const objId = p.readInt();
    const type = p.readInt();
    const ownerId = p.readInt();
    const skillId = p.readInt();
    const skillLevel = p.readByte();
    const elemAttr = p.readShort();
    const left = p.readInt();
    const top = p.readInt();
    const right = p.readInt();
    const bottom = p.readInt();
    const phase = p.readInt();
    const x = Math.trunc((left + right) / 2);
    const y = Math.trunc((top + bottom) / 2);
    this.onAffectedAreaCreate?.({ objId, type, ownerId, x, y, left, top, right, bottom, skillId, skillLevel, elemAttr, phase });
  }

  private handleAffectedAreaRemove(p: InPacket): void {
    // CAffectedAreaPool::OnAffectedAreaRemoved (decompile/4360A0.c): id:4.
    this.onAffectedAreaRemove?.(p.readInt());
  }

  private handleOpenGateCreate(p: InPacket): void {
    // COpenGatePool::OnOpenGateCreated (decompile/68BFD0.c):
    // state:1 + characterId:4 + x:2 + y:2 + firstGateFlag:1 + partyId:4.
    const state = p.readByte();
    const characterId = p.readInt();
    const x = p.readShort();
    const y = p.readShort();
    const first = p.readBool();
    const partyId = p.readInt();
    this.onOpenGateCreate?.({ objId: characterId, state, characterId, x, y, first, partyId });
  }

  private handleOpenGateRemove(p: InPacket): void {
    // COpenGatePool::OnOpenGateRemoved (decompile/68B780.c):
    // state/removeType:1 + characterId:4 + firstGateFlag:1.
    const state = p.readByte();
    const characterId = p.readInt();
    const first = p.readBool();
    this.onOpenGateRemove?.({ objId: characterId, state, characterId, first });
  }

  private handleMakerResult(p: InPacket): void {
    try {
      const recipeId = p.readInt();
      const success = p.readByte() !== 0;
      const count = p.readByte();
      const items: Array<{ itemId: number; count: number }> = [];
      for (let i = 0; i < count; i++) {
        items.push({ itemId: p.readInt(), count: p.readInt() });
      }
      this.onMakerResult?.(recipeId, success, items);
    } catch { /* malformed */ }
  }

  private handleFieldEffect(p: InPacket): void {
    // OG: CField::OnFieldEffect (decompile/53B790.c) — an 8-case switch.
    try {
      const subType = p.readByte();
      switch (subType) {
        case 0: {
          const summonId = p.readByte();
          const x = p.readInt();
          const y = p.readInt();
          this.onFieldEffect?.({ subType, summonId, x, y });
          break;
        }
        case 1: {
          const trembleIntensity = p.readByte();
          const trembleDurationMs = p.readInt();
          this.onFieldEffect?.({ subType, trembleIntensity, trembleDurationMs });
          break;
        }
        case 2: {
          const objectState = p.readString();
          this.onFieldEffect?.({ subType, objectState });
          break;
        }
        case 3: {
          const screenEffectUol = p.readString();
          this.onFieldEffect?.({ subType, screenEffectUol });
          break;
        }
        case 4: {
          const soundUol = p.readString();
          this.onFieldEffect?.({ subType, soundUol });
          break;
        }
        case 5: {
          const mobTemplateId = p.readInt();
          const hp = p.readInt();
          const maxHp = p.readInt();
          const hpColor = p.readByte();
          p.readByte(); // OG reads this but it's only used as a local flag, never stored
          this.onFieldEffect?.({ subType, mobTemplateId, hp, maxHp, hpColor });
          break;
        }
        case 6: {
          const bgmUol = p.readString();
          this.onFieldEffect?.({ subType, bgmUol });
          break;
        }
        case 7: {
          const rewardJobIdx = p.readInt();
          const rewardPartIdx = p.readInt();
          const rewardLevIdx = p.readInt();
          this.onFieldEffect?.({ subType, rewardJobIdx, rewardPartIdx, rewardLevIdx });
          break;
        }
        default:
          break;
      }
    } catch { /* malformed */ }
  }

  private handleBlowWeather(p: InPacket): void {
    try {
      const weatherId = p.readInt();
      const text = p.readString();
      this.onBlowWeather?.(weatherId, text);
    } catch { /* malformed */ }
  }

  private handlePlayJukeBox(p: InPacket): void {
    try {
      const musicId = p.readInt();
      this.onPlayJukeBox?.(musicId);
    } catch { /* malformed */ }
  }

  // CField::OnClock (decompile/531510.c) — 5-way subType dispatch. The
  // previous decode (byte + short) matched none of these real shapes; see
  // ClockArgs in PacketArgs.ts (TODO_AUDIT.md Seventy-seventh/
  // Hundred-and-ninth passes) for the per-subType field layout.
  private handleClock(p: InPacket): void {
    try {
      const subType = p.readByte();
      const args: ClockArgs = { subType };
      switch (subType) {
        case 0: {
          const seconds = p.readInt();
          args.seconds = Math.abs(seconds);
          args.fireNow = seconds !== 0 ? seconds <= 0 : true;
          break;
        }
        case 1:
          args.hour = p.readByte();
          args.minute = p.readByte();
          args.second = p.readByte();
          break;
        case 2:
          args.durationSec = p.readInt();
          break;
        case 3: {
          const active = p.readByte();
          args.active = active !== 0;
          if (active !== 0) args.durationSec = p.readInt();
          break;
        }
        case 0x64: {
          const active = p.readByte();
          args.active = active !== 0;
          if (active !== 0) {
            args.sizeVariant = p.readByte();
            args.durationSec = p.readInt();
          }
          break;
        }
        default:
          return;
      }
      this.onClock?.(args);
    } catch { /* malformed */ }
  }

  private handleDestroyClock(_p: InPacket): void {
    this.onDestroyClock?.();
  }

  // OG: CField_KillCount::OnKillCountInfo (decompile, 0x554030).
  private handleKillCountInfo(p: InPacket): void {
    const count = p.readInt();
    this.onKillCountInfo?.({ count });
  }

  // OG: CMessageBoxPool::OnMessageBoxEnterField (decompile, 0x6369c0).
  private handleMessageBoxEnterField(p: InPacket): void {
    const id = p.readInt();
    const itemId = p.readInt();
    const hope = p.readString();
    const characterName = p.readString();
    const x = p.readShort();
    const y = p.readShort();
    this.onMessageBoxEnterField?.({ id, itemId, hope, characterName, x, y });
  }

  // OG: CMessageBoxPool::OnMessageBoxLeaveField (decompile, 0x635d60).
  private handleMessageBoxLeaveField(p: InPacket): void {
    const immediate = p.readByte() !== 0;
    const id = p.readInt();
    this.onMessageBoxLeaveField?.({ id, immediate });
  }

  // CField::OnTransferFieldReqIgnored (decompile/52F3B0.c). All 8 sub-cases
  // just pick a hardcoded StringPool notice/chatlog by reason byte; none
  // read further packet bytes.
  private handleTransferFieldReqIgnored(p: InPacket): void {
    try {
      this.onTransferFieldReqIgnored?.(p.readByte());
    } catch { /* malformed */ }
  }

  // CField::OnTransferChannelReqIgnored (decompile/52F5F0.c) — same shape as
  // OnTransferFieldReqIgnored, 5 sub-cases, single reason byte.
  private handleTransferChannelReqIgnored(p: InPacket): void {
    try {
      this.onTransferChannelReqIgnored?.(p.readByte());
    } catch { /* malformed */ }
  }

  // CField::OnFieldSpecificData (decompile/52A7E0.c) forwards the entire
  // packet to a polymorphic CField::DecodeFieldSpecificData override that
  // varies per map subtype; the byte layout can't be determined generically
  // from this call site. No bytes are consumed here — this packet's framing
  // is message-bounded, so leaving the payload unread is safe.
  private handleFieldSpecificData(_p: InPacket): void {
    this.onFieldSpecificData?.();
  }

  // CField::OnCoupleMessage (decompile/5357F0.c).
  private handleCoupleMessage(p: InPacket): void {
    try {
      const byte1 = p.readByte();
      if (byte1 === 5) {
        const sender = p.readString();
        p.readByte();
        const message = p.readString();
        this.onCoupleMessage?.({ variant: 'pair', sender, message });
      } else if (byte1 === 4) {
        const hasMessage = p.readByte() !== 0;
        if (hasMessage) {
          const message = p.readString();
          this.onCoupleMessage?.({ variant: 'solo', message });
        } else {
          this.onCoupleMessage?.({ variant: 'stranger' });
        }
      }
      // any other byte1 value: OG silently returns with no further reads.
    } catch { /* malformed */ }
  }

  // CField::OnSummonItemInavailable (decompile/52F7B0.c) — byte===0 shows a
  // generic notice, any other value is a silent no-op.
  private handleSummonItemInavailable(p: InPacket): void {
    try {
      if (p.readByte() === 0) this.onSummonItemInavailable?.();
    } catch { /* malformed */ }
  }

  // CField::OnFieldObstacleOnOff (decompile/535A80.c) — single entry.
  private handleFieldObstacleOnOff(p: InPacket): void {
    try {
      const name = p.readString();
      const state = p.readInt();
      this.onFieldObstacleOnOff?.([{ name, state }]);
    } catch { /* malformed */ }
  }

  // CField::OnFieldObstacleOnOffStatus (decompile/535B00.c) — batched form
  // of the same SetObjectState(name, state) call as OnFieldObstacleOnOff.
  private handleFieldObstacleOnOffStatus(p: InPacket): void {
    try {
      const count = p.readInt();
      const entries: ObjectStateEntry[] = [];
      for (let i = 0; i < count; i++) {
        const name = p.readString();
        const state = p.readInt();
        entries.push({ name, state });
      }
      this.onFieldObstacleOnOff?.(entries);
    } catch { /* malformed */ }
  }

  // CField::OnFieldObstacleAllReset (decompile/52C830.c) — no packet bytes;
  // resets every obstacle the field already knows about.
  private handleFieldObstacleAllReset(_p: InPacket): void {
    this.onFieldObstacleAllReset?.();
  }

  // CField::OnAdminResult (decompile/53BC20.c). GM/admin diagnostic channel
  // with ~20 distinct sub-cases; decode matches the OG switch byte-for-byte,
  // including the case-0x15-falls-through-into-case-0x2A quirk in the
  // original code (0x15's tail shares 0x2A's single extra byte read).
  private handleAdminResult(p: InPacket): void {
    try {
      const subType = p.readByte();
      switch (subType) {
        case 0x04: case 0x05:
          p.readByte(); // consumed, unused (selects a hardcoded notice string)
          this.onAdminResult?.({ subType });
          break;
        case 0x06: {
          const flag = p.readByte() !== 0;
          this.onAdminResult?.({ subType, flag });
          break;
        }
        case 0x0B: {
          const channel = p.readString();
          if (channel !== '') {
            const world = p.readString();
            const message = p.readString();
            this.onAdminResult?.({ subType, channel, world, message });
          } else {
            this.onAdminResult?.({ subType, channel });
          }
          break;
        }
        case 0x12: {
          const value = p.readByte();
          this.onAdminResult?.({ subType, value });
          break;
        }
        case 0x15: {
          const flag = p.readByte() !== 0;
          let mapId: number | undefined;
          let value: number | undefined;
          if (flag) value = p.readByte();
          else mapId = p.readInt();
          const tail = p.readByte(); // shared tail with case 0x2A below
          this.onAdminResult?.({ subType, flag, mapId, value: value ?? tail });
          break;
        }
        case 0x28: case 0x29:
          this.onAdminResult?.({ subType });
          break;
        case 0x2A: {
          const value = p.readByte();
          this.onAdminResult?.({ subType, value });
          break;
        }
        case 0x2B: {
          const flag = p.readByte() !== 0;
          this.onAdminResult?.({ subType, flag });
          break;
        }
        case 0x33: case 0x34: case 0x35: case 0x36: case 0x37: case 0x38: case 0x39:
        case 0x3A: case 0x47: case 0x48: {
          const message = p.readString();
          this.onAdminResult?.({ subType, message });
          break;
        }
        default:
          // OG: default case is a silent return, no further reads.
          break;
      }
    } catch { /* malformed */ }
  }

  // CField::OnQuiz (decompile/537A90.c). The rest of the OG function pulls
  // category/problem text from Quiz.img via WzProperty lookups keyed by
  // these ids — not wired into the WZ layer here, so only ids are exposed.
  private handleQuiz(p: InPacket): void {
    try {
      const isQuestion = p.readByte() !== 0;
      const category = p.readByte();
      const problemId = p.readUShort();
      if (problemId === 0) return; // OG: !v2 -> goto LABEL_43 (clear problem, no display)
      this.onQuiz?.({ isQuestion, category, problemId });
    } catch { /* malformed */ }
  }

  // CField::OnDesc (decompile/5313D0.c) — index into this->m_asHelpMsg,
  // an array populated from a separate (not-yet-ported) field-load source,
  // not from this packet. Only the index is decoded here.
  private handleFieldDesc(p: InPacket): void {
    try {
      this.onFieldDesc?.(p.readByte());
    } catch { /* malformed */ }
  }

  // CField::OnSetQuestClear (decompile/52C870.c) — no packet bytes.
  private handleSetQuestClear(_p: InPacket): void {
    this.onSetQuestClear?.();
  }

  // CField::OnSetQuestTime (decompile/52B790.c).
  private handleSetQuestTime(p: InPacket): void {
    try {
      const count = p.readByte();
      const entries: QuestTimeEntry[] = [];
      for (let i = 0; i < count; i++) {
        const questId = p.readInt();
        const start = p.readLong();
        const end = p.readLong();
        entries.push({ questId, start, end });
      }
      this.onSetQuestTime?.(entries);
    } catch { /* malformed */ }
  }

  // CField::OnWarnMessage (decompile/538160.c) — single string shown via a
  // blocking CUtilDlg::Notice.
  private handleWarnMessage(p: InPacket): void {
    try {
      this.onWarnMessage?.(p.readString());
    } catch { /* malformed */ }
  }

  // CField::OnSetObjectState (decompile/539890.c) — byte-identical to
  // OnFieldObstacleOnOff (both forward to CMapLoadable::SetObjectState).
  private handleSetObjectState(p: InPacket): void {
    try {
      const name = p.readString();
      const state = p.readInt();
      this.onSetObjectState?.([{ name, state }]);
    } catch { /* malformed */ }
  }

  // CField::OnStalkResult (decompile/539910.c).
  private handleStalkResult(p: InPacket): void {
    try {
      const count = p.readInt();
      const entries: StalkResultEntry[] = [];
      for (let i = 0; i < count; i++) {
        const objId = p.readInt();
        const remove = p.readByte() !== 0;
        if (remove) {
          entries.push({ objId, remove });
        } else {
          const name = p.readString();
          const x = p.readInt();
          const y = p.readInt();
          entries.push({ objId, remove, name, x, y });
        }
      }
      this.onStalkResult?.(entries);
    } catch { /* malformed */ }
  }

  // CField::OnRequestFootHoldInfo (decompile/52DDD0.c) — the server sends
  // this with NO payload and expects the client to respond with an outbound
  // packet (header 270) describing every dynamic object's current state
  // (nCurState, x, y, reverse flags). This client has no dynamic-object
  // registry to source that response from yet, so only the request signal
  // is exposed; building and sending the response is a separate feature.
  private handleRequestFootHoldInfo(_p: InPacket): void {
    this.onRequestFootHoldInfo?.();
  }

  // CWvsContext::OnAntiMacroResult (decompile/9FF580.c). subType 6 carries a
  // length-prefixed JPEG CAPTCHA image read via _CreateCanvasFromJpegPacket
  // (decompile/9F1550.c: int len, then len bytes iff len!==0); subtypes
  // 4/5/8/10 carry a single string; 7/9 and any other value read no more.
  private handleAntiMacroResult(p: InPacket): void {
    try {
      const subType = p.readByte();
      const reasonCode = p.readByte();
      if (subType === 6) {
        const hadCanvas = p.readByte() !== 0;
        const len = p.readInt();
        const jpeg = len !== 0 ? p.readBytes(len) : undefined;
        this.onAntiMacroResult?.({ subType, reasonCode, hadCanvas, jpeg });
      } else if (subType === 4 || subType === 5 || subType === 8 || subType === 10) {
        const message = p.readString();
        this.onAntiMacroResult?.({ subType, reasonCode, message });
      } else {
        this.onAntiMacroResult?.({ subType, reasonCode });
      }
    } catch { /* malformed */ }
  }

  // CWvsContext::OnDestroyShopResult (decompile/A01ED0.c) — two-stage
  // conditional read: a second byte is only read if the first isn't 17, and
  // a string is only read if that second byte is non-zero.
  private handleDestroyShopResult(p: InPacket): void {
    try {
      const reasonCode = p.readByte();
      if (reasonCode === 17) {
        this.onDestroyShopResult?.({ reasonCode });
        return;
      }
      const hasMessage = p.readByte() !== 0;
      if (!hasMessage) {
        this.onDestroyShopResult?.({ reasonCode: 0 });
        return;
      }
      const message = p.readString();
      this.onDestroyShopResult?.({ reasonCode, message });
    } catch { /* malformed */ }
  }

  // CWvsContext::OnMacroSysDataInit (decompile/9F0C70.c) forwards to
  // CMacroSysMan::SetMacro -> MACROSYSDATA::Decode (decompile/4F98B0.c),
  // which clamps the slot count to 5, and SINGLEMACRO::Decode
  // (decompile/4F97F0.c) per slot: name string, mute byte, 3 skill ints.
  private handleMacroSysDataInit(p: InPacket): void {
    try {
      const count = Math.min(p.readByte(), 5);
      const slots: MacroSlot[] = [];
      for (let i = 0; i < count; i++) {
        const name = p.readString();
        const mute = p.readByte() !== 0;
        const skills: [number, number, number] = [p.readInt(), p.readInt(), p.readInt()];
        slots.push({ name, mute, skills });
      }
      this.onMacroSysDataInit?.(slots);
    } catch { /* malformed */ }
  }

  // CStage::OnSetITC (decompile/71AF60.c) -> CharacterData::Decode + CITC::LoadData.
  private handleSetITC(p: InPacket): void {
    try {
      this.onSetITC?.(CashShopDecoder.DecodeITC(p));
    } catch { /* malformed */ }
  }

  // CStage::OnSetCashShop (decompile/71ADF0.c) -> CharacterData::Decode +
  // CCashShop::CCashShop (+ LoadData + SetSaleInfo).
  private handleSetCashShop(p: InPacket): void {
    try {
      this.onSetCashShop?.(CashShopDecoder.DecodeCashShop(p));
    } catch { /* malformed */ }
  }

  // OG: CWvsContext::OnBroadcastMsg (decompile/A04160.c) — msgType determines
  // how the text is displayed. Type 4 carries an extra subFlag byte (0 = clear
  // ticker, non-zero = show with following string). Other types just have the
  // text string directly after the msgType byte.
  private handleBroadcastMsg(p: InPacket): void {
    try {
      const msgType = p.readByte();
      let subFlag = 1;
      if (msgType === 4) subFlag = p.readByte();
      const text = subFlag === 0 ? null : p.readString();
      this.onBroadcastMsg?.(msgType, text);
    } catch { /* malformed */ }
  }

  private handleEntrustedShopCheckResult(p: InPacket): void {
    // OG: CWvsContext::OnEntrustedShopCheckResult (decompile/9FFCB0.c) —
    // a 12-case sub-dispatch on the leading byte. Cases 9/10/11/15 are
    // canned StringPool notices with literally no further wire bytes;
    // case 7 only triggers a local action (no further bytes either).
    try {
      const subType = p.readByte();
      switch (subType) {
        case 8: {
          const channelLoad = p.readInt() % 100;
          const busyChannelId = p.readByte();
          this.onEntrustedShopCheckResult?.({ subType, busyChannelId, channelLoad });
          break;
        }
        case 13: {
          const searchedShopId = p.readInt();
          this.onEntrustedShopCheckResult?.({ subType, searchedShopId });
          break;
        }
        case 14: {
          const flag = p.readByte() !== 0;
          this.onEntrustedShopCheckResult?.({ subType, flag });
          break;
        }
        case 16: {
          p.readInt(); // OG reads this but never stores it either
          const channelId = p.readByte();
          const transferDenied = channelId === 0xFE || channelId === 0xFD || channelId === 0xFF;
          this.onEntrustedShopCheckResult?.(transferDenied
            ? { subType, transferDenied }
            : { subType, transferChannelId: channelId });
          break;
        }
        case 17: {
          const ownerId = p.readInt();
          const shopSlot = p.readShort();
          const cashItemSN = p.readBytes(8);
          this.onEntrustedShopCheckResult?.({ subType, ownerId, shopSlot, cashItemSN });
          break;
        }
        case 18: {
          const hasMessage = p.readByte() !== 0;
          const message = hasMessage ? p.readString() : undefined;
          this.onEntrustedShopCheckResult?.({ subType, message });
          break;
        }
        default:
          // 7, 9, 10, 11, 15, and anything else: no further wire data.
          this.onEntrustedShopCheckResult?.({ subType });
          break;
      }
    } catch { /* malformed */ }
  }

  private handleSkillUseResult(p: InPacket): void {
    // OG: CWvsContext::OnSkillUseResult (decompile/9f1300.c) — the whole
    // body is `m_bExclRequestSent = 0; Decode1(iPacket);`. It reads exactly
    // one byte and never uses the value (not even stored to a field) —
    // it's purely there to clear the exclusive-request-pending flag and
    // advance the stream. The previous `readInt() + readByte()` shape
    // (5 bytes) didn't match the real 1-byte packet at all.
    try {
      const ack = p.readByte();
      this.onSkillUseResult?.(ack);
    } catch { /* malformed */ }
  }

  private handleSkillLearnItemResult(p: InPacket): void {
    // OG: CWvsContext::OnSkillLearnItemResult (decompile/9f7af0.c). Shape
    // (only present when CUserPool::GetUser resolves the charId, which in
    // practice is always true — this is the local player's own context):
    // byte exclReset, int charId, byte isMasterybook, int (itemId, read by
    // OG and never used), int (skillId, read by OG and never used), byte
    // used, byte succeed. The two discarded ints are real wire bytes — OG
    // decodes and drops them, so we must too to stay in sync.
    try {
      p.readByte();
      const charId = p.readInt();
      const isMasterybook = p.readByte() !== 0;
      p.readInt();
      p.readInt();
      const used = p.readByte() !== 0;
      const succeed = p.readByte() !== 0;
      this.onSkillLearnItemResult?.({ charId, isMasterybook, used, succeed });
    } catch { /* malformed */ }
  }

  private handleSkillResetItemResult(p: InPacket): void {
    // OG: CWvsContext::OnSkillResetItemResult (decompile/9f60b0.c). Shape
    // (same "always resolves to local player" caveat as above):
    // byte exclReset, int charId, byte succeed.
    try {
      p.readByte();
      const charId = p.readInt();
      const succeed = p.readByte() !== 0;
      this.onSkillResetItemResult?.({ charId, succeed });
    } catch { /* malformed */ }
  }

  private handleSkillCooltimeSet(p: InPacket): void {
    // OG: CUserLocal::OnSkillCooltimeSet (decompile/908b90.c) — int
    // skillId, short remainSec. remainSec==0 clears the cooldown.
    try {
      const skillId = p.readInt();
      const remainSec = p.readShort();
      this.onSkillCooltimeSet?.(skillId, remainSec);
    } catch { /* malformed */ }
  }

  private handleSkillPrepare(p: InPacket): void {
    // OG: CUserPool::OnUserRemotePacket -> CUserRemote::OnSkillPrepare
    // (decompile/94b390.c, 953a30.c) — int charId, int skillId, byte slv,
    // short (actionAndDir packed), byte attackSpeed.
    try {
      const charId = p.readInt();
      const skillId = p.readInt();
      const slv = p.readByte();
      const actionAndDir = p.readShort();
      const attackSpeed = p.readByte();
      this.onSkillPrepare?.({ charId, skillId, slv, actionAndDir, attackSpeed });
    } catch { /* malformed */ }
  }

  private handleSkillCancel(p: InPacket): void {
    // OG: CUserPool::OnUserRemotePacket -> CUserRemote::OnSkillCancel
    // (decompile/94b390.c, 954600.c) — int charId, int skillId.
    try {
      const charId = p.readInt();
      const skillId = p.readInt();
      this.onSkillCancel?.({ charId, skillId });
    } catch { /* malformed */ }
  }

  // ── CWvsContext pure-gap handlers (IDA_NEW_GAPS.md) ────────────────────

  /** OG: CWvsContext::OnGivePopularityResult (0x9FEA60, opcode 37). */
  private handleGivePopularityResult(p: InPacket): void {
    try {
      const subResult = p.readByte();
      const args: GivePopularityResultArgs = { subResult };
      if (subResult === 0) {
        args.name = p.readString();
        args.accepted = p.readByte() !== 0;
        args.fame = p.readInt();
      } else if (subResult === 5) {
        args.name = p.readString();
        args.accepted = p.readByte() !== 0;
      }
      this.onGivePopularityResult?.(args);
    } catch { /* malformed */ }
  }

  /** OG: CWvsContext::OnMemoResult (0x9F9DA0, opcode 40). */
  private handleMemoResult(p: InPacket): void {
    try {
      const subAction = p.readByte();
      const args: MemoResultArgs = { subAction };
      if (subAction === 3) {
        const count = p.readByte();
        const memos: MemoResultArgs['memos'] = [];
        for (let i = 0; i < count; i++) {
          memos.push({
            id: p.readInt(),
            name: p.readString(),
            text: p.readString(),
            flag: p.readByte(),
            timestamp: p.readLong(),
          });
        }
        args.count = count;
        args.memos = memos;
      } else if (subAction === 7) {
        args.flag = p.readByte();
        args.name = p.readString();
      }
      this.onMemoResult?.(args);
    } catch { /* malformed */ }
  }

  /** OG: CWvsContext::OnMapTransferResult (0x9F9F90, opcode 41). */
  private handleMapTransferResult(p: InPacket): void {
    try {
      const subAction = p.readByte();
      const isEx = p.readByte() !== 0;
      const args: MapTransferResultArgs = { subAction, isEx };
      if (subAction === 2 || subAction === 3) {
        const count = isEx ? 10 : 5;
        const mapIds: number[] = [];
        for (let i = 0; i < count; i++) mapIds.push(p.readInt());
        args.mapIds = mapIds;
      }
      this.onMapTransferResult?.(args);
    } catch { /* malformed */ }
  }

  /** OG: CWvsContext::OnIncubatorResult (0xA00380, opcode 72). */
  private handleIncubatorResult(p: InPacket): void {
    try {
      const args: IncubatorResultArgs = { itemId: p.readInt() };
      args.plus = p.readInt();
      args.statType = p.readInt();
      args.str = p.readShort();
      args.dex = p.readShort();
      args.int = p.readShort();
      args.luk = p.readShort();
      args.attack = p.readShort();
      args.magicAttack = p.readShort();
      args.def = p.readShort();
      args.acc = p.readShort();
      args.avo = p.readShort();
      args.speed = p.readShort();
      args.jump = p.readShort();
      args.upgrade = p.readShort();
      args.dialogType = p.readByte();
      args.msgType = p.readByte();
      args.sendItemOption = p.readByte() !== 0;
      this.onIncubatorResult?.(args);
    } catch { /* malformed */ }
  }

  /** OG: CWvsContext::OnShopScannerResult (0xA076C0, opcode 73). */
  private handleShopScannerResult(p: InPacket): void {
    try {
      const subType = p.readByte();
      const args: ShopScannerResultArgs = { subType };
      if (subType === 2) {
        const itemCount = p.readByte();
        const items: { id: number; price: number }[] = [];
        for (let i = 0; i < itemCount; i++) {
          items.push({ id: p.readInt(), price: p.readInt() });
        }
        args.items = items;
      }
      this.onShopScannerResult?.(args);
    } catch { /* malformed */ }
  }

  /** OG: CWvsContext::OnBridleMobCatchFail (0x9D9A80, opcode 82). */
  private handleBridleMobCatchFail(p: InPacket): void {
    try {
      const args: BridleMobCatchFailArgs = { reason: p.readByte(), itemId: p.readInt() };
      args.mobId = p.readInt();
      this.onBridleMobCatchFail?.(args);
    } catch { /* malformed */ }
  }

  /** OG: CWvsContext::OnImitatedNPCResult (0x9CFB30, opcode 83). */
  private handleImitatedNPCResult(p: InPacket): void {
    try {
      const args: ImitatedNPCResultArgs = { templateOrResult: p.readShort() };
      this.onImitatedNPCResult?.(args);
    } catch { /* malformed */ }
  }

  /** OG: CWvsContext::OnSetAvatarMegaphone (0xA017E0, opcode 115). */
  private handleSetAvatarMegaphone(p: InPacket): void {
    try {
      const charId = p.readInt();
      const name = p.readString();
      const messages: [string, string, string, string] = [
        p.readString(), p.readString(), p.readString(), p.readString(),
      ];
      const whisperBg = p.readInt();
      const whisper = p.readByte() !== 0;
      const avatarLook = AvatarCodec.DecodeAvatarLook(p);
      const args: SetAvatarMegaphoneArgs = {
        charId, name, messages, whisperBg, whisper, avatarLook, lastUpdate: Date.now(),
      };
      this.onSetAvatarMegaphone?.(args);
    } catch { /* malformed */ }
  }

  /** OG: CWvsContext::OnCancelNameChangeResult (0xA01B10, opcode 117). */
  private handleCancelNameChangeResult(p: InPacket): void {
    try {
      const result = p.readByte();
      const args: CancelNameChangeResultArgs = { result };
      if (result !== 0 && result !== 255) {
        const hasMsg = p.readByte();
        if (hasMsg) args.msg = p.readString();
      }
      this.onCancelNameChangeResult?.(args);
    } catch { /* malformed */ }
  }

  /** OG: CWvsContext::OnCancelTransferWorldResult (0xA01CF0, opcode 118). */
  private handleCancelTransferWorldResult(p: InPacket): void {
    try {
      const result = p.readByte();
      const args: CancelTransferWorldResultArgs = { result };
      if (result !== 0 && result !== 1) {
        const hasMsg = p.readByte();
        if (hasMsg) args.msg = p.readString();
      }
      this.onCancelTransferWorldResult?.(args);
    } catch { /* malformed */ }
  }

  /** OG: CWvsContext::OnFakeGMNotice (0x9FB440, opcode 120). */
  private handleFakeGMNotice(p: InPacket): void {
    try {
      const subType = p.readByte();
      const gmName = 'GMMapleStory';
      const reason = `Hacking. Reason: (${subType})`;
      const dialogText = `${gmName}: ${reason}`;
      const args: FakeGMNoticeArgs = { subType, gmName, reason, dialogText };
      this.onFakeGMNotice?.(args);
    } catch { /* malformed */ }
  }

  /** OG: CWvsContext::OnNewYearCardRes (0xA02730, opcode 122). */
  private handleNewYearCardRes(p: InPacket): void {
    try {
      const subAction = p.readByte();
      const args: NewYearCardResArgs = { subAction };
      if (subAction === 2) {
        const count = p.readByte();
        const cards: NonNullable<NewYearCardResArgs['cards']> = [];
        for (let i = 0; i < count; i++) {
          cards.push({
            id: p.readInt(),
            sender: p.readString(),
            text: p.readString(),
            date: p.readLong(),
          });
        }
        args.cards = cards;
      } else if (subAction === 4) {
        args.sendResultCode = p.readByte();
      } else if (subAction === 6) {
        args.senderName = p.readString();
        args.cardText = p.readString();
        args.sendDate = p.readLong();
      }
      this.onNewYearCardRes?.(args);
    } catch { /* malformed */ }
  }

  /** OG: CWvsContext::OnRandomMorphRes (0x9D0040, opcode 123). */
  private handleRandomMorphRes(p: InPacket): void {
    try {
      const result = p.readByte();
      const args: RandomMorphResArgs = { result };
      if (result === 1) {
        const sub = p.readByte();
        if (sub === 0) args.targetName = p.readString();
      }
      this.onRandomMorphRes?.(args);
    } catch { /* malformed */ }
  }

  /** OG: CWvsContext::OnCakePieEventResult (0x9E5360, opcode 129). */
  private handleCakePieEventResult(p: InPacket): void {
    try {
      const subAction = p.readByte();
      const args: CakePieEventResultArgs = { subAction };
      this.onCakePieEventResult?.(args);
    } catch { /* malformed */ }
  }

  /** OG: CWvsContext::OnStageChange (0x9DB630, opcode 135). */
  private handleStageChange(p: InPacket): void {
    try {
      const args: StageChangeArgs = {
        stageName: p.readString(),
        stagePeriod: p.readByte(),
      };
      this.onStageChange?.(args);
    } catch { /* malformed */ }
  }

  /** OG: CWvsContext::OnDragonBallBox (0x9E5360, opcode 136). */
  private handleDragonBallBox(p: InPacket): void {
    try {
      const remainTime = p.readInt();
      const showUI = p.readByte() !== 0;
      const close = p.readByte() !== 0;
      const ableToSummon = p.readByte() !== 0;
      const args: DragonBallBoxArgs = { remainTime, showUI, close, ableToSummon };
      if (!close) args.orbCount = p.readInt();
      this.onDragonBallBox?.(args);
    } catch { /* malformed */ }
  }

  // ── CUserPool common-packet handler implementations ──────────────────

  private handleUserChatHistory(p: InPacket): void {
    try {
      this.onUserChatHistory?.({ charId: p.readInt(), text: p.readString() });
    } catch { /* malformed */ }
  }

  private handleUserADBoard(p: InPacket): void {
    try {
      this.onUserADBoard?.({ charId: p.readInt(), message: p.readString() });
    } catch { /* malformed */ }
  }

  private handleSetConsumeItemEffect(p: InPacket): void {
    try {
      this.onSetConsumeItemEffect?.({ charId: p.readInt(), itemId: p.readInt() });
    } catch { /* malformed */ }
  }

  private handleShowItemUpgradeEffect(p: InPacket): void {
    try {
      const charId = p.readInt();
      const result = p.readByte();
      let itemId: number | undefined;
      // OG reads itemId conditionally on result byte
      if (result !== 0) itemId = p.readInt();
      this.onShowItemUpgradeEffect?.({ charId, result, itemId });
    } catch { /* malformed */ }
  }

  private handleShowItemHyperUpgradeEffect(p: InPacket): void {
    try {
      const charId = p.readInt();
      const result = p.readByte();
      let itemId: number | undefined;
      if (result !== 0) itemId = p.readInt();
      this.onShowItemHyperUpgradeEffect?.({ charId, result, itemId });
    } catch { /* malformed */ }
  }

  private handleShowItemOptionUpgradeEffect(p: InPacket): void {
    try {
      const charId = p.readInt();
      const result = p.readByte();
      let itemId: number | undefined;
      if (result !== 0) itemId = p.readInt();
      this.onShowItemOptionUpgradeEffect?.({ charId, result, itemId });
    } catch { /* malformed */ }
  }

  private handleShowItemReleaseEffect(p: InPacket): void {
    try {
      this.onShowItemReleaseEffect?.({ charId: p.readInt(), flag: p.readByte() });
    } catch { /* malformed */ }
  }

  private handleShowItemUnreleaseEffect(p: InPacket): void {
    try {
      this.onShowItemUnreleaseEffect?.({ charId: p.readInt(), flag: p.readByte() });
    } catch { /* malformed */ }
  }

  // ── CUserLocal medium-priority packet handlers ───────────────────────

  // OG: CUserLocal::OnOpenUI (0x9055f0) — Decode1 → CWvsContext::UI_Open(uiType, -1).
  private handleOpenUI(p: InPacket): void {
    try {
      const uiType = p.readByte();
      this.onOpenUI?.(uiType);
    } catch { /* malformed */ }
  }

  // OG: CUserLocal::OnOpenUIWithOption (0x932320) — Decode4(uiType) + Decode4(option)
  // → CWvsContext::UI_Open(uiType, -1), then special cases:
  //   uiType 7: UI_Close(7) + UI_Toggle(7, option) — quest UI toggle
  //   uiType 21: CUIPartySearch::RequestPartyAdverSearch(option) — party search
  //   uiType 33: CRepairDurabilityDlg(option) — repair durability dialog
  private handleOpenUIWithOption(p: InPacket): void {
    try {
      const uiType = p.readInt();
      const option = p.readInt();
      this.onOpenUIWithOption?.(uiType, option);
    } catch { /* malformed */ }
  }

  // OG: CUserLocal::OnNoticeMsg (0x9181f0) — DecodeStr → CUtilDlg::Notice.
  private handleNoticeMsg(p: InPacket): void {
    try {
      const message = p.readString();
      this.onNoticeMsg?.(message);
    } catch { /* malformed */ }
  }

  // OG: CUserLocal::OnChatMsg (0x9xxxxx) — local echo of the player's own
  // sent chat message. DecodeStr → CStatusBar::ChatLogAdd.
  private handleUserLocalChatMsg(p: InPacket): void {
    try {
      const message = p.readString();
      this.onUserLocalChatMsg?.(message);
    } catch { /* malformed */ }
  }

  // OG: CUser::OnMiniRoomBalloon (0x8e8d50) — decode mini room balloon info
  // for other characters' trade shops / mini rooms visible on the map.
  private handleBalloonMsg(p: InPacket): void {
    try {
      const charId = p.readInt();
      const miniRoomType = p.readByte();
      if (miniRoomType === 0) {
        // type 0 = destroy balloon
        this.onMiniRoomBalloon?.({ charId, miniRoomType: 0, sn: 0, title: '', bPrivate: false, gameKind: 0, curUsers: 0, maxUsers: 0, gameOn: false });
        return;
      }
      const sn = p.readInt();
      const title = p.readString();
      const bPrivate = p.readByte() !== 0;
      const gameKind = p.readByte();
      const curUsers = p.readByte();
      const maxUsers = p.readByte();
      const gameOn = p.readByte() !== 0;
      this.onMiniRoomBalloon?.({ charId, miniRoomType, sn, title, bPrivate, gameKind, curUsers, maxUsers, gameOn });
    } catch { /* malformed */ }
  }

  private handleUserHitByUser(p: InPacket): void {
    try {
      this.onUserHitByUser?.({ charId: p.readInt(), damage: p.readInt() });
    } catch { /* malformed */ }
  }

  private handleUserTeslaTriangle(p: InPacket): void {
    try {
      this.onUserTeslaTriangle?.({ charId: p.readInt(), state: p.readByte() });
    } catch { /* malformed */ }
  }

  private handleUserFollowCharacter(p: InPacket): void {
    try {
      const charId = p.readInt();
      let targetId = 0;
      // OG: reads targetId only when charId is not local player
      try { targetId = p.readInt(); } catch { }
      this.onUserFollowCharacter?.({ charId, targetId });
    } catch { /* malformed */ }
  }

  private handleUserShowPQReward(p: InPacket): void {
    try {
      const charId = p.readInt();
      const rewardId = p.readInt();
      this.onUserShowPQReward?.({ charId, rewardId });
    } catch { /* malformed */ }
  }

  private handleUserSetPhase(p: InPacket): void {
    try {
      this.onUserSetPhase?.({ charId: p.readInt(), phase: p.readByte() });
    } catch { /* malformed */ }
  }

  private handleShowRecoverUpgradeCountEffect(p: InPacket): void {
    try {
      this.onShowRecoverUpgradeCountEffect?.({ charId: p.readInt(), count: p.readByte() });
    } catch { /* malformed */ }
  }

  // ── CUserPool remote-packet handler implementations ──────────────────

  // OG: CUserRemote::OnMovingShootAttackPrepare (0x953BC0).
  // After charId: level(u8) + isCharging(u8) + [if charging: skillId(u32)] +
  //   actionPacked(u16: bit15=facingLeft, bits0-14=nAction) + trailing(u8).
  private handleUserMovingShootAttackPrepare(p: InPacket): void {
    try {
      const charId = p.readInt();
      const level = p.readByte();
      const isCharging = p.readByte() !== 0;
      const skillId = isCharging ? p.readInt() : 0;
      const actionPacked = p.readShort();
      const facingLeft = !!(actionPacked & 0x8000);
      const nAction = actionPacked & 0x7FFF;
      p.readByte(); // unused trailing byte in OG
      this.onUserMovingShootAttackPrepare?.({ charId, level, isCharging, skillId, facingLeft, nAction });
    } catch { /* malformed */ }
  }

  // OG: CUserRemote::OnHit (0x954C50). After charId: attackIdx(u8) + nDamage(u32).
  private handleUserHit(p: InPacket): void {
    try {
      const charId = p.readInt();
      const attackIdx = p.readByte();
      const damage = p.readInt();
      this.onUserHit?.({ charId, attackIdx, damage });
    } catch { /* malformed */ }
  }

  private handleUserSetActiveEffectItem(p: InPacket): void {
    try {
      this.onUserSetActiveEffectItem?.({ charId: p.readInt(), itemId: p.readInt() });
    } catch { /* malformed */ }
  }

  // OG: CUserRemote::OnShowUpgradeTombEffect (0x954090).
  // After charId: value(u32) + posX(u32) + posY(u32).
  private handleUserShowUpgradeTombEffect(p: InPacket): void {
    try {
      const charId = p.readInt();
      const value = p.readInt();
      const posX = p.readInt();
      const posY = p.readInt();
      this.onUserShowUpgradeTombEffect?.({ charId, value, posX, posY });
    } catch { /* malformed */ }
  }

  private handleUserSetTemporaryStat(p: InPacket): void {
    try {
      const charId = p.readInt();
      const maskLo = p.readLong();
      const maskHi = p.readLong();

      // Count total set bits across both 64-bit halves
      const totalBits = countBits64(maskLo) + countBits64(maskHi);

      // Read common entries: each set bit carries (value: short, skillId: int, seconds: int)
      const rawEntries: { bit: number; value: number; skillId: number; seconds: number }[] = [];
      for (let i = 0; i < totalBits; i++) {
        rawEntries.push({
          bit: i,
          value: p.readShort(),
          skillId: p.readInt(),
          seconds: p.readInt(),
        });
      }

      // Map entry index → actual bit position (lowest set bit first)
      const buffs: TempStatBuff[] = [];
      let entryIdx = 0;
      for (let word = 0; word < 2; word++) {
        let bits = word === 0 ? maskLo : maskHi;
        let bitPos = BigInt(word * 64);
        while (bits) {
          const lowest = bits & -bits;
          const bit = bitPos + BigInt(Math.clz32(Number(lowest)) ^ 31);
          if (entryIdx < rawEntries.length) {
            rawEntries[entryIdx].bit = Number(bit);
            buffs.push(rawEntries[entryIdx]);
          }
          entryIdx++;
          bits &= bits - 1n;
        }
      }

      // Phase 4: Special-case inline data AFTER the common loop
      // CTS_DICE (bit 85) → 22 extra ints
      let diceInfo: number[] = [];
      if (isBitSet(maskLo, maskHi, 85n)) {
        for (let j = 0; j < 22; j++) diceInfo.push(p.readInt());
      }
      // CTS_SWALLOW_BUFF (bit 98) → 1 extra int
      let swallowBuffTime = 0;
      if (isBitSet(maskLo, maskHi, 98n)) {
        swallowBuffTime = p.readInt();
      }
      // CTS_BLESSING_ARMOR (bit 78) → 1 extra int
      let blessingArmorIncPAD = 0;
      if (isBitSet(maskLo, maskHi, 78n)) {
        blessingArmorIncPAD = p.readInt();
      }

      // Phase 5: Unconditional trailing bytes
      let defenseAtt = 0;
      let defenseState = 0;
      if (p.remaining >= 2) {
        defenseAtt = p.readByte();
        defenseState = p.readByte();
      }

      this.onUserSetTemporaryStat?.({
        charId, maskLo, maskHi, buffs,
        defenseAtt, defenseState,
        diceInfo, swallowBuffTime, blessingArmorIncPAD,
      });
    } catch { /* malformed */ }
  }

  private handleUserResetTemporaryStat(p: InPacket): void {
    try {
      const charId = p.readInt();
      const maskLo = p.readLong();
      const maskHi = p.readLong();
      this.onUserResetTemporaryStat?.({ charId, maskLo, maskHi });
    } catch { /* malformed */ }
  }

  // OG: CUserRemote::OnReceiveHP (0x953F50). After charId: curHP(u32) + maxHP(u32).
  private handleUserReceiveHP(p: InPacket): void {
    try {
      const charId = p.readInt();
      const curHP = p.readInt();
      const maxHP = p.readInt();
      this.onUserReceiveHP?.({ charId, curHP, maxHP });
    } catch { /* malformed */ }
  }

  private handleUserGuildNameChanged(p: InPacket): void {
    try {
      this.onUserGuildNameChanged?.({ charId: p.readInt(), guildName: p.readString() });
    } catch { /* malformed */ }
  }

  // OG: CUserRemote::OnGuildMarkChanged (0x953FE0).
  // After charId: markBg(u16) + markBgColor(u8) + mark(u16) + markColor(u8).
  private handleUserGuildMarkChanged(p: InPacket): void {
    try {
      const charId = p.readInt();
      const markBg = p.readShort();
      const markBgColor = p.readByte();
      const mark = p.readShort();
      const markColor = p.readByte();
      this.onUserGuildMarkChanged?.({ charId, markBg, markBgColor, mark, markColor });
    } catch { /* malformed */ }
  }

  // OG: CUserRemote::OnThrowGrenade (0x954030).
  // After charId: posX(u32) + posY(u32) + tKeyDown(u32) + skillId(u32) + unk(u32).
  private handleUserThrowGrenade(p: InPacket): void {
    try {
      const charId = p.readInt();
      const posX = p.readInt();
      const posY = p.readInt();
      const tKeyDown = p.readInt();
      const skillId = p.readInt();
      const unk = p.readInt();
      this.onUserThrowGrenade?.({ charId, posX, posY, tKeyDown, skillId, unk });
    } catch { /* malformed */ }
  }

  // ── Pet/Dragon handler implementations ───────────────────────────────
  // OG: CUser::OnPetPacket (0x8e02a0). Re-decompiled against the real v95
  // IDB; replaces an earlier pass's fabricated PetAction/PetAttack/etc.
  // shapes that didn't match the OG switch or any CPet::On* body.

  // OG: CUser::OnPetActivated (0x9547d0 remote / 0x90fb90 local) — opcode
  // 198 (triggerInteract=true) / 200 (triggerInteract=false, identical wire
  // shape). hasPet=false carries only a removeReason byte (1..4 select a
  // StringPool chat line in OG; the raw code is kept, text not recovered).
  private handlePetActivated(p: InPacket, triggerInteract: boolean): void {
    try {
      const charId = p.readInt();
      const petIdx = p.readByte();
      const hasPet = p.readByte() !== 0;
      if (hasPet) {
        const forceReplace = p.readByte() !== 0;
        const templateId = p.readInt();
        const name = p.readString();
        const lockerSN = p.readLong();
        const x = p.readShort();
        const y = p.readShort();
        const moveAction = p.readByte();
        const footholdId = p.readShort();
        this.onPetActivated?.({ charId, petIdx, hasPet, forceReplace, templateId, name, lockerSN, x, y, moveAction, footholdId });
      } else {
        const removeReason = p.readByte();
        this.onPetActivated?.({ charId, petIdx, hasPet, removeReason });
      }
      // OG: CUser::OnPetPacket only calls PetInterActWithUserAction(0, petIdx) for case 198.
      if (triggerInteract && hasPet) this.onPetAction?.({ charId, petIdx, type: 0, actionNo: 0, chat: '', flag: 0 });
    } catch { /* malformed */ }
  }

  // OG: CUser::OnPetEvol (0x8e5ce0) — opcode 199. Always re-summons at
  // petIdx with the same CPet::Init field shape as PetActivated's hasPet=true.
  private handlePetEvol(p: InPacket): void {
    try {
      const charId = p.readInt();
      const clearFirst = p.readByte() === 0; // OG: `if (!v3) SetActivePet(idx, null)` before re-summoning
      const petIdx = p.readByte();
      const templateId = p.readInt();
      const name = p.readString();
      const lockerSN = p.readLong();
      const x = p.readShort();
      const y = p.readShort();
      const moveAction = p.readByte();
      const footholdId = p.readShort();
      this.onPetEvol?.({ charId, clearFirst, petIdx, templateId, name, lockerSN, x, y, moveAction, footholdId });
    } catch { /* malformed */ }
  }

  // OG: CPet::OnMove (0x69fb60) — opcode 201. petIdx decoded by OnPetPacket before dispatch.
  private handlePetMove(p: InPacket): void {
    try {
      const charId = p.readInt();
      const petIdx = p.readByte();
      const movePath = DecodeMovePath(p);
      this.onPetMove?.({ charId, petIdx, movePath });
    } catch { /* malformed */ }
  }

  // OG: CPet::OnAction (0x6a3860) — opcode 202.
  private handlePetAction(p: InPacket): void {
    try {
      const charId = p.readInt();
      const petIdx = p.readByte();
      const type = p.readByte();
      const actionNo = p.readByte();
      const chat = p.readString();
      const flag = p.readByte();
      this.onPetAction?.({ charId, petIdx, type, actionNo, chat, flag });
    } catch { /* malformed */ }
  }

  // OG: CPet::OnNameChanged (0x6a11f0) — opcode 203.
  private handlePetNameChange(p: InPacket): void {
    try {
      const charId = p.readInt();
      const petIdx = p.readByte();
      const newName = p.readString();
      const showNameTag = p.readByte() !== 0;
      this.onPetNameChange?.({ charId, petIdx, newName, showNameTag });
    } catch { /* malformed */ }
  }

  // OG: CPet::OnLoadExceptionList (0x6a1510) — opcode 204. Only applied
  // client-side when lockerSN matches the pet's own m_liPetLockerSN.
  private handlePetLoadExceptionList(p: InPacket): void {
    try {
      const charId = p.readInt();
      const petIdx = p.readByte();
      const lockerSN = p.readLong();
      const count = p.readByte();
      const itemIds: number[] = [];
      for (let i = 0; i < count; i++) itemIds.push(p.readInt());
      this.onPetLoadExceptionList?.({ charId, petIdx, lockerSN, itemIds });
    } catch { /* malformed */ }
  }

  // OG: CPet::OnActionCommand (0x6a3930) — opcode 205. WZ CPetTemplate
  // interaction/food-reaction tables aren't ported; bytes decoded to keep
  // the stream aligned (see PetActionCommandArgs doc comment).
  private handlePetActionCommand(p: InPacket): void {
    try {
      const charId = p.readInt();
      const petIdx = p.readByte();
      const nType = p.readByte();
      let interactionIdx: number | undefined;
      let successFlag: number;
      if (nType === 0) {
        interactionIdx = p.readByte();
        successFlag = p.readByte();
      } else {
        successFlag = p.readByte();
      }
      const flag = p.readByte();
      this.onPetActionCommand?.({ charId, petIdx, nType, interactionIdx, successFlag, flag });
    } catch { /* malformed */ }
  }

  private handleDragonMove(p: InPacket): void {
    try {
      const charId = p.readInt();
      const movePath = DecodeMovePath(p);
      this.onDragonMove?.({ charId, movePath });
    } catch { /* malformed */ }
  }

  private handleDragonAfterMove(p: InPacket): void {
    try {
      const charId = p.readInt();
      const movePath = DecodeMovePath(p);
      this.onDragonAfterMove?.({ charId, movePath });
    } catch { /* malformed */ }
  }

  private handleDragonAction(p: InPacket): void {
    try {
      const charId = p.readInt();
      const action = p.readByte();
      const option = p.readInt();
      this.onDragonAction?.({ charId, action, option });
    } catch { /* malformed */ }
  }

  // ── CMob gap handler implementations ─────────────────────────────────

  private handleMobStatSet(p: InPacket): void {
    // TODO_AUDIT.md Hundred-and-sixty-ninth pass: OG reads DecodeBuffer(16) = UINT128 flag
    // (decompile/652660.c), not just 8 bytes. Lower 64 = statMask, upper 64 = statMaskHigh.
    // Per-flag stat values (nValue:Decode2 + rValue:Decode4 + tValue:Decode2 each, decompile/7408C0.c)
    // are consumed as raw bytes — SecondaryStat decode requires full system (3% coverage).
    try {
      const mobId = p.readInt();
      const statMask = p.readLong();
      const statMaskHigh = p.readLong();
      const remaining = p.remaining;
      const stats = remaining > 0 ? p.readBytes(remaining) : new Uint8Array(0);
      this.onMobStatSet?.({ mobId, statMask, statMaskHigh, stats });
    } catch { /* malformed */ }
  }

  private handleMobStatReset(p: InPacket): void {
    // TODO_AUDIT.md Hundred-and-sixty-ninth pass: OG reads DecodeBuffer(16) = UINT128 flag (decompile/652780.c).
    try {
      const mobId = p.readInt();
      const statMask = p.readLong();
      const statMaskHigh = p.readLong();
      this.onMobStatReset?.({ mobId, statMask, statMaskHigh });
    } catch { /* malformed */ }
  }

  private handleMobSuspendReset(p: InPacket): void {
    // TODO_AUDIT.md Hundred-and-sixty-ninth pass: OG reads Decode1 for isSuspended (decompile/64ACB0.c).
    // When true: mob fades in (alpha→255) and resets doom/suspended state.
    try {
      const mobId = p.readInt();
      const isSuspended = p.readByte() !== 0;
      this.onMobSuspendReset?.({ mobId, isSuspended });
    } catch { /* malformed */ }
  }

  private handleMobAffected(p: InPacket): void {
    // TODO_AUDIT.md Hundred-and-sixty-ninth pass: OG reads Decode4(skillId) + Decode2(duration)
    // (decompile/644400.c). Duration = tStart relative offset in ticks (Decode2 short).
    try {
      const mobId = p.readInt();
      const skillId = p.readInt();
      const duration = p.readShort();
      this.onMobAffected?.({ mobId, skillId, duration });
    } catch { /* malformed */ }
  }

  private handleMobCatchEffect(p: InPacket): void {
    try {
      const mobId = p.readInt();
      const catchSkillId = p.readInt();
      const catchItemId = p.readInt();
      this.onMobCatchEffect?.({ mobId, catchSkillId, catchItemId });
    } catch { /* malformed */ }
  }

  private handleMobEffectByItem(p: InPacket): void {
    try {
      this.onMobEffectByItem?.({ mobId: p.readInt(), itemId: p.readInt() });
    } catch { /* malformed */ }
  }

  private handleMobIncChargeCount(p: InPacket): void {
    try {
      this.onMobIncChargeCount?.({ mobId: p.readInt(), chargeCount: p.readInt(), attackReady: p.readInt() !== 0 });
    } catch { /* malformed */ }
  }

  private handleMobEscortFullPath(p: InPacket): void {
    try {
      const mobId = p.readInt();
      const state = p.readByte();
      const stopDuration = p.readInt();
      // OG reads a CMovePath for the escort route
      DecodeMovePath(p);
      this.onMobEscortFullPath?.({ mobId, state, stopDuration });
    } catch { /* malformed */ }
  }

  private handleMobEscortStopPerm(p: InPacket): void {
    try {
      this.onMobEscortStopPerm?.({ mobId: p.readInt() });
    } catch { /* malformed */ }
  }

  private handleMobEscortStopSay(p: InPacket): void {
    try {
      this.onMobEscortStopSay?.({ mobId: p.readInt(), stopDuration: p.readInt() });
    } catch { /* malformed */ }
  }

  private handleMobEscortReturnBefore(p: InPacket): void {
    try {
      const mobId = p.readInt();
      const state = p.readByte();
      const stopDuration = p.readInt();
      this.onMobEscortReturnBefore?.({ mobId, state, stopDuration });
    } catch { /* malformed */ }
  }

  private handleMobNextAttack(p: InPacket): void {
    try {
      this.onMobNextAttack?.({ mobId: p.readInt() });
    } catch { /* malformed */ }
  }

  private handleMobAttackedByMob(p: InPacket): void {
    try {
      this.onMobAttackedByMob?.({ mobId: p.readInt(), attackerMobId: p.readInt() });
    } catch { /* malformed */ }
  }

  // ── CNpc gap handler implementations ─────────────────────────────────

  private handleNpcTemplatePacket(p: InPacket): void {
    try {
      this.onNpcTemplatePacket?.({ npcId: p.readInt(), bMove: p.readByte() !== 0 });
    } catch { /* malformed */ }
  }
}

function countBits(x: number): number {
  let c = 0;
  while (x) { c += x & 1; x >>>= 1; }
  return c;
}

function countBits64(x: bigint): number {
  let c = 0;
  let v = x;
  while (v) { c += Number(v & 1n); v >>= 1n; }
  return c;
}

function isBitSet(lo: bigint, hi: bigint, bit: bigint): boolean {
  if (bit < 64n) return (lo & (1n << bit)) !== 0n;
  return (hi & (1n << (bit - 64n))) !== 0n;
}
