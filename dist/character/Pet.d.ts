import { Container } from 'pixi.js';
import { PetLook } from './PetLook.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import type { WzPackage } from '../wz/WzPackage.js';
import type { DecodedMovePath } from '../net/packet/MovePathDecoder.js';
import type { Foothold } from '../map/Foothold.js';
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
export interface PetCallbacks {
    /** CPet::DoAction sends opcode 200. */
    onPetAction: (petLockerSN: bigint, type: number, action: number, chat: string) => void;
    /** CPet::ParseCommand sends opcode 201. */
    onPetInteraction: (petLockerSN: bigint, hasName: boolean, interactionIdx: number) => void;
    /** CPet::SendDropPickUpRequest sends opcode 202. */
    onPetDropPickUp: (petLockerSN: bigint, x: number, y: number, dropId: number, cliCrc: number, pickupOthers: boolean, sweepForDrop: boolean, longRange: boolean) => void;
    /** CPet::SendUpdateExceptionListRequest sends opcode 204. */
    onPetExceptionList: (petLockerSN: bigint, itemIds: number[]) => void;
    /** CPet::UpdatePetAbility — reads combined dwPetAbilityFlag from pet equipment. */
    getEquipAbilityFlag: (petIdx: number) => number;
}
export declare class Pet {
    readonly look: PetLook;
    private _replay;
    private _ownerPos;
    private _ownerFacingLeft;
    Callbacks: PetCallbacks | null;
    /** Callback to play a WZ effect at the pet's position. Set by GameStage. */
    PlayEffectCallback: ((effectPath: string) => void) | null;
    /** Callback to display a message in the chat bar. Set by GameStage. */
    ChatMessageCallback: ((msg: string) => void) | null;
    readonly TemplateId: number;
    readonly OwnerCharId: number;
    PetIndex: number;
    LockerSN: bigint | null;
    ExceptionList: number[];
    TemplateName: string;
    TemplateMoveAbility: number;
    TemplateNameTag: number;
    TemplateChatBalloon: number;
    TemplatebPickUpItem: boolean;
    TemplatebConsumeHP: boolean;
    TemplatebConsumeMP: boolean;
    TemplatebSweepForDrop: boolean;
    TemplatebLongRange: boolean;
    TemplatebIgnorePickup: boolean;
    TemplatebRecall: boolean;
    TemplatebAutoSpeaking: boolean;
    TemplatebAutoReact: boolean;
    TemplatebInterActByUserAction: boolean;
    Tameness: number;
    Repleteness: number;
    PetAttribute: number;
    private _moveAction;
    private _restAction;
    private _oneTimeAction;
    private _actionFrames;
    private _posFrame;
    private _frameDelay;
    private _tStand;
    private _bRandomAction;
    private _bInteractionRequested;
    private _chatText;
    private _chatTimer;
    private _bPickupMeso;
    private _bPickupItem;
    private _bPickupOthers;
    private _bLongRange;
    private _bSweepForDrop;
    private _bConsumeHP;
    private _bConsumeMP;
    private _bIgnoreItems;
    private _bNameTag;
    private _bChatBalloon;
    private _bHangOnBack;
    private _tHangOnBack;
    private _bItemSoltChange;
    private _tItemSoltChange;
    private _bFirstPetAction;
    private _tLastPetAction;
    private _tAutoSpeakingTimer;
    PreviewState: boolean;
    private _additionalLayers;
    private _lastActionTime;
    private _positionContext;
    private _level;
    private _templateData;
    constructor(templateId: number, ownerCharId: number);
    get container(): Container;
    get Position(): {
        x: number;
        y: number;
    };
    set Position(v: {
        x: number;
        y: number;
    });
    Load(loader: WzTextureLoader, charWz: WzPackage | null, itemWz?: WzPackage | null): void;
    private _loadTemplateInfo;
    private _parseTemplateData;
    private _parseInteractionResponse;
    SetOwnerPosition(x: number, y: number, facingLeft: boolean): void;
    /** OG: CPet::OnLoadExceptionList (0x6a1510). */
    SetExceptionList(lockerSN: bigint, itemIds: number[]): void;
    /** OG: CPet::IsInExceptionListPet (0x69fca0). */
    IsInExceptionList(nItemID: number): boolean;
    GetLevel(): number;
    SetLevel(level: number): void;
    IsNamedPet(): boolean;
    IsInPickupForbiddenMap(currentMapId: number): boolean;
    CanPickupMeso(): boolean;
    CanPickupItem(): boolean;
    CanPickupOthers(): boolean;
    IsLongRange(): boolean;
    SweepForDrop(): boolean;
    CanConsumeHP(): boolean;
    CanConsumeMP(): boolean;
    ShouldIgnoreItems(): boolean;
    HasNameTag(): boolean;
    HasChatBalloon(): boolean;
    MoveAction2RawAction(nMA: number): {
        rawAction: number;
        dir: number;
    };
    private _getTemplateActionNo;
    SetMoveAction(nMA: number, bReload?: boolean): void;
    PrepareActionLayer(): void;
    DoAction(nType: number, nAction: number, chat: string, bSend: boolean, bChatBalloon: boolean, bIgnoreOnPlayingOneTimeAction?: boolean): void;
    DoActionByUserAction(nUserAction: number): boolean;
    ParseCommand(sChat: string): boolean;
    private _findInteractionIndex;
    ChatCommand(sContent: string): void;
    /** Check if chat text matches any slang word in the pet's template data. */
    _hasSlangReaction(text: string): boolean;
    CursedChatCommand(): void;
    RandomAction(): void;
    AutoSpeakingByRandom(): void;
    AutoSpeakingByEvent(nEvent: number): void;
    UpdatePetAbility(): void;
    BeginItemSoltChange(): void;
    SendDropPickUpRequest(x: number, y: number, dropId: number, cliCrc: number): boolean;
    SendUpdateExceptionListRequest(itemIds: number[]): void;
    OnAction(type: number, actionNo: number, chat: string, flag: number): void;
    OnActionCommand(nType: number, interactionIdx: number, successFlag: number): void;
    OnNameChanged(newName: string, showNameTag: boolean): void;
    OnValidateStat(newTameness: number, newRepleteness: number, newPetAttribute: number): void;
    PlayReaction(success: boolean): void;
    PlayAction(action: number): void;
    ReplayMove(path: DecodedMovePath): void;
    SetFootholds(footholds: readonly Foothold[]): void;
    SnapNearOwner(): void;
    SetPreviewState(): void;
    GetAdditionalLayer(index: number): {
        nData: number;
        nDataForRepeat: number;
        nEffIndex: number;
    };
    RemoveAdditionalLayer(index: number): void;
    ShowEffect(nType: number): void;
    SetSetItemEffect(nEffectID: number, nEffIndex: number): void;
    SetSetItemBackground(nEffIndex: number, bTeleport: boolean): void;
    HangOnBack(bHangOnBack: boolean, bForce?: boolean): void;
    SetAngryAction(): void;
    SetPositionContext(nPositionContext: number): void;
    GetBodyRect(): {
        left: number;
        top: number;
        right: number;
        bottom: number;
    } | null;
    private _manualTimer;
    Update(dt: number, currentMapId?: number): void;
}
//# sourceMappingURL=Pet.d.ts.map