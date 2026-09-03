// OG: CWvsContext (size=16984, singleton) — central game state manager.
// In the TS port, GameStage already handles most of the "On*" packet dispatch
// and "Send*" encoding. This class consolidates the **persistent state** that
// the OG stores as member fields: character data, party/guild/alliance/friend
// lists, quest timers, passive skill buffing, item messages, world map quest
// demand, and the various cooldown/timing fields.
//
// GameStage delegates state reads to this class rather than scattering fields
// across its own ~6400-line body.
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
    characterData = null;
    characterName = '';
    characterLevel = 0;
    characterJob = 0;
    basicStat = { str: 0, dex: 0, int: 0, luk: 0, maxHp: 0, maxMp: 0, pad: 0, mad: 0, pdd: 0, mdd: 0, acc: 0, eva: 0, speed: 0, jump: 0 };
    forcedStat = { str: 0, dex: 0, int: 0, luk: 0, pad: 0, mad: 0, pdd: 0, mdd: 0, acc: 0, eva: 0, speed: 0, jump: 0, speedMax: 0 };
    curFieldId = 0;
    // ── Exclusive request throttle ──
    exclRequestSent = false;
    tExclRequestSent = 0;
    tExclRequestSentQ = [0, 0];
    // ── Party ──
    partyId = 0;
    partyMembers = [];
    partyBossId = 0;
    // ── Friend ──
    friends = [];
    friendGroups = [];
    // ── Guild ──
    guildName = '';
    guildGradeNames = [];
    guildMembers = [];
    guildSkillLevels = new Map();
    // ── Alliance ──
    allianceName = '';
    allianceGradeNames = [];
    allianceMembers = [];
    allianceMemberNum = 0;
    allianceNotice = '';
    // ── Marriage ──
    marriedPartnerId = 0;
    marriedPartnerCurFieldId = 0;
    // ── Town Portal ──
    townPortal = { fieldId: 0, x: 0, y: 0, portalId: 0, characterId: 0, partyId: 0, startTime: 0n, timeout: 0 };
    // ── Active effect item ──
    activeEffectItemId = 0;
    // ── Quest ──
    questTimers = new Map();
    autoStartQuestPreStart = new Map();
    autoAcceptQuestRequest = new Map();
    autoCompleteQuestInProgress = new Map();
    newPreStartQuestIds = [];
    newAutoCompletionAlertQuest = false;
    autoCompletionAlertQuest = [];
    questMatesName = new Map();
    worldMapQuestMobList = [];
    worldMapQuestDemandItem = [];
    worldMapQuestId = 0;
    showOnlyWorthyQuests = false;
    // ── Item Messages ──
    itemMsgs = [];
    tNextCheckItemMsg = 0;
    // ── Passive skill buffing ──
    passiveSkillBuffing = new Array(22).fill(0);
    // ── Skill cooldowns ──
    skillCooltimeOver = new Map();
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
    stackForTab = [];
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
    massacre = { hit: 0, miss: 0, cool: 0, skill: 0 };
    // ── Misc ──
    weekEventMessage = '';
    weekEventMessagePrinted = false;
    potionDiscountRate = 0;
    lastMobBonusEventPercentage = 0;
    channelNames = [];
    adultChannels = [];
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
    logoutGiftCommoditySN = [0, 0, 0];
    // ── Meso ──
    money = 0;
    // ── Getters ──
    getCharacterData() { return this.characterData; }
    getCharacterId() { return this.characterId; }
    getCharacterName() { return this.characterName; }
    getCharacterLevel() { return this.characterLevel; }
    getCurFieldID() { return this.curFieldId; }
    getBasicStat() { return this.basicStat; }
    getAdminLevel() { return this.adminLevel; }
    getCurrentPrivilege() { return this.gradeCode; }
    getDarkForceDamage() { return this.darkForceDamage; }
    getDragonFuryDamage() { return this.dragonFury; }
    getActionRndMan() { return null; }
    getCalcDamage() { return null; }
    getPartyID() { return this.partyId; }
    getPartyBossID() { return this.partyBossId; }
    getPartyMemberNumber() { return this.partyMembers.length; }
    getGuildName() { return this.guildName; }
    getGuildMemberNum() { return this.guildMembers.length; }
    getAllianceName() { return this.allianceName; }
    getAllianceMemberNum() { return this.allianceMembers.length; }
    getAllianceNotice() { return this.allianceNotice; }
    getGuildNotice() { return ''; }
    getActiveEffectItemId() { return this.activeEffectItemId; }
    getADBoard() { return this.adBoardText; }
    getDiceBuffType() { return 0; }
    getSwallowBuffType() { return 0; }
    getSkillLevelUpState(skillId) { return 0; }
    getTopStackForTab(tab) { return 0; }
    getRealEquipSlot(pos) { return pos; }
    getWebBoardAuthKey() { return ''; }
    getClassCompetitionAuthKey() { return ''; }
    getGMBoardURL() { return ''; }
    getCashPackageName(sn) { return ''; }
    getChannelName(channelId) { return this.channelNames[channelId] ?? ''; }
    getPrivilegeItem(index) { return null; }
    getPrivilegeName(index) { return ''; }
    getPartySearchRemoconLayer() { return null; }
    getQuestBonusEXP(questId) { return 0; }
    getQuestItemID(questId, index) { return 0; }
    getQuestMateName(questId) { return this.questMatesName.get(questId) ?? ''; }
    getQuestMobCount(questId) { return 0; }
    getQuestMobName(questId) { return ''; }
    getQuestRecordValue(questId) { return ''; }
    getQuestState(questId) { return 0; }
    getQuestTimer(questId) { return this.questTimers.get(questId) ?? null; }
    getItemCount(itemId) { return 0; }
    getCommodityByIndex(index) { return null; }
    getCommodityBySN(sn) { return null; }
    getPasssiveSkillBuffing(index) { return this.passiveSkillBuffing[index] ?? 0; }
    getGuildSkillLevel(skillId) { return this.guildSkillLevels.get(skillId) ?? 0; }
    getGuildSkillArray() { return Array.from(this.guildSkillLevels.keys()); }
    getGuildGradeName(grade) { return this.guildGradeNames[grade] ?? ''; }
    getAllianceGradeName(grade) { return this.allianceGradeNames[grade] ?? ''; }
    getAllianceMaxGradeNum() { return this.allianceGradeNames.length; }
    getGuildMaxGradeNum() { return this.guildGradeNames.length; }
    getGuildMemberGrade(charId) { return this.guildMembers.find(m => m.charId === charId)?.grade ?? 0; }
    getGuildMemberIDByName(name) { return this.guildMembers.find(m => m.name === name)?.charId ?? 0; }
    getGuildMemberNameByID(charId) { return this.guildMembers.find(m => m.charId === charId)?.name ?? ''; }
    getGuildMemberDataByIdx(index) { return this.guildMembers[index] ?? null; }
    getBattleTeamMarkCanvas(team) { return null; }
    getAutoQuestIconAppearUOL() { return ''; }
    getAutoQuestIconUOL() { return ''; }
    getMyTownPortal(tp) { Object.assign(tp, this.townPortal); return tp; }
    getPartyTownPortal(partyId, tp) { Object.assign(tp, this.townPortal); return tp; }
    getPartyMemberByName(name) { return this.partyMembers.find(m => m.name === name) ?? null; }
    getPartyMemberData(index) { return this.partyMembers[index] ?? null; }
    // Friend getters
    getFriendByID(charId) { return this.friends.find(f => f.charId === charId) ?? null; }
    getFriendByName(name) { return this.friends.find(f => f.name === name) ?? null; }
    getFriendGroups(groups) { groups.push(...this.friendGroups); return groups; }
    getOnlineFriendID(out) { out.push(...this.friends.filter(f => f.online).map(f => f.charId)); return out; }
    getOnlineFriendIDByGroup(group, out) { out.push(...this.friends.filter(f => f.online && f.group === group).map(f => f.charId)); return out; }
    getOnlinePartyMemberID(out) { out.push(...this.partyMembers.map(m => m.charId)); return out; }
    getOnlineGuildMemberID(out) { out.push(...this.guildMembers.filter(m => m.online).map(m => m.charId)); return out; }
    getOnlineAllianceMemberID(out) { out.push(...this.allianceMembers.filter(m => m.online).map(m => m.charId)); return out; }
    getOnlineExpeditionMemberID(out) { return out; }
    // ── Boolean checks ──
    isConnected() { return this.characterId !== 0; }
    isNewAccount() { return this.nNumOfCharacter === 0; }
    isAdminAccount() { return this.adminLevel > 0; }
    isUserGM() { return this.adminLevel > 0; }
    isSubGMAccount() { return this.adminLevel > 0; }
    isTesterAccount() { return this.testerAccount; }
    isTradeBlockedUser() { return false; }
    isUnderCover() { return false; }
    isEquipped(itemId) { return false; }
    isExist(itemId) { return false; }
    isPartyMemberID(charId) { return this.partyMembers.some(m => m.charId === charId); }
    isGuildMemberExist(charId) { return this.guildMembers.some(m => m.charId === charId); }
    isAllianceMemberExist(charId) { return this.allianceMembers.some(m => m.charId === charId); }
    isBlockedFriend(charId) { return false; }
    isExistSkillCooltimeOver(skillId) { return this.skillCooltimeOver.has(skillId); }
    isFadeWndExist() { return false; }
    isTopFadeWnd(fadeId) { return false; }
    isNearStartQuest(questId) { return false; }
    isWorthlessQuest(questId) { return false; }
    isInWorldMapQuestDemand(questId) { return this.worldMapQuestDemandItem.some(d => d.questId === questId); }
    cannotDropItem() { return false; }
    cannotUseCommunityFunction() { return false; }
    canUseCommonCommand() { return true; }
    isAbleToConsume(itemId) { return false; }
    isValidCommodity(sn) { return false; }
    isPartyBoss() { return this.partyBossId === this.characterId; }
    amIGuildMaster() { return false; }
    amIAllianceMaster() { return false; }
    amIAllianceSubMaster() { return false; }
    // ── Setters / mutators ──
    setCharacterData(data) {
        this.characterData = data;
        if (data.characterStat) {
            this.characterId = data.characterStat.characterId;
            this.characterName = data.characterStat.name;
            this.characterLevel = data.characterStat.level;
            this.characterJob = data.characterStat.job;
        }
    }
    setCurFieldID(fieldId) { this.curFieldId = fieldId; }
    setExclRequestSent(sent) { this.exclRequestSent = sent; }
    setADBoard(text) { this.adBoardText = text; }
    setScreenResolution(w, h) { this.screenWidth = w; this.screenHeight = h; }
    setShowWorthlessQuestFromConfig(show) { this.showOnlyWorthyQuests = show; }
    setPresentInfo(...args) { }
    setSaleInfo(...args) { }
    setAccountInfo(...args) { }
    setWorldInfo(...args) { }
    setActionRndSeed(seed) { }
    setPasssiveSkillBuffing(index, value) { this.passiveSkillBuffing[index] = value; }
    setSkillCooltimeOver(skillId, time) { this.skillCooltimeOver.set(skillId, time); }
    removeSkillCooltimeOver(skillId) { this.skillCooltimeOver.delete(skillId); }
    setImpactNextBySessionValue(key, value) { this.sessionValueKey = key; this.sessionValue = value; }
    setEventTimer(...args) { }
    setUnregisterCharacterName(name) { this.unregisteredCharacterName = name; }
    setQuestMateName(questId, name) { this.questMatesName.set(questId, name); }
    setNewFadeWnd(...args) { }
    setTopFadeWnd(fadeId) { }
    // ── Quest management ──
    addQuestTimer(questId, fieldId, timerType) {
        this.questTimers.set(questId, { questId, fieldId, remainTimeMs: 0, startTime: Date.now(), timerType });
    }
    clearQuestTimer() { this.questTimers.clear(); }
    removeQuestTimer(questId) { this.questTimers.delete(questId); }
    resetQuestTimer() { this.questTimers.clear(); }
    checkNewQuestAvailable(questId) { return false; }
    startQuest(questId) { }
    resignQuest(questId) { }
    resetAutoQuest() {
        this.autoStartQuestPreStart.clear();
        this.autoAcceptQuestRequest.clear();
        this.autoCompleteQuestInProgress.clear();
    }
    checkAutoCompletionAlertQuest() { }
    tryRegisterAutoCompletionAlertQuest(questId) { return false; }
    tryRegisterAutoStartQuest(questId) { return false; }
    removeAtAutoQuestList(index) { }
    checkNormalAutoStartQuest(questId) { return false; }
    checkEquipOnAutoStartQuest(itemId, tab) { return false; }
    checkInventoryOnAutoStartQuest(itemId, tab) { return false; }
    checkFieldOnAutoStartQuest(fieldId) { return false; }
    updateAutoStartQuestPreStartList() { }
    updateAutoQuestAlertIcon() { }
    checkQuestCompleteByItem(questId, itemId) { return false; }
    checkQuestCompleteByMeso(questId) { return false; }
    updateItemMsg() { }
    loadItemMsg() { }
    insertItemMsg(...args) { }
    removeItemMsg(...args) { }
    restoreItemMsg(...args) { }
    // ── World Map Quest Demand ──
    addWorldMapQuestDemandMob(questId, mobId) {
        this.worldMapQuestMobList.push(mobId);
    }
    addWorldMapQuestDemandItem(questId, itemId) {
        // Decode from WZ — stub
    }
    resetWorldMapQuestDemand() {
        this.worldMapQuestMobList = [];
        this.worldMapQuestDemandItem = [];
    }
    // ── Friend management ──
    loadFriend() { }
    checkReqFriend() { return this.friends.length > 0; }
    changeBlockOption(charId, type, block) { }
    // ── Item operations ──
    checkEquippedSetItem() { }
    checkTemporaryStatDuration() { }
    checkDarkForce(level) { return false; }
    checkDragonFury(level) { return false; }
    // ── UI operations ──
    clearFieldUI() { }
    clearFadeWnd() { }
    deleteFadeWnd(...args) { }
    closeBook() { }
    closePartySearchRemocon() { }
    closeShopScanner() { }
    openBook(...args) { }
    openRaise(...args) { }
    tryCloseUI() { return false; }
    tryRecovery() { return false; }
    // ── UI state ──
    showUIEnabled() { this.showUI = true; }
    showPremiumArgument() { }
    showAntiMacroNotice(...args) { }
    showGuildInfo(...args) { }
    showPartyInfo(...args) { }
    showNewYearCard(...args) { }
    showQuestInfoDetail(...args) { }
    // ── Party search ──
    holdPartyMemberSearch() { }
    showPartySearchRemoconHolding() { }
    showPartySearchRemoconLayer() { }
    showPartySearchRemoconSearching() { }
    startPartyMemberSearch() { }
    stopPartySearch() { }
    // ── Misc ──
    askWhetherUsePamsSong() { }
    channelShift() { }
    checkOpBoardHasNew() { return false; }
    findUser(charId) { return null; }
    issueConnect(...args) { }
    loadAreaCode() { }
    loadCommodity() { }
    loadPackageOriginalSN() { }
    makeOriginalSN(...args) { }
    sortCommodity() { }
    releaseCommodityRes() { }
    releaseRefs() { }
    loadPartySearchRemoconLayer() { }
    monsterCarnivalDlgKeyHook(...args) { }
    processBasicUIKey(keyCode) { return false; }
    useFuncKeyMapped(keyCode) { return false; }
    saveAntiMacroScreenShot(...args) { }
    returnToTitle() { }
    runMapTransferItem(...args) { }
    runShopScanner(...args) { }
    validateAdditionalItemEffect(...args) { }
    validateStat() { }
    useBoxGachaponItem(...args) { }
    update() { }
    // ── Chat ──
    addChatMorphedMsg() { }
    // ── Alliance/Guild ──
    updateAllianceMemberInfo() { }
    getOnlineFriendIDs() { return this.friends.filter(f => f.online).map(f => f.charId); }
}
// Singleton instance — mirrors OG's TSingleton<CWvsContext>
let _instance = null;
export function getCWvsContext() {
    if (!_instance)
        _instance = new CWvsContext();
    return _instance;
}
//# sourceMappingURL=CWvsContext.js.map