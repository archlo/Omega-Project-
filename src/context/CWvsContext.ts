// OG: CWvsContext (size=16984, singleton) — central game state manager.
// In the TS port, GameStage already handles most of the "On*" packet dispatch
// and "Send*" encoding. This class consolidates the **persistent state** that
// the OG stores as member fields: character data, party/guild/alliance/friend
// lists, quest timers, passive skill buffing, item messages, world map quest
// demand, and the various cooldown/timing fields.
//
// GameStage delegates state reads to this class rather than scattering fields
// across its own ~6400-line body.

import { CharacterStat } from '../domain/CharacterStat.js';
import type { CharacterData } from '../domain/CharacterData.js';

// ── Sub-types from CWvsContext struct ──

export interface FriendEntry {
  charId: number;
  name: string;
  group: string;
  flag: number;
  channel: number;
  online: boolean;
}

export interface PartyMemberData {
  charId: number;
  name: string;
  jobId: number;
  level: number;
  channel: number;
 HP: number;
  maxHP: number;
  intPartyLeader: boolean;
}

export interface GuildMemberData {
  charId: number;
  name: string;
  grade: number;
  level: number;
  job: number;
  online: boolean;
}

export interface AllianceMemberData {
  charId: number;
  name: string;
  guildId: number;
  guildName: string;
  allianceGrade: number;
  online: boolean;
}

export interface TownPortal {
  fieldId: number;
  x: number;
  y: number;
  portalId: number;
  characterId: number;
  partyId: number;
  startTime: bigint;
  timeout: number;
}

export interface QuestTimerEntry {
  questId: number;
  fieldId: number;
  remainTimeMs: number;
  startTime: number;
  timerType: number;
}

export interface ItemMsgEntry {
  itemId: number;
  nextCheckTime: number;
  questStates: { questId: number; state: number; fieldIds: number[]; msgs: string[] }[];
}

export interface WorldMapQuestDemandMob {
  questId: number;
  mobId: number;
}

export interface WorldMapQuestDemandItem {
  questId: number;
  itemId: number;
  count: number;
  currentCount: number;
}

export interface PassiveSkillBuffing {
  skillId: number;
  value: number;
}

export interface MassacreData {
  hit: number;
  miss: number;
  cool: number;
  skill: number;
}

export interface BasicStatData {
  str: number; dex: number; int: number; luk: number;
  maxHp: number; maxMp: number;
  pad: number; mad: number; pdd: number; mdd: number;
  acc: number; eva: number;
  speed: number; jump: number;
}

export interface ForcedStatData {
  str: number; dex: number; int: number; luk: number;
  pad: number; mad: number; pdd: number; mdd: number;
  acc: number; eva: number;
  speed: number; jump: number;
  speedMax: number;
}

// ── CWvsContext state ──

export class CWvsContext {
  // ── Account ──
  accountId = 0;
  gender = 0;
  gradeCode = 0;
  subGradeCode = 0;
  emailAccount = '';
  nexonClubId = '';
  countryId = 0;
  purchaseExp = 0;
  worldId = 0;
  channelId = 0;
  premium = false;
  premiumArgument = 0;
  chatBlockReason = 0;
  testerAccount = false;
  adminLevel = 0;
  isGuestAccount = false;
  managerAccount = false;

  // ── Character ──
  characterId = 0;
  characterData: CharacterData | null = null;
  characterName = '';
  characterLevel = 0;
  characterJob = 0;
  basicStat: BasicStatData = { str: 0, dex: 0, int: 0, luk: 0, maxHp: 0, maxMp: 0, pad: 0, mad: 0, pdd: 0, mdd: 0, acc: 0, eva: 0, speed: 0, jump: 0 };
  forcedStat: ForcedStatData = { str: 0, dex: 0, int: 0, luk: 0, pad: 0, mad: 0, pdd: 0, mdd: 0, acc: 0, eva: 0, speed: 0, jump: 0, speedMax: 0 };
  curFieldId = 0;

  // ── Exclusive request throttle ──
  exclRequestSent = false;
  tExclRequestSent = 0;
  tExclRequestSentQ: number[] = [0, 0];

  // ── Party ──
  partyId = 0;
  partyMembers: PartyMemberData[] = [];
  partyBossId = 0;

  // ── Friend ──
  friends: FriendEntry[] = [];
  friendGroups: string[] = [];

  // ── Guild ──
  guildName = '';
  guildGradeNames: string[] = [];
  guildMembers: GuildMemberData[] = [];
  guildSkillLevels: Map<number, number> = new Map();

  // ── Alliance ──
  allianceName = '';
  allianceGradeNames: string[] = [];
  allianceMembers: AllianceMemberData[] = [];
  allianceMemberNum = 0;
  allianceNotice = '';

  // ── Marriage ──
  marriedPartnerId = 0;
  marriedPartnerCurFieldId = 0;

  // ── Town Portal ──
  townPortal: TownPortal = { fieldId: 0, x: 0, y: 0, portalId: 0, characterId: 0, partyId: 0, startTime: 0n, timeout: 0 };

  // ── Active effect item ──
  activeEffectItemId = 0;

  // ── Quest ──
  questTimers: Map<number, QuestTimerEntry> = new Map();
  autoStartQuestPreStart: Map<number, number> = new Map();
  autoAcceptQuestRequest: Map<number, number> = new Map();
  autoCompleteQuestInProgress: Map<number, number> = new Map();
  newPreStartQuestIds: number[] = [];
  newAutoCompletionAlertQuest = false;
  autoCompletionAlertQuest: number[] = [];
  questMatesName: Map<number, string> = new Map();
  worldMapQuestMobList: number[] = [];
  worldMapQuestDemandItem: WorldMapQuestDemandItem[] = [];
  worldMapQuestId = 0;
  showOnlyWorthyQuests = false;

  // ── Item Messages ──
  itemMsgs: ItemMsgEntry[] = [];
  tNextCheckItemMsg = 0;

  // ── Passive skill buffing ──
  passiveSkillBuffing: number[] = new Array(22).fill(0);

  // ── Skill cooldowns ──
  skillCooltimeOver: Map<number, number> = new Map();

  // ── Dark Force / Dragon Fury ──
  darkForceDamage = 0;
  darkForcePddr = 0;
  dragonFury = 0;

  // ── Taming mob ──
  tamingMobLevel = 0;
  tamingMobExp = 0;
  tamingMobFatigue = 0;

  // ── Timings ──
  tRestForHPDuration = 0;
  tRestForMPDuration = 0;
  tRestForMPDurationOnPortableChair = 0;
  tRestForHPDurationOnPortableChair = 0;
  tRestForHPDurationItemOption = 0;
  tRestForMPDurationItemOption = 0;
  tReviveDialog = 0;
  tLastGivePopularity = 0;
  tLastEmotionChange = 0;
  tLastEffectItemChange = 0;
  tLastStatResetRequest = 0;
  tLastFollowCharacterRequest = 0;
  tLastSueCharacter = 0;

  // ── Energy ──
  energy = 0;

  // ── Screen ──
  screenWidth = 1024;
  screenHeight = 768;
  adjustCenterY = 0;
  isLargeScreen = false;

  // ── UI state ──
  showUI = true;
  miniMapOnOff = false;
  bShowMobInfoName = false;
  bShowMobInfoHP = false;
  bIsOperatorBoardState = false;
  webOpBoardIndex = 0;
  stackForTab: unknown[] = [];

  // ── Flags ──
  firstUserLoad = false;
  avatarMegaphone = false;
  bChaseEnable = false;
  bPetHelpPopUpShown = false;
  directionMode = false;
  standAloneMode = false;
  personalShopOpen = false;
  adBoard = false;
  adBoardText = '';
  bPredictQuit = false;
  bRecentPickUpEntrance = false;
  bKillMobFromEnterField = false;
  adSpaceOn = false;
  bTvVisionRegion = false;
  bCurTvView = false;
  bWasMute = false;
  bWasRadioUICleared = false;
  bShowWorthlessQuestFromConfig = false;
  bNewPreStartQuest = false;
  levelUpAutoQuestRequestSent = false;
  bBuyEquipExt = false;
  bCommodityLoadedCompletely = false;
  bShowOnlyWorthyQuests = false;

  // ── Claim ──
  claimSvrOpenTime = 0;
  claimSvrCloseTime = 0;
  claimSvrConnected = false;

  // ── Commodity ──
  commoditySN = 0;
  cashPackageName = '';

  // ── Family ──
  familyInfo = {
    inFamily: false,
    reputation: 0,
    todayReputation: 0,
    childCount: 0,
    privilegeUse: 0,
    precept: '',
    familyName: '',
  };

  // ── Massacre ──
  massacre: MassacreData = { hit: 0, miss: 0, cool: 0, skill: 0 };

  // ── Misc ──
  weekEventMessage = '';
  weekEventMessagePrinted = false;
  potionDiscountRate = 0;
  lastMobBonusEventPercentage = 0;
  channelNames: string[] = [];
  adultChannels: number[] = [];
  battleTeamName = '';
  nActiveEffectItemID = 0;
  nDoubleJumpChatCtrl = 0;
  nLastestGetItemID = 0;
  nLastestGetItemPos = 0;
  bambooUsed = false;
  sessionValueKey = '';
  sessionValue = '';
  nLoginBaseStep = 0;
  nNumOfCharacter = 0;
  nSlotCount = 0;
  thisAccountJustCreatedCharacter = false;
  isFakeGMNotice = false;
  nEmployeeItemPos = 0;
  nEmployeeItemID = 0;
  nCookieHousePoint = 0;
  tNextNoticePlaytime = 0;
  nPlaytimeHour = 0;
  nPartySearchState = 0;
  keepPartySearch = false;
  nPreStartQuestCount = 0;
  tRemainAntiMacroQuestion = 0;
  tRemainInitialQuiz = 0;
  nQuestDeliveryItemPos = 0;
  usDeliveryQuestID = 0;
  unregisteredCharacterName = '';
  nCashShopInitialItem = 0;
  nTeamForPartyRaid = 0;
  nPartyRaidStageMine = 0;
  nPartyRaidStageOther = 0;
  nPartyRaidPoint = 0;

  // ── Follow ──
  oldDriverId = 0;
  followRequesterId = 0;

  // ── Item messages from config ──
  giveTo = '';
  mapTransferTargetUserName = '';

  // ── Logout gift ──
  logoutGiftCommoditySN: number[] = [0, 0, 0];

  // ── Meso ──
  money = 0;

  // ── Getters ──

  getCharacterData(): CharacterData | null { return this.characterData; }
  getCharacterId(): number { return this.characterId; }
  getCharacterName(): string { return this.characterName; }
  getCharacterLevel(): number { return this.characterLevel; }
  getCurFieldID(): number { return this.curFieldId; }
  getBasicStat(): BasicStatData { return this.basicStat; }
  getAdminLevel(): number { return this.adminLevel; }
  getCurrentPrivilege(): number { return this.gradeCode; }
  getDarkForceDamage(): number { return this.darkForceDamage; }
  getDragonFuryDamage(): number { return this.dragonFury; }
  getActionRndMan(): unknown { return null; }
  getCalcDamage(): unknown { return null; }
  getPartyID(): number { return this.partyId; }
  getPartyBossID(): number { return this.partyBossId; }
  getPartyMemberNumber(): number { return this.partyMembers.length; }
  getGuildName(): string { return this.guildName; }
  getGuildMemberNum(): number { return this.guildMembers.length; }
  getAllianceName(): string { return this.allianceName; }
  getAllianceMemberNum(): number { return this.allianceMembers.length; }
  getAllianceNotice(): string { return this.allianceNotice; }
  getGuildNotice(): string { return ''; }
  getActiveEffectItemId(): number { return this.activeEffectItemId; }
  getADBoard(): string { return this.adBoardText; }
  getDiceBuffType(): number { return 0; }
  getSwallowBuffType(): number { return 0; }
  getSkillLevelUpState(skillId: number): number { return 0; }
  getTopStackForTab(tab: number): number { return 0; }
  getRealEquipSlot(pos: number): number { return pos; }
  getWebBoardAuthKey(): string { return ''; }
  getClassCompetitionAuthKey(): string { return ''; }
  getGMBoardURL(): string { return ''; }
  getCashPackageName(sn: number): string { return ''; }
  getChannelName(channelId: number): string { return this.channelNames[channelId] ?? ''; }
  getPrivilegeItem(index: number): unknown { return null; }
  getPrivilegeName(index: number): string { return ''; }
  getPartySearchRemoconLayer(): unknown { return null; }
  getQuestBonusEXP(questId: number): number { return 0; }
  getQuestItemID(questId: number, index: number): number { return 0; }
  getQuestMateName(questId: number): string { return this.questMatesName.get(questId) ?? ''; }
  getQuestMobCount(questId: number): number { return 0; }
  getQuestMobName(questId: number): string { return ''; }
  getQuestRecordValue(questId: number): string { return ''; }
  getQuestState(questId: number): number { return 0; }
  getQuestTimer(questId: number): QuestTimerTimer | null { return this.questTimers.get(questId) ?? null; }
  getItemCount(itemId: number): number { return 0; }
  getCommodityByIndex(index: number): unknown { return null; }
  getCommodityBySN(sn: number): unknown { return null; }
  getPasssiveSkillBuffing(index: number): number { return this.passiveSkillBuffing[index] ?? 0; }
  getGuildSkillLevel(skillId: number): number { return this.guildSkillLevels.get(skillId) ?? 0; }
  getGuildSkillArray(): number[] { return Array.from(this.guildSkillLevels.keys()); }
  getGuildGradeName(grade: number): string { return this.guildGradeNames[grade] ?? ''; }
  getAllianceGradeName(grade: number): string { return this.allianceGradeNames[grade] ?? ''; }
  getAllianceMaxGradeNum(): number { return this.allianceGradeNames.length; }
  getGuildMaxGradeNum(): number { return this.guildGradeNames.length; }
  getGuildMemberGrade(charId: number): number { return this.guildMembers.find(m => m.charId === charId)?.grade ?? 0; }
  getGuildMemberIDByName(name: string): number { return this.guildMembers.find(m => m.name === name)?.charId ?? 0; }
  getGuildMemberNameByID(charId: number): string { return this.guildMembers.find(m => m.charId === charId)?.name ?? ''; }
  getGuildMemberDataByIdx(index: number): GuildMemberData | null { return this.guildMembers[index] ?? null; }
  getBattleTeamMarkCanvas(team: number): unknown { return null; }
  getAutoQuestIconAppearUOL(): string { return ''; }
  getAutoQuestIconUOL(): string { return ''; }
  getMyTownPortal(tp: TownPortal): TownPortal { Object.assign(tp, this.townPortal); return tp; }
  getPartyTownPortal(partyId: number, tp: TownPortal): TownPortal { Object.assign(tp, this.townPortal); return tp; }
  getPartyMemberByName(name: string): PartyMemberData | null { return this.partyMembers.find(m => m.name === name) ?? null; }
  getPartyMemberData(index: number): PartyMemberData | null { return this.partyMembers[index] ?? null; }

  // Friend getters
  getFriendByID(charId: number): FriendEntry | null { return this.friends.find(f => f.charId === charId) ?? null; }
  getFriendByName(name: string): FriendEntry | null { return this.friends.find(f => f.name === name) ?? null; }
  getFriendGroups(groups: string[]): string[] { groups.push(...this.friendGroups); return groups; }
  getOnlineFriendID(out: number[]): number[] { out.push(...this.friends.filter(f => f.online).map(f => f.charId)); return out; }
  getOnlineFriendIDByGroup(group: string, out: number[]): number[] { out.push(...this.friends.filter(f => f.online && f.group === group).map(f => f.charId)); return out; }
  getOnlinePartyMemberID(out: number[]): number[] { out.push(...this.partyMembers.map(m => m.charId)); return out; }
  getOnlineGuildMemberID(out: number[]): number[] { out.push(...this.guildMembers.filter(m => m.online).map(m => m.charId)); return out; }
  getOnlineAllianceMemberID(out: number[]): number[] { out.push(...this.allianceMembers.filter(m => m.online).map(m => m.charId)); return out; }
  getOnlineExpeditionMemberID(out: number[]): number[] { return out; }

  // ── Boolean checks ──

  isConnected(): boolean { return this.characterId !== 0; }
  isNewAccount(): boolean { return this.nNumOfCharacter === 0; }
  isAdminAccount(): boolean { return this.adminLevel > 0; }
  isUserGM(): boolean { return this.adminLevel > 0; }
  isSubGMAccount(): boolean { return this.adminLevel > 0; }
  isTesterAccount(): boolean { return this.testerAccount; }
  isTradeBlockedUser(): boolean { return false; }
  isUnderCover(): boolean { return false; }
  isEquipped(itemId: number): boolean { return false; }
  isExist(itemId: number): boolean { return false; }
  isPartyMemberID(charId: number): boolean { return this.partyMembers.some(m => m.charId === charId); }
  isGuildMemberExist(charId: number): boolean { return this.guildMembers.some(m => m.charId === charId); }
  isAllianceMemberExist(charId: number): boolean { return this.allianceMembers.some(m => m.charId === charId); }
  isBlockedFriend(charId: number): boolean { return false; }
  isExistSkillCooltimeOver(skillId: number): boolean { return this.skillCooltimeOver.has(skillId); }
  isFadeWndExist(): boolean { return false; }
  isTopFadeWnd(fadeId: number): boolean { return false; }
  isNearStartQuest(questId: number): boolean { return false; }
  isWorthlessQuest(questId: number): boolean { return false; }
  isInWorldMapQuestDemand(questId: number): boolean { return this.worldMapQuestDemandItem.some(d => d.questId === questId); }
  cannotDropItem(): boolean { return false; }
  cannotUseCommunityFunction(): boolean { return false; }
  canUseCommonCommand(): boolean { return true; }
  isAbleToConsume(itemId: number): boolean { return false; }
  isValidCommodity(sn: number): boolean { return false; }
  isPartyBoss(): boolean { return this.partyBossId === this.characterId; }
  amIGuildMaster(): boolean { return false; }
  amIAllianceMaster(): boolean { return false; }
  amIAllianceSubMaster(): boolean { return false; }

  // ── Setters / mutators ──

  setCharacterData(data: CharacterData): void {
    this.characterData = data;
    if (data.characterStat) {
      this.characterId = data.characterStat.characterId;
      this.characterName = data.characterStat.name;
      this.characterLevel = data.characterStat.level;
      this.characterJob = data.characterStat.job;
    }
  }

  setCurFieldID(fieldId: number): void { this.curFieldId = fieldId; }
  setExclRequestSent(sent: boolean): void { this.exclRequestSent = sent; }
  setADBoard(text: string): void { this.adBoardText = text; }
  setScreenResolution(w: number, h: number): void { this.screenWidth = w; this.screenHeight = h; }
  setShowWorthlessQuestFromConfig(show: boolean): void { this.showOnlyWorthyQuests = show; }
  setPresentInfo(...args: unknown[]): void { /* cash shop present */ }
  setSaleInfo(...args: unknown[]): void { /* cash shop sale */ }
  setAccountInfo(...args: unknown[]): void { /* account info */ }
  setWorldInfo(...args: unknown[]): void { /* world info */ }
  setActionRndSeed(seed: number): void { /* RNG seed */ }
  setPasssiveSkillBuffing(index: number, value: number): void { this.passiveSkillBuffing[index] = value; }
  setSkillCooltimeOver(skillId: number, time: number): void { this.skillCooltimeOver.set(skillId, time); }
  removeSkillCooltimeOver(skillId: number): void { this.skillCooltimeOver.delete(skillId); }
  setImpactNextBySessionValue(key: string, value: string): void { this.sessionValueKey = key; this.sessionValue = value; }
  setEventTimer(...args: unknown[]): void { /* event timer */ }
  setUnregisterCharacterName(name: string): void { this.unregisteredCharacterName = name; }
  setQuestMateName(questId: number, name: string): void { this.questMatesName.set(questId, name); }
  setNewFadeWnd(...args: unknown[]): void { /* fade wnd */ }
  setTopFadeWnd(fadeId: number): void { /* top fade */ }

  // ── Quest management ──

  addQuestTimer(questId: number, fieldId: number, timerType: number): void {
    this.questTimers.set(questId, { questId, fieldId, remainTimeMs: 0, startTime: Date.now(), timerType });
  }

  clearQuestTimer(): void { this.questTimers.clear(); }
  removeQuestTimer(questId: number): void { this.questTimers.delete(questId); }
  resetQuestTimer(): void { this.questTimers.clear(); }

  checkNewQuestAvailable(questId: number): boolean { return false; }
  startQuest(questId: number): void { /* quest start */ }
  resignQuest(questId: number): void { /* quest resign */ }

  resetAutoQuest(): void {
    this.autoStartQuestPreStart.clear();
    this.autoAcceptQuestRequest.clear();
    this.autoCompleteQuestInProgress.clear();
  }

  checkAutoCompletionAlertQuest(): void { /* check alerts */ }
  tryRegisterAutoCompletionAlertQuest(questId: number): boolean { return false; }
  tryRegisterAutoStartQuest(questId: number): boolean { return false; }
  removeAtAutoQuestList(index: number): void { /* remove from list */ }

  checkNormalAutoStartQuest(questId: number): boolean { return false; }
  checkEquipOnAutoStartQuest(itemId: number, tab: number): boolean { return false; }
  checkInventoryOnAutoStartQuest(itemId: number, tab: number): boolean { return false; }
  checkFieldOnAutoStartQuest(fieldId: number): boolean { return false; }
  updateAutoStartQuestPreStartList(): void { /* update */ }
  updateAutoQuestAlertIcon(): void { /* update */ }
  checkQuestCompleteByItem(questId: number, itemId: number): boolean { return false; }
  checkQuestCompleteByMeso(questId: number): boolean { return false; }
  updateItemMsg(): void { /* update item messages */ }
  loadItemMsg(): void { /* load item messages */ }
  insertItemMsg(...args: unknown[]): void { /* insert item message */ }
  removeItemMsg(...args: unknown[]): void { /* remove item message */ }
  restoreItemMsg(...args: unknown[]): void { /* restore item message */ }

  // ── World Map Quest Demand ──

  addWorldMapQuestDemandMob(questId: number, mobId: number): void {
    this.worldMapQuestMobList.push(mobId);
  }

  addWorldMapQuestDemandItem(questId: number, itemId: number): void {
    // Decode from WZ — stub
  }

  resetWorldMapQuestDemand(): void {
    this.worldMapQuestMobList = [];
    this.worldMapQuestDemandItem = [];
  }

  // ── Friend management ──

  loadFriend(): void { /* load friend list */ }
  checkReqFriend(): boolean { return this.friends.length > 0; }
  changeBlockOption(charId: number, type: number, block: number): void { /* block option */ }

  // ── Item operations ──

  checkEquippedSetItem(): void { /* check set items */ }
  checkTemporaryStatDuration(): void { /* check buff durations */ }
  checkDarkForce(level: number): boolean { return false; }
  checkDragonFury(level: number): boolean { return false; }

  // ── UI operations ──

  clearFieldUI(): void { /* clear field UI */ }
  clearFadeWnd(): void { /* clear fade windows */ }
  deleteFadeWnd(...args: unknown[]): void { /* delete fade window */ }
  closeBook(): void { /* close book */ }
  closePartySearchRemocon(): void { /* close party search */ }
  closeShopScanner(): void { /* close shop scanner */ }
  openBook(...args: unknown[]): void { /* open book */ }
  openRaise(...args: unknown[]): void { /* open raise */ }
  tryCloseUI(): boolean { return false; }
  tryRecovery(): boolean { return false; }

  // ── UI state ──

  showUIEnabled(): void { this.showUI = true; }
  showPremiumArgument(): void { /* premium */ }
  showAntiMacroNotice(...args: unknown[]): void { /* anti macro */ }
  showGuildInfo(...args: unknown[]): void { /* guild info */ }
  showPartyInfo(...args: unknown[]): void { /* party info */ }
  showNewYearCard(...args: unknown[]): void { /* new year card */ }
  showQuestInfoDetail(...args: unknown[]): void { /* quest detail */ }

  // ── Party search ──

  holdPartyMemberSearch(): void { /* hold */ }
  showPartySearchRemoconHolding(): void { /* holding */ }
  showPartySearchRemoconLayer(): void { /* layer */ }
  showPartySearchRemoconSearching(): void { /* searching */ }
  startPartyMemberSearch(): void { /* start */ }
  stopPartySearch(): void { /* stop */ }

  // ── Misc ──

  askWhetherUsePamsSong(): void { /* pam's song */ }
  channelShift(): void { /* channel shift */ }
  checkOpBoardHasNew(): boolean { return false; }
  findUser(charId: number): unknown { return null; }
  issueConnect(...args: unknown[]): void { /* connect */ }
  loadAreaCode(): void { /* area code */ }
  loadCommodity(): void { /* commodity */ }
  loadPackageOriginalSN(): void { /* package SN */ }
  makeOriginalSN(...args: unknown[]): void { /* original SN */ }
  sortCommodity(): void { /* sort commodity */ }
  releaseCommodityRes(): void { /* release */ }
  releaseRefs(): void { /* release refs */ }
  loadPartySearchRemoconLayer(): void { /* load party search */ }
  monsterCarnivalDlgKeyHook(...args: unknown[]): void { /* key hook */ }
  processBasicUIKey(keyCode: number): boolean { return false; }
  useFuncKeyMapped(keyCode: number): boolean { return false; }
  saveAntiMacroScreenShot(...args: unknown[]): void { /* screenshot */ }
  returnToTitle(): void { /* return to title */ }
  runMapTransferItem(...args: unknown[]): void { /* map transfer */ }
  runShopScanner(...args: unknown[]): void { /* shop scanner */ }
  validateAdditionalItemEffect(...args: unknown[]): void { /* validate */ }
  validateStat(): void { /* validate stats */ }
  useBoxGachaponItem(...args: unknown[]): void { /* gachapon */ }
  update(): void { /* main update tick — called every frame */ }

  // ── Chat ──

  addChatMorphedMsg(): void { /* morphed chat */ }

  // ── Alliance/Guild ──

  updateAllianceMemberInfo(): void { /* update */ }
  getOnlineFriendIDs(): number[] { return this.friends.filter(f => f.online).map(f => f.charId); }
}

// QuestTimer type alias for getQuestTimer return
type QuestTimerTimer = QuestTimerEntry;

// Singleton instance — mirrors OG's TSingleton<CWvsContext>
let _instance: CWvsContext | null = null;
export function getCWvsContext(): CWvsContext {
  if (!_instance) _instance = new CWvsContext();
  return _instance;
}
