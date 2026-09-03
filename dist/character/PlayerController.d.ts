import { Stance } from './Stance.js';
import type { PlayerInput } from './PlayerInput.js';
import type { FieldScene } from '../map/FieldScene.js';
import type { Foothold } from '../map/Foothold.js';
export declare class PlayerController {
    private static readonly BaseWalkSpeed;
    private static readonly WalkForce;
    private static readonly WalkDrag;
    private static readonly BaseJumpSpeed;
    private static readonly Gravity;
    private static readonly MaxFallSpeed;
    private static readonly FlyForce;
    private static readonly FlySpeed;
    private static readonly SwimForce;
    private static readonly SwimSpeed;
    private static readonly FloatDrag;
    private static readonly FloatDrag2;
    private static readonly FloatCoefficient;
    private static readonly BodyHeight;
    private static readonly ClimbSpeed;
    private static readonly FlushSeconds;
    private static readonly MaxElements;
    private static readonly FallDamageThreshold;
    private static readonly FallDamagePerPx;
    private static readonly WalkSlant;
    private static readonly SlipForce;
    private static readonly SlipSpeed;
    private static accSpeed;
    private static decSpeed;
    private _field;
    private _velocity;
    private _grounded;
    private _wasGrounded;
    private _currentFoothold;
    private _landingNext;
    private _fallZMass;
    private _fallStartFoothold;
    private _fallOffset;
    private _trackedFhId;
    private _trackedFhOffset;
    private _footholdPos;
    private _lastFhX1;
    private _lastFhY1;
    private _lastFootholdId;
    private _staggerTimer;
    private _shortDragTimer;
    private _shortDragForce;
    private _climb;
    private _climbGrabFrame;
    private _animTimer;
    private _flushTimer;
    private _pending;
    private _movePathAttribute;
    private _lastSyncPos;
    private _lastSyncVel;
    private _lastSyncStance;
    private _prevJump;
    private _fallStartY;
    private _freeFallElapsedMs;
    private _walkSpeed;
    private _jumpSpeed;
    private _shoe;
    private get _physics();
    private _distanceAlongFoothold;
    private _projectVelocity;
    Position: {
        x: number;
        y: number;
    };
    Stance: Stance;
    Frame: number;
    FacingLeft: boolean;
    ClimbMoving: boolean;
    WeaponStand: number;
    WeaponWalk: number;
    private _isSitting;
    get IsSitting(): boolean;
    Sit(x: number, y: number): void;
    StandUp(): void;
    onTakeFallDamage: ((damage: number) => void) | null;
    onAttachedObjectChanged: ((footholdId: number, ladder: boolean) => void) | null;
    private _isStunned;
    private _knockbackStun;
    private _isPreparingSkill;
    private _preparingSkillId;
    private _repeatSkillId;
    private _isAttract;
    private _directionMode;
    private _userFlying;
    private _ladderActionBlocked;
    private _vehicleActive;
    private _oneTimeAction;
    private _mechanicMode;
    private _morphTemplateId;
    private _ridingVehicle;
    get Grounded(): boolean;
    get CurrentFoothold(): number;
    set CurrentFoothold(v: number);
    get IsStaggered(): boolean;
    get Climb(): LadderOrRope | null;
    SetUserFlying(value: boolean): void;
    SetOneTimeAction(action: number): void;
    SetMechanicMode(mode: number): void;
    SetMorphed(templateId: number): void;
    SetRidingVehicle(vehicleId: number): void;
    SetReservedLandingFoothold(id: number): void;
    SetLadderRestrictions(restrictions: {
        actionBlocked?: boolean;
        vehicleActive?: boolean;
        oneTimeAction?: number;
        mechanicMode?: number;
        morphTemplateId?: number;
        ridingVehicle?: number;
        repeatSkillId?: number;
        userFlying?: boolean;
    }): void;
    /** CVecCtrlUser::IsAbleToClimbLadderOrRope restrictions. */
    CanClimbLadderOrRope(): boolean;
    private _notifyAttached;
    get IsImmovable(): boolean;
    get IsPreparingSkill(): boolean;
    get PreparingSkillId(): number;
    get RepeatSkillId(): number;
    get IsAttract(): boolean;
    get DirectionMode(): boolean;
    SetStunned(v: boolean): void;
    SetKnockbackStun(v: boolean): void;
    SetPreparingSkill(skillId: number): void;
    SetRepeatSkill(skillId: number): void;
    SetAttract(v: boolean): void;
    SetDirectionMode(v: boolean): void;
    constructor(field: FieldScene);
    SetStats(speedPct: number, jumpPct: number): void;
    SetShoePhysics(values: Partial<ShoePhysics>): void;
    Spawn(pos: {
        x: number;
        y: number;
    }): void;
    ApplyKnockback(vx: number, vy: number, staggerSec?: number): void;
    StopWalking(): void;
    Update(input: PlayerInput, dt: number): void;
    private _tickAnimAndFlush;
    private _applyFallDamage;
    private _walkOnFoothold;
    private _fallFreely;
    private _clampToBounds;
    private _tryRescueIfBelowMap;
    private _tryGrabLadder;
    private _updateClimb;
    private _leaveLadderOntoGround;
    private _appendNormal;
    /** OG: CVecCtrl::IsFalling — checks if falling (no foothold and vy > 0) */
    IsFalling(): boolean;
    /** OG: CVecCtrl::IsFreeFalling — checks if free falling */
    IsFreeFalling(): boolean;
    /** OG: CVecCtrl::IsOnLadder — checks if on ladder */
    IsOnLadder(): boolean;
    /** OG: CVecCtrl::IsOnRope — checks if on rope */
    IsOnRope(): boolean;
    /** OG: CVecCtrl::DetachFromFoothold — detaches from current foothold */
    DetachFromFoothold(): void;
    /** OG: CVecCtrl::MakeContinuousMovePath — records continuous move path */
    MakeContinuousMovePath(_tElapse: number): void;
    /** OG: CVecCtrl::FallDown — handles fall down */
    FallDown(): void;
    /** OG: CVecCtrl::Wings — handles wings activation */
    Wings(): void;
    /** OG: CVecCtrl::MakeNewMovePathElem — creates new move path element */
    MakeNewMovePathElem(): void;
    /** OG: CVecCtrl::SetActive — sets controller active state */
    SetActive(_bActive: boolean): void;
    /** OG: CVecCtrl::WorkUpdateActive — main update loop */
    WorkUpdateActive(_dt: number): boolean;
    /** OG: CVecCtrl::IsOnFoothold — checks if on a foothold */
    IsOnFoothold(): boolean;
    /** OG: CVecCtrl::CollisionDetectFloat (0x994740) — segment-crossing collision
     *  detection during freefall. Checks if the movement path from current position
     *  to new position crosses any foothold line segment. If it does, snaps to the
     *  earliest crossing point and lands on that foothold.
     *
     *  The OG version is ~450 lines of C++ with cross-product candidate tracking,
     *  reserved-foothold landing, z-mass page filtering, and velocity projection.
     *  This is a simplified but functionally equivalent version that handles the
     *  critical case: thin platforms and angled footholds during fast diagonal movement. */
    CollisionDetectFloat(newX: number, newY: number): {
        x: number;
        y: number;
        fh: Foothold | null;
        landed: boolean;
        blocked?: boolean;
        tangentVx?: number;
        tangentVy?: number;
    };
    /** OG: CVecCtrl::JustJump — just jumped (internal) */
    JustJump(): boolean;
    /** OG: CVecCtrl::SetMovePathAttribute — sets move path attribute (internal) */
    SetMovePathAttribute(attr: number): void;
    /** OG: CVecCtrl::DiscardByInterrupt — discards move path by interrupt (internal) */
    DiscardByInterrupt(): void;
    private _hasChangedSinceSync;
    private _applyMovingFootholdOffset;
    TryFlushMovePath(): Uint8Array | null;
}
interface LadderOrRope {
    X: number;
    Top: number;
    Bottom: number;
    IsLadder: boolean;
    UpperFoothold: boolean;
}
interface ShoePhysics {
    mass: number;
    walkAcc: number;
    walkDrag: number;
    walkSpeed: number;
    walkSlant: number;
    swimSpeedMultiplier: number;
}
export {};
//# sourceMappingURL=PlayerController.d.ts.map