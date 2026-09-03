export class StageDirector {
    _game;
    _current = null;
    _stack = [];
    get current() { return this._current; }
    constructor(game) {
        this._game = game;
    }
    replace(next) {
        this._current?.onExit();
        this._current = next;
        this._current.onEnter(this._game);
    }
    push(next) {
        if (this._current)
            this._stack.push(this._current);
        this._current = next;
        this._current.onEnter(this._game);
    }
    pop() {
        this._current?.onExit();
        this._current = this._stack.pop() ?? null;
    }
    update(dt) {
        this._current?.update(dt);
    }
    draw() {
        this._current?.draw();
    }
    onTextInput(character) {
        this._current?.onTextInput(character);
    }
    onMouseButton(x, y, down, button) {
        this._current?.onMouseButton(x, y, down, button);
    }
    onMouseMove(x, y) {
        this._current?.onMouseMove(x, y);
    }
    onMouseWheel(x, y, deltaY) {
        this._current?.onMouseWheel(x, y, deltaY);
    }
    onKeyPress(key) {
        this._current?.onKeyPress(key);
    }
    onResize(windowW, windowH) {
        this._current?.onResize(windowW, windowH);
    }
}
//# sourceMappingURL=StageDirector.js.map