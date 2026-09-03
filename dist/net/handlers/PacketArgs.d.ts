import { CharacterEntry } from '../../domain/CharacterEntry.js';
import { CharacterStat } from '../../domain/CharacterStat.js';
import { AvatarLook } from '../../domain/AvatarLook.js';
import { EquipStats, InventoryItem } from '../../domain/InventoryItem.js';
import { Stance } from '../../character/Stance.js';
export interface CheckPasswordResultArgs {
    success: boolean;
    resultCode: number;
    blockReason?: number;
    eulaRequired?: boolean;
    skipPinCode?: boolean;
}
export interface SelectWorldResultArgs {
    success: boolean;
    resultCode: number;
    characters: CharacterEntry[];
}
export interface CheckDuplicatedIdArgs {
    name: string;
    resultCode: number;
}
export interface CreateNewCharacterResultArgs {
    success: boolean;
    resultCode: number;
    entry?: CharacterEntry;
}
export interface DeleteCharacterArgs {
    success: boolean;
    resultCode: number;
    characterId: number;
}
export interface CheckPinCodeResultArgs {
    mode: number;
    accepted: boolean;
    requiresNewPin: boolean;
    requiresPinEntry: boolean;
    returnToLogin: boolean;
}
export interface UpdatePinCodeResultArgs {
    success: boolean;
    errorCode?: number;
}
export interface SelectCharacterResultArgs {
    success: boolean;
    resultCode: number;
    channelHost?: Uint8Array;
    channelPort?: number;
    characterId?: number;
    authenCode?: number;
    premiumArgument?: number;
}
export interface SetFieldArgs {
    channelId: number;
    fieldKey: number;
    isMigrate: boolean;
    /** Owning character id (server→client, 4 bytes; non-migrate path too). */
    characterId?: number;
    /**
     * OG: Decode2 after fieldKey+isMigrate. Mislabelled 'mapType' in earlier passes.
     * It is the event-alarm notifier count (nNotifierCheck) from CStage::OnSetField
     * (decompile/71A0A0.c). TODO_AUDIT.md Hundred-and-sixty-eighth pass.
     */
    nNotifierCheck?: number;
    /** Event alarm title + content lines decoded when nNotifierCheck > 0. */
    eventAlarm?: {
        title: string;
        lines: string[];
    };
    /** Migrate-only: random damage seed #1. */
    calcDamageSeed1?: number;
    calcDamageSeed2?: number;
    calcDamageSeed3?: number;
    /** Migrate-only: random damage flag (8 bytes; the dump names this 'dwFlag'). */
    dwFlag?: bigint;
    /** Migrate-only: character gender (1 byte). Distinct from stat.gender. */
    gender?: number;
    /** Migrate-only: character skin (1 byte). Distinct from stat.skin. */
    skin?: number;
    stat?: CharacterStat;
    look?: AvatarLook;
    linkedCharacter?: string;
    /** OG: CharacterData.money — decoded from SetField migrate path (DBChar.MONEY flag). */
    money?: number;
    /** OG: CharacterData.equipped — decoded equip slots from SetField migrate path. */
    equipped?: {
        slot: number;
        item: any;
    }[];
    equippedCash?: {
        slot: number;
        item: any;
    }[];
    /** Non-migrate-only: field type (1 byte; e.g. 0=normal, 1=instance). */
    nFieldType?: number;
    posMap?: number;
    portal?: number;
    /** Non-migrate-only: mob capacity hint (4 bytes; sent in case the field is instance-d). */
    mobCapacity?: number;
}
export interface StatChangedArgs {
    mask: bigint;
    skin?: number;
    face?: number;
    hair?: number;
    level?: number;
    job?: number;
    str?: number;
    dex?: number;
    int?: number;
    luk?: number;
    hp?: number;
    maxHp?: number;
    mp?: number;
    maxMp?: number;
    ap?: number;
    sp?: number;
    extendedSp?: Uint8Array;
    exp?: number;
    pop?: number;
    meso?: number;
}
export interface MobEnterArgs {
    mobId: number;
    templateId: number;
    x: number;
    y: number;
    fhId: number;
    moveAction?: number;
    controllerFlag?: boolean;
    dwMobStatFlag?: number;
    rx0?: number;
    rx1?: number;
    summonType?: number;
    summonId?: number;
    maxHp?: number;
    curHp?: number;
    team?: number;
    isBoss?: boolean;
}
export interface MobMoveArgs {
    mobId: number;
    bNotForceLandingWhenDiscard: number;
    bNotChangeAction: boolean;
    bNextAttackPossible: boolean;
    bLeft: number;
    movePath: {
        originX: number;
        originY: number;
        originVx: number;
        originVy: number;
        elements: {
            attr: number;
            x: number;
            y: number;
            vx: number;
            vy: number;
            fh: number;
            moveAction: number;
            elapse: number;
        }[];
    };
}
export interface MobDamagedArgs {
    mobId: number;
    damage: number;
    hp: number;
    maxHp: number;
}
export interface NpcEnterArgs {
    objId: number;
    templateId: number;
    x: number;
    y: number;
    moveAction: number;
    footholdId: number;
    rgHorzLow: number;
    rgHorzHigh: number;
    bEnabled: boolean;
}
export interface NpcMoveArgs {
    npcId: number;
    actionIdx: number;
    chatIdx: number;
    /** Present only for a moving NPC template (CNpcTemplate::bMove). */
    movePath?: import('../packet/MovePathDecoder.js').DecodedMovePath;
}
export interface OtherCharEnterArgs {
    charId: number;
    level: number;
    name: string;
    look?: AvatarLook;
    x: number;
    y: number;
    guildName?: string;
    guildMarkBg?: number;
    guildMarkBgColor?: number;
    guildMark?: number;
    guildMarkColor?: number;
    allianceTag?: number;
    job?: number;
    grade?: number;
    chHair?: number;
    chHairColor?: number;
    chFace?: number;
    sex?: number;
}
export interface OtherCharMoveArgs {
    charId: number;
    x: number;
    y: number;
    stance?: Stance;
    facingLeft?: boolean;
    movePath?: import('../packet/MovePathDecoder.js').DecodedMovePath;
}
export interface UserPassiveMoveArgs {
    charId: number;
    movePath?: import('../packet/MovePathDecoder.js').DecodedMovePath;
    /** CMovePath::m_aKeyPadState, one 4-bit state per keypad entry. */
    keypad?: number[];
    bounds?: {
        left: number;
        top: number;
        right: number;
        bottom: number;
    };
}
export interface AttackTargetInfo {
    mobId: number;
    hitAction: number;
    damage: number[];
}
/** OG: CUserRemote::OnAttack (live IDA decompile, Maplestory95.exe.i64
 *  0x95a670) — common-case decode only. Real OG has dense per-skillId
 *  special-casing (grenade throw, swallow-mob, meso-explosion damage
 *  shape, serial-attack flag) this does NOT replicate; skillIds that need
 *  those will desync past the targets array and the catch in
 *  FieldHandlers.handleUserAttack will just drop the packet. */
export interface UserAttackArgs {
    charId: number;
    attackType: 'melee' | 'shoot' | 'magic' | 'body';
    skillId: number;
    slv: number;
    action: number;
    facingLeft: boolean;
    actionSpeed: number;
    mastery: number;
    bulletItemId: number;
    targets: AttackTargetInfo[];
    /** shoot-attack only: the visible arrow/bullet's start point. */
    ballStart?: {
        x: number;
        y: number;
    };
}
export interface DropEnterArgs {
    dropId: number;
    isMoney: boolean;
    itemIdOrAmount: number;
    ownerId: number;
    sourceId: number;
    x: number;
    y: number;
    sourceX?: number;
    sourceY?: number;
    animated?: boolean;
}
export interface DropLeaveArgs {
    dropId: number;
    leaveType: number;
    pickUpId?: number;
}
export interface InventoryOpArg {
    opType: number;
    invType: number;
    pos: number;
    itemId?: number;
    quantity?: number;
    attribute?: number;
    newPos?: number;
    equipExp?: number;
    petLevel?: number;
    petTameness?: number;
    petRepleteness?: number;
    petRemainLife?: number;
    equipStats?: EquipStats;
}
export interface UserChatArgs {
    charId: number;
    chatType: number;
    text: string;
}
export interface ScriptMessageArgs {
    speakerId: number;
    msgType: number;
    text: string;
    hasPrev: boolean;
    hasNext: boolean;
    quizHint?: string;
    quizMinLength?: number;
    quizMaxLength?: number;
    quizRemainTime?: number;
    defaultText?: string;
    minLength?: number;
    maxLength?: number;
    defaultNum?: number;
    minNum?: number;
    maxNum?: number;
    avatars?: number[];
    pets?: number[];
    slideMenuType?: number;
    menu?: string[];
    questId?: number;
    boxWidth?: number;
    boxHeight?: number;
}
export interface FuncKeyEntry {
    keyIndex: number;
    type: number;
    actionId: number;
}
export interface FootHoldStateMoving {
    speed: number;
    x1: number;
    x2: number;
    y1: number;
    y2: number;
    curX: number;
    curY: number;
    reverseVertical: boolean;
    reverseHorizontal: boolean;
}
export interface FootHoldStateEntry {
    objName: string;
    curState: number;
    footholdSns: number[];
    moving?: FootHoldStateMoving;
}
export interface FootHoldInfoArgs {
    entries: FootHoldStateEntry[];
}
export interface TempStatEntry {
    skillId: number;
    value: number;
    seconds: number;
}
export interface UserEmotionArgs {
    charId: number;
    emotion: number;
    durationMs: number;
    byItemOption: boolean;
}
export interface UserEffectArgs {
    charId: number;
    effectType: number;
    payload: Uint8Array;
    isLocal: boolean;
}
export interface MobCtrlAckArgs {
    mobId: number;
    mobCtrlSn: number;
    nextAttackPossible: boolean;
    mp: number;
    nextSkillId: number;
    nextSkillLevel: number;
}
export interface LootMessageArgs {
    warning: number;
    isMoney: boolean;
    itemId?: number;
    quantity?: number;
    money?: number;
}
export interface QuestRecordArgs {
    questId: number;
    state: number;
    value: string;
    isEx: boolean;
}
/** OutHeader.Message=38 sub-types not yet tied to a specific caller.
 *  Currently logged-and-forgotten; the args are passed via `onSystemMessage` /
 *  `onCashItemExpire` / `onGiveBuff` etc. so the consumers can still react. */
export interface SystemMessageArgs {
    text: string;
    type: number;
}
export interface CashItemExpireArgs {
    itemId: number;
}
export interface GiveBuffArgs {
    itemId: number;
}
export interface OpenUrlArgs {
    url: string;
}
export interface PartyMember {
    charId: number;
    name: string;
    job: number;
    level: number;
    channel: number;
    hp: number;
    maxHp: number;
}
export interface FriendEntry {
    charId: number;
    name: string;
    flag: number;
    channel: number;
    online: boolean;
    group: string;
}
export interface GuildMember {
    characterId: number;
    name: string;
    job: number;
    level: number;
    rank: number;
    online: boolean;
}
export interface GuildLoadArgs {
    guildId: number;
    name: string;
    members: GuildMember[];
}
export interface AllianceMember {
    characterId: number;
    name: string;
    job: number;
    level: number;
    grade: number;
    guildId: number;
}
export interface AllianceLoadArgs {
    allianceName: string;
    members: AllianceMember[];
}
/** OG: CShopDlg::ITEM struct — all fields from SetShopDlg (0x6EAB00). */
export interface ShopItemEntry {
    itemId: number;
    price: number;
    discountRate: number;
    tokenId: number;
    tokenPrice: number;
    itemPeriod: number;
    levelLimited: number;
    quantity: number;
    maxPerSlot: number;
    unitPrice: number;
}
export interface ShopOpenArgs {
    npcId: number;
    items: ShopItemEntry[];
}
export interface ShopResultArgs {
    resultType: number;
    shortfall?: number;
    message?: string;
}
export interface AdminShopDlgArgs {
    action: number;
    shouldReopen: boolean;
}
export interface AdminShopResultArgs {
    npcTemplateId: number;
    itemCount: number;
}
export interface StoreBankResultArgs {
    resultCode: number;
}
export interface StoreBankActionArgs {
    subAction: number;
    passingDay?: number;
    fee?: number;
    accountId?: number;
    value?: number;
    channel?: number;
}
export interface CharacterSaleCheckIdResultArgs {
    id: string;
    resultCode: number;
}
export interface CharacterSaleCreateResultArgs {
    mode: number;
    code: number;
}
export interface MonsterCarnivalEnterArgs {
    team: number;
    personalCp?: number;
    personalCpDiff?: number;
    myTeamCp?: number;
    myTeamCpTotal?: number;
    enemyCpRest?: number;
    enemyCpTotal?: number;
}
export interface MonsterCarnivalPersonalCpArgs {
    cp: number;
    cpDiff: number;
}
export interface MonsterCarnivalTeamCpArgs {
    team: number;
    cp: number;
    cpDiff: number;
}
export interface MonsterCarnivalRequestResultArgs {
    code1: number;
    code2: number;
    message: string;
}
export interface MonsterCarnivalRequestCannedArgs {
    resultCode: number;
}
export interface MonsterCarnivalProcessForDeathArgs {
    teamFlag: number;
    characterName: string;
    remainingCount: number;
}
export interface MonsterCarnivalMemberOutArgs {
    flag1: number;
    flag2: number;
    characterName: string;
}
export interface MonsterCarnivalGameResultArgs {
    resultCode: number;
}
export interface FamilyChartResultArgs {
    raw: Uint8Array;
}
export interface FamilyInfoResultArgs {
    famousPoint: number;
    totalFamousPoint: number;
    todaySavePoint: number;
    childCount: number;
    childLimit: number;
    totalChildCount: number;
    bossId: number;
    familyName: string;
    precept: string;
    privilegeUse: {
        key: number;
        value: number;
    }[];
}
export interface FamilyResultArgs {
    resultCode: number;
    value: number;
}
export interface FamilyJoinRequestArgs {
    inviterId: number;
    field2: number;
    jobCode: number;
    inviterName: string;
}
export interface FamilyJoinRequestResultArgs {
    accepted: boolean;
    characterName: string;
}
export interface FamilyJoinAcceptedArgs {
    characterName: string;
}
export interface FamilyPrivilegeEntry {
    type: number;
    fame: number;
    dayLimit: number;
    name: string;
    desc: string;
}
export interface FamilyPrivilegeListArgs {
    privileges: FamilyPrivilegeEntry[];
}
export interface FamilyFamousPointIncResultArgs {
    deltaPoint: number;
    characterName: string;
}
export interface FamilyNotifyLoginOrLogoutArgs {
    isLogin: boolean;
    characterName: string;
}
export interface FamilySetPrivilegeArgs {
    type: number;
    index?: number;
    incExpRate?: number;
    incDropRate?: number;
    timeSign?: number;
    timeDeltaMs?: number;
}
export interface FamilySummonRequestArgs {
    characterName: string;
    fieldName: string;
}
export interface GuildBBSEntry {
    entryId: number;
    characterId: number;
    title: string;
    date: bigint;
    emoticon: number;
    comments: number;
}
export interface GuildBBSListResultArgs {
    notice: GuildBBSEntry | null;
    totalCount: number;
    entries: GuildBBSEntry[];
}
export interface GuildBBSComment {
    sn: number;
    characterId: number;
    date: bigint;
    comment: string;
}
export interface GuildBBSViewEntryResultArgs {
    entryId: number;
    characterId: number;
    date: bigint;
    title: string;
    text: string;
    emoticon: number;
    comments: GuildBBSComment[];
}
export interface WeddingItemTab {
    tab: number;
    items: InventoryItem[];
}
export interface WeddingGiftResultArgs {
    subAction: number;
    wishList?: string[];
    itemTabs?: WeddingItemTab[];
}
export interface ItemUpgradeResultArgs {
    resultByte: number;
    errorCode?: number;
    subResult?: number;
    result?: number;
    iuc?: number;
}
export interface InventoryGrowArgs {
    invType: number;
    slotCount: number;
}
export interface SetTamingMobInfoArgs {
    charId: number;
    tamingMobLevel: number;
    tamingMobExp: number;
    tamingMobFatigue: number;
    flag: number;
}
export interface QuestClearArgs {
    questId: number;
}
export interface GatherItemResultArgs {
    invType: number;
    resultCode: number;
}
export interface SortItemResultArgs {
    invType: number;
    resultCode: number;
}
export interface SueCharacterResultArgs {
    resultCode: number;
}
export interface TradeMoneyLimitArgs {
    limitType: number;
}
export interface SetGenderArgs {
    gender: number;
}
export interface TownPortalNotifyArgs {
    townId: number;
    fieldId: number;
    /** Only present when neither townId nor fieldId is the "no portal" sentinel (999999999). */
    skillId?: number;
    x?: number;
    y?: number;
}
export interface OpenGateNotifyArgs {
    x: number;
    y: number;
}
export interface MarriageRequestArgs {
    requestType: number;
    partnerName?: string;
    partnerId?: number;
}
export interface MarriageResultArgs {
    resultCode: number;
    groomName?: string;
    brideName?: string;
    ringItemId?: number;
    message?: string;
}
export interface NotifyMarriedPartnerMapTransferArgs {
    mapId: number;
    partnerId: number;
}
export interface CashPetFoodResultArgs {
    result: number;
    foodIndex?: number;
}
export interface SetWeekEventMessageArgs {
    flag: number;
    message: string;
}
export interface SetPotionDiscountRateArgs {
    rate: number;
}
export interface MonsterBookSetCardArgs {
    flag: number;
    cardId?: number;
    count?: number;
}
export interface MonsterBookSetCoverArgs {
    coverId: number;
}
export interface HourChangedArgs {
    hour: number;
    minute: number;
}
export interface MiniMapOnOffArgs {
    onOff: boolean;
}
export interface ConsultAuthkeyUpdateArgs {
    authkey: string;
}
export interface ClassCompetitionAuthkeyUpdateArgs {
    authkey: string;
}
export interface WebBoardAuthkeyUpdateArgs {
    flag: number;
    authkey: string;
}
export interface SessionValueArgs {
    key: string;
    value: string;
}
export interface PartyValueArgs {
    key: string;
    value: string;
}
export interface FieldSetVariableArgs {
    key: string;
    value: string;
}
export interface BonusExpRateChangedArgs {
    rate: number;
    startTime: number;
    endTime: number;
}
export interface PotionDiscountRateChangedArgs {
    rate: number;
    duration: number;
}
export interface NotifyLevelUpArgs {
    flag: number;
    level: number;
    name: string;
}
export interface NotifyWeddingArgs {
    flag: number;
    name: string;
}
export interface NotifyJobChangeArgs {
    flag: number;
    job: number;
    name: string;
}
export interface MapleTVUseResArgs {
    message: string;
}
export interface AvatarMegaphoneResArgs {
    result: number;
    message: string;
}
export interface SuccessInUsegachaponBoxArgs {
    itemId: number;
}
export interface SetBuyEquipExtArgs {
    flag: boolean;
}
export interface SetPassengerRequestArgs {
    npcId: number;
}
export interface ScriptProgressMessageArgs {
    message: string;
}
export interface DataCRCCheckFailedArgs {
    message: string;
}
export interface UpdateGMBoardArgs {
    boardId: number;
    message: string;
}
export interface ShowSlotMessageArgs {
    slot: number;
}
export interface AccountMoreInfoArgs {
    flag: number;
}
export interface FindFriendArgs {
    flag1: number;
    flag2: number;
}
export interface TransferChannelNotifyArgs {
    channel: number;
    message: string;
}
export interface ForcedStatSetArgs {
    mask: number;
    str?: number;
    dex?: number;
    int?: number;
    luk?: number;
    pad?: number;
    pdd?: number;
    mad?: number;
    mdd?: number;
    acc?: number;
    eva?: number;
    speed?: number;
    jump?: number;
    speedMax?: number;
}
export interface ShopLinkResultArgs {
    resultCode: number;
}
export interface ImitatedNPCDataEntry {
    templateId: number;
    name: string;
    avatarLook: AvatarLook;
}
export interface ImitatedNPCDataArgs {
    entries: ImitatedNPCDataEntry[];
}
export interface LimitedNPCDisableInfoArgs {
    templateIds: number[];
}
export interface WildHunterInfoArgs {
    packedByte: number;
    capturedMobIds: number[];
}
export interface DisallowedDeliveryQuestListArgs {
    field1: number;
    field2: number;
}
export interface HontaleTimerArgs {
    flag: number;
    value: number;
}
export interface ChaosZakumTimerArgs {
    flag: number;
    value: number;
}
export interface HontailTimerArgs {
    flag: number;
    value: number;
}
export interface ZakumTimerArgs {
    flag: number;
    value: number;
}
export interface RPSGameDlgArgs {
    subAction: number;
    npcSelect: number;
    cntStraightVictories: number;
}
export interface ParcelDlgArgs {
    subAction: number;
}
export interface SummonedAttackArgs {
    charId: number;
    summonedId: number;
}
export interface SummonedSkillArgs {
    charId: number;
    summonedId: number;
    action: number;
}
export interface SummonedHitArgs {
    charId: number;
    summonedId: number;
    attackIdx: number;
    damage: number;
    mobTemplateId?: number;
    isLeft?: boolean;
}
export interface MobCrcKeyChangedArgs {
    crcKey: number;
}
export interface NpcChangeControllerArgs {
    flag: number;
    npcId: number;
}
export interface PetConsumeItemInitArgs {
    itemId: number;
}
export interface PetConsumeMPItemInitArgs {
    itemId: number;
}
export interface VegaResultArgs {
    resultCode: number;
}
export interface AuthenCodeChangedArgs {
    nSet: number;
    value: number;
}
export type LogoutGiftArgs = Record<string, never>;
export interface TrunkItem {
    invType: number;
    positionInType: number;
    itemId: number;
    quantity: number;
}
export interface TrunkResultArgs {
    resultType: number;
    templateId?: number;
    hasContents?: boolean;
    slotCount?: number;
    money?: number;
    items: TrunkItem[];
    message?: string;
}
export interface MessengerMigratedEntry {
    index: number;
    name: string;
    channel: number;
}
export interface MessengerResultArgs {
    action: number;
    userIndex?: number;
    name?: string;
    channel?: number;
    flag?: boolean;
    messengerId?: number;
    chat?: string;
    migrated: MessengerMigratedEntry[];
}
export interface SkillRecordEntry {
    skillId: number;
    level: number;
    masterLevel: number;
}
export interface QuickslotKey {
    key: number;
}
export interface WhisperReceiveArgs {
    fromName: string;
    channelId: number;
    text: string;
    isAdmin?: boolean;
}
export interface CharacterInfoPet {
    templateId: number;
    name: string;
    level: number;
    tameness: number;
    repleteness: number;
    petSkill: number;
    petWear: number;
}
export interface CharacterInfoArgs {
    charId: number;
    level: number;
    job: number;
    fame: number;
    married: boolean;
    guild: string;
    alliance: string;
    pets: CharacterInfoPet[];
}
export interface PartyInviteArgs {
    inviterId: number;
    inviterName: string;
}
export interface PartyLoadArgs {
    members: PartyMember[];
    bossId: number;
}
export interface ClaimResultArgs {
    result: number;
    success?: boolean;
    claimDelayMinutes?: number;
}
export interface ClaimSvrAvailableTimeArgs {
    openHour: number;
    closeHour: number;
}
export interface MiniRoomUser {
    index: number;
    name: string;
    job: number;
}
export interface MiniRoomShopItem {
    setCount: number;
    setSize: number;
    price: number;
    item: unknown;
}
/**
 * Variadic payload for `OutHeader.MiniRoom`. The wire format is a single sub-type byte
 * followed by fields whose shape depends on the sub-type. We use a single object type
 * with optional fields (rather than a discriminated union) so the existing
 * `handleMiniRoom` accumulator pattern in `FieldHandlers.ts` can keep mutating the
 * same object as it reads.
 */
export interface MiniRoomArgs {
    action: number;
    roomType?: number;
    resultType?: number;
    maxUsers?: number;
    myPosition?: number;
    users?: MiniRoomUser[];
    title?: string;
    items?: MiniRoomShopItem[];
    inviteType?: number;
    targetName?: string;
    chatSub?: number;
    msgType?: number;
    charName?: string;
    userIndex?: number;
    text?: string;
    leaveType?: number;
    index?: number;
    item?: unknown;
    money?: number;
    resultCode?: number;
    itemIndex?: number;
    quantity?: number;
    buyerName?: string;
    balloon?: true;
    ownerId?: number;
    miniRoomType?: number;
    pwd?: boolean;
    isEmployee?: boolean;
    cardIndex?: number;
    cardType?: number;
    showState?: number;
    round?: number;
    cardOrder?: number[];
    winnerIndex?: number;
    gameResultType?: number;
}
export interface ReactorEnterArgs {
    objId: number;
    templateId: number;
    state: number;
    x: number;
    y: number;
    flip: boolean;
    name: string;
}
export interface ReactorChangeStateArgs {
    objId: number;
    state: number;
    x: number;
    y: number;
    aniDelay: number;
    properEventIdx: number;
    stateEndDeciseconds: number;
}
export interface ReactorLeaveArgs {
    objId: number;
    state: number;
    x: number;
    y: number;
}
export interface ReactorMoveArgs {
    objId: number;
    /** Relative move delta in OG (fed to `IWzVector2D::RelMove`), not an absolute position. */
    dx: number;
    dy: number;
}
export interface EmployeeEnterArgs {
    objId: number;
    employerObjId: number;
    x: number;
    y: number;
    nameTag?: string | number;
}
export interface SummonedEnterArgs {
    charId: number;
    objId: number;
    skillId: number;
    charLevel: number;
    skillLevel: number;
    x: number;
    y: number;
    moveAction: number;
    curFoothold: number;
    moveAbility: number;
    assistType: number;
    enterType: number;
    avatarLook: AvatarLook | null;
    /** Only present for the Tesla Coil summon (skillId 35111002). */
    teslaCoilState?: number;
    teslaTriangle?: {
        x: number;
        y: number;
    }[];
}
export interface SummonedLeaveArgs {
    objId: number;
    leaveType?: number;
}
export interface SummonedMoveArgs {
    objId: number;
    /** CSummoned::OnMove consumes a complete CMovePath after objId. */
    movePath: import('../packet/MovePathDecoder.js').DecodedMovePath;
}
export interface TownPortalEnterArgs {
    objId: number;
    state: number;
    characterId: number;
    x: number;
    y: number;
}
export interface TownPortalLeaveArgs {
    objId: number;
    state?: number;
}
export interface AffectedAreaArgs {
    objId: number;
    type: number;
    ownerId: number;
    x: number;
    y: number;
    left: number;
    top: number;
    right: number;
    bottom: number;
    skillId?: number;
    skillLevel?: number;
    elemAttr?: number;
    phase?: number;
}
export interface OpenGateCreateArgs {
    objId: number;
    state: number;
    characterId: number;
    x: number;
    y: number;
    first: boolean;
    partyId: number;
}
export interface OpenGateRemoveArgs {
    objId: number;
    state: number;
    characterId: number;
    first: boolean;
}
/** CField::OnCoupleMessage (decompile/5357F0.c) byte-1 sub-type. */
export interface CoupleMessageArgs {
    /** 5 = sender/message pair; 4-with-flag = solo message; 4-without-flag = generic notice. */
    variant: 'pair' | 'solo' | 'stranger';
    sender?: string;
    message?: string;
}
/** CField::OnFieldObstacleOnOff / OnFieldObstacleOnOffStatus / OnSetObjectState
 *  (decompile/535A80.c, 535B00.c, 539890.c) — all three forward to the same
 *  CMapLoadable::SetObjectState(name, state) call. */
export interface ObjectStateEntry {
    name: string;
    state: number;
}
/** CField::OnSetQuestTime (decompile/52B790.c). start/end are raw FILETIME
 *  (Windows 64-bit tick count since 1601), exposed as bigint — convert with
 *  the project's existing FILETIME-to-Date helper if one is added later. */
export interface QuestTimeEntry {
    questId: number;
    start: bigint;
    end: bigint;
}
/** CField::OnStalkResult (decompile/539910.c). */
export interface StalkResultEntry {
    objId: number;
    remove: boolean;
    name?: string;
    x?: number;
    y?: number;
}
/** CField::OnQuiz (decompile/537A90.c). Category/problem text resolution
 *  requires Quiz.img lookups not yet wired into the WZ layer — only the raw
 *  ids are exposed here. */
export interface QuizArgs {
    isQuestion: boolean;
    category: number;
    problemId: number;
}
/** CField::OnAdminResult (decompile/53BC20.c) byte-1 sub-type. Admin/GM-only
 *  diagnostic channel; decode is exact, UI wiring is intentionally generic. */
export interface AdminResultArgs {
    subType: number;
    channel?: string;
    world?: string;
    message?: string;
    mapId?: number;
    flag?: boolean;
    /** Generic numeric payload for subtypes that read a raw byte counter
     *  (0x12) or a secondary byte after the main flag (0x15's tail). */
    value?: number;
}
/** CWvsContext::OnAntiMacroResult (decompile/9FF580.c) byte-1 sub-type.
 *  subType 6 carries an anti-bot CAPTCHA image as a raw length-prefixed
 *  JPEG blob (decoded via `_CreateCanvasFromJpegPacket`, decompile/9F1550.c);
 *  decoding the JPEG into a texture is a render-layer concern, not handled
 *  here. */
export interface AntiMacroResultArgs {
    subType: number;
    reasonCode: number;
    hadCanvas?: boolean;
    jpeg?: Uint8Array;
    message?: string;
}
/** CWvsContext::OnDestroyShopResult (decompile/A01ED0.c). */
export interface DestroyShopResultArgs {
    reasonCode: number;
    message?: string;
}
/** CMacroSysMan::SetMacro / MACROSYSDATA::Decode / SINGLEMACRO::Decode
 *  (decompile/9F0C70.c, 4F98B0.c, 4F97F0.c). Server clamps to at most 5. */
export interface MacroSlot {
    name: string;
    mute: boolean;
    skills: [number, number, number];
}
/** CLogin::OnEnableSPWResult (decompile/5D2290.c). `code` selects an OG
 *  CLoginUtilDlg::Notice/Error case (0=opt notice, 6/9/0x14/0x16/0x17=error). */
export interface EnableSpwResultArgs {
    flag: boolean;
    code: number;
}
/** CLogin::OnRecommendWorldMessage (decompile/5D7280.c) entry. */
export interface RecommendWorldMsgEntry {
    worldId: number;
    message: string;
}
/** CLogin::OnExtraCharInfoResult (decompile/5D25A0.c). */
export interface ExtraCharInfoResultArgs {
    characterId: number;
    flag: number;
}
/** CLogin::OnGuestIDLoginResult (decompile/5DD1A0.c). `accountInfo` is only
 *  present when resultType is 0/12/23 AND regStatId is 0/1 — every other
 *  combination reads no further bytes (just shows a local error/notice). */
export interface GuestIdLoginResultArgs {
    resultType: number;
    regStatId: number;
    accountInfo?: {
        accountId: number;
        gender: number;
        gradeCode: number;
        countryId: number;
        nexonClubId: string;
        purchaseExp: number;
        chatBlockReason: number;
        chatUnblockDate: bigint;
        registerDate: bigint;
        numOfCharacters: number;
        guestIdRegistrationUrl: string;
    };
}
/** CLogin::OnAccountInfoResult (decompile/5DD600.c). The account-info block
 *  is only present when resultType is 0/12/23; populates `session.account`
 *  the same way CheckPasswordResult does, but with no skipPinCode/loginOpt
 *  tail — only a trailing 8-byte clientKey. */
export interface AccountInfoResultArgs {
    resultType: number;
    hasAccountInfo: boolean;
}
/** CLogin::OnSetAccountResult (decompile/5D5E80.c). On success the OG client
 *  immediately sends the PIN bootstrap packet (InHeader=9, bytes 1,1,""). */
export interface SetAccountResultArgs {
    value: number;
    success: boolean;
}
/** CLogin::OnConfirmEULAResult (decompile/5D4D00.c). */
export interface ConfirmEulaResultArgs {
    accepted: boolean;
}
/** CClientSocket::OnAuthenMessage (decompile/4ADEB0.c).
 *  The OG client shows this premium argument message only when the account
 *  context flag is set and the active stage is not CashShop; the handler just
 *  exposes the exact wire values for UI/runtime policy to decide. */
export interface AuthenMessageArgs {
    premiumArgument: number;
    messageType: number;
}
/** CClientSocket::OnCheckCrcResult (decompile/4ADF10.c). OG terminates the
 *  client when the byte is zero; this port exposes the result instead of
 *  throwing from the decode layer. */
export interface CheckCrcResultArgs {
    ok: boolean;
}
/** CLogin::OnViewAllCharResult (decompile/5DE120.c) subType byte dispatch. */
export interface ViewAllCharResultArgs {
    subType: number;
    worldId?: number;
    characters?: CharacterEntry[];
    loginOpt?: number;
    countRelatedSvrs?: number;
    countCharacters?: number;
    message?: string;
}
/** CWvsContext::OnEntrustedShopCheckResult (decompile/9FFCB0.c) subType
 *  byte dispatch. Several subTypes (9/10/11/15) are canned StringPool
 *  notices with no further wire data — `message` is left undefined for
 *  those rather than guessed text, consistent with this codebase's
 *  "(StringPool text not ported)" convention. subType 7's real action
 *  (`SendOpenShopRequest`, decompile/9FC570.c) needs a shop-title text
 *  input dialog with profanity filtering that doesn't exist in this
 *  client; subType 17's needs a secondary-password prompt that doesn't
 *  exist in-game (only at character select) — both are decode-only here. */
export interface EntrustedShopCheckResultArgs {
    subType: number;
    /** subType 8: channel-full retry message. channelLoad is `n % 100`. */
    busyChannelId?: number;
    channelLoad?: number;
    /** subType 13: shop id for the minimap "searched shop" marker. */
    searchedShopId?: number;
    /** subType 14: which of two canned chat-log messages to show. */
    flag?: boolean;
    /** subType 16: channel to offer transferring to (a YesNo confirm in OG);
     *  undefined-shaped special values 0xFD/0xFE/0xFF mean "show a canned
     *  failure notice instead" — exposed as `transferDenied`. */
    transferChannelId?: number;
    transferDenied?: boolean;
    /** subType 17: owner-confirmation fields for the open-shop-with-PIN flow
     *  (decode-only — no in-game PIN prompt exists to consume these yet). */
    ownerId?: number;
    shopSlot?: number;
    cashItemSN?: Uint8Array;
    /** subType 18: only present if the leading flag byte is set. */
    message?: string;
}
/** CField::OnFieldEffect (decompile/53B790.c) subType byte dispatch.
 *  This drives several effects that don't have a consumer in this client
 *  yet (no boss-HP-bar UI, no screen-tremble/camera-shake, no BGM-change
 *  system, no map-object-state mechanism) — decoded fully and correctly
 *  regardless, since getting the wire shape right doesn't depend on
 *  having a renderer for it yet. */
export interface FieldEffectArgs {
    subType: number;
    /** subType 0: a summon-arrival visual + sound at (x, y). */
    summonId?: number;
    x?: number;
    y?: number;
    /** subType 1: screen tremble. */
    trembleIntensity?: number;
    trembleDurationMs?: number;
    /** subType 2: CMapLoadable::SetObjectState — a field object's WZ
     *  animation state changes (e.g. a switch/door). */
    objectState?: string;
    /** subType 3: full-screen effect overlay (WZ UOL path). */
    screenEffectUol?: string;
    /** subType 4: ambient field sound (WZ UOL path). */
    soundUol?: string;
    /** subType 5: boss HP gauge (e.g. Zakum/Pink Bean multi-part bosses).
     *  `maxHp` is OG's own recomputed total for certain template id ranges
     *  — exposed as decoded, not re-derived. */
    mobTemplateId?: number;
    hp?: number;
    maxHp?: number;
    hpColor?: number;
    /** subType 6: background music change (WZ UOL path). */
    bgmUol?: string;
    /** subType 7: CField::OnFieldEffect case 7 -> CAnimationDisplayer::
     *  Effect_RewardRullet(nRewardJobIdx, nRewardPartIdx, nRewardLevIdx,
     *  screenOrigin) — live IDA decompile (Maplestory95.exe.i64 0x53b790).
     *  Despite the original field names (`rouletteX/Y/Value`), this is NOT a
     *  roulette position — these are indices selecting which job/equip-part/
     *  level-tier reward to preview, anchored to the window's own origin (not
     *  an arbitrary world/screen point). Renamed to match; not implemented
     *  yet — a different, more involved feature (an equipment-tier preview
     *  icon set) than a simple one-time WZ animation. */
    rewardJobIdx?: number;
    rewardPartIdx?: number;
    rewardLevIdx?: number;
}
/** CField::OnClock (decompile/531510.c) subType-byte dispatch — TODO_AUDIT.md
 *  Seventy-seventh pass identified this as the real "CClock" generic
 *  on-screen countdown widget, missing entirely client-side; this is the
 *  Hundred-and-ninth pass's implementation of it. The previous decode here
 *  (a single byte + a short) didn't match any of the 5 real subtypes below
 *  and was replaced outright. */
export interface ClockArgs {
    subType: number;
    /** subType 0: CWvsContext::SetEventTimer — a hidden, non-visual
     *  field-wide countdown (`seconds`, abs()'d in OG). If the encoded value
     *  is <= 0, OG fires CWvsContext::OnEventTimer immediately instead of
     *  scheduling — surfaced here as `fireNow`. Not a CClock window at all. */
    seconds?: number;
    fireNow?: boolean;
    /** subType 1: CClock::SetClock(hour, min, sec) — switches an *existing*
     *  clock window into real-time wall-clock display mode (HH:MM, blinking
     *  colon, AM/PM glyph) ticking off the system clock from this base time.
     *  OG calls this on `this->m_pClock.p` unconditionally, with no null
     *  check and no window creation in this branch — i.e. it assumes some
     *  earlier, not-yet-traced field-init path already created the window
     *  (town-square public-clock maps). No such creation trigger exists
     *  client-side yet, so this is a no-op unless a clock window is already
     *  open from subType 2/3/0x64. */
    hour?: number;
    minute?: number;
    second?: number;
    /** subType 2: generic countdown via the virtual CField::OnMakeTimerParam
     *  (overridden per field type for color/digit-image/position — base
     *  CField uses a dark background, no field-type-specific override is
     *  modeled client-side yet). `durationSec < 0` means "no timer", i.e.
     *  don't create a window at all (mirrors OG's `if (v13 >= 0)` guard). */
    durationSec?: number;
    /** subType 3: fixed-style countdown (dark bg, red-ish font), only
     *  created if no clock window is already open. `active` is OG's decoded
     *  flag byte — when false, OG still conditionally destroys an existing
     *  self-owned window (tracked via `m_bTimerEventFlag`) but creates
     *  nothing new. */
    active?: boolean;
    /** subType 0x64: CTimerboard_CakePieEvent — the dedicated timer-board
     *  widget for the Cake/Pie-throwing event (TODO_AUDIT.md Eighty-fourth
     *  pass: confirmed missing as a whole minigame). `sizeVariant` (OG's
     *  `Decode1`) picks one of two window dimensions (391x83 vs 279x88);
     *  rendered here as the same generic countdown widget as subType 2/3,
     *  not the event's own art — that minigame still has no client-side
     *  implementation to receive this. */
    sizeVariant?: number;
}
export interface KillCountInfoArgs {
    count: number;
}
export interface MessageBoxEnterFieldArgs {
    id: number;
    itemId: number;
    hope: string;
    characterName: string;
    x: number;
    y: number;
}
export interface MessageBoxLeaveFieldArgs {
    id: number;
    immediate: boolean;
}
export interface MassacreIncGaugeArgs {
    incGauge: number;
}
export interface MassacreResultArgs {
    won: boolean;
    finalGauge: number;
}
/** Represents one member within an expedition (inside a sub-party). */
export interface ExpeditionMember {
    charId: number;
    name: string;
    job: number;
    level: number;
    channel: number;
}
/** Decoded EXPEDITION struct (0x384=900 bytes raw from DecodeBuffer). */
export interface ExpeditionData {
    /** Quest/group ID this expedition belongs to. */
    nGroupID: number;
    /** Character ID of the expedition master. */
    dwMasterID: number;
    /** Sub-parties within the expedition (up to 5 sub-parties × 6 members = 30 max). */
    aSubParty: ExpeditionSubPartyData[];
}
export interface ExpeditionSubPartyData {
    members: ExpeditionMember[];
}
/** Sub-action dispatch inbound from ExpeditionResult=64. */
export type ExpeditionResultArgs = {
    subAction: 'Get' | 'Notice' | 'MasterChanged' | 'Modified';
    data: ExpeditionData;
} | {
    subAction: 'Removed';
    nPartyIndex: number;
} | {
    subAction: 'Invite';
    inviterName: string;
    nQuestID: number;
} | {
    subAction: 'ResponseInvite';
    accepted: boolean;
    sMasterName: string;
};
/** GWPartyMember-like entry for adver listings. */
export interface PartyAdverMember {
    dwCharacterID: number;
    sCharacterName: string;
    nLevel: number;
    nJob: number;
    nChannel: number;
}
/** ADVER_COMMON base fields + PARTYADVER-specific extended party data. */
export interface PartyAdverData {
    sName: string;
    nGroupID: number;
    members: PartyAdverMember[];
}
/** Expedition variant of PartyAdverData. */
export interface ExpeditionAdverData extends PartyAdverData {
    expedition: ExpeditionData;
}
export type PartyAdverResultArgs = {
    subAction: 'K';
    adver: PartyAdverData | ExpeditionAdverData;
} | {
    subAction: 'L';
    nPartyGroupID: number;
    nPartyID: number;
} | {
    subAction: 'M';
    advertList: (PartyAdverData | ExpeditionAdverData)[];
} | {
    subAction: 'O';
    bSuccess: number;
    nType: number;
    sCharacterName: string;
} | {
    subAction: 'P';
    nResult: number;
};
export interface ExpeditionApplyArgs {
    nPartyID: number;
    sApplierName: string;
    nLevel: number;
    nJob: number;
}
/** OG: CWvsContext::OnGivePopularityResult (0x9FEA60, opcode 37). */
export interface GivePopularityResultArgs {
    subResult: number;
    /** case 0: string(charName), byte(accepted), int(fame). case 5: no fame. */
    name?: string;
    accepted?: boolean;
    fame?: number;
}
/** OG: CWvsContext::OnMemoResult (0x9F9DA0, opcode 40). subAction=3 loads
 *  count×GW_Memo::Decode list; 4=notice; 5=sub-notice; 7=receive-notify. */
export interface MemoResultArgs {
    subAction: number;
    count?: number;
    memos?: {
        id: number;
        name: string;
        text: string;
        flag: number;
        timestamp: bigint;
    }[];
    msg?: string;
    flag?: number;
    name?: string;
}
/** OG: CWvsContext::OnMapTransferResult (0x9F9F90, opcode 41). */
export interface MapTransferResultArgs {
    subAction: number;
    isEx: boolean;
    mapIds?: number[];
    msg?: string;
}
/** OG: CWvsContext::OnIncubatorResult (0xA00380, opcode 72). Full decode
 *  depends on CUIItemOptionDialogBox — wire fields exposed as generic. */
export interface IncubatorResultArgs {
    itemId: number;
    plus?: number;
    statType?: number;
    str?: number;
    dex?: number;
    int?: number;
    luk?: number;
    attack?: number;
    magicAttack?: number;
    def?: number;
    acc?: number;
    avo?: number;
    speed?: number;
    jump?: number;
    upgrade?: number;
    /** OG flag fields: dialogType, nMsgType, bSendItemOption */
    dialogType?: number;
    msgType?: number;
    sendItemOption?: boolean;
}
/** OG: CWvsContext::OnShopScannerResult (0xA076C0, opcode 73). Complex
 *  CUIShopScanner dialog creation — wire decoded as generic ints + strings. */
export interface ShopScannerResultArgs {
    subType: number;
    items?: {
        id: number;
        price: number;
    }[];
    msg?: string;
}
/** OG: CWvsContext::OnBridleMobCatchFail (0x9D9A80, opcode 82). */
export interface BridleMobCatchFailArgs {
    reason: number;
    itemId: number;
    mobId?: number;
}
/** OG: CWvsContext::OnImitatedNPCResult (0x9CFB30, opcode 83). Decodes
 *  one short then returns — minimal payload. */
export interface ImitatedNPCResultArgs {
    templateOrResult: number;
}
/** OG: CWvsContext::OnSetAvatarMegaphone (0xA017E0, opcode 115). Creates
 *  CAvatarMegaphone UI window from the decoded data. */
export interface SetAvatarMegaphoneArgs {
    charId: number;
    name: string;
    /** Up to 4 message lines (index 0-3, always present). */
    messages: [string, string, string, string];
    whisperBg: number;
    whisper: boolean;
    avatarLook: AvatarLook;
    /** timeGetTime() of most recent update. */
    lastUpdate: number;
}
/** OG: CWvsContext::OnCancelNameChangeResult (0xA01B10, opcode 117). */
export interface CancelNameChangeResultArgs {
    result: number;
    msg?: string;
}
/** OG: CWvsContext::OnCancelTransferWorldResult (0xA01CF0, opcode 118). */
export interface CancelTransferWorldResultArgs {
    result: number;
    msg?: string;
}
/** OG: CWvsContext::OnFakeGMNotice (0x9FB440, opcode 120). Creates a
 *  CUtilDlgEx modal dialog with canned "hacking" accusation text. */
export interface FakeGMNoticeArgs {
    subType: number;
    gmName: string;
    reason: string;
    dialogText: string;
}
/** OG: CWvsContext::OnNewYearCardRes (0xA02730, opcode 122). Complex
 *  GW_NewYearCardRecord::Decode sub-action dispatch. */
export interface NewYearCardResArgs {
    subAction: number;
    /** subAction 2: card list load. */
    cards?: {
        id?: number;
        sender?: string;
        text?: string;
        date?: bigint;
    }[];
    /** subAction 4: send result. */
    sendResultCode?: number;
    /** subAction 6: received card. */
    senderName?: string;
    cardText?: string;
    sendDate?: bigint;
}
/** OG: CWvsContext::OnRandomMorphRes (0x9D0040, opcode 123). */
export interface RandomMorphResArgs {
    result: number;
    targetName?: string;
}
/** OG: CWvsContext::OnCakePieEventResult (0x9E5360, opcode 129). Complex
 *  CStageSystem / CField_CakePie interaction. */
export interface CakePieEventResultArgs {
    subAction: number;
    /** Fields depend on subAction — CStageSystem not ported. */
    value?: number;
    msg?: string;
}
/** OG: CWvsContext::OnStageChange (0x9DB630, opcode 135). */
export interface StageChangeArgs {
    stageName: string;
    stagePeriod: number;
}
/** OG: CWvsContext::OnDragonBallBox (0x9E5360, opcode 136). */
export interface DragonBallBoxArgs {
    remainTime: number;
    showUI: boolean;
    close: boolean;
    ableToSummon: boolean;
    orbCount?: number;
}
export interface UserChatHistoryArgs {
    charId: number;
    text: string;
}
export interface UserADBoardArgs {
    charId: number;
    message: string;
}
export interface SetConsumeItemEffectArgs {
    charId: number;
    itemId: number;
}
export interface ShowItemUpgradeEffectArgs {
    charId: number;
    result: number;
    itemId?: number;
}
export interface ShowItemHyperUpgradeEffectArgs {
    charId: number;
    result: number;
    itemId?: number;
}
export interface ShowItemOptionUpgradeEffectArgs {
    charId: number;
    result: number;
    itemId?: number;
}
export interface ShowItemReleaseEffectArgs {
    charId: number;
    flag: number;
}
export interface ShowItemUnreleaseEffectArgs {
    charId: number;
    flag: number;
}
export interface UserHitByUserArgs {
    charId: number;
    damage: number;
}
export interface UserTeslaTriangleArgs {
    charId: number;
    state: number;
}
export interface UserFollowCharacterArgs {
    charId: number;
    targetId: number;
}
export interface UserShowPQRewardArgs {
    charId: number;
    rewardId: number;
}
export interface UserSetPhaseArgs {
    charId: number;
    phase: number;
}
export interface ShowRecoverUpgradeCountEffectArgs {
    charId: number;
    count: number;
}
export interface UserMovingShootAttackPrepareArgs {
    charId: number;
    level: number;
    isCharging: boolean;
    skillId: number;
    facingLeft: boolean;
    nAction: number;
}
export interface UserHitArgs {
    charId: number;
    attackIdx: number;
    damage: number;
}
export interface UserSetActiveEffectItemArgs {
    charId: number;
    itemId: number;
}
export interface UserShowUpgradeTombEffectArgs {
    charId: number;
    value: number;
    posX: number;
    posY: number;
}
export interface TempStatBuff {
    bit: number;
    value: number;
    skillId: number;
    seconds: number;
}
export interface UserSetTemporaryStatArgs {
    charId: number;
    maskLo: bigint;
    maskHi: bigint;
    buffs: TempStatBuff[];
    defenseAtt: number;
    defenseState: number;
    diceInfo: number[];
    swallowBuffTime: number;
    blessingArmorIncPAD: number;
}
export interface UserResetTemporaryStatArgs {
    charId: number;
    maskLo: bigint;
    maskHi: bigint;
}
export interface UserReceiveHPArgs {
    charId: number;
    curHP: number;
    maxHP: number;
}
export interface UserGuildNameChangedArgs {
    charId: number;
    guildName: string;
}
export interface UserGuildMarkChangedArgs {
    charId: number;
    markBg: number;
    markBgColor: number;
    mark: number;
    markColor: number;
}
export interface UserThrowGrenadeArgs {
    charId: number;
    posX: number;
    posY: number;
    tKeyDown: number;
    skillId: number;
    unk: number;
}
export interface PetActivatedArgs {
    charId: number;
    petIdx: number;
    hasPet: boolean;
    forceReplace?: boolean;
    templateId?: number;
    name?: string;
    lockerSN?: bigint;
    x?: number;
    y?: number;
    moveAction?: number;
    footholdId?: number;
    removeReason?: number;
}
export interface PetEvolArgs {
    charId: number;
    clearFirst: boolean;
    petIdx: number;
    templateId: number;
    name: string;
    lockerSN: bigint;
    x: number;
    y: number;
    moveAction: number;
    footholdId: number;
}
export interface PetMoveArgs {
    charId: number;
    petIdx: number;
    movePath?: import('../packet/MovePathDecoder.js').DecodedMovePath;
}
export interface PetActionArgs {
    charId: number;
    petIdx: number;
    type: number;
    actionNo: number;
    chat: string;
    flag: number;
}
export interface PetNameChangeArgs {
    charId: number;
    petIdx: number;
    newName: string;
    showNameTag: boolean;
}
export interface PetLoadExceptionListArgs {
    charId: number;
    petIdx: number;
    lockerSN: bigint;
    itemIds: number[];
}
export interface PetActionCommandArgs {
    charId: number;
    petIdx: number;
    nType: number;
    interactionIdx?: number;
    successFlag: number;
    flag: number;
}
export interface DragonMoveArgs {
    charId: number;
    movePath?: import('../packet/MovePathDecoder.js').DecodedMovePath;
}
export interface DragonAfterMoveArgs {
    charId: number;
    movePath?: import('../packet/MovePathDecoder.js').DecodedMovePath;
}
export interface DragonActionArgs {
    charId: number;
    action: number;
    option: number;
}
export interface MobStatSetArgs {
    mobId: number;
    statMask: bigint;
    statMaskHigh: bigint;
    stats: Uint8Array;
}
export interface MobStatResetArgs {
    mobId: number;
    statMask: bigint;
    statMaskHigh: bigint;
}
/** OG: CMob::OnSuspendReset (decompile/64ACB0.c) reads Decode1 for isSuspended. TODO_AUDIT.md Hundred-and-sixty-ninth pass. */
export interface MobSuspendResetArgs {
    mobId: number;
    isSuspended: boolean;
}
/** OG: CMob::OnAffected (decompile/644400.c) reads Decode4(skillId) + Decode2(duration). TODO_AUDIT.md Hundred-and-sixty-ninth pass. */
export interface MobAffectedArgs {
    mobId: number;
    skillId: number;
    duration: number;
}
export interface MobCatchEffectArgs {
    mobId: number;
    catchSkillId: number;
    catchItemId: number;
}
export interface MobEffectByItemArgs {
    mobId: number;
    itemId: number;
}
export interface MobIncChargeCountArgs {
    mobId: number;
    chargeCount: number;
    attackReady: boolean;
}
export interface MobEscortFullPathArgs {
    mobId: number;
    state: number;
    stopDuration: number;
    movePath?: unknown;
}
export interface MobEscortStopPermArgs {
    mobId: number;
}
export interface MobEscortStopSayArgs {
    mobId: number;
    stopDuration: number;
}
export interface MobEscortReturnBeforeArgs {
    mobId: number;
    state: number;
    stopDuration: number;
}
export interface MobNextAttackArgs {
    mobId: number;
}
export interface MobAttackedByMobArgs {
    mobId: number;
    attackerMobId: number;
}
/** OG: CNpcPool::OnNpcTemplatePacket (0x67d5b0, opcode 317). */
export interface NpcTemplatePacketArgs {
    npcId: number;
    bMove: boolean;
}
//# sourceMappingURL=PacketArgs.d.ts.map