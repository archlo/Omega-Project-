import { Container, Sprite } from 'pixi.js';
export class DragController {
    container = new Container();
    _icon = null;
    _payload = null;
    get isDragging() { return this._payload !== null; }
    /** Peek the in-flight payload before calling `endDrag` (which clears it) —
     * lets a caller apply a fallback action when no target claims the drop. */
    get payload() { return this._payload; }
    beginDrag(payload, texture, x, y) {
        this.cancelDrag();
        this._payload = payload;
        this._icon = new Sprite(texture);
        this._icon.anchor.set(0.5);
        this._icon.alpha = 0.8;
        this._icon.x = x;
        this._icon.y = y;
        this.container.addChild(this._icon);
    }
    updatePosition(x, y) {
        if (this._icon) {
            this._icon.x = x;
            this._icon.y = y;
        }
    }
    /** Mouse-up: offer the payload to each target in z-order (topmost first). */
    endDrag(targets, x, y) {
        const payload = this._payload;
        this.cancelDrag();
        if (payload === null)
            return false;
        for (const t of targets) {
            if (typeof t?.tryAcceptDrag === 'function' && t.tryAcceptDrag(payload, x, y))
                return true;
        }
        return false;
    }
    cancelDrag() {
        this._payload = null;
        if (this._icon) {
            this.container.removeChild(this._icon);
            this._icon = null;
        }
    }
}
//# sourceMappingURL=DragController.js.map