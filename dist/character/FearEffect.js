import { Container, Graphics } from 'pixi.js';
const VISIBILITY_RADIUS = 158;
export class FearEffect {
    container;
    _overlay;
    _active = false;
    _screenW = 800;
    _screenH = 600;
    constructor() {
        this.container = new Container();
        this._overlay = new Graphics();
        this.container.addChild(this._overlay);
        this.container.visible = false;
        this.container.interactiveChildren = false;
    }
    get active() {
        return this._active;
    }
    onResize(w, h) {
        this._screenW = w;
        this._screenH = h;
        if (this._active)
            this._redraw();
    }
    show(playerScreenX, playerScreenY) {
        this._active = true;
        this._px = playerScreenX;
        this._py = playerScreenY;
        this._redraw();
        this.container.visible = true;
    }
    hide() {
        this._active = false;
        this.container.visible = false;
        this._overlay.clear();
    }
    update(playerScreenX, playerScreenY) {
        if (!this._active)
            return;
        this._px = playerScreenX;
        this._py = playerScreenY;
        this._redraw();
    }
    _px = 0;
    _py = 0;
    _redraw() {
        this._overlay.clear();
        this._overlay.beginPath();
        this._overlay.rect(0, 0, this._screenW, this._screenH);
        this._overlay.fill({ color: 0x000000 });
        this._overlay.beginPath();
        this._overlay.circle(this._px, this._py, VISIBILITY_RADIUS);
        this._overlay.cut();
    }
}
//# sourceMappingURL=FearEffect.js.map