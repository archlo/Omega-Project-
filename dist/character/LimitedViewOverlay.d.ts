import { Container } from 'pixi.js';
export declare class LimitedViewOverlay {
    readonly container: Container<import("pixi.js").ContainerChild>;
    private readonly _overlay;
    private _screenW;
    private _screenH;
    constructor();
    onResize(w: number, h: number): void;
    hide(): void;
    draw(points: {
        x: number;
        y: number;
    }[]): void;
}
//# sourceMappingURL=LimitedViewOverlay.d.ts.map