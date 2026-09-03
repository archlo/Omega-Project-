import { Container } from 'pixi.js';
import { MapleClaudeGame } from '../MapleClaudeGame.js';
export declare enum MouseButton {
    Left = 0,
    Right = 1,
    Middle = 2
}
export declare abstract class Stage {
    protected game: MapleClaudeGame;
    /** Full-width layer — FieldScene goes here; empty for pre-game stages. */
    readonly mapRoot: Container<import("pixi.js").ContainerChild>;
    /** 800-px frame layer — all UI elements go here; coords are frame-relative. */
    readonly uiRoot: Container<import("pixi.js").ContainerChild>;
    private _frameMuteButton;
    private _frameMuteFont;
    get stageDirector(): import("./StageDirector.js").StageDirector;
    onEnter(game: MapleClaudeGame): void;
    onExit(): void;
    update(dt: number): void;
    abstract draw(): void;
    /** Lazily creates a MuteButton backed by the persistent audio player. Call once per
        frame from a framed login stage's draw, right after the frame sprite is drawn.
        State is shared with the audio player so the toggle persists across stages.
        The viewW/viewH arguments are the 800-px frame dimensions (always 800×600). */
    protected drawFrameMuteButton(viewW?: number, viewH?: number): void;
    onTextInput(character: string): void;
    onMouseButton(x: number, y: number, down: boolean, button: MouseButton): void;
    onMouseMove(x: number, y: number): void;
    onMouseWheel(x: number, y: number, deltaY: number): void;
    onKeyPress(key: string): void;
    onResize(windowW: number, windowH: number): void;
}
//# sourceMappingURL=Stage.d.ts.map