import { Container } from 'pixi.js';
import { WzSprite } from '../render/WzSprite.js';
export declare class DropSprite {
    readonly DropId: number;
    readonly IsMoney: boolean;
    readonly ItemIdOrAmount: number;
    readonly container: Container<import("pixi.js").ContainerChild>;
    Position: {
        x: number;
        y: number;
    };
    Layer: number;
    private static readonly Vy;
    private _source;
    private _ground;
    private _tEnd;
    private _icon;
    private _state;
    private _tick;
    private _angle;
    private _absorbing;
    private _absorbFrom;
    private _absorbTarget;
    private _absorbT;
    private _alpha;
    private static readonly AbsorbDur;
    Finished: boolean;
    nameOf: (id: number) => string;
    constructor(DropId: number, IsMoney: boolean, ItemIdOrAmount: number, source: {
        x: number;
        y: number;
    }, ground: {
        x: number;
        y: number;
    }, animated: boolean, icon?: WzSprite | null, font?: unknown);
    StartAbsorb(target: () => {
        x: number;
        y: number;
    }): void;
    private _parabolicDuration;
    Update(dt: number): void;
    draw(camX: number, camY: number, cx: number, cy: number): void;
    private _rebuildDisplay;
}
//# sourceMappingURL=DropSprite.d.ts.map