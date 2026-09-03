import { VecCtrl } from './VecCtrl.js';
import type { Foothold } from './Foothold.js';
export declare class VecCtrlUser extends VecCtrl {
    LadderSpeed: number;
    IsClimbing: boolean;
    IsSwimming: boolean;
    SwimSpeedMultiplier: number;
    private _fhOffset;
    private static readonly WalkSpeed;
    private static readonly WalkForce;
    private static readonly WalkDrag;
    private static readonly JumpSpeed;
    private static readonly Gravity;
    private static readonly MaxFallSpeed;
    WorkUpdateActiveLadderOrRope(dt: number): void;
    IsUp: boolean;
    IsDown: boolean;
    SetSwimming(value: boolean, speedMultiplier?: number): void;
    WorkUpdatePassive(dt: number, elapsedMs: number, resolveFh?: (id: number) => Foothold | null): boolean;
    WorkUpdateActive(dt: number, fhList: any[]): void;
    private _walkRelative;
    private IsOnFoothold;
    private static _swimAxis;
    private static _swimVertical;
    private static _dec;
}
//# sourceMappingURL=VecCtrlUser.d.ts.map