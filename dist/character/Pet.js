import { PetLook } from './PetLook.js';
import { ActionMan } from './ActionMan.js';
import { RemoteMoveReplay } from './RemoteMoveReplay.js';
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
// Pet class — 1:1 OG CPet implementation
// ═══════════════════════════════════════════════════════════════════════════════
export class Pet {
    // ── Visual / rendering ───────────────────────────────────────────────────
    look;
    _replay = new RemoteMoveReplay();
    _ownerPos = { x: 0, y: 0 };
    _ownerFacingLeft = false;
    // ── Callbacks (wired by GameStage) ───────────────────────────────────────
    Callbacks = null;
    /** Callback to play a WZ effect at the pet's position. Set by GameStage. */
    PlayEffectCallback = null;
    /** Callback to display a message in the chat bar. Set by GameStage. */
    ChatMessageCallback = null;
    // ── OG: CPet fields ──────────────────────────────────────────────────────
    TemplateId;
    OwnerCharId;
    PetIndex = 0;
    LockerSN = null;
    ExceptionList = [];
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
    _moveAction = 1;
    _restAction = 1;
    _oneTimeAction = -1;
    // OG: animation frame tracking
    _actionFrames = [];
    _posFrame = 0;
    _frameDelay = 0;
    // OG: idle tracking
    _tStand = 0;
    _bRandomAction = false;
    _bInteractionRequested = false;
    // OG: chat balloon
    _chatText = '';
    _chatTimer = 0;
    // OG: ability flags (secure-fused in OG, plain bools here)
    _bPickupMeso = false;
    _bPickupItem = false;
    _bPickupOthers = false;
    _bLongRange = false;
    _bSweepForDrop = false;
    _bConsumeHP = false;
    _bConsumeMP = false;
    _bIgnoreItems = false;
    _bNameTag = true;
    _bChatBalloon = true;
    // OG: m_bHangOnBack / m_tHangOnBack
    _bHangOnBack = false;
    _tHangOnBack = 0;
    // OG: m_bItemSoltChange / m_tItemSoltChange
    _bItemSoltChange = false;
    _tItemSoltChange = 0;
    // OG: m_bFirstPetAction / m_tLastPetAction
    _bFirstPetAction = true;
    _tLastPetAction = 0;
    // OG: m_tAutoSpeakingTimer
    _tAutoSpeakingTimer = 0;
    // OG: m_bPreviewState
    PreviewState = false;
    // OG: additional layers (set item effects)
    _additionalLayers = [{ nData: 0, nDataForRepeat: -1, nEffIndex: 0 }, { nData: 0, nDataForRepeat: -1, nEffIndex: 0 }];
    // OG: m_DCClient (duration checker — anti-spam)
    _lastActionTime = 0;
    // OG: position context — affects follow offset (0=single, 1-5=multi-pet)
    _positionContext = 0;
    // OG: pet level from item slot (GW_ItemSlotPet._ZtlSecureTear_nLevel)
    _level = 1;
    // OG: CPetTemplate data loaded from Item.wz/Pet/{id}.img
    _templateData = null;
    constructor(templateId, ownerCharId) {
        this.TemplateId = templateId;
        this.OwnerCharId = ownerCharId;
        this.look = new PetLook(templateId);
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // Properties used by GameStage
    // ═══════════════════════════════════════════════════════════════════════════
    get container() { return this.look.container; }
    get Position() { return this.look.Position; }
    set Position(v) { this.look.Position = v; }
    // ═══════════════════════════════════════════════════════════════════════════
    // Loading
    // ═══════════════════════════════════════════════════════════════════════════
    Load(loader, charWz, itemWz) {
        this.look.Load(loader, charWz);
        this._loadTemplateInfo(itemWz ?? charWz);
    }
    _loadTemplateInfo(wz) {
        if (!wz)
            return;
        const strid = `Pet/${this.TemplateId.toString().padStart(8, '0')}.img`;
        const item = wz.GetItem(strid);
        if (!item)
            return;
        const root = (item && typeof item === 'object' && 'Root' in item) ? item.Root : null;
        if (!root || typeof root !== 'object')
            return;
        const rootObj = root;
        // info/ node — basic properties
        const infoNode = rootObj.info;
        if (infoNode && typeof infoNode === 'object') {
            const info = infoNode;
            if (typeof info.name === 'string')
                this.TemplateName = info.name;
            if (typeof info.moveAbility === 'number')
                this.TemplateMoveAbility = info.moveAbility;
            if (typeof info.nameTag === 'number')
                this.TemplateNameTag = info.nameTag;
            if (typeof info.chatBalloon === 'number')
                this.TemplateChatBalloon = info.chatBalloon;
            if (typeof info.bPickUpItem === 'boolean')
                this.TemplatebPickUpItem = info.bPickUpItem;
            if (typeof info.bConsumeHP === 'boolean')
                this.TemplatebConsumeHP = info.bConsumeHP;
            if (typeof info.bConsumeMP === 'boolean')
                this.TemplatebConsumeMP = info.bConsumeMP;
            if (typeof info.bSweepForDrop === 'boolean')
                this.TemplatebSweepForDrop = info.bSweepForDrop;
            if (typeof info.bLongRange === 'boolean')
                this.TemplatebLongRange = info.bLongRange;
            if (typeof info.bIgnorePickup === 'boolean')
                this.TemplatebIgnorePickup = info.bIgnorePickup;
            if (typeof info.bRecall === 'boolean')
                this.TemplatebRecall = info.bRecall;
            if (typeof info.bAutoSpeaking === 'boolean')
                this.TemplatebAutoSpeaking = info.bAutoSpeaking;
            if (typeof info.bAutoReact === 'boolean')
                this.TemplatebAutoReact = info.bAutoReact;
            if (typeof info.bInterActByUserAction === 'boolean')
                this.TemplatebInterActByUserAction = info.bInterActByUserAction;
        }
        // Parse interaction / food / slang / random / auto-speaking data
        this._templateData = this._parseTemplateData(rootObj);
    }
    _parseTemplateData(root) {
        const data = {
            interactions: [], foodReactions: [], slangReactions: [],
            randomReactions: [], autoSpeaking: [], autoSpeakingByEvent: [],
            actionMap: new Map(),
        };
        // Build action name → index map from WZ node names.
        // Known action node names in order (matches OG CPet::MoveAction2RawAction raw indices):
        // 0=walk/move, 1=stand1, 2=stand2, 3=sit/rest0, 4=fly, 5-7=ride1-3, 8=hang
        // Additional named actions (one-time): love, cry, eat, sleep, etc.
        // We scan the root for child nodes that are animation containers (have numbered children).
        const knownActions = {
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
                || key === 'randAction' || key === 'autoSpeaking' || key === 'autoSpeakingByEvent')
                continue;
            const node = root[key];
            if (!node || typeof node !== 'object')
                continue;
            // Check if it's an animation container (has '0' child or is a canvas)
            const obj = node;
            if ('0' in obj || 'origin' in obj) {
                if (knownActions[key] !== undefined) {
                    data.actionMap.set(key, knownActions[key]);
                }
                else if (!data.actionMap.has(key)) {
                    data.actionMap.set(key, nextIdx++);
                }
            }
        }
        // Ensure common aliases exist
        if (!data.actionMap.has('stand'))
            data.actionMap.set('stand', 1);
        if (!data.actionMap.has('walk1'))
            data.actionMap.set('walk1', 0);
        if (!data.actionMap.has('move1'))
            data.actionMap.set('move1', 0);
        // interact/ node — user chat command interactions (m_aInteraction)
        const interactNode = root.interact;
        if (interactNode && typeof interactNode === 'object') {
            const interactObj = interactNode;
            for (const key of Object.keys(interactObj)) {
                const entry = interactObj[key];
                if (!entry || typeof entry !== 'object')
                    continue;
                const e = entry;
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
            const foodObj = foodNode;
            for (const key of Object.keys(foodObj)) {
                const entry = foodObj[key];
                if (!entry || typeof entry !== 'object')
                    continue;
                const e = entry;
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
            const slangObj = slangNode;
            for (const key of Object.keys(slangObj)) {
                const entry = slangObj[key];
                if (!entry || typeof entry !== 'object')
                    continue;
                const e = entry;
                const act = typeof e.act === 'string' ? e.act : '';
                const words = [];
                for (let i = 0;; i++) {
                    const w = e[String(i)];
                    if (typeof w !== 'string')
                        break;
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
            const randObj = randNode;
            for (const key of Object.keys(randObj)) {
                const entry = randObj[key];
                if (!entry || typeof entry !== 'object')
                    continue;
                const e = entry;
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
            const autoObj = autoNode;
            for (const key of Object.keys(autoObj)) {
                const entry = autoObj[key];
                if (!entry || typeof entry !== 'object')
                    continue;
                const e = entry;
                const chat = [];
                for (let i = 0;; i++) {
                    const c = e[String(i)];
                    if (typeof c !== 'string')
                        break;
                    chat.push(c);
                }
                if (chat.length > 0)
                    data.autoSpeaking.push({ chat });
            }
        }
        // autoSpeakingByEvent/ node — event-triggered speech
        const eventNode = root.autoSpeakingByEvent;
        if (eventNode && typeof eventNode === 'object') {
            const eventObj = eventNode;
            for (const key of Object.keys(eventObj)) {
                const entry = eventObj[key];
                if (!entry || typeof entry !== 'object')
                    continue;
                const e = entry;
                const chat = [];
                for (let i = 0;; i++) {
                    const c = e[String(i)];
                    if (typeof c !== 'string')
                        break;
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
    _parseInteractionResponse(node) {
        const resp = { act: '', chat: [] };
        if (!node || typeof node !== 'object')
            return resp;
        const obj = node;
        // The response is an action entry container — look for numbered keys
        for (const key of Object.keys(obj)) {
            const actionEntry = obj[key];
            if (!actionEntry || typeof actionEntry !== 'object')
                continue;
            const ae = actionEntry;
            if (typeof ae.act === 'string')
                resp.act = ae.act;
            for (let i = 0;; i++) {
                const c = ae[String(i)];
                if (typeof c !== 'string')
                    break;
                resp.chat.push(c);
            }
            break; // only first action entry
        }
        return resp;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // Owner positioning
    // ═══════════════════════════════════════════════════════════════════════════
    SetOwnerPosition(x, y, facingLeft) {
        this._ownerPos = { x, y };
        this._ownerFacingLeft = facingLeft;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // Exception list
    // ═══════════════════════════════════════════════════════════════════════════
    /** OG: CPet::OnLoadExceptionList (0x6a1510). */
    SetExceptionList(lockerSN, itemIds) {
        if (this.LockerSN !== null && lockerSN !== this.LockerSN)
            return;
        this.ExceptionList = itemIds;
    }
    /** OG: CPet::IsInExceptionListPet (0x69fca0). */
    IsInExceptionList(nItemID) {
        return this.ExceptionList.includes(nItemID);
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // OG: CPet::GetLevel (0x6a0080) — reads from item slot
    // ═══════════════════════════════════════════════════════════════════════════
    GetLevel() {
        return this._level;
    }
    SetLevel(level) {
        this._level = level;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // OG: CPet::IsNamedPet (0x69feb0)
    // ═══════════════════════════════════════════════════════════════════════════
    IsNamedPet() {
        return this.look.Name !== this.TemplateName;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // OG: CPet::IsInPickupForbiddenMap (0x6a0220)
    // ═══════════════════════════════════════════════════════════════════════════
    IsInPickupForbiddenMap(currentMapId) {
        return currentMapId === FORBIDDEN_PICKUP_MAP;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // Ability flag getters (OG: CPet::CanPickupMeso/Item, IsLongRange, SweepForDrop)
    // ═══════════════════════════════════════════════════════════════════════════
    CanPickupMeso() { return this._bPickupMeso; }
    CanPickupItem() { return this._bPickupItem; }
    CanPickupOthers() { return this._bPickupOthers; }
    IsLongRange() { return this._bLongRange; }
    SweepForDrop() { return this._bSweepForDrop; }
    CanConsumeHP() { return this._bConsumeHP; }
    CanConsumeMP() { return this._bConsumeMP; }
    ShouldIgnoreItems() { return this._bIgnoreItems; }
    HasNameTag() { return this._bNameTag; }
    HasChatBalloon() { return this._bChatBalloon; }
    // ═══════════════════════════════════════════════════════════════════════════
    // OG: CPet::MoveAction2RawAction (0x6a0ff0)
    // ═══════════════════════════════════════════════════════════════════════════
    MoveAction2RawAction(nMA) {
        const dir = nMA & 1; // 0=right, 1=left
        const shifted = nMA >> 1;
        switch (shifted) {
            case 1 /* MoveShifted.Walk */: {
                if (!this.TemplatebInterActByUserAction)
                    return { rawAction: 0 /* RawAction.Idle */, dir };
                // OG: random move1-5 with 1/15 probability each, else idle
                const r = Math.floor(Math.random() * 15);
                if (r >= 1 && r <= 5) {
                    const actionNo = this._getTemplateActionNo(`move${r}`);
                    if (actionNo >= 0)
                        return { rawAction: actionNo, dir };
                }
                return { rawAction: 0 /* RawAction.Idle */, dir };
            }
            case 2 /* MoveShifted.Stand */:
            case 11: { // MoveShifted.Stand alternate
                if (this.TemplatebInterActByUserAction) {
                    const r = Math.floor(Math.random() * 15);
                    if (r >= 2 && r <= 6) {
                        const actionNo = this._getTemplateActionNo(`stand${r}`);
                        if (actionNo >= 0)
                            return { rawAction: actionNo, dir };
                    }
                    // Fallback: random stand1 or stand2
                    return { rawAction: (shifted === 2 ? 1 : 2), dir };
                }
                return { rawAction: (shifted === 2 ? 1 : 2), dir };
            }
            case 3 /* MoveShifted.Sit */:
                return { rawAction: 3 /* RawAction.Sit */, dir };
            case 6 /* MoveShifted.Fly */:
                return { rawAction: 4 /* RawAction.Fly */, dir };
            case 12 /* MoveShifted.Ride1 */:
                return { rawAction: 5 /* RawAction.Ride1 */, dir };
            case 13 /* MoveShifted.Ride2 */:
                return { rawAction: 6 /* RawAction.Ride2 */, dir };
            case 14 /* MoveShifted.Ride3 */:
                return { rawAction: 7 /* RawAction.Ride3 */, dir };
            case 15 /* MoveShifted.Hang */:
                return { rawAction: 8 /* RawAction.Hang */, dir };
            default:
                return { rawAction: 0 /* RawAction.Idle */, dir };
        }
    }
    _getTemplateActionNo(actionName) {
        if (!actionName)
            return -1;
        // Check the WZ action map first
        if (this._templateData) {
            const mapped = this._templateData.actionMap.get(actionName);
            if (mapped !== undefined)
                return mapped;
        }
        // Fallback: regex-based mapping for numbered variants
        const match = actionName.match(/^(stand|walk|move|sleep|sit|fly|ride|hang)(\d+)$/);
        if (!match)
            return -1;
        const base = match[1];
        const idx = parseInt(match[2], 10);
        switch (base) {
            case 'walk':
            case 'move': return 0;
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
    SetMoveAction(nMA, bReload = false) {
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
    PrepareActionLayer() {
        const { rawAction, dir } = this.MoveAction2RawAction(this._moveAction);
        const actionIdx = this._oneTimeAction > -1 ? this._oneTimeAction : rawAction;
        // Load action frames from ActionMan
        const frames = [];
        ActionMan.GetInstance().LoadPetAction(this.TemplateId, actionIdx, frames);
        if (frames.length === 0) {
            // Fallback: try stand action
            ActionMan.GetInstance().LoadPetAction(this.TemplateId, 2 /* RawAction.Stand */, frames);
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
    DoAction(nType, nAction, chat, bSend, bChatBalloon, bIgnoreOnPlayingOneTimeAction = false) {
        // Anti-spam: CDurationChecker::Validate
        const now = performance.now();
        if (!this._bFirstPetAction) {
            const elapsed = now - this._tLastPetAction;
            if (elapsed < 50)
                return; // too fast
        }
        this._tLastPetAction = now;
        this._bFirstPetAction = false;
        let action = nAction;
        // If on ladder/rope, force hang action
        // (In OG this checks CVecCtrl::IsOnLadder/IsOnRope — we approximate via move action)
        const isOnLadderOrRope = (this._moveAction >> 1) === 15 /* MoveShifted.Hang */;
        if (isOnLadderOrRope) {
            action = 8 /* RawAction.Hang */;
            this._restAction = 8 /* RawAction.Hang */;
        }
        else if (nAction >= 9) {
            // One-time action (>= 9 maps to named actions in the template)
            this._oneTimeAction = nAction;
            this.PrepareActionLayer();
        }
        else {
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
    DoActionByUserAction(nUserAction) {
        if (!this.TemplatebInterActByUserAction)
            return false;
        const { rawAction } = this.MoveAction2RawAction(this._moveAction);
        const currentAction = this._oneTimeAction > -1 ? this._oneTimeAction : rawAction;
        // Can't interrupt walk(0), sit(3), fly(4), or hang(8)
        if (currentAction === 0 || currentAction === 3 || currentAction === 4 || currentAction === 8) {
            return false;
        }
        // Can't interrupt sleep if sleeping
        if (currentAction === 5 && nUserAction !== 4)
            return false;
        // Map user action to pet action name
        let actionName;
        switch (nUserAction) {
            case 0:
                actionName = 'start';
                break;
            case 1:
                actionName = 'love';
                break;
            case 2:
                actionName = 'cry';
                break;
            case 3:
                actionName = 'question';
                break;
            case 4:
                actionName = 'love';
                break;
            case 5:
                actionName = 'angry';
                break;
            case 6:
                actionName = 'sleep';
                break;
            default: return false;
        }
        // If not sleep and idle > 5s, cap idle at 5s
        if (actionName !== 'sleep' && this._tStand > RANDOM_ACTION_THRESHOLD) {
            this._tStand = RANDOM_ACTION_THRESHOLD;
        }
        const actionNo = this._getTemplateActionNo(actionName);
        if (actionNo < 0)
            return false;
        this.DoAction(0, actionNo, '', true, true);
        return true;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // OG: CPet::ParseCommand (0x6a3cc0) — chat command parser
    // ═══════════════════════════════════════════════════════════════════════════
    ParseCommand(sChat) {
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
        if (interactionIdx < 0)
            return false;
        // Send interaction request
        if (this.LockerSN !== null) {
            this.Callbacks?.onPetInteraction(this.LockerSN, hasName, interactionIdx);
            this._bInteractionRequested = true;
        }
        return true;
    }
    _findInteractionIndex(command) {
        if (!this._templateData)
            return -1;
        const level = this.GetLevel();
        for (let i = 0; i < this._templateData.interactions.length; i++) {
            const inter = this._templateData.interactions[i];
            if (inter.command !== command)
                continue;
            if (level < inter.levelMin || level > inter.levelMax)
                continue;
            return i;
        }
        return -1;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // OG: CPet::ChatCommand (0x6a4020)
    // ═══════════════════════════════════════════════════════════════════════════
    ChatCommand(sContent) {
        this.UpdatePetAbility();
        if (this.GetLevel() >= 15) {
            this.DoAction(2, 0, sContent, true, this._bChatBalloon, true);
        }
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // OG: CPet::CursedChatCommand (0x6a4080)
    // ═══════════════════════════════════════════════════════════════════════════
    /** Check if chat text matches any slang word in the pet's template data. */
    _hasSlangReaction(text) {
        if (!this._templateData)
            return false;
        const level = this.GetLevel();
        const lower = text.toLowerCase();
        for (const slang of this._templateData.slangReactions) {
            if (level < slang.levelMin || level > slang.levelMax)
                continue;
            for (const word of slang.words) {
                if (lower.includes(word.toLowerCase()))
                    return true;
            }
        }
        return false;
    }
    CursedChatCommand() {
        // Look up slang reaction from template
        if (this._templateData && this._templateData.slangReactions.length > 0) {
            const level = this.GetLevel();
            for (const slang of this._templateData.slangReactions) {
                if (level < slang.levelMin || level > slang.levelMax)
                    continue;
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
    RandomAction() {
        if (this._bRandomAction)
            return;
        // Use WZ random reaction table if available
        if (this._templateData && this._templateData.randomReactions.length > 0) {
            const level = this.GetLevel();
            const eligible = this._templateData.randomReactions.filter(r => level >= r.levelMin && level <= r.levelMax);
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
    AutoSpeakingByRandom() {
        if (!this.TemplatebAutoSpeaking)
            return;
        if (!this._templateData || this._templateData.autoSpeaking.length === 0)
            return;
        const entry = this._templateData.autoSpeaking[Math.floor(Math.random() * this._templateData.autoSpeaking.length)];
        if (entry.chat.length > 0) {
            const chat = entry.chat[Math.floor(Math.random() * entry.chat.length)];
            this.DoAction(2, 0, chat, true, this._bChatBalloon);
        }
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // OG: CPet::AutoSpeakingByEvent (0x6a18a0)
    // ═══════════════════════════════════════════════════════════════════════════
    AutoSpeakingByEvent(nEvent) {
        if (!this._templateData || nEvent < 0 || nEvent >= this._templateData.autoSpeakingByEvent.length)
            return;
        const entry = this._templateData.autoSpeakingByEvent[nEvent];
        if (entry.act) {
            const actionNo = this._getTemplateActionNo(entry.act);
            if (actionNo >= 0) {
                const chat = entry.chat.length > 0
                    ? entry.chat[Math.floor(Math.random() * entry.chat.length)] : '';
                this.DoAction(3, actionNo, chat, true, this._bChatBalloon);
            }
        }
        else if (entry.chat.length > 0) {
            const chat = entry.chat[Math.floor(Math.random() * entry.chat.length)];
            this.DoAction(2, 0, chat, true, this._bChatBalloon);
        }
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // OG: CPet::UpdatePetAbility (0x6a0a40)
    // ═══════════════════════════════════════════════════════════════════════════
    UpdatePetAbility() {
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
    BeginItemSoltChange() {
        this._bItemSoltChange = true;
        this._tItemSoltChange = performance.now();
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // OG: CPet::SendDropPickUpRequest (0x6a0820)
    // ═══════════════════════════════════════════════════════════════════════════
    SendDropPickUpRequest(x, y, dropId, cliCrc) {
        // Cooldown check
        if (this._bItemSoltChange && performance.now() - this._tItemSoltChange >= ITEM_SLOT_CHANGE_COOLDOWN) {
            return false;
        }
        if (this.LockerSN === null)
            return false;
        this.Callbacks?.onPetDropPickUp(this.LockerSN, x, y, dropId, cliCrc, this._bPickupOthers, this._bSweepForDrop, this._bLongRange);
        return true;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // OG: CPet::SendUpdateExceptionListRequest (0x6a0dd0)
    // ═══════════════════════════════════════════════════════════════════════════
    SendUpdateExceptionListRequest(itemIds) {
        if (this.LockerSN === null)
            return;
        this.Callbacks?.onPetExceptionList(this.LockerSN, itemIds);
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // OG: CPet::OnAction (0x6a3860) — server→client action
    // ═══════════════════════════════════════════════════════════════════════════
    OnAction(type, actionNo, chat, flag) {
        this.DoAction(type, actionNo, chat, false, flag !== 0);
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // OG: CPet::OnActionCommand (0x6a3930) — server→client interaction result
    // ═══════════════════════════════════════════════════════════════════════════
    OnActionCommand(nType, interactionIdx, successFlag) {
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
    OnNameChanged(newName, showNameTag) {
        this.look.Name = newName;
        this._bNameTag = showNameTag;
        this.look.ShowNameTag = showNameTag;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // OG: CPet::OnValidateStat (0x6a12e0)
    // ═══════════════════════════════════════════════════════════════════════════
    OnValidateStat(newTameness, newRepleteness, newPetAttribute) {
        const oldTameness = this.Tameness;
        this.Tameness = newTameness;
        this.Repleteness = newRepleteness;
        this.PetAttribute = newPetAttribute;
        this.UpdatePetAbility();
        // OG: show screen message if tameness changed (StringPool 394/395)
        if (newTameness !== oldTameness) {
            const msg = newTameness > oldTameness
                ? 'Your pet\'s tameness has increased.' // StringPool 394
                : 'Your pet\'s tameness has decreased.'; // StringPool 395
            this._chatText = msg;
            this._chatTimer = 3;
            this.look.Say(msg, 3);
        }
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // Reaction plays (used by GameStage for server-triggered reactions)
    // ═══════════════════════════════════════════════════════════════════════════
    PlayReaction(success) {
        this.look.PlayAction(success ? 1 : 0);
        this._manualTimer = 0.6;
    }
    PlayAction(action) {
        this.look.PlayAction(action);
        this._manualTimer = 0.6;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // Move replay (from server move packets)
    // ═══════════════════════════════════════════════════════════════════════════
    ReplayMove(path) {
        this._replay.SetPath(path, this.Position);
        this.look.SetState('walk');
    }
    SetFootholds(footholds) { this._replay.SetFootholds(footholds); }
    // ═══════════════════════════════════════════════════════════════════════════
    // Snap near owner (fallback when no move path)
    // ═══════════════════════════════════════════════════════════════════════════
    SnapNearOwner() {
        // OG: position context offsets for multi-pet follow.
        // ctx 0 (single): center, ctx 1: left, ctx 2: right,
        // ctx 3: far left, ctx 4: far right, ctx 5: center (3rd pet)
        const offsets = {
            0: { dx: -32, dy: 0 }, // single: left of owner
            1: { dx: -40, dy: 0 }, // 2-pet slot 0: left
            2: { dx: 40, dy: 0 }, // 2-pet slot 1: right
            3: { dx: -50, dy: 0 }, // 3-pet slot 1: far left
            4: { dx: 50, dy: 0 }, // 3-pet slot 2: far right
            5: { dx: -32, dy: 0 }, // 3-pet slot 0: center-left
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
    SetPreviewState() {
        this.PreviewState = true;
        this.look.Say(this.TemplateName, 9999);
        this.look.Name = this.TemplateName;
        this.look.ShowNameTag = true;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // Additional layer management (set item effects)
    // ═══════════════════════════════════════════════════════════════════════════
    GetAdditionalLayer(index) {
        return this._additionalLayers[index] ?? { nData: 0, nDataForRepeat: -1, nEffIndex: 0 };
    }
    RemoveAdditionalLayer(index) {
        if (this._additionalLayers[index]) {
            this._additionalLayers[index] = { nData: 0, nDataForRepeat: -1, nEffIndex: 0 };
        }
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // ShowEffect (OG: CPet::ShowEffect 0x52e920 / 0x6a2050)
    // ═══════════════════════════════════════════════════════════════════════════
    ShowEffect(nType) {
        // OG: pet effects from Effect.wz/PetEff.img/{petId}/{type}
        // nType maps to effect sub-nodes (e.g., 0=warp, 1=levelup, etc.)
        const effectPaths = {
            0: `PetEff.img/${this.TemplateId}/warp`,
            1: `PetEff.img/Basic/LevelUp`,
            2: `PetEff.img/Basic/Teleport`,
        };
        const path = effectPaths[nType];
        if (path)
            this.PlayEffectCallback?.(path);
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // SetSetItemEffect / SetSetItemBackground
    // ═══════════════════════════════════════════════════════════════════════════
    SetSetItemEffect(nEffectID, nEffIndex) {
        // Set-item glow effect — store in additional layers for rendering
        if (nEffIndex >= 0 && nEffIndex < this._additionalLayers.length) {
            this._additionalLayers[nEffIndex] = { nData: nEffectID, nDataForRepeat: -1, nEffIndex };
        }
    }
    SetSetItemBackground(nEffIndex, bTeleport) {
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
    HangOnBack(bHangOnBack, bForce = false) {
        if (!bForce && this._bHangOnBack === bHangOnBack)
            return;
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
    SetAngryAction() {
        this.DoActionByUserAction(5); // angry
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // SetPositionContext (OG: CPet::SetPositionContext 0x69fc10)
    // ═══════════════════════════════════════════════════════════════════════════
    SetPositionContext(nPositionContext) {
        this._positionContext = nPositionContext;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // GetBodyRect (OG: CPet::GetBodyRect 0x6a1ac0)
    // ═══════════════════════════════════════════════════════════════════════════
    GetBodyRect() {
        if (this._actionFrames.length === 0)
            return null;
        const frame = this._actionFrames[Math.min(this._posFrame, this._actionFrames.length - 1)];
        if (!frame)
            return null;
        const { left, top, right, bottom } = frame.bodyRect;
        if (left === 0 && top === 0 && right === 0 && bottom === 0)
            return null;
        return { left, top, right, bottom };
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // Update (OG: CPet::Update 0x6a4980) — called every 30ms tick
    // ═══════════════════════════════════════════════════════════════════════════
    _manualTimer = 0;
    Update(dt, currentMapId) {
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
                    }
                    else {
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
        }
        else {
            this._restAction = 1;
            this._tStand = 0;
            this._bRandomAction = false;
        }
        // Idle behavior
        if (this._tStand > SLEEP_ACTION_THRESHOLD) {
            // Force sleep action
            this.DoActionByUserAction(6);
        }
        else if (this._tStand > RANDOM_ACTION_THRESHOLD) {
            // Random action chance
            if (!this._bRandomAction && Math.random() < 0.5) {
                this.RandomAction();
                this._bRandomAction = true;
            }
            else {
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
        }
        else {
            // Pick stand animation based on current action
            const { rawAction } = this.MoveAction2RawAction(this._moveAction);
            if (rawAction === 3 /* RawAction.Sit */) {
                this.look.SetState('sit');
            }
            else if (rawAction === 4 /* RawAction.Fly */) {
                this.look.SetState('fly');
            }
            else {
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
//# sourceMappingURL=Pet.js.map