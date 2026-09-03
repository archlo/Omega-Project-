import { Container } from 'pixi.js';
import { WzSprite } from '../render/WzSprite.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import type { WzPackage } from '../wz/WzPackage.js';
import type { DecodedMovePath } from '../net/packet/MovePathDecoder.js';
import type { Foothold } from '../map/Foothold.js';
export declare class NpcLook {
    readonly NpcId: number;
    private _anims;
    private _state;
    private _frame;
    private _frameTimer;
    private _facingLeft;
    private _loaded;
    get Loaded(): boolean;
    private _speak;
    private readonly _replay;
    readonly container: Container<import("pixi.js").ContainerChild>;
    Position: {
        x: number;
        y: number;
    };
    Name: string;
    FuncName: string;
    ShowNameTag: boolean;
    ObjId: number;
    /** Last foothold serial supplied by the field packet. */
    FootholdId: number;
    /** OG CNpcTemplate data — category, shop ID, quest conditions */
    _info: {
        Category?: number;
        ShopId?: number;
    } | null;
    readonly HeadY = 10;
    /** World-space point at the top of the currently displayed NPC frame. */
    get HeadPosition(): {
        x: number;
        y: number;
    };
    /** OG: entity layer assignment — derived from foothold layer at spawn */
    Layer: number;
    private _bodySprite;
    private _placeholderGfx;
    private _nameTagContainer;
    private _nameText;
    private _funcText;
    private _lastState;
    private _lastFrame;
    private _lastFacing;
    constructor(NpcId: number);
    get NpcIdValue(): number;
    /** Returns the loaded animation map (key = animation name, value = frames) */
    get Animations(): Map<string, {
        sprite: WzSprite;
        delayMs: number;
    }[]>;
    /** Retry name/function resolution from String.wz. Safe to call multiple times. */
    LoadNames(textOf: (npcId: number, key: string) => string | undefined): void;
    Load(loader: WzTextureLoader, npcWz: WzPackage | null, textOf?: (npcId: number, key: string) => string | undefined): void;
    GetRandomSpeech(): string | null;
    private _collectStrings;
    Update(dt: number): void;
    ReplayMove(path: DecodedMovePath): void;
    SetFootholds(footholds: readonly Foothold[]): void;
    SetState(state: string): void;
    FaceLeft(left: boolean): void;
    /** World-space hit test against the current frame's sprite bounds (falls back to the 40x70 placeholder box). */
    HitTest(worldX: number, worldY: number): boolean;
    private _rebuildDisplay;
    drawFrameOnly(parent: Container, screenX: number, screenY: number, flip?: boolean): void;
    private _addPlaceholder;
    private _addNameTags;
    private _makeNameTag;
    private _drawSpeechBubble;
    private _loadFrame;
    /** OG CNpc::GetCurrentAction (0x670240) — returns current move action + direction */
    GetCurrentAction(pnDir?: {
        value: number;
    }): number;
    /** OG CNpc::SetActive (0x6710b0) — activates/deactivates NPC vector controller */
    SetActive(bActive: boolean): void;
    /** OG CNpc::SetLayerZ (0x66fed0) — z = 10 * (3000 * y - footholdY) - 1073711829 */
    SetLayerZ(footholdY?: number): void;
    /** OG CNpc::SetMoveAction (0x671280) — sets NPC move action from index */
    SetMoveAction(nMA: number, bReload: boolean): void;
    get CurrentAction(): number;
    /** OG CNpc::ViewOrHide (0x66fe00) — shows/hides NPC, DC mark, quest info, name tag */
    ViewOrHide(bView: boolean, bViewNameTag: boolean): void;
    /** OG CNpc::PrepareActionLayer (0x670580) — sets up action frame list and flip */
    PrepareActionLayer(): void;
    /** OG CNpc::OnChat (0x675520) — shows chat balloon above NPC */
    OnChat(chatIdx: number): void;
    /** OG CNpc::SetMapleTVMessage — sets MapleTV message from server */
    SetMapleTVMessage(_message?: string): void;
    /** OG CNpc::DrawMapleTVMessage — draws MapleTV message above NPC */
    DrawMapleTVMessage(): void;
    /** OG CNpc::SetQuestList (0x671980) — sets quest list from server */
    SetQuestList(bClear: boolean | number[]): void;
    /** OG CNpc::ShowQuestList (0x672b50) — renders quest icons above NPC */
    ShowQuestList(): void;
    /** OG CNpc::SetAcceptQuestOnlyOne (0x672010) — sets quest acceptance mode */
    SetAcceptQuestOnlyOne(nQuestId: number): void;
    /** OG CNpc::SetCompletedQuestOnlyOne (0x6724f0) — sets quest completion mode */
    SetCompletedQuestOnlyOne(nQuestId: number): void;
    /** Get quest list for external rendering (GameStage) */
    get QuestList(): number[];
    /** Whether quest info layer is visible */
    get QuestInfoVisible(): boolean;
    /** OG CNpc::GenerateMovePath — server-controlled, no-op on client */
    GenerateMovePath(_nAction: number, _nChatIdx: number): void;
    /** Maps actionIdx to WZ animation name (actionIdx-2 = array position) */
    _getActionName(actionIdx: number): string | null;
    /** OG CNpc::GetActionFrameList (0x670140) — returns frame list for action */
    GetActionFrameList(nAction: number): {
        sprite: WzSprite;
        delayMs: number;
    }[] | null;
    /** OG CNpc::IsOnPlayingOneTimeAction (0x670210) — checks if one-time action is playing */
    IsOnPlayingOneTimeAction(): boolean;
    /** OG CNpc::SetClientActionByQuest (0x671020) — sets client action by quest state */
    SetClientActionByQuest(): void;
    /** OG CNpc::OnSetSpecialAction (0x6750f0) — handles special action from server */
    OnSetSpecialAction(actionName: string): void;
    /** OG: SetBalloonOffset — special balloon offset for certain NPCs */
    SetBalloonOffset(x: number, y: number): void;
    /** OG CNpc::SetImitatedLook (0x6729d0) — sets NPC imitated appearance (player disguise) */
    SetImitatedLook(avatarLook?: unknown): void;
    /** OG CNpc::RestoreLayers (0x6751d0) — restores NPC visual layers after hide/show */
    RestoreLayers(): void;
    /** OG CNpc::OnUpdateLimitedInfo (0x676340) — toggles NPC enabled/disabled state */
    OnUpdateLimitedInfo(enabled: boolean): void;
    /** OG CNpc::RequestSpecialAction (0x673bc0) — sends special action request to server */
    RequestSpecialAction(actionName: string): void;
    /** OG CNpc::UpdateScript (0x66fd50) — updates NPC script state from system time */
    UpdateScript(_systemTime?: unknown): void;
    /** OG CNpc::GetShoeAttr — returns shoe attribute (field effect) */
    GetShoeAttr(): unknown;
    /** OG CNpc::SetShoeAttr (0x671180) — sets shoe attribute (field effect) */
    SetShoeAttr(attr?: unknown): void;
    /** OG CNpc::GetType — returns NPC type from template */
    GetType(): number;
    /** OG CNpc::GetZMass — returns Z mass for draw ordering */
    GetZMass(): number;
    /** OG CNpc::GetDCRange — returns DC (disconnect) range */
    GetDCRange(): {
        left: number;
        top: number;
        right: number;
        bottom: number;
    };
    /** OG CNpc::GetQuestDCRange — returns quest DC range */
    GetQuestDCRange(): {
        left: number;
        top: number;
        right: number;
        bottom: number;
    };
    /** OG CNpc::DoActionOrChat (0x6702b0) — randomly selects action or chat from template */
    DoActionOrChat(): {
        action: number;
        chatIdx: number;
    };
    private _waitTimeForNextAction;
    private _movePathSent;
    private _bHideToLocalUser;
    /** OG: m_bEnabled — NPC enabled state (0 = disabled, 1 = active) */
    private _bEnabled;
    /** OG: m_pImitatedLook — player-disguised NPC avatar (null = not imitated) */
    private _imitatedLook;
    /** OG: m_pPendingSpecialAction — pending special action request */
    private _pendingSpecialAction;
    /** OG: m_pShoeAttr — field shoe attribute (ice physics etc.) */
    private _shoeAttr;
    private _mapleTVMessage;
    private _questList;
    /** OG: m_bQuestInfoVisible — quest info layer visibility */
    private _questInfoVisible;
    /** OG: m_nAcceptQuestOnlyOne — restricts to one quest acceptance */
    private _acceptQuestOnlyOne;
    /** OG: m_nCompletedQuestOnlyOne — restricts to one quest completion */
    private _completedQuestOnlyOne;
    private _currentSpeech;
    private _tFrameDelay;
    private _nOneTimeAction;
    private _bSpecialAction;
    private _actionFrameIdx;
    /** OG: m_nMoveAction — stored move action value (>>1 = action index, &1 = direction) */
    private _nMoveAction;
    /** OG: m_nClientActionIdx — client action index for quest-based actions */
    private _nClientActionIdx;
    /** OG: m_ptBalloonOffset — balloon position offset (NPC 1300000 uses y=-20) */
    private _ptBalloonOffset;
    /** OG: template action names (e.g. "walk", "sit") — indexed by actionIdx-2 */
    private _actionNames;
    /** OG: per-action chat entries — key = actionIdx, value = chat string indices */
    private _actionChatMap;
    private _speechTimer;
    private _speechBg;
    private _speechLabel;
    /** OG: callback fired when DoActionOrChat picks an action — GameStage wires this to send NpcMoveRequest */
    onDoActionOrChat: ((objectId: number, action: number, chatIdx: number) => void) | null;
    private _readDelay;
    private _readDelayFromCanvas;
    private _readBool;
}
//# sourceMappingURL=NpcLook.d.ts.map