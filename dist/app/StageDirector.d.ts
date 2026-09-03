import { Stage } from './Stage.js';
import { MapleClaudeGame } from '../MapleClaudeGame.js';
export declare class StageDirector {
    private _game;
    private _current;
    private _stack;
    get current(): Stage | null;
    constructor(game: MapleClaudeGame);
    replace(next: Stage): void;
    push(next: Stage): void;
    pop(): void;
    update(dt: number): void;
    draw(): void;
    onTextInput(character: string): void;
    onMouseButton(x: number, y: number, down: boolean, button: number): void;
    onMouseMove(x: number, y: number): void;
    onMouseWheel(x: number, y: number, deltaY: number): void;
    onKeyPress(key: string): void;
    onResize(windowW: number, windowH: number): void;
}
//# sourceMappingURL=StageDirector.d.ts.map