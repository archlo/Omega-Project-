import { Container } from 'pixi.js';
import { PetLook } from './PetLook.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import { ActionMan, type ActionFrame } from './ActionMan.js';
import type { WzPackage } from '../wz/WzPackage.js';
import type { DecodedMovePath } from '../net/packet/MovePathDecoder.js';
import { RemoteMoveReplay } from './RemoteMoveReplay.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Move action mapping (OG: CPet::MoveAction2RawAction 0x6a0ff0)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Raw action indices produced by MoveAction2RawAction:
 *  0 = idle, 1 = walk, 2 = stand, 3 = sit, 4 = fly,
 *  5 = ride1, 6 = ride2, 7 = ride3, 8 = hang (ladder/rope)
 */
const enum RawAction {
  Idle = 0,
  Walk = 1,
  Stand = 2,
  Sit = 3,
  Fly = 4,
  Ride1 = 5,
  Ride2 = 6,
  Ride3 = 7,
  Hang = 8,
}

/** MoveAction >> 1 values. */
const enum MoveShifted {
  Idle = 0,
  Walk = 1,
  Stand = 2,
  Sit = 3,
  Fly = 6,
  Ride1 = 12,
  Ride2 = 13,
  Ride3 = 14,
  Hang = 15,
}

/** OG: g_anPetAbilBodyPart — equipment body parts checked for pet abilities. */
const PET_ABIL_BODY_PARTS = [21, 22, 23, 24, 25, 26, 27, 28, 29, 46];

/** OG: pet ring body parts per pet index (name tag / chat balloon ring). */
const PET_RING_BODY_PARTS = [
  [20, 21], // pet 0: ring at body part 20 (name tag), 21 (chat balloon)
  [30, 31], // pet 1
  [40, 41], // pet 2
];

/** Forbidden pickup map ID (OG: CPet::IsInPickupForbiddenMap). */
const FORBIDDEN_PICKUP_MAP = 209080000;

/** Auto-speaking interval: 30 minutes in ms. */
const AUTO_SPEAKING_INTERVAL = 1_800_000;

/** Idle threshold before random actions start (5 seconds). */
const RANDOM_ACTION_THRESHOLD = 5_000;

/** Idle threshold before forced sleep (120 seconds). */
const SLEEP_ACTION_THRESHOLD = 120_000;

/** Anti-spam cooldown for item slot changes (500ms). */
const ITEM_SLOT_CHANGE_COOLDOWN = 500;

// ═══════════════════════════════════════════════════════════════════════════════
// CPetTemplate WZ data structures (loaded from Item.wz/Pet/{id}.img)
// ═══════════════════════════════════════════════════════════════════════════════

export interface PetInteractionResponse {
  act: string;
  chat: string[];
}

export interface PetInteraction {
  command: string;
  levelMin: number;
  levelMax: number;
  prob: number;
  inc: number;
  success: PetInteractionResponse;
  fail: PetInteractionResponse;
}

export interface PetFoodReaction {
  levelMin: number;
  levelMax: number;
  success: PetInteractionResponse;
  fail: PetInteractionResponse;
}

export interface PetSlangReaction {
  levelMin: number;
  levelMax: number;
  act: string;
  words: string[];
}

export interface PetRandomReaction {
  act: string;
  levelMin: number;
  levelMax: number;
}

export interface PetAutoSpeakingEntry {
  chat: string[];
}

export interface PetAutoSpeakingByEventEntry {
  act: string;
  chat: string[];
}

export interface PetTemplateData {
  interactions: PetInteraction[];
  foodReactions: PetFoodReaction[];
  slangReactions: PetSlangReaction[];
  randomReactions: PetRandomReaction[];
  autoSpeaking: PetAutoSpeakingEntry[];
  autoSpeakingByEvent: PetAutoSpeakingByEventEntry[];
  actionMap: Map<string, number>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Callback interface for GameStage wiring
// ═══════════════════════════════════════════════════════════════════════════════

export interface PetCallbacks {
  /** CPet::DoAction sends opcode 200. */
  onPetAction: (petLockerSN: bigint, type: number, action: number, chat: string) => void;
  /** CPet::ParseCommand sends opcode 201. */
  onPetInteraction: (petLockerSN: bigint, hasName: boolean, interactionIdx: number) => void;
  /** CPet::SendDropPickUpRequest sends opcode 202. */
  onPetDropPickUp: (
    petLockerSN: bigint, x: number, y: number, dropId: number,
    cliCrc: number, pickupOthers: boolean, sweepForDrop: boolean, longRange: boolean,
  ) => void;
  /** CPet::SendUpdateExceptionListRequest sends opcode 204. */
  onPetExceptionList: (petLockerSN: bigint, itemIds: number[]) => void;
  /** CPet::UpdatePetAbility — reads combined dwPetAbilityFlag from pet equipment. */
  getEquipAbilityFlag: (petIdx: number) => number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Pet class — 1:1 OG CPet implementation
// ═══════════════════════════════════════════════════════════════════════════════

export class Pet {
  // ── Visual / rendering ───────────────────────────────────────────────────
  readonly look: PetLook;
  private _replay = new RemoteMoveReplay();
  private _ownerPos = { x: 0, y: 0 };
  private _ownerFacingLeft = false;

  // ── Callbacks (wired by GameStage) ───────────────────────────────────────
  Callbacks: PetCallbacks | null = null;

  /** Callback to play a WZ effect at the pet's position. Set by GameStage. */
  PlayEffectCallback: ((effectPath: string) => void) | null = null;

  /** Callback to display a message in the chat bar. Set by GameStage. */
  ChatMessageCallback: ((msg: string) => void) | null = null;

  // ── OG: CPet fields ──────────────────────────────────────────────────────
  readonly TemplateId: number;
  readonly OwnerCharId: number;
  PetIndex = 0;
  LockerSN: bigint | null = null;
  ExceptionList: number[] = [];

  // OG: m_pTemplate (client-side template data — populated from WZ info node)
  TemplateName = '';
  TemplateMoveAbility = 0;
  TemplateNameTag = 0;
  TemplateChatBalloon = 0;
  TemplatebPickUpItem = false;
  TemplatebConsumeHP = false;
  TemplatebConsumeMP = false;
  TemplatebSweepForDrop = false;
  TemplatebLongRange = false;
  TemplatebIgnorePickup = false;
  TemplatebRecall = false;
  TemplatebAutoSpeaking = false;
  TemplatebAutoReact = false;
  TemplatebInterActByUserAction = false;

  // OG: m_nTameness / m_nRepleteness / m_nPetAttribute
  Tameness = 1;
  Repleteness = 100;
  PetAttribute = 0;

  // OG: m_nMoveAction / m_nRestAction / m_nOneTimeAction
  private _moveAction = 1;
  private _restAction = 1;
  private _oneTimeAction = -1;

  // OG: animation frame tracking
  private _actionFrames: ActionFrame[] = [];
  private _posFrame = 0;
  private _frameDelay = 0;

  // OG: idle tracking
  private _tStand = 0;
  private _bRandomAction = false;
  private _bInteractionRequested = false;

  // OG: chat balloon
  private _chatText = '';
  private _chatTimer = 0;

  // OG: ability flags (secure-fused in OG, plain bools here)
  private _bPickupMeso = false;
  private _bPickupItem = false;
  private _bPickupOthers = false;
  private _bLongRange = false;
  private _bSweepForDrop = false;
  private _bConsumeHP = false;
  private _bConsumeMP = false;
  private _bIgnoreItems = false;
  private _bNameTag = true;
  private _bChatBalloon = true;

  // OG: m_bHangOnBack / m_tHangOnBack
  private _bHangOnBack = false;
  private _tHangOnBack = 0;

  // OG: m_bItemSoltChange / m_tItemSoltChange
  private _bItemSoltChange = false;
  private _tItemSoltChange = 0;

  // OG: m_bFirstPetAction / m_tLastPetAction
  private _bFirstPetAction = true;
  private _tLastPetAction = 0;

  // OG: m_tAutoSpeakingTimer
  private _tAutoSpeakingTimer = 0;

  // OG: m_bPreviewState
  PreviewState = false;

  // OG: additional layers (set item effects)
  private _additionalLayers: Array<{
    nData: number;
    nDataForRepeat: number;
    nEffIndex: number;
  }> = [{ nData: 0, nDataForRepeat: -1, nEffIndex: 0 }, { nData: 0, nDataForRepeat: -1, nEffIndex: 0 }];

  // OG: m_DCClient (duration checker — anti-spam)
  private _lastActionTime = 0;

  // OG: position context — affects follow offset (0=single, 1-5=multi-pet)
  private _positionContext = 0;

  // OG: pet level from item slot (GW_ItemSlotPet._ZtlSecureTear_nLevel)
  private _level = 1;

  // OG: CPetTemplate data loaded from Item.wz/Pet/{id}.img
  private _templateData: PetTemplateData | null = null;

  constructor(templateId: number, ownerCharId: number) {
    this.TemplateId = templateId;
    this.OwnerCharId = ownerCharId;
    this.look = new PetLook(templateId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Properties used by GameStage
  // ═══════════════════════════════════════════════════════════════════════════

  get container(): Container { return this.look.container; }
  get Position() { return this.look.Position; }
  set Position(v: { x: number; y: number }) { this.look.Position = v; }

  // ═══════════════════════════════════════════════════════════════════════════
  // Loading
  // ═══════════════════════════════════════════════════════════════════════════

  Load(loader: WzTextureLoader, charWz: WzPackage | null, itemWz?: WzPackage | null): void {
    this.look.Load(loader, charWz);
    this._loadTemplateInfo(itemWz ?? charWz);
  }

  private _loadTemplateInfo(wz: WzPackage | null): void {
    if (!wz) return;
    const strid = `Pet/${this.TemplateId.toString().padStart(8, '0')}.img`;
    const item = wz.GetItem(strid);
    if (!item) return;
    const root = (item && typeof item === 'object' && 'Root' in item) ? (item as { Root: unknown }).Root : null;
    if (!root || typeof root !== 'object') return;
    const rootObj = root as Record<string, unknown>;

    // info/ node — basic properties
    const infoNode = rootObj.info;
    if (infoNode && typeof infoNode === 'object') {
      const info = infoNode as Record<string, unknown>;
      if (typeof info.name === 'string') this.TemplateName = info.name;
      if (typeof info.moveAbility === 'number') this.TemplateMoveAbility = info.moveAbility;
      if (typeof info.nameTag === 'number') this.TemplateNameTag = info.nameTag;
      if (typeof info.chatBalloon === 'number') this.TemplateChatBalloon = info.chatBalloon;
      if (typeof info.bPickUpItem === 'boolean') this.TemplatebPickUpItem = info.bPickUpItem;
      if (typeof info.bConsumeHP === 'boolean') this.TemplatebConsumeHP = info.bConsumeHP;
      if (typeof info.bConsumeMP === 'boolean') this.TemplatebConsumeMP = info.bConsumeMP;
      if (typeof info.bSweepForDrop === 'boolean') this.TemplatebSweepForDrop = info.bSweepForDrop;
      if (typeof info.bLongRange === 'boolean') this.TemplatebLongRange = info.bLongRange;
      if (typeof info.bIgnorePickup === 'boolean') this.TemplatebIgnorePickup = info.bIgnorePickup;
      if (typeof info.bRecall === 'boolean') this.TemplatebRecall = info.bRecall;
      if (typeof info.bAutoSpeaking === 'boolean') this.TemplatebAutoSpeaking = info.bAutoSpeaking;
      if (typeof info.bAutoReact === 'boolean') this.TemplatebAutoReact = info.bAutoReact;
      if (typeof info.bInterActByUserAction === 'boolean') this.TemplatebInterActByUserAction = info.bInterActByUserAction;
    }

    // Parse interaction / food / slang / random / auto-speaking data
    this._templateData = this._parseTemplateData(rootObj);
  }

  private _parseTemplateData(root: Record<string, unknown>): PetTemplateData {
    const data: PetTemplateData = {
      interactions: [], foodReactions: [], slangReactions: [],
      randomReactions: [], autoSpeaking: [], autoSpeakingByEvent: [],
      actionMap: new Map(),
    };

    // Build action name → index map from WZ node names.
    // Known action node names in order (matches OG CPet::MoveAction2RawAction raw indices):
    // 0=walk/move, 1=stand1, 2=stand2, 3=sit/rest0, 4=fly, 5-7=ride1-3, 8=hang
    // Additional named actions (one-time): love, cry, eat, sleep, etc.
    // We scan the root for child nodes that are animation containers (have numbered children).
    const knownActions: Record<string, number> = {
      'walk': 0, 'move': 0,
      'stand1': 1, 'stand2': 2, 'stand3': 9,
      'rest0': 3, 'sit': 3,
      'fly': 4,
      'hang': 8,
      'sleep': 6,
    };
    let nextIdx = 10; // one-time actions start after the basic ones
    for (const key of Object.keys(root)) {
      if (key === 'info' || key === 'interact' || key === 'food' || key === 'slang'
        || key === 'randAction' || key === 'autoSpeaking' || key === 'autoSpeakingByEvent') continue;
      const node = root[key];
      if (!node || typeof node !== 'object') continue;
      // Check if it's an animation container (has '0' child or is a canvas)
      const obj = node as Record<string, unknown>;
      if ('0' in obj || 'origin' in obj) {
        if (knownActions[key] !== undefined) {
          data.actionMap.set(key, knownActions[key]);
        } else if (!data.actionMap.has(key)) {
          data.actionMap.set(key, nextIdx++);
        }
      }
    }
    // Ensure common aliases exist
    if (!data.actionMap.has('stand')) data.actionMap.set('stand', 1);
    if (!data.actionMap.has('walk1')) data.actionMap.set('walk1', 0);
    if (!data.actionMap.has('move1')) data.actionMap.set('move1', 0);

    // interact/ node — user chat command interactions (m_aInteraction)
    const interactNode = root.interact;
    if (interactNode && typeof interactNode === 'object') {
      const interactObj = interactNode as Record<string, unknown>;
      for (const key of Object.keys(interactObj)) {
        const entry = interactObj[key];
        if (!entry || typeof entry !== 'object') continue;
        const e = entry as Record<string, unknown>;
        const command = typeof e.command === 'string' ? e.command : '';
        const levelMin = typeof e.l0 === 'number' ? e.l0 : 0;
        const levelMax = typeof e.l1 === 'number' ? e.l1 : 200;
        const prob = typeof e.prob === 'number' ? e.prob : 100;
        const inc = typeof e.inc === 'number' ? e.inc : 1;
        const success = this._parseInteractionResponse(e.success);
        const fail = this._parseInteractionResponse(e.fail);
        data.interactions.push({ command, levelMin, levelMax, prob, inc, success, fail });
      }
    }

    // food/ node — food reaction data (m_aFoodReaction)
    const foodNode = root.food;
    if (foodNode && typeof foodNode === 'object') {
      const foodObj = foodNode as Record<string, unknown>;
      for (const key of Object.keys(foodObj)) {
        const entry = foodObj[key];
        if (!entry || typeof entry !== 'object') continue;
        const e = entry as Record<string, unknown>;
        data.foodReactions.push({
          levelMin: typeof e.l0 === 'number' ? e.l0 : 0,
          levelMax: typeof e.l1 === 'number' ? e.l1 : 200,
          success: this._parseInteractionResponse(e.success),
          fail: this._parseInteractionResponse(e.fail),
        });
      }
    }

    // slang/ node — slang/cursed word reactions (m_aSlangReaction)
    const slangNode = root.slang;
    if (slangNode && typeof slangNode === 'object') {
      const slangObj = slangNode as Record<string, unknown>;
      for (const key of Object.keys(slangObj)) {
        const entry = slangObj[key];
        if (!entry || typeof entry !== 'object') continue;
        const e = entry as Record<string, unknown>;
        const act = typeof e.act === 'string' ? e.act : '';
        const words: string[] = [];
        for (let i = 0; ; i++) {
          const w = e[String(i)];
          if (typeof w !== 'string') break;
          words.push(w);
        }
        data.slangReactions.push({
          levelMin: typeof e.l0 === 'number' ? e.l0 : 0,
          levelMax: typeof e.l1 === 'number' ? e.l1 : 200,
          act, words,
        });
      }
    }

    // randAction/ node — random idle reactions (m_aRandomReaction)
    const randNode = root.randAction;
    if (randNode && typeof randNode === 'object') {
      const randObj = randNode as Record<string, unknown>;
      for (const key of Object.keys(randObj)) {
        const entry = randObj[key];
        if (!entry || typeof entry !== 'object') continue;
        const e = entry as Record<string, unknown>;
        data.randomReactions.push({
          act: typeof e.act === 'string' ? e.act : '',
          levelMin: typeof e.l0 === 'number' ? e.l0 : 0,
          levelMax: typeof e.l1 === 'number' ? e.l1 : 200,
        });
      }
    }

    // autoSpeaking/ node — periodic auto-speaking
    const autoNode = root.autoSpeaking;
    if (autoNode && typeof autoNode === 'object') {
      const autoObj = autoNode as Record<string, unknown>;
      for (const key of Object.keys(autoObj)) {
        const entry = autoObj[key];
        if (!entry || typeof entry !== 'object') continue;
        const e = entry as Record<string, unknown>;
        const chat: string[] = [];
        for (let i = 0; ; i++) {
          const c = e[String(i)];
          if (typeof c !== 'string') break;
          chat.push(c);
        }
        if (chat.length > 0) data.autoSpeaking.push({ chat });
      }
    }

    // autoSpeakingByEvent/ node — event-triggered speech
    const eventNode = root.autoSpeakingByEvent;
    if (eventNode && typeof eventNode === 'object') {
      const eventObj = eventNode as Record<string, unknown>;
      for (const key of Object.keys(eventObj)) {
        const entry = eventObj[key];
        if (!entry || typeof entry !== 'object') continue;
        const e = entry as Record<string, unknown>;
        const chat: string[] = [];
        for (let i = 0; ; i++) {
          const c = e[String(i)];
          if (typeof c !== 'string') break;
          chat.push(c);
        }
        data.autoSpeakingByEvent.push({
          act: typeof e.act === 'string' ? e.act : '',
          chat,
        });
      }
    }

    return data;
  }

  private _parseInteractionResponse(node: unknown): PetInteractionResponse {
    const resp: PetInteractionResponse = { act: '', chat: [] };
    if (!node || typeof node !== 'object') return resp;
    const obj = node as Record<string, unknown>;
    // The response is an action entry container — look for numbered keys
    for (const key of Object.keys(obj)) {
      const actionEntry = obj[key];
      if (!actionEntry || typeof actionEntry !== 'object') continue;
      const ae = actionEntry as Record<string, unknown>;
      if (typeof ae.act === 'string') resp.act = ae.act;
      for (let i = 0; ; i++) {
        const c = ae[String(i)];
        if (typeof c !== 'string') break;
        resp.chat.push(c);
      }
      break; // only first action entry
    }
    return resp;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Owner positioning
  // ═══════════════════════════════════════════════════════════════════════════

  SetOwnerPosition(x: number, y: number, facingLeft: boolean): void {
    this._ownerPos = { x, y };
    this._ownerFacingLeft = facingLeft;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Exception list
  // ═══════════════════════════════════════════════════════════════════════════

  /** OG: CPet::OnLoadExceptionList (0x6a1510). */
  SetExceptionList(lockerSN: bigint, itemIds: number[]): void {
    if (this.LockerSN !== null && lockerSN !== this.LockerSN) return;
    this.ExceptionList = itemIds;
  }

  /** OG: CPet::IsInExceptionListPet (0x69fca0). */
  IsInExceptionList(nItemID: number): boolean {
    return this.ExceptionList.includes(nItemID);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: CPet::GetLevel (0x6a0080) — reads from item slot
  // ═══════════════════════════════════════════════════════════════════════════

  GetLevel(): number {
    return this._level;
  }

  SetLevel(level: number): void {
    this._level = level;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: CPet::IsNamedPet (0x69feb0)
  // ═══════════════════════════════════════════════════════════════════════════

  IsNamedPet(): boolean {
    return this.look.Name !== this.TemplateName;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: CPet::IsInPickupForbiddenMap (0x6a0220)
  // ═══════════════════════════════════════════════════════════════════════════

  IsInPickupForbiddenMap(currentMapId: number): boolean {
    return currentMapId === FORBIDDEN_PICKUP_MAP;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Ability flag getters (OG: CPet::CanPickupMeso/Item, IsLongRange, SweepForDrop)
  // ═══════════════════════════════════════════════════════════════════════════

  CanPickupMeso(): boolean { return this._bPickupMeso; }
  CanPickupItem(): boolean { return this._bPickupItem; }
  CanPickupOthers(): boolean { return this._bPickupOthers; }
  IsLongRange(): boolean { return this._bLongRange; }
  SweepForDrop(): boolean { return this._bSweepForDrop; }
  CanConsumeHP(): boolean { return this._bConsumeHP; }
  CanConsumeMP(): boolean { return this._bConsumeMP; }
  ShouldIgnoreItems(): boolean { return this._bIgnoreItems; }
  HasNameTag(): boolean { return this._bNameTag; }
  HasChatBalloon(): boolean { return this._bChatBalloon; }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: CPet::MoveAction2RawAction (0x6a0ff0)
  // ═══════════════════════════════════════════════════════════════════════════

  MoveAction2RawAction(nMA: number): { rawAction: number; dir: number } {
    const dir = nMA & 1; // 0=right, 1=left
    const shifted = nMA >> 1;

    switch (shifted) {
      case MoveShifted.Walk: {
        if (!this.TemplatebInterActByUserAction) return { rawAction: RawAction.Idle, dir };
        // OG: random move1-5 with 1/15 probability each, else idle
        const r = Math.floor(Math.random() * 15);
        if (r >= 1 && r <= 5) {
          const actionNo = this._getTemplateActionNo(`move${r}`);
          if (actionNo >= 0) return { rawAction: actionNo, dir };
        }
        return { rawAction: RawAction.Idle, dir };
      }
      case MoveShifted.Stand:
      case 11: { // MoveShifted.Stand alternate
        if (this.TemplatebInterActByUserAction) {
          const r = Math.floor(Math.random() * 15);
          if (r >= 2 && r <= 6) {
            const actionNo = this._getTemplateActionNo(`stand${r}`);
            if (actionNo >= 0) return { rawAction: actionNo, dir };
          }
          // Fallback: random stand1 or stand2
          return { rawAction: (shifted === 2 ? 1 : 2), dir };
        }
        return { rawAction: (shifted === 2 ? 1 : 2), dir };
      }
      case MoveShifted.Sit:
        return { rawAction: RawAction.Sit, dir };
      case MoveShifted.Fly:
        return { rawAction: RawAction.Fly, dir };
      case MoveShifted.Ride1:
        return { rawAction: RawAction.Ride1, dir };
      case MoveShifted.Ride2:
        return { rawAction: RawAction.Ride2, dir };
      case MoveShifted.Ride3:
        return { rawAction: RawAction.Ride3, dir };
      case MoveShifted.Hang:
        return { rawAction: RawAction.Hang, dir };
      default:
        return { rawAction: RawAction.Idle, dir };
    }
  }

  private _getTemplateActionNo(actionName: string): number {
    if (!actionName) return -1;
    // Check the WZ action map first
    if (this._templateData) {
      const mapped = this._templateData.actionMap.get(actionName);
      if (mapped !== undefined) return mapped;
    }
    // Fallback: regex-based mapping for numbered variants
    const match = actionName.match(/^(stand|walk|move|sleep|sit|fly|ride|hang)(\d+)$/);
    if (!match) return -1;
    const base = match[1];
    const idx = parseInt(match[2], 10);
    switch (base) {
      case 'walk': case 'move': return 0;
      case 'stand': return idx;
      case 'sit': return 3;
      case 'fly': return 4;
      case 'ride': return 4 + idx;
      case 'hang': return 8;
      case 'sleep': return 6;
      default: return -1;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: CPet::SetMoveAction (0x6a3830)
  // ═══════════════════════════════════════════════════════════════════════════

  SetMoveAction(nMA: number, bReload = false): void {
    if (bReload || nMA !== this._moveAction) {
      this._moveAction = nMA;
      if (this._oneTimeAction <= -1) {
        this.PrepareActionLayer();
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: CPet::PrepareActionLayer (0x6a1b50)
  // ═══════════════════════════════════════════════════════════════════════════

  PrepareActionLayer(): void {
    const { rawAction, dir } = this.MoveAction2RawAction(this._moveAction);
    const actionIdx = this._oneTimeAction > -1 ? this._oneTimeAction : rawAction;

    // Load action frames from ActionMan
    const frames: ActionFrame[] = [];
    ActionMan.GetInstance().LoadPetAction(this.TemplateId, actionIdx, frames);

    if (frames.length === 0) {
      // Fallback: try stand action
      ActionMan.GetInstance().LoadPetAction(this.TemplateId, RawAction.Stand, frames);
    }

    this._actionFrames = frames;
    this._posFrame = 0;
    this._frameDelay = frames.length > 0 ? frames[0].delay : 150;

    // Set flip direction
    this.look.FaceLeft(dir === 1);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: CPet::DoAction (0x6a2340) — master action dispatcher
  // ═══════════════════════════════════════════════════════════════════════════

  DoAction(nType: number, nAction: number, chat: string, bSend: boolean, bChatBalloon: boolean, bIgnoreOnPlayingOneTimeAction = false): void {
    // Anti-spam: CDurationChecker::Validate
    const now = performance.now();
    if (!this._bFirstPetAction) {
      const elapsed = now - this._tLastPetAction;
      if (elapsed < 50) return; // too fast
    }
    this._tLastPetAction = now;
    this._bFirstPetAction = false;

    let action = nAction;

    // If on ladder/rope, force hang action
    // (In OG this checks CVecCtrl::IsOnLadder/IsOnRope — we approximate via move action)
    const isOnLadderOrRope = (this._moveAction >> 1) === MoveShifted.Hang;
    if (isOnLadderOrRope) {
      action = RawAction.Hang;
      this._restAction = RawAction.Hang;
    } else if (nAction >= 9) {
      // One-time action (>= 9 maps to named actions in the template)
      this._oneTimeAction = nAction;
      this.PrepareActionLayer();
    } else {
      this._restAction = nAction;
    }

    // Chat balloon
    if (chat && chat.length > 0) {
      this._chatText = chat;
      this._chatTimer = 5; // 5 seconds
      this.look.Say(chat, 5);
    }

    // Send packet to server
    if (bSend && this.LockerSN !== null) {
      this.Callbacks?.onPetAction(this.LockerSN, nType, action < 9 ? 0 : action, chat);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: CPet::DoActionByUserAction (0x6a2710)
  // ═══════════════════════════════════════════════════════════════════════════

  DoActionByUserAction(nUserAction: number): boolean {
    if (!this.TemplatebInterActByUserAction) return false;

    const { rawAction } = this.MoveAction2RawAction(this._moveAction);
    const currentAction = this._oneTimeAction > -1 ? this._oneTimeAction : rawAction;

    // Can't interrupt walk(0), sit(3), fly(4), or hang(8)
    if (currentAction === 0 || currentAction === 3 || currentAction === 4 || currentAction === 8) {
      return false;
    }

    // Can't interrupt sleep if sleeping
    if (currentAction === 5 && nUserAction !== 4) return false;

    // Map user action to pet action name
    let actionName: string;
    switch (nUserAction) {
      case 0: actionName = 'start'; break;
      case 1: actionName = 'love'; break;
      case 2: actionName = 'cry'; break;
      case 3: actionName = 'question'; break;
      case 4: actionName = 'love'; break;
      case 5: actionName = 'angry'; break;
      case 6: actionName = 'sleep'; break;
      default: return false;
    }

    // If not sleep and idle > 5s, cap idle at 5s
    if (actionName !== 'sleep' && this._tStand > RANDOM_ACTION_THRESHOLD) {
      this._tStand = RANDOM_ACTION_THRESHOLD;
    }

    const actionNo = this._getTemplateActionNo(actionName);
    if (actionNo < 0) return false;

    this.DoAction(0, actionNo, '', true, true);
    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: CPet::ParseCommand (0x6a3cc0) — chat command parser
  // ═══════════════════════════════════════════════════════════════════════════

  ParseCommand(sChat: string): boolean {
    // Can't parse during active action, pending interaction, or too soon after spawn
    if (this._oneTimeAction > -1 || this._bInteractionRequested || this._tStand < 500) {
      return false;
    }

    let chat = sChat.trim();
    let hasName = false;

    // Check if named pet — strip pet name prefix
    if (this.IsNamedPet() && chat.length > this.look.Name.length) {
      if (chat.startsWith(this.look.Name)) {
        chat = chat.substring(this.look.Name.length).trim();
        hasName = true;
      }
    }

    // Strip prefix chars: !, ,, ~
    while (chat.length > 0 && (chat[0] === '!' || chat[0] === ',' || chat[0] === '~')) {
      chat = chat.substring(1).trim();
    }

    // Look up in template interactions (simplified — real OG iterates m_aInteraction)
    // For now, check if the chat matches any known interaction command
    const interactionIdx = this._findInteractionIndex(chat);
    if (interactionIdx < 0) return false;

    // Send interaction request
    if (this.LockerSN !== null) {
      this.Callbacks?.onPetInteraction(this.LockerSN, hasName, interactionIdx);
      this._bInteractionRequested = true;
    }
    return true;
  }

  private _findInteractionIndex(command: string): number {
    if (!this._templateData) return -1;
    const level = this.GetLevel();
    for (let i = 0; i < this._templateData.interactions.length; i++) {
      const inter = this._templateData.interactions[i];
      if (inter.command !== command) continue;
      if (level < inter.levelMin || level > inter.levelMax) continue;
      return i;
    }
    return -1;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: CPet::ChatCommand (0x6a4020)
  // ═══════════════════════════════════════════════════════════════════════════

  ChatCommand(sContent: string): void {
    this.UpdatePetAbility();
    if (this.GetLevel() >= 15) {
      this.DoAction(2, 0, sContent, true, this._bChatBalloon, true);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: CPet::CursedChatCommand (0x6a4080)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Check if chat text matches any slang word in the pet's template data. */
  _hasSlangReaction(text: string): boolean {
    if (!this._templateData) return false;
    const level = this.GetLevel();
    const lower = text.toLowerCase();
    for (const slang of this._templateData.slangReactions) {
      if (level < slang.levelMin || level > slang.levelMax) continue;
      for (const word of slang.words) {
        if (lower.includes(word.toLowerCase())) return true;
      }
    }
    return false;
  }

  CursedChatCommand(): void {
    // Look up slang reaction from template
    if (this._templateData && this._templateData.slangReactions.length > 0) {
      const level = this.GetLevel();
      for (const slang of this._templateData.slangReactions) {
        if (level < slang.levelMin || level > slang.levelMax) continue;
        if (slang.act) {
          const actionNo = this._getTemplateActionNo(slang.act);
          if (actionNo >= 0) {
            this.DoAction(3, actionNo, '', true, false, true);
            return;
          }
        }
      }
    }
    // Fallback: generic angry/disgusted action
    this.DoAction(3, 1, '', true, false, true);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: CPet::RandomAction (0x6a3b60)
  // ═══════════════════════════════════════════════════════════════════════════

  RandomAction(): void {
    if (this._bRandomAction) return;
    // Use WZ random reaction table if available
    if (this._templateData && this._templateData.randomReactions.length > 0) {
      const level = this.GetLevel();
      const eligible = this._templateData.randomReactions.filter(
        r => level >= r.levelMin && level <= r.levelMax
      );
      if (eligible.length > 0) {
        const pick = eligible[Math.floor(Math.random() * eligible.length)];
        const actionNo = this._getTemplateActionNo(pick.act);
        if (actionNo >= 0) {
          this.DoAction(3, actionNo, '', true, false, true);
          return;
        }
      }
    }
    // Fallback: random stand variant
    const r = Math.floor(Math.random() * 3);
    const actionNames = ['stand1', 'stand2', 'stand3'];
    const actionNo = this._getTemplateActionNo(actionNames[r]);
    if (actionNo >= 0) {
      this.DoAction(3, actionNo, '', true, false, true);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: CPet::AutoSpeakingByRandom (0x6a19c0)
  // ═══════════════════════════════════════════════════════════════════════════

  AutoSpeakingByRandom(): void {
    if (!this.TemplatebAutoSpeaking) return;
    if (!this._templateData || this._templateData.autoSpeaking.length === 0) return;
    const entry = this._templateData.autoSpeaking[
      Math.floor(Math.random() * this._templateData.autoSpeaking.length)
    ];
    if (entry.chat.length > 0) {
      const chat = entry.chat[Math.floor(Math.random() * entry.chat.length)];
      this.DoAction(2, 0, chat, true, this._bChatBalloon);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: CPet::AutoSpeakingByEvent (0x6a18a0)
  // ═══════════════════════════════════════════════════════════════════════════

  AutoSpeakingByEvent(nEvent: number): void {
    if (!this._templateData || nEvent < 0 || nEvent >= this._templateData.autoSpeakingByEvent.length) return;
    const entry = this._templateData.autoSpeakingByEvent[nEvent];
    if (entry.act) {
      const actionNo = this._getTemplateActionNo(entry.act);
      if (actionNo >= 0) {
        const chat = entry.chat.length > 0
          ? entry.chat[Math.floor(Math.random() * entry.chat.length)] : '';
        this.DoAction(3, actionNo, chat, true, this._bChatBalloon);
      }
    } else if (entry.chat.length > 0) {
      const chat = entry.chat[Math.floor(Math.random() * entry.chat.length)];
      this.DoAction(2, 0, chat, true, this._bChatBalloon);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: CPet::UpdatePetAbility (0x6a0a40)
  // ═══════════════════════════════════════════════════════════════════════════

  UpdatePetAbility(): void {
    // OG: iterates pet equipment body parts (21-29, 46) and reads dwPetAbilityFlag
    // from each equipped pet item. Also reads pet ring equipment for name tag/balloon.
    const equipFlag = this.Callbacks?.getEquipAbilityFlag?.(this.PetIndex) ?? 0;
    const attr = this.PetAttribute | equipFlag;

    this._bPickupMeso = this.TemplatebPickUpItem || (attr & 0x01) !== 0;
    this._bPickupItem = this.TemplatebPickUpItem || (attr & 0x02) !== 0;
    this._bPickupOthers = (attr & 0x04) !== 0;
    this._bLongRange = this.TemplatebLongRange || (attr & 0x08) !== 0;
    this._bSweepForDrop = this.TemplatebSweepForDrop || (attr & 0x10) !== 0;
    this._bConsumeHP = this.TemplatebConsumeHP || (attr & 0x20) !== 0;
    this._bConsumeMP = this.TemplatebConsumeMP || (attr & 0x40) !== 0;
    this._bIgnoreItems = this.TemplatebIgnorePickup || (attr & 0x80) !== 0;

    // Name tag / chat balloon from template defaults (ring equipment not yet wired)
    this._bNameTag = this.TemplateNameTag !== 0;
    this._bChatBalloon = this.TemplateChatBalloon !== 0;

    this.look.ShowNameTag = this._bNameTag;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: CPet::BeginItemSoltChange (0x4ffd20)
  // ═══════════════════════════════════════════════════════════════════════════

  BeginItemSoltChange(): void {
    this._bItemSoltChange = true;
    this._tItemSoltChange = performance.now();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: CPet::SendDropPickUpRequest (0x6a0820)
  // ═══════════════════════════════════════════════════════════════════════════

  SendDropPickUpRequest(x: number, y: number, dropId: number, cliCrc: number): boolean {
    // Cooldown check
    if (this._bItemSoltChange && performance.now() - this._tItemSoltChange >= ITEM_SLOT_CHANGE_COOLDOWN) {
      return false;
    }
    if (this.LockerSN === null) return false;

    this.Callbacks?.onPetDropPickUp(
      this.LockerSN, x, y, dropId, cliCrc,
      this._bPickupOthers, this._bSweepForDrop, this._bLongRange,
    );
    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: CPet::SendUpdateExceptionListRequest (0x6a0dd0)
  // ═══════════════════════════════════════════════════════════════════════════

  SendUpdateExceptionListRequest(itemIds: number[]): void {
    if (this.LockerSN === null) return;
    this.Callbacks?.onPetExceptionList(this.LockerSN, itemIds);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: CPet::OnAction (0x6a3860) — server→client action
  // ═══════════════════════════════════════════════════════════════════════════

  OnAction(type: number, actionNo: number, chat: string, flag: number): void {
    this.DoAction(type, actionNo, chat, false, flag !== 0);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: CPet::OnActionCommand (0x6a3930) — server→client interaction result
  // ═══════════════════════════════════════════════════════════════════════════

  OnActionCommand(nType: number, interactionIdx: number, successFlag: number): void {
    this._bInteractionRequested = false;
    // Look up the interaction result action from the template
    if (this._templateData && interactionIdx >= 0 && interactionIdx < this._templateData.interactions.length) {
      const inter = this._templateData.interactions[interactionIdx];
      const resp = successFlag !== 0 ? inter.success : inter.fail;
      if (resp.act) {
        const actionNo = this._getTemplateActionNo(resp.act);
        if (actionNo >= 0) {
          this.DoAction(3, actionNo, resp.chat[0] ?? '', false, true);
          return;
        }
      }
    }
    // Fallback: generic happy/sad animation
    this.PlayReaction(successFlag !== 0);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: CPet::OnNameChanged (0x6a11f0)
  // ═══════════════════════════════════════════════════════════════════════════

  OnNameChanged(newName: string, showNameTag: boolean): void {
    this.look.Name = newName;
    this._bNameTag = showNameTag;
    this.look.ShowNameTag = showNameTag;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: CPet::OnValidateStat (0x6a12e0)
  // ═══════════════════════════════════════════════════════════════════════════

  OnValidateStat(newTameness: number, newRepleteness: number, newPetAttribute: number): void {
    const oldTameness = this.Tameness;
    this.Tameness = newTameness;
    this.Repleteness = newRepleteness;
    this.PetAttribute = newPetAttribute;
    this.UpdatePetAbility();
    // OG: show screen message if tameness changed (StringPool 394/395)
    if (newTameness !== oldTameness) {
      const msg = newTameness > oldTameness
        ? 'Your pet\'s tameness has increased.'   // StringPool 394
        : 'Your pet\'s tameness has decreased.';   // StringPool 395
      this._chatText = msg;
      this._chatTimer = 3;
      this.look.Say(msg, 3);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Reaction plays (used by GameStage for server-triggered reactions)
  // ═══════════════════════════════════════════════════════════════════════════

  PlayReaction(success: boolean): void {
    this.look.PlayAction(success ? 1 : 0);
    this._manualTimer = 0.6;
  }

  PlayAction(action: number): void {
    this.look.PlayAction(action);
    this._manualTimer = 0.6;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Move replay (from server move packets)
  // ═══════════════════════════════════════════════════════════════════════════

  ReplayMove(path: DecodedMovePath): void {
    this._replay.SetPath(path, this.Position);
    this.look.SetState('walk');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Snap near owner (fallback when no move path)
  // ═══════════════════════════════════════════════════════════════════════════

  SnapNearOwner(): void {
    // OG: position context offsets for multi-pet follow.
    // ctx 0 (single): center, ctx 1: left, ctx 2: right,
    // ctx 3: far left, ctx 4: far right, ctx 5: center (3rd pet)
    const offsets: Record<number, { dx: number; dy: number }> = {
      0: { dx: -32, dy: 0 },   // single: left of owner
      1: { dx: -40, dy: 0 },   // 2-pet slot 0: left
      2: { dx: 40, dy: 0 },    // 2-pet slot 1: right
      3: { dx: -50, dy: 0 },   // 3-pet slot 1: far left
      4: { dx: 50, dy: 0 },    // 3-pet slot 2: far right
      5: { dx: -32, dy: 0 },   // 3-pet slot 0: center-left
    };
    const off = offsets[this._positionContext] ?? offsets[0];
    const dir = this._ownerFacingLeft ? 1 : -1;
    this.Position = {
      x: this._ownerPos.x + off.dx * dir,
      y: this._ownerPos.y + off.dy,
    };
    this._manualTimer = 0.4;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Preview state
  // ═══════════════════════════════════════════════════════════════════════════

  SetPreviewState(): void {
    this.PreviewState = true;
    this.look.Say(this.TemplateName, 9999);
    this.look.Name = this.TemplateName;
    this.look.ShowNameTag = true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Additional layer management (set item effects)
  // ═══════════════════════════════════════════════════════════════════════════

  GetAdditionalLayer(index: number): { nData: number; nDataForRepeat: number; nEffIndex: number } {
    return this._additionalLayers[index] ?? { nData: 0, nDataForRepeat: -1, nEffIndex: 0 };
  }

  RemoveAdditionalLayer(index: number): void {
    if (this._additionalLayers[index]) {
      this._additionalLayers[index] = { nData: 0, nDataForRepeat: -1, nEffIndex: 0 };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ShowEffect (OG: CPet::ShowEffect 0x52e920 / 0x6a2050)
  // ═══════════════════════════════════════════════════════════════════════════

  ShowEffect(nType: number): void {
    // OG: pet effects from Effect.wz/PetEff.img/{petId}/{type}
    // nType maps to effect sub-nodes (e.g., 0=warp, 1=levelup, etc.)
    const effectPaths: Record<number, string> = {
      0: `PetEff.img/${this.TemplateId}/warp`,
      1: `PetEff.img/Basic/LevelUp`,
      2: `PetEff.img/Basic/Teleport`,
    };
    const path = effectPaths[nType];
    if (path) this.PlayEffectCallback?.(path);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SetSetItemEffect / SetSetItemBackground
  // ═══════════════════════════════════════════════════════════════════════════

  SetSetItemEffect(nEffectID: number, nEffIndex: number): void {
    // Set-item glow effect — store in additional layers for rendering
    if (nEffIndex >= 0 && nEffIndex < this._additionalLayers.length) {
      this._additionalLayers[nEffIndex] = { nData: nEffectID, nDataForRepeat: -1, nEffIndex };
    }
  }

  SetSetItemBackground(nEffIndex: number, bTeleport: boolean): void {
    // Set-item background effect — store in additional layers for rendering
    if (nEffIndex >= 0 && nEffIndex < this._additionalLayers.length) {
      this._additionalLayers[nEffIndex] = {
        nData: bTeleport ? 2 : 1,
        nDataForRepeat: -1,
        nEffIndex,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HangOnBack (OG: CPet::HangOnBack 0x6a29b0)
  // ═══════════════════════════════════════════════════════════════════════════

  HangOnBack(bHangOnBack: boolean, bForce = false): void {
    if (!bForce && this._bHangOnBack === bHangOnBack) return;
    this._bHangOnBack = bHangOnBack;
    if (bHangOnBack) {
      // Cancel one-time action
      if (this._oneTimeAction > -1) {
        this._oneTimeAction = -1;
        this.PrepareActionLayer();
      }
      this._tHangOnBack = 0;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SetAngryAction (OG: CPet::SetAngryAction 0x6a34c0)
  // ═══════════════════════════════════════════════════════════════════════════

  SetAngryAction(): void {
    this.DoActionByUserAction(5); // angry
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SetPositionContext (OG: CPet::SetPositionContext 0x69fc10)
  // ═══════════════════════════════════════════════════════════════════════════

  SetPositionContext(nPositionContext: number): void {
    this._positionContext = nPositionContext;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GetBodyRect (OG: CPet::GetBodyRect 0x6a1ac0)
  // ═══════════════════════════════════════════════════════════════════════════

  GetBodyRect(): { left: number; top: number; right: number; bottom: number } | null {
    if (this._actionFrames.length === 0) return null;
    const frame = this._actionFrames[Math.min(this._posFrame, this._actionFrames.length - 1)];
    if (!frame) return null;
    const { left, top, right, bottom } = frame.bodyRect;
    if (left === 0 && top === 0 && right === 0 && bottom === 0) return null;
    return { left, top, right, bottom };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Update (OG: CPet::Update 0x6a4980) — called every 30ms tick
  // ═══════════════════════════════════════════════════════════════════════════

  private _manualTimer = 0;

  Update(dt: number, currentMapId?: number): void {
    // Chat balloon timeout
    if (this._chatTimer > 0) {
      this._chatTimer = Math.max(0, this._chatTimer - dt);
    }

    // Owner facing
    this.look.FaceLeft(this._ownerFacingLeft);

    // Move replay
    if (this._replay.Update(dt, this.Position)) {
      this.look.SetState('walk');
      this.look.container.position.set(this.Position.x, this.Position.y);
      this.look.Update(dt);
      return;
    }

    // Manual timer (post-action freeze)
    if (this._manualTimer > 0) {
      this._manualTimer = Math.max(0, this._manualTimer - dt);
      this.look.container.position.set(this.Position.x, this.Position.y);
      this.look.Update(dt);
      return;
    }

    // ── OG Update loop ──────────────────────────────────────────────────

    const dtMs = dt * 1000;

    // Advance animation frame
    if (this._actionFrames.length > 0) {
      this._frameDelay -= dtMs;
      if (this._frameDelay <= 0) {
        this._posFrame++;
        if (this._posFrame >= this._actionFrames.length) {
          // Action complete
          if (this._oneTimeAction > -1) {
            this._oneTimeAction = -1;
            this.PrepareActionLayer();
          } else {
            // Loop or pick rest action
            this._posFrame = 0;
            if (this._restAction >= 1 && this._restAction <= 2) {
              // Random rest action
              this._restAction = Math.floor(Math.random() * 2) + 1;
              const { rawAction } = this.MoveAction2RawAction(this._moveAction);
              this._moveAction = (this._moveAction & ~0x1E) | (rawAction << 1);
              this.PrepareActionLayer();
            }
          }
        }
        if (this._actionFrames.length > 0 && this._posFrame < this._actionFrames.length) {
          this._frameDelay = this._actionFrames[this._posFrame].delay;
        }
      }
    }

    // Update position from visual
    const pos = this.Position;

    // Track idle time
    const ownerPos = this._ownerPos;
    if (Math.abs(pos.x - ownerPos.x) < 2 && Math.abs(pos.y - ownerPos.y) < 2) {
      this._tStand += dtMs;
    } else {
      this._restAction = 1;
      this._tStand = 0;
      this._bRandomAction = false;
    }

    // Idle behavior
    if (this._tStand > SLEEP_ACTION_THRESHOLD) {
      // Force sleep action
      this.DoActionByUserAction(6);
    } else if (this._tStand > RANDOM_ACTION_THRESHOLD) {
      // Random action chance
      if (!this._bRandomAction && Math.random() < 0.5) {
        this.RandomAction();
        this._bRandomAction = true;
      } else {
        this._bRandomAction = false;
      }
    }

    // Auto-speaking timer
    this._tAutoSpeakingTimer += dtMs;
    if (this._tAutoSpeakingTimer >= AUTO_SPEAKING_INTERVAL) {
      this.AutoSpeakingByRandom();
      this._tAutoSpeakingTimer = 0;
    }

    // Follow owner if too far
    const dx = ownerPos.x - pos.x;
    const dy = ownerPos.y - pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const followDist = 35;
    const followSpeed = 480;

    if (dist > followDist) {
      const maxStep = followSpeed * dt;
      const step = Math.min(dist - followDist, maxStep);
      const ratio = step / dist;
      pos.x += dx * ratio;
      pos.y += dy * ratio;
      this.look.SetState('walk');
    } else {
      // Pick stand animation based on current action
      const { rawAction } = this.MoveAction2RawAction(this._moveAction);
      if (rawAction === RawAction.Sit) {
        this.look.SetState('sit');
      } else if (rawAction === RawAction.Fly) {
        this.look.SetState('fly');
      } else {
        this.look.SetState('stand');
      }
    }

    // Render current animation frame
    if (this._actionFrames.length > 0 && this._posFrame < this._actionFrames.length) {
      const frame = this._actionFrames[this._posFrame];
      // Use the action frame's flip direction
      this.look.FaceLeft(frame.flip ? !this._ownerFacingLeft : this._ownerFacingLeft);
    }

    this.look.container.position.set(pos.x, pos.y);
    this.look.Update(dt);
  }
}
