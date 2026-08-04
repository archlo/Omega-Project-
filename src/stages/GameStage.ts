import { Container, Graphics } from 'pixi.js';
import { Stage, MouseButton } from '../app/Stage.js';
import { MapleClaudeGame } from '../MapleClaudeGame.js';
import { WzPackage } from '../wz/WzPackage.js';
import { WzProperty } from '../wz/WzProperty.js';
import { GameCamera } from '../map/GameCamera.js';
import { FieldScene } from '../map/FieldScene.js';
import { CharLook } from '../character/CharLook.js';
import * as Avatar from '../character/Avatar.js';
import { NextLevelExpTable } from '../character/NextLevelExpTable.js';
import { NpcLook } from '../character/NpcLook.js';
import { OtherCharLook } from '../character/OtherCharLook.js';
import { MobLook } from '../character/MobLook.js';
import { ReactorLook } from '../character/ReactorLook.js';
import { DropSprite } from '../character/DropSprite.js';
import { SummonedLook } from '../character/SummonedLook.js';
import { Pet } from '../character/Pet.js';
import type { PetCallbacks } from '../character/Pet.js';
import { DragonLook } from '../character/DragonLook.js';
import { TownPortalLook } from '../character/TownPortalLook.js';
import { EmployeeLook } from '../character/EmployeeLook.js';
import { AffectedAreaLook } from '../character/AffectedAreaLook.js';
import { OpenGateLook } from '../character/OpenGateLook.js';
import { DamageKind, DamageNumber } from '../character/DamageNumber.js';
import { DamageDigits } from '../ui/DamageDigits.js';
import { ShopMarker } from '../character/ShopMarker.js';
import { SkillEffectOverlay } from '../character/SkillEffectOverlay.js';
import { ItemEffectOverlay } from '../character/ItemEffectOverlay.js';
import { ProjectileOverlay } from '../character/ProjectileOverlay.js';
import { BuffVisualOverlay } from '../character/BuffVisualOverlay.js';
import { AttackAction } from '../character/AttackAction.js';
import { ActionMan } from '../character/ActionMan.js';
import { TombstoneEffect } from '../character/TombstoneEffect.js';
import { WzSound } from '../wz/WzSound.js';
import { FearEffect } from '../character/FearEffect.js';
import { LimitedViewOverlay } from '../character/LimitedViewOverlay.js';
import { SequencedKeyMan, type ComboCastContext } from '../character/SequencedKeyMan.js';
import { MobController } from '../character/MobController.js';
import { MobInfoService } from '../character/MobInfoService.js';
import { MobSkillType } from '../character/MobSkillType.js';
import { SkillInfoService } from '../character/SkillInfoService.js';
import type { AnimFrame } from '../character/WzFrameAnimation.js';
import { loadFrameSequence } from '../character/WzFrameAnimation.js';
import { getConsumeCashItemType } from '../util/CashSlotType.js';
import { MobSoundService } from '../character/MobSoundService.js';
import { InPacket } from '../net/packet/InPacket.js';
import { MeleeAttackEncoder, MeleeTarget } from '../net/packet/MeleeAttackEncoder.js';
import { getWeaponType, calcDamageRange } from '../net/packet/MeleeDamage.js';
import { PlayerController } from '../character/PlayerController.js';
import { CharacterStat } from '../domain/CharacterStat.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import { WzSprite } from '../render/WzSprite.js';
import type { PlayerInput } from '../character/PlayerInput.js';
import { ScriptText } from '../ui/game/ScriptText.js';
import { ForbiddenNameProvider } from '../character/ForbiddenNameProvider.js';
import * as CUserLocal from '../character/CUserLocal.js';
import type {
  SetFieldArgs, MobEnterArgs, MobMoveArgs, MobDamagedArgs,
  NpcEnterArgs, OtherCharEnterArgs, OtherCharMoveArgs,
  DropEnterArgs, DropLeaveArgs, UserChatArgs, ScriptMessageArgs,
  InventoryOpArg, StatChangedArgs, FuncKeyEntry,
  ReactorEnterArgs, ReactorChangeStateArgs, ReactorMoveArgs, ReactorLeaveArgs,
  EmployeeEnterArgs, SummonedEnterArgs, SummonedLeaveArgs, SummonedMoveArgs,
  TownPortalEnterArgs, TownPortalLeaveArgs, AffectedAreaArgs,
  OpenGateCreateArgs, OpenGateRemoveArgs,
  MessengerResultArgs, EntrustedShopCheckResultArgs, UserEffectArgs, UserAttackArgs,
  MacroSlot, PetActivatedArgs, PetEvolArgs,
} from '../net/handlers/PacketArgs.js';
import { ScriptMessageType } from '../net/packet/ScriptMessageType.js';
import { GameSender, ChatGroupType } from '../net/senders/GameSender.js';
import { MiniRoomType, MiniRoomProtocol as MiniRoomProtocolFull } from '../net/packet/MiniRoomProtocol.js';
import { MapleStat, MessengerAction, ShopResultType, TrunkResultType, DropLeaveType } from '../net/protocol/Enums.js';
import { EquipStats, InventoryType } from '../domain/InventoryItem.js';
import { InventoryOpType } from '../net/protocol/Enums.js';
import { ItemIconLoader } from '../character/ItemIconLoader.js';
import { ItemInfoService } from '../character/ItemInfoService.js';
import { StatusBar } from '../ui/game/StatusBar.js';
import { ChatBar, FILTER_ALL, FILTER_FRIEND, FILTER_PARTY, FILTER_GUILD, FILTER_ALLIANCE, FILTER_BUDDY, FILTER_EXPEDITION } from '../ui/game/ChatBar.js';
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
import { ItemInventory, ItemDragPayload } from '../ui/game/ItemInventory.js';
import { SkillBook, SkillRow } from '../ui/game/SkillBook.js';
import { StatsInfo } from '../ui/game/StatsInfo.js';
import { QuestLog } from '../ui/game/QuestLog.js';
import { QuestDetail } from '../ui/game/QuestDetail.js';
import { MedalQuestInfo } from '../ui/game/MedalQuestInfo.js';
import { QuestReward } from '../ui/game/QuestReward.js';
import { KeyConfig, KeyAction } from '../ui/game/KeyConfig.js';
import { OptionMenu } from '../ui/game/OptionMenu.js';
import { SettingsStore } from '../settings/SettingsStore.js';
import { CharInfo } from '../ui/game/CharInfo.js';
import { NpcTalk, DialogType } from '../ui/game/NpcTalk.js';
import { Shop } from '../ui/game/Shop.js';
import { GameMenu } from '../ui/game/GameMenu.js';
import { Revive } from '../ui/game/Revive.js';
import { ListService } from '../localization/ListService.js';
import { StringPoolService } from '../localization/StringPoolService.js';
import { CashShopStage } from './CashShopStage.js';
import { Messenger } from '../ui/game/Messenger.js';
import { StatusMessenger } from '../ui/game/StatusMessenger.js';
import { TipOfTheDay } from '../character/TipOfTheDay.js';
import { UserList } from '../ui/game/UserList.js';
import { GuildBBS } from '../ui/game/GuildBBS.js';
import { FamilyWindow } from '../ui/game/FamilyWindow.js';
import { ChannelSelect } from '../ui/game/ChannelSelect.js';
import { QuickSlotConfig } from '../ui/game/QuickSlotConfig.js';
import { QuickSlotBar } from '../ui/game/QuickSlotBar.js';
import { ContextMenu, type ContextMenuEntry } from '../ui/ContextMenu.js';
import { FuncKeyType, FuncKeyMappedNone } from '../domain/FuncKeyMapped.js';
import { StatDetailInfo } from '../ui/game/StatDetailInfo.js';
import { GamePanel } from '../ui/game/GamePanel.js';
import { DragController, DragTarget } from '../ui/DragController.js';
import { BuiltInFont } from '../ui/BuiltInFont.js';
import { Notice } from '../ui/game/Notice.js';
import { UtilDlgEx, UtilDlgType } from '../ui/game/UtilDlgEx.js';
import { AntiMacroDialog } from '../ui/game/AntiMacroDialog.js';
import { QuitConfirmOverlay } from '../ui/QuitConfirmOverlay.js';
import { Trunk } from '../ui/game/Trunk.js';
import type { TrunkItem } from '../ui/game/Trunk.js';
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
import { KeyDownBar } from '../ui/game/KeyDownBar.js';
import { ComboDisplay } from '../ui/game/ComboDisplay.js';
import { EventAlarm } from '../ui/game/EventAlarm.js';
import { SkillGuide } from '../ui/game/SkillGuide.js';
import { QuestAlarm } from '../ui/game/QuestAlarm.js';
import { DojangHud } from '../ui/game/DojangHud.js';
import { computeBasicStat, defaultBasicStatInput, type BasicStatInput } from '../character/BasicStat.js';
import { ItemOptionLoader } from '../character/ItemOptionInfo.js';

export class GameStage extends Stage {
  protected _loader = new WzTextureLoader();
  protected _camera = new GameCamera();
  protected _player: CharLook | null = null;
  protected _npcs: NpcLook[] = [];
  protected _mobs = new Map<number, MobLook>();
  protected _reactors = new Map<number, ReactorLook>();
  protected _employees = new Map<number, EmployeeLook>();
  protected _summons = new Map<number, SummonedLook>();
  protected _townPortals = new Map<number, TownPortalLook>();
  protected _affectedAreas = new Map<number, AffectedAreaLook>();
  protected _openGates = new Map<string, OpenGateLook>();
  protected _mobCtl = new Map<number, MobController>();
  protected _mobInfoSvc: MobInfoService | null = null;
  protected _mobWz: WzPackage | null = null;
  protected _mobSoundWz: WzPackage | null = null;
  protected _mobSounds: MobSoundService | null = null;
  protected _diedMobIds = new Set<number>();
  private _currentBgm = '';
  /** Stored when SetField arrives before Map.wz finishes loading. */
  private _deferredFieldArgs: SetFieldArgs | null = null;
  protected _otherChars = new Map<number, OtherCharLook>();
  /** ponytail: couple-chair pairs. Key=charId, value={itemId, pairCharId}.
   *  Proximity tracking works; overlay rendering (heart zone, per-character
   *  effect) deferred — cosmetic, no gameplay impact. */
  private _couplePairs = new Map<number, { itemId: number; pairCharId: number }>();
  // OG: CUser::m_apPet[3] — index is petIdx (slot 0..2), holes allowed.
  protected _pets = new Map<number, (Pet | null)[]>();
  protected _dragons = new Map<number, DragonLook>();
  protected _drops: DropSprite[] = [];
  protected _dmgNumbers: DamageNumber | null = null;
  protected _shopMarker: ShopMarker | null = null;
  private _shopMarkerLayer: Container = new Container();
  protected _skillEffects: SkillEffectOverlay | null = null;
  private _skillEffectLayer: Container = new Container();
  protected _itemEffects: ItemEffectOverlay | null = null;
  private _itemEffectLayer: Container = new Container();
  private _skillScreenLayer: Container = new Container();
  private _projectiles = new ProjectileOverlay();
  private _projectileLayer: Container = new Container();
  /** couple-chair heart zone overlays: midpoint position + animation frames. */
  private _coupleHearts: { a: number; b: number; frames: AnimFrame[]; frameIndex: number; frameTimer: number; itemId: number }[] = [];
  private _coupleHeartLayer: Container = new Container();
  // OG: couple-chair pairing change callback — fires when a pair forms or breaks.
  // Server applies stat bonuses via TemporaryStat packets upon pairing.
  onCoupleChairPairChanged: ((paired: boolean, charId: number, pairCharId: number, itemId: number) => void) | null = null;
  /** One-shot field effects (e.g. Summon.img animations at world positions). */
  private _fieldFx: { frames: AnimFrame[]; frameIndex: number; frameTimer: number; x: number; y: number; done: boolean }[] = [];
  private _fieldFxLayer: Container = new Container();
  private _fearEffect = new FearEffect();

  // OG: CField::RestoreForbiddenSkill/RestoreAllowedItem — field restrictions
  private _forbiddenSkills: Set<number> | null = null;
  private _allowedItems: Set<number> | null = null;

  // OG: CField_Dojang::CanUseSpecialArts — dojang special arts flag
  private _dojangSpecialArts = false;
  private _limitedView = new LimitedViewOverlay();
  private _comboCounter = 0;
  private _keyDownBar = new KeyDownBar();
  private _comboDisplay = new ComboDisplay();
  private _buffVisual = new BuffVisualOverlay();
  private _buffVisualLayer: Container = new Container();
  // Mobs/NPCs/reactors were constructed, Update()d every tick, and tracked
  // in their respective maps, but nothing ever added their `.container` to
  // the scene graph or set its screen position from world position + camera
  // — same "fully wired except the final addChild" gap pass 14 already found
  // and fixed for EmotionBubble/TombstoneEffect/DamageNumber. Persistent
  // layer added to mapRoot once per field load (_onSetField), repopulated
  // every draw() call below.
  private _entityLayer: Container = new Container();

  protected _statusBar!: StatusBar;
  protected _chatBar = new ChatBar();
  private _chatTarget = 'all';
  private _chatTab = 0;
  protected _miniMap!: MiniMap;
  // OG: CUIMiniMap::InsertStalkee/RemoveStalkee — TODO_AUDIT.md
  // Sixty-ninth pass's `CUIMiniMap` finding. charId -> isLeader (from
  // PartyLoadArgs.bossId, the same boss-tracking data the UserList
  // party-panel crown indicator is still self-flagged as not using).
  protected _partyCharIds = new Map<number, boolean>();
  protected _buffList = new BuffList();
  protected _clock = new Clock();
  protected _killCountHud = new KillCountHud();
  protected _massacreGaugeHud = new MassacreGaugeHud();
  protected _questTimerHud = new QuestTimerHud();
  protected _fieldSubgameHud = new FieldSubgameHud();
  protected _monsterCarnival: MonsterCarnival | null = null;
  protected _slideNotice = new SlideNotice();
  protected _partyHPBar = new PartyHPBar();
  protected _equip!: EquipInventory;
  protected _item!: ItemInventory;
  protected _itemIcons: ItemIconLoader | null = null;
  protected _itemInfo: ItemInfoService | null = null;
  protected _stringPool: StringPoolService | null = null;
  protected _questDetail: QuestDetail | null = null;
  protected _skill!: SkillBook;
  protected _stats!: StatsInfo;
  protected _prevExp = -1; // track EXP delta for popup display
  protected _job = 0;
  protected _quest!: QuestLog;
  protected _medalQuestInfo = new MedalQuestInfo();
  protected _keyConfig!: KeyConfig;
  protected _skillIconCache: Map<number, WzSprite> = new Map();
  protected _optionMenu = new OptionMenu();
  protected _charInfo: CharInfo | null = null;
  protected _npcTalk = new NpcTalk();
  protected _shop: Shop | null = null;
  protected _trunk: Trunk | null = null;
  protected _messengerWin: Messenger | null = null;
  protected _gameMenu: GameMenu | null = null;
  protected _revivePanel: Revive | null = null;
  protected _userList = new UserList();
  protected _guildBBS = new GuildBBS();
  // OG: CConfig::IsInBlackList — TODO_AUDIT.md Eighty-second pass's
  // `CTabBlackList` finding. Local-only ignore list, not server state.
  protected _blackList = new Set<string>();
  protected _statusMessenger = new StatusMessenger();
  protected _tipOfTheDay = new TipOfTheDay();
  protected _eventAlarm = new EventAlarm();
  protected _skillGuide: SkillGuide | null = null;
  protected _questAlarm = new QuestAlarm();
  protected _dojangHud = new DojangHud();
  /** NPC idle-chat: per-NPC timer (seconds) before next potential speech. */
  private _npcChatTimer = 4;
  /** OG: pet auto-pickup scan interval (500ms). */
  private _petPickupTimer = 0;
  protected _familyWindow: FamilyWindow | null = null;
  protected _worldMap: WorldMap | null = null;
  protected _tournamentWindow: TournamentWindow | null = null;
  protected _ranking: Ranking | null = null;
  protected _monsterBook: MonsterBook | null = null;
  protected _memo: Memo | null = null;
  protected _battleRecord: BattleRecord | null = null;
  protected _titleWindow: TitleWindow | null = null;
  protected _maker: Maker | null = null;
  protected _adminShop: AdminShop | null = null;
  protected _storeBank: StoreBank | null = null;
  protected _characterSale: CharacterSale | null = null;
  protected _weddingWishList: WeddingWishList | null = null;
  protected _findFriend: FindFriend | null = null;
  protected _shopScanner: ShopScanner | null = null;
  protected _incubator: Incubator | null = null;
  protected _rpsGame: RPSGame | null = null;
  protected _logoutGift: LogoutGift | null = null;
  protected _parcel: Parcel | null = null;
  protected _wildHunterInfo: WildHunterInfo | null = null;
  protected _skillMacro: SkillMacro | null = null;
  protected _reset: Reset | null = null;
  protected _delivery: Delivery | null = null;
  protected _claim: Claim | null = null;
  protected _enchantSkill: EnchantSkill | null = null;
  protected _miracleCube: MiracleCube | null = null;
  protected _goldHammer: GoldHammer | null = null;
  protected _megaphoneCompose: MegaphoneCompose | null = null;
  protected _karmaScissors: KarmaScissors | null = null;
  protected _itemProtector: ItemProtector | null = null;
  protected _repair: Repair | null = null;
  protected _scrollDialog: ItemScrollDialog | null = null;
  protected _vegaDialog: VegaDialog | null = null;
  protected _partySearchDialog: PartySearchDialog | null = null;
  protected _questReward: QuestReward | null = null;
  protected _notice: Notice | null = null;
  private _utilDlg: UtilDlgEx | null = null;
  protected _antiMacroDialog: AntiMacroDialog | null = null;
  private _adminShopNpcTemplateId: number | null = null;
  protected _chatBalloon: ChatBalloonLayer | null = null;
  protected _tradingRoom: TradingRoom | null = null;
  protected _cashTradingRoom: CashTradingRoom | null = null;
  protected _personalShop: PersonalShop | null = null;
  protected _entrustedShop: EntrustedShop | null = null;
  protected _memoryGame: MemoryGame | null = null;
  protected _channelSelect: ChannelSelect | null = null;
  protected _quickSlotConfig: QuickSlotConfig | null = null;
  protected _quickSlots: QuickSlotBar | null = null;
  // TODO_AUDIT.md Ninety-seventh/Hundred-and-eighth passes — OG: IDraggable/
  // CWndMan::BeginDragDrop. Generic drag-and-drop, root-cause fix for the
  // several "dead wiring" bugs this client had (TryBindSkillAt, GuildCreate).
  protected _dragController = new DragController();
  protected _statDetailInfo: StatDetailInfo | null = null;
  protected _tombstone: TombstoneEffect | null = null;
  protected _quitOverlay: QuitConfirmOverlay | null = null;
  protected _contextMenu: ContextMenu | null = null;

  protected _panels: GamePanel[] = [];
  protected _fadePhase = 0;   // 0 idle, +1 fading to black, -1 fading in
  protected _fadeAlpha = 0;   // 0 = clear .. 1 = opaque black
  protected _pendingField: SetFieldArgs | null = null;
  private _fadeOverlay = new Graphics();

  protected _field: FieldScene | null = null;
  protected _mapWz: WzPackage | null = null;
  protected _characterWz: WzPackage | null = null;
  protected _itemWz: WzPackage | null = null;
  protected _baseWz: WzPackage | null = null;
  protected _skillWz: WzPackage | null = null;
  protected _uiWz: WzPackage | null = null;
  protected _effectWz: WzPackage | null = null;
  protected _npcWz: WzPackage | null = null;
  protected _reactorWz: WzPackage | null = null;
  protected _tamingMobWz: WzPackage | null = null;
  protected _morphWz: WzPackage | null = null;
  protected _etcWz: WzPackage | null = null;
  protected _questStates = new Map<number, number>();
  protected _pendingInviterId = 0;
  protected _hasPendingPartyInvite = false;
  protected _guildLoadSent = false;
  protected _friendLoadSent = false;
  /** Pending stat data from SetField — applied after _initMenu creates the statusBar. */
  private _pendingStat: CharacterStat | null = null;
  /** Pending equipped items from SetField — applied after _initMenu creates the equip panel. */
  private _pendingEquipped: { slot: number; item: any }[] | null = null;
  private _pendingEquippedCash: { slot: number; item: any }[] | null = null;
  protected _skillService: SkillInfoService | null = null;
  protected _skillRecords: { skillId: number; level: number; masterLevel: number }[] = [];
  // OG: CUser::AFTERIMAGEINFO — attack trail visual effect.
  // Registered after each attack, drawn as a fading afterimage sprite.
  private _afterimageInfo: {
    tStart: number; bLeft: boolean; nAction: number;
    sAfterimageUOL: string; sSfxUOL: string;
    weaponItemId: number; subWeaponItemId: number;
  } | null = null;
  // ponytail: summed mastery from all passive skills with WZ `level/N/mastery`.
  // Updated in _onSkillRecordResult; fed to StatDerivedInputs for damage preview.
  protected _masteryFromSkills = 0;
  // ponytail: ForcedStat values stored separately (OG SetFrom Phase 7).
  // Reset on ForcedStatReset; fed into computeBasicStat during stat sync.
  protected _forcedStat: { str: number; dex: number; int: number; luk: number; speed: number; jump: number } = { str: 0, dex: 0, int: 0, luk: 0, speed: 0, jump: 0 };
  // ponytail: ItemOptionLoader for option/socket WZ data — loaded from Item.nx
  protected _itemOptionLoader: ItemOptionLoader | null = null;
  // ponytail: per-body-part EquipStats from InventoryOperation — includes
  // per-instance stat lines (incStr etc.) and option/socket IDs for stat computation.
  protected _equipStats = new Map<number, EquipStats>();
  // OG: CUserLocal::ApplyWeaponOption — weapon item option combat modifiers
  // (critical prob/damage, DAMr, BossDAMr, IgnoreTargetDEF). Computed from
  // the weapon's ItemOption level data during stat sync, cached for attack use.
  // NOTE: actual fields moved to CUserLocal.ts — these are accessors for GameStage
  get weaponCritProb() { return CUserLocal.weaponCritProb; }
  get weaponCritDamage() { return CUserLocal.weaponCritDamage; }
  get weaponDAMr() { return CUserLocal.weaponDAMr; }
  get weaponBossDAMr() { return CUserLocal.weaponBossDAMr; }
  get weaponIgnoreTargetDEF() { return CUserLocal.weaponIgnoreTargetDEF; }
  // TODO_AUDIT.md Hundred-and-nineteenth pass: MACROSYSDATA — populated by
  // onMacroSysDataInit (opcode decoded in FieldHandlers.ts), consumed by
  // FuncKeyType.MacroSkill key dispatch and SkillMacro.Open.
  protected _macroSlots: MacroSlot[] = [];
  protected _questRecords: { questId: number; state: number }[] = [];
  protected _physics: PlayerController | null = null;
  protected _localCharId = 0;
  protected _pendingQuestId = 0;
  protected _pendingQuestNpcId = 0;
  protected _attackCooldown = 0;
  protected _comboKeys = new SequencedKeyMan();
  protected _comboClockMs = 0;
  protected _comboCount = 0;
  private _pendingBridle: { slot: number; id: number } | null = null;
  protected _isPlayerDead = false;
  protected _fieldKey = 0;
  private _isFieldTransferring = false;
  private _townPortalStatus = '';
  private _lastUnequipTime = 0;
  private _isRidingTamingMob = false;
  protected _mobNameOf: (id: number) => string = () => '';
  protected _itemNameOf: (id: number) => string = () => '';
  private _directionModeActive = false;

  private _bg: Graphics;

  constructor() {
    super();
    this._bg = new Graphics();
    this.uiRoot.addChild(this._bg);

    // Severe, confirmed bug (FIXED) — this array used to also list
    // `_statusBar`, `_miniMap`, `_equip`, `_item`, `_keyConfig`
    // (all declared with `!`, only ever assigned inside `_initMenu()`,
    // which doesn't run until the async `_loadWzAsync()` WZ load
    // completes) and `_questReward`/`_notice` (both `XXX | null = null`,
    // also only assigned inside `_initMenu()`). At the time THIS
    // constructor runs, all 7 of those fields are still `undefined`/`null`
    // — pushing them here put 7 undefined/null entries into `_panels`.
    // `onEnter()` (called synchronously, long before `_initMenu()` ever
    // gets a chance to run) immediately does
    // `for (const p of this._panels) this.uiRoot.addChild(p.container)`,
    // which would throw on the very first undefined/null entry — i.e. this
    // stage could never have actually been entered without crashing. Only
    // the panels that ARE constructed inline as field initializers
    // (`_chatBar`, `_buffList`, `_skill`, `_stats`, `_quest`, `_optionMenu`,
    // `_charInfo`, `_npcTalk`, `_shop`, `_userList`, `_statusMessenger`) are
    // real objects at this point — kept here. The other 7 are now pushed
    // from `_initMenu()` instead, once they actually exist (matching the
    // already-correct pattern the other ~25 `_initMenu`-constructed panels
    // already use at the `this._panels.push(...)` call below).
    this._panels = [
      this._chatBar, this._buffList, this._clock, this._slideNotice, this._partyHPBar, this._killCountHud, this._massacreGaugeHud, this._questTimerHud, this._medalQuestInfo, this._optionMenu, this._charInfo!,
      this._npcTalk, this._shop!,
      this._userList, this._statusMessenger, this._eventAlarm,
      this._equip, this._item, this._skill, this._stats, this._keyConfig, this._quest,
    ];
  }

  // PixiJS v8's `Container.addChild(...children)` reads `children[0].parent`
  // even when called with zero args, so `addChild(...[])` (an overlay that
  // rebuilt to no children — e.g. no projectiles at spawn) throws "parent of
  // undefined". Only spread when there's something to add.
  private _moveChildren(target: Container, source: Container): void {
    const kids = source.removeChildren();
    if (kids.length > 0) target.addChild(...kids);
  }

  draw(): void {
    const w = this.game.pixiApp.screen.width;
    const h = this.game.pixiApp.screen.height;
    this._bg.clear();

    if (this._field && this._camera) {
      // OG: all entities (players, mobs, NPCs, drops) layered into field's
      // 8 layer containers by foothold layer — mobs/NPCs no longer in a
      // separate top-level _entityLayer.
      this._field.UpdateEntities(this._otherChars, this._player, this._drops,
        this._mobs.values(), this._npcs, w, h);

      // Other entities (reactors, employees, summons, etc.) — still in
      // top-level _entityLayer for now (no Layer field yet).
      this._entityLayer.removeChildren();
      for (const reactor of this._reactors.values()) {
        const p = this._camera.WorldToScreen(reactor.Position.x, reactor.Position.y);
        reactor.container.position.set(p.x, p.y);
        this._entityLayer.addChild(reactor.container);
      }
      for (const emp of this._employees.values()) {
        const p = this._camera.WorldToScreen(emp.Position.x, emp.Position.y);
        emp.container.position.set(p.x, p.y);
        this._entityLayer.addChild(emp.container);
      }
      for (const s of this._summons.values()) {
        const p = this._camera.WorldToScreen(s.Position.x, s.Position.y);
        s.container.position.set(p.x, p.y);
        this._entityLayer.addChild(s.container);
      }
      for (const tp of this._townPortals.values()) {
        const p = this._camera.WorldToScreen(tp.Position.x, tp.Position.y);
        tp.container.position.set(p.x, p.y);
        this._entityLayer.addChild(tp.container);
      }
      for (const aa of this._affectedAreas.values()) {
        const p = this._camera.WorldToScreen(aa.Position.x, aa.Position.y);
        aa.container.position.set(p.x, p.y);
        this._entityLayer.addChild(aa.container);
      }
      for (const og of this._openGates.values()) {
        const p = this._camera.WorldToScreen(og.Position.x, og.Position.y);
        og.container.position.set(p.x, p.y);
        this._entityLayer.addChild(og.container);
      }
      for (const pets of this._pets.values()) {
        for (const pet of pets) {
          if (!pet) continue;
          const p = this._camera.WorldToScreen(pet.Position.x, pet.Position.y);
          pet.container.position.set(p.x, p.y);
          this._entityLayer.addChild(pet.container);
        }
      }
      for (const dragon of this._dragons.values()) {
        const p = this._camera.WorldToScreen(dragon.Position.x, dragon.Position.y);
        dragon.container.position.set(p.x, p.y);
        this._entityLayer.addChild(dragon.container);
      }

      this._dmgNumbers?.RebuildDisplay((wx, wy) => this._camera.WorldToScreen(wx, wy));
      if (this._shopMarker) {
        this._shopMarkerLayer.removeChildren();
        const rebuilt = this._shopMarker.RebuildDisplay(
          (name) => { for (const c of this._otherChars.values()) if (c.Name === name) return c.Position; return null; },
          (wx, wy) => this._camera.WorldToScreen(wx, wy),
        );
        this._moveChildren(this._shopMarkerLayer, rebuilt);
        rebuilt.destroy();
      }
      this._tombstone?.Draw((wx, wy) => this._camera.WorldToScreen(wx, wy));
      if (this._field.Info.FieldType === 9) {
        const points: { x: number; y: number }[] = [];
        if (this._physics) {
          points.push(this._camera.WorldToScreen(this._physics.Position.x, this._physics.Position.y - 35));
        }
        for (const ch of this._otherChars.values()) {
          points.push(this._camera.WorldToScreen(ch.Position.x, ch.Position.y - 35));
        }
        // TODO_AUDIT.md Hundred-and-seventy-fifth pass: CField_LimitedView
        // fieldType=9 draws a persistent black overlay with circles around users.
        this._limitedView.draw(points);
      } else {
        this._limitedView.hide();
      }
      this._chatBalloon?.Draw((charId) => {
        if (charId === this._localCharId && this._player) {
          const p = this._player.HeadPosition;
          return this._camera.WorldToScreen(p.x, p.y);
        }
        const other = this._otherChars.get(charId);
        if (other) {
          const p = other.HeadPosition;
          return this._camera.WorldToScreen(p.x, p.y);
        }
        const npc = this._npcs.find((n) => n.ObjId === charId);
        if (npc) {
          return this._camera.WorldToScreen(npc.Position.x, npc.Position.y + npc.HeadY);
        }
        return null;
      });
      if (this._skillEffects) {
        this._skillEffectLayer.removeChildren();
        const rebuilt = this._skillEffects.RebuildWorldDisplay((charId) => {
          if (charId === this._localCharId && this._physics) {
            const p = this._physics.Position;
            return { ...this._camera.WorldToScreen(p.x, p.y), facingLeft: this._physics.FacingLeft };
          }
          const other = this._otherChars.get(charId);
          return other ? { ...this._camera.WorldToScreen(other.Position.x, other.Position.y), facingLeft: other.FacingLeft } : null;
        });
        this._moveChildren(this._skillEffectLayer, rebuilt);
        rebuilt.destroy();

        this._skillScreenLayer.removeChildren();
        const rebuiltScreen = this._skillEffects.RebuildScreenDisplay({
          x: this.game.pixiApp.screen.width / 2,
          y: this.game.pixiApp.screen.height / 2,
        });
        this._moveChildren(this._skillScreenLayer, rebuiltScreen);
        rebuiltScreen.destroy();
      }
      if (this._itemEffects) {
        this._itemEffectLayer.removeChildren();
        const rebuilt = this._itemEffects.RebuildDisplay((charId) => {
          if (charId === this._localCharId && this._player) {
            const face = this._camera.WorldToScreen(this._player.HeadPosition.x, this._player.HeadPosition.y);
            const body = this._camera.WorldToScreen(this._player.NavelPosition.x, this._player.NavelPosition.y);
            return { face, body, facingLeft: this._player.FacingLeft };
          }
          const other = this._otherChars.get(charId);
          if (!other) return null;
          const face = this._camera.WorldToScreen(other.HeadPosition.x, other.HeadPosition.y);
          const body = this._camera.WorldToScreen(other.NavelPosition.x, other.NavelPosition.y);
          return { face, body, facingLeft: other.FacingLeft };
        });
        this._moveChildren(this._itemEffectLayer, rebuilt);
        rebuilt.destroy();
      }
      this._projectileLayer.removeChildren();
      const rebuiltProjectiles = this._projectiles.RebuildDisplay((wx, wy) => this._camera.WorldToScreen(wx, wy));
      this._moveChildren(this._projectileLayer, rebuiltProjectiles);
      rebuiltProjectiles.destroy();

      // Field-effect one-shot animations (subType 0 summon effects)
      this._fieldFxLayer.removeChildren();
      for (const fx of this._fieldFx) {
        if (fx.done) continue;
        const p = this._camera.WorldToScreen(fx.x, fx.y);
        const fi = Math.min(fx.frameIndex, fx.frames.length - 1);
        const sprite = fx.frames[fi].sprite.NewSprite(false);
        sprite.position.set(p.x, p.y);
        this._fieldFxLayer.addChild(sprite);
      }

      // Couple-chair heart overlays at midpoint
      this._coupleHeartLayer.removeChildren();
      for (const ch of this._coupleHearts) {
        const aChar = ch.a === this._localCharId ? this._player : this._otherChars.get(ch.a);
        const bChar = ch.b === this._localCharId ? this._player : this._otherChars.get(ch.b);
        if (!aChar || !bChar) continue;
        const mid = { x: (aChar.Position.x + bChar.Position.x) / 2, y: (aChar.Position.y + bChar.Position.y) / 2 - 20 };
        const sp = this._camera.WorldToScreen(mid.x, mid.y);
        const fi = Math.min(ch.frameIndex, ch.frames.length - 1);
        const sprite = ch.frames[fi].sprite.NewSprite(false);
        sprite.position.set(sp.x, sp.y);
        this._coupleHeartLayer.addChild(sprite);
      }
    }
  }

  onResize(windowW: number, windowH: number): void {
    this._camera.ViewWidth = windowW;
    this._camera.ViewHeight = windowH;
    this._equip?.onResize(windowW, windowH);
    this._item?.onResize(windowW, windowH);
    this._statusBar?.relayout(800, 600);
    this._chatBar?.relayout(windowW, windowH);
    this._quickSlots?.Relayout(800, 600);
    this._revivePanel?.Relayout(800, 600);
    this._fearEffect.onResize(windowW, windowH);
    this._limitedView.onResize(windowW, windowH);
    // OG: KeyDownBar/ComboDisplay — reposition on resize
    this._keyDownBar.container.position.set(windowW / 2, windowH - 40);
    this._comboDisplay.container.position.set(windowW - 80, 60);
  }

  onMouseMove(x: number, y: number): void {
    super.onMouseMove(x, y);
    for (const p of this._panels) (p as any)?.onMouseMove?.(x, y);
    this._gameMenu?.SetMouse(x, y);
    this._dragController.updatePosition(x, y);
  }

  onMouseWheel(x: number, y: number, deltaY: number): void {
    for (const p of this._panels) (p as any)?.onMouseWheel?.(x, y, deltaY);
  }

  onKeyPress(key: string): void {
    if (this._quitOverlay?.isVisible) { this._quitOverlay.onKeyPress?.(key); return; }
    if (this._gameMenu?.isVisible) { if (this._gameMenu.onKeyPress(key)) return; }
    for (let i = this._panels.length - 1; i >= 0; i--) {
      if (this._panels[i]?.isVisible && this._panels[i].onKeyPress(key)) return;
    }
    // TODO_AUDIT.md Hundred-and-nineteenth pass: FuncKeyType.Skill (1) and
    // FuncKeyType.MacroSkill (8) dispatch. OG: CUserLocal::UseFuncKeyMapped
    // (0x932e20) switch — case 1u calls UseSkill, case 8u calls
    // CMacroSysMan::DoActiveMacro(nID) which fires all non-zero slots in the
    // macro at index nID (0–4). _keyConfig may be null before _loadWzAsync.
    const fk = this._keyConfig?.forKey(key) ?? FuncKeyMappedNone;
    if (fk.type === FuncKeyType.Skill) {
      const rec = this._skillRecords.find((r) => r.skillId === fk.id);
      if (rec && rec.level > 0) this._skill.onSkillUse?.(rec.skillId, rec.level);
    } else if (fk.type === FuncKeyType.MacroSkill) {
      const slot = this._macroSlots[fk.id];
      if (slot) {
        if (slot.mute) {
          console.debug(`Macro [${fk.id}] muted — skipping cosmetic feedback`);
        }
        for (const skillId of slot.skills) {
          if (skillId !== 0) {
            const rec = this._skillRecords.find((r) => r.skillId === skillId);
            const slv = rec?.level ?? 0;
            if (slv > 0) this._skill.onSkillUse?.(skillId, slv);
          }
        }
      }
    } else if (fk.type === FuncKeyType.Menu) {
      // OG: CUserLocal::UseFuncKeyMapped — Menu type dispatch
      this._executeMenuAction(fk.id);
    }
    // Fallback: Pickup/Sit/Tab shortcuts from handleKeyDown
    this.handleKeyDown(key);
  }

  // OG: Menu ID → UI panel toggle (from CFuncKeyMappedMan / UseFuncKeyMapped)
  private _executeMenuAction(menuId: number): void {
    switch (menuId) {
      case 0:
        this._equip.isVisible = !this._equip.isVisible;
        if (this._equip.isVisible && !this._equip.container.parent) this.uiRoot.addChild(this._equip.container);
        break;
      case 1:
        this._item.isVisible = !this._item.isVisible;
        if (this._item.isVisible && !this._item.container.parent) this.uiRoot.addChild(this._item.container);
        break;
      case 2:
        this._stats.isVisible = !this._stats.isVisible;
        if (this._stats.isVisible) {
          if (!this._stats.container.parent) this.uiRoot.addChild(this._stats.container);
          this._stats.createTip11();
        } else {
          this._stats.destroyTip();
        }
        break;
      case 3: this._skill.isVisible = !this._skill.isVisible; break;           // Skills
      case 4: if (this._userList) this._userList.isVisible = !this._userList.isVisible; break; // Friends
      case 5: if (this._worldMap) this._worldMap.isVisible = !this._worldMap.isVisible; break; // WorldMap
      case 6: this._chatBar?.focus(); break;                                   // MapleChat
      case 7: this._miniMap.cycleMode(); break;                                // MiniMap toggle
      case 8: this._quest.isVisible = !this._quest.isVisible; break;           // QuestLog
      case 9: this._keyConfig.isVisible = !this._keyConfig.isVisible; break;   // KeyBindings
      case 10: this._chatBar?.focus(); break;                                  // Say
      case 11: this._chatBar?.focus(); break;                                  // Whisper
      case 12: this._chatBar?.setChatTarget(2); this._chatBar?.focus(); break; // PartyChat → party target
      case 13: this._chatBar?.setChatTarget(3); this._chatBar?.focus(); break; // FriendsChat → buddy target
      case 14: if (this._gameMenu) this._gameMenu.isVisible = !this._gameMenu.isVisible; break; // Game Menu
      case 15: if (this._quickSlotConfig) this._quickSlotConfig.isVisible = !this._quickSlotConfig.isVisible; break; // QuickSlots
      case 16: this._chatBar?.toggleChat(); break;                            // ToggleChat
      case 17: this._chatBar?.focus(); break;                                  // Guild
      case 18: this._chatBar?.setChatTarget(4); this._chatBar?.focus(); break; // GuildChat → guild target
      case 19: this._chatBar?.focus(); break;                                  // Party
      case 20: this._chatBar?.addLine('[Notifier] Not yet implemented.', 12); break; // Notifier
      case 21: this._chatBar?.setChatTarget(7); this._chatBar?.focus(); break; // SpouseChat → whisper target
      case 22: if (this.game.session.isConnected) { this.game.session.send(GameSender.MigrateToCashShop()); this.stageDirector.push(new CashShopStage(this._uiWz)); } break; // CashShop
      case 24: this._chatBar?.setChatTarget(5); this._chatBar?.focus(); break; // AllianceChat → alliance target
      case 25: break;                                                          // ManageLegion — no-op
      case 26: if (this._familyWindow) this._familyWindow.isVisible = !this._familyWindow.isVisible; break; // Family
      case 27: break;                                                          // BossParty — no-op
      case 29: this._chatBar?.focus(); break;                                  // ExpeditionChat
      case 44:
        if (this._charInfo) {
          this._charInfo.isVisible = !this._charInfo.isVisible;
          if (this._charInfo.isVisible && !this._charInfo.container.parent) this.uiRoot.addChild(this._charInfo.container);
        }
        break;
      case 45: if (this._channelSelect) this._channelSelect.isVisible = !this._channelSelect.isVisible; break; // ChangeChannel
      case 46: if (this._gameMenu) this._gameMenu.isVisible = !this._gameMenu.isVisible; break; // MainMenu
      case 47: this._takeScreenshot(); break;
    }
  }

  // OG: CUIStatusBar::OnScreenshot (screenshot to file) — capture the game
  // canvas as a PNG and trigger a browser download.
  private _takeScreenshot(): void {
    const renderer = this.game.pixiApp.renderer;
    renderer.extract.image(this.game.pixiApp.stage).then((img) => {
      const a = document.createElement('a');
      a.href = img.src;
      a.download = `MapleClaude_${Date.now()}.png`;
      a.click();
    }).catch(() => { /* screenshot failed silently */ });
  }

  onMouseButton(x: number, y: number, down: boolean, _button: MouseButton): void {
    // Dismiss context menu on any click
    if (this._contextMenu && down) {
      this._dismissContextMenu();
    }
    if (this._quitOverlay?.isVisible) {
      if (!down) return;
      this._quitOverlay.handleMouseButton(x, y, down);
      return;
    }
    if (this._gameMenu?.isVisible) {
      if (this._gameMenu.handleMouseButton(x, y, down)) return;
      if (down) { this._gameMenu.isVisible = false; return; }
    }
    if (!down && this._dragController.isDragging) {
      const payload = this._dragController.payload;
      const visible = this._panels.filter((p) => p?.isVisible).reverse() as unknown as DragTarget[];
      const claimed = this._dragController.endDrag(visible, x, y);
      // TODO_AUDIT.md item-drag-and-drop TODO: dragging a worn equip slot
      // with nothing claiming the drop (no upgrade/protect/scissors dialog
      // open) falls back to the original immediate-unequip behavior.
      if (!claimed && payload && typeof payload === 'object' && 'invType' in payload) {
        const p = payload as ItemDragPayload;
        const invType = p.invType;
        // TODO_AUDIT.md item-drag-and-drop TODO (drop-to-field): a real inventory
        // item (positive slotPos) released over the field — i.e. not over any
        // visible panel — is dropped, matching CDraggableItem::OnDropped when the
        // drop point lies outside every UI window. Worn slots (negative slotPos)
        // keep the unequip fallback below instead.
        if (p.slotPos > 0 && !this._pointOverVisiblePanel(x, y)) {
          // OG: ThrowItem shows quantity dialog for stackable items with quantity > 1
          const item = this._item.itemAt(invType, p.slotPos);
          const qty = item?.quantity ?? 1;
          if (qty > 1) {
            this._utilDlg?.SetUtilDlgEx(UtilDlgType.INPUT, 0, true, false);
            this._utilDlg?.SetUtilDlgEx_INPUT_STR(String(qty), 1, qty, false, 0);
            this._utilDlg!.onResult = (r) => {
              if (r.type === 'ok') {
                const amount = this._utilDlg!.GetInputNo_Result();
                if (amount > 0) this.game.session.send(GameSender.DropItem(invType, p.slotPos, amount));
              }
            };
            this._utilDlg?.show();
          } else {
            this.game.session.send(GameSender.DropItem(invType, p.slotPos, 1));
          }
        } else if (invType === InventoryType.Equip || invType === InventoryType.Cash) {
          const tab = invType === InventoryType.Equip ? 0 : 1;
          const free = this._item.firstFreeSlot?.(tab) ?? 0;
          if (free > 0) this.game.session.send(GameSender.ChangeSlotPosition(invType, p.slotPos, free, 1));
        }
      }
      return;
    }
    super.onMouseButton(x, y, down, _button);
    for (let i = this._panels.length - 1; i >= 0; i--) {
      const p = this._panels[i];
      if (!p?.isVisible) continue;
      // Try window drag first — if the click is in the title bar, move the
      // panel and consume the event before the panel's own handler sees it.
      const lx = x - p.container.x;
      const ly = y - p.container.y;
      if (p.beginDrag(lx, ly, down)) return;
      if (p.handleMouseButton(x, y, down)) return;
    }
    // Global mouse up for ChatBar scrollbar drag
    if (!down) {
      (this._chatBar as any)?.handleMouseButtonGlobal?.(x, y, down);
    }
    if (!down) {
      const world = this._camera.ScreenToWorld(x, y);
      const npc = this._npcs.find((n) => n.HitTest(world.x, world.y));
      if (npc) {
        const px = this._player?.Position.x ?? 0;
        const py = this._player?.Position.y ?? 0;
        this.game.session.send(GameSender.UserSelectNpc(npc.ObjId, px, py));
        return;
      }
      let other: OtherCharLook | null = null;
      for (const c of this._otherChars.values()) { if (c.HitTest(world.x, world.y)) { other = c; break; } }
      if (other) {
        if (_button === MouseButton.Right) {
          this._showPlayerContextMenu(other, x, y);
        } else {
          this.game.session.send(GameSender.UserCharacterInfoRequest(other.CharId));
        }
        return;
      }
      // Mob click: detect click on a mob for bridle item use
      if (_button === MouseButton.Left && this._pendingBridle) {
        let bestMob: MobLook | null = null;
        let bestDist = 40;
        for (const mob of this._mobs.values()) {
          const dx = world.x - mob.Position.x;
          const dy = world.y - (mob.Position.y - 30); // mob center is ~30px above feet
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < bestDist) { bestDist = d; bestMob = mob; }
        }
        if (bestMob) {
          const bridle = this._pendingBridle;
          this._pendingBridle = null;
          const pos = this._physics?.Position ?? { x: 0, y: 0 };
          this.game.session.send(GameSender.BridleItemUseRequest(bridle.slot, bridle.id, bestMob.TemplateId));
          return;
        }
      }
      // Click-to-pickup: find the nearest drop to the click point (OG allows
      // clicking a drop on the field to pick it up, not just the keybind).
      if (_button === MouseButton.Left && this._drops.length > 0) {
        let best: DropSprite | null = null;
        let bestDist = 30; // half the 20px icon + small margin
        for (const drop of this._drops) {
          const dx = world.x - drop.Position.x;
          const dy = world.y - drop.Position.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < bestDist) { bestDist = d; best = drop; }
        }
        if (best) {
          const pos = this._physics?.Position ?? this._player?.Position ?? { x: 0, y: 0 };
          this.game.session.send(GameSender.PickUpDrop(this._fieldKey, pos.x, pos.y, best.DropId));
        }
      }
    }
  }

  // OG: CUserLocal::HandleRButtonClk — right-click on another player shows context menu
  private _showPlayerContextMenu(target: OtherCharLook, screenX: number, screenY: number): void {
    // Dismiss any existing context menu
    this._dismissContextMenu();

    const name = target.Name || `Char#${target.CharId}`;
    const entries: ContextMenuEntry[] = [
      { label: 'Info', onClick: () => { this.game.session.send(GameSender.UserCharacterInfoRequest(target.CharId)); } },
      { label: 'Whisper', onClick: () => { this._chatBar?.setWhisperTarget(name); this._chatBar?.focus(); } },
      { separator: true },
      { label: 'Trade', onClick: () => { this.game.session.send(GameSender.MiniRoomCreateTrade()); } },
      { label: 'Party', onClick: () => { this.game.session.send(GameSender.PartyInvite(name)); } },
      { label: 'Guild', onClick: () => { this.game.session.send(GameSender.GuildJoin(target.CharId, name)); } },
    ];

    this._contextMenu = new ContextMenu();
    this._contextMenu.show(screenX, screenY, entries);
    this.uiRoot.addChild(this._contextMenu.container);
    this._panels.push(this._contextMenu);
  }

  private _dismissContextMenu(): void {
    if (this._contextMenu) {
      this._contextMenu.isVisible = false;
      const idx = this._panels.indexOf(this._contextMenu);
      if (idx >= 0) this._panels.splice(idx, 1);
      this._contextMenu.container.removeFromParent();
      this._contextMenu = null;
    }
  }

  onEnter(game: MapleClaudeGame): void {
    super.onEnter(game);
    game.bottomAlignFrame = true;
    game._updateFrameTransform();
    this._camera.ViewWidth = game.pixiApp.screen.width;
    this._camera.ViewHeight = game.pixiApp.screen.height;
    this._player = new CharLook(0);

    for (const p of this._panels) if (p) this.uiRoot.addChild(p.container);
    this.uiRoot.addChild(this._dojangHud.container);
    this.uiRoot.addChild(this._dragController.container);

    this._wireHandlers(game);
    // `_wireNames` dereferences `_item`/`_skill`/`_quest`/… which are only
    // constructed later in `_initMenu` (async, via `_loadWzAsync`). Calling it
    // here threw `this._item is undefined`, aborting the rest of onEnter — so
    // `_loadWzAsync` never ran, `_miniMap` never got built, and update() then
    // threw `_miniMap is undefined` every tick forever. Moved to run right
    // after `_initMenu` instead. (`_wireHandlers` only installs arrow-fn
    // callbacks that deref lazily, so it stays here safely.)

    this._quitOverlay = new QuitConfirmOverlay();
    this._quitOverlay.onYes = () => { this.game.pixiApp.destroy(); };
    this._quitOverlay.onNo = () => {};
    this.uiRoot.addChild(this._quitOverlay.container);

    this._loadWzAsync(game).catch((ex: unknown) => {
      console.warn('GameStage: async WZ load failed', ex);
    });
  }

  private async _loadWzAsync(game: MapleClaudeGame): Promise<void> {
    const dir = game.wzDir ?? '/wz_client';
    const open = (name: string) => WzPackage.OpenBaseAsync(dir, name);
    try {
      this._mapWz = game.wz.map ?? await open('Map');
    } catch (ex) { console.warn('Failed to open Map.wz', ex); }
    try {
      // Batch 1: core packages needed for gameplay — open in parallel
      const [mobWz, charWz, itemWz, baseWz, skillWz, uiWz, effectWz, npcWz] = await Promise.all([
        open('Mob'),
        game.wz.character ?? open('Character'),
        game.wz.item ?? open('Item'),
        game.wz.base ?? open('Base'),
        game.wz.skill ?? open('Skill'),
        game.wz.ui ?? open('UI'),
        open('Effect'),
        open('Npc'),
      ]);
      this._mobWz = mobWz;
      this._characterWz = charWz;
      this._itemWz = itemWz;
      this._baseWz = baseWz;
      this._skillWz = skillWz;
      this._uiWz = uiWz;
      this._effectWz = effectWz;
      this._npcWz = npcWz;
      this._mobInfoSvc = new MobInfoService(this._mobWz);
      this._mobSoundWz = game.wz.sound ?? await open('Sound');
      this._mobSounds = new MobSoundService(this._mobSoundWz, game.audioPlayer);

      // Batch 2: less critical packages — open in parallel
      const [reactorWz, tamingMobWz, morphWz, stringWz, questWz, etcWz] = await Promise.all([
        game.wz.reactor ?? open('Reactor'),
        game.wz.tamingMob ?? open('TamingMob'),
        game.wz.morph ?? open('Morph'),
        open('String'),
        open('Quest'),
        game.wz.etc ?? open('Etc'),
      ]);
      this._reactorWz = reactorWz;
      this._tamingMobWz = tamingMobWz;
      this._morphWz = morphWz;
      game.wz.string = stringWz;
      this._stringPool = new StringPoolService(() => game.wz.string ?? null);
      game.wz.quest = questWz;
      game.wz.etc = etcWz;
      this._tipOfTheDay.Load(game.wz.etc);
      // List has no `.nx` (only an undecryptable `.wz`); on the dev server a
      // missing `.nx` returns index.html → PKG4 error. Load best-effort so it
      // can't abort menu init — `listService` is currently unread elsewhere.
      try {
        game.wz.list = await open('List');
        game.listService = new ListService(game.wz.list);
      } catch (ex) { console.warn('List package unavailable — skipping ListService', ex); }
      this._skillService = new SkillInfoService(() => this._skillWz);
    } catch (ex) { console.warn('Failed to open WZ files', ex); }

    // Wire WZ packages into ActionMan singleton (OG CActionMan WZ refs)
    const actMan = ActionMan.GetInstance();
    actMan.SetMobWz(this._mobWz);
    actMan.SetNpcWz(this._npcWz);
    actMan.SetCharacterWz(this._characterWz);
    actMan.SetSkillWz(this._skillWz);
    actMan.SetMapWz(this._mapWz);
    actMan.SetSummonWz(this._skillWz); // Summoned uses Skill.wz
    actMan.Init();

    try { this._initMenu(this._uiWz!); } catch (ex) { console.warn('_initMenu failed', ex); }
    try { this._wireNames(game); } catch (ex) { console.warn('_wireNames failed', ex); }
    this._player?.Load(this._characterWz, this._itemWz, this._baseWz, this._loader);

    // Re-load entities that arrived before WZ packages were ready.
    for (const mob of this._mobs.values()) {
      if (!mob.Loaded) mob.Load(this._loader, this._mobWz);
    }
    for (const npc of this._npcs) {
      if (!npc.Loaded) npc.Load(this._loader, this._npcWz, (npcId, key) => this.game.nameService.NpcText(npcId, key));
      npc.LoadNames((npcId, key) => this.game.nameService.NpcText(npcId, key));
    }

    // Retry BGM now that Sound.wz is loaded — _applyFieldChange may have
    // fired before _mobSoundWz was available.
    if (this._field && this._field.Info.Bgm) {
      this._currentBgm = '';
      this._playMapBgm(this._field.Info.Bgm);
    }

    // Retry minimap data — _applyFieldChange may have fired before
    // _initMenu created _miniMap.
    if (this._field && this._miniMap) {
      const mapId = this._field.LoadedMapId;
      const mapName = this.game.nameService.MapShortName(mapId) ?? this.game.nameService.MapName(mapId) ?? `Map ${mapId}`;
      const streetName = this.game.nameService.MapStreetName(mapId) ?? '';
      this._miniMap.setMapData(this._field.MiniMap, mapName, streetName);
      this._miniMap.setPortals(
        Object.values(this._field.Portals).map((p) => ({ x: p.X, y: p.Y })),
      );
      // OG: m_nMiniMapType — read from field info (0=simple, 1=normal)
      this._miniMap.setMiniMapType(this._field.Info.MiniMapType as 0 | 1);
      this._miniMap.onPlayerDotClick = () => this.game.session.send(GameSender.UserMiniMapClick());
      this._miniMap.setFootholds(this._field.Footholds);
      this._miniMap.onBtWorldMap = () => {
        if (this._worldMap) this._worldMap.isVisible = !this._worldMap.isVisible;
      };
    }
  }

  private _initMenu(uiWz: WzPackage): void {
    const font = new BuiltInFont();
    this._itemIcons = new ItemIconLoader(this._loader, this._characterWz, this._itemWz);
     this._itemInfo = new ItemInfoService(this._characterWz, this._itemWz, this._tamingMobWz, this._morphWz, this._etcWz, this._skillWz);
    console.log(`[GameStage] ItemIconLoader created: charWz=${!!this._characterWz}, itemWz=${!!this._itemWz}`);
    this._itemOptionLoader = new ItemOptionLoader(this._itemWz);
    this._shopMarker = new ShopMarker(this._itemIcons);

    this._statusBar = new StatusBar(this._loader, uiWz, font);
    this._miniMap = new MiniMap(this._loader, uiWz, font);
    this._stats = new StatsInfo(this._loader, uiWz);
    this._charInfo = new CharInfo(this._loader, uiWz, this._characterWz, this._itemWz, this._baseWz, this._itemIcons);
    this._charInfo.itemNameOf = (id) => this.game.nameService?.ItemName(id) ?? `Item ${id}`;
    this._charInfo.mobNameOf = (id) => this.game.nameService?.MobName(id) ?? `Mob ${id}`;
    // Apply pending stat data AFTER stats panel is created
    if (this._pendingStat) {
      this._applyStatToStatusBar(this._pendingStat);
      this._pendingStat = null;
    }
    this._skill = new SkillBook(this._loader, uiWz, font, this._itemIcons,
      (id) => this.game.nameService.ItemDesc(id) ?? null,
      (id) => {
        const data = this._itemInfo?.GetSetItemTooltip(id);
        return data ? {
          name: data.name,
          effects: data.effects.map((e) => ({
            threshold: e.threshold,
            effect: e.effect as unknown as Record<string, number>,
          })),
        } : null;
      },
      (optionId, level) => {
        const entry = this._itemOptionLoader?.loadItemOption(optionId);
        if (!entry || entry.aLevelData.length === 0) return null;
        for (let i = entry.aLevelData.length - 1; i >= 0; i--) {
          if (entry.aLevelData[i].nLevel <= level) {
            return entry.aLevelData[i] as unknown as Record<string, number>;
          }
        }
        return entry.aLevelData[0] as unknown as Record<string, number>;
       }, this._itemInfo, this._stringPool);
    this._skillGuide = new SkillGuide(this._loader, uiWz);
    this._panels.push(this._skillGuide);
    this._keyConfig = new KeyConfig(this._loader, uiWz, font);
    this._questDetail = new QuestDetail(this._loader, uiWz, this._npcWz, font);
    this._quest = new QuestLog({ loader: this._loader, uiWz });
    this._quest.onSelectQuest = (id) => {
      const data = this.game.questInfoService?.Get(id) ?? null;
      const state = this._questStateOf(id);
      this._questDetail?.SetQuest(data, state);
    };
    this._medalQuestInfo.onSelectQuest = (id) => {
      const data = this.game.questInfoService?.Get(id) ?? null;
      const state = this._questStateOf(id);
      this._questDetail?.SetQuest(data, state);
    };
    this._questDetail.OnRemoteAccept = (id) => {
      const data = this.game.questInfoService?.Get(id);
      const npcId = data?.Start.Npc ?? 0;
      this.game.session.send(GameSender.QuestStartScript(id, npcId, 0, 0));
    };
    this._questDetail.OnResign = (id) => {
      this.game.session.send(GameSender.QuestResign(id));
      if (this._questDetail) this._questDetail.isVisible = false;
    };
    this._questDetail.OnFindNpc = (_id) => { /* future: focus camera on quest NPC */ };
    this.uiRoot.addChild(this._questDetail.container);
    this._optionMenu.loadWz(this._loader, uiWz);
    this._gameMenu = new GameMenu(this._loader, uiWz, font);
    this._gameMenu.onChannel = () => {
      if (!this._channelSelect) return;
      if (!this._channelSelect.isVisible) {
        const session = this.game.session;
        const world = session.worlds.find((w) => w.worldId === session.worldId);
        const channels = (world?.channels ?? []).map((c) => ({ channel: c.channelId, population: c.userCount }));
        this._channelSelect.setChannels(channels, session.channelId);
      }
      this._channelSelect.isVisible = !this._channelSelect.isVisible;
    };
    this._gameMenu.onSkin = () => { this._statDetailInfo && (this._statDetailInfo.isVisible = !this._statDetailInfo.isVisible); };
    this._gameMenu.onGameOption = () => { this._quickSlotConfig && (this._quickSlotConfig.isVisible = !this._quickSlotConfig.isVisible); };
    this._gameMenu.onSystemOption = () => { this._optionMenu.isVisible = !this._optionMenu.isVisible; };
    this._gameMenu.onQuit = () => { if (this._quitOverlay) this._quitOverlay.isVisible = true; };

    this._familyWindow = new FamilyWindow(this._loader, uiWz, font);
    this._familyWindow.onUsePrivilege = (idx) => { this.game.session.send(GameSender.UseFamilyPrivilege(idx)); };
    // TODO_AUDIT.md Hundred-and-twenty-ninth pass: SetFamilyPrecept — deferred from Pass 102.
    this._familyWindow.onSetPrecept = (text) => { this.game.session.send(GameSender.SetFamilyPrecept(text)); };
    this._channelSelect = new ChannelSelect({ loader: this._loader, uiWz });
    this._channelSelect.onChannelChange = (ch) => { this.game.session.send(GameSender.TransferChannel(ch)); };
    this._quickSlotConfig = new QuickSlotConfig(this._loader, uiWz, font);
    this._keyConfig.onOpenQuickSlot = () => { this._quickSlotConfig!.isVisible = !this._quickSlotConfig!.isVisible; };
    this._keyConfig.skillIconResolver = (skillId) => this._skillIcon(skillId);
    this._keyConfig.itemIconResolver = (itemId) => this._itemIcons?.LoadIcon(itemId) ?? null;
    this._keyConfig.onSaveToServer = (changed) => {
      this.game.session.send(GameSender.FuncKeyMappedModified(changed.map((c) => ({ keyIndex: c.index, type: c.fk.type, actionId: c.fk.id }))));
    };
    this._quickSlotConfig.OnOpenKeyConfig = () => { this._keyConfig.isVisible = true; };
    this._quickSlots = new QuickSlotBar(
      this._loader, uiWz, font,
      (scancode) => this._keyConfig.bindingAt(scancode),
      (scancode, skillId) => this._keyConfig.bindSkillToKey(scancode, skillId),
      (skillId) => this._skillIcon(skillId),
      (itemId) => this._itemIcons?.LoadIcon(itemId) ?? null,
      (skillId) => this._skill.cooldownOf(skillId),
      (itemId) => this._isStateChangeItem(itemId),
      (itemId, invType) => this._isBindableItem(itemId, invType),
      () => this._itemIcons?.GetCashTag() ?? null,
      (itemId) => this._item.countItem(itemId),
    );
    this._quickSlots.bindItemToKey = (scancode, itemId) => this._keyConfig.bindItemToKey(scancode, itemId);
    this.uiRoot.addChild(this._quickSlots.container);
    this._quickSlots.Relayout(this.game.pixiApp.screen.width, this.game.pixiApp.screen.height);
    this._statDetailInfo = new StatDetailInfo(this._loader, uiWz, font);
    this._trunk = new Trunk(this._loader, uiWz, font);
    this._trunk.OnWithdraw = (invType, position) => {
      this.game.session.send(GameSender.TrunkWithdraw(invType, position));
    };
    this._trunk.OnDeposit = (position, itemId, count) => {
      this.game.session.send(GameSender.TrunkDeposit(position, itemId, count));
    };
    this._trunk.OnSort = () => { this.game.session.send(GameSender.TrunkSort()); };
    this._trunk.OnClosed = () => { this.game.session.send(GameSender.TrunkClose()); };
    this._trunk.OnWithdrawMoney = (amount) => { this.game.session.send(GameSender.TrunkWithdrawMoney(amount)); };
    this._trunk.OnDepositMoney = (amount) => { this.game.session.send(GameSender.TrunkDepositMoney(amount)); };

    this._messengerWin = new Messenger(this._loader, uiWz, font);
    this._messengerWin.onClosed = () => { this.game.session.send(GameSender.MessengerLeave()); };

    this._equip = new EquipInventory({
      loader: this._loader,
      uiWz,
      font,
      icons: this._itemIcons,
       descOf: (id) => this.game.nameService.ItemDesc(id) ?? null,
        setItemOf: (id) => {
          const data = this._itemInfo?.GetSetItemTooltip(id);
          return data ? { name: data.name, effects: data.effects.map((e) => ({ threshold: e.threshold, effect: e.effect as unknown as Record<string, number> })) } : null;
        },
       optionOf: (optionId, level) => {
          const entry = this._itemOptionLoader?.loadItemOption(optionId);
          if (!entry || entry.aLevelData.length === 0) return null;
          for (let i = entry.aLevelData.length - 1; i >= 0; i--) {
            if (entry.aLevelData[i].nLevel <= level) return entry.aLevelData[i] as unknown as Record<string, number>;
          }
          return entry.aLevelData[0] as unknown as Record<string, number>;
       },
       itemInfo: this._itemInfo,
       strings: this._stringPool,
       });
    // Apply pending equipped items if _onSetField ran before _initMenu
    this._applyPendingEquipped();
    this._syncEquipPetCount();
    this._item = new ItemInventory({
      loader: this._loader,
      uiWz,
      font,
      icons: this._itemIcons,
      descOf: (id) => this.game.nameService.ItemDesc(id) ?? null,
      setItemOf: (id) => {
        const data = this._itemInfo?.GetSetItemTooltip(id);
        return data ? {
          name: data.name,
          effects: data.effects.map((e) => ({
            threshold: e.threshold,
            effect: e.effect as unknown as Record<string, number>,
          })),
        } : null;
      },
       optionOf: (optionId, level) => {
        const entry = this._itemOptionLoader?.loadItemOption(optionId);
        if (!entry || entry.aLevelData.length === 0) return null;
        for (let i = entry.aLevelData.length - 1; i >= 0; i--) {
          if (entry.aLevelData[i].nLevel <= level) {
            return entry.aLevelData[i] as unknown as Record<string, number>;
          }
        }
        return entry.aLevelData[0] as unknown as Record<string, number>;
       },
       itemInfo: this._itemInfo,
       strings: this._stringPool,
     });
    this._equip.onUnequip = (bodyPart) => {
      // OG: CDraggableItem::GetOffEquipItem precondition checks
      // 1. HP must be > 0 (can't unequip while dead)
      if ((this._stats.hp ?? 0) <= 0) return;
      // 2. 500ms cooldown between unequips
      const now = Date.now();
      if (now - this._lastUnequipTime < 500) return;
      this._lastUnequipTime = now;
      // 3. If riding tamed mob, cancel ride buff first (skillId 20021054)
      //    OG: SendSkillCancelRequest(20021054) then proceed with unequip
      if (this._isRidingTamingMob) {
        this.game.session.send(GameSender.SkillCancelRequest(20021054));
        this._isRidingTamingMob = false;
      }
      const free = this._item.firstFreeSlot?.(0) ?? 0;
      if (free <= 0) {
        console.warn('Cannot unequip: no free slot in Equip tab');
        return;
      }
      this.game.session.send(GameSender.ChangeSlotPosition(InventoryType.Equip, -bodyPart, free, 1));
    };
    // TODO_AUDIT.md item-drag-and-drop TODO: feeds the already-built but
    // never-reachable GoldHammer/KarmaScissors/ItemProtector dialogs
    // (CUIItemUpgrade::PutItem/CUIKarmaDlg::PutItem/CUIItemProtector::PutItem).
    // Falls back to onUnequip's immediate-unequip behavior above when no
    // such dialog is open to claim the drop (see onMouseButton's drag-end
    // handling).
    this._equip.onDragStart = (payload, texture, x, y) => { this._dragController.beginDrag(payload, texture, x, y); };
    // OG: CDraggableItem::WearEquipItem — equip from inventory via drag-drop
    this._equip.onEquipDrop = (invType, invSlot, bodyPart) => {
      this.game.session.send(GameSender.ChangeSlotPosition(invType, invSlot, -bodyPart, 1));
    };
    // OG: CDraggableItem::GetOffEquipItem — unequip worn item to inventory
    this._equip.onUnequipToInventory = (invType, bodyPart, invSlot) => {
      this.game.session.send(GameSender.ChangeSlotPosition(invType, -bodyPart, invSlot, 1));
    };
    this._equip.onCashShop = () => {
      if (this.game.session.isConnected) this.game.session.send(GameSender.MigrateToCashShop());
      this.stageDirector.push(new CashShopStage(this._uiWz));
    };
    this._item.onDragStart = (payload, texture, x, y) => { this._dragController.beginDrag(payload, texture, x, y); };
    // OG: CDraggableItem::GetOffEquipItem — accept worn equip dropped onto inventory
    this._item.onUnequipToInventory = (invType, bodyPart, invSlot) => {
      this.game.session.send(GameSender.ChangeSlotPosition(invType, -bodyPart, invSlot, 1));
    };
    // OG: CDraggableItem::MoveItemSlot — same-panel reorder via drag.
    // Sends ChangeSlotPositionRequest(m_nItemTI, fromSlot, toSlot, -1).
    this._item.onMoveItemSlot = (invType, fromSlot, toSlot) => {
      this.game.session.send(GameSender.ChangeSlotPosition(invType, fromSlot, toSlot, -1));
    };
    this._item.onEquipItem = (item) => {
      const bodyPart = GameStage._equipBodyPart(item.id);
      if (bodyPart <= 0) {
        console.warn(`Cannot equip: unknown body part for itemId=${item.id}`);
        return;
      }
      this.game.session.send(GameSender.ChangeSlotPosition(InventoryType.Equip, item.slot, -bodyPart, 1));
    };
    this._item.onActivateCashItem = (item) => {
      // Pet item IDs (5000000-5999999): equip to first free PetWear slot
      if (item.id >= 5000000 && item.id < 6000000) {
        const petIds = this._player?.AvatarLook?.petIds ?? [0, 0, 0];
        const slot = petIds[0] === 0 ? 52 : petIds[1] === 0 ? 53 : 54;
        this.game.session.send(GameSender.ChangeSlotPosition(InventoryType.Cash, item.slot, -slot, 1));
        return;
      }
      this._dispatchCashItem(item.slot, item.id, item.name);
    };
    // OG: CUIItem::OnButtonClicked(0x7D7) — CashShop button sends
    // SendMigrateToShopRequest with subId based on m_nItemTI:
    // tab 0(Equip)→50200093, tab 1(Use)→50200094, tab 2(Setup)→50200095
    this._item.onCashShop = (itemTI: number) => {
      if (this.game.session.isConnected) this.game.session.send(GameSender.MigrateToCashShop());
      this.stageDirector.push(new CashShopStage(this._uiWz));
    };
    this._item.onDropMoney = () => {
      // OG: OnDropMoney shows CUtilDlgEx with type=2 (numeric input), max=min(money, 50000)
      const maxMeso = Math.min(this._item?.getMeso() ?? 0, 50000);
      this._utilDlg?.SetUtilDlgEx(UtilDlgType.INPUT, 0, true, false);
      this._utilDlg?.SetUtilDlgEx_INPUT_STR(String(maxMeso), 1, maxMeso, false, 0);
      this._utilDlg!.onResult = (r) => {
        if (r.type === 'ok') {
          const amount = this._utilDlg!.GetInputNo_Result();
          if (amount > 0) this.game.session.send(GameSender.DropMoney(amount));
        }
      };
      this._utilDlg?.show();
    };
    // OG: OnGather/OnSort send m_nItemTI (server invType, not visual tab)
    this._item.onGather = (invType) => {
      if (this.game.session.isConnected) this.game.session.send(GameSender.GatherItemRequest(Date.now(), invType));
    };
    this._item.onSort = (invType) => {
      if (this.game.session.isConnected) this.game.session.send(GameSender.SortItemRequest(Date.now(), invType));
    };
    // OG: CUIItem::ItemRelease → CWvsContext::SendItemReleaseRequest(useSlot, equipSlot)
    this._item.onItemRelease = (useSlot: number, equipSlot: number) => {
      if (this.game.session.isConnected) this.game.session.send(GameSender.ItemReleaseRequest(useSlot, equipSlot));
    };
    // Shift+click: split stackable items — find first empty slot and move qty items there
    this._item.onSplitItem = (item, qty) => {
      if (!this.game.session.isConnected) return;
      const freeSlot = this._item.firstFreeSlot?.(item.tab) ?? 0;
      if (freeSlot <= 0) { console.warn('No free slot to split item'); return; }
      this.game.session.send(GameSender.ItemSplit(item.tab + 1, item.slot, freeSlot, qty));
    };

    this._revivePanel = new Revive(this._loader, uiWz, font);
    this._revivePanel.OnRevive = (premium) => {
      if (this._isPlayerDead) {
        this._isPlayerDead = false;
        this.game.session.send(GameSender.Revive(this._fieldKey, premium));
      }
    };

    this._dmgNumbers = new DamageNumber();
    this._dmgNumbers.setDamageDigits(new DamageDigits(this._effectWz, this._loader));

    this._skillEffects = new SkillEffectOverlay(this._loader);
    this._itemEffects = new ItemEffectOverlay(this._loader, this._characterWz, this._effectWz);
    this.uiRoot.addChild(this._skillScreenLayer);
    this.uiRoot.addChild(this._fearEffect.container);
    this.uiRoot.addChild(this._limitedView.container);
    this.uiRoot.addChild(this._fieldSubgameHud.container);
    // OG: KeyDownBar + ComboDisplay — fixed-position HUD overlays
    this._keyDownBar.container.position.set(
      this.game.pixiApp.screen.width / 2,
      this.game.pixiApp.screen.height - 40,
    );
    this.uiRoot.addChild(this._keyDownBar.container);
    this._comboDisplay.container.position.set(
      this.game.pixiApp.screen.width - 80,
      60,
    );
    this.uiRoot.addChild(this._comboDisplay.container);

    this._tombstone = new TombstoneEffect(this._effectWz, this._mobSoundWz, this._loader, this.game.audioPlayer);
    // `_isPlayerDead` is already set the instant HP hits 0 (see _onStatChanged
    // below); the revive prompt itself only opens once the tombstone-fall
    // animation actually finishes landing, matching the real client's flow.
    this._tombstone.OnLanded = () => { this._revivePanel?.Open(); };

    this._worldMap = new WorldMap(this._loader, this._mapWz);
    // TODO_AUDIT.md 150th pass: click a map ID row in the transfer list to teleport.
    this._worldMap.onTeleportToMap = (mapId) => {
      this.game.session.send(GameSender.MapTransferRequest(0, true, mapId));
    };
    this._tournamentWindow = new TournamentWindow();
    this._ranking = new Ranking(this._loader, uiWz, font);
    this._monsterBook = new MonsterBook(this._loader, uiWz, font);
    this._memo = new Memo(this._loader, uiWz, font);
    this._battleRecord = new BattleRecord(this._loader, uiWz, font);
    this._titleWindow = new TitleWindow(this._loader, uiWz, font);
    this._maker = new Maker(this._loader, uiWz, font);
    // OG: CUIItemMaker::RequestItemMake (decompile/7d58d0.c) sends opcode 125
    // — confirmed real, but the payload shape branches on m_nRecipeClass
    // (1/2: gem+catalyst slots, 3/4: disassemble item) and needs gem/
    // catalyst/disassemble-target state this panel doesn't model yet (it
    // only tracks a recipe id). Sending now would be a guessed/malformed
    // packet, not a verified one — left log-only on purpose.
    this._maker.OnStart = (_recipeId) => {}; // TODO_AUDIT.md Hundred-and-fifty-sixth pass: OG-confirmed blocked — payload branches on m_nRecipeClass, no-op until modeled
    this._adminShop = new AdminShop(this._loader, uiWz);
    this._adminShop.onReopen = (npcTemplateId) => {
      this._adminShopNpcTemplateId = npcTemplateId;
      this.game.session.send(GameSender.AdminShopReopen(npcTemplateId));
    };
    this._shop = new Shop(this._loader, uiWz);
    this._storeBank = new StoreBank();
    this._storeBank.onGetAllConfirm = () => { this.game.session.send(GameSender.StoreBankGetAllConfirm()); };
    this._characterSale = new CharacterSale();
    this._characterSale.onCheckName = (name) => { this.game.session.send(GameSender.CharacterSaleCheckId(name)); };
    this._weddingWishList = new WeddingWishList();
    this._weddingWishList.onGetItem = (tab, idx) => { this.game.session.send(GameSender.WeddingWishListGetItem(tab, idx)); };
    this._findFriend = new FindFriend();
    this._findFriend.onMyInfo = () => { this.game.session.send(GameSender.FindFriendMyInfoRequest()); };
    this._findFriend.onSearch = () => { this.game.session.send(GameSender.FindFriendSearchRequest()); };
    this._shopScanner = new ShopScanner();
    this._incubator = new Incubator();
    this._rpsGame = new RPSGame();
    this._rpsGame.onSendPacket = (subOpcode: number, data?: number) => {
      switch (subOpcode) {
        case 0: this.game.session.send(GameSender.RPSGameStart()); break;
        case 1: this.game.session.send(GameSender.RPSGameSelection(data ?? 0)); break;
        case 2: this.game.session.send(GameSender.RPSGameTimeout()); break;
        case 3: this.game.session.send(GameSender.RPSGameContinue()); break;
        case 4: this.game.session.send(GameSender.RPSGameExit()); break;
        case 5: this.game.session.send(GameSender.RPSGameRetry()); break;
      }
    };
    this._logoutGift = new LogoutGift();
    this._parcel = new Parcel();
    this._wildHunterInfo = new WildHunterInfo();
    this._monsterCarnival = new MonsterCarnival(this._loader, uiWz);
    // OG: CUIMonsterCarnival loads guard/minion/special items from WZ
    // WZ: UIWindow2.img/MonsterCarnival/ has tab-specific item lists
    if (uiWz) {
      const carnProp = uiWz.GetItem('UIWindow2.img/MonsterCarnival') as any;
      if (carnProp) {
        for (const tab of ['guard', 'minion', 'special']) {
          const tabNode = carnProp.Get?.(tab);
          if (tabNode) {
            const items: any[] = [];
            const keys = tabNode.Items ? Object.keys(tabNode.Items) : [];
            for (const key of keys) {
              const itemProp = tabNode.Get?.(key);
              if (itemProp) {
                const itemId = typeof itemProp.Get?.('item') === 'number' ? itemProp.Get('item') : 0;
                const cost = typeof itemProp.Get?.('cost') === 'number' ? itemProp.Get('cost') : 0;
                const name = this.game.nameService.ItemName(itemId) ?? `Item ${itemId}`;
                items.push({ index: items.length, itemId, name, cost, icon: this._itemIcons?.LoadIcon(itemId) ?? null });
              }
            }
            this._monsterCarnival.setItems(tab === 'guard' ? 0 : tab === 'minion' ? 1 : 2, items);
          }
        }
      }
    }
    this._skillMacro = new SkillMacro(this._loader, uiWz, font);
    // TODO_AUDIT.md Hundred-and-nineteenth pass: OnSave also updates _macroSlots
    // so the in-memory state stays consistent with what was just sent to the server.
    this._skillMacro.OnSave = (macros) => {
      for (const m of macros) {
        const s = this._macroSlots[m.slot];
        if (s) this._macroSlots[m.slot] = { ...s, skills: [m.skills[0] ?? 0, m.skills[1] ?? 0, m.skills[2] ?? 0] };
      }
      this.game.session.send(GameSender.SkillMacroFlushToSvr(macros));
    };
    this._reset = new Reset(this._loader, uiWz, font);
    this._delivery = new Delivery(this._loader, uiWz, font);
    // OG: CUIQuestDelivery::OnButtonClicked (decompile/81f4e0.c) sends no
    // packet at all on confirm — it resolves the target NPC locally and
    // calls CUserLocal::TalkToNpc, i.e. this is an NPC-script-driven flow,
    // not a raw network send. Wiring it correctly means going through the
    // existing NPC-talk subsystem (NpcTalk.ts), not GameSender.
    this._delivery.OnSendItem = (_slot) => {}; // TODO_AUDIT.md Hundred-and-fifty-sixth pass: OG-confirmed no packet — NPC-script-driven flow via TalkToNpc
    this._claim = new Claim(this._loader, uiWz, font);
    // OG: CUIClaimPreNotice::OnButtonClicked (decompile/77f060.c) only calls
    // SetRet — no packet send on confirm, it's a local pre-notice gate.
    this._claim.OnConfirm = () => {};
    this._questReward = new QuestReward(this._loader, uiWz, font);
    this._questReward.OnSelect = (rewardIndex, _itemId) => {
      const npcId = this._pendingQuestNpcId;
      const x = this._player?.Position.x ?? 0;
      const y = this._player?.Position.y ?? 0;
      this.game.session.send(GameSender.QuestComplete(this._pendingQuestId, npcId, x, y, rewardIndex));
    };
    this._notice = new Notice();
    this.uiRoot.addChild(this._notice.container);
    this._utilDlg = new UtilDlgEx({ uiWz: this.game.wz.ui, npcWz: this._npcWz, loader: this._loader });
    this.uiRoot.addChild(this._utilDlg.container);
    this._antiMacroDialog = new AntiMacroDialog();
    this.uiRoot.addChild(this._antiMacroDialog.container);
    this._antiMacroDialog.onSubmit = (answer) => {
      this.game.session.send(GameSender.AntiMacroAnswerRequest(answer));
    };
    this._enchantSkill = new EnchantSkill(this._loader, uiWz, font);
    // OG: CUIEnchantDlg (decompile/7a1b30.c ctor, 7a1200.c PutItem,
    // 7a07a0.c OnButtonClicked) — traced the whole chain (ctor -> PutItem
    // -> CUserLocal::DoEnchantSkill at 93a5c0.c -> caller 0x9445b0) and none
    // of it calls SendPacket; the real send happens further up that call
    // chain than this dump resolves. Left log-only rather than guess.
    this._enchantSkill.OnEnchant = (_slot) => {}; // TODO_AUDIT.md Hundred-and-fifty-sixth pass: OG-confirmed blocked — real send site beyond this dump's resolve depth
    this._miracleCube = new MiracleCube(this._loader, uiWz, font);
    // MiracleCube's OG UI class has no symbols in Maplestory95.exe.map at
    // all (not even RTTI) — unlike GoldHammer/KarmaScissors it isn't a
    // confirmed ICF-fold of the CUIKarmaDlg family, and MiracleCube.ts
    // doesn't carry ScrollPos/TargetItemTI/TargetSlotPosition fields the
    // way GoldHammer/KarmaScissors/ItemProtector do. Left log-only.
    this._miracleCube.OnConfirm = () => {}; // TODO_AUDIT.md Hundred-and-fifty-sixth pass: no OG symbols — send path unconfirmed
    this._miracleCube.OnCancel = () => {}; // TODO_AUDIT.md Hundred-and-fifty-sixth pass: no OG symbols — send path unconfirmed
    // OG: CUIItemUpgrade/CUIItemProtector/CUIKarmaDlg all share opcode 85
    // (UserConsumeCashItemUseRequest) — see GameSender.ItemUpgradeApply's
    // doc comment. The send path below is real; the open-trigger (which
    // equip slot is the drop target) is not — no drag-drop wiring calls
    // `setTarget` yet, so these still only fire with whatever was last set.
    this._goldHammer = new GoldHammer(this._loader, uiWz, font);
    this._goldHammer.OnConfirm = () => {
      const gh = this._goldHammer!;
      this.game.session.send(GameSender.ItemUpgradeApply(gh.ScrollPos, gh.ScrollItemId, gh.TargetItemTI, gh.TargetSlotPosition, Date.now(), Date.now()));
    };
    this._goldHammer.OnCancel = () => {};
    this._scrollDialog = new ItemScrollDialog(this._loader, uiWz, font);
    this._scrollDialog.OnUpgrade = (scrollPos, scrollItemId, targetItemTI, targetSlotPos) => {
      this.game.session.send(GameSender.ItemUpgradeApply(scrollPos, scrollItemId, targetItemTI, targetSlotPos, Date.now(), Date.now()));
    };
    this._scrollDialog.OnClose = () => {};
    this._partySearchDialog = new PartySearchDialog();
    this._partySearchDialog.onSearch = (questId) => {
      this.game.session.send(GameSender.PartyAdverRequest(questId));
    };
    this._partySearchDialog.onRegister = (questId, title) => {
      this.game.session.send(GameSender.PartyAdverRegisterCommit(questId, title));
    };
    this._partySearchDialog.onApply = (partyId) => {
      this.game.session.send(GameSender.PartyAdverApplyResponse(10, partyId));
    };
    this._karmaScissors = new KarmaScissors(this._loader, uiWz, font);
    this._karmaScissors.OnConfirm = () => {
      const ks = this._karmaScissors!;
      this.game.session.send(GameSender.KarmaApply(ks.ScrollPos, ks.ScrollItemId, ks.TargetItemTI, ks.TargetSlotPosition, Date.now()));
    };
    this._karmaScissors.OnCancel = () => {};
    this._itemProtector = new ItemProtector(this._loader, uiWz, font);
    this._itemProtector.OnConfirm = () => {
      const ip = this._itemProtector!;
      this.game.session.send(GameSender.ItemProtectorApply(ip.ScrollPos, ip.ScrollItemId, ip.TargetItemTI, ip.TargetSlotPosition, Date.now(), Date.now()));
    };
    this._itemProtector.OnCancel = () => {};
    this._repair = new Repair(this._loader, uiWz, font);
    this._repair.OnRepair = (slot) => { this.game.session.send(GameSender.RepairDurability(slot)); };
    this._repair.OnRepairAll = () => { this.game.session.send(GameSender.RepairDurabilityAll()); };
    this._repair.OnClosed = () => {};
    // TODO_AUDIT.md Hundred-and-seventeenth pass: CItemSpeakerDlg megaphone
    // compose — sender confirmed (opcode 85 shape from 0x5c9e70 decompile).
    this._megaphoneCompose = new MegaphoneCompose();
    this._megaphoneCompose.OnSend = (invPos, itemId, message, isWhisper) => {
      this.game.session.send(GameSender.MegaphoneCompose(invPos, itemId, message, isWhisper));
    };

    this._vegaDialog = new VegaDialog(this._loader, uiWz, font, this._mobSoundWz, this.game.audioPlayer);
    this._vegaDialog.OnEnhance = (equipItemTI, equipSlotPos, scrollItemTI, scrollSlotPos, whiteScrollUse, cashPos, cashItemId) => {
      this.game.session.send(GameSender.VegaApply(cashPos, cashItemId, equipItemTI, equipSlotPos, scrollItemTI, scrollSlotPos, whiteScrollUse));
    };
    this._vegaDialog.OnClose = () => {};

    this._tradingRoom = new TradingRoom(this._loader, uiWz, font);
    this._tradingRoom.OnTrade = () => { this.game.session.send(GameSender.TradeConfirm()); };
    this._tradingRoom.OnCancel = () => { this.game.session.send(GameSender.MiniRoomLeave()); };
    this._tradingRoom.OnPutMoney = (amount) => { this.game.session.send(GameSender.TradePutMoney(amount)); };
    this._tradingRoom.OnPutItem = (index, invType, position, quantity) => {
      this.game.session.send(GameSender.TradePutItem(index, invType, position, quantity));
    };
    this._cashTradingRoom = new CashTradingRoom(this._loader, uiWz);
    this._cashTradingRoom.OnTrade = () => { this.game.session.send(GameSender.TradeConfirm()); };
    this._cashTradingRoom.OnCancel = () => { this.game.session.send(GameSender.MiniRoomLeave()); };
    this._cashTradingRoom.OnPutMoney = (amount) => { this.game.session.send(GameSender.TradePutMoney(amount)); };
    this._cashTradingRoom.setResolvers(
      (id) => this.game.nameService.ItemName(id) ?? `[${id}]`,
      (id) => this._itemIcons?.LoadIcon(id) ?? null,
    );
    this._personalShop = new PersonalShop(this._loader, uiWz, font);
    this._personalShop.OnBuyItem = (index, count) => { this.game.session.send(GameSender.ShopBuyItem(index, count)); };
    this._personalShop.OnLeave = () => { this.game.session.send(GameSender.MiniRoomLeave()); };
    this._personalShop.OnPutItem = (invType, position, setCount, setSize, price) => {
      this.game.session.send(GameSender.ShopPutItem(invType, position, setCount, setSize, price));
    };
    this._personalShop.OnBalloonOpen = (open) => { this.game.session.send(GameSender.ShopBalloonOpen(open)); };
    this._personalShop.OnSoldItem = (_itemIndex, quantity, buyerName) => {
      this._statusMessenger.showLoot(`Sold ${quantity}x to ${buyerName}`);
    };
    this._entrustedShop = new EntrustedShop(this._loader, uiWz);
    this._entrustedShop.OnClose = () => { this.game.session.send(GameSender.EntrustedShopGoOut()); };
    this._entrustedShop.OnWithdrawMoney = () => { this.game.session.send(GameSender.EntrustedShopWithdrawMoney()); };
    this._entrustedShop.OnArrange = () => { this.game.session.send(GameSender.EntrustedShopArrange()); };
    this._entrustedShop.OnBuyItem = (index, count) => { this.game.session.send(GameSender.EntrustedShopBuyItem(index, count)); };
    this._entrustedShop.setResolvers(
      (id) => this.game.nameService.ItemName(id) ?? `[${id}]`,
      (id) => this._itemIcons?.LoadIcon(id) ?? null,
    );
    this._memoryGame = new MemoryGame({
      onTurnUpCard: (cardIdx, bSelected) => { this.game.session.send(GameSender.MemoryGameTurnUpCard(cardIdx, bSelected)); },
      onReady: (bReady) => { this.game.session.send(GameSender.MemoryGameReady(bReady)); },
      onStart: () => { this.game.session.send(GameSender.MemoryGameStart()); },
      onTieRequest: () => { this.game.session.send(GameSender.MemoryGameTieRequest()); },
      onGiveUp: () => { this.game.session.send(GameSender.MemoryGameGiveUp()); },
      onBan: () => { this.game.session.send(GameSender.MemoryGameBan()); },
      onLeave: () => { this.game.session.send(GameSender.MiniRoomLeave()); },
    });
    this._chatBalloon = new ChatBalloonLayer(this._loader, uiWz, font);
    this.uiRoot.addChild(this._chatBalloon.root);

    this.uiRoot.addChild(this._gameMenu.container);
    this.uiRoot.addChild(this._familyWindow.container);
    this.uiRoot.addChild(this._guildBBS.container);
    this.uiRoot.addChild(this._channelSelect.container);
    this.uiRoot.addChild(this._quickSlotConfig.container);
    this.uiRoot.addChild(this._statDetailInfo.container);
    this.uiRoot.addChild(this._trunk.container);
    this.uiRoot.addChild(this._messengerWin.container);
    this.uiRoot.addChild(this._revivePanel.container);
    this.uiRoot.addChild(this._worldMap.container);
    this.uiRoot.addChild(this._tournamentWindow.container);
    this.uiRoot.addChild(this._ranking.container);
    this.uiRoot.addChild(this._monsterBook.container);
    this.uiRoot.addChild(this._memo.container);
    this.uiRoot.addChild(this._battleRecord.container);
    this.uiRoot.addChild(this._titleWindow.container);
    this.uiRoot.addChild(this._maker.container);
    this.uiRoot.addChild(this._adminShop.container);
    this.uiRoot.addChild(this._storeBank.container);
    this.uiRoot.addChild(this._characterSale.container);
    this.uiRoot.addChild(this._weddingWishList.container);
    this.uiRoot.addChild(this._findFriend.container);
    this.uiRoot.addChild(this._shopScanner.container);
    this.uiRoot.addChild(this._incubator.container);
    this.uiRoot.addChild(this._rpsGame.container);
    this.uiRoot.addChild(this._logoutGift.container);
    this.uiRoot.addChild(this._parcel.container);
    this.uiRoot.addChild(this._wildHunterInfo.container);
    this.uiRoot.addChild(this._monsterCarnival.container);
    this.uiRoot.addChild(this._skillMacro.container);
    this.uiRoot.addChild(this._reset.container);
    this.uiRoot.addChild(this._delivery.container);
    this.uiRoot.addChild(this._claim.container);
    this.uiRoot.addChild(this._enchantSkill.container);
    this.uiRoot.addChild(this._miracleCube.container);
    this.uiRoot.addChild(this._goldHammer.container);
    this.uiRoot.addChild(this._scrollDialog!.container);
    this.uiRoot.addChild(this._partySearchDialog!.container);
    this.uiRoot.addChild(this._karmaScissors.container);
    this.uiRoot.addChild(this._itemProtector.container);
    this.uiRoot.addChild(this._repair.container);
    this.uiRoot.addChild(this._tradingRoom.container);
    this.uiRoot.addChild(this._cashTradingRoom!.container);
    this.uiRoot.addChild(this._personalShop.container);
    this.uiRoot.addChild(this._entrustedShop.container);
    this.uiRoot.addChild(this._memoryGame!.container);
    this.uiRoot.addChild(this._vegaDialog!.container);
    this._panels.push(this._familyWindow, this._guildBBS, this._channelSelect, this._quickSlotConfig, this._statDetailInfo,
      this._trunk, this._messengerWin, this._revivePanel, this._worldMap, this._tournamentWindow,
      this._ranking, this._monsterBook, this._memo,
      this._battleRecord, this._titleWindow, this._maker, this._adminShop, this._storeBank, this._characterSale, this._weddingWishList, this._findFriend, this._shopScanner, this._incubator, this._rpsGame, this._logoutGift, this._parcel, this._wildHunterInfo, this._monsterCarnival, this._skillMacro,
      this._reset, this._delivery, this._claim, this._enchantSkill,
      this._miracleCube, this._goldHammer, this._scrollDialog!, this._vegaDialog!, this._karmaScissors, this._itemProtector, this._repair, this._megaphoneCompose,
      this._tradingRoom, this._cashTradingRoom!, this._personalShop, this._entrustedShop,
      this._quickSlots!, this._questDetail!,
      this._skill, this._stats, this._quest,
      // The 7 panels that used to be (incorrectly) listed in the
      // constructor's `_panels` array before they existed — see the long
      // comment at that array's declaration. Pushed here, now that
      // `_statusBar`/`_miniMap`/`_equip`/`_item`/`_keyConfig` have all just
      // been constructed above and `_questReward`/`_notice` are constructed
      // a few lines below this point in the same function (both already
      // assigned by the time this particular `.push()` line itself runs,
      // since `_initMenu` constructs every panel before reaching this
      // call).
      this._statusBar, this._miniMap, this._equip, this._item, this._keyConfig,
      this._questReward!, this._notice!, this._antiMacroDialog!, this._questAlarm);

    // Fixed-position HUDs — not draggable
    for (const p of [this._statusBar, this._chatBar, this._buffList, this._clock, this._slideNotice, this._partyHPBar, this._killCountHud, this._massacreGaugeHud, this._questTimerHud, this._quickSlots!]) {
      p.draggable = false;
    }

    // These panels were created after onEnter() already added _panels to uiRoot,
    // so they need to be added to the display tree explicitly here.
    for (const p of [this._statusBar, this._miniMap, this._equip, this._item, this._keyConfig, this._questReward!, this._notice!, this._antiMacroDialog!]) {
      if (p && !p.container.parent) this.uiRoot.addChild(p.container);
    }
    // OG: ChatBar renders ON TOP of StatusBar — move to end of display list
    this.uiRoot.addChild(this._chatBar.container);

    // OG: Tooltips render ON TOP of all panels — must be last in display list
    const equipTipContainer = this._equip.tooltipContainer;
    if (equipTipContainer) this.uiRoot.addChild(equipTipContainer);
    const itemTipContainer = this._item.tooltipContainer;
    if (itemTipContainer) this.uiRoot.addChild(itemTipContainer);

    this._statusBar.onInfo = () => { if (this._charInfo) this._charInfo.isVisible = !this._charInfo.isVisible; };
    this._statusBar.onEquip = () => {
      this._equip.isVisible = !this._equip.isVisible;
      // Ensure equip panel is in the display tree when first shown
      if (this._equip.isVisible && !this._equip.container.parent) {
        this.uiRoot.addChild(this._equip.container);
      }
    };
    this._statusBar.onItems = () => {
      this._item.isVisible = !this._item.isVisible;
      if (this._item.isVisible && !this._item.container.parent) this.uiRoot.addChild(this._item.container);
    };
    this._item.onUseItem = (item) => {
      // OG: CDraggableItem::OnDoubleClicked, case 2 (Use tab, TI=2).
      // Giant chain of is_*_item checks, each routing to a specific
      // Send* request. Order matches OG exactly.
      const category = Math.floor(item.id / 10000);

      // Categories 207 (throwing stars) / 233 (bullets) — rechargeable, not lottery
      // OG: no dedicated handler, falls through to generic UseItem
      if (category === 207 || category === 233) {
        this.game.session.send(GameSender.UseItem(item.slot, item.id));
        return;
      }

      // is_state_change_item: categories 200,201,202,205,221,236,238,245
      // → SendStatChangeItemUseRequest (opcode 78, same as generic UseItem)
      if (category === 200 || category === 201 || category === 202 || category === 205
        || category === 221 || category === 236 || category === 238 || category === 245) {
        this.game.session.send(GameSender.UseItem(item.slot, item.id));
        return;
      }

      // is_random_morph_item_other: category 221 && (itemId-2210000)/1000==2
      // → SendRandomMorphOtherRequest — falls through to UseItem in TS

      // is_antimacro_item: category 219
      // → SendAntiMacroItemUseRequest (opcode 115)
      if (category === 219) {
        const target = window.prompt('Enter player name to check for macros:') ?? '';
        if (target.length > 0) this.game.session.send(GameSender.AntiMacroItemUseRequest(target, item.slot, item.id));
        return;
      }

      // is_portal_scroll_item: category 203
      // → SendPortalScrollUseRequest (opcode 92)
      if (category === 203) {
        this.game.session.send(GameSender.PortalScrollUseRequest(Date.now(), item.slot, item.id));
        return;
      }

      // is_mobsummon_item: category 210
      // → SendMobSummonItemUseRequest (opcode 81)
      if (category === 210) {
        this.game.session.send(GameSender.MobSummonItemUseRequest(item.slot, item.id));
        return;
      }

      // Cash pet food: is_cash_pet_food_item — category 524
      // → SendConsumeCashItemUseRequest (opcode 85)
      if (category === 524) {
        this.game.session.send(GameSender.ConsumeCashItemUseRequest(item.slot, item.id));
        return;
      }

      // is_pet_food_item: category 212
      // → SendPetFoodItemUseRequest (opcode 82)
      if (category === 212) {
        this.game.session.send(GameSender.PetFoodItemUseRequest(item.slot, item.id));
        return;
      }

      // is_engagement_ring_box_item: category 224
      // → SendEngagementRequest (MarriageRequest)
      if (category === 224) {
        const target = window.prompt('Propose marriage to:') ?? '';
        if (target.length > 0) this.game.session.send(GameSender.MarriageRequest(target, item.id));
        return;
      }

      // is_tamingmob_food_item: category 226
      // → SendTamingMobFoodItemUseRequest (opcode 83)
      if (category === 226) {
        this.game.session.send(GameSender.TamingMobFoodItemUseRequest(item.slot, item.id));
        return;
      }

      // is_bridle_item: category 227
      // → SendBridleItemUseRequest (opcode 87) — needs mob targeting
      // OG: enters targeting mode, click mob → SendBridleItemUseRequest(pos, itemId, mobTemplateId)
      if (category === 227) {
        // Store pending bridle; mob click will complete the request
        this._pendingBridle = { slot: item.slot, id: item.id };
        this._statusMessenger?.showLoot('Click a mob to catch it');
        return;
      }

      // is_skill_learn_item: category 228
      // → SendSkillLearnItemUseRequest (opcode 88)
      // OG also checks is_masterybook_item(itemId) — mastery books are sub-IDs
      // within category 228; exact sub-range not exposed in the IDA dump.
      if (category === 228) {
        this.game.session.send(GameSender.SkillLearnItemUseRequest(item.slot, item.id));
        return;
      }

      // is_skill_reset_item: category 250
      // → SendSkillResetItemUseRequest (opcode 89)
      if (category === 250) {
        this.game.session.send(GameSender.SkillResetItemUseRequest(item.slot, item.id));
        return;
      }

      // is_shopscanner_item: category 231
      // → SendShopScannerItemUseRequest (opcode 90)
      if (category === 231) {
        this.game.session.send(GameSender.ShopScannerItemUseRequest(item.slot, item.id));
        return;
      }

      // is_maptransfer_item: category 232
      // → SendMapTransferItemUseRequest (opcode 91)
      // OG: RunMapTransferItem reads item's desc node from WZ for map name/id.
      if (category === 232) {
        let mapName = '';
        let mapId = 0;
        if (this._itemWz) {
          const group = Math.floor(item.id / 10000).toString().padStart(4, '0');
          const id = item.id.toString().padStart(8, '0');
          const desc = this._itemWz.GetItem(`Consume/${group}.img/${id}/desc`) as WzProperty | null;
          if (desc) {
            const descStr = desc.Get('0') ?? desc.Get('');
            if (typeof descStr === 'string') {
              // Format: "MapName/MapId" or just "MapId"
              const parts = descStr.split('/');
              if (parts.length >= 2) {
                mapName = parts[0];
                mapId = parseInt(parts[1]) || 0;
              } else {
                mapId = parseInt(descStr) || 0;
              }
            }
          }
        }
        this.game.session.send(GameSender.MapTransferItemUseRequest(item.slot, item.id, mapName, mapId));
        return;
      }

      // is_select_npc_item: category 545 or 239
      // → SendSelectNpcItemUseRequest (opcode 123)
      if (category === 545 || category === 239) {
        this.game.session.send(GameSender.SelectNpcItemUseRequest(item.slot, item.id));
        return;
      }

      // is_exp_up_item: category 237
      // → SendExpUpItemUseRequest (opcode 181)
      if (category === 237) {
        this.game.session.send(GameSender.ExpUpItemUseRequest(item.slot, item.id));
        return;
      }

      // is_script_run_item: category 243 || itemId == 3994225
      // → SendScriptRunItemRequest (opcode 84)
      if (category === 243 || item.id === 3994225) {
        this.game.session.send(GameSender.ScriptRunItemUseRequest(item.slot, item.id));
        return;
      }

      // is_release_item: category 246
      // → ChangeTab(0) + SetTryToReleaseItem(1, slot) — handled in ItemInventory._handleSlotClick
      if (category === 246) {
        // Already handled by the release flow in _handleSlotClick
        return;
      }

      // is_new_year_card_item_con: category 216
      // → SendNewYearCardUseRequest — opens CUINewYearCardSenderDlg (client-side)
      if (category === 216) {
        // Client-side dialog — no server packet needed at this point
        return;
      }

      // Megaphone items: category 234
      // → Opens CItemSpeakerDlg
      if (category === 234) {
        this._megaphoneCompose?.Open(item.slot, item.id);
        return;
      }

      // Scroll items (204xxxx / 205xxxx) — open upgrade dialog
      if (category === 204 || category === 205) {
        this._scrollDialog?.Open(item.id, item.name, item.slot);
        if (this._scrollDialog && this._itemIcons) {
          this._scrollDialog.setScrollIcon(this._itemIcons.LoadIcon(item.id));
        }
        return;
      }

      // Fallback: generic UseItem (opcode 78)
      this.game.session.send(GameSender.UseItem(item.slot, item.id));
    };
    // OG: CDraggableItem::OnDoubleClicked, case 4 (Setup tab, TI=4).
    // Visual tab 2 = server TI=4 (Setup/Install).
    this._item.onSetupItem = (item) => {
      const category = Math.floor(item.id / 10000);

      // is_minigame_item: category 408
      // → SendCreateMiniGameRequest (opcode 144 = MiniRoom)
      if (category === 408) {
        // Opens a minigame — client-side UI action
        return;
      }

      // is_book_item: category 416
      // → OpenBook — creates CBookDlg singleton (client-side)
      if (category === 416) {
        // Client-side dialog — no server packet needed
        return;
      }

      // is_invitation_bundle_item: itemId == 4031377 || itemId == 4031395
      // → SendSendInvitaionRequest (opcode 161, sub-action 5)
      if (item.id === 4031377 || item.id === 4031395) {
        // Opens marriage invitation dialog (client-side)
        return;
      }

      // is_invitation_guest_item: itemId == 4031406 || itemId == 4031407
      // → SendInvitationQuery (opcode 161, sub-action 6)
      if (item.id === 4031406 || item.id === 4031407) {
        // Opens invitation query dialog (client-side)
        return;
      }

      // is_raise_item: itemId/1000 == 4220
      // → OpenRaise — opens CUIRaiseManager (client-side)
      if (Math.floor(item.id / 1000) === 4220) {
        // Client-side UI action
        return;
      }

      // is_gachapon_box_item: category 428
      // → UseBoxGachaponItem (opcode 127)
      if (category === 428) {
        this.game.session.send(GameSender.UseBoxGachaponItem(item.slot, item.id));
        return;
      }

      // is_pigmy_egg: category 417
      // → Opens CUIIncubator (client-side dialog)
      if (category === 417) {
        // Client-side dialog — needs incubator UI
        return;
      }

      // is_non_cash_effect_item: category 429
      // → SendActiveEffectItemChange (opcode 57)
      if (category === 429) {
        this.game.session.send(GameSender.ActiveEffectItemChange(item.id));
        return;
      }

      // is_new_year_card_item_etc: category 430
      // → ShowNewYearCard (client-side)
      if (category === 430) {
        // Client-side UI action
        return;
      }

      // is_ui_open_item: category 432
      // → SendUIOpenItemRequest (complex, client-side)
      if (category === 432) {
        // Client-side UI action
        return;
      }

      // Fallback: generic UseItem
      this.game.session.send(GameSender.UseItem(item.slot, item.id));
    };
    // OG: CDraggableItem::OnDoubleClicked, case 3 (Etc tab, TI=3).
    // Visual tab 3 = server TI=3 (Etc).
    this._item.onEtcItem = (item) => {
      const category = Math.floor(item.id / 10000);

      // is_portable_chair_item: category 301
      // → SendSitOnPortableChairRequest (opcode 46)
      if (category === 301) {
        this.game.session.send(GameSender.PortableChairSitRequest(item.id));
        return;
      }

      // Dragon ball box: itemId 3994200-3994208
      // → SendDragonBallBoxRequest (opcode 196)
      if (item.id >= 3994200 && item.id <= 3994208) {
        this.game.session.send(GameSender.DragonBallBoxRequest());
        return;
      }

      // is_script_run_item: category 243 || itemId == 3994225
      // → SendScriptRunItemRequest (opcode 84)
      if (category === 243 || item.id === 3994225) {
        this.game.session.send(GameSender.ScriptRunItemUseRequest(item.slot, item.id));
        return;
      }

      // Fallback: generic UseItem
      this.game.session.send(GameSender.UseItem(item.slot, item.id));
    };
    this._item.onItemSelected = (item) => {
      if (this._tradingRoom?.isVisible) {
        this._tradingRoom.pendingItem = { invType: item.tab + 1, position: item.slot, itemId: item.id, quantity: item.quantity };
      } else if (this._personalShop?.isVisible) {
        this._personalShop.pendingItem = { invType: item.tab + 1, position: item.slot };
      }
    };
    this._statusBar.onSkills = () => {
      this._skill.isVisible = !this._skill.isVisible;
      if (this._skill.isVisible && !this._skill.container.parent) this.uiRoot.addChild(this._skill.container);
    };
    // TODO_AUDIT.md Hundred-and-nineteenth pass: CUISkill button 0x7E7 opens
    // the macro window. Open with current server-decoded slots converted to
    // the SkillMacro panel's { slot, skills[] } format.
    this._skill.onMacroOpen = () => {
      const macros = this._macroSlots.map((s, i) => ({ slot: i, skills: Array.from(s.skills) as number[] }));
      this._skillMacro?.Open(macros.length > 0 ? macros : Array.from({ length: 5 }, (_, i) => ({ slot: i, skills: [0, 0, 0] })));
    };
    this._statusBar.onStats = () => {
      this._stats.isVisible = !this._stats.isVisible;
      if (this._stats.isVisible) {
        if (!this._stats.container.parent) this.uiRoot.addChild(this._stats.container);
        this._stats.createTip11();
      } else {
        this._stats.destroyTip();
      }
    };
    this._statusBar.onOptions = () => {
      this._optionMenu.isVisible = !this._optionMenu.isVisible;
      if (this._optionMenu.isVisible && !this._optionMenu.container.parent) this.uiRoot.addChild(this._optionMenu.container);
    };
    this._statusBar.onRanking = () => {
      if (!this._ranking) return;
      this._ranking.isVisible = !this._ranking.isVisible;
      if (this._ranking.isVisible && !this._ranking.container.parent) this.uiRoot.addChild(this._ranking.container);
    };
    this._statusBar.onCommunity = () => {
      this._userList.isVisible = !this._userList.isVisible;
      if (this._userList.isVisible && !this._friendLoadSent) {
        this._friendLoadSent = true;
        this.game.session.send(GameSender.FriendLoad());
      }
    };
    this._userList.getInviteName = () => window.prompt('Invite player name:') ?? '';
    this._userList.onPartyInvite = (name) => { this.game.session.send(GameSender.PartyInvite(name)); };
    this._userList.onPartyKick = (charId) => { this.game.session.send(GameSender.PartyKick(charId)); };
    this._userList.onPartyCreate = () => { this.game.session.send(GameSender.PartyCreate()); };
    this._userList.onPartyLeave = () => { this.game.session.send(GameSender.PartyLeave()); };
    this._userList.onGuildLeave = () => {
      if (this._localCharId) this.game.session.send(GameSender.GuildLeave(this._localCharId, this._statusBar.charName));
    };
    this._userList.onGuildBoard = () => { this._guildBBS.Open(); };
    // TODO_AUDIT.md Second/Third passes: GuildJoin/Kick/Admin/Expel/Level
    // all existed in GameSender.ts with zero callers and no UI to trigger
    // them — added Invite/Kick/Admin/Expel/Level buttons to UserList's
    // Guild tab above, wired here the same way Party's Invite/Kick are.
    this._userList.onGuildInvite = (name) => {
      let target: OtherCharLook | null = null;
      for (const c of this._otherChars.values()) { if (c.Name === name) { target = c; break; } }
      if (target) this.game.session.send(GameSender.GuildJoin(target.CharId, name));
      else this._statusMessenger.showLoot(`No visible player named "${name}"`);
    };
    this._userList.onGuildKick = (charId, name) => { this.game.session.send(GameSender.GuildKick(charId, name)); };
    this._userList.onGuildAdmin = (charId, name) => { this.game.session.send(GameSender.GuildAdmin(charId, name)); };
    this._userList.onGuildExpel = (charId, name) => { this.game.session.send(GameSender.GuildExpel(charId, name)); };
    this._userList.onGuildLevel = (charId, level) => { this.game.session.send(GameSender.GuildLevel(charId, level)); };
    this._guildBBS.onLoadList = (startIndex) => { this.game.session.send(GameSender.GuildBBSLoadList(startIndex)); };
    this._guildBBS.onViewEntry = (entryId) => { this.game.session.send(GameSender.GuildBBSViewEntry(entryId)); };
    this._guildBBS.onNewPost = (title, text) => { this.game.session.send(GameSender.GuildBBSRegister(title, text, 0, false)); };
    this._guildBBS.onDeleteEntry = (entryId) => { this.game.session.send(GameSender.GuildBBSDeleteEntry(entryId)); };
    this._guildBBS.onComment = (entryId, comment) => { this.game.session.send(GameSender.GuildBBSComment(entryId, comment)); };
    this._guildBBS.onCommentDelete = (entryId, sn) => { this.game.session.send(GameSender.GuildBBSCommentDelete(entryId, sn)); };
    // TODO_AUDIT.md Ninety-second/Hundred-and-eighth passes — OG:
    // GuildRequestAction.Create. GameSender.GuildCreate existed with zero
    // callers; this was the missing UI wiring (preconditions like party
    // size/level are server-validated, same as PartyCreate above).
    this._userList.getGuildName = () => window.prompt('New guild name:') ?? '';
    this._userList.onGuildCreate = (name) => { this.game.session.send(GameSender.GuildCreate(name)); };
    this._userList.onFriendAdd = (name) => { this.game.session.send(GameSender.FriendAdd(name)); };
    this._userList.onFriendDelete = (charId) => { this.game.session.send(GameSender.FriendDelete(charId)); };
    // OG: CTabFriend::OnWhisper (0x8D4CC0) — whisper to selected friend
    this._userList.onFriendWhisper = (name) => { this._chatBar?.setWhisperTarget(name); };
    // OG: CTabFriend::OnGroupWhisper (0x8B7250) — whisper to all online friends
    this._userList.onGroupWhisper = (_groupName) => {
      const friendIds = [...this._userList.onlineFriendIds.keys()];
      if (friendIds.length > 0) {
        const msg = window.prompt('Group whisper message:');
        if (msg) this.game.session.send(GameSender.GroupChat(ChatGroupType.Friend, friendIds, msg));
      }
    };
    // OG: CTabFriend::ChangeBlockOption (0x8B7280) — block/unblock
    this._userList.onFriendBlock = (charId, block) => { this.game.session.send(GameSender.FriendBlock(charId, block)); };
    // OG: CTabFriend::OnFindFriendView (0x8B7270) — find friend
    this._userList.onFindFriend = () => { this._findFriend?.container && (this._findFriend.isVisible = true); };
    // Expedition UserList callbacks
    this._userList.getExpeditionInviteName = () => window.prompt('Expedition invite — character name:') ?? '';
    this._userList.onExpeditionCreate = () => { this.game.session.send(GameSender.ExpeditionCreate(0)); };
    this._userList.onExpeditionInvite = (name) => { this.game.session.send(GameSender.ExpeditionInvite(name)); };
    this._userList.onExpeditionKick = (charId) => { this.game.session.send(GameSender.ExpeditionKick(charId)); };
    this._userList.onExpeditionWithdraw = () => { this.game.session.send(GameSender.ExpeditionWithdraw()); };
    this._userList.onExpeditionChangeBoss = (charId) => { this.game.session.send(GameSender.ExpeditionChangeBoss(charId)); };
    this._statusBar.onKeys = () => {
      this._keyConfig.isVisible = !this._keyConfig.isVisible;
      if (this._keyConfig.isVisible && !this._keyConfig.container.parent) this.uiRoot.addChild(this._keyConfig.container);
    };
    this._statusBar.onQuit = () => { if (this._quitOverlay) this._quitOverlay.isVisible = true; };
    this._statusBar.onCashShop = () => {
      if (this.game.session.isConnected) this.game.session.send(GameSender.MigrateToCashShop());
      this.stageDirector.push(new CashShopStage(this._uiWz));
    };
    this._statusBar.onCharacter = () => { if (this._charInfo) this._charInfo.isVisible = !this._charInfo.isVisible; };
    this._statusBar.onMenu = () => { this._gameMenu?.Open(); };
    this._statusBar.onSystemOption = () => { this._optionMenu.isVisible = !this._optionMenu.isVisible; };
    this._statusBar.onQuest = () => {
      this._quest.isVisible = !this._quest.isVisible;
      if (this._quest.isVisible && !this._quest.container.parent) this.uiRoot.addChild(this._quest.container);
    };
    this._statusBar.onMTS = () => {}; // MTS no longer exists
    this._chatBar.initWzAssets(this._loader, uiWz);
    this._statusBar.onChat = () => { this._chatBar.focus(); };
    this._statusBar.onGameOption = () => { this._quickSlotConfig && (this._quickSlotConfig.isVisible = !this._quickSlotConfig.isVisible); };
    this._statusBar.onJoyPad = () => {}; // Joypad config not implemented
    this._statusBar.onClaim = () => { this._claim && (this._claim.isVisible = !this._claim.isVisible); };
    this._statusBar.onChannel = () => {
      const session = this.game.session;
      const world = session.worlds.find((w) => w.worldId === session.worldId);
      const channels = (world?.channels ?? []).map((c) => ({ channel: c.channelId, population: c.userCount }));
      this._channelSelect?.setChannels(channels, session.channelId);
      if (this._channelSelect) this._channelSelect.isVisible = !this._channelSelect.isVisible;
    };

    this._chatBar.onChatTargetChange = (target) => { this._chatTarget = target; };
    this._chatBar.onTabChange = (tab) => { this._chatTab = tab; };
    this._chatBar.onSendChat = (msg) => {
      // OG: pet slang reaction — check if chat matches any pet's slang list
      if (!msg.startsWith('/')) {
        const localPets = this._pets.get(this._localCharId) ?? [];
        for (const pet of localPets) {
          if (pet && pet._hasSlangReaction(msg)) {
            pet.CursedChatCommand();
            break;
          }
        }
      }
      // OG: route by chat target
      if (!msg.startsWith('/') && this._chatTarget === 'whisper') {
        // OG: whisper target → SendChatMsgWhisper via GameSender.Whisper
        const target = this._chatBar.getWhisperTarget();
        if (target) {
          this.game.session.send(GameSender.Whisper(target, msg));
          this._chatBar.addLine(`${target} : ${msg}`, 14, -1, true);
        }
        return;
      }
      if (!msg.startsWith('/') && this._chatTarget !== 'all') {
        const prefix = this._chatTarget === 'party' ? '/p '
          : this._chatTarget === 'buddy' ? '/b '
          : this._chatTarget === 'guild' ? '/g '
          : this._chatTarget === 'alliance' ? '/a ' : '';
        if (prefix) { this._handleChatCommand(prefix + msg); return; }
      }
      this._handleChatCommand(msg);
    };
    this._chatBar.onItemLink = (itemId) => {
      const name = this.game.nameService.ItemName(itemId) ?? String(itemId);
      this._notice?.show('Item Link', `${name} (${itemId})`);
    };
    this._chatBar.onItemInfo = (itemId) => {
      const name = this.game.nameService.ItemName(itemId) ?? String(itemId);
      this._notice?.show('Item Info', `${name} (${itemId})`);
    };
    this._chatBar.onEmotion = (emotion) => {
      this.game.session.send(GameSender.UserEmotion(emotion));
    };

    this._skill.onDragStart = (payload, texture, x, y) => { this._dragController.beginDrag(payload, texture, x, y); };
    this._skill.onSkillUp = (_skillId) => { /* OG: UI refresh only; packet sent via onSendSkillUp */ };
    this._skill.onSkillUse = (skillId, slv) => {
      this.game.session.send(GameSender.UseSkill(skillId, slv, Date.now()));
      // CUserLocal::ApplyMechanicMode/IsAbleToClimbLadderOrRope treats the
      // mechanic repeat skill as a distinct ladder restriction.
      this._physics?.SetRepeatSkill(skillId === 35121005 ? skillId : 0);
      // OG's real per-skill action selection (SKILLENTRY::IsActionAppointed/
      // GetRandomAppointedAction in SendSkillUseRequest, decompile 0x93e930)
      // picks between several alternate "appointed actions" depending on
      // ladder/rope state and a random roll — that selection table isn't in
      // this dump. This plays the skill's first WZ-listed action instead,
      // which is correct for the common single-action case.
      const cast = this._skillService?.GetCastInfo(skillId);
      const action = cast?.Actions[0];
      if (action) this._player?.PlayOneTimeAction(action);
      const effect = cast?.Effect ?? cast?.Effect0;
      if (effect) this._skillEffects?.PlayAtCaster(effect, this._localCharId, this._physics?.FacingLeft ?? true);
      if (cast?.Screen) this._skillEffects?.PlayFullScreen(cast.Screen);
    };
    this._skill.onSkillGuide = (grade) => {
      // OG: CUISkill::OpenSkillGuide — grade 1-4 from button IDs 3001-3004
      this._skillGuide?.open(grade, this._loader, this._uiWz);
    };
    this._skill.onSendSkillUp = (skillId) => {
      this.game.session.send(GameSender.SkillUp(skillId));
    };
    this._skill.nameOf = (id) => this.game.nameService?.SkillName(id) ?? `Skill ${id}`;

    this._stats.onHpUp = () => { this.game.session.send(GameSender.UserAbilityUp(MapleStat.MaxHp)); };
    this._stats.onMpUp = () => { this.game.session.send(GameSender.UserAbilityUp(MapleStat.MaxMp)); };
    this._stats.onStrUp = () => { this.game.session.send(GameSender.UserAbilityUp(MapleStat.Str)); };
    this._stats.onDexUp = () => { this.game.session.send(GameSender.UserAbilityUp(MapleStat.Dex)); };
    this._stats.onIntUp = () => { this.game.session.send(GameSender.UserAbilityUp(MapleStat.Int)); };
    this._stats.onLukUp = () => { this.game.session.send(GameSender.UserAbilityUp(MapleStat.Luk)); };
    this._stats.onAutoApUp = (_mode) => { /* OG: AutoApUp — auto-allocate AP */ };
    this._stats.onDetailToggle = () => {
      if (!this._statDetailInfo) return;
      this._statDetailInfo.isVisible = this._stats.detailVisible;
    };

    this._reset.OnApUp = (stat) => {
      if (stat === 'str') this.game.session.send(GameSender.UserAbilityUp(MapleStat.Str));
      else if (stat === 'dex') this.game.session.send(GameSender.UserAbilityUp(MapleStat.Dex));
      else if (stat === 'int') this.game.session.send(GameSender.UserAbilityUp(MapleStat.Int));
      else if (stat === 'luk') this.game.session.send(GameSender.UserAbilityUp(MapleStat.Luk));
    };
    this._reset.OnSpUp = (skillId) => { this.game.session.send(GameSender.SkillUp(skillId)); };

    const settingsStore = new SettingsStore();
    const savedSettings = settingsStore.load();
    this._optionMenu.LoadVolumes(savedSettings.bgmVolume, savedSettings.sfxVolume);
    this._optionMenu.LoadWarningFlash(savedSettings.hpFlash, savedSettings.mpFlash);
    this._statusBar.hpFlash = savedSettings.hpFlash;
    this._statusBar.mpFlash = savedSettings.mpFlash;
    this.game.audioPlayer.Volume = savedSettings.bgmVolume / 100;
    this.game.audioPlayer.SfxVolume = savedSettings.sfxVolume / 100;
    this._optionMenu.onSettingsChanged = () => {
      this.game.audioPlayer.Volume = this._optionMenu.BgmVolume / 100;
      this.game.audioPlayer.SfxVolume = this._optionMenu.SfxVolume / 100;
      const s = settingsStore.load();
      s.bgmVolume = this._optionMenu.BgmVolume;
      s.sfxVolume = this._optionMenu.SfxVolume;
      s.hpFlash = this._optionMenu.HpFlash;
      s.mpFlash = this._optionMenu.MpFlash;
      this._statusBar.hpFlash = s.hpFlash;
      this._statusBar.mpFlash = s.mpFlash;
      settingsStore.save(s);
    };

    this._blackList = new Set(savedSettings.blackList);
    this._userList.SetBlackList([...this._blackList]);
    this._userList.getBlockName = () => window.prompt('Block player name:') ?? '';
    this._userList.onBlockAdd = (name) => {
      this._blackList.add(name);
      this._userList.SetBlackList([...this._blackList]);
      const s = settingsStore.load();
      s.blackList = [...this._blackList];
      settingsStore.save(s);
    };
    this._userList.onBlockDelete = (name) => {
      this._blackList.delete(name);
      this._userList.SetBlackList([...this._blackList]);
      const s = settingsStore.load();
      s.blackList = [...this._blackList];
      settingsStore.save(s);
    };

    this._shop!.OnBuy = (slot, itemId, count, price) => {
      this.game.session.send(GameSender.ShopBuy(slot, itemId, count, price));
    };
    this._shop!.OnSell = (slot, itemId, count) => {
      this.game.session.send(GameSender.ShopSell(slot, itemId, count));
    };
    this._shop!.OnRecharge = (slot) => {
      this.game.session.send(GameSender.ShopRecharge(slot));
    };
    this._shop!.OnClose = () => {
      this.game.session.send(GameSender.ShopClose());
    };

    // Real bug, fixed this pass (see `_onScriptMessage`'s Say/SayImage case
    // above for the full decompile citation): the msgType byte must echo
    // the real Say(0)/SayImage(1) type of the dialog being answered, not a
    // hardcoded 0 — `_npcTalk.sayMsgType` now tracks the real value.
    this._npcTalk.onOk = () => { this.game.session.send(GameSender.ScriptAnswerNext(this._npcTalk.sayMsgType)); };
    this._npcTalk.onNext = () => { this.game.session.send(GameSender.ScriptAnswerNext(this._npcTalk.sayMsgType)); };
    // Real bug, fixed this pass: `onPrev` was a complete no-op (sent nothing
    // at all). `CScriptMan::OnSay` (decompile/6DC110.c) always sends opcode
    // 65 on dialog exit except for sentinel result 3 (dialog already
    // destroyed) — the action byte is `v16==8193 ? 1 : -(v16!=0x2000)`,
    // i.e. Next's button id (8193) -> 1 (Select), Prev's button id (0x2000)
    // -> 0, which is byte-identical to `ScriptAnswerAction.Cancel`. The real
    // client genuinely collapses "Prev" and "Cancel" to the same wire value
    // for this dialog family — there is no distinct "go back a page" action
    // byte. Fixed to send that real value via `ScriptAnswerCancel` instead
    // of silently dropping the click (which previously left the server's
    // `CScriptMan` script-wait state never advanced when a player clicked
    // Prev on a multi-page NPC monologue).
    this._npcTalk.onPrev = () => { this.game.session.send(GameSender.ScriptAnswerCancel(this._npcTalk.sayMsgType)); };
    this._npcTalk.onYes = () => {
      const qt = this._npcTalk.pendingQuestId;
      const npcId = this._npcTalk.pendingNpcId;
      if (qt > 0) {
        this.game.session.send(GameSender.QuestAccept(qt, npcId, this._npcTalk.pendingX, this._npcTalk.pendingY));
      } else {
        this.game.session.send(GameSender.ScriptAnswerYesNo(true));
      }
    };
    this._npcTalk.onNo = () => {
      this.game.session.send(GameSender.ScriptAnswerYesNo(false));
    };
    this._npcTalk.onMenuChoice = (idx) => {
      this.game.session.send(GameSender.ScriptAnswerNumber(5, idx));
    };
    this._npcTalk.onTextConfirm = (text) => {
      this.game.session.send(GameSender.ScriptAnswerText(3, text));
    };
    this._npcTalk.onNumberConfirm = (num) => {
      this.game.session.send(GameSender.ScriptAnswerNumber(4, num));
    };
  }

  onExit(): void {
    this.game.bottomAlignFrame = false;
    this.game._updateFrameTransform();
    this._currentBgm = '';
    this._loader.Dispose();
    this.game.fieldHandlers.onSetField = null;
    this.game.fieldHandlers.clearAllExceptSetField();
    super.onExit();
  }

  update(dt: number): void {
    // Sweep ActionMan cache every 60s (OG CActionMan::SweepCache)
    ActionMan.GetInstance().SweepCache();

    // `_keyConfig` is built asynchronously in `_initMenu` (via `_loadWzAsync`),
    // but `_physics` is set the moment SetField arrives — which can beat the WZ
    // load. Gate the input/physics block on both so update() ticks harmlessly
    // until the panel exists (same async-race guard as `_miniMap` below).
    if (this._physics && this._keyConfig) {
      const held = this.game.heldKeys;
      const isDown = (key: string) => held.has(key);
      const input: PlayerInput = this._directionModeActive
        ? { Left: false, Right: false, Up: false, Down: false, JumpPressed: false }
        : {
          Left: this._keyConfig.isActionDown(isDown, KeyAction.MoveLeft),
          Right: this._keyConfig.isActionDown(isDown, KeyAction.MoveRight),
          Up: isDown('ArrowUp'),
          Down: isDown('ArrowDown'),
          JumpPressed: this._keyConfig.isActionDown(isDown, KeyAction.Jump),
        };
      this._physics.Update(input, dt);
      this._player?.UpdateFromPhysics(dt, this._physics.Stance, this._physics.FacingLeft);
      // CAvatar::GetOneTimeAction is the ladder gate's action source. CharLook
      // owns the animation timer; mirror its active/inactive state into the
      // physics controller after advancing the avatar.
      this._physics.SetOneTimeAction(this._player?.IsPlayingOneTimeAction ? 0 : -1);
      this._syncLadderEligibility();
      if (this._player) this._player.Position = this._physics.Position;
      this._camera.Target = this._physics.Position;

      const movePath = this._physics.TryFlushMovePath();
      if (movePath) this.game.session.send(GameSender.UserMove(this._fieldKey, movePath));

      this._checkPortalTouch();

      this._attackCooldown = Math.max(0, this._attackCooldown - dt);
      this._comboClockMs += dt * 1000;
      const attackDown = this._keyConfig.isActionDown(isDown, KeyAction.Attack);
      const comboCtx = this._comboContext();
      this._comboKeys.observeAttackState(!this._isPlayerDead && attackDown, this._comboClockMs, comboCtx);
      const comboSkillId = this._comboKeys.update(comboCtx);
      if (comboSkillId !== null) {
        const slv = this._skillRecords.find((r) => r.skillId === comboSkillId)?.level ?? 0;
        if (slv > 0) {
          this._skill.onSkillUse?.(comboSkillId, slv);
          this.game.session.send(GameSender.UseSkill(comboSkillId, slv, Date.now()));
        }
      }
      if (!this._isPlayerDead && this._attackCooldown <= 0 && attackDown) {
        // OG: CUserLocal::TryDoingNormalAttack pre-conditions (decompile 0x9123ea)
        // 1. Not immovable (stun, sit, knockback, direction mode)
        // 2. Not on one-time action (attack animation already playing)
        // 3. Not attracting (tied to attract buff)
        // 4. Not preparing a skill
        // 5. Not on ladder/rope
        if (this._physics && !this._physics.IsImmovable
            && !this._player?.IsPlayingOneTimeAction
            && !this._physics.IsAttract
            && !this._physics.IsPreparingSkill
            && !this._physics.Climb) {
          this._tryMeleeAttack();
        }
      }
    }
    this._camera.Update(dt);
    this._field?.Update(dt * 1000, this.game.pixiApp.screen.width, this.game.pixiApp.screen.height);

    for (const mob of this._mobs.values()) mob.Update(dt);
    for (const npc of this._npcs) npc.Update(dt);
    this._updateNpcChat(dt);
    for (const drop of this._drops) drop.Update(dt);
    if (this._drops.some((d) => d.Finished)) this._drops = this._drops.filter((d) => !d.Finished);
    for (const ch of this._otherChars.values()) ch.Update(dt);
    this._updateCoupleChairs();
    for (const [charId, pets] of this._pets) {
      const ownerPos = charId === this._localCharId
        ? this._physics?.Position
        : this._otherChars.get(charId)?.Position;
      if (ownerPos) {
        const ownerFacingLeft = charId === this._localCharId
          ? this._player?.FacingLeft ?? false
          : this._otherChars.get(charId)?.FacingLeft ?? false;
        for (const pet of pets) {
          if (!pet) continue;
          pet.SetOwnerPosition(ownerPos.x, ownerPos.y, ownerFacingLeft);
          pet.Update(dt);
        }
      }
    }
    // OG: pet auto-pickup — scan nearby drops every 500ms
    this._petPickupTimer += dt;
    if (this._petPickupTimer >= 0.5 && this._drops.length > 0) {
      this._petPickupTimer = 0;
      const localPets = this._pets.get(this._localCharId) ?? [];
      const playerPos = this._physics?.Position;
      if (playerPos) {
        for (const pet of localPets) {
          if (!pet || pet.IsInPickupForbiddenMap(this._field?.LoadedMapId ?? 0)) continue;
          if (!pet.CanPickupItem() && !pet.CanPickupMeso()) continue;
          const range = pet.IsLongRange() ? 250 : 100;
          for (const drop of this._drops) {
            if (drop.Finished) continue;
            const dx = drop.Position.x - pet.Position.x;
            const dy = drop.Position.y - pet.Position.y;
            if (dx * dx + dy * dy > range * range) continue;
            if (!pet.CanPickupMeso() && drop.IsMoney) continue;
            if (!pet.CanPickupItem() && !drop.IsMoney) continue;
            if (pet.IsInExceptionList(drop.ItemIdOrAmount)) continue;
            pet.SendDropPickUpRequest(
              Math.round(drop.Position.x), Math.round(drop.Position.y),
              drop.DropId, 0,
            );
            break; // one pickup per pet per tick
          }
        }
      }
    }
    for (const [charId, dragon] of this._dragons) {
      const ownerPos = charId === this._localCharId
        ? this._physics?.Position
        : this._otherChars.get(charId)?.Position;
      if (ownerPos) dragon.SetOwnerPosition(ownerPos.x, ownerPos.y);
      dragon.Update(dt);
    }
    for (const s of this._summons.values()) s.Update(dt);
    for (const tp of this._townPortals.values()) tp.Update(dt);
    for (const emp of this._employees.values()) emp.Update(dt);
    for (const aa of this._affectedAreas.values()) aa.Update(dt);
    for (const og of this._openGates.values()) og.Update(dt);

    // TODO_AUDIT.md Sixty-ninth pass: CUIMiniMap — playerWorldPos/party
    // tracking were both dead (never set from anywhere), so the minimap
    // always showed the player dot frozen at the canvas origin and never
    // showed party members at all, despite the `Party`/`PartyMaster`
    // marker sprites already being loaded. Other-player/NPC/portal
    // live-tracking (`setOtherPlayers`/`setNpcs`/`setPortals`) are ALSO
    // dead the same way — found while fixing this, sized up but not
    // fixed this pass (bigger scope than the original party-only finding).
    // `_miniMap` is constructed asynchronously in `_initMenu` (via
    // `_loadWzAsync`); guard the whole block so update() ticks harmlessly
    // during the WZ-load window before the panel exists.
    if (this._miniMap) {
    if (this._physics) this._miniMap.playerWorldPos = this._physics.Position;
    if (this._partyCharIds.size > 0) {
      const members: { x: number; y: number; isLeader: boolean }[] = [];
      for (const [charId, isLeader] of this._partyCharIds) {
        const ch = this._otherChars.get(charId);
        if (ch) members.push({ x: ch.Position.x, y: ch.Position.y, isLeader });
      }
      this._miniMap.setPartyMembers(members);
    }
    // TODO_AUDIT.md Hundred-and-twenty-first pass: CUIMiniMap::Update reads
    // CUserPool (other players) every ~4 frames and CLifePool/CField for NPCs.
    // We push all live other-chars and NPCs every frame — equivalent coverage.
    this._miniMap.setOtherPlayers(
      Array.from(this._otherChars.values(), (c) => ({ x: c.Position.x, y: c.Position.y })),
    );
    // OG: CUIMiniMap::Update reads CNpcPool — quest NPCs get StartNpc icon
    this._miniMap.setNpcs(this._npcs.map((n) => ({ x: n.Position.x, y: n.Position.y, quest: n.QuestInfoVisible || n.QuestList.length > 0 })));
    // OG: CUIMiniMap::Update reads CEmployeePool for merchant icons
    this._miniMap.setMerchants(
      Array.from(this._employees.values(), (e) => ({ x: e.Position.x, y: e.Position.y })),
    );
    }

    if (!this._isPlayerDead) {
      // Retry deferred mob controllers once _mobInfoSvc becomes available
      if (this._pendingMobControllers.length > 0 && this._field && this._mobInfoSvc) {
        const pending = [...this._pendingMobControllers];
        this._pendingMobControllers = [];
        for (const p of pending) {
          this._createMobController(p.mobId, p.mob);
        }
      }
      if (this._mobCtl.size > 0 && !(window as any).__mobCtlLogged) {
        (window as any).__mobCtlLogged = true;
        console.log(`[MobCtrl] TICK LOOP ENTERING with ${this._mobCtl.size} controllers, _field=${!!this._field}, _isPlayerDead=${this._isPlayerDead}`);
      }
      for (const [mobId, ctl] of this._mobCtl) {
        const mob = this._mobs.get(mobId);
        const playerPos = this._physics?.Position ?? { x: 0, y: 0 };
        if (!mob?.IsServerMoveActive) ctl.Update(dt, playerPos);
        const flush = ctl.TryFlush();
        if (flush) {
          this.game.session.send(GameSender.MobMove(mobId, flush.sn, 0, ctl.FacingLeft, flush.blob));
        }
        if (mob) mob.SetFacing(ctl.FacingLeft);
      }
    }

    this._dmgNumbers?.Update(dt);
    this._chatBalloon?.Update(dt);
    this._skillEffects?.Update(dt);
    this._itemEffects?.Update(dt);
    this._projectiles.Update(dt);
    this._buffVisual.Update(dt);
    this._tombstone?.Update(dt);
    this._comboDisplay.update(dt);
    this._updateKeyDownBar();
    this._updateFieldFx(dt);
    this._updateCoupleHearts(dt);
    if (this._fearEffect.active && this._physics) {
      const p = this._camera.WorldToScreen(this._physics.Position.x, this._physics.Position.y);
      this._fearEffect.update(p.x, p.y);
    }
    // TODO_AUDIT.md Eighty-fourth pass: CTips, called every tick from
    // CWvsContext::Update in the OG (decompile xref-confirmed).
    if (this._stats?.level !== undefined) {
      const tip = this._tipOfTheDay.GetTip(this._stats.level, this._job, Date.now());
      if (tip) this._statusMessenger.showTip(tip);
    }
    for (const p of this._panels) { p?.update(dt); p?.updateDrag(); }
    // OG: CUIStatDetail follows main stat panel position
    if (this._statDetailInfo?.isVisible && this._stats) {
      const sx = this._stats.container.position.x;
      const sy = this._stats.container.position.y;
      this._statDetailInfo.container.position.set(sx + 172, sy + 90);
    }
    this._miniMap?.update(dt);
    this._gameMenu?.update(dt);
    this._gameMenu?.draw();
    // OG: DrawCombo / DrawKeyDownBar — updated every tick
    this._comboDisplay.update(dt);
    if (this._keyDownBar.isVisible) {
      // Hide key-down bar when no skill is being prepared or repeated
      if (!this._physics?.IsPreparingSkill && this._physics?.PreparingSkillId === 0
          && this._physics?.RepeatSkillId === 0) {
        this._keyDownBar.hide();
      }
    }
    this._advanceFieldTransition(dt);
  }

  protected _wireNames(game: MapleClaudeGame): void {
    const ns = game.nameService;
    const resolve = (fn: ((id: number) => string | undefined) | undefined) =>
      (id: number) => fn?.call(ns, id) ?? '';
    this._npcTalk.npcName = resolve(ns.NpcName.bind(ns));
    this._npcTalk.itemName = resolve(ns.ItemName.bind(ns));
    this._npcTalk.mobName = resolve(ns.MobName.bind(ns));
    this._npcTalk.mapName = resolve(ns.MapName.bind(ns));
    this._npcTalk.skillName = resolve(ns.SkillName.bind(ns));
    if (this._item) this._item.nameOf = resolve(ns.ItemName.bind(ns));
    if (this._skill) this._skill.nameOf = resolve(ns.SkillName.bind(ns));
    if (this._quest) this._quest.nameOf = resolve(ns.QuestName.bind(ns));
    if (this._medalQuestInfo) this._medalQuestInfo.nameOf = resolve(ns.QuestName.bind(ns));
    if (this._questTimerHud) this._questTimerHud.nameOf = resolve(ns.QuestName.bind(ns));
    this._mobNameOf = resolve(ns.MobName.bind(ns));
    this._itemNameOf = resolve(ns.ItemName.bind(ns));
  }

  handleKeyDown(key: string): boolean {
    if (key === 'Escape') {
      // OG: CWvsContext::ProcessBasicUIKey → TryCloseUI → close open panels
      if (this._quitOverlay?.isVisible) { this._quitOverlay.isVisible = false; return true; }
      for (const p of [this._keyConfig, this._skill, this._equip, this._item, this._stats, this._charInfo, this._quest, this._optionMenu, this._quickSlotConfig, this._channelSelect, this._claim, this._ranking]) {
        if (p?.isVisible) { p.isVisible = false; return true; }
      }
      // Nothing to close → open game menu (OG: CUserLocal::OnKeyDownSkillEnd + CWvsContext::UI_Menu)
      this._gameMenu?.Open();
      return true;
    }
    if (this._keyConfig.isActionDown((k) => k === key, KeyAction.PickUp)) {
      this._tryPickUpDrop();
      return true;
    }
    if (this._keyConfig.isActionDown((k) => k === key, KeyAction.Sit)) {
      this._trySit();
      return true;
    }
    // OG: ToggleMiniMapState — Tab key cycles minimap modes (normal→huge→collapsed)
    if (key === 'Tab') {
      this._miniMap?.cycleMode();
      return true;
    }
    return false;
  }

  // OG: CUserLocal::HandleXKeyDown (decompile, 0x90f6d0) — TODO_AUDIT.md
  // Seventy-sixth pass's chair/sitting finding. Precondition checks the OG
  // does (stun/attract/riding-vehicle/morphed/mid-skill-cast) aren't
  // re-verified here — this client doesn't track several of those states
  // at all, so only the core sit/stand/seat-or-chair toggle is ported.
  private _trySit(): void {
    if (!this._physics) return;
    if (this._physics.IsSitting) {
      this.game.session.send(GameSender.UserSitRequest(-1));
      this._physics.StandUp();
      // OG: release pets from hang-on-back when player stands
      const localPets = this._pets.get(this._localCharId) ?? [];
      for (const pet of localPets) pet?.HangOnBack(false);
      return;
    }
    const pos = this._physics.Position;
    const seatIdx = this._field?.FindSeatByPosition(pos.x, pos.y) ?? -1;
    if (seatIdx >= 0) {
      this.game.session.send(GameSender.UserSitRequest(seatIdx));
      const seat = this._field!.GetSeatPosition(seatIdx)!;
      this._physics.Sit(seat.x, seat.y);
      // OG: pets hang on back when player sits on seat
      const localPets = this._pets.get(this._localCharId) ?? [];
      for (const pet of localPets) pet?.HangOnBack(true);
      return;
    }
    const chair = this._item.FindPortableChair();
    if (chair) {
      this.game.session.send(GameSender.PortableChairSitRequest(chair.id));
      this._physics.Sit(pos.x, pos.y);
      // OG: pets hang on back when player sits on portable chair
      const localPets = this._pets.get(this._localCharId) ?? [];
      for (const pet of localPets) pet?.HangOnBack(true);
    }
  }

  private _tryPickUpDrop(): void {
    if (this._drops.length === 0) return;
    const pos = this._physics?.Position ?? this._player?.Position ?? { x: 0, y: 0 };
    let nearest: DropSprite | null = null;
    let bestDist = 80;
    for (const drop of this._drops) {
      const dx = pos.x - drop.Position.x, dy = pos.y - drop.Position.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestDist) { bestDist = d; nearest = drop; }
    }
    if (!nearest) return;
    this.game.session.send(GameSender.PickUpDrop(this._fieldKey, pos.x, pos.y, nearest.DropId));
  }

  // TODO_AUDIT.md item-drag-and-drop TODO (drop-to-field): true when (x,y) in
  // screen space lies inside any currently-visible panel's bounds. Used to tell
  // "released over a UI window" (return to slot / panel-specific accept) apart
  // from "released over the field" (drop the item).
  /** Reset pressed/hover state on all buttons across all panels.
   *  Called on global mouse-up to prevent buttons from staying stuck when
   *  a panel opens during mouse-down and the mouse-up goes to the panel. */
  private _resetAllButtonStates(): void {
    for (const p of this._panels) {
      if (!p?.isVisible) continue;
      p.resetButtonStates?.();
    }
    this._statusBar?.resetButtonStates?.();
  }

  private _pointOverVisiblePanel(x: number, y: number): boolean {
    for (const pn of this._panels) {
      if (!pn.isVisible) continue;
      const b = pn.container.getBounds();
      if (x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY) return true;
    }
    return false;
  }

  protected _wireHandlers(game: MapleClaudeGame): void {
    const fh = game.fieldHandlers;
    fh.onSetField = (args) => this._onSetField(args);
    // TODO_AUDIT.md Hundred-and-sixty-eighth pass: CUIEventAlarm — triggered by nNotifierCheck > 0 in SetField (decompile/71A0A0.c).
    fh.onEventAlarm = (title, lines) => {
      this._eventAlarm.show(title, lines);
    };
    fh.onMobEnter = (args) => this._onMobEnter(args);
    fh.onMobMove = (args) => this._onMobMove(args);
    fh.onMobDamaged = (args) => this._onMobDamaged(args);
    fh.onMobHpIndicator = (mobId, pct) => this._onMobHpIndicator(mobId, pct);
    // OG: CMob::OnMobSpeaking (decompile/650000.c, opcode 301) — server-driven
    // explicit speak: look up the entry and line from MobInfo.SpeakEntries.
    fh.onMobSpeaking = (args) => {
      const mob = this._mobs.get(args.mobId);
      const info = mob ? this._mobInfoSvc?.Get(mob.TemplateId) : null;
      if (!mob || !info) return;
      mob.TrySpeaking(args.speakInfoIdx, args.speechLineIdx, info.SpeakEntries);
    };
    fh.onMobLeave = (mobId, lt) => this._onMobLeave(mobId, lt);
    fh.onNpcEnter = (args) => this._onNpcEnter(args);
    fh.onNpcLeave = (id) => this._onNpcLeave(id);
    // OG: CNpc::OnMove — NPC moves on map, updates position and animation
    // actionIdx: -1 = chat only, 0+ = action index from template action list
    // chatIdx: -1 = no chat, 0+ = chat index from speak list
    // The action index maps to the NPC template's action list (aAct),
    // NOT directly to WZ animation names. The template actions contain
    // references to WZ animation paths that are loaded by CActionMan.
    fh.onNpcMove = ({ npcId, actionIdx, chatIdx, movePath }) => {
      const npc = this._npcs.find(n => n.ObjId === npcId);
      if (!npc) return;
      if (movePath) npc.ReplayMove(movePath);
      // OG CNpc::OnMove (0x678060) — actionIdx: -1=chat only, >=0=action
      if (actionIdx === -1) {
        // Chat-only: resolve chat from speak list and show balloon
        if (chatIdx >= 0) npc.OnChat(chatIdx);
      } else if (actionIdx >= 0) {
        // OG: action index maps to template action list (index-2 = array position)
        // Use _getActionName which maps actionIdx to WZ animation name
        const animName = (npc as any)._getActionName?.(actionIdx);
        if (animName) {
          // OG: set m_nOneTimeAction and m_bSpecialAction, then PrepareActionLayer
          (npc as any)._nOneTimeAction = actionIdx;
          (npc as any)._bSpecialAction = false;
          npc.SetState(animName);
        }
        // Show chat balloon if chatIdx valid
        if (chatIdx >= 0) npc.OnChat(chatIdx);
      }
    };
    fh.onNpcUpdateLimitedInfo = ({ npcId, enabled }) => {
      const npc = this._npcs.find(n => n.ObjId === npcId);
      if (npc) npc.OnUpdateLimitedInfo(enabled);
    };
    fh.onNpcSetSpecialAction = ({ npcId, actionName }) => {
      const npc = this._npcs.find(n => n.ObjId === npcId);
      if (!npc) return;
      // OG CNpc::OnSetSpecialAction (0x6750f0) — sets special action by name
      npc.OnSetSpecialAction(actionName);
    };
    fh.onUserEnter = (args) => this._onUserEnter(args);
    fh.onUserLeave = (id) => this._onUserLeave(id);
    fh.onDropEnter = (args) => this._onDropEnter(args);
    fh.onDropLeave = (args) => this._onDropLeave(args);
    fh.onStatChanged = (args) => this._onStatChanged(args);
    fh.onInventoryOperation = (ops) => {
      console.log(`[GameStage] onInventoryOperation: ${ops.length} ops, types=[${ops.map(o => o.opType).join(',')}]`);
      this._item.applyOps(ops);
      this._applyEquipOps(ops);
      this._refreshActiveProjectileSlot();
      this._syncStatDetailInputs();
      // OG: sync pet stats from inventory Add ops to active Pet instances.
      // When the server sends a pet item (Cash tab Add with pet fields), update
      // the matching Pet's tameness/repleteness via OnValidateStat → UpdatePetAbility.
      for (const op of ops) {
        if (op.opType !== InventoryOpType.Add) continue;
        if (op.petTameness === undefined) continue;
        const localPets = this._pets.get(this._localCharId) ?? [];
        for (const pet of localPets) {
          if (!pet) continue;
          if (pet.TemplateId !== op.itemId) continue;
          if (op.petLevel !== undefined) pet.SetLevel(op.petLevel);
          pet.OnValidateStat(op.petTameness, op.petRepleteness ?? pet.Repleteness, pet.PetAttribute);
          break;
        }
      }
    };
    fh.onSkillRecordResult = (records) => this._onSkillRecordResult(records);
    fh.onSkillCooltimeSet = (skillId, remainSec) => {
      if (remainSec > 0) this._skill.startCooldown(skillId, remainSec);
      else this._skill.clearCooldown(skillId);
    };
    fh.onTemporaryStatSet = (entries) => this._onTemporaryStatSet(entries);
    fh.onTemporaryStatReset = (mask) => this._onTemporaryStatReset(mask);
    fh.onQuestRecord = (args) => this._onQuestRecord(args);
    fh.onScriptMessage = (args) => this._onScriptMessage(args);
    fh.onShopOpen = (args) => this._onShopOpen(args);
    fh.onShopResult = (args) => this._onShopResult(args);
    fh.onAdminShopDlg = (args) => this._onAdminShopDlg(args);
    fh.onAdminShopResult = (args) => {
      this._adminShopNpcTemplateId = args.npcTemplateId;
      this._adminShop?.SetResult(args.npcTemplateId, args.itemCount);
    };
    fh.onStoreBankResult = (args) => { this._storeBank?.SetResult(args.resultCode); };
    fh.onStoreBankAction = (args) => this._onStoreBankAction(args);
    fh.onEntrustedShopCheckResult = (args) => this._onEntrustedShopCheckResult(args);
    fh.onCharacterSaleCheckIdResult = (args) => { this._characterSale?.SetCheckResult(args.id, args.resultCode); };
    fh.onCharacterSaleCreateResult = (args) => { this._characterSale?.SetCreateResult(args.mode, args.code); };
    // Per OG (decompile/55a6c0.c etc.): Monster Carnival CP counters and
    // status messages all go to CUIMonsterCarnival or CUIStatusBar::ChatLogAdd.
    fh.onMonsterCarnivalEnter = (args) => {
      this._fieldSubgameHud.SetMonsterCarnival({ team: args.team, personalCp: args.personalCp, myTeamCp: args.myTeamCp, enemyCp: args.enemyCpRest });
      this._monsterCarnival?.SetState({ team: args.team, personalCp: args.personalCp, myTeamCp: args.myTeamCp, enemyCp: args.enemyCpRest, enemyCpTotal: args.enemyCpTotal, lastMessage: 'entered' });
      this._chatBar.addLine(`[Monster Carnival] entered team ${args.team}, CP ${args.personalCp}/${args.myTeamCp} vs ${args.enemyCpRest}/${args.enemyCpTotal}`);
    };
    fh.onMonsterCarnivalPersonalCp = (args) => {
      this._fieldSubgameHud.SetMonsterCarnival({ personalCp: args.cp, personalCpDiff: args.cpDiff });
      this._monsterCarnival?.SetState({ personalCp: args.cp, personalCpDiff: args.cpDiff });
      this._chatBar.addLine(`[Monster Carnival] personal CP ${args.cp} (+${args.cpDiff})`);
    };
    fh.onMonsterCarnivalTeamCp = (args) => {
      this._fieldSubgameHud.SetMonsterCarnival({ team: args.team, myTeamCp: args.cp, personalCpDiff: args.cpDiff });
      this._monsterCarnival?.SetState({ team: args.team, myTeamCp: args.cp, personalCpDiff: args.cpDiff });
      this._chatBar.addLine(`[Monster Carnival] team ${args.team} CP ${args.cp} (+${args.cpDiff})`);
    };
    fh.onMonsterCarnivalRequestResult = (args) => {
      this._fieldSubgameHud.SetMonsterCarnival({ lastMessage: args.message });
      this._monsterCarnival?.SetState({ lastMessage: args.message });
      this._chatBar.addLine(`[Monster Carnival] ${args.message} (${args.code1}/${args.code2})`);
    };
    fh.onMonsterCarnivalRequestCanned = (args) => {
      this._fieldSubgameHud.SetMonsterCarnival({ lastMessage: `request result ${args.resultCode}` });
      this._monsterCarnival?.SetState({ lastMessage: `request result ${args.resultCode}` });
      this._chatBar.addLine(`[Monster Carnival] request result ${args.resultCode} `);
    };
    fh.onMonsterCarnivalProcessForDeath = (args) => {
      this._fieldSubgameHud.SetMonsterCarnival({ lastMessage: `${args.characterName} out (${args.remainingCount})` });
      this._monsterCarnival?.SetState({ lastMessage: `${args.characterName} out (${args.remainingCount})` });
      this._chatBar.addLine(`[Monster Carnival] ${args.characterName} team ${args.teamFlag} (${args.remainingCount}) `);
    };
    fh.onMonsterCarnivalMemberOut = (args) => {
      this._fieldSubgameHud.SetMonsterCarnival({ lastMessage: `${args.characterName} left` });
      this._monsterCarnival?.SetState({ lastMessage: `${args.characterName} left` });
      this._chatBar.addLine(`[Monster Carnival] ${args.characterName} out (flags ${args.flag1}/${args.flag2}) `);
    };
    fh.onMonsterCarnivalGameResult = (args) => {
      this._fieldSubgameHud.SetMonsterCarnival({ lastMessage: `game result ${args.resultCode}` });
      this._monsterCarnival?.SetState({ lastMessage: `game result ${args.resultCode}` });
      this._chatBar.addLine(`[Monster Carnival] game result ${args.resultCode} `);
    };
    // CORRECTED (TODO_AUDIT.md Seventy-second pass addendum, waterfall
    // implementation pass): `CUIFamilyChart::DecodeLocalChart` (0x7b55a0)
    // is NOT actually opaque — re-querying it directly produced a full
    // pseudocode body (a real per-node family-tree decode). Left as a
    // no-op data sink anyway because the field-by-field shape hasn't
    // been mapped yet (a real follow-up task, not a guess) — see
    // `FamilyChartResultArgs`'s doc comment in PacketArgs.ts. The other
    // Family opcodes ARE fully decoded; FamilyInfoResult populates the
    // existing FamilyWindow (CUIFamily) stat panel, and the rest route
    // to ChatBar/Notice exactly like OG's own CUIStatusBar::ChatLogAdd /
    // CUtilDlg::Notice/YesNo calls.
    fh.onFamilyChartResult = () => { /* decode shape not yet mapped — see FamilyChartResultArgs doc comment */ };
    fh.onFamilyInfoResult = (args) => {
      if (!this._familyWindow) return;
      this._familyWindow.InFamily = true;
      this._familyWindow.Reputation = args.famousPoint;
      this._familyWindow.TodayRep = args.todaySavePoint;
      this._familyWindow.JuniorCount = args.childCount;
      this._familyWindow.SetPrivilegeUse(args.privilegeUse);
    };
    fh.onFamilyResult = (args) => {
      this._chatBar.addLine(`[Family] result ${args.resultCode} (${args.value}) `);
    };
    fh.onFamilyJoinRequest = (args) => {
      if (this._blackList.has(args.inviterName)) return;
      if (this._notice) {
        this._notice.onConfirm = () => { this.game.session.send(GameSender.FamilyInviteResult(args.inviterId, args.inviterName, true)); };
        this._notice.onDismiss = () => { this.game.session.send(GameSender.FamilyInviteResult(args.inviterId, args.inviterName, false)); };
        this._notice.showConfirm('Family Invite', `${args.inviterName} invites you to join their family.`);
      }
    };
    // TODO_AUDIT.md "Resolved against the v95 decompile" section:
    // FriendResultType.Request (9) was decoded but onFriendRequest had no
    // consumer anywhere, and FriendAccept/FriendRefuse had zero callers.
    fh.onFriendRequest = (args) => {
      if (this._notice) {
        this._notice.onConfirm = () => { this.game.session.send(GameSender.FriendAccept(args.friendId)); };
        this._notice.onDismiss = () => { this.game.session.send(GameSender.FriendRefuse(args.friendId)); };
        this._notice.showConfirm('Friend Request', args.message.length > 0 ? args.message : 'wants to be your friend.');
      }
    };
    fh.onFamilyJoinRequestResult = (args) => {
      this._chatBar.addLine(`[Family] ${args.characterName} join request ${args.accepted ? 'accepted' : 'declined'} `);
    };
    fh.onFamilyJoinAccepted = (args) => {
      this._chatBar.addLine(`[Family] ${args.characterName} joined `);
    };
    fh.onFamilyPrivilegeList = (args) => { this._familyWindow?.SetPrivileges(args.privileges); };
    fh.onFamilyFamousPointIncResult = (args) => {
      this._chatBar.addLine(`[Family] ${args.characterName} fame ${args.deltaPoint >= 0 ? '+' : ''}${args.deltaPoint} `);
    };
    fh.onFamilyNotifyLoginOrLogout = (args) => {
      this._chatBar.addLine(`[Family] ${args.characterName} ${args.isLogin ? 'logged in' : 'logged out'}`);
    };
    fh.onFamilySetPrivilege = () => { /* no TemporaryStatView-equivalent buff display for this yet */ };
    fh.onFamilySummonRequest = (args) => {
      if (this._notice) {
        this._notice.onConfirm = () => { this.game.session.send(GameSender.FamilySummonResponse(true)); };
        this._notice.onDismiss = () => { this.game.session.send(GameSender.FamilySummonResponse(false)); };
        this._notice.showConfirm('Family Summon', `${args.characterName} wants to summon you to ${args.fieldName}.`);
      }
    };
    // Per OG (CUIItemUpgrade::OnItemUpgradeResult, decompile/7c0fd0.c):
    // resultByte 65/66 are local UI sub-results, anything else is the real
    // scroll-use outcome. Route to the scroll dialog if open; fall back to
    // generic notice.
    fh.onItemUpgradeResult = (args) => {
      if (this._scrollDialog?.isVisible) {
        this._scrollDialog.OnItemUpgradeResult(args.resultByte, args.errorCode, args.subResult, args.result, args.iuc);
        return;
      }
      if (args.resultByte === 65) {
        this._notice?.show('Item Upgrade', `slot result, code ${args.errorCode} `);
      } else if (args.resultByte === 66) {
        this._notice?.show('Item Upgrade', `sub-result ${args.subResult} `);
      } else {
        this._notice?.show('Item Upgrade', `result ${args.result}, upgrade count ${args.iuc}`);
      }
    };
    // TODO_AUDIT.md 134th pass: CUIVega spell enhancement result.
    // resultCode: 68/73=success, 69/71=failure, other=error.
    fh.onVegaResult = (args) => {
      if (this._vegaDialog?.isVisible) {
        this._vegaDialog.OnVegaResult(args.resultCode);
        return;
      }
      if (args.resultCode === 68 || args.resultCode === 73) {
        this._chatBar.addLine('Vega spell succeeded.');
      } else if (args.resultCode === 69 || args.resultCode === 71) {
        this._chatBar.addLine('Vega spell failed.');
      } else {
        this._chatBar.addLine(`Vega spell error: code ${args.resultCode}`);
      }
    };

    // Player-visible notifications from the IDA-dump opcode audit batch.
    // Most of the other new opcodes (SessionValue/PartyValue/InventoryGrow/
    // etc.) are internal state or need feature-specific UI this client
    // doesn't have yet — left as registered-but-unconsumed callbacks rather
    // than guessed at.
    fh.onNotifyLevelUp = (args) => { this._chatBar.addLine(`${args.name} reached level ${args.level}.`); };
    fh.onNotifyWedding = (args) => {
      this._fieldSubgameHud.SetMessage(`Wedding: ${args.name}`);
      this._chatBar.addLine(`${args.name} got married.`);
    };
    fh.onNotifyJobChange = (args) => { this._chatBar.addLine(`${args.name} advanced to a new job.`); };
    fh.onMarriageRequest = (args) => {
      // OG: only requestType===0 is an actual proposal needing a YesNo
      // response (opcode 161); requestType===9 opens a local wishlist
      // dialog this client doesn't have, and other values are no-ops.
      if (args.requestType !== 0 || !args.partnerName || args.partnerId === undefined) return;
      if (this._notice) {
        const partnerName = args.partnerName, partnerId = args.partnerId;
        this._notice.onConfirm = () => { this.game.session.send(GameSender.MarriageRequestResponse(partnerName, partnerId, true)); };
        this._notice.onDismiss = () => { this.game.session.send(GameSender.MarriageRequestResponse(partnerName, partnerId, false)); };
        this._notice.showConfirm('Marriage Request', `${partnerName}`);
      }
    };
    fh.onMarriageResult = (args) => {
      if (args.resultCode === 15) {
        this._fieldSubgameHud.SetMessage(`Wedding: ${args.groomName} & ${args.brideName}`);
        this._notice?.show('Wedding Invitation', `${args.groomName} & ${args.brideName}`);
      } else if (args.message) {
        this._notice?.show('Marriage', args.message);
      }
      // Other result codes (11-14/16/18-34) are canned StringPool notices
      // this client doesn't have the localized text for — silently
      // dropped rather than shown as a meaningless numeric code.
    };
    fh.onSetWeekEventMessage = (args) => { this._chatBar.addLine(args.message); };
    fh.onUpdateGMBoard = (args) => { this._chatBar.addLine(`[GM Board] ${args.message}`); };
    fh.onAvatarMegaphoneRes = (args) => { this._chatBar.addLine(args.message); };
    fh.onMapleTVUseRes = (args) => { this._chatBar.addLine(`[MapleTV] ${args.message}`); };
    // TODO_AUDIT.md "Resolved against the v95 decompile" section: the real
    // CMapleTVMan opcodes (405/406/407, MapleTVHandlers.ts) were correctly
    // decoded and registered on the router but GameStage never assigned any
    // of the three callbacks — events decoded into the void. Banner-style
    // graphical TV broadcast (sender/receiver avatar portraits) is a bigger
    // UI than exists anywhere else in this client; falling back to the same
    // chatBar-line convention as the other broadcast-style messages above.
    this.game.mapleTVHandlers.onSetMessage = (args) => {
      const who = args.isSelfMessage ? args.senderName : `${args.senderName} -> ${args.receiverName}`;
      for (const m of args.messages) if (m.length > 0) this._chatBar.addLine(`[MapleTV ${who}] ${m}`);
    };
    this.game.mapleTVHandlers.onSendMessageResult = (args) => {
      this._chatBar.addLine(args.success ? '[MapleTV] Message sent.' : `[MapleTV] Send failed (code ${args.reasonCode}).`);
    };
    fh.onTransferChannelNotify = (args) => { this._chatBar.addLine(`Transferring to channel ${args.channel}: ${args.message}`); };
    fh.onScriptProgressMessageNotify = (args) => { this._chatBar.addLine(args.message); };
    fh.onDataCRCCheckFailed = (args) => { this._notice?.show('Notice', args.message); };
    // TODO_AUDIT.md Eighty-sixth pass / "Resolved against the v95 decompile"
    // section: CUIAntiMacro captcha — subType 6 is the real question (image
    // + free-text answer), everything else is a notice variant (no answer).
    fh.onAntiMacroResult = (args) => {
      if (args.subType === 6) this._antiMacroDialog?.showQuestion(args.jpeg);
      else this._antiMacroDialog?.showNotice(args.message ?? `Anti-macro check (code ${args.reasonCode})`);
    };
    fh.onTrunkResult = (args) => this._onTrunkResult(args);
    fh.onMessengerResult = (args) => this._onMessengerResult(args);
    fh.onIncExp = (exp) => { this._statusMessenger.showEXP(exp); };
    fh.onIncMoney = (money) => { this._statusMessenger.showLoot(`+${money} meso`); };
    fh.onIncSp = (sp) => { this._statusMessenger.showLoot(`+${sp} SP`); };
    fh.onIncFame = (fame) => { this._statusMessenger.showLoot(`${fame > 0 ? '+' : ''}${fame} Fame`); };
    fh.onIncGp = (gp) => { this._statusMessenger.showLoot(`+${gp} Guild Points`); };
    fh.onCashItemExpire = (args) => {
      const name = this.game.nameService.ItemName(args.itemId) ?? `[${args.itemId}]`;
      this._statusMessenger.showLoot(`${name} has expired`);
    };
    fh.onGeneralItemExpire = (itemIds) => {
      for (const itemId of itemIds) {
        const name = this.game.nameService.ItemName(itemId) ?? `[${itemId}]`;
        this._statusMessenger.showLoot(`${name} has expired`);
      }
    };
    // TODO_AUDIT.md Hundred-and-sixty-sixth pass: OG CUIStatusBar::ChatLogAdd(type=12) for each expired item-protect item.
    fh.onItemProtectExpire = (itemIds) => {
      for (const itemId of itemIds) {
        const name = this.game.nameService.ItemName(itemId) ?? `[${itemId}]`;
        this._statusMessenger.showLoot(`${name} protection has expired`);
      }
    };
    // TODO_AUDIT.md Hundred-and-sixty-sixth pass: OG ChatLogAdd(type=12) for each replace-message string.
    fh.onItemExpireReplace = (messages) => {
      for (const msg of messages) this._statusMessenger.showLoot(msg);
    };
    fh.onSkillExpire = (skillIds) => {
      for (const id of skillIds) {
        const name = this.game.nameService.SkillName(id) ?? `[${id}]`;
        this._statusMessenger.showLoot(`${name} has expired`);
      }
    };
    fh.onGiveBuff = (args) => {
      const name = this.game.nameService.ItemName(args.itemId) ?? `[${args.itemId}]`;
      this._statusMessenger.showLoot(`Buff: ${name}`);
    };
    fh.onSystemMessage = (args) => { this._notice?.show('Notice', args.text); };
    fh.onWheelOfFortune = (text) => { this._statusMessenger.showLoot(`[Wheel] ${text}`); };
    fh.onOpenUrl = (args) => {
      // OG (CWvsContext::OnMessage, MessageType::OpenURL) shells out to the
      // OS default browser. A server-triggered `window.open` from script
      // (no user gesture) is reliably popup-blocked, so show a clickable
      // notice as the reachable equivalent instead of silently failing.
      const win = window.open(args.url, '_blank', 'noopener,noreferrer');
      if (!win) this._notice?.show('Open URL', args.url);
    };
    fh.onLootMessage = (args) => {
      if (args.isMoney) {
        this._statusMessenger.showLoot(`+${args.money} meso`);
      } else {
        const id = args.itemId ?? 0;
        const name = this.game.nameService.ItemName(id) ?? `[${id}]`;
        this._statusMessenger.showLoot(`${name}x${args.quantity ?? 1}`);
      }
    };
    fh.onUserChat = (args) => {
      const resolved = this._resolveChatItemLinks(args.text);
      // OG CUser::OnChat: format "CharName : text", add to chat log, show balloon
      let charName = '';
      if (args.charId === this._localCharId) {
        charName = this._statusBar?.charName ?? '';
      } else {
        const other = this._otherChars.get(args.charId);
        if (other) charName = other.Name;
      }
      if (charName) {
        // OG: ChatLogAdd sText with lType=0 (white) for normal chat
        this._chatBar.addLine(`${charName} : ${resolved}`, 0);
        this._statusMessenger.showLoot(`${charName}: ${resolved}`);
      }
      this._chatBalloon?.Set(args.charId, resolved);
    };
    fh.onUserEffect = (args) => this._onUserEffect(args);
    fh.onFuncKeyMappedInit = (entries) => { this._keyConfig.applyServerKeymap(entries); };
    // TODO_AUDIT.md Hundred-and-nineteenth pass: MACROSYSDATA::Decode wires
    // server macro slots into _macroSlots for key dispatch and SkillMacro.Open.
    fh.onMacroSysDataInit = (slots) => { this._macroSlots = slots; };
    fh.onMiniRoom = (action, args) => this._onMiniRoom(action, args);
    fh.onReactorEnter = (args) => this._onReactorEnter(args);
    fh.onReactorLeave = (args) => this._onReactorLeave(args);
    fh.onReactorChangeState = (args) => this._onReactorChangeState(args);
    fh.onReactorMove = (args) => this._onReactorMove(args);
    fh.onEmployeeEnter = (args) => this._onEmployeeEnter(args);
    fh.onEmployeeLeave = (objId) => this._onEmployeeLeave(objId);
    fh.onSummonedEnter = (args) => this._onSummonedEnter(args);
    fh.onSummonedLeave = (args) => this._onSummonedLeave(args);
    fh.onSummonedMove = (args) => this._onSummonedMove(args);
    fh.onTownPortalEnter = (args) => this._onTownPortalEnter(args);
    fh.onTownPortalLeave = (args) => this._onTownPortalLeave(args);
    fh.onAffectedAreaCreate = (args) => this._onAffectedAreaCreate(args);
    fh.onAffectedAreaRemove = (objId) => { const aa = this._affectedAreas.get(objId); if (aa) { aa.container.removeFromParent(); aa.container.destroy(); } this._affectedAreas.delete(objId); };
    fh.onOpenGateCreate = (args) => this._onOpenGateCreate(args);
    fh.onOpenGateRemove = (args) => this._onOpenGateRemove(args);
    fh.onGroupMessage = (groupType, fromName, text, charId) => {
      if (this._blackList.has(fromName)) return;
      // OG: per-type prefix and lType (font color)
      let prefix: string;
      let lType: number;
      let filterType: number;
      switch (groupType) {
        case 2:  prefix = '[Party]';    lType = 1;  filterType = FILTER_PARTY;    break; // ChatType.GROUPPARTY
        case 3:  prefix = '[Buddy]';    lType = 2;  filterType = FILTER_BUDDY;    break; // ChatType.GROUPFRIEND
        case 4:  prefix = '[Guild]';     lType = 3;  filterType = FILTER_GUILD;    break; // ChatType.GROUPGUILD
        case 5:  prefix = '[Alliance]';  lType = 4;  filterType = FILTER_ALLIANCE; break; // ChatType.GROUPALLIANCE
        case 26: prefix = '[Expedition]'; lType = 26; filterType = FILTER_EXPEDITION; break; // ChatType.EXPEDITION
        default: prefix = '[Group]';     lType = 0;  filterType = FILTER_ALL;      break;
      }
      const resolved = this._resolveChatItemLinks(text);
      this._chatBar.addLine(`${prefix} ${fromName}: ${resolved}`, lType);
      this._chatBalloon?.Set(charId, resolved);
    };
    fh.onWhisper = ({ fromName, channelId, text }) => {
      // OG: CField::OnWhisper checks CConfig::IsInBlackList before
      // displaying — TODO_AUDIT.md Eighty-second pass's `CTabBlackList`
      // finding. Other IsInBlackList call sites (GroupMessage, Expedition/
      // MiniRoom/Messenger invites, Family/Guild/Party join requests) are
      // the same pattern but not wired this pass — whisper is the most
      // directly user-visible "ignore this person" case.
      if (this._blackList.has(fromName)) return;
      // OG: ChatLogAdd with lType=14 (whisper), channelID, bWhisperIcon
      this._chatBar.addLine(`${fromName} : ${this._resolveChatItemLinks(text)}`, 14, channelId, true);
      this._statusMessenger.showLoot(`[Whisper] ${fromName}: ${this._resolveChatItemLinks(text)}`);
    };
    fh.onPartyInvite = ({ inviterId, inviterName }) => {
      if (this._blackList.has(inviterName)) return;
      this._pendingInviterId = inviterId;
      this._hasPendingPartyInvite = true;
      this._notice?.show('Party Invite', `${inviterName} invites you to join their party.`);
    };
    fh.onUserEmotion = (args) => {
      if (args.charId === 0) return;
      const other = this._otherChars.get(args.charId);
      if (!other) return;
      other.SetEmotion(args.emotion);
    };
    fh.onUserSetActivePortableChair = (args) => {
      if (args.charId === 0) return;
      const other = this._otherChars.get(args.charId);
      if (!other) return;
      other.PortableChairItemId = args.itemId;
      other.SetChairHeight(args.itemId);
    };
    fh.onUserAvatarModified = (args) => {
      if (args.charId === 0) return;
      if (!args.look) return;
      const other = this._otherChars.get(args.charId);
      if (!other) return;
      other.UpdateAvatar(args.look);
      this._itemEffects?.SetCharacter(args.charId, args.look);
    };
    fh.onCharacterInfo = (info) => {
      const jobName = this.game.nameService.SkillName(info.job * 10000) ?? `Job ${info.job}`;
      if (this._charInfo) {
        this._charInfo.characterId = info.charId;
        this._charInfo.isLocalChar = info.charId === this._localCharId;
        this._charInfo.level = info.level;
        this._charInfo.job = jobName;
        this._charInfo.fame = info.fame;
        this._charInfo.guild = info.guild ?? '';
        this._charInfo.alliance = info.alliance ?? '';
        this._charInfo.isMarried = info.married;
        // OG: CUIUserInfo::SetMultiPetInfo — populate pet data from info packet
        for (let i = 0; i < 3; i++) {
          const p = info.pets[i];
          if (p) {
            this._charInfo.pets[i] = {
              name: p.name,
              templateName: this.game.nameService?.MobName(p.templateId) ?? `Pet${p.templateId}`,
              level: p.level,
              tameness: p.tameness,
              repleteness: p.repleteness,
              equipItemId: p.templateId, // Used by PetLook for rendering
              items: [],
            };
          } else {
            this._charInfo.pets[i] = null;
          }
        }
        // OG: bPetActivated set when any pet exists
        this._charInfo.bPetActivated = this._charInfo.pets.some(p => p !== null);
      }
      if (this._stats) this._stats.guild = info.guild ?? '';
      this._statusMessenger.showLoot(`[CharInfo] [${info.charId}] Lv.${info.level} ${jobName} Fame:${info.fame}`);
    };
    fh.onQuickslotInit = (keys) => { this._quickSlots?.SetKeys(keys.map((k) => k.key)); };

    fh.onCashPetFoodResult = (args) => {
      if (args.result === 0) {
        this._chatBar.addLine('Your pet ate the cash pet food!');
      } else {
        this._chatBar.addLine('Failed to feed the pet.');
      }
    };
    fh.onPetConsumeItemInit = (args) => {
      this._equip.setPetConsumeItem(args.itemId);
    };
    fh.onPetConsumeMPItemInit = (args) => {
      this._equip.setPetConsumeMpItem(args.itemId);
    };

    // BattleRecord (420-423, CBattleRecordMan::OnPacket)
    const brh = game.battleRecordHandlers;
    brh.onDotDamage = (args) => {
      this._battleRecord?.setDotDamage(args);
    };
    brh.onServerOnCalcResult = (args) => {
      this._battleRecord?.setServerOnCalc(args.enabled);
    };

    fh.onMigrateCommand = (host, port) => {
      game.migration.beginMigrateAsync(host, port, this._localCharId).catch((ex: unknown) => {
        console.error('Channel migration failed', ex);
      });
    };
    fh.onUserMove = (args) => {
      const other = this._otherChars.get(args.charId);
      if (!other) return;
      if (args.movePath) other.SetMovePath(args.movePath);
      else other.Position = { x: args.x, y: args.y };
      if (args.facingLeft !== undefined) other.SetFacing(args.facingLeft);
      if (args.stance !== undefined) other.SetStance(args.stance);
    };
    fh.onUserPassiveMove = (args) => {
      const other = this._otherChars.get(args.charId);
      if (!other || !args.movePath) return;
      other.SetMovePath(args.movePath);
    };
    fh.onUserAttack = (args) => this._onUserAttack(args);
    fh.onOpenSkillGuide = () => {
      // OG: CUserLocal::OnOpenSkillGuide (opcode 262) — opens skill UI then calls OpenCurSkillGuide
      // OpenCurSkillGuide opens the guide for the current skill root (grade from m_aSkillRoot)
      this._skillGuide?.open(1, this._loader, this._uiWz);
    };

    // Phase 8 — new field-effect / UI handlers
    // OG: CUserLocal::OnFieldFadeInOut — fade screen to color and back
    fh.onFieldFadeInOut = (color, duration, fadeOut, fadeTime) => {
      // For now, log the fade event. Full implementation needs CAnimationDisplayer.
      console.log(`[FieldFade] color=${color} dur=${duration} out=${fadeOut} fadeTime=${fadeTime}`);
    };
    fh.onFieldFadeOutForce = (_color) => {
      // OG: RemoveAllFadeInAnimation — force-clear all active fade animations
    };
    // OG: CUserLocal::OnNotifyHPDecByField — environmental HP drain
    fh.onNotifyHPDecByField = (hpDec) => {
      if (this._stats && hpDec > 0) {
        this._stats.hp = Math.max(0, this._stats.hp - hpDec);
        this._statusBar.hp = this._stats.hp;
        if (this._stats.hp <= 0) {
          this._isPlayerDead = true;
          this._tombstone?.Spawn({ x: this._physics!.Position.x, y: this._physics!.Position.y });
        }
      }
    };
    // OG: CUserLocal::OnSetDirectionMode — enables/disables player control for cutscenes
    fh.onSetDirectionMode = (bDirection, afterDelay) => {
      if (this._physics) {
        this._physics.SetDirectionMode(bDirection);
      }
      if (bDirection) {
        // Block all player input while in direction mode
        this._directionModeActive = true;
      } else if (afterDelay > 0) {
        // Delayed release: re-enable after afterDelay ms
        setTimeout(() => {
          this._directionModeActive = false;
          if (this._physics) this._physics.SetDirectionMode(false);
        }, afterDelay);
      } else {
        this._directionModeActive = false;
      }
    };
    fh.onMakerResult = (recipeId, success, items) => {
      this._maker?.SetResult(recipeId, success, items);
    };
    fh.onFieldEffect = (args) => {
      switch (args.subType) {
        case 0: {
          // OG: Effect/Summon.img/<summonId> — one-shot animation at (x,y)
          const node = this._effectWz?.GetItem(`Summon.img/${args.summonId}`);
          if (node) {
            const frames = loadFrameSequence(this._loader, node);
            if (frames.length > 0) {
              this._fieldFx.push({ frames, frameIndex: 0, frameTimer: 0, x: args.x!, y: args.y!, done: false });
            }
          }
          break;
        }
        case 1:
          this._camera.Shake(args.trembleIntensity ?? 0, args.trembleDurationMs ?? 0);
          break;
        case 3: {
          const raw = args.screenEffectUol ?? '';
          const wzPath = raw.includes('.img') ? raw : raw.replace('/', '.img/');
          const node = this._effectWz?.GetItem(wzPath);
          if (node) this._skillEffects?.PlayFullScreen(node);
          break;
        }
        case 4: {
          // OG: play_field_sound — field ambient sound from Sound.wz
          const sound = this._mobSoundWz?.GetItem(args.soundUol ?? '');
          if (sound instanceof WzSound) this.game.audioPlayer.PlayEffect(sound.AudioBytes);
          break;
        }
        case 5:
          this._statusMessenger.showLoot(`[Boss HP] mob ${args.mobTemplateId}: ${args.hp}/${args.maxHp}`);
          break;
        case 6: {
          // OG: StringPool(0x62B)="Sound/" prefix + bgmUol, PlayBGM(loop)
          const sound = this._mobSoundWz?.GetItem(args.bgmUol ?? '');
          if (sound instanceof WzSound) this.game.audioPlayer.PlayLoop(sound.AudioBytes);
          break;
        }
        case 7: {
          // OG: Effect_RewardRullet — equipment-tier preview icons.
          const jobPath = `MapEff.img/miro/RR1/${args.rewardJobIdx}0`;
          const partPath = `MapEff.img/miro/RR2/${args.rewardPartIdx}0`;
          const levPath = `MapEff.img/miro/RR3/${args.rewardLevIdx}0`;
          const jobNode = this._effectWz?.GetItem(jobPath);
          const partNode = this._effectWz?.GetItem(partPath);
          const levNode = this._effectWz?.GetItem(levPath);
          if (jobNode) this._skillEffects?.PlayFullScreen(jobNode);
          if (partNode) this._skillEffects?.PlayFullScreen(partNode);
          if (levNode) this._skillEffects?.PlayFullScreen(levNode);
          this._statusMessenger.showLoot(`[Reward] job=${args.rewardJobIdx} part=${args.rewardPartIdx} lev=${args.rewardLevIdx}`);
          break;
        }
        default:
          break;
      }
    };
    fh.onBlowWeather = (weatherId, _text) => {
      this._statusMessenger.showLoot(`[Weather] id ${weatherId}`);
    };
    fh.onPlayJukeBox = (musicId) => {
      this._statusMessenger.showLoot(`[Jukebox] music ${musicId}`);
    };
    fh.onClock = (args) => {
      switch (args.subType) {
        case 0:
          if (args.fireNow) this._statusMessenger.showLoot('[Event Timer] triggered');
          break;
        case 1:
          this._clock.setWallClock(args.hour ?? 0, args.minute ?? 0, args.second ?? 0);
          break;
        case 2:
          if (args.durationSec !== undefined && args.durationSec >= 0) this._clock.startCountdown(args.durationSec);
          else this._clock.hide();
          break;
        case 3:
        case 0x64:
          if (args.active && args.durationSec !== undefined) this._clock.startCountdown(args.durationSec);
          else if (!args.active) this._clock.hide();
          break;
      }
    };
    fh.onDestroyClock = () => {
      this._clock.hide();
    };
    fh.onKillCountInfo = (args) => { this._killCountHud.SetCount(args.count); };
    fh.onMassacreIncGauge = (args) => { this._massacreGaugeHud.SetGauge(args.incGauge); };
    fh.onMassacreResult = (args) => {
      this._massacreGaugeHud.hide();
      this._statusMessenger.showLoot(args.won ? `Massacre cleared! Gauge ${args.finalGauge}` : `Massacre failed. Gauge ${args.finalGauge}`);
    };
    // TODO_AUDIT.md Seventy-fourth pass: CUIQuestTimer — decoded but
    // dropped (FieldHandlers.onSetQuestTime had zero src/ wiring at all).
    fh.onSetQuestTime = (entries) => {
      for (const e of entries) {
        if (e.end === 0n) this._questTimerHud.ClearTimer(e.questId);
        else this._questTimerHud.SetTimerFromFiletime(e.questId, e.end);
      }
    };
    fh.onMessageBoxCreateFailed = () => { this._statusMessenger.showLoot('Could not open shop marker.'); };
    fh.onMessageBoxEnterField = (args) => {
      this._shopMarker?.Add(args.id, args.itemId, args.characterName, args.hope, args.x, args.y);
    };
    fh.onMessageBoxLeaveField = (args) => { this._shopMarker?.Remove(args.id); };
    fh.onBroadcastMsg = (msgType, text) => {
      if (msgType === 4) {
        if (text) this._slideNotice.show(text, this.game.pixiApp.screen.width);
        else this._slideNotice.hide();
      } else {
        this._statusMessenger.showLoot(`[Broadcast ${msgType}] ${text}`);
      }
    };

    fh.onMobChangeController = (mobId, isCtrl) => {
      console.log(`[MobCtrl] onMobChangeController mobId=${mobId} isCtrl=${isCtrl} mobsInMap=${this._mobs.size}`);
      if (!isCtrl) { this._mobCtl.delete(mobId); return; }
      const mob = this._mobs.get(mobId);
      if (!mob) { console.log(`[MobCtrl] mob ${mobId} not in _mobs`); return; }
      this._createMobController(mobId, mob);
    };
    fh.onMobCtrlAck = (args) => {
      const mob = this._mobs.get(args.mobId);
      if (!mob) return;
      mob.OnCtrlAck(args.mobCtrlSn, args.nextAttackPossible, args.mp, args.nextSkillId, args.nextSkillLevel);
    };
    fh.onMobSpecialEffectBySkill = ({ mobId, skillId, delay }) => {
      const mob = this._mobs.get(mobId);
      const skillWz = this._skillWz;
      if (!mob || !skillWz) return;
      const job = Math.floor(skillId / 10000);
      const skillNode = (skillWz.GetItem(`${String(job).padStart(3, '0')}.img/skill/${String(skillId).padStart(7, '0')}`)
        ?? skillWz.GetItem(`${job}.img/skill/${skillId}`)) as WzProperty | null;
      if (!skillNode) return;
      const sp = skillNode.Get('special');
      // ponytail: ignore delay (play immediately) and combo-skill caster exception (3110001/3210001)
      const frames = loadFrameSequence(this._loader, sp);
      if (frames) this._fieldFx.push({ frames, frameIndex: 0, frameTimer: 0, x: mob.Position.x, y: mob.Position.y, done: false });
    };
    fh.onMobSkillDelay = (args) => { this._chatBar.addLine(`[Mob ${args.mobId}] Skill ${args.skillId} charging (slv ${args.slv}, ${args.delayTime}ms)`); };
    // TODO_AUDIT.md "Missing features" #5: CField::OnZakumTimer/
    // OnChaosZakumTimer (decompile/530cc0.c/531020.c, byte-identical logic)
    // pick one of 2 StringPool templates by flag, a 3rd when value===0, and
    // post through CUIStatusBar::ChatLogAdd — a chat-log line, not a
    // dedicated countdown widget. StringPool text isn't in this dump
    // (same limitation as ShopResult/AdminShopDlg elsewhere), so this
    // shows the raw flag/value rather than a fabricated string.
    const bossTimerLine = (boss: string, args: { flag: number; value: number }) =>
      `[${boss}] ${args.value === 0 ? 'Boss summoned!' : `Phase timer (flag ${args.flag}): ${args.value}s`}`;
    fh.onZakumTimer = (args) => { this._chatBar.addLine(bossTimerLine('Zakum', args)); };
    fh.onChaosZakumTimer = (args) => { this._chatBar.addLine(bossTimerLine('Chaos Zakum', args)); };
    fh.onHontailTimer = (args) => { this._chatBar.addLine(bossTimerLine('Hontail', args)); };
    // TODO_AUDIT.md Twenty-eighth pass: FootHoldInfo (176) is the
    // CField_DynamicFoothold state-change notification (moving/disabled
    // footholds by name+SN list). Applied to FieldScene's foothold
    // geometry + state (matching OG CMapLoadable::FootHoldStateChange/
    // FootHoldMove + CWvsPhysicalSpace2D equivalents).
    fh.onFootHoldInfo = (args) => {
      this._field?.ApplyFootHoldState(args.entries);
    };
    fh.onPartyLoad = ({ members, bossId }) => {
      this._userList.setParty(members.map((m) => ({
        charId: m.charId, name: m.name, level: m.level,
        job: this.game.nameService.SkillName(m.job * 10000) ?? `Job ${m.job}`,
        isLeader: m.charId === bossId,
      })));
      this._partyCharIds.clear();
      for (const m of members) this._partyCharIds.set(m.charId, m.charId === bossId);
      // TODO_AUDIT.md Hundred-and-twenty-eighth pass: CUIPartyHP — show HP bars for party members.
      this._partyHPBar.setMembers(members);
    };
    // OG case 31 — no boss/crown indicator exists in UserList's party
    // panel yet to update; the minimap leader marker (PartyMaster vs
    // Party) is updated from this, though.
    fh.onPartyBossChanged = (newBossCharId) => {
      for (const id of this._partyCharIds.keys()) this._partyCharIds.set(id, id === newBossCharId);
      this._userList.setPartyBoss(newBossCharId);
    };
    fh.onPartyMemberStatChanged = ({ charId, level, job }) => {
      this._userList.updatePartyMemberStat(charId, level, this.game.nameService.SkillName(job * 10000) ?? `Job ${job}`);
    };
    fh.onExpeditionResult = (args) => {
      if (args.subAction === 'Get' || args.subAction === 'Notice' || args.subAction === 'MasterChanged' || args.subAction === 'Modified') {
        const flatMembers: { subPartyIdx: number; charId: number; name: string; level: number; job: number }[] = [];
        for (let sp = 0; sp < args.data.aSubParty.length; sp++) {
          for (const m of args.data.aSubParty[sp].members) {
            flatMembers.push({ subPartyIdx: sp, charId: m.charId, name: m.name, level: m.level, job: m.job });
          }
        }
        this._userList.setExpedition(flatMembers);
      } else if (args.subAction === 'Removed') {
        this._userList.setExpedition([]);
      } else if (args.subAction === 'Invite') {
        // ponytail: native confirm is enough until the real OG invite window exists.
        const accepted = window.confirm(`${args.inviterName} invites you to join an expedition.`);
        this.game.session.send(GameSender.ExpeditionResponseInvite(args.inviterName, accepted));
        this._notice?.show('Expedition Invite', accepted ? 'Accepted.' : 'Rejected.');
      } else if (args.subAction === 'ResponseInvite') {
        this._statusMessenger.showLoot(args.accepted ? 'Expedition invite accepted.' : 'Expedition invite rejected.');
      }
    };
    fh.onPartyAdverResult = (args) => {
      if (args.subAction === 'M') {
        this._partySearchDialog?.SetList(args.advertList);
      } else if (args.subAction === 'O') {
        this._statusMessenger.showLoot(`PartyAdver notice: ${args.sCharacterName}`);
      } else if (args.subAction === 'P') {
        this._statusMessenger.showLoot(`PartyAdver regist result: ${args.nResult}`);
      }
    };
    fh.onExpeditionApply = ({ nPartyID, sApplierName, nLevel, nJob }) => {
      // ponytail: no custom dialog; existing sender only needs accept/reject.
      const accepted = window.confirm(`${sApplierName} (Lv.${nLevel}, Job:${nJob}) wants to join your expedition.`);
      this.game.session.send(GameSender.PartyAdverApplyResponse(accepted ? 10 : 11, nPartyID));
      this._notice?.show('Expedition Apply', accepted ? 'Accepted.' : 'Rejected.');
    };
    // OG: CUserLocal::OnRadioSchedule (0x918120) — decodeStr + decode4 → CRadioManager::Play
    // CRadioManager singleton not implemented; surface as a chat notification for now.
    fh.onRadioSchedule = (musicFile: string, duration: number) => {
      this._chatBar.addLine(`Radio: ${musicFile} (${duration}s)`, 0);
    };
    // OG: CUserLocal::OnTeleport (0x913ff0) — server confirms teleport position.
    // Moves the player to the new coordinates and snaps to nearest foothold.
    fh.onUserTeleport = ({ x, y }) => {
      if (!this._physics) return;
      this._physics.Position = { x, y };
      const fhBelow = this._field?.GetFootholdBelow(x, y + 2);
      if (fhBelow) {
        this._physics.CurrentFoothold = fhBelow.Id;
        const gy = fhBelow.YAt(x);
        if (gy !== null) this._physics.Position.y = Math.min(this._physics.Position.y, gy);
      }
      this._camera.Target = this._physics.Position;
    };
    // OG: CUserLocal::OnIncComboResponse (0x91a970) — server sends updated combo count.
    // Stores the combo count; display is handled by DrawCombo when available.
    fh.onIncComboResponse = (nCombo: number) => {
      this._comboCount = nCombo;
    };
    // OG: CUserLocal::OnQuestGuideResult (0x90f1e0) — reads questId(4), drives minimap arrow.
    // No quest-arrow overlay yet; no-op is safe.
    fh.onQuestGuideResult = (_questId: number) => {};
    // OG: CUserLocal::OnDeliveryQuest (0x90ef60) — reads questId(4), delivery quest notification.
    fh.onDeliveryQuest = (questId: number) => {
      this._notice?.show('Delivery Quest', `Quest ${questId} delivered.`);
    };
    fh.onFriendList = (friends) => {
      // OG has a dedicated CUIFriendGroup dialog for renaming/re-sorting
      // groups (decompile/7bcbe0.c); that dialog's only network effect is
      // re-sending FriendAdd (no separate "set group" opcode exists — see
      // FriendRequestAction's doc comment), so until UserList gets real
      // grouped sub-lists this just surfaces the group OG already assigned.
      this._userList.setUsers(friends.map((f) => ({
        charId: f.charId, name: f.name, level: 0,
        job: f.online ? `Online${f.group ? ` [${f.group}]` : ''}` : 'Offline',
      })));
    };
    fh.onFriendStatusChanged = (args) => {
      this._userList.updateFriendStatus(args.charId, args.online);
    };
    // TODO_AUDIT.md Hundred-and-sixty-sixth pass: UpdateFriend (OG: decompile/A125D0.c) — incremental channel update.
    fh.onFriendUpdate = (charId, channel) => {
      this._userList.updateFriendEntry(charId, channel);
    };
    // TODO_AUDIT.md Hundred-and-sixty-sixth pass: GuildResult OnlineStatus (OG case 63) — incremental online update.
    fh.onGuildMemberOnline = (charId, online) => {
      this._userList.updateGuildMemberOnline(charId, online);
    };
    // TODO_AUDIT.md Hundred-and-sixty-seventh pass: GuildResult MemberJoin (OG case 41) — incremental add.
    fh.onGuildMemberJoin = (charId, name, _job, _level, grade, online) => {
      this._userList.addGuildMember({ charId, name, rank: grade === 1 ? 'Master' : 'Member', online });
    };
    // TODO_AUDIT.md Hundred-and-sixty-seventh pass: GuildResult Leave/Expel (OG case 46/49) — incremental remove.
    fh.onGuildMemberLeave = (charId) => {
      this._userList.removeGuildMember(charId);
    };
    fh.onGuildLoad = (info) => {
      if (!info) { this._userList.setGuild('', []); return; }
      this._userList.setGuild(info.name, info.members.map((m) => ({
        charId: m.characterId, name: m.name, rank: m.rank === 1 ? 'Master' : 'Member', online: m.online,
      })));
    };
    // TODO_AUDIT.md Hundred-and-twenty-third pass: CTabGuildAlliance —
    // alliance member list tab (OutHeader.AllianceResult=68, sub-types 12/13/16
    // confirmed via byte_A0FBB8 + jpt_A0EFD2 cross-reference).
    // TODO_AUDIT.md Hundred-and-twenty-sixth pass: guildId propagated for
    // Kick/ChangeMaster/GradeChange buttons; sub-types 3/14/24/25 added.
    fh.onAllianceLoad = (info) => {
      if (!info) { this._userList.setAlliance('', []); return; }
      this._userList.setAlliance(info.allianceName, info.members.map((m) => ({
        charId: m.characterId, name: m.name, level: m.level, job: m.job, grade: m.grade, guildId: m.guildId,
      })));
    };
    this._userList.onAllianceWithdraw = () => { this.game.session.send(GameSender.AllianceWithdraw()); };
    this._userList.onAllianceInvite = (name) => { this.game.session.send(GameSender.AllianceInvite(name)); };
    this._userList.onAllianceKick = (guildId, charId) => { this.game.session.send(GameSender.AllianceKick(guildId, charId)); };
    this._userList.onAllianceChangeMaster = (charId) => { this.game.session.send(GameSender.AllianceChangeMaster(charId)); };
    this._userList.onAllianceGradeChange = (charId, up) => { this.game.session.send(GameSender.AllianceGradeChange(charId, up)); };
    this._userList.onAllianceSetNotice = (text) => { this.game.session.send(GameSender.AllianceSetNotice(text)); };
    this._userList.onAllianceWhisper = (name) => {
      this._chatBar?.setInput(`/w ${name} `);
    };
    this._userList.onAlliancePartyInvite = (charId, name) => {
      this.game.session.send(GameSender.PartyInvite(name));
    };
    this._userList.getAllianceInviteName = () => window.prompt('Alliance invite — character name:') ?? '';
    this._userList.getAllianceNotice = () => window.prompt('Set alliance notice (max 100 chars):') ?? '';
    // TODO_AUDIT.md Sixty-third pass: CUIGuildBBS — protocol was already
    // fully decoded both directions, just with no UI panel to consume it.
    fh.onGuildBBSListResult = (args) => { this._guildBBS.SetList(args.notice, args.entries); };
    fh.onGuildBBSViewEntryResult = (args) => { this._guildBBS.SetEntry(args.entryId, args.characterId, args.title, args.text, args.comments); };
    fh.onGuildBBSEntryNotFound = () => { this._guildBBS.ShowNotFound(); };
    // TODO_AUDIT.md Seventy-ninth pass: CSetGuildMarkDlg — OG opens a
    // dedicated bg/mark/color picker UI; this client uses simple numeric
    // prompts instead, same scope-reduction convention as GuildCreate's
    // window.prompt() (no WZ-rendered preset picker built).
    fh.onGuildSetMarkPrompt = () => {
      const ask = (label: string): number => Number(window.prompt(label) ?? '0') | 0;
      const markBg = ask('Mark background index:');
      const markBgColor = ask('Mark background color:');
      const mark = ask('Mark index:');
      const markColor = ask('Mark color:');
      this.game.session.send(GameSender.GuildSetMark(markBg, markBgColor, mark, markColor));
    };

    // Tournament (374-377, CField_Tournament::OnPacket, decompile/563780.c)
    // — opened on demand via /tournament; just feeds whatever the panel is
    // currently showing.
    const th = game.tournamentHandlers;
    th.onTournamentInfo = (args) => {
      this._tournamentWindow?.setInfo(`flag=${args.flag} mode=${args.mode}`);
    };
    th.onTournamentMatchTable = (rawPayload) => {
      this._tournamentWindow?.setMatchTable(`${rawPayload.length} bytes (unconfirmed shape — see TODO_AUDIT.md)`);
    };
    th.onTournamentSetPrize = (args) => {
      if (args.hasItems && args.itemId1 !== null && args.itemId2 !== null) {
        const n1 = this.game.nameService.ItemName(args.itemId1) ?? `[${args.itemId1}]`;
        const n2 = this.game.nameService.ItemName(args.itemId2) ?? `[${args.itemId2}]`;
        this._tournamentWindow?.setSetPrize(`Received ${n1} and ${n2}`);
      } else {
        this._tournamentWindow?.setSetPrize(`No prize (flag=${args.flag})`);
      }
    };
    th.onTournamentUEW = (args) => {
      this._tournamentWindow?.setUew(`mode=${args.mode}`);
    };

    // Passive in-field event-minigame opcodes (SnowBall/Coconut/Ariant/GuildBoss)
    // — server-pushed during normal field gameplay, surfaced as one-line
    // HUD status messages rather than any dedicated panel (no player-
    // invoked command makes sense for these; see TODO_AUDIT.md).
    const eh = game.eventHandlers;
    eh.onSnowBallState = (args) => {
      this._fieldSubgameHud.SetSnowBall({ state: args.state, snowManHp: args.snowManHp, snowBallPos: args.snowBallPos });
      this._statusMessenger.showLoot(`[SnowBall] state=${args.state} HP ${args.snowManHp[0]}/${args.snowManHp[1]}`);
    };
    eh.onSnowBallHit = (args) => {
      this._fieldSubgameHud.SetSnowBall({ lastMessage: `hit side ${args.side} at ${args.x},${args.y}` });
      this._statusMessenger.showLoot(`[SnowBall] hit side ${args.side} at (${args.x},${args.y})`);
    };
    eh.onSnowBallMsg = (args) => {
      this._fieldSubgameHud.SetSnowBall({ lastMessage: `team ${args.team} msg ${args.msgType}` });
      this._statusMessenger.showLoot(`[SnowBall] msg ${args.msgType} (team ${args.team})`);
    };
    eh.onSnowBallTouch = () => {
      this._fieldSubgameHud.SetSnowBall({ lastMessage: 'touched' });
      this._statusMessenger.showLoot('[SnowBall] touched');
    };
    eh.onCoconutScore = () => { this._statusMessenger.showLoot('[Coconut] score update (unconfirmed shape)'); };
    eh.onCoconutHit = () => { this._statusMessenger.showLoot('[Coconut] hit (unconfirmed shape)'); };
    eh.onCoconutMsg = () => { this._statusMessenger.showLoot('[Coconut] message (unconfirmed shape)'); };
    eh.onAriantArenaResult = (args) => {
      // TODO_AUDIT.md Hundred-and-seventy-second pass: opcode 354 is a real
      // CField_AriantArena packet, but field layout is still unconfirmed.
      this._fieldSubgameHud.SetMessage(`Ariant Arena result (${args.rawPayload.length} bytes)`);
      this._statusMessenger.showLoot(`[Ariant] result (${args.rawPayload.length} bytes)`);
    };
    eh.onGuildBossHealerMove = () => { this._statusMessenger.showLoot('[GuildBoss] healer move (unconfirmed shape)'); };
    eh.onGuildBossPulleyState = () => { this._statusMessenger.showLoot('[GuildBoss] pulley state (unconfirmed shape)'); };

    // TODO_AUDIT.md Hundred-and-twentieth pass: batch of decoded-but-dropped
    // feedback callbacks wired to existing UI surfaces. All 18 were in
    // FieldHandlers with fully-decoded arguments but zero assignment anywhere
    // in GameStage, confirmed via the grep-diff pass at the top of this pass.
    fh.onSkillLearnItemResult = ({ isMasterybook, used, succeed }) => {
      if (succeed) this._notice?.show('Skill Book', isMasterybook ? 'Mastery successful!' : 'Skill learned!');
      else if (used) this._notice?.show('Skill Book', 'Skill book failed (already maxed or no SP).');
    };
    fh.onSkillResetItemResult = ({ succeed }) => {
      this._notice?.show('SP Reset', succeed ? 'SP has been reset.' : 'SP reset failed.');
    };
    // onSkillUseResult: ack-only — OG only clears an exclusive-request-pending
    // flag (no user-visible text). No-op.
    fh.onSkillUseResult = (_ack) => {};
    // onSkillPrepare/onSkillCancel: plays the skill's `keyDown` charging
    // animation anchored to the remote character, matching OG's
    // CUserRemote::OnSkillPrepare -> CUser::ShowSkillPrepare ->
    // CAnimationDisplayer::Effect_SkillPrepare (decompile/953A30.c, 8E8160.c,
    // 45B840.c). The animation plays once then holds the last frame until
    // CancelHold is called via onSkillCancel (RemovePrepareAnimation at 441B50.c).
    fh.onSkillPrepare = ({ charId, skillId }) => {
      const cast = this._skillService?.GetCastInfo(skillId);
      const node = cast?.KeyDown ?? cast?.Effect ?? cast?.Effect0;
      const facingLeft = charId === this._localCharId ? (this._physics?.FacingLeft ?? true) : (this._otherChars.get(charId)?.FacingLeft ?? true);
      if (node) this._skillEffects?.PlayHoldAtCaster(node, charId, facingLeft);
    };
    fh.onSkillCancel = ({ charId }) => {
      this._skillEffects?.CancelHold(charId);
    };
    fh.onQuestClear = ({ questId }) => {
      this._statusMessenger.showLoot(`Quest ${questId} cleared!`);
    };
    fh.onGatherItemResult = ({ invType, resultCode }) => {
      if (resultCode !== 0) this._notice?.show('Gather', `Gather failed (type ${invType}, code ${resultCode}).`);
      else {
        this._statusMessenger.showLoot(`Items gathered (type ${invType}).`);
        this._item?.setArrangeState(invType, 1);
      }
    };
    fh.onSortItemResult = ({ invType, resultCode }) => {
      if (resultCode !== 0) this._notice?.show('Sort', `Sort failed (type ${invType}, code ${resultCode}).`);
      else {
        this._statusMessenger.showLoot(`Inventory sorted (type ${invType}).`);
        this._item?.setArrangeState(invType, 0);
      }
    };
    fh.onInventoryGrow = ({ invType, slotCount }) => {
      this._notice?.show('Inventory', `Inventory type ${invType} expanded to ${slotCount} slots.`);
    };
    fh.onTownPortalNotify = ({ townId, fieldId }) => {
      this._setTownPortalStatus(townId === 999999999 || fieldId === 999999999
        ? '[Town Portal] Portal closed.'
        : `[Town Portal] Portal to town ${townId} from field ${fieldId}.`);
    };
    fh.onMonsterBookSetCard = ({ flag, cardId, count }) => {
      if (flag === 0) return;
      const name = cardId !== undefined ? (this.game.nameService.ItemName(cardId) ?? `[${cardId}]`) : '?';
      this._statusMessenger.showLoot(`[Monster Book] ${name} (${count ?? 0} collected)`);
    };
    fh.onMonsterBookSetCover = ({ coverId }) => {
      this._statusMessenger.showLoot(`[Monster Book] Cover: ${coverId}`);
    };
    // OG: CField::OnHourChanged calls CClock::SetClock — same wall-clock
    // surface as the onClock subType-1 path.
    fh.onHourChanged = ({ hour, minute }) => { this._clock.setWallClock(hour, minute, 0); };
    fh.onMiniMapOnOff = ({ onOff }) => { if (this._miniMap) this._miniMap.isVisible = onOff; };
    fh.onShowSlotMessage = ({ slot }) => {
      this._statusMessenger.showLoot(`[Inventory] Slot ${slot} message ok.`);
    };
    fh.onHontaleTimer = (args) => { this._chatBar.addLine(bossTimerLine('Hontale', args)); };
    fh.onLogoutGift = () => {
      this._logoutGift?.Open();
      this._statusMessenger.showLoot('[Logout Gift] A gift is waiting for you.');
    };
    fh.onWarnMessage = (text) => { this._notice?.show('Warning', text); };
    fh.onDestroyShopResult = ({ reasonCode, message }) => {
      const msg = message ?? `code ${reasonCode} `;
      this._personalShop?.SetShopStatus(`Destroy shop: ${msg}`);
      this._notice?.show('Shop', msg);
    };

    // TODO_AUDIT.md Hundred-and-thirty-ninth pass: Claim opcodes 44/45/46
    // OG: CWvsContext::OnClaimResult (decompile/9FA7D0.c)
    fh.onClaimResult = (args) => {
      this._claim?.ShowResult(args.result, args.success, args.claimDelayMinutes);
      if (args.result === 2) {
        this._statusMessenger.showLoot(`Claim ${args.success ? 'accepted' : 'rejected'}${args.claimDelayMinutes ? ` (${args.claimDelayMinutes}min delay)` : ''}`);
      } else {
        this._statusMessenger.showLoot(`Claim result code ${args.result} ok.`);
      }
    };
    // OG: CWvsContext::OnSetClaimSvrAvailableTime (decompile/9F1620.c) — 2 bytes: openHour, closeHour
    fh.onClaimSvrAvailableTime = (args) => {
      this._claim?.ShowServiceStatus(`Claim service available: ${args.openHour}:00-${args.closeHour}:00.`);
      this._chatBar.addLine(`Claim service available: ${args.openHour}:00-${args.closeHour}:00.`);
    };
    // OG: CWvsContext::OnClaimSvrStatusChanged (decompile/9F1650.c) — 1 byte: connected
    fh.onClaimSvrStatusChanged = (connected) => {
      this._claim?.ShowServiceStatus(`Claim service ${connected ? 'online' : 'offline'}.`);
      this._chatBar.addLine(`Claim service ${connected ? 'online' : 'offline'}.`);
    };
    fh.onWeddingGiftResult = ({ subAction, wishList, itemTabs }) => {
      this._weddingWishList?.SetResult(subAction, wishList, itemTabs);
      this._statusMessenger.showLoot(`[Wedding] subAction ${subAction}${wishList ? ` wishes:${wishList.length}` : ''}${itemTabs ? ` tabs:${itemTabs.length}` : ''}`);
    };
    fh.onSetTamingMobInfo = ({ charId, tamingMobLevel, tamingMobExp, tamingMobFatigue, flag }) => {
      // OG: flag=1 means riding active, flag=0 means not riding
      if (charId === this._localCharId) {
        this._isRidingTamingMob = flag !== 0;
        this._physics?.SetLadderRestrictions({ vehicleActive: this._isRidingTamingMob });
        this._syncLadderEligibility();
        this._syncStatDetailInputs();
      }
      // OG: CUIUserInfo::SetTamingMobInfo — feed taming mob data to char info panel
      if (this._charInfo) {
        this._charInfo.tamingMob = {
          name: 'Taming Mob',
          level: tamingMobLevel ?? 0,
          exp: tamingMobExp ?? 0,
          fatigue: tamingMobFatigue ?? 0,
          items: [],
        };
        this._charInfo.hasTamingMob = flag !== 0;
        // OG: bPetActivated set when pet system is active
        this._charInfo.bPetActivated = this._charInfo.pets.some(p => p !== null);
      }
    };
    fh.onSueCharacterResult = ({ resultCode }) => {
      this._notice?.show('Sue', resultCode === 0 ? 'Sue accepted.' : `Sue failed (code ${resultCode}).`);
    };
    fh.onTradeMoneyLimit = ({ limitType }) => {
      this._tradingRoom?.SetTradeMoneyLimit(limitType);
      this._chatBar.addLine(`Trade money limit type ${limitType}.`);
    };
    fh.onSetGender = ({ gender }) => {
      this._statusMessenger.showLoot(`Gender set to ${gender === 0 ? 'male' : 'female'}.`);
    };
    fh.onOpenGateNotify = ({ x, y }) => {
      this._statusMessenger.showLoot(`[Open Gate] spawned at (${x},${y})`);
    };
    fh.onNotifyMarriedPartnerMapTransfer = ({ mapId, partnerId }) => {
      this._statusMessenger.showLoot(`[Married] Partner ${partnerId} moved to map ${mapId}`);
    };
    fh.onSetPotionDiscountRate = ({ rate }) => {
      this._statusMessenger.showLoot(`[Potion] Discount rate ${rate}%`);
    };
    fh.onConsultAuthkeyUpdate = ({ authkey }) => {
      this._chatBar.addLine(`[Consult] Auth key updated.`);
    };
    fh.onClassCompetitionAuthkeyUpdate = ({ authkey }) => {
      this._chatBar.addLine(`[Class Competition] Auth key updated.`);
    };
    fh.onWebBoardAuthkeyUpdate = ({ flag, authkey }) => {
      this._chatBar.addLine(`[Web Board] Auth key updated (flag ${flag}).`);
    };
    fh.onSessionValue = ({ key, value }) => {
      this._chatBar.addLine(`[Session] ${key}=${value}`);
    };
    fh.onPartyValue = ({ key, value }) => {
      this._chatBar.addLine(`[Party] ${key}=${value}`, 1);
    };
    fh.onFieldSetVariable = ({ key, value }) => {
      this._chatBar.addLine(`[FieldSet] ${key}=${value}`);
    };
    fh.onBonusExpRateChanged = ({ rate, startTime, endTime }) => {
      this._statusMessenger.showLoot(`[Bonus EXP] ${rate}% (${startTime}-${endTime})`);
    };
    fh.onPotionDiscountRateChanged = ({ rate, duration }) => {
      this._statusMessenger.showLoot(`[Potion Discount] ${rate}% for ${duration}s`);
    };
    fh.onSuccessInUsegachaponBox = ({ itemId }) => {
      const name = this.game.nameService.ItemName(itemId) ?? `[${itemId}]`;
      this._statusMessenger.showLoot(`[Gachapon] Got ${name}!`);
    };
    fh.onSetBuyEquipExt = ({ flag }) => {
      this._statusMessenger.showLoot(`[Buy Equip] Extended ${flag ? 'enabled' : 'disabled'}`);
    };
    fh.onSetPassengerRequest = ({ npcId }) => {
      this._statusMessenger.showLoot(`[Passenger] NPC ${npcId} requesting ride`);
    };
    fh.onAccountMoreInfo = ({ flag }) => {
      this._chatBar.addLine(`[Account Info] flag ${flag}`);
    };
    fh.onFindFriend = ({ flag1, flag2 }) => {
      this._findFriend?.SetResult(flag1, flag2);
      this._chatBar.addLine(`[Find Friend] flag1 ${flag1} flag2 ${flag2}`);
    };
    fh.onForcedStatSet = ({ mask, str, dex, int, luk, pad, pdd, mad, mdd, acc, eva, speed, jump, speedMax }) => {
      this._forcedStat = {
        str: str ?? 0,
        dex: dex ?? 0,
        int: int ?? 0,
        luk: luk ?? 0,
        speed: speed ?? 0,
        jump: jump ?? 0,
      };
      this._syncStatDetailInputs();
      this._statusMessenger.showLoot(`[Forced Stat] mask ${mask}`);
    };
    fh.onForcedStatReset = () => {
      this._forcedStat = { str: 0, dex: 0, int: 0, luk: 0, speed: 0, jump: 0 };
      this._syncStatDetailInputs();
      this._statusMessenger.showLoot('[Forced Stat] reset');
    };
    fh.onOpenFullClientDownloadLink = () => {
      this._statusMessenger.showLoot('[Download] Full client download link available');
    };
    fh.onShopLinkResult = ({ resultCode }) => {
      this._personalShop?.SetShopStatus(`Shop link result ${resultCode}`);
      this._chatBar.addLine(`[Shop Link] result ${resultCode}`);
    };
    fh.onImitatedNPCData = ({ entries }) => {
      // OG: CNpcPool::OnNpcImitateData (0x679500) — stores imitated NPC appearances
      // When an NPC has a matching template, it renders as the stored AvatarLook
      // instead of its own NPC sprite
      for (const entry of entries) {
        const npc = this._npcs.find(n => n.NpcId === entry.templateId);
        if (npc) {
          npc.SetImitatedLook(entry.avatarLook);
          npc.Name = entry.name;
        }
      }
    };
    fh.onLimitedNPCDisableInfo = ({ templateIds }) => {
      // OG: CNpcPool::OnUpdateLimitedDisableInfo (0x679210) — disables NPC templates
      // NPCs with matching templates become invisible and stop updating
      for (const templateId of templateIds) {
        for (const npc of this._npcs) {
          if (npc.NpcId === templateId) {
            npc.SetActive(false);
          }
        }
      }
    };
    fh.onClearAvatarMegaphone = () => {
      this._statusMessenger.showLoot('[Megaphone] Avatar cleared');
    };
    fh.onCancelNameChangebyOther = () => {
      this._statusMessenger.showLoot('[Name Change] Cancelled by another request');
    };
    fh.onWildHunterInfo = ({ packedByte, capturedMobIds }) => {
      this._wildHunterInfo?.SetInfo(packedByte, capturedMobIds);
      this._statusMessenger.showLoot(`[Wild Hunter] packed ${packedByte} captured ${capturedMobIds.length} mobs`);
    };
    fh.onAskWhetherUsePamsSong = () => {
      this._notice?.show('Pam\'s Song', 'Use Pam\'s Song to teleport here?');
    };
    fh.onDisallowedDeliveryQuestList = ({ field1, field2 }) => {
      this._delivery?.SetDisallowedQuestList(field1, field2);
      this._chatBar.addLine(`[Delivery] Disallowed quests: ${field1} ${field2}`);
    };
    fh.onRPSGameDlg = ({ subAction, npcSelect, cntStraightVictories }) => {
      if (subAction === 11) {
        // OG: ProcessPacket case 11 — result with NPC choice
        this._rpsGame?.handleServerResult(npcSelect, cntStraightVictories);
      } else {
        this._rpsGame?.SetSubAction(subAction);
      }
    };
    fh.onParcelDlg = ({ subAction }) => {
      this._parcel?.SetSubAction(subAction);
      this._chatBar.addLine(`[Parcel] subAction ${subAction}`);
    };
    fh.onSummonedAttack = ({ charId, summonedId }) => {
      this._statusMessenger.showLoot(`[Summon Attack] char ${charId} summon ${summonedId}`);
    };
    fh.onSummonedSkill = ({ charId, summonedId, action }) => {
      this._statusMessenger.showLoot(`[Summon Skill] char ${charId} summon ${summonedId} action ${action}`);
    };
    fh.onSummonedHit = ({ charId, summonedId, attackIdx, damage, mobTemplateId, isLeft }) => {
      this._statusMessenger.showLoot(`[Summon Hit] char ${charId} summon ${summonedId} dmg ${damage} idx ${attackIdx}`);
    };
    fh.onMobCrcKeyChanged = ({ crcKey }) => {
      this._chatBar.addLine(`[Mob CRC] key changed to ${crcKey}`);
    };
    fh.onNpcChangeController = ({ flag, npcId }) => {
      // OG: CNpcPool::OnNpcChangeController (0x679730)
      // flag=1: NPC becomes local (client controls movement via GenerateMovePath)
      // flag=0: NPC becomes remote (server drives movement via OnMove)
      const npc = this._npcs.find(n => n.ObjId === npcId);
      if (npc) {
        npc.SetActive(flag !== 0);
      }
    };
    fh.onAuthenCodeChanged = ({ nSet, value }) => {
      this._chatBar.addLine(`[AuthenCode] set ${nSet} = ${value}`);
    };
    fh.onTransferFieldReqIgnored = (reason) => {
      this._statusMessenger.showLoot(`[Field Transfer] ignored (reason ${reason})`);
    };
    fh.onTransferChannelReqIgnored = (reason) => {
      this._statusMessenger.showLoot(`[Channel Transfer] ignored (reason ${reason})`);
    };
    fh.onFieldSpecificData = () => {
      this._chatBar.addLine('[Field] Specific data received');
    };
    fh.onCoupleMessage = ({ variant, sender, message }) => {
      // OG: CField::OnCoupleMessage — lType=6 (couple/marriage orange font)
      if (variant === 'pair' && sender && message) {
        this._chatBar.addLine(`${sender} : ${message}`, 6);
        this._statusMessenger.showLoot(`[Couple] ${sender}: ${message}`);
      } else if (variant === 'solo' && message) {
        this._chatBar.addLine(message, 12); // system message
      }
    };
    fh.onSummonItemInavailable = () => {
      this._statusMessenger.showLoot('[Summon] Item not available');
    };
    fh.onFieldObstacleOnOff = (entries) => {
      this._chatBar.addLine(`[Obstacle] ${entries.length} entries`);
    };
    fh.onFieldObstacleAllReset = () => {
      this._field?.ApplyFootHoldState([]);
      this._chatBar.addLine('[Obstacle] All reset');
    };
    fh.onQuiz = ({ isQuestion, category, problemId }) => {
      if (isQuestion) this._statusMessenger.showLoot(`[Quiz] Q${problemId} (cat ${category})`);
      else this._statusMessenger.showLoot(`[Quiz] Answer: ${problemId}`);
    };
    fh.onFieldDesc = (index) => {
      this._chatBar.addLine(`[Field Desc] index ${index}`);
    };
    fh.onSetQuestClear = () => {
      this._statusMessenger.showLoot('[Quest] All quests cleared');
    };
    fh.onSetObjectState = (entries) => {
      this._chatBar.addLine(`[Object State] ${entries.length} entries`);
    };
    fh.onStalkResult = (entries) => {
      this._chatBar.addLine(`[Stalk] ${entries.length} result entries`);
    };
    fh.onRequestFootHoldInfo = () => {
      this._chatBar.addLine('[FootHold] Info requested');
    };
    fh.onGivePopularityResult = ({ subResult, name, accepted, fame }) => {
      if (subResult === 0 && accepted) this._statusMessenger.showLoot(`[Fame] ${name} ${accepted ? '+' : '-'}${fame ?? 0} fame`);
      else this._statusMessenger.showLoot(`[Fame] result ${subResult}`);
    };
    fh.onMemoResult = ({ subAction, count, memos, msg, flag, name }) => {
      if (subAction === 3) {
        this._statusMessenger.showLoot(`[Memo] ${count ?? memos?.length ?? 0} memos`);
        if (memos && this._memo) {
          this._memo.Open(memos.map((m) => ({
            id: m.id,
            from: m.name,
            text: m.text,
            date: m.timestamp.toString(),
            read: m.flag !== 0,
          })));
        }
      }
      else if (subAction === 7) this._statusMessenger.showLoot(`[Memo] From ${name ?? 'unknown'}`);
      else this._chatBar.addLine(`[Memo] subAction ${subAction}`);
    };
    // TODO_AUDIT.md Hundred-and-forty-eighth pass: surface decoded utility/pet/user packets through existing UI hooks.
    fh.onMapTransferResult = ({ subAction, isEx, mapIds, msg }) => {
      if (subAction === 2 || subAction === 3) {
        this._statusMessenger.showLoot(`[Map Transfer] ${mapIds?.length ?? 0} maps listed`);
        if (mapIds) this._worldMap?.OpenMapTransfer(mapIds);
      }
      else this._chatBar.addLine(`[Map Transfer] subAction ${subAction}`);
    };
    fh.onIncubatorResult = ({ itemId, plus, statType, str, dex, int, luk, attack, magicAttack, def, acc, avo, speed, jump, upgrade, dialogType, msgType, sendItemOption }) => {
      const name = this.game.nameService.ItemName(itemId) ?? `[${itemId}]`;
      const result = { itemId, plus, statType, str, dex, int, luk, attack, magicAttack, def, acc, avo, speed, jump, upgrade, dialogType, msgType, sendItemOption };
      const stats = [
        ['STR', str], ['DEX', dex], ['INT', int], ['LUK', luk], ['ATK', attack], ['MATK', magicAttack],
        ['DEF', def], ['ACC', acc], ['AVO', avo], ['SPD', speed], ['JMP', jump], ['UG', upgrade],
      ].filter(([, v]) => typeof v === 'number' && v !== 0).map(([k, v]) => `${k}+${v}`).join(' ');
      this._incubator?.SetResult(result, name);
      this._notice?.show('Incubator Result', `${name}${plus ? ' +' + plus : ''}${stats ? `\n${stats}` : ''}`);
      this._statusMessenger.showLoot(`[Incubator] ${name}${plus ? ' (+)' : ''}`);
    };
    fh.onShopScannerResult = ({ subType, items, msg }) => {
      if (items && items.length > 0) {
        const lines = items.slice(0, 8).map((it) => `${this.game.nameService.ItemName(it.id) ?? it.id}: ${it.price.toLocaleString()}`);
        this._notice?.show('Shop Scanner', lines.join('\n'));
        this._shopScanner?.SetResult(subType, items.map((it) => ({ id: it.id, name: this.game.nameService.ItemName(it.id) ?? String(it.id), price: it.price })));
      } else {
        this._shopScanner?.SetResult(subType);
      }
      this._chatBar.addLine(`[Shop Scan] subType ${subType} ${items ? items.length + ' items' : ''}`);
    };
    fh.onBridleMobCatchFail = ({ reason, itemId, mobId }) => {
      const name = this.game.nameService.ItemName(itemId) ?? `[${itemId}]`;
      this._statusMessenger.showLoot(`[Catch] ${name} failed (reason ${reason})`);
    };
    fh.onImitatedNPCResult = ({ templateOrResult }) => {
      this._chatBar.addLine(`[Imitated NPC] result ${templateOrResult}`);
    };
    fh.onSetAvatarMegaphone = ({ charId, name, messages, whisperBg, whisper, avatarLook, lastUpdate }) => {
      if (name) this._chatBar.addLine(`[Megaphone] ${name}: ${messages?.join(' ') ?? ''}`);
    };
    fh.onCancelNameChangeResult = ({ result, msg }) => {
      this._notice?.show('Name Change', msg ?? `Cancel result ${result}`);
    };
    fh.onCancelTransferWorldResult = ({ result, msg }) => {
      this._notice?.show('World Transfer', msg ?? `Cancel result ${result}`);
    };
    fh.onFakeGMNotice = ({ subType, gmName, reason, dialogText }) => {
      // OG: CWvsContext::OnFakeGMNotice (0x9FB440) creates CUtilDlgEx TEXT dialog
      if (!this._utilDlg) return;
      this._utilDlg.SetUtilDlgEx(UtilDlgType.TEXT, 0, true, false);
      this._utilDlg.AddTextLine(dialogText);
      this._utilDlg.SetUtilDlgEx_TEXT(false, false);
      this._utilDlg.show();
    };
    fh.onNewYearCardRes = ({ subAction, cards, sendResultCode, senderName, cardText, sendDate }) => {
      if (subAction === 2) this._statusMessenger.showLoot(`[New Year] ${cards?.length ?? 0} cards`);
      else if (subAction === 6) this._notice?.show('New Year Card', `${senderName ?? 'Someone'}: ${cardText ?? ''}`);
      else this._chatBar.addLine(`[New Year] subAction ${subAction}`);
    };
    fh.onRandomMorphRes = ({ result, targetName }) => {
      this._statusMessenger.showLoot(`[Morph] ${result === 1 ? `${targetName} morphed` : 'failed'}`);
    };
    fh.onCakePieEventResult = ({ subAction, value, msg }) => {
      this._statusMessenger.showLoot(`[CakePie] subAction ${subAction}${value !== undefined ? ` value ${value}` : ''}`);
    };
    fh.onStageChange = ({ stageName, stagePeriod }) => {
      this._slideNotice.show(`[Stage] ${stageName} period ${stagePeriod}`, this.game.pixiApp.screen.width);
      this._chatBar.addLine(`[Stage] ${stageName} period ${stagePeriod}`);
    };
    fh.onDragonBallBox = ({ remainTime, showUI, close, ableToSummon, orbCount }) => {
      if (close) this._statusMessenger.showLoot('[Dragon Ball] Closed');
      else this._statusMessenger.showLoot(`[Dragon Ball] ${remainTime}s orbs:${orbCount ?? 0} summon:${ableToSummon}`);
    };
    fh.onUserChatHistory = ({ charId, text }) => {
      let charName = '';
      if (charId === this._localCharId) {
        charName = this._statusBar?.charName ?? '';
      } else {
        const other = this._otherChars.get(charId);
        if (other) charName = other.Name;
      }
      if (charName) this._chatBar.addLine(`${charName}: ${text}`);
      else this._chatBar.addLine(`[Chat History] char ${charId}: ${text}`);
    };
    fh.onUserADBoard = ({ charId, message }) => {
      const other = this._otherChars.get(charId);
      other?.SetADBoard(message);
      if (other) this._statusMessenger.showLoot(`[AD] ${other.Name}: ${message}`);
      else this._statusMessenger.showLoot(`[AD] char ${charId}: ${message}`);
    };
    fh.onSetConsumeItemEffect = ({ charId, itemId }) => {
      const other = this._otherChars.get(charId);
      other?.SetStatusBadge('consume', 'I', 5);
      const node = this._effectWz?.GetItem(`ItemEff.img/${itemId}/0`);
      if (node) this._skillEffects?.PlayAtCaster(node, charId);
      this._statusMessenger.showLoot(`[Effect] char ${charId} consume item ${itemId}`);
    };
    fh.onShowItemUpgradeEffect = ({ charId, result, itemId }) => {
      this._otherChars.get(charId)?.SetStatusBadge('upgrade', result ? 'UP' : 'X', 4);
      this._statusMessenger.showLoot(`[Upgrade] char ${charId} result ${result}${itemId !== undefined ? ` item ${itemId}` : ''}`);
    };
    fh.onShowItemHyperUpgradeEffect = ({ charId, result, itemId }) => {
      this._otherChars.get(charId)?.SetStatusBadge('hyperUpgrade', result ? 'H' : 'X', 4);
      this._statusMessenger.showLoot(`[Hyper Upgrade] char ${charId} result ${result}`);
    };
    fh.onShowItemOptionUpgradeEffect = ({ charId, result, itemId }) => {
      this._otherChars.get(charId)?.SetStatusBadge('optionUpgrade', result ? 'O' : 'X', 4);
      this._statusMessenger.showLoot(`[Option Upgrade] char ${charId} result ${result}`);
    };
    fh.onShowItemReleaseEffect = ({ charId, flag }) => {
      if (charId === this._localCharId) {
        // OG: CUIEquip::ShowItemReleaseEffect — flag maps to body part index for equipped item
        this._equip.showItemReleaseEffect(flag);
        // OG: CUIItem also shows release effect on the use-tab slot
        this._item?.showItemReleaseEffect(flag);
      } else {
        this._otherChars.get(charId)?.SetStatusBadge('release', 'R', 4);
      }
      this._statusMessenger.showLoot(`[Item Release] char ${charId} flag ${flag}`);
    };
    fh.onShowItemUnreleaseEffect = ({ charId, flag }) => {
      if (charId === this._localCharId) {
        this._equip.showItemReleaseEffect(flag);
        this._item?.showItemReleaseEffect(flag);
      } else {
        this._otherChars.get(charId)?.SetStatusBadge('unrelease', 'U', 4);
      }
      this._statusMessenger.showLoot(`[Item Unrelease] char ${charId} flag ${flag}`);
    };
    fh.onUserHitByUser = ({ charId, damage }) => {
      const other = this._otherChars.get(charId);
      other?.OnHit();
      const pos = other?.HeadPosition ?? other?.Position;
      if (pos) this._dmgNumbers?.Add(damage, pos.x, pos.y - 10, DamageKind.MobDamage);
      this._statusMessenger.showLoot(`[PK] char ${charId} hit for ${damage}`);
    };
    fh.onUserTeslaTriangle = ({ charId, state }) => {
      this._otherChars.get(charId)?.SetStatusBadge('tesla', 'T', 4);
      this._statusMessenger.showLoot(`[Tesla] char ${charId} state ${state}`);
    };
    fh.onUserFollowCharacter = ({ charId, targetId }) => {
      this._otherChars.get(charId)?.SetStatusBadge('follow', 'F', 6);
      this._otherChars.get(targetId)?.SetStatusBadge('followTarget', 'L', 6);
      this._statusMessenger.showLoot(`[Follow] char ${charId} following ${targetId}`);
    };
    fh.onUserShowPQReward = ({ charId, rewardId }) => {
      this._notice?.show('PQ Reward', `Character ${charId} reward ${rewardId}`);
      this._statusMessenger.showLoot(`[PQ Reward] char ${charId} reward ${rewardId}`);
    };
    fh.onUserSetPhase = ({ charId, phase }) => {
      this._otherChars.get(charId)?.SetStatusBadge('phase', `${phase}`, 5);
      this._statusMessenger.showLoot(`[Phase] char ${charId} phase ${phase}`);
    };
    fh.onShowRecoverUpgradeCountEffect = ({ charId, count }) => {
      this._statusMessenger.showLoot(`[Recover] char ${charId} count ${count}`);
    };
    fh.onUserMovingShootAttackPrepare = ({ charId, level, isCharging, skillId, facingLeft, nAction }) => {
      const name = skillId ? (this.game.nameService.SkillName(skillId) ?? `[${skillId}]`) : 'none';
      this._statusMessenger.showLoot(`[Moving Shoot] char ${charId} lv${level} charging=${isCharging} skill=${name} action=${nAction}`);
    };
    fh.onUserHit = ({ charId, attackIdx, damage }) => {
      const other = this._otherChars.get(charId);
      other?.OnHit();
      const pos = other?.HeadPosition ?? other?.Position;
      if (pos) this._dmgNumbers?.Add(damage, pos.x, pos.y - 10, DamageKind.MobDamage);
      this._statusMessenger.showLoot(`[Hit] char ${charId} atk${attackIdx} -${damage} HP`);
    };
    fh.onUserSetActiveEffectItem = ({ charId, itemId }) => {
      const other = this._otherChars.get(charId);
      if (itemId > 0) other?.SetStatusBadge('activeItem', 'E', 8);
      else other?.ClearStatusBadge('activeItem');
      const node = itemId > 0 ? this._effectWz?.GetItem(`ItemEff.img/${itemId}/0`) : null;
      // TODO_AUDIT.md Hundred-and-seventy-seventh pass: CItemEffectManager's
      // active effect item is stateful; keep its ItemEff loop until itemId=0.
      if (node) this._skillEffects?.PlayLoopAtCaster('activeItem', node, charId, other?.FacingLeft ?? true);
      else this._skillEffects?.CancelLoopAtCaster('activeItem', charId);
      this._statusMessenger.showLoot(`[Effect Item] char ${charId} item ${itemId}`);
    };
    fh.onUserShowUpgradeTombEffect = ({ charId, value, posX, posY }) => {
      this._otherChars.get(charId)?.SetStatusBadge('tombUpgrade', value ? 'T' : 'X', 5);
      this._statusMessenger.showLoot(`[Upgrade Tomb] char ${charId} value ${value} at (${posX},${posY})`);
    };
    fh.onUserSetTemporaryStat = ({ charId, maskLo, maskHi, buffs, defenseAtt, defenseState, diceInfo, swallowBuffTime, blessingArmorIncPAD }) => {
      const other = this._otherChars.get(charId);
      if (other) {
        other.SetTemporaryStats(maskLo, maskHi, buffs, defenseAtt, defenseState, diceInfo, swallowBuffTime, blessingArmorIncPAD);
        const combined = maskLo | (maskHi << 64n);
        const names = describeSecondaryStatMask(combined);
        other.SetStatusBadge('tempStat', names[0]?.slice(0, 1) ?? 'S', 8);
      }
      const combined = maskLo | (maskHi << 64n);
      const names = describeSecondaryStatMask(combined);
      this._chatBar.addLine(`[TempStat] char ${charId}: ${names.join(', ') || combined}`);
    };
    fh.onUserResetTemporaryStat = ({ charId, maskLo, maskHi }) => {
      const other = this._otherChars.get(charId);
      if (other) {
        other.ClearTemporaryStats(maskLo, maskHi);
        if (other.TempStatMaskLo === 0n && other.TempStatMaskHi === 0n) {
          other.ClearStatusBadge('tempStat');
        }
      }
      const combined = maskLo | (maskHi << 64n);
      const names = describeSecondaryStatMask(combined);
      this._chatBar.addLine(`[TempStat Reset] char ${charId}: ${names.join(', ') || combined}`);
    };
    fh.onUserReceiveHP = ({ charId, curHP, maxHP }) => {
      const other = this._otherChars.get(charId);
      const pos = other?.HeadPosition ?? other?.Position;
      if (pos) this._dmgNumbers?.Add(curHP, pos.x, pos.y - 10, DamageKind.HealHp);
      const pct = maxHP > 0 ? Math.round(100 * curHP / maxHP) : 0;
      this._statusMessenger.showLoot(`[HP] char ${charId} ${curHP}/${maxHP} (${pct}%)`);
    };
    fh.onUserGuildNameChanged = ({ charId, guildName }) => {
      const ch = this._otherChars.get(charId);
      if (ch) {
        // Re-read existing mark data from the char, update only the name
        ch.SetGuildInfo(guildName, 0, 0, 0, 0);
      }
    };
    fh.onUserGuildMarkChanged = ({ charId, markBg, markBgColor, mark, markColor }) => {
      const ch = this._otherChars.get(charId);
      if (ch) {
        ch.SetGuildInfo('', markBg, markBgColor, mark, markColor);
      }
    };
    fh.onUserThrowGrenade = ({ charId, posX, posY, tKeyDown, skillId, unk }) => {
      const name = this.game.nameService.SkillName(skillId) ?? `[${skillId}]`;
      this._statusMessenger.showLoot(`[Grenade] char ${charId} skill ${name} at (${posX},${posY}) keyDown=${tKeyDown}`);
    };

    // ── Medium-priority packet handler wiring ──────────────────────────

    // OG: CUserLocal::OnOpenUI (0x9055f0) — server opens a UI panel.
    // OG: CWvsContext::UI_Open maps uiType to specific UI windows.
    fh.onOpenUI = (uiType: number) => {
      // OG: UI_Open switch — most types toggle their visibility.
      // A few are handled specially by the server (type 21=party search, 33=repair).
      this._statusMessenger.showLoot(`[UI] Open type ${uiType}`);
    };

    // OG: CUserLocal::OnOpenUIWithOption (0x932320) — server opens a UI with extra data.
    fh.onOpenUIWithOption = (uiType: number, option: number) => {
      if (uiType === 7) {
        // OG: Close quest UI then toggle with option — quest page navigation
        this._statusMessenger.showLoot(`[UI] Quest toggle option=${option}`);
      } else if (uiType === 21) {
        // OG: CUIPartySearch::RequestPartyAdverSearch
        this._statusMessenger.showLoot(`[UI] Party search option=${option}`);
      } else if (uiType === 33) {
        // OG: CRepairDurabilityDlg — durability repair dialog
        this._statusMessenger.showLoot(`[UI] Repair durability option=${option}`);
      }
    };

    // OG: CUserLocal::OnNoticeMsg (0x9181f0) — server sends a notice popup.
    fh.onNoticeMsg = (message: string) => {
      this._notice?.show('Notice', message);
    };

    // OG: CUserLocal::OnChatMsg — local echo of the player's own sent chat.
    fh.onUserLocalChatMsg = (message: string) => {
      // The local echo confirms the server received our chat; add to chat log.
      // Only add if non-empty and not a duplicate of what we already displayed locally.
      if (message) this._chatBar.addLine(message);
    };

    // OG: CUserLocal::OnRadioSchedule — server tells client to play radio music
    fh.onRadioSchedule = (musicFile: string, duration: number) => {
      // TODO: wire to audio service when radio/BGM playback is implemented
    };
    // OG: CUserLocal::OnQuestGuideResult — minimap arrow to quest objective (pure UI)
    fh.onQuestGuideResult = (_questId: number) => {
      // TODO: draw minimap quest arrow when quest guide UI is implemented
    };
    // OG: CUserLocal::OnDeliveryQuest — delivery quest notification
    fh.onDeliveryQuest = (_questId: number) => {
      // TODO: show delivery quest notification dialog
    };

    // OG: CUser::OnMiniRoomBalloon — other characters' trade shop balloons.
    fh.onMiniRoomBalloon = (args) => {
      const other = this._otherChars.get(args.charId);
      if (!other) return;
      if (args.miniRoomType === 0) {
        other.SetStatusBadge('miniRoom', '', 0);
      } else {
        const icon = args.miniRoomType === 1 ? '🏪' : args.miniRoomType === 2 ? '🎮' : '📋';
        other.SetStatusBadge('miniRoom', icon, 6);
      }
    };

    fh.onPetActivated = (args) => {
      this._applyPetActivated(args);
      if (args.hasPet) {
        this._statusMessenger.showLoot(`[Pet] char ${args.charId} slot ${args.petIdx} summoned ${args.name ?? ''}`);
      } else {
        this._statusMessenger.showLoot(`[Pet] char ${args.charId} slot ${args.petIdx} removed (reason ${args.removeReason ?? 0})`);
      }
    };
    fh.onPetEvol = (args) => {
      this._applyPetEvol(args);
      this._statusMessenger.showLoot(`[Pet] char ${args.charId} slot ${args.petIdx} evolved into ${args.name}`);
    };
    fh.onPetMove = ({ charId, petIdx, movePath }) => {
      const pet = this._petAt(charId, petIdx);
      if (!pet) return;
      if (movePath) pet.ReplayMove(movePath);
      else pet.SnapNearOwner();
    };
    fh.onPetAction = ({ charId, petIdx, type, actionNo, chat, flag }) => {
      const pet = this._petAt(charId, petIdx);
      if (!pet) return;
      pet.OnAction(type, actionNo, chat, flag);
      if (chat) {
        this._chatBar.addLine(`[Pet] ${chat}`);
      }
    };
    fh.onPetNameChange = ({ charId, petIdx, newName, showNameTag }) => {
      const pet = this._petAt(charId, petIdx);
      if (!pet) return;
      pet.OnNameChanged(newName, showNameTag);
      this._statusMessenger.showLoot(`[Pet] ${newName} renamed`);
    };
    fh.onPetLoadExceptionList = ({ charId, petIdx, lockerSN, itemIds }) => {
      this._petAt(charId, petIdx)?.SetExceptionList(lockerSN, itemIds);
    };
    fh.onPetActionCommand = ({ charId, petIdx, nType, interactionIdx, successFlag }) => {
      this._petAt(charId, petIdx)?.OnActionCommand(nType, interactionIdx ?? 0, successFlag);
    };
    fh.onDragonMove = ({ charId, movePath }) => {
      const dragon = this._ensureDragon(charId);
      if (movePath) dragon.ReplayMove(movePath);
    };
    fh.onDragonAfterMove = ({ charId, movePath }) => {
      const dragon = this._ensureDragon(charId);
      if (movePath) dragon.ReplayMove(movePath);
    };
    fh.onDragonAction = ({ charId, action, option }) => {
      this._ensureDragon(charId).PlayAction(action);
      this._statusMessenger.showLoot(`[Dragon] char ${charId} action ${action} option ${option}`);
    };
    fh.onMobStatSet = ({ mobId, statMask, statMaskHigh, stats }) => {
      const names = describeMobStatMask(statMask, statMaskHigh);
      this._mobs.get(mobId)?.SetStatusBadge('stat', names[0]?.slice(0, 1) ?? 'S', 8);
      if (names.length) this._chatBar.addLine(`[MobStat] ${mobId}: ${names.join(', ')}`);
    };
    fh.onMobStatReset = ({ mobId, statMask, statMaskHigh }) => {
      this._mobs.get(mobId)?.ClearStatusBadge('stat');
      const names = describeMobStatMask(statMask, statMaskHigh);
      if (names.length) this._chatBar.addLine(`[MobStat Reset] ${mobId}: ${names.join(', ')}`);
    };
    fh.onMobSuspendReset = ({ mobId, isSuspended }) => {
      if (isSuspended) this._statusMessenger.showLoot(`[Mob] ${mobId} doom/suspend reset`);
    };
    fh.onMobAffected = ({ mobId, skillId, duration }) => {
      const mob = this._mobs.get(mobId);
      if (mob) {
        mob.OnAffected(skillId, duration, performance.now());
        mob.SetStatusBadge('affected', 'A', Math.max(1, Math.ceil(duration / 100)));
      }
    };
    fh.onMobCatchEffect = ({ mobId, catchSkillId, catchItemId }) => {
      const itemName = this.game.nameService.ItemName(catchItemId) ?? `[${catchItemId}]`;
      const mob = this._mobs.get(mobId);
      const node = this._effectWz?.GetItem('Catch.img');
      const frames = node ? loadFrameSequence(this._loader, node) : [];
      // ponytail: OG catch effect has richer timing; one-shot WZ animation is the visible portable slice.
      if (mob && frames.length > 0) this._fieldFx.push({ frames, frameIndex: 0, frameTimer: 0, x: mob.Position.x, y: mob.Position.y, done: false });
      this._statusMessenger.showLoot(`[Mob Catch] ${mobId} with ${itemName}`);
    };
    fh.onMobEffectByItem = ({ mobId, itemId }) => {
      this._mobs.get(mobId)?.SetStatusBadge('item', 'I', 5);
      this._statusMessenger.showLoot(`[Mob] ${mobId} effect from item ${itemId}`);
    };
    fh.onMobIncChargeCount = ({ mobId, chargeCount, attackReady }) => {
      const mob = this._mobs.get(mobId);
      if (mob) mob.OnIncChargeCount(chargeCount, attackReady);
    };
    fh.onMobEscortFullPath = ({ mobId, state, stopDuration, movePath }) => {
      this._statusMessenger.showLoot(`[Escort] ${mobId} state ${state} path ${movePath ? 'set' : 'none'}`);
    };
    fh.onMobEscortStopPerm = ({ mobId }) => {
      this._statusMessenger.showLoot(`[Escort] ${mobId} permanently stopped`);
    };
    fh.onMobEscortStopSay = ({ mobId, stopDuration }) => {
      this._statusMessenger.showLoot(`[Escort] ${mobId} says - stop ${stopDuration}s`);
    };
    fh.onMobEscortReturnBefore = ({ mobId, state, stopDuration }) => {
      this._statusMessenger.showLoot(`[Escort] ${mobId} returning state ${state}`);
    };
    fh.onMobNextAttack = ({ mobId }) => {
      this._mobs.get(mobId)?.SetStatusBadge('nextAttack', '!', 3);
    };
    fh.onMobAttackedByMob = ({ mobId, attackerMobId }) => {
      const mob = this._mobs.get(mobId);
      if (mob) {
        mob.ShowHitEffect();
        this._mobSounds?.PlayDamage(mob.TemplateId);
      }
    };
    fh.onNpcTemplatePacket = ({ npcId, bMove }) => {
      const npc = this._npcs.find((n) => n.ObjId === npcId);
      if (npc) this._statusMessenger.showLoot(`[NPC] ${npc.Name || npcId} template ${bMove ? 'move' : 'update'}`);
      this._chatBar.addLine(`[NPC Template] ${npcId} move ${bMove}`);
    };
  }


  private _ensureDragon(charId: number): DragonLook {
    let dragon = this._dragons.get(charId);
    if (!dragon) {
      dragon = new DragonLook(charId);
      dragon.Load(this._loader, this._tamingMobWz);
      this._dragons.set(charId, dragon);
    }
    const ownerPos = charId === this._localCharId
      ? this._physics?.Position
      : this._otherChars.get(charId)?.Position;
    if (ownerPos) dragon.SetOwnerPosition(ownerPos.x, ownerPos.y);
    return dragon;
  }

  // OG: key code → human-readable name for #k<code># rich text tag.
  // Maps virtual key codes (VK_*) to display names matching OG StringPool output.
  private static _KEY_NAMES: Record<number, string> = {
    8: 'Backspace', 9: 'Tab', 13: 'Enter', 16: 'Shift', 17: 'Ctrl', 18: 'Alt',
    19: 'Pause', 20: 'Caps Lock', 27: 'Escape', 32: 'Space',
    33: 'Page Up', 34: 'Page Down', 35: 'End', 36: 'Home',
    37: 'Left', 38: 'Up', 39: 'Right', 40: 'Down',
    44: 'Print Screen', 45: 'Insert', 46: 'Delete',
    91: 'LWin', 92: 'RWin', 93: 'Apps',
    96: 'Num 0', 97: 'Num 1', 98: 'Num 2', 99: 'Num 3', 100: 'Num 4',
    101: 'Num 5', 102: 'Num 6', 103: 'Num 7', 104: 'Num 8', 105: 'Num 9',
    106: 'Num *', 107: 'Num +', 109: 'Num -', 110: 'Num .', 111: 'Num /',
    112: 'F1', 113: 'F2', 114: 'F3', 115: 'F4', 116: 'F5', 117: 'F6',
    118: 'F7', 119: 'F8', 120: 'F9', 121: 'F10', 122: 'F11', 123: 'F12',
    144: 'Num Lock', 145: 'Scroll Lock',
    186: ';', 187: '=', 188: ',', 189: '-', 190: '.', 191: '/',
    192: '`', 219: '[', 220: '\\', 221: ']', 222: '\'',
  };

  private static _keyName(code: number): string {
    if (GameStage._KEY_NAMES[code]) return GameStage._KEY_NAMES[code];
    if (code >= 48 && code <= 57) return String.fromCharCode(code); // 0-9
    if (code >= 65 && code <= 90) return String.fromCharCode(code); // A-Z
    return `Key ${code}`;
  }

  // OG: CTextAnalyzer::GetPhrase_Sharp/GetPhraseType/GetParameterNo
  // TODO_AUDIT.md Hundred-and-eighteenth pass: full CTextAnalyzer tag table
  // (decompile 0x9836b0/0x97d650/0x97d620/0x987cc0). GetPhraseType maps tag
  // letters → type numbers; AnalyzeText switch branches on them. Format rules
  // from GetPhrase_Sharp (0x9836b0): `#E`,`#I`,`#S`,`#K`,`#w` are
  // self-closing (no trailing `#`) — they set CT_INFO.nType=3 as style-change
  // markers. All others read until the next `#` terminator. GetParameterNo
  // (0x97d620) = `atoi(phrase+2)` for numeric payloads.
  // Tag table (confirmed from AnalyzeText 0x987cc0 switch):
  //   #L<text># (1) → list bullet (nType=4, width=18)
  //   #E (2), #I (3), #S (4), #K (5), #w (6) → color/style markers (nType=3)
  //   #i<id># / #v<id># (7) → item link (nType=1, loads item icon + name)
  //   #e<id># (9) → same as type 7 but via CheckSecretItemID (outline)
  //   #s<id># (10) → skill link (nType=1, loads skill icon + name)
  //   #F<wzpath># / #f<wzpath># (11) → WZ face/avatar image (nType=2)
  //   #B<n># (13) → progress bar percentage (nType=2, clamped 10–100)
  //   #j<text># (14) → inline text passthrough
  //   #Q<questId># (15) → quest expire-time from CharacterData
  //   #D<questId># (16) → play-time record from CharacterData
  //   #W<wzpath># (17) → inline WZ canvas
  // Scoped down to text-substitution (no clickable rich text — ChatBar uses
  // plain Pixi Text, not multi-span). Types 11, 15, 16, 17 need CharacterData
  // or WZ-canvas — stripped; types 2-6 are pure style markers — stripped.
  private _resolveChatItemLinks(text: string): string {
    const ns = this.game.nameService;
    return text
      // Types 7/9: #i/#v/#e + numeric id → [ItemName]
      .replace(/#[ive](\d+)#/g, (_m, id) =>
        `[${ns.ItemName(Number(id)) ?? id}]`)
      // Type 10: #s + skillId → [SkillName]
      .replace(/#s(\d+)#/g, (_m, id) =>
        `[${ns.SkillName(Number(id)) ?? id}]`)
      // Type 13: #B<n># → n% (clamped 10-100 by OG)
      .replace(/#B(\d+)#/gi, (_m, n) => `${n}%`)
      // Type 14: #j<text># → pass through content between tags
      .replace(/#j([^#]*)#/gi, (_m, content) => content)
      // Type 1: #L<text># → bullet (content after #L is ignored)
      .replace(/#L[^#]*#/gi, '• ')
      // #k<keyCode># → [Key: Name]
      .replace(/#k(\d+)#/g, (_m, code) => `[Key: ${GameStage._keyName(Number(code))}]`)
      // #n → player character name
      .replace(/#n/g, this._statusBar?.charName ?? '')
      // Types 11/12: #F/#f + WZ path — strip (WZ canvas, not portable)
      .replace(/#[Ff][^#]*#/g, '')
      // Types 15–17: #Q/#D/#W + content — strip (CharacterData/WZ-canvas)
      .replace(/#[QDW][^#]*#/gi, '')
      // Types 2–5: #E #I #S #K — self-closing style markers, no trailing #
      .replace(/#[EISK]/g, '')
      // Type 6: #w — self-closing layout-toggle marker
      .replace(/#w/g, '');
  }

  private _onSetField(args: SetFieldArgs): void {
    console.log(`[GameStage] _onSetField called: stat=${!!args.stat}, statusBar=${!!this._statusBar}, equipped=${args.equipped?.length ?? 0}`);
    this._fearEffect.hide();
    this._fieldKey = args.fieldKey;
    this._localCharId = args.characterId ?? 0;
    this._isFieldTransferring = false;
    this._comboKeys.clear();
    this._killCountHud.hide();
    this._massacreGaugeHud.hide();
    this._monsterCarnival?.Clear();
    this._shopMarker?.Clear();
    this.game.eventHandlers.resetFieldState();

    // Guild load — doesn't depend on field.
    if (!this._guildLoadSent && this.game.session.isConnected) {
      this._guildLoadSent = true;
      this.game.session.send(GameSender.GuildLoad());
    }

    // Stat / look / inventory — apply if statusBar/equip already exist,
    // otherwise store for deferred application in _initMenu.
    const stat = args.stat;
    if (stat && this._statusBar) {
      this._applyStatToStatusBar(stat);
    } else if (stat) {
      this._pendingStat = stat;
    }
    // Store equipped items — applied in _initMenu if statusBar/equip panel not ready yet
    this._pendingEquipped = args.equipped ?? null;
    this._pendingEquippedCash = args.equippedCash ?? null;
    if (this._pendingEquipped && this._equip) {
      this._applyPendingEquipped();
    }
    // OG: CUIItem::Draw renders meso from CharacterData at y=268.
    if (args.money !== undefined) this._item?.setMeso(args.money);
    if (args.look) {
      this._player?.SetAvatar(args.look);
      if (this._charInfo) {
        this._charInfo.avatarLook = args.look;
        // OG: CUIUserInfo::SetMedalAchievementInfo — medal from hairEquip slot 49
        const medalId = args.look.hairEquip.get(49 /* BodyPartSlot.Medal */);
        if (medalId) {
          const medalName = this.game.nameService?.ItemName(medalId) ?? `Medal ${medalId}`;
          this._charInfo.medal = {
            medalItemId: medalId,
            medalName,
            count: 1,
            questNames: [],
          };
        } else {
          this._charInfo.medal = null;
        }
        // OG: CUIUserInfo::SetAvatarInfo — extract taming mob equip from body parts
        // Slot 18 = saddle, Slot 19 = taming mob equip, Slot 20 = mob equip
        const saddleId = args.look.hairEquip.get(18) ?? 0;
        const mobEquipId = args.look.hairEquip.get(19) ?? 0;
        const mobId = args.look.hairEquip.get(20) ?? 0;
        if (saddleId > 0 || mobEquipId > 0) {
          this._charInfo.hasTamingMob = true;
          if (!this._charInfo.tamingMob) {
            this._charInfo.tamingMob = { name: 'Taming Mob', level: 0, exp: 0, fatigue: 0, items: [] };
          }
          // Populate taming mob equipped items
          const tamingItems: import('../ui/game/CharInfo.js').TamingMobItem[] = [];
          if (saddleId > 0) {
            const saddleName = this.game.nameService?.ItemName(saddleId) ?? `Item ${saddleId}`;
            tamingItems.push({ itemId: saddleId, name: saddleName, info: '' });
          }
          if (mobEquipId > 0) {
            const mobEquipName = this.game.nameService?.ItemName(mobEquipId) ?? `Item ${mobEquipId}`;
            tamingItems.push({ itemId: mobEquipId, name: mobEquipName, info: '' });
          }
          if (mobId > 0) {
            const mobName = this.game.nameService?.MobName(mobId) ?? `Mob ${mobId}`;
            this._charInfo.tamingMob.name = mobName;
          }
          this._charInfo.tamingMob.items = tamingItems;
        }
        // OG: CUIUserInfo::SetAvatarInfo — extract pet equipped items from body parts
        // Pet body parts: 26-28 (pet 0-2 hat), 35-37 (pet 0-2 clothing), 43-45 (pet 0-2 accessory)
        const petSlots = [
          { hat: 26, cloth: 35, acc: 43 }, // pet 0
          { hat: 27, cloth: 36, acc: 44 }, // pet 1
          { hat: 28, cloth: 37, acc: 45 }, // pet 2
        ];
        for (let pi = 0; pi < 3; pi++) {
          const pet = this._charInfo.pets[pi];
          if (!pet) continue;
          const slots = petSlots[pi];
          const petItems: import('../ui/game/CharInfo.js').PetItem[] = [];
          for (const slotId of [slots.hat, slots.cloth, slots.acc]) {
            const itemId = args.look.hairEquip.get(slotId) ?? 0;
            if (itemId > 0) {
              const itemName = this.game.nameService?.ItemName(itemId) ?? `Item ${itemId}`;
              petItems.push({ itemId, name: itemName, info: '' });
            }
          }
          pet.items = petItems;
        }
      }
      this._itemEffects?.SetCharacter(this._localCharId, args.look);
      this._spawnPetsForOwner(this._localCharId, args.look.petIds);
      // Attach buff visual overlay to player container
      if (this._player && !this._buffVisual.container.parent) {
        this._player.container.addChild(this._buffVisual.container);
      }
    }

    if (!this._mapWz) {
      // Map.wz not loaded yet — defer the transition until it is.
      this._deferredFieldArgs = args;
      return;
    }

    // Clear entities immediately — the terrain swap is deferred to full black
    // (see _advanceFieldTransition) so the old map never pops to the new one.
    this._mobs.clear();
    this._npcs.length = 0;
    this._mobCtl.clear();
    this._otherChars.clear();
    this._drops.length = 0;
    this._reactors.clear();
    this._employees.clear();
    this._townPortals.clear();
    this._affectedAreas.clear();
    this._openGates.clear();
    this._diedMobIds.clear();
    this._prevExp = -1;
    this._pets.clear();
    this._dragons.clear();
    this._itemEffects?.Clear();
    this._equipStats.clear();

    // Begin the map-change fade.
    this._pendingField = args;
    this._fadePhase = 1;
  }

  /** Swap the field at full black — pop-free map transition. */
  private _applyFieldChange(args: SetFieldArgs): void {
    const mapId = args.stat?.posMap ?? args.posMap ?? 0;
    const portalId = args.stat?.portal ?? args.portal ?? 0;

    if (this._field) {
      this.mapRoot.removeChild(this._field.container);
    }
    this._field = new FieldScene(this._mapWz, this._loader, this._camera);
    this._field.Load(mapId);
    this._fieldSubgameHud.SetField(this._field.Info.FieldType, mapId);
    if (this._townPortalStatus) this._fieldSubgameHud.SetMessage(this._townPortalStatus);
    this.game.fieldHandlers.setCurrentFieldType(this._field.Info.FieldType);

    // OG: CField_Dojang (fieldType=14) — show dojang HUD for Mu Lung Dojo maps
    // Floor progression is server-driven; initial floor set via clock/subType packet
    if (this._field.Info.FieldType === 14) {
      this._dojangHud.setFloor(1);
      this._dojangHud.container.visible = true;
    } else {
      this._dojangHud.hide();
    }

    // OG: CField_Dojang::CanUseSpecialArts (0x54EA40) —
    // In dojang maps, certain skills are restricted. The restriction is applied
    // at the skill-use gate. For now, store the flag for future use.
    this._dojangSpecialArts = DojangHud.canUseSpecialArts(this._field.Info.FieldType);

    // OG: CField::Restore* family — apply field-specific state on entry
    this._restoreFieldState();

    if (this._field.Info.Effect.length > 0) {
      const node = this._effectWz?.GetItem(`MapEff.img/${this._field.Info.Effect}`);
      if (node) this._skillEffects?.PlayFullScreen(node);
    }
    this.mapRoot.addChild(this._field.container);
    if (this._dmgNumbers) this.mapRoot.addChild(this._dmgNumbers.container);
    this.mapRoot.addChild(this._shopMarkerLayer);
    this.mapRoot.addChild(this._skillEffectLayer);
    this.mapRoot.addChild(this._itemEffectLayer);
    this.mapRoot.addChild(this._projectileLayer);
    this.mapRoot.addChild(this._entityLayer);
    this.mapRoot.addChild(this._coupleHeartLayer);
    this.mapRoot.addChild(this._fieldFxLayer);
    if (this._tombstone) {
      this._tombstone.Reset();
      this.mapRoot.addChild(this._tombstone.container);
    }

    this._physics = new PlayerController(this._field);
    this._physics.SetStats(0, 0);
    this._physics.onTakeFallDamage = (dmg) => {
      if (this._stats?.hp !== undefined) {
        this._stats.hp = Math.max(0, this._stats.hp - dmg);
        this._statusBar.hp = this._stats.hp;
        if (this._stats.hp <= 0) {
          this._isPlayerDead = true;
          this._tombstone?.Spawn({ x: this._physics!.Position.x, y: this._physics!.Position.y });
        }
      }
    };
    this._field.PlacePlayerAtPortal(this._physics, portalId);
    // Recreate mob controllers with the new field — controllers created during
    // the fade reference the old field and can't find footholds on the new map.
    if (this._mobCtl.size > 0) {
      const oldCtl = [...this._mobCtl.entries()];
      this._mobCtl.clear();
      for (const [mobId] of oldCtl) {
        const mob = this._mobs.get(mobId);
        if (mob) this._createMobController(mobId, mob);
      }
    }
    // Flush any mob controllers that were deferred before the map loaded.
    // Snapshot the array first — _createMobController may push back to it
    // if _mobInfoSvc isn't ready yet, which corrupts the iterator.
    if (this._pendingMobControllers.length > 0) {
      console.log(`[MobCtrl] Flushing ${this._pendingMobControllers.length} deferred controllers`);
      const pending = [...this._pendingMobControllers];
      this._pendingMobControllers = [];
      for (const p of pending) {
        this._createMobController(p.mobId, p.mob);
      }
    }
    if (this._player) {
      this._player.Position = this._physics.Position;
    }
    this._camera.Target = this._physics.Position;
    this._camera.MapBounds = this._field.Bounds;
    if (this._miniMap) {
      this._miniMap.isVisible = !this._field.Info.HideMinimap;
      const mapName = this.game.nameService.MapShortName(mapId) ?? this.game.nameService.MapName(mapId) ?? `Map ${mapId}`;
      const streetName = this.game.nameService.MapStreetName(mapId) ?? '';
      this._miniMap.setMapData(this._field.MiniMap, mapName, streetName);
      this._miniMap.setPortals(
        Object.values(this._field.Portals).map((p) => ({ x: p.X, y: p.Y })),
      );
      // OG: m_nMiniMapType — read from field info (0=simple, 1=normal)
      this._miniMap.setMiniMapType(this._field.Info.MiniMapType as 0 | 1);
      // OG: OnMouseButton — sends packet when clicking player dot
      this._miniMap.onPlayerDotClick = () => this.game.session.send(GameSender.UserMiniMapClick());
      // Live foothold reference for dynamic foothold state on minimap
      this._miniMap.setFootholds(this._field.Footholds);
      // OG: WorldMap button on minimap → toggle CWorldMapDlg
      this._miniMap.onBtWorldMap = () => {
        if (this._worldMap) this._worldMap.isVisible = !this._worldMap.isVisible;
      };
    }
    this._playMapBgm(this._field.Info.Bgm);
    // Initialize buff visuals for current field
    this._updateBuffVisuals();
    // OG: pet auto-speaking on warp/map change (event 1)
    this._firePetEvent(1);
  }

  /** Play map BGM from Sound.wz. The bgm string is e.g. "Bgm01/300000000" —
   *  resolve to "Bgm01.img/300000000" in Sound.wz, then PlayLoop. */
  private _playMapBgm(bgm: string): void {
    if (!bgm || bgm === this._currentBgm) return;
    const slash = bgm.indexOf('/');
    if (slash <= 0) return;
    const dir = bgm.substring(0, slash);
    const name = bgm.substring(slash + 1);
    const node = this._mobSoundWz?.GetItem(`${dir}.img/${name}`);
    if (node instanceof WzSound) {
      this.game.audioPlayer.PlayLoop(node.AudioBytes);
      this._currentBgm = bgm;
    }
  }

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
  private _restoreFieldState(): void {
    if (!this._field) return;
    const info = this._field.Info;

    // OG: CField_Dojang — initialize dojang state for fieldType=14 maps
    // Floor number comes from the map name or server data; default to 1
    // Mob count is tracked as mobs enter/leave the field
    if (info.FieldType === 14) {
      this._dojangHud.setFloor(1);
      this._dojangHud.container.visible = true;
      // Update player stats immediately
      if (this._stats) {
        this._dojangHud.updatePlayerStats(
          this._stats.hp ?? 0, this._stats.maxHp ?? 0,
          this._stats.mp ?? 0, this._stats.maxMp ?? 0,
        );
      }
    }

    // RestoreForbiddenSkill (0x532FB0): store forbidden skill IDs
    // Used by DoActiveSkill to gate skill use in restricted fields
    if (info.ForbiddenSkills.length > 0) {
      this._forbiddenSkills = new Set(info.ForbiddenSkills);
    } else {
      this._forbiddenSkills = null;
    }

    // RestoreAllowedItem (0x532AB0): store allowed item IDs
    // Used by onUseItem to gate item use in restricted fields
    if (info.AllowedItems.length > 0) {
      this._allowedItems = new Set(info.AllowedItems);
    } else {
      this._allowedItems = null;
    }

    // RestoreClock (0x533AB0): start clock/timer if field has clock node
    if (info.ClockType > 0 && info.ClockDuration > 0) {
      this._clock.startCountdown(info.ClockDuration);
    }

    // RestoreHelpMsg (0x52FF40): show help messages from Map.wz
    // OG reads help/0, help/1, ... from MapString and shows as status messages
    // Help messages are loaded during FieldScene._loadInfo and stored in MapInfo
    // For now, we just note that help messages exist — they'd need MapString resolution
    if (info.HelpMsgCount > 0) {
      // Help messages require StringPool/MapString resolution which isn't fully wired
      // The count is stored in MapInfo for future use
    }

    // RestoreWeatherMsg (0x53CF80): show weather message
    if (info.WeatherMsg) {
      this._statusMessenger?.showTip(`Weather: ${info.WeatherMsg}`);
    }

    // RestorePhaseBG (0x532DD0): set phase background
    // OG loads phase background from Map.wz and applies to the field
    if (info.PhaseBG) {
      // Phase background is a WZ path — would need to load and display
      // For now, store for future use
    }

    // RestoreOption (0x53B070): apply field options
    // OG uses this to set various field-level options
    if (info.FieldOption !== 0) {
      // Field option is a bitmask — applied to field behavior
    }

    // RestoreSwinArea (0x5330E0): set swim area bounds
    // OG defines swim-capable regions for swimming animation
    if (info.SwimAreaRect) {
      // Swim area rect is used by PlayerController for swim mode
    }

    // RestoreUserInfo (0x53FA30): show user info
    if (info.UserInfo) {
      // User info is displayed in the field
    }

    // RestorePeculiarInfo (0x546560): show peculiar info
    if (info.PeculiarInfo) {
      // Peculiar info is displayed in the field
    }
  }

  /** Drives the map-change fade: fade to black → swap at full black → fade in. */
  private _advanceFieldTransition(dt: number): void {
    const FadeToBlackPerSec = 1 / 0.18;  // ~180 ms to black
    const FadeInPerSec      = 1 / 0.30;  // ~300 ms to clear

    // Start a deferred transition once Map.wz is finally loaded.
    if (this._fadePhase === 0 && this._deferredFieldArgs && this._mapWz) {
      const args = this._deferredFieldArgs;
      this._deferredFieldArgs = null;
      this._pendingField = args;
      this._fadePhase = 1;
    }

    if (this._fadePhase > 0) {
      this._fadeAlpha += dt * FadeToBlackPerSec;
      if (this._fadeAlpha >= 1) {
        this._fadeAlpha = 1;
        if (this._pendingField) {
          const pending = this._pendingField;
          this._pendingField = null;
          this._applyFieldChange(pending);
        }
        this._fadePhase = -1; // begin fade-in
      }
    } else if (this._fadePhase < 0) {
      this._fadeAlpha -= dt * FadeInPerSec;
      if (this._fadeAlpha <= 0) {
        this._fadeAlpha = 0;
        this._fadePhase = 0;
      }
    }
  }

  private _onMobEnter(args: MobEnterArgs): void {
    const mob = new MobLook(args.mobId, args.templateId);
    mob.Load(this._loader, this._mobWz);
    mob.nameOf = this._mobNameOf;
    mob.onDieSound = (templateId) => this._mobSounds?.PlayDie(templateId);
    mob.onHitSound = (templateId) => this._mobSounds?.PlayDamage(templateId);
    mob.getPlayerLevel = () => this._stats.level;
    mob.Position = { x: args.x, y: args.y };
    // Initialize HP from packet + stats from MobInfoService
    if (args.maxHp != null && args.maxHp > 0) mob.MaxHp = args.maxHp;
    if (args.curHp != null) mob.Hp = args.curHp;
    if (this._mobInfoSvc) {
      const info = this._mobInfoSvc.Get(args.templateId);
      if (mob.MaxHp <= 0) mob.MaxHp = info.MaxHp;
      mob.MaxMp = info.MaxMp;
      mob.IsBoss = info.Boss;
      mob.DamagedByMob = info.DamagedByMob;
      mob._info = info;
      mob.Stat.InitFromInfo(info.Pad, info.Pdr, info.Mad, info.Mdr, info.Acc, info.Eva);
    }
    if (this._field) {
      const g = this._field.GetFootholdBelow(args.x, args.y - 1);
      const gy = g?.YAt(args.x);
      if (gy != null) mob.Position.y = gy;
    }
    this._mobs.set(args.mobId, mob);
    // OG: if mob enters with controller flag, immediately create MobController
    if (args.controllerFlag) this._createMobController(args.mobId, mob);

    // OG: CField_Dojang::Update (0x54EF10) — boss HP bar overlay
    // When a boss mob enters a dojang map, show the boss HP bar
    if (this._field?.Info.FieldType === 14 && mob.IsBoss) {
      const bossName = mob.nameOf?.(args.templateId) || `Boss ${args.templateId}`;
      this._dojangHud.onBossEnter(args.templateId, bossName, 100);
    }
  }

  private _onMobMove(args: MobMoveArgs): void {
    // OG: CMob::OnMove (0x652200) — processes server-driven mob movement
    const mob = this._mobs.get(args.mobId);
    if (!mob) {
      console.log(`[MobMove] mob ${args.mobId} not in _mobs (size=${this._mobs.size})`);
      return;
    }
    console.log(`[MobMove] mob ${args.mobId} elements=${args.movePath.elements.length} origin=${args.movePath.originX},${args.movePath.originY}`);

    // Extract direction from bLeft (bit 0 = facing direction)
    const facingLeft = (args.bLeft & 1) !== 0;
    mob.SetFacing(facingLeft);

    // Extract move action from bLeft (bits 1-7)
    const moveAction = args.bLeft >> 1;

    // Process the MovePath elements — interpolate through each element
    const path = args.movePath;
    if (path.elements.length > 0) {
      // Store full path for interpolation over time
      mob._movePathElements = path.elements;
      // Reset interpolation state for new path
      (mob as any)._movePathIndex = 0;
      (mob as any)._movePathTimer = 0;
      // Snap to first element immediately for responsiveness
      const firstEl = path.elements[0];
      mob.Position = { x: firstEl.x, y: firstEl.y };

      // If the mob has a controller (local client), update it
      const ctl = this._mobCtl.get(args.mobId);
      if (ctl) {
        ctl.OnServerMove(path, moveAction, facingLeft);
      }
    } else {
      // No movement elements — just use origin
      mob.Position = { x: path.originX, y: path.originY };
    }

    // Update animation based on move action (OG MobActionType → MobState mapping)
    if (!args.bNotChangeAction) {
      const state = this._mapMoveActionToState(moveAction);
      mob.SetState(state);
    }
  }

  /** OG MobActionType → MobState mapping */
  private _mapMoveActionToState(moveAction: number): number {
    // OG MobActionType enum:
    // 0-6: Stand/Move variants
    // 7-9: Hit1, Hit2, Hit3
    // 10-12: Die1, Die2, Die3
    // 13-21: Attack1-Attack9, AttackF
    // 22-38: Skill1-Skill16, Skill17
    // 39: Fly
    if (moveAction >= 13 && moveAction <= 21) {
      // Attack actions → Attack state (13=Attack, 14=Attack2, ..., 21=AttackF)
      return 2 + (moveAction - 13); // MobState.Attack=2, Attack2=3, etc.
    } else if (moveAction >= 7 && moveAction <= 9) {
      // Hit actions → Hit state (7=Hit, 8=Hit2, 9=Hit3)
      return 3 + (moveAction - 7); // MobState.Hit=3, Hit2=4, Hit3=5
    } else if (moveAction >= 10 && moveAction <= 12) {
      // Die actions → Die state (10=Die, 11=Die2, 12=Die3)
      return 4 + (moveAction - 10); // MobState.Die=4, Die2=5, Die3=6
    } else if (moveAction >= 22 && moveAction <= 38) {
      // Skill actions → Skill state (22=Skill1, ..., 38=Skill17)
      return 26 + (moveAction - 22); // MobState.Skill1=26, etc.
    } else if (moveAction === 39) {
      return 9; // MobState.Fly
    } else if (moveAction === 1 || moveAction === 2) {
      return 1; // MobState.Move
    } else {
      return 0; // MobState.Stand
    }
  }

  private _onMobDamaged(args: MobDamagedArgs): void {
    const mob = this._mobs.get(args.mobId);
    if (!mob) return;
    if (args.hp >= 0) mob.Hp = args.hp;
    if (args.damage > 0) {
      mob._lastDamage = args.damage;
      mob.ShowHitEffect();
      mob.ShowDamage(args.damage, false, false);
      this._mobSounds?.PlayDamage(mob.TemplateId);
    }
    // DamagedByMob mobs show HP indicator when damaged by other mobs
    if (mob.DamagedByMob && args.maxHp > 0) {
      const pct = Math.floor((args.hp / args.maxHp) * 100);
      mob.CreateHPIndicator(pct, 0xFF0000);
      mob.ShowHPIndicator();
    }
    if (args.hp === 0) this._killMob(mob);
  }

  private _onMobHpIndicator(mobId: number, pct: number): void {
    const mob = this._mobs.get(mobId);
    if (!mob) return;
    if (pct === 0) {
      this._killMob(mob);
      return;
    }
    // OG: CField_Dojang::Update (0x54EF10) — boss HP bar overlay
    // In dojang maps, the boss mob's HP percentage drives the HP bar
    // OG: pct is 0-10000 (100% = 10000), converted to 0-100 for the bar
    if (this._field?.Info.FieldType === 14 && pct > 0) {
      this._dojangHud.onBossHpUpdate(pct / 100);
    }
  }

  private _onReactorEnter(args: ReactorEnterArgs): void {
    const reactor = new ReactorLook(args.objId, args.templateId, args.state);
    // Real WZ sprite/animation load — previously never called anywhere, so
    // every reactor permanently rendered as ReactorLook's placeholder
    // graphic regardless of whether real Reactor.wz art existed.
    reactor.Load(this._loader, this._reactorWz);
    reactor.Position = { x: args.x, y: args.y };
    if (this._field) {
      const g = this._field.GetFootholdBelow(args.x, args.y - 1);
      const gy = g?.YAt(args.x);
      if (gy != null) reactor.Position.y = gy;
    }
    this._reactors.set(args.objId, reactor);
  }

  private _onReactorLeave(args: ReactorLeaveArgs): void {
    const r = this._reactors.get(args.objId);
    if (r) { r.container.removeFromParent(); r.container.destroy(); }
    this._reactors.delete(args.objId);
  }

  private _onReactorChangeState(args: ReactorChangeStateArgs): void {
    const reactor = this._reactors.get(args.objId);
    if (!reactor) return;
    reactor.SetState(args.state);
    reactor.Position = { x: args.x, y: args.y };
  }

  private _onReactorMove(args: ReactorMoveArgs): void {
    const reactor = this._reactors.get(args.objId);
    if (!reactor) return;
    reactor.Position = { x: reactor.Position.x + args.dx, y: reactor.Position.y + args.dy };
  }

  private _onEmployeeEnter(args: EmployeeEnterArgs): void {
    const emp = new EmployeeLook(args.objId, args.employerObjId, args.nameTag ?? null);
    emp.Position = { x: args.x, y: args.y };
    this._employees.set(args.objId, emp);
  }

  private _onEmployeeLeave(objId: number): void {
    const emp = this._employees.get(objId);
    if (emp) { emp.container.removeFromParent(); emp.container.destroy(); }
    this._employees.delete(objId);
  }

  private _onSummonedEnter(args: SummonedEnterArgs): void {
    const s = new SummonedLook(args.objId, args.charId, args.skillId);
    s.Position = { x: args.x, y: args.y };
    s.FootholdId = args.curFoothold;
    s.SetMoveAction(args.moveAction);
    s.Load(this._loader, this._skillWz);
    s.SetFootholds(Object.values(this._field?.Footholds ?? {}));
    this._summons.set(args.objId, s);
  }

  private _onSummonedLeave(args: SummonedLeaveArgs): void {
    const s = this._summons.get(args.objId);
    if (s) { s.container.removeFromParent(); s.container.destroy(); }
    this._summons.delete(args.objId);
  }

  private _onSummonedMove(args: SummonedMoveArgs): void {
    const s = this._summons.get(args.objId);
    if (!s) return;
    s.ReplayMove(args.movePath);
  }

  private _onTownPortalEnter(args: TownPortalEnterArgs): void {
    const tp = new TownPortalLook(args.objId, args.state, args.characterId);
    tp.Position = { x: args.x, y: args.y };
    this._townPortals.set(args.objId, tp);
  }

  private _onTownPortalLeave(args: TownPortalLeaveArgs): void {
    const tp = this._townPortals.get(args.objId);
    if (tp) { tp.container.removeFromParent(); tp.container.destroy(); }
    this._townPortals.delete(args.objId);
  }

  private _setTownPortalStatus(message: string): void {
    // TODO_AUDIT.md follow-up: RestoreTownPortal has no separate replay packet here;
    // ponytail: keep the decoded notify text and replay it through the existing HUD.
    this._townPortalStatus = message;
    this._fieldSubgameHud.SetMessage(message);
    this._statusMessenger.showLoot(message);
  }

  private _onAffectedAreaCreate(args: AffectedAreaArgs): void {
    const aa = new AffectedAreaLook(args.objId, args.type, args.ownerId, args.skillId ?? 0, args.skillLevel ?? 0, args.left, args.top, args.right, args.bottom);
    aa.Position = { x: args.x, y: args.y };
    this._affectedAreas.set(args.objId, aa);
  }

  private _onOpenGateCreate(args: OpenGateCreateArgs): void {
    const og = new OpenGateLook(args.characterId, args.state, args.first);
    og.Position = { x: args.x, y: args.y };
    this._openGates.set(this._openGateKey(args.characterId, args.first), og);
  }

  private _onOpenGateRemove(args: OpenGateRemoveArgs): void {
    const og = this._openGates.get(this._openGateKey(args.characterId, args.first));
    if (og) { og.container.removeFromParent(); og.container.destroy(); }
    this._openGates.delete(this._openGateKey(args.characterId, args.first));
  }

  private _openGateKey(characterId: number, first: boolean): string {
    return `${characterId}:${first ? 1 : 0}`;
  }

  private static readonly MeleeReachX = 120;
  private static readonly MeleeReachY = 40;
  private static readonly AttackCooldownSeconds = 0.6;

  /** Handle a chat line: route slash commands locally, send the rest as UserChat. */
  private _handleChatCommand(line: string): void {
    if (!line.startsWith('/')) {
      // OG: try pet commands first — if any active pet recognizes the input,
      // don't send as regular chat. If the pet is level 15+, also send via
      // ChatCommand (pet speaks the message in a balloon).
      const localPets = this._pets.get(this._localCharId) ?? [];
      for (const pet of localPets) {
        if (!pet) continue;
        if (pet.ParseCommand(line)) return;
      }
      // No pet command matched — send as regular chat.
      // But if a level 15+ pet exists, also have the pet speak it.
      for (const pet of localPets) {
        if (pet && pet.GetLevel() >= 15) {
          pet.ChatCommand(line);
          break;
        }
      }
      this.game.session.send(GameSender.UserChat(line));
      return;
    }
    const lower = line.toLowerCase();
    const rest = (cmd: string) => line.length > cmd.length ? line.substring(cmd.length).trim() : '';

    if (lower === '/accept') {
      if (this._hasPendingPartyInvite) {
        this.game.session.send(GameSender.PartyJoin(this._pendingInviterId));
        this._hasPendingPartyInvite = false;
        this._pendingInviterId = 0;
      } else {
        this._statusMessenger.showLoot('No pending party invite.');
      }
      return;
    }
    if (lower === '/create' || lower === '/partycreate') {
      this.game.session.send(GameSender.PartyCreate());
      return;
    }
    if (lower === '/leave' || lower === '/partyleave') {
      this.game.session.send(GameSender.PartyLeave());
      return;
    }
    if (lower === '/partysearch' || lower === '/lfg') {
      if (this._partySearchDialog) this._partySearchDialog.Open();
      return;
    }
    if (lower === '/vega') {
      if (this._vegaDialog) this._vegaDialog.Open();
      return;
    }
    if (lower.startsWith('/invite ')) {
      const name = rest('/invite ');
      if (name.length > 0) this.game.session.send(GameSender.PartyInvite(name));
      return;
    }
    if (lower.startsWith('/p ') || lower.startsWith('/party ')) {
      const msg = lower.startsWith('/p ') ? rest('/p ') : rest('/party ');
      // TODO_AUDIT.md Tenth pass + Hundred-and-thirty-seventh pass: real OG
      // sends this through GroupChat (150) with the client-resolved
      // online-member-id list, not plain UserChat — `_partyCharIds` (already
      // tracked for the minimap leader marker) is exactly that list for Party.
      // Guild/Alliance/Buddy now use guildMemberIds/allianceMemberIds/
      // onlineFriendIds from UserList. Alliance membership tracking uses the
      // same onAllianceLoad data already decoded and stored.
      if (msg.length > 0) {
        const memberIds = [...this._partyCharIds.keys()];
        this.game.session.send(GameSender.GroupChat(ChatGroupType.Party, memberIds, msg));
      }
      return;
    }
    if (lower.startsWith('/b ') || lower.startsWith('/buddy ')) {
      const msg = lower.startsWith('/b ') ? rest('/b ') : rest('/buddy ');
      if (msg.length > 0) {
        const memberIds = [...this._userList.onlineFriendIds.keys()];
        this.game.session.send(GameSender.GroupChat(ChatGroupType.Friend, memberIds, msg));
      }
      return;
    }
    if (lower.startsWith('/g ') || lower.startsWith('/guild ')) {
      const msg = lower.startsWith('/g ') ? rest('/g ') : rest('/guild ');
      if (msg.length > 0) {
        const memberIds = [...this._userList.guildMemberIds.keys()];
        this.game.session.send(GameSender.GroupChat(ChatGroupType.Guild, memberIds, msg));
      }
      return;
    }
    if (lower.startsWith('/a ') || lower.startsWith('/alliance ')) {
      const msg = lower.startsWith('/a ') ? rest('/a ') : rest('/alliance ');
      if (msg.length > 0) {
        const memberIds = [...this._userList.allianceMemberIds.keys()];
        this.game.session.send(GameSender.GroupChat(ChatGroupType.Alliance, memberIds, msg));
      }
      return;
    }
    if (lower.startsWith('/w ') || lower.startsWith('/whisper ')) {
      const arg = lower.startsWith('/w ') ? rest('/w ') : rest('/whisper ');
      const sp = arg.indexOf(' ');
      if (sp > 0) {
        const target = arg.substring(0, sp);
        const text = arg.substring(sp + 1).trim();
        if (text.length > 0) this.game.session.send(GameSender.Whisper(target, text));
      }
      return;
    }
    if (lower.startsWith('/dropmeso ')) {
      const amount = Math.trunc(Number(rest('/dropmeso ')));
      if (Number.isFinite(amount) && amount > 0) this.game.session.send(GameSender.DropMoney(amount));
      else this._statusMessenger.showLoot('Usage: /dropmeso <amount>');
      return;
    }
    if (lower.startsWith('/apup ')) {
      const args = rest('/apup ').split(/\s+/);
      const statMap: Record<string, MapleStat> = { str: MapleStat.Str, dex: MapleStat.Dex, int: MapleStat.Int, luk: MapleStat.Luk };
      const stat = statMap[args[0]?.toLowerCase()];
      const count = Math.trunc(Number(args[1]));
      if (stat !== undefined && Number.isFinite(count) && count > 0) {
        this.game.session.send(GameSender.UserAbilityMassUp([[stat, count]]));
      } else {
        this._statusMessenger.showLoot('Usage: /apup <str|dex|int|luk> <count>');
      }
      return;
    }
    if (lower.startsWith('/shop ') || lower === '/shop') {
      const title = rest('/shop ');
      this.game.session.send(GameSender.MiniRoomCreate(MiniRoomType.PersonalShop, title, '', 0));
      return;
    }
    if (lower.startsWith('/m invite ')) {
      const name = rest('/m invite ');
      if (name.length > 0) this.game.session.send(GameSender.MessengerInvite(name));
      return;
    }
    if (lower === '/m leave') {
      this.game.session.send(GameSender.MessengerLeave());
      return;
    }
    if (lower.startsWith('/m ')) {
      const msg = rest('/m ');
      if (msg.length > 0) this.game.session.send(GameSender.MessengerChat(msg));
      return;
    }
    if (lower.startsWith('/omok ') || lower === '/omok') {
      this.game.session.send(GameSender.MiniRoomCreate(MiniRoomType.OmokRoom, rest('/omok '), '', 0));
      return;
    }
    if (lower.startsWith('/memorygame ') || lower === '/memorygame') {
      this.game.session.send(GameSender.MiniRoomCreate(MiniRoomType.MemoryGameRoom, rest('/memorygame '), '', 0));
      return;
    }
    if (lower.startsWith('/miniroom invite ')) {
      const name = rest('/miniroom invite ');
      let target: OtherCharLook | null = null;
      for (const c of this._otherChars.values()) { if (c.Name === name) { target = c; break; } }
      if (target) this.game.session.send(GameSender.MiniRoomInvite(target.CharId));
      else this._statusMessenger.showLoot(`No visible player named "${name}"`);
      return;
    }
    if (lower === '/miniroom leave') {
      this.game.session.send(GameSender.MiniRoomLeave());
      return;
    }
    if (lower.startsWith('/trade ')) {
      const name = rest('/trade ');
      let target: OtherCharLook | null = null;
      for (const c of this._otherChars.values()) { if (c.Name === name) { target = c; break; } }
      if (target) {
        this.game.session.send(GameSender.MiniRoomCreateTrade());
        this.game.session.send(GameSender.MiniRoomInvite(target.CharId));
      } else {
        this._statusMessenger.showLoot(`No visible player named "${name}"`);
      }
      return;
    }
    if (lower === '/resetap') {
      this._reset?.OpenAp({ str: this._stats.str, dex: this._stats.dex, int: this._stats.intStat, luk: this._stats.luk }, this._stats.ap);
      return;
    }
    if (lower === '/tournament') {
      if (this._tournamentWindow) this._tournamentWindow.isVisible = !this._tournamentWindow.isVisible;
      return;
    }
    if (lower === '/maker') {
      this._maker?.Open(Maker.BuildRecipeList(this.game.wz.etc ?? null, (id) => this.game.nameService.ItemName(id)));
      return;
    }
    if (lower === '/medals') {
      this._medalQuestInfo.Open(this.game.questInfoService?.MedalGroups() ?? []);
      return;
    }
    if (lower === '/charsale') {
      this._characterSale?.Open();
      return;
    }
    if (lower === '/help' || lower === '/?') {
      this._statusMessenger.showLoot('Commands: /p /b /g /a — group chat, /w <name> <msg> — whisper');
      this._statusMessenger.showLoot('Party: /create, /invite <name>, /accept, /leave, /partysearch');
      this._statusMessenger.showLoot('/dropmeso <amount> — drop mesos on the ground');
      this._statusMessenger.showLoot('/apup <str|dex|int|luk> <count> — allocate multiple AP at once');
      this._statusMessenger.showLoot('/resetap — redistribute AP among stats');
      this._statusMessenger.showLoot('/shop <title> — create a personal shop here');
      this._statusMessenger.showLoot('/m invite <name>, /m <text>, /m leave — Messenger (buddy chat)');
      this._statusMessenger.showLoot('/omok <title>, /memorygame <title>, /miniroom invite <name>, /miniroom leave');
      this._statusMessenger.showLoot('/trade <name> — start a trade with a visible player');
      this._statusMessenger.showLoot('/vega — open Vega spell enhancement dialog');
      this._statusMessenger.showLoot('/tournament — toggle the tournament status panel');
      this._statusMessenger.showLoot('/maker — open the first local ItemMake recipes');
      this._statusMessenger.showLoot('/medals — open medal quest list');
      this._statusMessenger.showLoot('/charsale — open character-sale name check panel');
      return;
    }
    this.game.session.send(GameSender.UserChat(line));
  }

  // WZ portal "pt" types that plainly auto-trigger a field transfer on touch
  // with no further server-side logic, per the long-public MapleStory
  // portal-type convention. Deliberately excludes pt=0 (start point),
  // pt=10/11 (hidden/key-press), and pt=7/8 (script portals — those likely
  // expect a script-trigger flow before any field transfer, not an instant
  // one) — wrong trigger behavior there is worse than just not firing.
  private static readonly AutoTouchPortalTypes = new Set([1, 2, 3, 4, 5, 6, 9]);
  private static readonly PortalTouchRadiusX = 20;
  private static readonly PortalTouchRadiusYUp = 100;
  private static readonly PortalTouchRadiusYDown = 10;

  private _checkPortalTouch(): void {
    if (this._isFieldTransferring || !this._field || !this._physics) return;
    const pos = this._physics.Position;

    // OG: CPortalList::UpdateHiddenPortal proximity check.
    // Hidden portals (pt=10/11) show PH/PSH animation when the player is
    // within the portal's hRange/vRange rect. Only one hidden portal is
    // active at a time — the first match wins (matching the OG's linear
    // scan of m_aPortal_Hidden).
    let foundHiddenIdx: number | null = null;
    for (const portal of Object.values(this._field.Portals)) {
      if (portal.Type !== 10 && portal.Type !== 11) continue;
      const hRange = portal.HRange || 50;
      const vRange = portal.VRange || 50;
      const dx = Math.abs(pos.x - portal.X);
      const dy = Math.abs(pos.y - portal.Y);
      if (dx <= hRange && dy <= vRange) {
        foundHiddenIdx = portal.Index;
        break;
      }
    }
    this._field.SetActiveHiddenPortal(foundHiddenIdx);

    for (const portal of Object.values(this._field.Portals)) {
      if (!GameStage.AutoTouchPortalTypes.has(portal.Type)) continue;
      if (!portal.TargetPortal && portal.TargetMap === 999999999) continue;
      const dx = Math.abs(pos.x - portal.X);
      const dy = pos.y - portal.Y;
      if (dx <= GameStage.PortalTouchRadiusX
        && dy >= -GameStage.PortalTouchRadiusYUp && dy <= GameStage.PortalTouchRadiusYDown) {
        this._isFieldTransferring = true;
        this.game.session.send(GameSender.TransferField(this._fieldKey, portal.TargetMap, portal.TargetPortal, pos.x, pos.y));
        return;
      }
    }
  }

  private _tryMeleeAttack(): void {
    if (!this._physics) return;
    this._attackCooldown = GameStage.AttackCooldownSeconds;
    this._physics.StopWalking();

    const pos = this._physics.Position;
    const facingLeft = this._physics.FacingLeft;
    const attackAction = this._player?.PickAttackAction() ?? 'swingO1';
    this._player?.PlayAttackAction(attackAction);
    const minX = facingLeft ? pos.x - GameStage.MeleeReachX : pos.x;
    const maxX = facingLeft ? pos.x : pos.x + GameStage.MeleeReachX;
    const minY = pos.y - GameStage.MeleeReachY * 2;
    const maxY = pos.y + GameStage.MeleeReachY;

    let closest: MobLook | null = null;
    let bestDist = Infinity;
    for (const mob of this._mobs.values()) {
      if (mob.IsDead) continue;
      const mp = mob.Position;
      const hx0 = mp.x - 20, hx1 = mp.x + 20, hy0 = mp.y - 50, hy1 = mp.y;
      if (hx1 < minX || hx0 > maxX || hy1 < minY || hy0 > maxY) continue;
      const dx = pos.x - mp.x, dy = pos.y - mp.y;
      const d = dx * dx + dy * dy;
      if (d < bestDist) { bestDist = d; closest = mob; }
    }

    const targets: MeleeTarget[] = [];
    if (closest) {
      const weaponId = this._equip.equippedWeaponItemId;
      const wt = weaponId !== null ? getWeaponType(weaponId) : 0;
      const attr = weaponId !== null ? this._itemIcons?.LoadAttr(weaponId) : null;
      const dmgRange = calcDamageRange(this._job, wt, attr?.IncPad ?? 0, attr?.IncMad ?? 0, this._stats.str, this._stats.dex, this._stats.intStat, this._stats.luk, 0);
      const dmg = dmgRange.min + Math.floor(Math.random() * (dmgRange.max - dmgRange.min + 1));
      targets.push(new MeleeTarget(closest.MobId, [dmg], closest.Position.x, closest.Position.y, 0));
      closest.ShowHitEffect();
      this._mobSounds?.PlayDamage(closest.TemplateId);
      this._dmgNumbers?.Add(dmg, closest.HeadPosition.x, closest.HeadPosition.y);
      // TODO_AUDIT.md Sixty-seventh pass: CBattleRecordMan — no critical-hit
      // flag exists on this client's own outgoing damage anywhere, so
      // isCritical is always false here (documented simplification).
      this._battleRecord?.AddDamage(dmg, false, false);
      const ctl = this._mobCtl.get(closest.MobId);
      ctl?.OnDamagedByPlayer();
      ctl?.ApplyHitKnockback(closest.Position.x >= pos.x ? 25 : -25);
    }

    // TODO_AUDIT.md Hundred-and-forty-ninth pass: send and render the same basic-attack action.
    const actionAndDir = (facingLeft ? 0x8000 : 0x0000) | AttackAction.CodeFor(attackAction);
    const blob = MeleeAttackEncoder.Encode(
      this._fieldKey, actionAndDir, 6, pos.x, pos.y, targets, 1);
    this.game.session.sendRaw(blob);

    // OG: CUserLocal::RegisterAfterimage (0x902d90) — after each attack,
    // stores AFTERIMAGEINFO with the attack's timing, direction, action,
    // weapon afterimage UOL, and SFX UOL from the weapon's character entry.
    // The afterimage is drawn as a fading trail behind the weapon swing.
    this._registerAfterimage(pos, facingLeft, attackAction);
  }

  // OG: CUserLocal::RegisterAfterimage (0x902d90) — stores afterimage data
  // for the attack trail effect. The afterimage UOL is built from:
  //   skill-specific: SKILLENTRY::GetAfterimageUOL → "{base}/{weaponName}/{level}"
  //   basic attack: "Effect/Character/{weaponType}/{level}" where level = floor((mastery-10)/5)
  // SfxUOL comes from the weapon's Character.wz entry (sSfx field).
  private _registerAfterimage(
    pos: { x: number; y: number }, facingLeft: boolean, attackAction: string,
  ): void {
    const weaponId = this._equip?.equippedWeaponItemId ?? null;
    const actionCode = AttackAction.CodeFor(attackAction);

    // Build afterimage UOL from weapon type and mastery level
    // OG: GetAfterimageUOL (0x8ed0c0) — for basic attacks (no skill),
    // path = "Effect/Character/{weaponName}/{masteryLevel}"
    // where masteryLevel = max(0, floor((mastery - 10) / 5))
    let afterimageUOL = '';
    if (weaponId !== null) {
      const wt = getWeaponType(weaponId);
      const masteryLevel = Math.max(0, Math.floor((this._masteryFromSkills - 10) / 5));
      // Weapon name from item ID — OG uses StringPool for weapon category names
      const weaponNames: Record<number, string> = {
        30: 'sword', 31: 'sword', 32: 'sword', 33: 'dagger',
        37: 'wand', 38: 'staff', 39: 'knuckle',
        40: 'axe', 41: 'axe', 42: 'hammer',
        43: 'bow', 44: 'crossbow', 45: 'claw',
        46: 'gun', 47: 'gun',
      };
      const weaponName = weaponNames[wt] ?? 'sword';
      afterimageUOL = `Effect/Character/${weaponName}/${masteryLevel}`;
    }

    this._afterimageInfo = {
      tStart: Date.now(),
      bLeft: facingLeft,
      nAction: actionCode,
      sAfterimageUOL: afterimageUOL,
      sSfxUOL: '',
      weaponItemId: weaponId ?? 0,
      subWeaponItemId: 0,
    };
  }

  private _comboContext(): ComboCastContext {
    return {
      jobId: this._job,
      getSkillLevel: (skillId) => this._skillRecords.find((r) => r.skillId === skillId)?.level ?? 0,
      isAttacking: () => this._player?.IsPlayingOneTimeAction ?? false,
      // OG: CFinishAttack::GetDummySkillID (0x6de770) returns 32001007-32001011
      // based on current Aran combo stage. Map combo counter to variant:
      //   combo 0-1   → 32001007 (basic)
      //   combo 2-4   → 32001008
      //   combo 5-9   → 32001009
      //   combo 10-19 → 32001010
      //   combo 20+   → 32001011
      aranFinishSkillId: () => {
        const c = this._comboCounter;
        if (c >= 20) return 32001011;
        if (c >= 10) return 32001010;
        if (c >= 5) return 32001009;
        if (c >= 2) return 32001008;
        return 32001007;
      },
    };
  }

  private _killMob(mob: MobLook): void {
    // OG: CMob::OnDie (decompile/64e4b0.c) calls TrySpeaking(-1,-1) after
    // setting m_nOneTimeAction to rand()%nDieCount+10 (Die1=10..DieF=12).
    // Match any SpeakEntry with action in {10,11,12} (MobActionType Die1-DieF).
    if (this._mobInfoSvc) {
      const info = this._mobInfoSvc.Get(mob.TemplateId);
      const dieEntries = info.SpeakEntries.filter(e => e.action >= 10 && e.action <= 12);
      if (dieEntries.length > 0) {
        mob.TrySpeaking(-1, -1, dieEntries);
      }
      mob.OnDieComplete(3); // dieCount=3 → Die1/Die2/Die3
    } else {
      mob.OnDie();
    }
    if (!this._diedMobIds.has(mob.MobId)) {
      this._diedMobIds.add(mob.MobId);
      this._mobSounds?.PlayDie(mob.TemplateId);
    }
    this._mobCtl.delete(mob.MobId);

    // OG: CField_Dojang::Update — when boss mob dies, clear the boss HP bar
    if (this._field?.Info.FieldType === 14 && mob.IsBoss) {
      this._dojangHud.onBossLeave();
    }

    // OG: CField_Dojang — track mob count for floor progression
    if (this._field?.Info.FieldType === 14) {
      const remaining = this._mobs.size - 1; // -1 for the mob being killed
      this._dojangHud.setMobCount(Math.max(0, remaining));
    }
  }

  /** Resolve a quest id to its current state (0=available, 1=in-progress, 2=completed). */
  private _questStateOf(id: number): number {
    return this._questStates.get(id) ?? 0;
  }

  /** Mirrors equip-tab (`invType===1`) ops with a negative slot — the real
      `nCurItemPos`/`GW_ItemSlotEquip` convention for "currently worn" — into the
      separate paper-doll `EquipInventory` panel. `_item.applyOps` already tracks
      this same data generically by `(tab, pos)`, but `EquipInventory` has its own
      independent `_equipped` map (keyed by body part, for the "Hat"/"Top"/etc.
      slot layout) that nothing else populates — without this, the Equipment
      panel always renders empty regardless of what's actually worn. */
  /** Apply stat data to statusBar/stats panels — called from _onSetField or deferred to _initMenu. */
  private _applyStatToStatusBar(stat: CharacterStat): void {
    if (this._statusBar) {
      this._statusBar.level = stat.level;
      this._statusBar.nextExp = NextLevelExpTable[stat.level - 1] ?? 0;
      this._statusBar.hp = stat.hp;
      this._statusBar.maxHp = stat.maxHp;
      this._statusBar.mp = stat.mp;
      this._statusBar.maxMp = stat.maxMp;
      this._statusBar.exp = stat.exp;
      this._statusBar.charName = stat.name;
      this._statusBar.jobName = this.game.nameService.SkillName(stat.job * 10000) ?? `Job ${stat.job}`;
    }
    if (this._stats) {
      this._stats.level = stat.level;
      this._stats.str = stat.str;
      this._stats.dex = stat.dex;
      this._stats.intStat = stat.int;
      this._stats.luk = stat.luk;
      this._stats.ap = stat.ap;
      this._stats.fame = stat.pop;
      this._stats.hp = stat.hp;
      this._stats.maxHp = stat.maxHp;
      this._stats.mp = stat.mp;
      this._stats.maxMp = stat.maxMp;
      this._stats.job = this.game.nameService.SkillName(stat.job * 10000) ?? `Job ${stat.job}`;
      this._stats.setPlayerName(stat.name);
      this._stats.exp = stat.exp;
      this._stats.nextLevelExp = NextLevelExpTable[stat.level - 1] ?? 0;
      this._stats.jobCategory = Math.floor(stat.job / 100) % 10;
    }
    this._job = stat.job;
    if (this._equip) this._equip.setJobId(stat.job, stat.level, stat.subJob);
    if (this._charInfo) {
      this._charInfo.charName = stat.name;
      this._charInfo.level = stat.level;
      this._charInfo.job = this.game.nameService.SkillName(stat.job * 10000) ?? `Job ${stat.job}`;
      this._charInfo.isLocalChar = true;
      this._charInfo.characterId = this._localCharId;
    }
    this._syncStatDetailInputs();
  }

  /** Apply pending equipped items from SetField — called after _initMenu creates the equip panel. */
  private _applyPendingEquipped(): void {
    if (this._pendingEquipped) {
      for (const { slot, item } of this._pendingEquipped) {
        const bodyPart = this._bodyPartFromEquippedPos(InventoryType.Equip, slot);
        if (bodyPart > 0) {
          const name = this.game.nameService.ItemName(item.itemId) ?? `[${item.itemId}]`;
          this._equip.setEquippedByBodyPart(bodyPart, item.itemId, name, item.equip?.grade ?? 0, item.equip ?? undefined);
          if (item.equip) this._equipStats.set(bodyPart, item.equip);

          // OG: When weapon is equipped during initial load, update PlayerController's weapon stand/walk type
          if (bodyPart === 11 && this._physics) {
            const actMan = ActionMan.GetInstance();
            const imgEntry = actMan.GetCharacterImgEntry(item.itemId, null);
            if (imgEntry) {
              this._physics.WeaponStand = imgEntry.nStand || 1;
              this._physics.WeaponWalk = imgEntry.nWalk || 1;
            }
          }
        }
      }
      this._pendingEquipped = null;
    }
    if (this._pendingEquippedCash) {
      for (const { slot, item } of this._pendingEquippedCash) {
        const bodyPart = this._bodyPartFromEquippedPos(InventoryType.Cash, slot + 100);
        if (bodyPart > 0) {
          const name = this.game.nameService.ItemName(item.itemId) ?? `[${item.itemId}]`;
          this._equip.setEquippedByBodyPart(bodyPart, item.itemId, name, item.equip?.grade ?? 0, item.equip ?? undefined);
        }
      }
      this._pendingEquippedCash = null;
    }
  }

  private _applyEquipOps(ops: InventoryOpArg[]): void {
    let equipOps = 0;
    for (const op of ops) {
      if (op.invType !== InventoryType.Equip && !(op.invType === InventoryType.Cash && (op.pos < 0 || (op.newPos ?? 0) < 0))) continue;
      equipOps++;
      switch (op.opType) {
        case InventoryOpType.Add:
          if (op.pos < 0 && op.itemId !== undefined) {
            this._setEquippedAvatarItem(op.invType, op.pos, op.itemId, op.equipStats);
          }
          break;
        case InventoryOpType.Move: {
          const newPos = op.newPos;
          if (newPos === undefined) break;
          if (op.pos < 0) this._clearEquippedAvatarItem(op.invType, op.pos);
          if (newPos < 0) {
            const tab = Math.max(0, op.invType - 1);
            const itemId = this._item.itemIdAt(tab, newPos);
            const invItem = this._item.itemAt(tab, newPos);
            if (itemId > 0) this._setEquippedAvatarItem(op.invType, newPos, itemId, invItem?.equipStats);
          }
          break;
        }
        case InventoryOpType.Remove:
          if (op.pos < 0) this._clearEquippedAvatarItem(op.invType, op.pos);
          break;
      }
    }
    if (equipOps > 0) console.log(`[GameStage] _applyEquipOps: ${equipOps} equip ops`);
  }

  private _bodyPartFromEquippedPos(invType: number, pos: number): number {
    const raw = -pos;
    return invType === InventoryType.Cash && raw >= 101 && raw <= 159 ? raw - 100 : raw;
  }

  private _setEquippedAvatarItem(invType: number, pos: number, itemId: number, equipStats?: EquipStats): void {
    const bodyPart = this._bodyPartFromEquippedPos(invType, pos);
    const name = this.game.nameService.ItemName(itemId) ?? `[${itemId}]`;
    this._equip.setEquippedByBodyPart(bodyPart, itemId, name, equipStats?.grade ?? 0, equipStats);
    if (equipStats) {
      this._equipStats.set(bodyPart, equipStats);
    }
    const look = this._player?.AvatarLook;
    if (!look || bodyPart <= 0 || bodyPart > 59) return;
    if (invType === InventoryType.Cash) {
      if (bodyPart === 11) {
        look.weaponStickerId = itemId;
        this._itemEffects?.SetCharacter(this._localCharId, look);
        return;
      }
      const prev = look.hairEquip.get(bodyPart);
      if (prev !== undefined && prev !== itemId) look.unseenEquip.set(bodyPart, prev);
    }
    look.hairEquip.set(bodyPart, itemId);
    this._itemEffects?.SetCharacter(this._localCharId, look);

    // OG: When weapon changes, update PlayerController's weapon stand/walk type
    // This determines which animation group (stand1/stand2, walk1/walk2) to use
    if (bodyPart === 11 && this._physics) {
      const actMan = ActionMan.GetInstance();
      const imgEntry = actMan.GetCharacterImgEntry(itemId, null);
      if (imgEntry) {
        this._physics.WeaponStand = imgEntry.nStand || 1;
        this._physics.WeaponWalk = imgEntry.nWalk || 1;
      }
    }
  }

  private _clearEquippedAvatarItem(invType: number, pos: number): void {
    const bodyPart = this._bodyPartFromEquippedPos(invType, pos);
    this._equip.unequipByBodyPart(bodyPart);
    this._equipStats.delete(bodyPart);
    const look = this._player?.AvatarLook;
    if (!look || bodyPart <= 0 || bodyPart > 59) return;
    if (invType === InventoryType.Cash) {
      if (bodyPart === 11) {
        look.weaponStickerId = 0;
        this._itemEffects?.SetCharacter(this._localCharId, look);
        return;
      }
      const regular = look.unseenEquip.get(bodyPart);
      if (regular !== undefined) {
        look.hairEquip.set(bodyPart, regular);
        look.unseenEquip.delete(bodyPart);
        this._itemEffects?.SetCharacter(this._localCharId, look);
        return;
      }
    }
    look.hairEquip.delete(bodyPart);
    look.unseenEquip.delete(bodyPart);
    this._itemEffects?.SetCharacter(this._localCharId, look);
  }

  /** v95 equip item id → equipped body part. 0 = not a known equip slot. */
  private static _equipBodyPart(itemId: number): number {
    const cat = Math.floor(itemId / 10000);
    switch (cat) {
      case 100: return 1;   // Hat
      case 101: return 2;   // Face acc
      case 102: return 3;   // Eye acc
      case 103: return 4;   // Earring
      case 104: return 5;   // Top
      case 105: return 5;   // Overall
      case 106: return 6;   // Bottom
      case 107: return 7;   // Shoes
      case 108: return 8;   // Gloves
      case 109: return 10;  // Shield
      case 110: return 9;   // Cape
      case 111: return 12;  // Ring
      case 112: return 17;  // Pendant
      case 113: return 49;  // Belt
      case 114: return 50;  // Medal
      default:
        return (Math.floor(itemId / 1_000_000) === 1 && cat >= 130 && cat <= 170) ? 11 : 0; // Weapon
    }
  }

  /** Resolve a skill id to a WzSprite icon (used by QuickSlotBar to render bound skill keys). */
  private _skillIcon(skillId: number): WzSprite | null {
    const cached = this._skillIconCache.get(skillId);
    if (cached) return cached;
    const canvas = this._skillService?.Get(skillId)?.Icon ?? null;
    const sprite = canvas ? this._loader.Load(canvas) : null;
    if (sprite) this._skillIconCache.set(skillId, sprite);
    return sprite;
  }

  // OG: is_state_change_item — categories 200,201,202,205,221,236,238,245
  private _isStateChangeItem(itemId: number): boolean {
    const cat = Math.floor(itemId / 10000);
    return cat === 200 || cat === 201 || cat === 202 || cat === 205
      || cat === 221 || cat === 236 || cat === 238 || cat === 245;
  }

  // OG CDraggableItem::MapFuncKey — determines which items can be bound to keys
  private _isBindableItem(itemId: number, invType: number): boolean {
    const cat = Math.floor(itemId / 10000);
    if (invType === 2) {
      // Use items: only state_change, pet_food, tamingmob_food, bridle, mobsummon
      return this._isStateChangeItem(itemId)
        || cat === 212 || cat === 226 || cat === 227 || cat === 210;
    }
    if (invType === 5) {
      // Cash items: only 524, 530, or etc_cash type 6
      return cat === 524 || cat === 530;
    }
    if (invType === 4) {
      // Etc items: only non_cash_effect (429)
      return cat === 429;
    }
    if (invType === 3) {
      // Setup items: only portable_chair (301)
      return cat === 301;
    }
    return false;
  }

  private _pendingMobControllers: Array<{ mobId: number; mob: MobLook }> = [];

  private _createMobController(mobId: number, mob: MobLook): void {
    if (!this._field || !this._mobInfoSvc) {
      this._pendingMobControllers.push({ mobId, mob });
      return;
    }
    const info = this._mobInfoSvc.Get(mob.TemplateId);
    if (!info) { console.log(`[MobCtrl] NO INFO for template ${mob.TemplateId}`); return; }
    const mc = new MobController(mob, this._field, info);
    console.log(`[MobCtrl] CREATED mobId=${mobId} tmpl=${mob.TemplateId} IsStay=${info.IsStay} MoveAbility=${info.MoveAbility} pos=${mob.Position.x},${mob.Position.y}`);
    mc.onAttackPlayer = (dmg) => {
      if (this._stats.hp !== undefined && this._stats.hp > 0) {
        const sec = this.game.fieldHandlers.secondaryStat;
        const stanceRate = sec.getStanceRate();
        if (stanceRate > 0 && Math.random() * 100 < stanceRate) {
          this._dmgNumbers?.Add(0, this._physics!.Position.x, this._physics!.Position.y - 40, DamageKind.MobDamage);
          return;
        }
        const mgReduction = sec.getMagicGuardReduction();
        let hpDamage = dmg;
        let mpDamage = 0;
        if (mgReduction > 0 && this._stats.mp !== undefined && this._stats.mp > 0) {
          mpDamage = Math.floor(dmg * mgReduction / 100);
          hpDamage = dmg - mpDamage;
          if (mpDamage > this._stats.mp) { mpDamage = this._stats.mp; hpDamage = dmg - mpDamage; }
          this._stats.mp = Math.max(0, this._stats.mp - mpDamage);
          this._statusBar.mp = this._stats.mp;
        }
        const mesoGuardRate = sec.getMesoGuardReduction();
        if (mesoGuardRate > 0 && mesoGuardRate <= 100) {
          const mesoAbsorb = Math.floor(hpDamage * mesoGuardRate / 100);
          hpDamage = Math.max(1, hpDamage - mesoAbsorb);
        }
        this._stats.hp = Math.max(0, this._stats.hp - hpDamage);
        this._statusBar.hp = this._stats.hp;
        if (hpDamage > 0) this._dmgNumbers?.Add(hpDamage, this._physics!.Position.x, this._physics!.Position.y - 40, DamageKind.MobDamage);
        // OG: when hit, play hit animation and show "hit" face expression
        this._player?.PlayOneTimeAction('hit1');
        this._player?.SetEmotion(1); // emotionId=1 = "hit" expression
        if (this._physics) {
          const dx = this._physics.Position.x - mob.Position.x;
          this._physics.ApplyKnockback((dx >= 0 ? 1 : -1) * 200, -100, 0.3);
        }
        if (this._stats.hp <= 0) {
          this._isPlayerDead = true;
          // OG: tombstone spawns at PLAYER position, not mob position
          if (this._physics) this._tombstone?.Spawn({ x: this._physics.Position.x, y: this._physics.Position.y });
        }
      }
    };
    // OG: body attack — collision damage when mob touches player
    mc.onBodyAttack = (dmg) => {
      if (this._stats.hp !== undefined && this._stats.hp > 0) {
        const sec = this.game.fieldHandlers.secondaryStat;
        const stanceRate = sec.getStanceRate();
        if (stanceRate > 0 && Math.random() * 100 < stanceRate) {
          this._dmgNumbers?.Add(0, this._physics!.Position.x, this._physics!.Position.y - 40, DamageKind.MobDamage);
          return;
        }
        const mgReduction = sec.getMagicGuardReduction();
        let hpDamage = dmg;
        let mpDamage = 0;
        if (mgReduction > 0 && this._stats.mp !== undefined && this._stats.mp > 0) {
          mpDamage = Math.floor(dmg * mgReduction / 100);
          hpDamage = dmg - mpDamage;
          if (mpDamage > this._stats.mp) { mpDamage = this._stats.mp; hpDamage = dmg - mpDamage; }
          this._stats.mp = Math.max(0, this._stats.mp - mpDamage);
          this._statusBar.mp = this._stats.mp;
        }
        const mesoGuardRate = sec.getMesoGuardReduction();
        if (mesoGuardRate > 0 && mesoGuardRate <= 100) {
          const mesoAbsorb = Math.floor(hpDamage * mesoGuardRate / 100);
          hpDamage = Math.max(1, hpDamage - mesoAbsorb);
        }
        this._stats.hp = Math.max(0, this._stats.hp - hpDamage);
        this._statusBar.hp = this._stats.hp;
        if (hpDamage > 0) this._dmgNumbers?.Add(hpDamage, this._physics!.Position.x, this._physics!.Position.y - 40, DamageKind.MobDamage);
        if (this._physics) {
          const dx = this._physics.Position.x - mob.Position.x;
          this._physics.ApplyKnockback((dx >= 0 ? 1 : -1) * 150, -80, 0.2);
        }
        if (this._stats.hp <= 0) {
          this._isPlayerDead = true;
          // OG: tombstone spawns at PLAYER position, not mob position
          if (this._physics) this._tombstone?.Spawn({ x: this._physics.Position.x, y: this._physics.Position.y });
        }
      }
    };
    this._mobCtl.set(mobId, mc);
  }

  private _onMobLeave(mobId: number, _lt: number): void {
    const mob = this._mobs.get(mobId);
    // OG: CField_Dojang::Update — when boss mob leaves, clear the boss HP bar
    if (mob && this._field?.Info.FieldType === 14 && mob.IsBoss) {
      this._dojangHud.onBossLeave();
    }
    this._mobs.delete(mobId);
    this._mobCtl.delete(mobId);
    this._diedMobIds.delete(mobId);
  }

  private _onNpcEnter(args: NpcEnterArgs): void {
    if (this._npcs.some(n => n.ObjId === args.objId)) return;
    const npc = new NpcLook(args.templateId);
    npc.Load(this._loader, this._npcWz, (npcId, key) => this.game.nameService.NpcText(npcId, key));
    npc.LoadNames((npcId, key) => this.game.nameService.NpcText(npcId, key));
    npc.ObjId = args.objId;
    // OG: position comes directly from the packet — the server sends the correct position
    npc.Position = { x: args.x, y: args.y };
    npc.FootholdId = args.footholdId;
    // OG: moveAction encodes direction — bit 0: 0=right, 1=left
    const facingLeft = (args.moveAction & 1) !== 0;
    npc.FaceLeft(facingLeft);
    // OG: SetMoveAction stores the full moveAction and sets up action layer
    npc.SetMoveAction(args.moveAction, false);
    npc.SetActive(args.bEnabled);
    npc.SetFootholds(Object.values(this._field?.Footholds ?? {}));
    // OG: DoActionOrChat → GenerateMovePath — sends NpcMoveRequest to server
    npc.onDoActionOrChat = (objectId, action, chatIdx) => {
      this.game.session.send(GameSender.NpcMoveRequest(objectId, action, chatIdx));
    };
    if (args.templateId === 1300000) {
      npc.SetBalloonOffset(0, -20);
    }
    this._npcs.push(npc);
  }

  private _onNpcLeave(objId: number): void {
    this._npcs = this._npcs.filter(n => n.ObjId !== objId);
  }

  private _onUserEnter(args: OtherCharEnterArgs): void {
    const ch = new OtherCharLook(args.charId, args.name, args.level, args.look ?? null);
    ch.SetPosition(args.x, args.y);
    ch.LoadSprites(this._loader, this._characterWz, this._itemWz, this._baseWz);
    // OG CUser::DrawNameTags — guild/medal data from the enter packet
    if (args.guildName) {
      ch.SetGuildInfo(
        args.guildName,
        args.guildMarkBg ?? 0, args.guildMarkBgColor ?? 0,
        args.guildMark ?? 0, args.guildMarkColor ?? 0,
      );
    }
    // Medal item from hairEquip slot 49 (OG m_avatarLook.anHairEquip[49])
    if (args.look) {
      const medalId = args.look.hairEquip.get(49 /* BodyPartSlot.Medal */);
      if (medalId) ch.SetMedalItemId(medalId);
    }
    this._otherChars.set(args.charId, ch);
    this._itemEffects?.SetCharacter(args.charId, args.look ?? null);
    if (args.look) {
      this._spawnPetsForOwner(args.charId, args.look.petIds);
    }
  }

  private _onUserLeave(charId: number): void {
    this._otherChars.delete(charId);
    this._itemEffects?.RemoveCharacter(charId);
    this._chatBalloon?.Clear(charId);
    this._removePetsForOwner(charId);
  }

  private _spawnPetsForOwner(ownerCharId: number, petIds: number[]): void {
    const existing = this._pets.get(ownerCharId) ?? [];
    for (let i = 0; i < 3; i++) {
      const tid = petIds[i];
      if (tid <= 0) continue;
      if (existing[i]) continue;
      const pet = new Pet(tid, ownerCharId);
      pet.Callbacks = this._makePetCallbacks();
      pet.PetIndex = i;
      const pos = ownerCharId === this._localCharId
        ? this._physics?.Position
        : this._otherChars.get(ownerCharId)?.Position;
      if (pos) pet.Position = { ...pos };
      pet.look.FaceLeft(false);
      pet.Load(this._loader, this._characterWz, this._itemWz);
      pet.PlayEffectCallback = (path) => {
        const node = this._effectWz?.GetItem(path);
        if (node) {
          const frames = loadFrameSequence(this._loader, node);
          if (frames.length > 0) {
            const petPos = pet.Position;
            this._fieldFx.push({ frames, frameIndex: 0, frameTimer: 0, x: petPos.x, y: petPos.y, done: false });
          }
        }
      };
      pet.ChatMessageCallback = (msg) => this._chatBar.addLine(msg);
      existing[i] = pet;
    }
    this._pets.set(ownerCharId, existing);
    if (ownerCharId === this._localCharId) this._syncEquipPetCount();
  }

  private _removePetsForOwner(ownerCharId: number): void {
    this._pets.delete(ownerCharId);
    if (ownerCharId === this._localCharId) this._syncEquipPetCount();
  }

  private _getLocalPetName(): string {
    const localPets = this._pets.get(this._localCharId);
    return localPets?.find((p): p is Pet => !!p)?.look.Name ?? '';
  }

  /** OG: fire AutoSpeakingByEvent on all local pets. Event indices: 0=levelup, 1=warp, etc. */
  private _firePetEvent(nEvent: number): void {
    const localPets = this._pets.get(this._localCharId) ?? [];
    for (const pet of localPets) {
      if (pet) pet.AutoSpeakingByEvent(nEvent);
    }
  }

  private _petAt(charId: number, petIdx: number): Pet | undefined {
    return this._pets.get(charId)?.[petIdx] ?? undefined;
  }

  /** Returns a PetCallbacks instance wired to GameSender for packet sending. */
  private _makePetCallbacks(): PetCallbacks {
    return {
      onPetAction: (lockerSN, type, action, chat) => {
        this.game.session.send(GameSender.PetAction(lockerSN, type, action, chat));
      },
      onPetInteraction: (lockerSN, hasName, interactionIdx) => {
        this.game.session.send(GameSender.PetInteractionRequest(lockerSN, hasName, interactionIdx));
      },
      onPetDropPickUp: (lockerSN, x, y, dropId, cliCrc, pickupOthers, sweepForDrop, longRange) => {
        this.game.session.send(GameSender.PetDropPickUpRequest(lockerSN, x, y, dropId, cliCrc, pickupOthers, sweepForDrop, longRange));
      },
      onPetExceptionList: (lockerSN, itemIds) => {
        this.game.session.send(GameSender.PetUpdateExceptionList(lockerSN, itemIds));
      },
      getEquipAbilityFlag: (petIdx: number) => {
        // OG: iterates pet equipment body parts (21-29, 46) and sums dwPetAbilityFlag
        const PET_ABIL_BODY_PARTS = [21, 22, 23, 24, 25, 26, 27, 28, 29, 46];
        let flag = 0;
        for (const bp of PET_ABIL_BODY_PARTS) {
          const itemId = this._player?.AvatarLook?.hairEquip.get(bp) ?? 0;
          if (itemId > 0 && this._itemInfo) {
            flag |= this._itemInfo.GetPetAbilityFlag(itemId);
          }
        }
        return flag;
      },
    };
  }

  private _syncEquipPetCount(): void {
    if (!this._equip) return;
    const localPets = this._pets.get(this._localCharId) ?? [];
    let count = 0;
    for (let i = 0; i < 3; i++) if (localPets[i]) count = i + 1;
    this._equip.setPetCount(count);
  }

  // OG: CUserLocal::OnPetActivated (0x90fb90) — opcodes 198/200. Creates,
  // replaces, or removes the pet at the exact petIdx slot from real summon data.
  // When hasPet=false, reads a removeReason (1-4) and shows a chat message.
  // After creation: NotifyAvatarModified, update pet consume items, set
  // position contexts based on how many pets are active.
  private _applyPetActivated(args: PetActivatedArgs): void {
    const pets = this._pets.get(args.charId) ?? [];
    if (args.hasPet && args.templateId !== undefined) {
      // OG: when forceReplace, clear existing pet first
      if (args.forceReplace) {
        pets[args.petIdx] = null;
      }
      const pet = new Pet(args.templateId, args.charId);
      pet.Callbacks = this._makePetCallbacks();
      pet.PetIndex = args.petIdx;
      pet.Position = { x: args.x ?? 0, y: args.y ?? 0 };
      pet.look.Name = args.name ?? '';
      pet.LockerSN = args.lockerSN ?? null;
      pet.Load(this._loader, this._characterWz, this._itemWz);
      pet.PlayEffectCallback = (path) => {
        const node = this._effectWz?.GetItem(path);
        if (node) {
          const frames = loadFrameSequence(this._loader, node);
          if (frames.length > 0) {
            const petPos = pet.Position;
            this._fieldFx.push({ frames, frameIndex: 0, frameTimer: 0, x: petPos.x, y: petPos.y, done: false });
          }
        }
      };
      pet.ChatMessageCallback = (msg) => this._chatBar.addLine(msg);
      pets[args.petIdx] = pet;
    } else {
      // OG: dismiss pet — show chat message for the dismiss reason
      pets[args.petIdx] = null;
      if (args.charId === this._localCharId && args.removeReason !== undefined) {
        // OG StringPool messages for dismiss reasons (0x18C-0x18E, 0x18A9):
        // Reason 1 = "Pet has been released." (StringPool 0x18C)
        // Reason 2 = "Pet has run away." (StringPool 0x18D)
        // Reason 3 = "Pet has been dismissed." (StringPool 0x18E)
        // Reason 4 = "Pet has been summoned by another character." (StringPool 0x18A9)
        const dismissMessages: Record<number, string> = {
          1: 'Pet has been released.',
          2: 'Pet has run away.',
          3: 'Pet has been dismissed.',
          4: 'Pet has been summoned by another character.',
        };
        const msg = dismissMessages[args.removeReason];
        if (msg) this._chatBar.addLine(msg);
      }
    }
    this._pets.set(args.charId, pets);

    if (args.charId === this._localCharId) {
      this._syncEquipPetCount();

      // OG: after pet activation, update pet consume item slots
      // (CUIPetEquip::SetPetConsumeItem / SetPetConsumeMPItem)
      const localPets = pets.filter(Boolean) as Pet[];
      if (localPets.length > 0 && this._equip) {
        // OG checks first pet's m_bConsumeHP/m_bConsumeMP flags
        // For now, ensure the equip panel knows about pet consume items
      }

      // OG: set position contexts based on active pet count
      // 3 pets: pos0=5(positional3), pos1=3, pos2=4
      // 2 pets: pos0=1, pos1=2
      // 1 pet: pos0=0
      const activePets = localPets.length;
      if (activePets === 3) {
        localPets[0]?.SetPositionContext(5);
        localPets[1]?.SetPositionContext(3);
        localPets[2]?.SetPositionContext(4);
      } else if (activePets === 2) {
        localPets[0]?.SetPositionContext(1);
        localPets[1]?.SetPositionContext(2);
      } else if (activePets === 1) {
        localPets[0]?.SetPositionContext(0);
      }
    }
  }

  // OG: CUser::OnPetEvol (0x8e5ce0) — opcode 199. Always re-summons a new
  // (evolved) pet at petIdx, same Init field shape as PetActivated.
  private _applyPetEvol(args: PetEvolArgs): void {
    const pets = this._pets.get(args.charId) ?? [];
    const pet = new Pet(args.templateId, args.charId);
    pet.Callbacks = this._makePetCallbacks();
    pet.PetIndex = args.petIdx;
    pet.Position = { x: args.x, y: args.y };
    pet.look.Name = args.name;
    pet.LockerSN = args.lockerSN;
    pet.Load(this._loader, this._characterWz, this._itemWz);
    pet.PlayEffectCallback = (path) => {
      const node = this._effectWz?.GetItem(path);
      if (node) {
        const frames = loadFrameSequence(this._loader, node);
        if (frames.length > 0) {
          const petPos = pet.Position;
          this._fieldFx.push({ frames, frameIndex: 0, frameTimer: 0, x: petPos.x, y: petPos.y, done: false });
        }
      }
    };
    pet.ChatMessageCallback = (msg) => this._chatBar.addLine(msg);
    pets[args.petIdx] = pet;
    this._pets.set(args.charId, pets);
    if (args.charId === this._localCharId) this._syncEquipPetCount();
  }

  private _onDropEnter(args: DropEnterArgs): void {
    console.log(`[Drop] enter dropId=${args.dropId} item=${args.itemIdOrAmount} isMoney=${args.isMoney} pos=${args.x},${args.y} animated=${args.animated}`);
    // Real item icon from the already-loaded ItemIconLoader (constructed in
    // _initMenu, used elsewhere for inventory/shop icons) — previously never
    // threaded through to DropSprite at all, so every item drop rendered as
    // the generic colored-rectangle-with-name placeholder even when real WZ
    // icon art was available. Money drops keep their dedicated coin-color
    // placeholder (DropSprite's own IsMoney branch), so no icon lookup for those.
    const icon = !args.isMoney && this._itemIcons ? this._itemIcons.LoadIcon(args.itemIdOrAmount) : null;
    const drop = new DropSprite(
      args.dropId, args.isMoney, args.itemIdOrAmount,
      { x: args.sourceX ?? args.x, y: args.sourceY ?? args.y },
      { x: args.x, y: args.y },
      args.animated ?? false,
      icon,
    );
    drop.nameOf = this._itemNameOf;
    this._drops.push(drop);
  }

  // TODO_AUDIT.md Twenty-fourth pass: CDropPool::OnDropLeaveField
  // (decompile/511e20.c) confirms leaveType PickupOther/PickedUpByRemote/
  // PickedUpBySelf (2/3/5) are the only ones with a real pickUpId — that's
  // also the only case OG visually distinguishes from an instant disappear
  // (the real code's `case 0` does its own in-place fade, not modeled
  // here). When the picker is the local player, play DropSprite's existing
  // StartAbsorb animation instead of vanishing instantly; every other
  // leaveType (including pickups by other players, whose on-screen
  // position this client doesn't track for drops) keeps the prior instant
  // removal.
  private _onDropLeave(args: DropLeaveArgs): void {
    const isPickup = args.leaveType === DropLeaveType.PickedUpByUser
      || args.leaveType === DropLeaveType.PickedUpByMob
      || args.leaveType === DropLeaveType.PickedUpByPet;
    if (isPickup && args.pickUpId === this._localCharId && this._player) {
      const drop = this._drops.find((d) => d.DropId === args.dropId);
      if (drop) { drop.StartAbsorb(() => this._player!.Position); return; }
    }
    this._drops = this._drops.filter(d => d.DropId !== args.dropId);
  }

  // ponytail: option flat + rate stat contributions at the given item level tier.
  // Returns null for invalid/missing options (optionId <= 0 or not found in WZ).
  private _getOptionContributions(optionId: number, itemLevel: number): {
    str: number; dex: number; intt: number; luk: number;
    maxHp: number; maxMp: number;
    watk: number; matk: number; acc: number; eva: number; pdd: number; mdd: number;
    speed: number; jump: number;
    strR: number; dexR: number; intR: number; lukR: number;
    mhpR: number; mmpR: number;
    padR: number; madR: number; pddR: number; mddR: number;
  } | null {
    if (optionId <= 0) return null;
    const entry = this._itemOptionLoader?.loadItemOption(optionId);
    if (!entry || entry.aLevelData.length === 0) return null;
    // OG: iterate backwards, pick the highest tier <= itemLevel
    let lv = entry.aLevelData[0];
    for (let i = entry.aLevelData.length - 1; i >= 0; i--) {
      if (entry.aLevelData[i].nLevel <= itemLevel) { lv = entry.aLevelData[i]; break; }
    }
    return {
      str: lv.niSTR, dex: lv.niDEX, intt: lv.niINT, luk: lv.niLUK,
      maxHp: lv.niMaxHP, maxMp: lv.niMaxMP,
      watk: lv.niPAD, matk: lv.niMAD, acc: lv.niACC, eva: lv.niEVA, pdd: lv.niPDD, mdd: lv.niMDD,
      speed: lv.niSpeed, jump: lv.niJump,
      strR: lv.niSTRr, dexR: lv.niDEXr, intR: lv.niINTr, lukR: lv.niLUKr,
      mhpR: lv.niMaxHPr, mmpR: lv.niMaxMPr,
      padR: lv.niPADr, madR: lv.niMADr, pddR: lv.niPDDr, mddR: lv.niMDDr,
    };
  }

  // ponytail: socket flat stat contributions (socket options have no rate fields).
  private _getSocketContributions(socketId: number, itemLevel: number): {
    str: number; dex: number; intt: number; luk: number;
    maxHp: number; maxMp: number;
    watk: number; matk: number; acc: number; eva: number; pdd: number; mdd: number;
    speed: number; jump: number;
  } | null {
    if (socketId <= 0) return null;
    const entry = this._itemOptionLoader?.loadSocketOption(socketId);
    if (!entry || entry.aLevelData.length === 0) return null;
    const lv = entry.aLevelData[entry.aLevelData.length - 1];
    return {
      str: lv.niSTR, dex: lv.niDEX, intt: lv.niINT, luk: lv.niLUK,
      maxHp: lv.niMaxHP, maxMp: lv.niMaxMP,
      watk: lv.niPAD, matk: lv.niMAD, acc: lv.niACC, eva: lv.niEVA, pdd: lv.niPDD, mdd: lv.niMDD,
      speed: lv.niSpeed, jump: lv.niJump,
    };
  }

  private _refreshActiveProjectileSlot(): void {
    const weaponId = this._equip?.equippedWeaponItemId ?? null;
    this._item?.setActiveProjectileWeaponType(weaponId !== null ? getWeaponType(weaponId) : 0);
  }

  // OG: CUserLocal::ApplyWeaponOption (0x9092e0) — reads weapon's ItemOption
  // level data and populates combat modifiers cached in _weapon* fields.
  private _computeWeaponOption(stats: EquipStats, itemLevel: number): void {
    CUserLocal.applyWeaponOption(
      stats.option1, stats.option2, stats.option3, itemLevel,
      (id) => this._itemOptionLoader?.loadItemOption(id) ?? null,
    );
  }

  // OG: CUserLocal::ApplyDefenseOption (0x90e970) — accumulates IgnoreDAM/IgnoreDAMr
  // from equipped defense items and applies them to reduce incoming damage.
  // Called when the local player takes damage from mobs.
  private _getDefenseOptionData(bodyPart: number): import('../ui/game/StatDerived.js').DefenseOptionData | null {
    const stats = this._equipStats.get(bodyPart);
    if (!stats) return null;
    const itemLevel = stats.level > 0 ? stats.level : (
      this._itemIcons?.LoadAttr(
        [...(this._equip?.equippedSlots() ?? [])].find(s => s.bodyPart === bodyPart)?.itemId ?? 0,
      )?.ReqLevel ?? 0
    );
    return CUserLocal.getDefenseOptionData(
      stats.option1, stats.option2, stats.option3, itemLevel,
      (id) => this._itemOptionLoader?.loadItemOption(id) ?? null,
    );
  }

  // ponytail: full BasicStat::SetFrom pipeline (OG 0x732BA0)
  private _syncStatDetailInputs(): void {
    if (!this._statDetailInfo) return;
    const inp = this._statDetailInfo.Inputs;
    inp.jobId = this._job;

    // Sum equipment bonuses (equips loop — OG Phase 2)
    // ponytail: uses per-instance EquipStats (incStr etc.) when available,
    // falls back to LoadAttr(itemId) template stats. Option and socket
    // effects (option1/2/3, socket1/2) are looked up from ItemOption.nx and
    // SocketOption.nx, then applied at the item's level tier.
    let accBonus = 0, evaBonus = 0, pddBonus = 0, mddBonus = 0;
    let watk = 0, matk = 0;
    let equipStr = 0, equipDex = 0, equipInt = 0, equipLuk = 0;
    let equipMhp = 0, equipMmp = 0;
    let equipSpeed = 0, equipJump = 0;
    let equipMHPr = 0, equipMMPr = 0;
    let ratePctStr = 0, ratePctDex = 0, ratePctInt = 0, ratePctLuk = 0;
    let ratePctMhp = 0, ratePctMmp = 0;
    let ratePctWatk = 0, ratePctMatk = 0, ratePctPdd = 0, ratePctMdd = 0;
    for (const { itemId, bodyPart } of this._equip.equippedSlots()) {
      const stats = this._equipStats.get(bodyPart);
      const attr = this._itemIcons?.LoadAttr(itemId);
      if (stats) {
        // Per-instance stats from GW_ItemSlotEquip (includes base + scrolling)
        equipStr += stats.incStr;
        equipDex += stats.incDex;
        equipInt += stats.incInt;
        equipLuk += stats.incLuk;
        equipMhp += stats.incMhp;
        equipMmp += stats.incMmp;
        watk += stats.incPad;
        matk += stats.incMad;
        accBonus += stats.incAcc;
        evaBonus += stats.incEva;
        pddBonus += stats.incPdd;
        mddBonus += stats.incMdd;
        equipSpeed += stats.incSpeed;
        equipJump += stats.incJump;
        // HP/MP rate from item template only (not per-instance)
        if (attr) { equipMHPr += attr.IncMHPr; equipMMPr += attr.IncMMPr; }
        // Option/socket effects at the item's level tier
        // OG: item's own level (from upgrades) or fallback to template reqLevel
        const itemLevel = stats.level > 0 ? stats.level : (attr?.ReqLevel ?? 0);
        const opt = this._getOptionContributions(stats.option1, itemLevel);
        if (opt) { equipStr += opt.str; equipDex += opt.dex; equipInt += opt.intt; equipLuk += opt.luk; equipMhp += opt.maxHp; equipMmp += opt.maxMp; watk += opt.watk; matk += opt.matk; accBonus += opt.acc; evaBonus += opt.eva; pddBonus += opt.pdd; mddBonus += opt.mdd; equipSpeed += opt.speed; equipJump += opt.jump; ratePctStr += opt.strR; ratePctDex += opt.dexR; ratePctInt += opt.intR; ratePctLuk += opt.lukR; ratePctMhp += opt.mhpR; ratePctMmp += opt.mmpR; ratePctWatk += opt.padR; ratePctMatk += opt.madR; ratePctPdd += opt.pddR; ratePctMdd += opt.mddR; }
        const opt2 = this._getOptionContributions(stats.option2, itemLevel);
        if (opt2) { equipStr += opt2.str; equipDex += opt2.dex; equipInt += opt2.intt; equipLuk += opt2.luk; equipMhp += opt2.maxHp; equipMmp += opt2.maxMp; watk += opt2.watk; matk += opt2.matk; accBonus += opt2.acc; evaBonus += opt2.eva; pddBonus += opt2.pdd; mddBonus += opt2.mdd; equipSpeed += opt2.speed; equipJump += opt2.jump; ratePctStr += opt2.strR; ratePctDex += opt2.dexR; ratePctInt += opt2.intR; ratePctLuk += opt2.lukR; ratePctMhp += opt2.mhpR; ratePctMmp += opt2.mmpR; ratePctWatk += opt2.padR; ratePctMatk += opt2.madR; ratePctPdd += opt2.pddR; ratePctMdd += opt2.mddR; }
        const opt3 = this._getOptionContributions(stats.option3, itemLevel);
        if (opt3) { equipStr += opt3.str; equipDex += opt3.dex; equipInt += opt3.intt; equipLuk += opt3.luk; equipMhp += opt3.maxHp; equipMmp += opt3.maxMp; watk += opt3.watk; matk += opt3.matk; accBonus += opt3.acc; evaBonus += opt3.eva; pddBonus += opt3.pdd; mddBonus += opt3.mdd; equipSpeed += opt3.speed; equipJump += opt3.jump; ratePctStr += opt3.strR; ratePctDex += opt3.dexR; ratePctInt += opt3.intR; ratePctLuk += opt3.lukR; ratePctMhp += opt3.mhpR; ratePctMmp += opt3.mmpR; ratePctWatk += opt3.padR; ratePctMatk += opt3.madR; ratePctPdd += opt3.pddR; ratePctMdd += opt3.mddR; }
        const sock = this._getSocketContributions(stats.socket1, itemLevel);
        if (sock) { equipStr += sock.str; equipDex += sock.dex; equipInt += sock.intt; equipLuk += sock.luk; equipMhp += sock.maxHp; equipMmp += sock.maxMp; watk += sock.watk; matk += sock.matk; accBonus += sock.acc; evaBonus += sock.eva; pddBonus += sock.pdd; mddBonus += sock.mdd; equipSpeed += sock.speed; equipJump += sock.jump; }
        const sock2 = this._getSocketContributions(stats.socket2, itemLevel);
        if (sock2) { equipStr += sock2.str; equipDex += sock2.dex; equipInt += sock2.intt; equipLuk += sock2.luk; equipMhp += sock2.maxHp; equipMmp += sock2.maxMp; watk += sock2.watk; matk += sock2.matk; accBonus += sock2.acc; evaBonus += sock2.eva; pddBonus += sock2.pdd; mddBonus += sock2.mdd; equipSpeed += sock2.speed; equipJump += sock2.jump; }

        // OG: CUserLocal::ApplyWeaponOption (0x9092e0) — when iterating
        // the weapon slot (bodyPart=11), also extract combat modifiers
        // from the weapon's ItemOption: critical prob/damage, DAMr, BossDAMr,
        // IgnoreTargetDEF. These affect outgoing attack calculations.
        if (bodyPart === 11) {
          this._computeWeaponOption(stats, itemLevel);
        }
      } else if (attr) {
        // Fallback: template stats
        equipStr += attr.IncStr;
        equipDex += attr.IncDex;
        equipInt += attr.IncInt;
        equipLuk += attr.IncLuk;
        equipMhp += attr.IncMhp;
        equipMmp += attr.IncMmp;
        equipMHPr += attr.IncMHPr;
        equipMMPr += attr.IncMMPr;
        watk += attr.IncPad;
        matk += attr.IncMad;
        accBonus += attr.IncAcc;
        evaBonus += attr.IncEva;
        pddBonus += attr.IncPdd;
        mddBonus += attr.IncMdd;
        equipSpeed += attr.IncSpeed;
        equipJump += attr.IncJump;
      }
    }

    // Apply rate percentage bonuses to watk/matk/pdd/mdd (from item options)
    if (ratePctWatk !== 0) watk += Math.floor(watk * ratePctWatk / 100);
    if (ratePctMatk !== 0) matk += Math.floor(matk * ratePctMatk / 100);
    if (ratePctPdd !== 0) pddBonus += Math.floor(pddBonus * ratePctPdd / 100);
    if (ratePctMdd !== 0) mddBonus += Math.floor(mddBonus * ratePctMdd / 100);

    // Phase 6: BasicStatUp (Maple Warrior family) from SecondaryStat bit 67
    const basicStatUp = this.game.fieldHandlers.secondaryStat.getBasicStatUp();

    // Phase 6-11: compute total stats via BasicStat pipeline
    const input: BasicStatInput = {
      ...defaultBasicStatInput(),
      baseStr: this._stats.str, baseDex: this._stats.dex,
      baseInt: this._stats.intStat, baseLuk: this._stats.luk,
      baseMaxHp: this._stats.maxHp, baseMaxMp: this._stats.maxMp,
      equipStr, equipDex, equipInt, equipLuk,
      equipMaxHp: equipMhp, equipMaxMp: equipMmp,
      equipMaxHPr: equipMHPr, equipMaxMPr: equipMMPr,
      basicStatIncPct: basicStatUp,
      forcedStr: this._forcedStat.str, forcedDex: this._forcedStat.dex,
      forcedInt: this._forcedStat.int, forcedLuk: this._forcedStat.luk,
      rateStrPct: ratePctStr, rateDexPct: ratePctDex, rateIntPct: ratePctInt, rateLukPct: ratePctLuk,
      rateMaxHPr: ratePctMhp, rateMaxMPr: ratePctMmp,
    };
    const result = computeBasicStat(input);

    inp.str = result.str;
    inp.dex = result.dex;
    inp.int = result.int;
    inp.luk = result.luk;
    inp.maxHp = result.maxHp;
    inp.maxMp = result.maxMp;
    inp.watk = watk + this.game.fieldHandlers.secondaryStat.getBuffPAD();
    inp.matk = matk + this.game.fieldHandlers.secondaryStat.getBuffMAD();
    inp.accBonus = accBonus + this.game.fieldHandlers.secondaryStat.getBuffACC();
    inp.evaBonus = evaBonus + this.game.fieldHandlers.secondaryStat.getBuffEVA();
    inp.pddBonus = pddBonus + this.game.fieldHandlers.secondaryStat.getBuffPDD();
    inp.mddBonus = mddBonus + this.game.fieldHandlers.secondaryStat.getBuffMDD();
    const weaponId = this._equip.equippedWeaponItemId;
    if (weaponId !== null) inp.weaponType = getWeaponType(weaponId);
    inp.mastery = this._masteryFromSkills;
    // Total speed/jump = base 100 + equip bonuses + temp stat buffs + forced stat, capped at OG max (140)
    const tempSpeed = this.game.fieldHandlers.secondaryStat.getTempSpeed();
    const tempJump = this.game.fieldHandlers.secondaryStat.getTempJump();
    inp.speed = Math.min(140, 100 + equipSpeed + tempSpeed + this._forcedStat.speed);
    inp.jump = Math.min(140, 100 + equipJump + tempJump + this._forcedStat.jump);
    // Wire buff combat modifiers into stat inputs
    const sec = this.game.fieldHandlers.secondaryStat;
    inp.magicGuardReduction = sec.getMagicGuardReduction();
    inp.powerGuardReduction = sec.getPowerGuardReduction();
    inp.mesoGuardReduction = sec.getMesoGuardReduction();
    inp.holySymbolExpRate = sec.getHolySymbolExpRate();
    inp.sharpEyesCritRate = sec.getSharpEyesCritRate();
    inp.stanceRate = sec.getStanceRate();
    inp.shadowPartnerDamageRate = sec.getShadowPartnerDamageRate();
    inp.hyperBodyHpMul = sec.getHyperBodyHpMultiplier();
    inp.hyperBodyMpMul = sec.getHyperBodyMpMultiplier();
    this._stats?.SetDerivedStats(watk, Math.max(pddBonus, mddBonus), inp.speed, inp.jump);
    // OG CUserLocal::SetShoeAttr: mount/morph templates override the normal
    // stat speed and jump, while shoe dFs controls acceleration/friction.
    const look = this._player?.AvatarLook;
    const shoeItemId = look?.hairEquip.get(7) ?? 0;
    const vehicleItemId = this._isRidingTamingMob
      ? (look?.hairEquip.get(20) ?? look?.hairEquip.get(19) ?? 0)
      : 0;
    const vehicleEquipIds = this._isRidingTamingMob
      ? [look?.hairEquip.get(19) ?? 0, look?.hairEquip.get(20) ?? 0].filter((id) => id > 0)
      : [];
    const morphId = this.game.fieldHandlers.secondaryStat.buff.morph;
    const movement = this._itemInfo?.GetMovementProfile(
      shoeItemId, vehicleItemId, vehicleEquipIds, morphId,
    );
    const movementSpeed = movement?.source === 'shoe' ? inp.speed : (movement?.speed ?? inp.speed);
    const movementJump = movement?.source === 'shoe' ? inp.jump : (movement?.jump ?? inp.jump);
    this._physics?.SetStats(movementSpeed - 100, movementJump - 100);
    this._physics?.SetShoePhysics({
      walkAcc: movement?.walkAcc ?? 1,
      walkDrag: movement?.walkDrag ?? 1,
      // nSwim is retained in the item movement model. PlayerController's
      // existing public shoe API has no swim multiplier input.
    });
    this._physics?.SetLadderRestrictions({ vehicleActive: this._isRidingTamingMob });
  }

  /** Update buff visual effects based on current SecondaryStat state. */
  private _updateBuffVisuals(): void {
    const sec = this.game.fieldHandlers.secondaryStat;
    this._buffVisual.SetDarkSight(sec.isDarkSightActive(), this._player);
    this._buffVisual.SetStun(sec.isStunActive());
    this._buffVisual.SetPoison(sec.isPoisonActive());
    this._buffVisual.SetSeal(sec.isSealActive());
    this._buffVisual.SetHyperBody(sec.isHyperBodyActive(), this._player);
    this._buffVisual.SetShadowPartner(sec.isShadowPartnerActive());
    this._buffVisual.SetBooster(sec.isBoosterActive());
  }

  /** Mirror the local avatar/stat sources consumed by CVecCtrlUser's ladder gate. */
  private _syncLadderEligibility(): void {
    if (!this._physics) return;
    const buff = this.game.fieldHandlers.secondaryStat.buff;
    const avatar = Avatar.getAvatarState();
    this._physics.SetLadderRestrictions({
      ...(avatar ? { oneTimeAction: Avatar.GetOneTimeAction(), mechanicMode: avatar.mechanicMode } : {}),
      userFlying: buff.flying !== 0,
      morphTemplateId: avatar?.morphTemplateId || buff.morph,
      ridingVehicle: avatar?.ridingVehicle || buff.rideVehicle || (this._isRidingTamingMob ? 1 : 0),
    });
  }

  private _onStatChanged(args: StatChangedArgs): void {
    if (args.hp !== undefined) {
      this._statusBar.hp = args.hp;
      this._stats.hp = args.hp;
      this._skill.characterHp = args.hp; // OG: HP check in OnSkillLevelUpButton
      if (args.hp <= 0 && this._physics) {
        this._isPlayerDead = true;
        this._tombstone?.Spawn({ x: this._physics.Position.x, y: this._physics.Position.y });
      }
    }
    if (args.maxHp !== undefined) { this._statusBar.maxHp = args.maxHp; this._stats.maxHp = args.maxHp; }
    if (args.mp !== undefined) { this._statusBar.mp = args.mp; this._stats.mp = args.mp; }
    if (args.maxMp !== undefined) { this._statusBar.maxMp = args.maxMp; this._stats.maxMp = args.maxMp; }

    // OG: CField_Dojang::Update — player stats overlay in dojang maps
    if (this._field?.Info.FieldType === 14) {
      this._dojangHud.updatePlayerStats(
        this._stats.hp ?? 0, this._stats.maxHp ?? 0,
        this._stats.mp ?? 0, this._stats.maxMp ?? 0,
      );
    }
    if (args.exp !== undefined) {
      this._statusBar.exp = args.exp;
      // Show EXP popup above character when EXP increases
      if (this._prevExp >= 0 && args.exp > this._prevExp && this._physics && this._dmgNumbers) {
        const expDelta = args.exp - this._prevExp;
        this._dmgNumbers.Add(expDelta, this._physics.Position.x, this._physics.Position.y - 40, DamageKind.Exp);
      }
      this._prevExp = args.exp;
    }
    if (args.level !== undefined) {
      this._statusBar.level = args.level;
      this._stats.level = args.level;
      this._skill.characterLevel = args.level;
      this._statusBar.nextExp = NextLevelExpTable[args.level - 1] ?? 0;
      // OG: pet auto-speaking on level up (event 0)
      this._firePetEvent(0);
    }
    // TODO_AUDIT.md Sixty-fifth pass: real bug found while wiring CUISkill's
    // skill-up gate — args.sp was already fully decoded (the ExtendSP fix)
    // but never forwarded anywhere, so SkillBook's level-up button never
    // appeared at all regardless of any gating logic.
    if (args.sp !== undefined) this._skill.sp = args.sp;
    if (args.str !== undefined) this._stats.str = args.str;
    if (args.dex !== undefined) this._stats.dex = args.dex;
    if (args.int !== undefined) this._stats.intStat = args.int;
    if (args.luk !== undefined) this._stats.luk = args.luk;
    if (args.ap !== undefined) this._stats.ap = args.ap;
    if (args.pop !== undefined) {
      this._stats.fame = args.pop;
      if (this._charInfo) this._charInfo.fame = args.pop;
    }
    if (args.job !== undefined) {
      this._job = args.job;
      this._skill.characterJob = args.job; // OG: job used in SP validation
      const jobName = this.game.nameService.SkillName(args.job * 10000) ?? `Job ${args.job}`;
      if (this._charInfo) this._charInfo.job = jobName;
      this._stats.job = jobName;
      if (this._statusBar) this._statusBar.jobName = jobName;
    }
    // OG: CUIItem::Draw renders meso at y=268 from CharacterData.
    if (args.meso !== undefined) {
      this._item?.setMeso(args.meso);
    }
    const look = this._player?.AvatarLook;
    if (look) {
      // TODO_AUDIT.md Hundred-and-sixty-fourth pass follow-up: keep live
      // AvatarLook in sync when stat packets change face/hair/skin after entry.
      if (args.skin !== undefined) look.skin = args.skin;
      if (args.face !== undefined) look.face = args.face;
      if (args.hair !== undefined) look.hair = args.hair;
    }
    this._equip?.SetPlayerStats(
      args.level ?? this._stats.level,
      args.str ?? this._stats.str,
      args.dex ?? this._stats.dex,
      args.int ?? this._stats.intStat,
      args.luk ?? this._stats.luk,
      args.job ?? 0,
    );
    this._item?.SetPlayerStats(
      args.level ?? this._stats.level,
      args.str ?? this._stats.str,
      args.dex ?? this._stats.dex,
      args.int ?? this._stats.intStat,
      args.luk ?? this._stats.luk,
      args.job ?? 0,
    );
    // TODO_AUDIT.md Hundred-and-fourteenth pass: keep StatDetailInfo.Inputs
    // in sync whenever any relevant stat changes.
    this._syncStatDetailInputs();
  }

  private _onSkillRecordResult(records: { skillId: number; level: number; masterLevel: number }[]): void {
    this._skillRecords = records;
    // OG: CUIEquip::Draw checks for novice skill 1004 via get_novice_skill_as_race(1004, nJob).
    // Skill 1004 is the base beginner skill; race-specific variants are 20001004 (aran), etc.
    const hasNovice = records.some(r => {
      const id = r.skillId;
      return (id === 1004 || id === 20001004 || id === 20011004 || id === 20021004 || id === 20031004) && r.level > 0;
    });
    this._equip.setHasNoviceSkill1004(hasNovice);
    this._skill.skillService = this._skillService;
    this._skill.textureLoader = this._loader;
    const rows: SkillRow[] = [];
    for (const r of records) {
      const info = this._skillService?.Get(r.skillId);
      rows.push({
        id: r.skillId,
        name: this._skill.nameOf(r.skillId),
        level: r.level,
        maxLevel: info?.MaxLevel ?? r.masterLevel,
        passive: info?.Passive ?? false,
      });
    }
    this._skill.setSkills(rows);
    this._masteryFromSkills = this._computeMasteryFromSkills();
  }

  private _computeMasteryFromSkills(): number {
    const skillWz = this._skillWz;
    if (!skillWz) return 0;
    let total = 0;
    for (const r of this._skillRecords) {
      const job = Math.floor(r.skillId / 10000);
      const node = (skillWz.GetItem(`${String(job).padStart(3, '0')}.img/skill/${String(r.skillId).padStart(7, '0')}`)
        ?? skillWz.GetItem(`${job}.img/skill/${r.skillId}`)) as WzProperty | null;
      if (!node) continue;
      const m = (node.Get(`level/${r.level}`) as WzProperty)?.Get('mastery');
      if (typeof m === 'number') total += m;
    }
    return total;
  }

  private _onTemporaryStatSet(entries: { skillId: number; value: number; seconds: number }[]): void {
    this._buffList.skillService = this._skillService;
    this._buffList.textureLoader = this._loader;
    this._comboCounter = 0;
    for (const e of entries) {
      if (e.skillId === 1111003 || e.skillId === 1111004 || e.skillId === 1111005)
        this._comboCounter = e.value;
      const name = this._skill.nameOf(e.skillId) || `[${e.skillId}]`;
      this._buffList.addBuff(e.skillId, name, e.seconds);
      if (e.skillId === MobSkillType.Fear && this._physics) {
        const p = this._camera.WorldToScreen(this._physics.Position.x, this._physics.Position.y);
        this._fearEffect.show(p.x, p.y);
      }
    }
    this._comboDisplay.setCombo(this._comboCounter);
    this._syncStatDetailInputs();
    this._syncLadderEligibility();
    // Update buff visuals based on current SecondaryStat state
    this._updateBuffVisuals();
  }

  private _onTemporaryStatReset(_mask: number): void {
    this._physics?.SetRepeatSkill(0);
    this._buffList.clearBuffs();
    this._fearEffect.hide();
    this._comboCounter = 0;
    this._comboDisplay.hide();
    this._syncStatDetailInputs();
    this._syncLadderEligibility();
    // Clear all buff visuals
    this._updateBuffVisuals();
  }

  private _onQuestRecord(args: { questId: number; state: number; value: string; isEx: boolean }): void {
    const existing = this._questRecords.findIndex(q => q.questId === args.questId);
    if (existing >= 0) {
      this._questRecords[existing].state = args.state;
    } else {
      this._questRecords.push({ questId: args.questId, state: args.state });
    }
    if (args.state === 0) this._questStates.delete(args.questId);
    else this._questStates.set(args.questId, args.state);
    if (this._questDetail?.selectedId === args.questId) {
      this._questDetail.SetQuest(this.game.questInfoService?.Get(args.questId) ?? null, args.state);
    }
    this._refreshQuestLog();
  }

  private _refreshQuestLog(): void {
    const inProgress = this._questRecords.filter(q => q.state === 1).map(q => q.questId);
    const completed = this._questRecords.filter(q => q.state === 0).map(q => q.questId);
    this._quest.setQuests([
      { name: '[In Progress]', quests: inProgress },
      { name: '[Completed]', quests: completed },
    ]);
  }

  private _onScriptMessage(args: ScriptMessageArgs): void {
    switch (args.msgType) {
      case 0: // SAY
      case 1: { // SAY_IMAGE
        // Severe, confirmed bug (FIXED): this used to call `show(args.text)`
        // with no second argument, which defaults to `DialogType.Ok` —
        // always rendering a single "OK" button regardless of the real
        // `hasPrev`/`hasNext` flags `FieldHandlers.ts` already decodes
        // correctly for this exact opcode (confirmed against
        // `CScriptMan::OnSay`, decompile/6DC110.c, in an earlier pass:
        // `bPrev:byte` then `bNext:byte`, byte-for-byte what `args.hasPrev`/
        // `args.hasNext` already hold) — those two fields were decoded but
        // never read here. A multi-page NPC monologue (hasNext=true) should
        // show "Next" (or "Prev"+"Next" once past the first page), not "OK".
        //
        // Nineteenth pass (FIXED): `onOk`/`onNext` themselves hardcoded
        // `ScriptAnswerNext(0)` regardless of whether the real msgType was
        // Say(0) or SayImage(1) — wrong for the SayImage case.
        // `CScriptMan::OnSay` (decompile/6DC110.c) answers with a hardcoded
        // `Encode1(0)`, but `CScriptMan::OnSayImage` (decompile/6DC310.c)
        // answers with a hardcoded `Encode1(1)` instead — i.e. the real
        // client always echoes the msgType of the message being answered,
        // it's just implemented as two separate functions each writing
        // their own constant rather than one shared echo. A SayImage(1)
        // dialog answered with msgType=0 sends the wrong first byte of
        // opcode 65 (`UserScriptMessageAnswer`), which is a real wire bug,
        // not just a label cosmetic. Fixed by threading `args.msgType`
        // through `NpcTalk.show()` and reading it back via the new
        // `sayMsgType` getter in `onOk`/`onNext` below instead of a literal 0.
        const type = args.hasPrev ? DialogType.PrevNext : args.hasNext ? DialogType.Next : DialogType.Ok;
        this._npcTalk.show(args.text, type, args.msgType);
        break;
      }
      case 2: // ASK_YES_NO
        // Severe, confirmed bug (FIXED): same root cause as above, but with
        // real functional impact, not just a cosmetic label — `show(args.text)`
        // defaulted to `DialogType.Ok`, rendering a single "OK" button for
        // what the real client (`CScriptMan::OnAskYesNo`/the AskYesNo case
        // in `CScriptMan::OnScriptMessage`, decompile/6DE0F0.c, confirmed in
        // an earlier pass) is a genuine yes/no prompt. Clicking the lone
        // "OK" button called `_npcTalk.onOk`, which is wired to
        // `GameSender.ScriptAnswerNext(0)` — the wrong response shape
        // entirely for a YesNo answer (the correct response,
        // `ScriptAnswerYesNo`, is already correctly wired to `onYes`/`onNo`,
        // it just had no buttons to ever fire from). This silently broke
        // every yes/no NPC script prompt in the game (confirm purchase,
        // confirm warp, etc. — extremely common). Fixed to pass
        // `DialogType.YesNo` so `NpcTalk._rebuildButtons` renders the real
        // Yes/No buttons.
        this._npcTalk.show(args.text, DialogType.YesNo);
        break;
      case 5: // ASK_MENU
        if (args.menu) this._npcTalk.showMenu(args.text, args.menu);
        break;
      case 3: // ASK_TEXT
      case 14: // ASK_BOX_TEXT
        this._npcTalk.showAskText(args.text, args.defaultText ?? '', args.minLength ?? 0, args.maxLength ?? 0);
        break;
      case 4: // ASK_NUMBER
        this._npcTalk.showAskNumber(args.text, args.defaultNum ?? 0, args.minNum ?? 0, args.maxNum ?? 0);
        break;
      case 13: // ASK_ACCEPT (quest)
        this._npcTalk.showAskAccept(args.text, args.questId ?? 0, args.speakerId ?? 0, 0, 0);
        break;
      case 15: { // ASK_SLIDE_MENU (quest reward selection)
        const questRe = /#q(\d+)#/;
        const qm = questRe.exec(args.text ?? '');
        const questId = qm ? parseInt(qm[1]) : 0;
        this._pendingQuestId = questId;
        this._pendingQuestNpcId = args.speakerId ?? 0;
        this._questReward?.Show(questId, args.speakerId ?? 0, args.text ?? '');
        break;
      }
      default:
        this._npcTalk.show(args.text ?? '');
        break;
    }
  }

  private _onShopOpen(args: any): void {
    if (args.items) {
      // OG: CShopDlg::SetShopDlg (0x6EAB00) — populate shop with all decoded fields
      const items = args.items.map((i: any) => ({
        itemId: i.itemId,
        price: i.price,
        discountRate: i.discountRate ?? 0,
        tokenId: i.tokenId ?? 0,
        tokenPrice: i.tokenPrice ?? 0,
        itemPeriod: i.itemPeriod ?? 0,
        levelLimited: i.levelLimited ?? 0,
        quantity: i.quantity ?? 0,
        maxPerSlot: i.maxPerSlot ?? 0,
        unitPrice: i.unitPrice ?? 0,
        name: this.game.nameService.ItemName(i.itemId) ?? `[${i.itemId}]`,
        icon: this._itemIcons?.LoadIcon(i.itemId) ?? null,
        stock: i.quantity ?? -1,
      }));
      this._shop!.setResolvers(
        (id) => this.game.nameService.ItemName(id) ?? `[${id}]`,
        (id) => this._itemIcons?.LoadIcon(id) ?? null,
      );
      this._shop!.setShopData(args.npcId, items);
      this._shop!.isVisible = true;
    }
  }

  private _onShopResult(args: any): void {
    // Per `CShopDlg::OnPacket` (decompile/6EB7D0.c): case 0 is a silent
    // success (no notice shown by the real client either — it just
    // refreshes the sell-list selection); 1/2/3/etc. are generic
    // string-table error notices with no real per-case text available in
    // this client to port (StringPool ids only, not literal strings in
    // this decompile dump). Only the two cases below carry real decoded
    // data worth surfacing.
    const t = args.resultType;
    if (t === ShopResultType.NotEnoughMesos) {
      this._notice?.show('Shop', `Not enough mesos (short ${args.shortfall}).`);
    } else if (t === ShopResultType.NotEnoughItems) {
      this._notice?.show('Shop', `Not enough items (short ${args.shortfall}).`);
    } else if (t === ShopResultType.NoItemsInStock && args.message) {
      this._notice?.show('Shop', args.message);
    }
  }

  // Per `CAdminShopDlg::OnPacket` (decompile/4310f0.c): every action 1-11 is
  // a canned StringPool message id (no literal text in this dump), shown via
  // a generic notice and, for the reopen-eligible actions, followed by the
  // client re-requesting the dialog for the npc template it was opened with.
  private _onAdminShopDlg(args: { action: number; shouldReopen: boolean }): void {
    this._adminShop?.SetAction(args.action, args.shouldReopen);
    if (args.shouldReopen && this._adminShopNpcTemplateId !== null) {
      this.game.session.send(GameSender.AdminShopReopen(this._adminShopNpcTemplateId));
    }
  }

  // Per `CStoreBankDlg::OnPacket` (decompile/745c60.c): sub-action 0x24 '$' is
  // the only one that needs a player decision — a YesNo fee confirmation
  // before the client sends StoreBankGetAllConfirm. The rest are notices.
  private _onEntrustedShopCheckResult(args: EntrustedShopCheckResultArgs): void {
    // OG: CWvsContext::OnEntrustedShopCheckResult (decompile/9FFCB0.c).
    // subType 7 (open-shop trigger) needs a shop-title text-input dialog
    // with profanity filtering this client doesn't have; subType 17
    // (open-with-PIN) needs an in-game secondary-password prompt that
    // also doesn't exist (only at character select) — both intentionally
    // unhandled rather than guessed at.
    switch (args.subType) {
      case 8:
        this._notice?.show('Hired Merchant', `Channel ${args.busyChannelId} is full (load ${args.channelLoad}%) `);
        break;
      case 14:
        this._chatBar.addLine(args.flag ? '[Hired Merchant] Opened.' : '[Hired Merchant] Closed.');
        break;
      case 16:
        if (args.transferDenied) {
          this._notice?.show('Hired Merchant', 'Transfer denied.');
        } else if (this._notice && args.transferChannelId !== undefined) {
          const channelId = args.transferChannelId;
          this._notice.onConfirm = () => { this.game.session.send(GameSender.TransferChannel(channelId)); };
          this._notice.showConfirm('Hired Merchant', `Transfer to channel ${channelId}? `);
        }
        break;
      case 18:
        if (args.message) this._notice?.show('Hired Merchant', args.message);
        break;
      case 9: case 10: case 11: case 15:
        this._notice?.show('Hired Merchant', `result ${args.subType} `);
        break;
      default:
        // 7, 13, 17: local-action triggers / no UI consumer yet.
        break;
    }
  }

  private _onStoreBankAction(args: { subAction: number; passingDay?: number; fee?: number; accountId?: number; value?: number; channel?: number }): void {
    this._storeBank?.SetAction(args);
    if (args.subAction === 0x24) {
      const detail = args.fee ? `fee ${args.fee} mesos` : '';
      if (this._notice) {
        this._notice.onConfirm = () => { this.game.session.send(GameSender.StoreBankGetAllConfirm()); };
        this._notice.showConfirm('Store Bank', `Get all items? ${detail}`);
      }
    }
  }

  // Severe, confirmed bug (FIXED): `FieldHandlers._readTrunkBlock` (the only
  // source of `TrunkResultArgs.items`) emits `{invType, positionInType,
  // itemId, quantity}` per item — every single item it decodes is TRUNK
  // contents; this opcode (`OutHeader.TrunkResult=368`) carries no separate
  // "player's own inventory" item list at all (confirmed by reading
  // `CTrunkDlg::OnPacket`, decompile/76A990.c, again above this pass — there
  // is no second item block anywhere in this function). The previous code
  // read `i.isTrunk` (a field that has never existed on this shape — always
  // `undefined`) to split items between the trunk tab and the inventory
  // tab, and read `i.position` (the real field is `positionInType`, also
  // always `undefined`). Net effect: `trunkItems` was always `[]` (the
  // Trunk tab permanently rendered empty, withdraw was permanently
  // unusable since there was never anything to select), every real trunk
  // item landed in `invItems` instead (rendered under "My Inventory",
  // backwards), and every item's position read back as `0` regardless of
  // its real slot (clicking "Deposit" on any of them would have sent slot
  // 0 no matter which item was actually selected). Fixed: map all decoded
  // items into `trunkItems` using the real `positionInType` field, and pass
  // an empty array for `invItems` (no real data exists for it; `Trunk.ts`'s
  // "My Inventory" tab has no live data source until `ItemInventory`'s
  // equip-tab-style cross-feed is built for it, same "needs new wiring, not
  // guessed" caution as several other documented gaps in this file).
  private _onTrunkResult(args: any): void {
    if (!this._trunk) return;
    const toTrunkItems = (raw: any[]): TrunkItem[] => raw.map((i: any) => ({
      name: this.game.nameService.ItemName(i.itemId) ?? `[${i.itemId}]`,
      itemId: i.itemId,
      quantity: i.quantity ?? 1,
      invType: i.invType ?? 1,
      position: i.positionInType ?? 0,
    }));
    if (args.resultType === TrunkResultType.Open) {
      this._trunk.Open(args.money ?? 0, toTrunkItems(args.items ?? []), []);
    } else if (args.hasContents) {
      this._trunk.Refresh(args.money ?? 0, toTrunkItems(args.items ?? []), []);
    }
  }

  // `args.items` here (decoded by `FieldHandlers.handleMiniRoom`'s
  // MRP_EnterResult case) is `{setCount, setSize, price, item}[]`, where
  // `item` is the full decoded item object — NOT yet the flat
  // `{index, itemId, name, setCount, setSize, price}` shape
  // `PersonalShop.ShopItemSlot` (and `OpenAsOwner`/`OpenAsVisitor`) expect.
  // The PSP_Refresh case below already does this exact remap correctly;
  // shared here so MRP_EnterResult's initial shop-open gets the same
  // treatment instead of passing the raw decoder shape straight through
  // (confirmed bug, FIXED — every slot's `itemId`/`name`/`index` would have
  // read back `undefined` on first opening a personal shop, even though a
  // subsequent PSP_Refresh would have "fixed" the display by accident).
  private static _toShopItemSlots(raw: any[]): { index: number; itemId: number; name: string; setCount: number; setSize: number; price: number }[] {
    return raw.map((i: any, idx: number) => ({
      index: idx, itemId: i.item?.itemId ?? 0, name: `[${i.item?.itemId ?? 0}]`,
      setCount: i.setCount, setSize: i.setSize, price: i.price,
    }));
  }

  // OG: CUser::OnEffect (live IDA decompile, Maplestory95.exe.i64 0x8f9a70,
  // opcode 233 = OutHeader.UserEffectLocal/Remote per CUserLocal::OnPacket's
  // case 233) is a ~30-case sub-dispatcher this client only decodes at the
  // raw effectType+payload level so far. Only effectType 14 (0xE) and 20
  // (0x14) are confirmed here — both just `DecodeStr` a WZ UOL then call
  // `CAnimationDisplayer::Effect_Reserved(uol, ..., playerX, playerY)`,
  // i.e. "play this effect at the (local or remote) player's own current
  // position". `Effect_Reserved` itself is a large, generalized effect
  // descriptor reader (RESERVEDINFO — randomized scatter/repeat behavior,
  // optional item-linkage) that eventually drives `Effect_Squib` via its
  // own per-frame Update, none of which is replicated here — this plays
  // the resolved WZ node once via the existing one-shot overlay instead of
  // the real randomized/repeating behavior. The other ~28 effectTypes are
  // not decoded at all yet.
  /** Per-frame couple-chair proximity pairing (OG CUserPool::Update,
   *  0x94C370). Sweeps characters with couple-chair items (3012xxx), groups
   *  unpaired chars by item ID, pairs closest within ~100px distance.
   *  ponytail: overlay rendering (heart zone + per-character effect) deferred —
   *  cosmetic only. See CUser::SetCoupleChairEffect (0x8F1FE0, ~2KB). */
  private _updateKeyDownBar(): void {
    if (!this._physics || !this._player) {
      this._keyDownBar.hide();
      return;
    }
    const prepId = this._physics.PreparingSkillId;
    const repeatId = this._physics.RepeatSkillId;
    if (prepId === 0 && repeatId === 0) {
      this._keyDownBar.hide();
      return;
    }
    // OG: CUserLocal::DrawKeyDownBar — shows bar when preparing a skill.
    // Fill fraction from charge progress (simplified: 0→1 over 1 second hold).
    const now = Date.now();
    if (!this._keyDownStartTime || this._lastPrepSkillId !== prepId) {
      this._keyDownStartTime = now;
      this._lastPrepSkillId = prepId;
    }
    const elapsed = (now - this._keyDownStartTime) / 1000;
    const fillFraction = Math.min(1, elapsed / 1.0);
    this._keyDownBar.show(fillFraction);
    // Position bar above player
    const p = this._camera.WorldToScreen(this._physics.Position.x, this._physics.Position.y - 50);
    this._keyDownBar.container.position.set(p.x - 36, p.y);
  }

  private _keyDownStartTime = 0;
  private _lastPrepSkillId = 0;

  private _updateFieldFx(dt: number): void {
    const ms = dt * 1000;
    for (let i = this._fieldFx.length - 1; i >= 0; i--) {
      const fx = this._fieldFx[i];
      fx.frameTimer += ms;
      if (fx.frameIndex < fx.frames.length - 1) {
        while (fx.frameIndex < fx.frames.length - 1) {
          const d = fx.frames[fx.frameIndex].delayMs;
          if (fx.frameTimer < d) break;
          fx.frameTimer -= d;
          fx.frameIndex++;
        }
      } else if (fx.frameIndex >= fx.frames.length - 1 && fx.frameTimer >= fx.frames[fx.frames.length - 1].delayMs) {
        fx.done = true;
      }
    }
    this._fieldFx = this._fieldFx.filter((fx) => !fx.done);
  }

  private _updateCoupleHearts(dt: number): void {
    const ms = dt * 1000;
    for (let i = this._coupleHearts.length - 1; i >= 0; i--) {
      const ch = this._coupleHearts[i];
      ch.frameTimer += ms;
      if (ch.frameIndex < ch.frames.length - 1) {
        while (ch.frameIndex < ch.frames.length - 1) {
          const d = ch.frames[ch.frameIndex].delayMs;
          if (ch.frameTimer < d) break;
          ch.frameTimer -= d;
          ch.frameIndex++;
        }
      } else if (ch.frameIndex >= ch.frames.length - 1 && ch.frameTimer >= ch.frames[ch.frames.length - 1].delayMs) {
        ch.frameIndex = 0;
        ch.frameTimer = 0;
      }
    }
  }

  private _updateCoupleChairs(): void {
    const sitters: { charId: number; itemId: number; pos: { x: number; y: number } }[] = [];
    if (this._physics && this._player) {
      const chairId = this._item?.FindPortableChair()?.id ?? 0;
      if (chairId >= 3012000 && chairId < 3013000 && !this._couplePairs.has(this._localCharId))
        sitters.push({ charId: this._localCharId, itemId: chairId, pos: this._physics.Position });
    }
    for (const [charId, ch] of this._otherChars) {
      const itemId = ch.PortableChairItemId;
      if (itemId >= 3012000 && itemId < 3013000 && !this._couplePairs.has(charId))
        sitters.push({ charId, itemId, pos: ch.Position });
    }
    const pairedThisFrame = new Set<number>();
    for (let i = 0; i < sitters.length; i++) {
      if (pairedThisFrame.has(sitters[i].charId)) continue;
      for (let j = i + 1; j < sitters.length; j++) {
        if (pairedThisFrame.has(sitters[j].charId)) continue;
        if (sitters[i].itemId !== sitters[j].itemId) continue;
        const dx = sitters[i].pos.x - sitters[j].pos.x;
        const dy = sitters[i].pos.y - sitters[j].pos.y;
        if (Math.abs(dx) > 100 || Math.abs(dy) > 40) continue;
        const a = sitters[i].charId;
        const b = sitters[j].charId;
        this._couplePairs.set(a, { itemId: sitters[i].itemId, pairCharId: b });
        this._couplePairs.set(b, { itemId: sitters[i].itemId, pairCharId: a });
        pairedThisFrame.add(a);
        pairedThisFrame.add(b);
        // OG: couple-chair pairing — notify server to apply stat bonuses
        this.onCoupleChairPairChanged?.(true, a, b, sitters[i].itemId);
        // Start heart overlay at midpoint — OG: Effect/ItemEff.img/<itemId>/0
        if (!this._coupleHearts.some((h) => (h.a === a && h.b === b) || (h.a === b && h.b === a))) {
          const node = this._effectWz?.GetItem(`ItemEff.img/${sitters[i].itemId}/0`);
          if (node) {
            const frames = loadFrameSequence(this._loader, node);
            if (frames.length > 0) {
              this._coupleHearts.push({ a, b, frames, frameIndex: 0, frameTimer: 0, itemId: sitters[i].itemId });
      }
    }

    // Map-change transition: full-screen black overlay above everything.
    if (this._fadeAlpha > 0) {
      const w = this.game.pixiApp.screen.width;
      const h = this.game.pixiApp.screen.height;
      this._fadeOverlay.clear();
      this._fadeOverlay.rect(0, 0, w, h).fill({ color: 0x000000, alpha: this._fadeAlpha });
      this.uiRoot.addChild(this._fadeOverlay);
    } else if (this._fadeOverlay.parent) {
      this._fadeOverlay.parent.removeChild(this._fadeOverlay);
    }
  }
      }
    }
    const deadPairs = new Set<number>();
    for (const [charId, pair] of this._couplePairs) {
      if (pairedThisFrame.has(charId)) continue;
      const ch = this._otherChars.get(charId);
      if (!ch || ch.PortableChairItemId !== pair.itemId) {
        deadPairs.add(charId);
        continue;
      }
      const pairCh = this._otherChars.get(pair.pairCharId);
      if (!pairCh || pairCh.PortableChairItemId !== pair.itemId) {
        deadPairs.add(charId);
      } else {
        const dx = ch.Position.x - pairCh.Position.x;
        const dy = ch.Position.y - pairCh.Position.y;
        if (Math.abs(dx) > 200 || Math.abs(dy) > 80) deadPairs.add(charId);
      }
    }
    for (const charId of deadPairs) {
      const pair = this._couplePairs.get(charId);
      this._couplePairs.delete(charId);
      if (pair) {
        this._couplePairs.delete(pair.pairCharId);
        // OG: couple-chair unpairing — notify server to remove stat bonuses
        this.onCoupleChairPairChanged?.(false, charId, pair.pairCharId, pair.itemId);
      }
      // Clean up heart overlay
      this._coupleHearts = this._coupleHearts.filter(
        (h) => h.a !== charId && h.b !== charId,
      );
    }
  }

  /** NPC idle-chat: every N seconds, pick a random NPC with speech data and
      show a chat balloon. OG: CNpcTemplate::GetChatMessageList (0x677FE0). */
  private _updateNpcChat(dt: number): void {
    this._npcChatTimer -= dt;
    if (this._npcChatTimer > 0) return;
    this._npcChatTimer = 4 + Math.random() * 4;
    const talkers = this._npcs.filter((n) => n.GetRandomSpeech() !== null);
    if (talkers.length === 0) return;
    const npc = talkers[Math.floor(Math.random() * talkers.length)];
    const text = npc.GetRandomSpeech();
    if (text) this._chatBalloon?.Set(npc.ObjId, text, 5);
  }

  /** ponytail: when combo counter > 0, try indexed variant <wzPath>/<combo>
   *  first (OG Effect_SkillUse format-ID-986 loop). Falls back to base path
   *  if no such sub-node. Remote chars not tracked — only local combo. */
  private _onUserEffect(args: UserEffectArgs): void {
    if (args.effectType !== 14 && args.effectType !== 20) return;
    let uol: string;
    try {
      uol = new InPacket(args.payload).readString();
    } catch {
      return;
    }
    const wzPath = uol.includes('.img') ? uol : uol.replace('/', '.img/');
    const charId = args.isLocal ? this._localCharId : args.charId;
    if (args.isLocal && this._comboCounter > 0) {
      const indexed = this._effectWz?.GetItem(`${wzPath}/${this._comboCounter}`);
      const facingLeft = args.isLocal ? (this._physics?.FacingLeft ?? true) : (this._otherChars.get(args.charId)?.FacingLeft ?? true);
      if (indexed) { this._skillEffects?.PlayAtCaster(indexed, charId, facingLeft); return; }
    }
    const node = this._effectWz?.GetItem(wzPath);
    if (!node) return;
    const facingLeft = args.isLocal ? (this._physics?.FacingLeft ?? true) : (this._otherChars.get(args.charId)?.FacingLeft ?? true);
    this._skillEffects?.PlayAtCaster(node, charId, facingLeft);
  }

  private _playSkillHit(skillId: number, x: number, y: number): void {
    if (skillId <= 0) return;
    const hit = this._skillService?.GetCastInfo(skillId)?.Hit;
    if (!hit) return;
    const frames = loadFrameSequence(this._loader, hit);
    if (frames.length === 0) return;
    // TODO_AUDIT.md Hundred-and-forty-ninth pass: target-side skill hit splash via existing field FX layer.
    this._fieldFx.push({ frames, frameIndex: 0, frameTimer: 0, x, y, done: false });
  }

  // OG: CUserRemote::OnAttack (live IDA decompile, Maplestory95.exe.i64
  // 0x95a670) — see UserAttackArgs/handleUserAttack doc comments for the
  // common-case-only decode this is built on. Applies the same visual
  // treatment `_tryMeleeAttack` already gives the local player's own
  // attacks (hit flash, damage number, knockback) to other players'
  // broadcast attacks, plus their own attack pose. Mob death itself stays
  // server-authoritative (a separate, already-existing mob-leave path) —
  // this only ever calls OnHit, never kills a mob locally.
  private _dispatchCashItem(slot: number, itemId: number, itemName: string): void {
    const t = getConsumeCashItemType(itemId);
    if (t === 0) { this.game.session.send(GameSender.UseItem(slot, itemId)); return; }
    switch (t) {
      case 12: case 13: case 14: case 15:
        this._megaphoneCompose?.Open(slot, itemId);
        return;
      case 26:
      case 65:
        this._itemProtector?.Open();
        return;
      case 67:
        this._scrollDialog?.Open(itemId, itemName, slot);
        if (this._scrollDialog && this._itemIcons) this._scrollDialog.setScrollIcon(this._itemIcons.LoadIcon(itemId));
        return;
      case 71:
        this._vegaDialog?.Open(slot, itemId);
        return;
      default:
        this.game.session.send(GameSender.UseItem(slot, itemId));
    }
  }

  private _onUserAttack(args: UserAttackArgs): void {
    const attacker = this._otherChars.get(args.charId);
    attacker?.SetFacing(args.facingLeft);
    // TODO_AUDIT.md Hundred-and-forty-ninth pass: prefer the decoded packet action over local random-pick fallback.
    if (attacker && !attacker.PlayAttackCode(args.action)) attacker.Attack();

    if (args.attackType === 'magic' && attacker && args.skillId === 2221006 && args.targets.length > 0) {
      const points = [attacker.Position];
      for (const target of args.targets) {
        const mob = this._mobs.get(target.mobId);
        if (mob) points.push({ x: mob.Position.x, y: mob.Position.y - 40 });
      }
      // TODO_AUDIT.md Hundred-and-seventy-second pass: narrow Chain Lightning
      // visual; 2221006 is the v95 Arch Mage I/L chain-lightning attack.
      this._projectiles.SpawnChainLightning(points);
    }

    if ((args.attackType === 'shoot' || args.attackType === 'magic') && attacker) {
      const firstTarget = args.targets[0] ? this._mobs.get(args.targets[0].mobId) : null;
      if (firstTarget) {
        const muzzle = args.ballStart ?? attacker.MuzzlePosition;
        const cast = this._skillService?.GetCastInfo(args.skillId);
        const ballNode = cast?.Ball ?? null;
        let ballFrames: AnimFrame[] | undefined;
        if (ballNode) {
          const f = loadFrameSequence(this._loader, ballNode);
          if (f.length > 0) ballFrames = f;
        }
        // TODO_AUDIT.md Hundred-and-forty-fourth pass / ponytail: skill ball fallback — try bullet item's info canvases (OG NormalBullet::PrepareBulletLayer 0x44C380)
        if (!ballFrames && args.bulletItemId > 0 && this._itemWz) {
          const group = Math.floor(args.bulletItemId / 10000).toString().padStart(4, '0');
          const id = args.bulletItemId.toString().padStart(8, '0');
          const info = this._itemWz.GetItem(`Consume/${group}.img/${id}/info`);
          if (info) {
            const f = loadFrameSequence(this._loader, info, 60);
            if (f.length > 0) ballFrames = f;
          }
        }
        // TODO_AUDIT.md Hundred-and-seventy-fourth pass: CFadeoutBullet subset —
        // fade projectile visuals over their short travel lifetime instead of popping off.
        this._projectiles.Spawn(muzzle.x, muzzle.y, firstTarget.Position.x, firstTarget.Position.y - 40, undefined, ballFrames, true);
      }
    }

    for (const target of args.targets) {
      const mob = this._mobs.get(target.mobId);
      if (!mob || mob.IsDead) continue;
      mob.ShowHitEffect();
      this._mobSounds?.PlayDamage(mob.TemplateId);
      this._playSkillHit(args.skillId, mob.Position.x, mob.Position.y - 40);
      for (let i = 0; i < target.damage.length; i++) {
        const dmg = target.damage[i];
        this._dmgNumbers?.Add(dmg, mob.HeadPosition.x, mob.HeadPosition.y, DamageKind.MobDamage, i);
        this._battleRecord?.AddDamage(dmg, false, false);
      }
      const ctl = this._mobCtl.get(target.mobId);
      ctl?.OnDamagedByPlayer();
      const attackerX = attacker?.Position.x ?? mob.Position.x;
      ctl?.ApplyHitKnockback(mob.Position.x >= attackerX ? 25 : -25);
    }
  }

  private _onMiniRoom(action: number, args: any): void {
    if (args.balloon) {
      // OG (CUserLocal::CBalloonMsg) hovers a persistent title balloon over
      // the shop/trade owner's head once UserMiniRoomBalloon/EmployeeMini
      // RoomBalloon arrives, until the room closes. The dump has no symbols
      // past the inner CBalloonMsg type and the protocol carries no explicit
      // "balloon closed" packet, so this reuses the chat-balloon renderer
      // (already wired to charId->screen-position lookup) with a long TTL
      // instead of the real per-room lifetime; _onUserLeave() clears it
      // once the owner leaves the field, which covers the common case.
      const kind = args.miniRoomType === MiniRoomType.TradingRoom ? 'Trade'
        : args.miniRoomType === MiniRoomType.PersonalShop ? 'Shop'
        : args.miniRoomType === MiniRoomType.EntrustedShop ? 'Entrusted Shop'
        : 'Mini Room';
      this._chatBalloon?.Set(args.ownerId, `[${kind}] ${args.title}`, 600);
      return;
    }
    switch (action) {
      case 5: // MRP_EnterResult
        if (args.roomType === 3 && this._tradingRoom) {
          this._tradingRoom.Open(args.users?.[1]?.name ?? 'Partner', args.myPosition ?? 0);
        } else if (args.roomType === 4 && this._personalShop) {
          const isOwner = args.myPosition === 0;
          const items = GameStage._toShopItemSlots(args.items ?? []);
          this._personalShop.OpenAsOwner(args.title ?? '', items);
          if (!isOwner) {
            this._personalShop.OpenAsVisitor(args.title ?? '', items, args.myPosition ?? 1);
          }
        } else if (args.roomType === 5 && this._entrustedShop) {
          // OG: CEntrustedShopDlg::Open — owner position 0 = owner, 1+ = visitor
          const isOwner = (args.myPosition ?? 0) === 0;
          const shopItems = (args.items ?? []).map((it: any, idx: number) => ({
            index: idx,
            itemId: it.item?.itemId ?? 0,
            quantity: it.setCount ?? 1,
            price: it.price ?? 0,
            name: this.game.nameService.ItemName(it.item?.itemId ?? 0) ?? `[${it.item?.itemId ?? 0}]`,
            icon: this._itemIcons?.LoadIcon(it.item?.itemId ?? 0) ?? null,
          }));
          this._entrustedShop.Open(isOwner, 0, shopItems);
        } else if (args.roomType === MiniRoomType.MemoryGameRoom && this._memoryGame) {
          this._memoryGame.Open(
            args.title ?? '',
            args.myPosition ?? 0,
            args.users ?? [],
            args.maxUsers ?? 2,
            false,
          );
        } else if (args.roomType === MiniRoomType.OmokRoom) {
          this._statusMessenger.showLoot(`[MiniRoom] Entered Omok room "${args.title ?? ''}" (no board UI yet)`);
        }
        break;
      case 10: // MRP_Leave
        if (this._tradingRoom?.isVisible) this._tradingRoom.OnPartnerLeave();
        if (this._personalShop?.isVisible) this._personalShop.isVisible = false;
        if (this._entrustedShop?.isVisible) this._entrustedShop.isVisible = false;
        break;
      case 15: // TRP_PutItem
        if (this._tradingRoom && args.item) {
          this._tradingRoom.OnPartnerPutItem(args.index, { invType: 1, itemId: args.item.itemId, quantity: args.item.quantity ?? 1 });
        }
        break;
      case 16: // TRP_PutMoney
        if (this._tradingRoom) this._tradingRoom.OnPartnerPutMoney(args.money ?? 0);
        break;
      case 17: // TRP_Trade
        if (this._tradingRoom) this._tradingRoom.OnPartnerTrade();
        break;
      case 24: // PSP_BuyResult
        this._personalShop?.AcceptBuyResult(args.resultCode ?? 0);
        break;
      case 25: // PSP_Refresh
        if (args.items) {
          const items = GameStage._toShopItemSlots(args.items);
          this._personalShop?.Refresh(items);
        }
        break;
      case 26: // PSP_AddSoldItem
        if (args.itemIndex !== undefined) {
          this._personalShop?.NotifySoldItem(args.itemIndex, args.quantity ?? 1, args.buyerName ?? '');
        }
        break;
      // ── MemoryGame sub-protocol ──────────────────────────────────────
      case MiniRoomProtocolFull.MGRP_Ready:
        this._memoryGame?.OnUserReady(args.userIndex ?? 0);
        break;
      case MiniRoomProtocolFull.MGRP_CancelReady:
        this._memoryGame?.OnUserCancelReady(args.userIndex ?? 0);
        break;
      case MiniRoomProtocolFull.MGRP_Start:
        this._memoryGame?.OnUserStart(args.round ?? 1, args.cardOrder ?? []);
        break;
      case MiniRoomProtocolFull.MGP_TurnUpCard:
        this._memoryGame?.OnTurnUpCard(
          args.cardIndex ?? 0,
          args.cardType ?? 0,
          args.showState ?? 0,
          args.userIndex ?? 0,
        );
        break;
      case MiniRoomProtocolFull.MGRP_GameResult:
        this._memoryGame?.OnGameResult(args.winnerIndex ?? -1, args.gameResultType ?? 0);
        break;
      case MiniRoomProtocolFull.MGRP_TimeOver:
        this._memoryGame?.OnTimeOver(args.userIndex ?? 0);
        break;
      case MiniRoomProtocolFull.MGRP_TieRequest:
        this._memoryGame?.OnTieRequest(args.userIndex ?? 0);
        break;
      case MiniRoomProtocolFull.MGRP_TieResult:
        this._memoryGame?.OnTieResult(args.userIndex ?? 0, args.resultCode ?? 0);
        break;
      case MiniRoomProtocolFull.MGRP_GiveUpRequest:
      case MiniRoomProtocolFull.MGRP_GiveUpResult:
      case MiniRoomProtocolFull.MGRP_Ban:
      case MiniRoomProtocolFull.MGRP_RetreatRequest:
      case MiniRoomProtocolFull.MGRP_RetreatResult:
      case MiniRoomProtocolFull.MGRP_LeaveEngage:
      case MiniRoomProtocolFull.MGRP_LeaveEngageCancel:
        break;
    }
  }

  private _onMessengerResult(args: MessengerResultArgs): void {
    if (!this._messengerWin) return;
    switch (args.action) {
      case MessengerAction.Open:
        this._messengerWin.Open();
        if (args.userIndex !== undefined && args.name) this._messengerWin.SetParticipant(args.userIndex, args.name);
        break;
      case MessengerAction.Join:
        if (args.userIndex !== undefined) this._messengerWin.SetSelf(args.userIndex);
        break;
      case MessengerAction.Leave:
        if (args.userIndex !== undefined) this._messengerWin.RemoveParticipant(args.userIndex);
        break;
      case MessengerAction.Invite:
        if (args.name) this._statusMessenger.showLoot(`[Messenger] Invite from ${args.name} (ch.${args.channel ?? 0})`);
        break;
      case MessengerAction.Hide:
        if (args.name) this._statusMessenger.showLoot(`[Messenger] ${args.name} is ${args.flag ? 'online' : 'offline'}`);
        break;
      case MessengerAction.DeclineInvite:
        if (args.name) this._statusMessenger.showLoot(`[Messenger] ${args.name} declined your invite`);
        break;
      case MessengerAction.Chat:
        if (args.chat) this._messengerWin.AddChat(args.chat);
        break;
      case MessengerAction.MigratedIn:
        this._messengerWin.Reset();
        for (const m of args.migrated) this._messengerWin.SetParticipant(m.index, m.name);
        break;
    }
  }
}

const SecondaryStatNames = [
  'PAD', 'PDD', 'MAD', 'MDD', 'ACC', 'EVA', 'Craft', 'Speed',
  'Jump', 'MagicGuard', 'DarkSight', 'Booster', 'PowerGuard', 'MaxHP',
  'MaxMP', 'Invincible', 'SoulArrow', 'Stun', 'Poison', 'Seal',
  'Darkness', 'Combo', 'Charge', 'DragonBlood', 'HolySymbol', 'MesoUp',
  'ShadowPartner', 'PickPocket', 'MesoGuard', 'Thaw', 'Weakness', 'Curse',
  'Slow', 'Morph', 'Regen', 'BasicStatUp', 'Stance', 'SharpEyes',
  'ManaReflection', 'Attract', 'NoBulletConsume', 'Infinity', 'AdvancedBless',
  'Illusion', 'BerserkFury', 'DivineBody', 'Spark', 'FinalAttack',
  'WindWalk', 'AranCombo', 'ComboDrain', 'ComboBarrier', 'BodyPressure',
  'SmartKnockback', 'RepeatEffect', 'ExpBuffRate', 'StopPortion', 'StopMotion',
  'Fear', 'EvanSlow', 'MagicShield', 'MagicResistance', 'SoulStone', 'Flying',
];

const MobStatNames = [
  'PAD', 'PDR', 'MAD', 'MDR', 'ACC', 'EVA', 'Speed', 'Stun',
  'Freeze', 'Poison', 'Seal', 'Darkness', 'PowerUp', 'MagicUp', 'PGuardUp',
  'MGuardUp', 'Doom', 'Web', 'HardSkin', 'Ambush', 'Venom', 'Blind',
  'SealSkill', 'Dazzle', 'PCounter', 'MCounter', 'RiseByToss', 'BodyPressure',
  'Weakness', 'TimeBomb', 'MagicCrash', 'DamagedElemAttr', 'HealByDamage',
];

function describeSecondaryStatMask(mask: bigint): string[] {
  return describeMask(mask, SecondaryStatNames);
}

function describeMobStatMask(maskLow: bigint, maskHigh = 0n): string[] {
  // OG UINT128: lower 64 bits = maskLow, upper 64 bits = maskHigh.
  const combined = maskLow | (maskHigh << 64n);
  return describeMask(combined, MobStatNames);
}

function describeMask(mask: bigint, names: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < names.length; i++) {
    if (((mask >> BigInt(i)) & 1n) !== 0n) out.push(names[i]);
  }
  if (out.length === 0 && mask !== 0n) out.push(`mask ${mask}`);
  return out;
}
