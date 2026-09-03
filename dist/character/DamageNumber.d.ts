import { Container } from 'pixi.js';
import { DamageDigits } from '../ui/DamageDigits.js';
export declare enum DamageKind {
    DamageNormal = 0,
    DamageCrit = 1,
    DamageMiss = 2,
    HealHp = 3,
    HealMp = 4,
    MobDamage = 5,
    Exp = 6
}
export declare class DamageNumber {
    private static readonly RiseDuration;
    private static readonly FadeDuration;
    private static readonly TotalLife;
    readonly container: Container<import("pixi.js").ContainerChild>;
    private _digits;
    private _entries;
    private _nextId;
    private _fallbackTexts;
    /** Pass a DamageDigits (loaded from Effect.wz) to render multi-digit damage using
        the v95 white-outlined damage-skin sprites. Falls back to text when unavailable. */
    setDamageDigits(digits: DamageDigits | null): void;
    Add(value: number, worldX: number, worldY: number, kind?: DamageKind, hitIndex?: number): void;
    AddMiss(worldX: number, worldY: number): void;
    Update(dt: number): void;
    RebuildDisplay(worldToScreen: (wx: number, wy: number) => {
        x: number;
        y: number;
    }): void;
}
//# sourceMappingURL=DamageNumber.d.ts.map