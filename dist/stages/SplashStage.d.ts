import { Stage, MouseButton } from '../app/Stage.js';
export declare class SplashStage extends Stage {
    private _bg;
    private _titleText;
    private _promptText;
    private _timer;
    private _loading;
    private _loadContainer;
    private _bars;
    private _statusText;
    private _errorText;
    private _progress;
    constructor();
    onEnter(game: any): void;
    update(dt: number): void;
    draw(): void;
    onMouseButton(_x: number, _y: number, down: boolean, button: MouseButton): void;
    private _startLoading;
    private _redrawBar;
    private _loadAll;
}
//# sourceMappingURL=SplashStage.d.ts.map