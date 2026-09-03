import { Container } from 'pixi.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import { WzPackage } from '../wz/WzPackage.js';
export declare class DamageDigits {
    readonly container: Container<import("pixi.js").ContainerChild>;
    private _white;
    private _crit;
    private _miss;
    private _digitSprites;
    private _activeSlots;
    get LoadedWhite(): boolean;
    get LoadedCrit(): boolean;
    get LoadedMiss(): boolean;
    constructor(effectWz: WzPackage | null, loader: WzTextureLoader);
    /** Destroy every digit Sprite belonging to a slotKey that wasn't drawn
        this frame (the caller's damage-number entry expired/was removed).
        Call once per frame before the DrawNumber/DrawMiss calls for the
        surviving entries, with the set of still-live slotKeys — without this,
        every distinct damage number ever shown over a play session would leave
        its digit Sprites permanently allocated (just invisible) instead of
        reclaimed. */
    beginFrame(liveSlotKeys: ReadonlySet<string>): void;
    DrawNumber(slotKey: string, text: string, screenCenter: {
        x: number;
        y: number;
    }, alpha: number, crit: boolean): boolean;
    DrawMiss(slotKey: string, screenCenter: {
        x: number;
        y: number;
    }, alpha: number): boolean;
    private _digitSprite;
    private static _tryLoadDigits;
}
//# sourceMappingURL=DamageDigits.d.ts.map