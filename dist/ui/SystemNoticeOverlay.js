import { Overlay } from './Overlay.js';
import { WzProperty } from '../wz/WzProperty.js';
import { WzCanvas } from '../wz/WzCanvas.js';
import { Button } from './Button.js';
const BgW = 249;
const BgH = 142;
export class SystemNoticeOverlay extends Overlay {
    _loader;
    _ui;
    _center;
    _bg;
    _btYes;
    _text = null;
    _textSprite = null;
    _onOk = null;
    constructor(loader, ui, center) {
        super();
        this._loader = loader;
        this._ui = ui;
        this._center = center;
        const notice = ui?.GetItem('Login.img/Notice');
        const noticeProp = notice instanceof WzProperty ? notice : null;
        const bg0 = noticeProp?.Get('backgrnd') instanceof WzProperty ? noticeProp.Get('backgrnd').Get('0') : null;
        this._bg = bg0 instanceof WzCanvas ? loader.Load(bg0) : null;
        this._btYes = noticeProp?.Get('BtYes') instanceof WzProperty ? new Button('OK') : null;
        if (this._btYes)
            this._btYes.onClick = () => this._confirm();
        const bgTL = { x: this._center.x - BgW / 2, y: this._center.y - BgH / 2 };
        if (this._bg) {
            const sp = this._bg.ToPixi();
            sp.position.set(bgTL.x, bgTL.y);
            this.container.addChild(sp);
        }
        if (this._btYes)
            this.container.addChild(this._btYes.container);
    }
    Show(textId, onOk) {
        this._onOk = onOk;
        if (this._textSprite) {
            this.container.removeChild(this._textSprite);
            this._textSprite = null;
        }
        const c = this._ui?.GetItem(`Login.img/Notice/text/${textId}`);
        this._text = c instanceof WzCanvas ? this._loader.Load(c) : null;
        const bgTL = { x: this._center.x - BgW / 2, y: this._center.y - BgH / 2 };
        if (this._text) {
            this._textSprite = this._text.ToPixi();
            this._textSprite.position.set(bgTL.x + 16, bgTL.y + 30);
            this.container.addChild(this._textSprite);
        }
        if (this._btYes !== null)
            this._btYes.container.position.set(bgTL.x + 100, bgTL.y + 107);
        this.isVisible = true;
    }
    _confirm() {
        this.isVisible = false;
        this._onOk?.();
    }
    update(_dt) {
        if (!this.isVisible)
            return;
    }
    setMouse(x, y) {
        if (!this.isVisible)
            return;
        const b = this._btYes?.bounds;
        if (b)
            this._btYes?.setHover(x >= b.x && x < b.x + b.width && y >= b.y && y < b.y + b.height);
    }
    handleMouseButton(x, y, down) {
        if (!this.isVisible)
            return false;
        if (this._btYes?.handleMouseButton(x, y, down) === true)
            return true;
        return true;
    }
    onKeyPress(key) {
        if (!this.isVisible)
            return false;
        if (key === 'Enter' || key === 'Escape') {
            this._confirm();
            return true;
        }
        return true;
    }
}
//# sourceMappingURL=SystemNoticeOverlay.js.map