import { Container } from 'pixi.js';
export declare class FearEffect {
    readonly container: Container;
    private _overlay;
    private _active;
    private _screenW;
    private _screenH;
    constructor();
    get active(): boolean;
    onResize(w: number, h: number): void;
    show(playerScreenX: number, playerScreenY: number): void;
    hide(): void;
    update(playerScreenX: number, playerScreenY: number): void;
    private _px;
    private _py;
    private _redraw;
}
//# sourceMappingURL=FearEffect.d.ts.map