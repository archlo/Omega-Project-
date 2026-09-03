import { Container } from 'pixi.js';
import { Stance } from './Stance.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import { WzPackage } from '../wz/WzPackage.js';
import { AvatarLook } from '../domain/AvatarLook.js';
export declare class CharLook {
    private _renderer;
    private _avatar;
    private _currentAction;
    private _frame;
    private _frameTimer;
    private _facingLeft;
    private _skinId;
    private _emotionId;
    private _emotionFrame;
    private _emotionFrameTimer;
    private _emotionDelays;
    private _oneTimeActionTimer;
    private _anchors;
    readonly container: Container<import("pixi.js").ContainerChild>;
    /** 5 OG-style layer containers: 0=UnderCharacter, 1=UnderFace, 2=Face,
        3=OverFace, 4=OverCharacter. */
    private readonly _layers;
    Position: {
        x: number;
        y: number;
    };
    FootholdId: number;
    ChairHeight: number;
    constructor(skinId?: number);
    get AvatarLook(): AvatarLook | null;
    get FacingLeft(): boolean;
    get NavelPosition(): {
        x: number;
        y: number;
    };
    get HeadPosition(): {
        x: number;
        y: number;
    };
    get BrowPosition(): {
        x: number;
        y: number;
    };
    get MuzzlePosition(): {
        x: number;
        y: number;
    };
    SetAvatar(look: AvatarLook | null): void;
    /** OG CAvatar::SetChairHeight (903A50.c) — maps specific chair item IDs to
     *  Y-offset values. Default 0 means no offset. */
    SetChairHeight(nItemID: number): void;
    Load(charWz: WzPackage | null, itemWz: WzPackage | null, baseWz: WzPackage | null, loader: WzTextureLoader): void;
    private static readonly FallbackActions;
    ActionExists(actionKey: string): boolean;
    SetStance(stance: Stance): void;
    StartAction(actionKey: string): void;
    Attack(): void;
    PickAttackAction(): string | null;
    PlayAttackAction(actionKey: string): void;
    PlayAttackCode(action: number): boolean;
    /** True while a one-shot action (attack/skill) is still playing — matches
     *  OG's `CAvatar::GetOneTimeAction() > -1` gate, which blocks stance-driven
     *  actions (walk/stand/jump) from overriding it until it naturally ends. */
    get IsPlayingOneTimeAction(): boolean;
    /** Plays `actionKey` once, blocking stance updates for its real WZ frame
     *  duration (sum of per-frame delays), then resumes normal stance-driven
     *  animation. Falls back to a flat 500ms if the action has no per-frame
     *  delay data (e.g. action not found in the WZ tree for this avatar). */
    PlayOneTimeAction(actionKey: string): void;
    private _actionDuration;
    SetEmotion(emotionId: number): void;
    UpdateFromPhysics(dt: number, stance: Stance, facingLeft: boolean): void;
    Update(dt: number, pos: {
        x: number;
        y: number;
    }, facingLeft: boolean, climbing: boolean): void;
    private _tickOneTimeAction;
    private _advanceEmotion;
    private _advanceFrame;
    private _getFrameDelay;
    Draw(camX: number, camY: number, cx: number, cy: number): void;
    /** Rebuilds the body sprites from the current action/frame without
        touching `container`'s position — for callers (OtherCharLook) that
        position the wrapper container themselves. */
    RebuildDisplay(): void;
    private _rebuildDisplay;
    private _addPlaceholder;
}
//# sourceMappingURL=CharLook.d.ts.map