import { Container, Graphics, Text, TextStyle } from 'pixi.js';
export class TextField {
    position = { x: 0, y: 0 };
    width = 160;
    height = 24;
    _text = '';
    set text(v) {
        this._text = v.slice(0, this.maxLength);
        this._updateDisplay();
    }
    get text() { return this._text; }
    maxLength = 16;
    isPassword = false;
    drawBackground = true;
    // OG: CCtrlEdit::SetEnable (0x4DE970) — enable/disable state
    _enabled = true;
    get enabled() { return this._enabled; }
    set enabled(v) {
        this._enabled = v;
        if (!v)
            this.isFocused = false;
        this.drawBg();
    }
    _isFocused = false;
    get isFocused() { return this._isFocused; }
    set isFocused(v) {
        if (!this._enabled && v)
            return;
        this._isFocused = v;
        this._cursor.visible = v;
        this.drawBg();
    }
    // OG: CCtrlEdit::OnMouseEnter — hover state
    _hovered = false;
    get hovered() { return this._hovered; }
    /** Optional WZ background sprite, rendered when the field is empty. */
    background = null;
    container;
    _bg;
    _bgSprite = null;
    _textNode;
    _cursor;
    _textColor = 0xFFFFFF;
    _caretColor = 0xFFFFFF;
    constructor(background) {
        this.background = background ?? null;
        this.container = new Container();
        this._bg = new Graphics();
        this._textNode = new Text({
            text: '',
            style: new TextStyle({ fill: 0xFFFFFF, fontSize: 12, fontFamily: 'monospace' }),
        });
        this._textNode.position.set(4, 4);
        this._cursor = new Graphics();
        this._cursor.visible = false;
        this.container.addChild(this._bg);
        if (this.background) {
            this._bgSprite = this.background.ToPixi();
            this.container.addChildAt(this._bgSprite, 0);
            this.width = this.background.Width;
            this.height = this.background.Height;
        }
        this.container.addChild(this._textNode);
        this.container.addChild(this._cursor);
        this.drawBg();
    }
    get bounds() {
        return { x: this.position.x, y: this.position.y, width: this.width, height: this.height };
    }
    set textColor(v) {
        this._textColor = v;
        this._textNode.style.fill = v;
    }
    get textColor() { return this._textColor; }
    set caretColor(v) { this._caretColor = v; }
    get caretColor() { return this._caretColor; }
    setPosition(x, y) {
        this.position.x = x;
        this.position.y = y;
        this.container.position.set(x, y);
    }
    onTextInput(character) {
        if (!this.isFocused)
            return;
        if (character.length > 0) {
            this.text = this.text + character;
        }
    }
    onKeyPress(key) {
        if (!this.isFocused)
            return false;
        if (key === 'Backspace') {
            this.text = this.text.slice(0, -1);
            return true;
        }
        return false;
    }
    handleMouseButton(x, y, down) {
        if (!this._enabled)
            return false;
        if (!down)
            return false;
        const b = this.bounds;
        this.isFocused = x >= b.x && x < b.x + b.width && y >= b.y && y < b.y + b.height;
        return this._isFocused;
    }
    /** OG: CCtrlEdit::OnMouseEnter — hover tracking. */
    onMouseMove(x, y) {
        const b = this.bounds;
        this._hovered = x >= b.x && x < b.x + b.width && y >= b.y && y < b.y + b.height;
    }
    _updateDisplay() {
        const display = this.isPassword ? '•'.repeat(this.text.length) : this.text;
        this._textNode.text = display;
        if (this._bgSprite) {
            this._bgSprite.visible = this.text.length === 0;
        }
        this._updateCursorPos();
    }
    _updateCursorPos() {
        this._cursor.position.set(4 + this._textNode.width + 2, 4);
    }
    drawBg() {
        const g = this._bg;
        g.clear();
        const cursorH = this.height - 8;
        this._updateCursorPos();
        this._cursor.clear();
        if (this._enabled) {
            this._cursor.rect(0, 0, 1, cursorH).fill({ color: this._caretColor });
        }
        if (this.background || !this.drawBackground) {
            // WZ art or transparent mode — no fill box
            return;
        }
        if (!this._enabled) {
            g.rect(0, 0, this.width, this.height).fill({ color: 0x0a0a0a });
            g.rect(0, 0, this.width, this.height).stroke({ width: 1, color: 0x222222 });
        }
        else {
            g.rect(0, 0, this.width, this.height).fill({ color: this.isFocused ? 0x1a3a5a : 0x0a1a2a });
            g.rect(0, 0, this.width, this.height).stroke({ width: 1, color: this.isFocused ? 0x88CCFF : 0x446688 });
        }
    }
}
//# sourceMappingURL=TextField.js.map