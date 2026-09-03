import { Overlay } from './Overlay.js';
import { WzProperty } from '../wz/WzProperty.js';
import { WzCanvas } from '../wz/WzCanvas.js';
import { Button } from './Button.js';
export class LoginWaitOverlay extends Overlay {
    OnCancel = null;
    OnDone = null;
    _background;
    _btCancel;
    _font;
    _center;
    _autoTimer = -1;
    constructor(loader, ui, font, center) {
        super();
        this._font = font;
        this._center = center;
        const wait = ui?.GetItem('Login.img/LoginWait');
        const waitProp = wait instanceof WzProperty ? wait : null;
        this._background = waitProp?.Get('backgrnd') instanceof WzCanvas ? loader.Load(waitProp.Get('backgrnd')) : null;
        if (this._background) {
            const sprite = this._background.ToPixi();
            sprite.position.set(center.x, center.y);
            this.container.addChild(sprite);
        }
        const cancelRoot = waitProp?.Get('BtCancel');
        this._btCancel = cancelRoot instanceof WzProperty
            ? Button.fromWz(loader, cancelRoot, 'Cancel')
            : new Button('Cancel');
        this._btCancel.onClick = () => this.OnCancel?.();
        this._btCancel.container.position.set(center.x, center.y + 40);
        this.container.addChild(this._btCancel.container);
        this.container.visible = this.isVisible;
    }
    /** Keeps the Pixi container's visibility in sync with `isVisible`. */
    setVisible(visible) {
        this.isVisible = visible;
        this.container.visible = visible;
    }
    ShowAndThen(seconds, onDone) {
        this.setVisible(true);
        this._autoTimer = seconds;
        this.OnDone = onDone;
    }
    update(_dt) {
        if (!this.isVisible || this._autoTimer < 0)
            return;
        this._autoTimer -= _dt;
        if (this._autoTimer <= 0) {
            this._autoTimer = -1;
            this.setVisible(false);
            this.OnDone?.();
        }
    }
    handleMouseButton(x, y, down) {
        if (!this.isVisible)
            return false;
        this._btCancel?.handleMouseButton(x, y, down);
        return true;
    }
    onKeyPress(key) {
        if (!this.isVisible)
            return false;
        if (key === 'Escape') {
            this.OnCancel?.();
            return true;
        }
        return true;
    }
}
//# sourceMappingURL=LoginWaitOverlay.js.map