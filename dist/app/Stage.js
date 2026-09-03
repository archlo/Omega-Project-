import { Container } from 'pixi.js';
import { MuteButton } from '../ui/MuteButton.js';
import { BuiltInFont } from '../ui/BuiltInFont.js';
export var MouseButton;
(function (MouseButton) {
    MouseButton[MouseButton["Left"] = 0] = "Left";
    MouseButton[MouseButton["Right"] = 1] = "Right";
    MouseButton[MouseButton["Middle"] = 2] = "Middle";
})(MouseButton || (MouseButton = {}));
export class Stage {
    game;
    /** Full-width layer — FieldScene goes here; empty for pre-game stages. */
    mapRoot = new Container();
    /** 800-px frame layer — all UI elements go here; coords are frame-relative. */
    uiRoot = new Container();
    _frameMuteButton = null;
    _frameMuteFont = null;
    get stageDirector() { return this.game.stageDirector; }
    onEnter(game) {
        this.game = game;
        game.mapContainer.addChild(this.mapRoot);
        game.frameContainer.addChild(this.uiRoot);
    }
    onExit() {
        this.game.mapContainer.removeChild(this.mapRoot);
        this.game.frameContainer.removeChild(this.uiRoot);
    }
    update(dt) {
        if (this._frameMuteButton !== null) {
            // MuteButton lives in the 800-px frame container (uiRoot) and is positioned
            // in frame-local coordinates; the frame size is constant regardless of the
            // window size, so we always pass 800×600 here.
            this._frameMuteButton.ServiceAndDraw(800, 600);
        }
    }
    /** Lazily creates a MuteButton backed by the persistent audio player. Call once per
        frame from a framed login stage's draw, right after the frame sprite is drawn.
        State is shared with the audio player so the toggle persists across stages.
        The viewW/viewH arguments are the 800-px frame dimensions (always 800×600). */
    drawFrameMuteButton(viewW = 800, viewH = 600) {
        if (this._frameMuteButton === null) {
            this._frameMuteFont ??= new BuiltInFont();
            this._frameMuteButton = new MuteButton(() => this.game.audioPlayer.Muted, () => this.game.audioPlayer.ToggleMute(), this._frameMuteFont);
            this.uiRoot.addChild(this._frameMuteButton.container);
        }
        this._frameMuteButton.ServiceAndDraw(viewW, viewH);
    }
    onTextInput(character) { }
    onMouseButton(x, y, down, button) {
        if (this._frameMuteButton !== null) {
            this._frameMuteButton.SetMouse(x, y);
            if (this._frameMuteButton.handleMouseButton(x, y, down))
                return;
        }
    }
    onMouseMove(x, y) {
        this._frameMuteButton?.SetMouse(x, y);
    }
    onMouseWheel(x, y, deltaY) { }
    onKeyPress(key) { }
    onResize(windowW, windowH) { }
}
//# sourceMappingURL=Stage.js.map