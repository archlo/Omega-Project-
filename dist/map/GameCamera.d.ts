export declare class GameCamera {
    Position: {
        x: number;
        y: number;
    };
    Target: {
        x: number;
        y: number;
    };
    MapBounds: {
        left: number;
        top: number;
        right: number;
        bottom: number;
    };
    ViewWidth: number;
    ViewHeight: number;
    FollowSpeed: number;
    private _shakeIntensity;
    private _shakeRemainingMs;
    private _shakeTotalMs;
    private _shakeOffset;
    constructor(startPosition?: {
        x: number;
        y: number;
    });
    /** OG: FieldEffect subType 1 / CUserRemote::OnAttack's per-skill tremble
        calls -> CAnimationDisplayer::Effect_Tremble(force, intensity,
        durationMs, ...). `intensity` scales the random jitter radius (px);
        decays linearly to 0 over `durationMs`. */
    Shake(intensity: number, durationMs: number): void;
    Update(deltaTime: number): void;
    private _updateShake;
    private _clamp;
    WorldToScreen(worldX: number, worldY: number): {
        x: number;
        y: number;
    };
    ScreenToWorld(screenX: number, screenY: number): {
        x: number;
        y: number;
    };
    IsVisible(worldRect: {
        x: number;
        y: number;
        w: number;
        h: number;
    }, margin?: number): boolean;
}
//# sourceMappingURL=GameCamera.d.ts.map