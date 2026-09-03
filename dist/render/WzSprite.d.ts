import { Texture, Sprite } from 'pixi.js';
export declare class WzSprite {
    readonly Texture: Texture;
    readonly OriginX: number;
    readonly OriginY: number;
    readonly Lt: {
        x: number;
        y: number;
    } | null;
    readonly Rb: {
        x: number;
        y: number;
    } | null;
    constructor(Texture: Texture, OriginX?: number, OriginY?: number, Lt?: {
        x: number;
        y: number;
    } | null, Rb?: {
        x: number;
        y: number;
    } | null);
    private _pixi;
    private _lastFlipX;
    get width(): number;
    get height(): number;
    get Width(): number;
    get Height(): number;
    get x(): number;
    set x(v: number);
    get y(): number;
    set y(v: number);
    get visible(): boolean;
    set visible(v: boolean);
    ToPixi(flipX?: boolean): Sprite;
    /** Always creates a fresh Sprite (no cache). Use when the same WzSprite must appear in multiple containers simultaneously. */
    NewSprite(flipX?: boolean): Sprite;
}
//# sourceMappingURL=WzSprite.d.ts.map