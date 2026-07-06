import { Stage } from './Stage.js';
import { MapleClaudeGame } from '../MapleClaudeGame.js';

export class StageDirector {
  private _game: MapleClaudeGame;
  private _current: Stage | null = null;
  private _stack: Stage[] = [];

  get current(): Stage | null { return this._current; }

  constructor(game: MapleClaudeGame) {
    this._game = game;
  }

  replace(next: Stage): void {
    this._current?.onExit();
    this._current = next;
    this._current.onEnter(this._game);
  }

  push(next: Stage): void {
    if (this._current) this._stack.push(this._current);
    this._current = next;
    this._current.onEnter(this._game);
  }

  pop(): void {
    this._current?.onExit();
    this._current = this._stack.pop() ?? null;
  }

  update(dt: number): void {
    this._current?.update(dt);
  }

  draw(): void {
    this._current?.draw();
  }

  onTextInput(character: string): void {
    this._current?.onTextInput(character);
  }

  onMouseButton(x: number, y: number, down: boolean, button: number): void {
    this._current?.onMouseButton(x, y, down, button as any);
  }

  onMouseMove(x: number, y: number): void {
    this._current?.onMouseMove(x, y);
  }

  onKeyPress(key: string): void {
    this._current?.onKeyPress(key);
  }

  onResize(windowW: number, windowH: number): void {
    this._current?.onResize(windowW, windowH);
  }
}
