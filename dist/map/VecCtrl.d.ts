import type { Foothold } from './Foothold.js';
import type { MoveElement } from '../net/packet/MovePathEncoder.js';
export interface VecPos {
    x: number;
    y: number;
    prevX: number;
    prevY: number;
}
/** Position and velocity in CVecCtrl's foothold-relative coordinate space. */
export declare class RelPos {
    pos: number;
    v: number;
    SetFromAbsPos(pos: VecPos, fh: Foothold): void;
    SetFromAbsVelocity(vx: number, vy: number, fh: Foothold): void;
    SetFromRelPos(pos: VecPos, fh: Foothold): void;
    static From(pos: VecPos, vx: number, vy: number, fh: Foothold): RelPos;
}
export declare class MovePath {
    OriginX: number;
    OriginY: number;
    OriginVx: number;
    OriginVy: number;
    Elements: MoveElement[];
    LastAttrMask: number;
    LastStat: number;
    LastFhFallStart: number;
    LastOffset: {
        x: number;
        y: number;
    };
    CurrentAttr: number;
    CurrentElementIndex: number;
    private _elementIndex;
    private _elementElapsed;
    private _elapsedMs;
    private _elementsRef;
    Clear(): void;
    CalcPassivePos(x: number, y: number, vx: number, vy: number, fh: number, elapsedMs: number, resolveFh?: (id: number) => Foothold | null): {
        x: number;
        y: number;
        vx: number;
        vy: number;
        fh: number;
    };
    get IsComplete(): boolean;
    ResetProgress(): void;
    private _resetProgress;
}
export declare class VecCtrl {
    Pos: VecPos;
    Vx: number;
    Vy: number;
    Fh: Foothold | null;
    FhLeft: Foothold | null;
    FhRight: Foothold | null;
    FhId: number;
    MovePath: MovePath;
    MoveAction: number;
    IsFloating: boolean;
    IsFalling: boolean;
    IsJumping: boolean;
    IsOnLadder: boolean;
    IsOnRope: boolean;
    InputX: number;
    InputY: number;
    LadderOrRope: {
        x: number;
        y1: number;
        y2: number;
        upperFoothold?: boolean;
    } | null;
    protected _lastAttr: number;
    SetPos(x: number, y: number): void;
    SetV(vx: number, vy: number): void;
    SetInput(inputX: number, inputY: number): void;
    SetLadderOrRope(value: {
        x: number;
        y1: number;
        y2: number;
        upperFoothold?: boolean;
    } | null): void;
    SetFh(fhId: number, fh: Foothold | null, fhLeft: Foothold | null, fhRight: Foothold | null): void;
    SetMovePath(originX: number, originY: number, originVx: number, originVy: number, elements: MoveElement[]): void;
    BeginUpdateActive(): void;
    EndUpdateActive(): void;
    InspectUpdateActive(): void;
    WorkUpdateActive(dt: number, fhList: Foothold[]): void;
    WorkUpdatePassive(dt: number, elapsedMs: number, resolveFh?: (id: number) => Foothold | null): boolean;
    UpdateActive(dt: number, fhList: Foothold[]): void;
    UpdatePassive(dt: number, elapsedMs: number, resolveFh?: (id: number) => Foothold | null): boolean;
    protected _calcWalk(dt: number, _fhList: Foothold[]): void;
    protected _calcJump(dt: number): void;
    protected _calcFall(dt: number): void;
    protected _applyGravity(_dt: number): void;
    protected _resolveCollision(_dt: number, _fhList: Foothold[]): void;
    static CalcWalk(vx: number, vy: number, speed: number, force: number, drag: number, dt: number): {
        vx: number;
        vy: number;
    };
    static CalcFloat(vx: number, vy: number, gravity: number, maxFallSpeed: number, drag: number, dt: number): {
        vx: number;
        vy: number;
    };
}
//# sourceMappingURL=VecCtrl.d.ts.map