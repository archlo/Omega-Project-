import { Stage, MouseButton } from '../app/Stage.js';
import { MapleClaudeGame } from '../MapleClaudeGame.js';
import { WzPackage } from '../wz/WzPackage.js';
import { GameCamera } from '../map/GameCamera.js';
import { FieldScene } from '../map/FieldScene.js';
import { CharLook } from '../character/CharLook.js';
import { NpcLook } from '../character/NpcLook.js';
import { OtherCharLook } from '../character/OtherCharLook.js';
import { MobLook } from '../character/MobLook.js';
import { ReactorLook } from '../character/ReactorLook.js';
import { DropSprite } from '../character/DropSprite.js';
import { SummonedLook } from '../character/SummonedLook.js';
import { Pet } from '../character/Pet.js';
import { DragonLook } from '../character/DragonLook.js';
import { TownPortalLook } from '../character/TownPortalLook.js';
import { EmployeeLook } from '../character/EmployeeLook.js';
import { AffectedAreaLook } from '../character/AffectedAreaLook.js';
import { OpenGateLook } from '../character/OpenGateLook.js';
import { DamageNumber } from '../character/DamageNumber.js';
import { ShopMarker } from '../character/ShopMarker.js';
import { SkillEffectOverlay } from '../character/SkillEffectOverlay.js';
import { ItemEffectOverlay } from '../character/ItemEffectOverlay.js';
import { TombstoneEffect } from '../character/TombstoneEffect.js';
import { SequencedKeyMan } from '../character/SequencedKeyMan.js';
import { MobController } from '../character/MobController.js';
import { MobInfoService } from '../character/MobInfoService.js';
import { SkillInfoService } from '../character/SkillInfoService.js';
import { MobSoundService } from '../character/MobSoundService.js';
import { PlayerController } from '../character/PlayerController.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import { WzSprite } from '../render/WzSprite.js';
import type { SetFieldArgs, MacroSlot } from '../net/handlers/PacketArgs.js';
import { EquipStats } from '../domain/InventoryItem.js';
import { ItemIconLoader } from '../character/ItemIconLoader.js';
import { ItemInfoService } from '../character/ItemInfoService.js';
import { StatusBar } from '../ui/game/StatusBar.js';
import { ChatBar } from '../ui/game/ChatBar.js';
import { ChatBalloonLayer } from '../ui/game/ChatBalloon.js';
import { MiniMap } from '../ui/game/MiniMap.js';
import { BuffList } from '../ui/game/BuffList.js';
import { Clock } from '../ui/game/Clock.js';
import { SlideNotice } from '../ui/game/SlideNotice.js';
import { PartyHPBar } from '../ui/game/PartyHPBar.js';
import { KillCountHud } from '../ui/game/KillCountHud.js';
import { MassacreGaugeHud } from '../ui/game/MassacreGaugeHud.js';
import { QuestTimerHud } from '../ui/game/QuestTimerHud.js';
import { EquipInventory } from '../ui/game/EquipInventory.js';
import { ItemInventory } from '../ui/game/ItemInventory.js';
import { SkillBook } from '../ui/game/SkillBook.js';
import { StatsInfo } from '../ui/game/StatsInfo.js';
import { QuestLog } from '../ui/game/QuestLog.js';
import { QuestDetail } from '../ui/game/QuestDetail.js';
import { MedalQuestInfo } from '../ui/game/MedalQuestInfo.js';
import { QuestReward } from '../ui/game/QuestReward.js';
import { KeyConfig } from '../ui/game/KeyConfig.js';
import { OptionMenu } from '../ui/game/OptionMenu.js';
import { CharInfo } from '../ui/game/CharInfo.js';
import { NpcTalk } from '../ui/game/NpcTalk.js';
import { Shop } from '../ui/game/Shop.js';
import { GameMenu } from '../ui/game/GameMenu.js';
import { Revive } from '../ui/game/Revive.js';
import { StringPoolService } from '../localization/StringPoolService.js';
import { Messenger } from '../ui/game/Messenger.js';
import { StatusMessenger } from '../ui/game/StatusMessenger.js';
import { TipOfTheDay } from '../character/TipOfTheDay.js';
import { UserList } from '../ui/game/UserList.js';
import { GuildBBS } from '../ui/game/GuildBBS.js';
import { FamilyWindow } from '../ui/game/FamilyWindow.js';
import { ChannelSelect } from '../ui/game/ChannelSelect.js';
import { QuickSlotConfig } from '../ui/game/QuickSlotConfig.js';
import { QuickSlotBar } from '../ui/game/QuickSlotBar.js';
import { ContextMenu } from '../ui/ContextMenu.js';
import { StatDetailInfo } from '../ui/game/StatDetailInfo.js';
import { GamePanel } from '../ui/game/GamePanel.js';
import { DragController } from '../ui/DragController.js';
import { Notice } from '../ui/game/Notice.js';
import { AntiMacroDialog } from '../ui/game/AntiMacroDialog.js';
import { QuitConfirmOverlay } from '../ui/QuitConfirmOverlay.js';
import { Trunk } from '../ui/game/Trunk.js';
import { WorldMap } from '../ui/game/WorldMap.js';
import { Ranking } from '../ui/game/Ranking.js';
import { MonsterBook } from '../ui/game/MonsterBook.js';
import { Memo } from '../ui/game/Memo.js';
import { MegaphoneCompose } from '../ui/game/MegaphoneCompose.js';
import { BattleRecord } from '../ui/game/BattleRecord.js';
import { TitleWindow } from '../ui/game/TitleWindow.js';
import { Maker } from '../ui/game/Maker.js';
import { AdminShop } from '../ui/game/AdminShop.js';
import { StoreBank } from '../ui/game/StoreBank.js';
import { CharacterSale } from '../ui/game/CharacterSale.js';
import { WeddingWishList } from '../ui/game/WeddingWishList.js';
import { FindFriend } from '../ui/game/FindFriend.js';
import { ShopScanner } from '../ui/game/ShopScanner.js';
import { Incubator } from '../ui/game/Incubator.js';
import { RPSGame } from '../ui/game/RPSGame.js';
import { LogoutGift } from '../ui/game/LogoutGift.js';
import { Parcel } from '../ui/game/Parcel.js';
import { WildHunterInfo } from '../ui/game/WildHunterInfo.js';
import { SkillMacro } from '../ui/game/SkillMacro.js';
import { Reset } from '../ui/game/Reset.js';
import { Delivery } from '../ui/game/Delivery.js';
import { Claim } from '../ui/game/Claim.js';
import { EnchantSkill } from '../ui/game/EnchantSkill.js';
import { MiracleCube } from '../ui/game/MiracleCube.js';
import { GoldHammer } from '../ui/game/GoldHammer.js';
import { KarmaScissors } from '../ui/game/KarmaScissors.js';
import { ItemProtector } from '../ui/game/ItemProtector.js';
import { Repair } from '../ui/game/Repair.js';
import { ItemScrollDialog } from '../ui/game/ItemScrollDialog.js';
import { VegaDialog } from '../ui/game/VegaDialog.js';
import { PartySearchDialog } from '../ui/game/PartySearchDialog.js';
import { TradingRoom } from '../ui/game/TradingRoom.js';
import { CashTradingRoom } from '../ui/game/CashTradingRoom.js';
import { PersonalShop } from '../ui/game/PersonalShop.js';
import { EntrustedShop } from '../ui/game/EntrustedShop.js';
import { MemoryGame } from '../ui/game/MemoryGame.js';
import { TournamentWindow } from '../ui/game/TournamentWindow.js';
import { FieldSubgameHud } from '../ui/game/FieldSubgameHud.js';
import { MonsterCarnival } from '../ui/game/MonsterCarnival.js';
import { EventAlarm } from '../ui/game/EventAlarm.js';
import { SkillGuide } from '../ui/game/SkillGuide.js';
import { QuestAlarm } from '../ui/game/QuestAlarm.js';
import { DojangHud } from '../ui/game/DojangHud.js';
import { ItemOptionLoader } from '../character/ItemOptionInfo.js';
export declare class GameStage extends Stage {
    protected _loader: WzTextureLoader;
    protected _camera: GameCamera;
    protected _player: CharLook | null;
    protected _npcs: NpcLook[];
    protected _mobs: Map<number, MobLook>;
    protected _reactors: Map<number, ReactorLook>;
    protected _employees: Map<number, EmployeeLook>;
    protected _summons: Map<number, SummonedLook>;
    protected _townPortals: Map<number, TownPortalLook>;
    protected _affectedAreas: Map<number, AffectedAreaLook>;
    protected _openGates: Map<string, OpenGateLook>;
    protected _mobCtl: Map<number, MobController>;
    protected _mobInfoSvc: MobInfoService | null;
    protected _mobWz: WzPackage | null;
    protected _mobSoundWz: WzPackage | null;
    protected _mobSounds: MobSoundService | null;
    protected _diedMobIds: Set<number>;
    private _currentBgm;
    /** Stored when SetField arrives before Map.wz finishes loading. */
    private _deferredFieldArgs;
    protected _otherChars: Map<number, OtherCharLook>;
    /** ponytail: couple-chair pairs. Key=charId, value={itemId, pairCharId}.
     *  Proximity tracking works; overlay rendering (heart zone, per-character
     *  effect) deferred — cosmetic, no gameplay impact. */
    private _couplePairs;
    protected _pets: Map<number, (Pet | null)[]>;
    protected _dragons: Map<number, DragonLook>;
    protected _drops: DropSprite[];
    protected _dmgNumbers: DamageNumber | null;
    protected _shopMarker: ShopMarker | null;
    private _shopMarkerLayer;
    protected _skillEffects: SkillEffectOverlay | null;
    private _skillEffectLayer;
    protected _itemEffects: ItemEffectOverlay | null;
    private _itemEffectLayer;
    private _skillScreenLayer;
    private _projectiles;
    private _projectileLayer;
    /** couple-chair heart zone overlays: midpoint position + animation frames. */
    private _coupleHearts;
    private _coupleHeartLayer;
    onCoupleChairPairChanged: ((paired: boolean, charId: number, pairCharId: number, itemId: number) => void) | null;
    /** One-shot field effects (e.g. Summon.img animations at world positions). */
    private _fieldFx;
    private _fieldFxLayer;
    private _fearEffect;
    private _forbiddenSkills;
    private _allowedItems;
    private _dojangSpecialArts;
    private _limitedView;
    private _comboCounter;
    private _keyDownBar;
    private _comboDisplay;
    private _buffVisual;
    private _buffVisualLayer;
    private _entityLayer;
    protected _statusBar: StatusBar;
    protected _chatBar: ChatBar;
    private _chatTarget;
    private _pendingLocalBalloon;
    private _chatTab;
    protected _miniMap: MiniMap;
    protected _partyCharIds: Map<number, boolean>;
    protected _buffList: BuffList;
    protected _clock: Clock;
    protected _killCountHud: KillCountHud;
    protected _massacreGaugeHud: MassacreGaugeHud;
    protected _questTimerHud: QuestTimerHud;
    protected _fieldSubgameHud: FieldSubgameHud;
    protected _monsterCarnival: MonsterCarnival | null;
    protected _slideNotice: SlideNotice;
    protected _partyHPBar: PartyHPBar;
    protected _equip: EquipInventory;
    protected _item: ItemInventory;
    protected _itemIcons: ItemIconLoader | null;
    protected _itemInfo: ItemInfoService | null;
    protected _stringPool: StringPoolService | null;
    protected _questDetail: QuestDetail | null;
    protected _skill: SkillBook;
    protected _stats: StatsInfo;
    protected _prevExp: number;
    protected _job: number;
    protected _quest: QuestLog;
    protected _medalQuestInfo: MedalQuestInfo;
    protected _keyConfig: KeyConfig;
    protected _skillIconCache: Map<number, WzSprite>;
    protected _optionMenu: OptionMenu;
    protected _charInfo: CharInfo | null;
    protected _npcTalk: NpcTalk;
    protected _shop: Shop | null;
    protected _trunk: Trunk | null;
    protected _messengerWin: Messenger | null;
    protected _gameMenu: GameMenu | null;
    protected _revivePanel: Revive | null;
    protected _userList: UserList;
    protected _guildBBS: GuildBBS;
    protected _blackList: Set<string>;
    protected _statusMessenger: StatusMessenger;
    protected _tipOfTheDay: TipOfTheDay;
    protected _eventAlarm: EventAlarm;
    protected _skillGuide: SkillGuide | null;
    protected _questAlarm: QuestAlarm;
    protected _dojangHud: DojangHud;
    /** NPC idle-chat: per-NPC timer (seconds) before next potential speech. */
    private _npcChatTimer;
    /** OG: pet auto-pickup scan interval (500ms). */
    private _petPickupTimer;
    protected _familyWindow: FamilyWindow | null;
    protected _worldMap: WorldMap | null;
    protected _tournamentWindow: TournamentWindow | null;
    protected _ranking: Ranking | null;
    protected _monsterBook: MonsterBook | null;
    protected _memo: Memo | null;
    protected _battleRecord: BattleRecord | null;
    protected _titleWindow: TitleWindow | null;
    protected _maker: Maker | null;
    protected _adminShop: AdminShop | null;
    protected _storeBank: StoreBank | null;
    protected _characterSale: CharacterSale | null;
    protected _weddingWishList: WeddingWishList | null;
    protected _findFriend: FindFriend | null;
    protected _shopScanner: ShopScanner | null;
    protected _incubator: Incubator | null;
    protected _rpsGame: RPSGame | null;
    protected _logoutGift: LogoutGift | null;
    protected _parcel: Parcel | null;
    protected _wildHunterInfo: WildHunterInfo | null;
    protected _skillMacro: SkillMacro | null;
    protected _reset: Reset | null;
    protected _delivery: Delivery | null;
    protected _claim: Claim | null;
    protected _enchantSkill: EnchantSkill | null;
    protected _miracleCube: MiracleCube | null;
    protected _goldHammer: GoldHammer | null;
    protected _megaphoneCompose: MegaphoneCompose | null;
    protected _karmaScissors: KarmaScissors | null;
    protected _itemProtector: ItemProtector | null;
    protected _repair: Repair | null;
    protected _scrollDialog: ItemScrollDialog | null;
    protected _vegaDialog: VegaDialog | null;
    protected _partySearchDialog: PartySearchDialog | null;
    protected _questReward: QuestReward | null;
    protected _notice: Notice | null;
    private _utilDlg;
    protected _antiMacroDialog: AntiMacroDialog | null;
    private _adminShopNpcTemplateId;
    protected _chatBalloon: ChatBalloonLayer | null;
    protected _tradingRoom: TradingRoom | null;
    protected _cashTradingRoom: CashTradingRoom | null;
    protected _personalShop: PersonalShop | null;
    protected _entrustedShop: EntrustedShop | null;
    protected _memoryGame: MemoryGame | null;
    protected _channelSelect: ChannelSelect | null;
    protected _quickSlotConfig: QuickSlotConfig | null;
    protected _quickSlots: QuickSlotBar | null;
    protected _dragController: DragController;
    protected _statDetailInfo: StatDetailInfo | null;
    protected _tombstone: TombstoneEffect | null;
    protected _quitOverlay: QuitConfirmOverlay | null;
    protected _contextMenu: ContextMenu | null;
    protected _panels: GamePanel[];
    protected _fadePhase: number;
    protected _fadeAlpha: number;
    protected _pendingField: SetFieldArgs | null;
    private _fadeOverlay;
    protected _field: FieldScene | null;
    protected _mapWz: WzPackage | null;
    protected _characterWz: WzPackage | null;
    protected _itemWz: WzPackage | null;
    protected _baseWz: WzPackage | null;
    protected _skillWz: WzPackage | null;
    protected _uiWz: WzPackage | null;
    protected _effectWz: WzPackage | null;
    protected _npcWz: WzPackage | null;
    protected _reactorWz: WzPackage | null;
    protected _tamingMobWz: WzPackage | null;
    protected _morphWz: WzPackage | null;
    protected _etcWz: WzPackage | null;
    protected _questStates: Map<number, number>;
    protected _pendingInviterId: number;
    protected _hasPendingPartyInvite: boolean;
    protected _guildLoadSent: boolean;
    protected _friendLoadSent: boolean;
    /** Pending stat data from SetField — applied after _initMenu creates the statusBar. */
    private _pendingStat;
    /** Pending equipped items from SetField — applied after _initMenu creates the equip panel. */
    private _pendingEquipped;
    private _pendingEquippedCash;
    private _pendingLinkedCharacter;
    protected _skillService: SkillInfoService | null;
    protected _skillRecords: {
        skillId: number;
        level: number;
        masterLevel: number;
    }[];
    private _afterimageInfo;
    protected _masteryFromSkills: number;
    protected _forcedStat: {
        str: number;
        dex: number;
        int: number;
        luk: number;
        speed: number;
        jump: number;
    };
    protected _itemOptionLoader: ItemOptionLoader | null;
    protected _equipStats: Map<number, EquipStats>;
    get weaponCritProb(): number;
    get weaponCritDamage(): number;
    get weaponDAMr(): number;
    get weaponBossDAMr(): number;
    get weaponIgnoreTargetDEF(): number;
    protected _macroSlots: MacroSlot[];
    protected _questRecords: {
        questId: number;
        state: number;
    }[];
    protected _physics: PlayerController | null;
    protected _localCharId: number;
    protected _pendingQuestId: number;
    protected _pendingQuestNpcId: number;
    protected _attackCooldown: number;
    protected _comboKeys: SequencedKeyMan;
    protected _comboClockMs: number;
    protected _comboCount: number;
    private _pendingBridle;
    protected _isPlayerDead: boolean;
    protected _fieldKey: number;
    private _isFieldTransferring;
    private _townPortalStatus;
    private _lastUnequipTime;
    private _isRidingTamingMob;
    protected _mobNameOf: (id: number) => string;
    protected _itemNameOf: (id: number) => string;
    private _directionModeActive;
    private _bg;
    constructor();
    private _moveChildren;
    draw(): void;
    onResize(windowW: number, windowH: number): void;
    onMouseMove(x: number, y: number): void;
    onMouseWheel(x: number, y: number, deltaY: number): void;
    onKeyPress(key: string): void;
    private _executeMenuAction;
    private _takeScreenshot;
    onMouseButton(x: number, y: number, down: boolean, _button: MouseButton): void;
    private _showPlayerContextMenu;
    private _dismissContextMenu;
    onEnter(game: MapleClaudeGame): void;
    private _loadWzAsync;
    private _initMenu;
    onExit(): void;
    update(dt: number): void;
    protected _wireNames(game: MapleClaudeGame): void;
    handleKeyDown(key: string): boolean;
    private _trySit;
    private _tryPickUpDrop;
    /** Reset pressed/hover state on all buttons across all panels.
     *  Called on global mouse-up to prevent buttons from staying stuck when
     *  a panel opens during mouse-down and the mouse-up goes to the panel. */
    private _resetAllButtonStates;
    private _pointOverVisiblePanel;
    protected _wireHandlers(game: MapleClaudeGame): void;
    private _ensureDragon;
    private static _KEY_NAMES;
    private static _keyName;
    private _resolveChatItemLinks;
    private _onSetField;
    /** Swap the field at full black — pop-free map transition. */
    private _applyFieldChange;
    /** Play map BGM from Sound.wz. The bgm string is e.g. "Bgm01/300000000" —
     *  resolve to "Bgm01.img/300000000" in Sound.wz, then PlayLoop. */
    private _playMapBgm;
    /**
     * OG: CField::Restore* family — apply field-specific state on entry.
     * Called from _applyFieldChange after the field is loaded.
     *
     * Decompiled from v95 IDB:
     * - RestoreForbiddenSkill (0x532FB0) — restrict skills
     * - RestoreAllowedItem (0x532AB0) — restrict items
     * - RestoreHelpMsg (0x52FF40) — show help messages
     * - RestoreClock (0x533AB0) — start clock/timer
     * - RestoreWeatherMsg (0x53CF80) — show weather message
     * - RestorePhaseBG (0x532DD0) — set phase background
     * - RestoreOption (0x53B070) — apply field options
     * - RestoreSwinArea (0x5330E0) — set swim area
     * - RestoreSeat (0x533820) — already handled by FieldScene._loadSeats
     * - RestoreTownPortal (0x52E9C0) — already handled by TownPortalNotify replay
     */
    private _restoreFieldState;
    /** Drives the map-change fade: fade to black → swap at full black → fade in. */
    private _advanceFieldTransition;
    private _onMobEnter;
    private _onMobMove;
    /** OG MobActionType → MobState mapping */
    private _mapMoveActionToState;
    private _onMobDamaged;
    private _onMobHpIndicator;
    private _onReactorEnter;
    private _onReactorLeave;
    private _onReactorChangeState;
    private _onReactorMove;
    private _onEmployeeEnter;
    private _onEmployeeLeave;
    private _onSummonedEnter;
    private _onSummonedLeave;
    private _onSummonedMove;
    private _onTownPortalEnter;
    private _onTownPortalLeave;
    private _setTownPortalStatus;
    private _onAffectedAreaCreate;
    private _onOpenGateCreate;
    private _onOpenGateRemove;
    private _openGateKey;
    private static readonly MeleeReachX;
    private static readonly MeleeReachY;
    private static readonly AttackCooldownSeconds;
    /** Handle a chat line: route slash commands locally, send the rest as UserChat. */
    private _handleChatCommand;
    private static readonly AutoTouchPortalTypes;
    private static readonly PortalTouchRadiusX;
    private static readonly PortalTouchRadiusYUp;
    private static readonly PortalTouchRadiusYDown;
    private _checkPortalTouch;
    private _tryMeleeAttack;
    private _registerAfterimage;
    private _comboContext;
    private _killMob;
    /** Resolve a quest id to its current state (0=available, 1=in-progress, 2=completed). */
    private _questStateOf;
    /** Mirrors equip-tab (`invType===1`) ops with a negative slot — the real
        `nCurItemPos`/`GW_ItemSlotEquip` convention for "currently worn" — into the
        separate paper-doll `EquipInventory` panel. `_item.applyOps` already tracks
        this same data generically by `(tab, pos)`, but `EquipInventory` has its own
        independent `_equipped` map (keyed by body part, for the "Hat"/"Top"/etc.
        slot layout) that nothing else populates — without this, the Equipment
        panel always renders empty regardless of what's actually worn. */
    /** Apply stat data to statusBar/stats panels — called from _onSetField or deferred to _initMenu. */
    private _applyStatToStatusBar;
    /** Apply pending equipped items from SetField — called after _initMenu creates the equip panel. */
    private _applyPendingEquipped;
    private _applyEquipOps;
    private _bodyPartFromEquippedPos;
    private _setEquippedAvatarItem;
    private _clearEquippedAvatarItem;
    /** v95 equip item id → equipped body part. 0 = not a known equip slot. */
    private static _equipBodyPart;
    /** Resolve a skill id to a WzSprite icon (used by QuickSlotBar to render bound skill keys). */
    private _skillIcon;
    private _isStateChangeItem;
    private _isBindableItem;
    private _pendingMobControllers;
    private _createMobController;
    private _onMobLeave;
    private _onNpcEnter;
    private _onNpcLeave;
    private _onUserEnter;
    private _onUserLeave;
    private _spawnPetsForOwner;
    private _removePetsForOwner;
    private _getLocalPetName;
    /** OG: fire AutoSpeakingByEvent on all local pets. Event indices: 0=levelup, 1=warp, etc. */
    private _firePetEvent;
    private _petAt;
    /** Returns a PetCallbacks instance wired to GameSender for packet sending. */
    private _makePetCallbacks;
    private _syncEquipPetCount;
    private _applyPetActivated;
    private _applyPetEvol;
    private _onDropEnter;
    private _onDropLeave;
    private _getOptionContributions;
    private _getSocketContributions;
    private _refreshActiveProjectileSlot;
    private _computeWeaponOption;
    private _getDefenseOptionData;
    private _syncStatDetailInputs;
    /** Update buff visual effects based on current SecondaryStat state. */
    private _updateBuffVisuals;
    /** Mirror the local avatar/stat sources consumed by CVecCtrlUser's ladder gate. */
    private _syncLadderEligibility;
    private _onStatChanged;
    private _onSkillRecordResult;
    private _computeMasteryFromSkills;
    private _onTemporaryStatSet;
    private _onTemporaryStatReset;
    private _onQuestRecord;
    private _refreshQuestLog;
    private _onScriptMessage;
    private _onShopOpen;
    private _onShopResult;
    private _onAdminShopDlg;
    private _onEntrustedShopCheckResult;
    private _onStoreBankAction;
    private _onTrunkResult;
    private static _toShopItemSlots;
    /** Per-frame couple-chair proximity pairing (OG CUserPool::Update,
     *  0x94C370). Sweeps characters with couple-chair items (3012xxx), groups
     *  unpaired chars by item ID, pairs closest within ~100px distance.
     *  ponytail: overlay rendering (heart zone + per-character effect) deferred —
     *  cosmetic only. See CUser::SetCoupleChairEffect (0x8F1FE0, ~2KB). */
    private _updateKeyDownBar;
    private _keyDownStartTime;
    private _lastPrepSkillId;
    private _updateFieldFx;
    private _updateCoupleHearts;
    private _updateCoupleChairs;
    /** NPC idle-chat: every N seconds, pick a random NPC with speech data and
        show a chat balloon. OG: CNpcTemplate::GetChatMessageList (0x677FE0). */
    private _updateNpcChat;
    /** ponytail: when combo counter > 0, try indexed variant <wzPath>/<combo>
     *  first (OG Effect_SkillUse format-ID-986 loop). Falls back to base path
     *  if no such sub-node. Remote chars not tracked — only local combo. */
    private _onUserEffect;
    private _playSkillHit;
    private _dispatchCashItem;
    private _onUserAttack;
    private _onMiniRoom;
    private _onMessengerResult;
}
//# sourceMappingURL=GameStage.d.ts.map