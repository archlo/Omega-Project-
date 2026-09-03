import { Container } from 'pixi.js';
import type { CharLook } from './CharLook.js';
export declare class BuffVisualOverlay {
    readonly container: Container<import("pixi.js").ContainerChild>;
    private _buffs;
    private _timer;
    constructor();
    Update(dt: number): void;
    /** Show/hide DarkSight visual — player becomes semi-transparent. */
    SetDarkSight(active: boolean, charLook: CharLook | null): void;
    /** Show/hide Stun visual — spinning stars above head. */
    SetStun(active: boolean): void;
    /** Show/hide Poison visual — green bubbles rising from character. */
    SetPoison(active: boolean): void;
    /** Show/hide Seal visual — X mark over character. */
    SetSeal(active: boolean): void;
    /** Show/hide HyperBody visual — character grows larger. */
    SetHyperBody(active: boolean, charLook: CharLook | null): void;
    /** Show/hide ShadowPartner visual — shadow clone behind character. */
    SetShadowPartner(active: boolean): void;
    /** Show/hide Booster visual — weapon glow effect. */
    SetBooster(active: boolean): void;
    /** Position buff visuals relative to character. */
    SetPosition(x: number, y: number, facingLeft: boolean): void;
    private _setBuff;
    private _removeBuff;
    private _animateBuff;
    private _drawStunStars;
    private _animateStunStars;
    private _drawStar;
    private _animatePoisonBubbles;
    private _drawSealX;
    private _animateSealX;
    private _drawShadowClone;
    private _animateShadowClone;
    private _drawWeaponGlow;
    private _animateWeaponGlow;
}
//# sourceMappingURL=BuffVisualOverlay.d.ts.map