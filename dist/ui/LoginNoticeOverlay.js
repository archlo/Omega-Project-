import { Graphics, Text, TextStyle } from 'pixi.js';
import { Overlay } from './Overlay.js';
import { Button } from './Button.js';
export var NoticeType;
(function (NoticeType) {
    NoticeType[NoticeType["Ok"] = 0] = "Ok";
    NoticeType[NoticeType["OkCancel"] = 1] = "OkCancel";
})(NoticeType || (NoticeType = {}));
export class LoginNoticeOverlay extends Overlay {
    _bgSprite = null;
    _btOk = null;
    _btCancel = null;
    _font;
    _center;
    _message = '';
    _type = NoticeType.Ok;
    _autoDismiss = 0;
    _fallbackBox = null;
    _lineTexts = [];
    _msgText;
    onOk = null;
    onCancel = null;
    constructor(loader, ui, font, center) {
        super();
        this._font = font;
        this._center = center;
        this._msgText = new Text({ text: '', style: new TextStyle({ fill: 0xFFFFFF, fontSize: 14, fontFamily: 'monospace' }) });
        this._msgText.position.set(center.x, center.y);
        this._msgText.anchor.set(0.5);
        this.container.addChild(this._msgText);
        const notice = ui?.GetItem('Login.img/Notice');
        const bgCanvas = notice?.Get('backgrnd');
        if (bgCanvas) {
            const bgSprite = loader.Load(bgCanvas);
            if (bgSprite) {
                this._bgSprite = bgSprite.ToPixi();
                this._bgSprite.visible = false;
                this.container.addChild(this._bgSprite);
            }
        }
        const okRoot = notice?.Get('BtOK');
        if (okRoot) {
            this._btOk = Button.fromWz(loader, okRoot);
            this._btOk.onClick = () => { this.isVisible = false; this.onOk?.(); };
            this._btOk.container.visible = false;
            this.container.addChild(this._btOk.container);
        }
        const cancelRoot = notice?.Get('BtCancel');
        if (cancelRoot) {
            this._btCancel = Button.fromWz(loader, cancelRoot);
            this._btCancel.onClick = () => { this.isVisible = false; this.onCancel?.(); };
            this._btCancel.container.visible = false;
            this.container.addChild(this._btCancel.container);
        }
        if (!this._bgSprite) {
            this._fallbackBox = new Graphics();
            this._fallbackBox.visible = false;
            this.container.addChild(this._fallbackBox);
        }
        this.isVisible = false;
    }
    show(message, type = NoticeType.Ok, autoDismissSeconds = 0) {
        this._message = message;
        this._type = type;
        this._autoDismiss = autoDismissSeconds;
        this.isVisible = true;
        this._applyLayout();
        this._rebuildText();
    }
    hide() {
        this.isVisible = false;
    }
    update(dt) {
        if (!this.isVisible || this._autoDismiss <= 0)
            return;
        this._autoDismiss -= dt;
        if (this._autoDismiss <= 0) {
            this._autoDismiss = 0;
            this.isVisible = false;
            this.onOk?.();
        }
    }
    _applyLayout() {
        const ox = this._type === NoticeType.OkCancel ? -40 : 0;
        if (this._btOk)
            this._btOk.container.position.set(this._center.x + ox, this._center.y + 38);
        if (this._btCancel)
            this._btCancel.container.position.set(this._center.x + 44, this._center.y + 38);
    }
    _rebuildText() {
        this._msgText.text = this._message;
        this._msgText.visible = !!this._bgSprite;
        for (const t of this._lineTexts) {
            t.destroy({ children: true });
        }
        this._lineTexts = [];
        if (!this._fallbackBox)
            return;
        const innerW = 280;
        const padX = 12;
        const lines = this._font.wrapToWidth(this._message, innerW);
        const lineH = this._font.lineHeight;
        const textBlockH = lines.length * lineH;
        const boxW = innerW + padX * 2;
        const boxH = Math.max(110, textBlockH + 80);
        const bx = this._center.x - boxW / 2;
        const by = this._center.y - boxH / 2;
        this._fallbackBox.clear();
        this._fallbackBox.rect(bx, by, boxW, boxH).fill({ color: 0x000000, alpha: 210 / 255 });
        this._fallbackBox.rect(bx, by, boxW, 2).fill({ color: 0x786458 });
        this._fallbackBox.rect(bx, by + boxH - 2, boxW, 2).fill({ color: 0x786458 });
        this._fallbackBox.rect(bx, by, 2, boxH).fill({ color: 0x786458 });
        this._fallbackBox.rect(bx + boxW - 2, by, 2, boxH).fill({ color: 0x786458 });
        const textStartY = this._center.y - 8 - textBlockH / 2;
        for (let i = 0; i < lines.length; i++) {
            const m = this._font.measure(lines[i]);
            const lineTxt = new Text({ text: lines[i], style: this._font.style });
            lineTxt.position.set(this._center.x - m.x / 2, textStartY + i * lineH);
            lineTxt.anchor.set(0.5, 0);
            this._lineTexts.push(lineTxt);
            this.container.addChild(lineTxt);
        }
    }
    draw() {
        if (!this.isVisible) {
            if (this._bgSprite)
                this._bgSprite.visible = false;
            if (this._fallbackBox)
                this._fallbackBox.visible = false;
            if (this._btOk)
                this._btOk.container.visible = false;
            if (this._btCancel)
                this._btCancel.container.visible = false;
            for (const t of this._lineTexts)
                t.visible = false;
            return;
        }
        if (this._bgSprite) {
            this._bgSprite.position.set(this._center.x, this._center.y);
            this._bgSprite.visible = true;
        }
        if (this._fallbackBox)
            this._fallbackBox.visible = true;
        if (this._btOk) {
            this._btOk.container.visible = true;
        }
        if (this._btCancel)
            this._btCancel.container.visible = this._type === NoticeType.OkCancel;
        for (const t of this._lineTexts)
            t.visible = true;
    }
    handleMouseButton(x, y, down) {
        if (!this.isVisible)
            return;
        if (this._btOk?.handleMouseButton(x, y, down))
            return;
        if (this._type === NoticeType.OkCancel && this._btCancel?.handleMouseButton(x, y, down))
            return;
    }
    onKeyPress(key) {
        if (!this.isVisible)
            return false;
        if (key === 'Enter' || key === 'Escape') {
            this.isVisible = false;
            if (key === 'Enter')
                this.onOk?.();
            else
                this.onCancel?.();
            return true;
        }
        return false;
    }
}
//# sourceMappingURL=LoginNoticeOverlay.js.map