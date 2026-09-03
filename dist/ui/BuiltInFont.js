import { Text, TextStyle } from 'pixi.js';
export class BuiltInFont {
    _style;
    _canvasCtx = null;
    constructor(size = 11) {
        this._style = new TextStyle({
            fontFamily: 'monospace',
            fontSize: size,
            fill: 0xFFFFFF,
        });
    }
    get lineHeight() { return this._style.fontSize + 4; }
    measure(text) {
        const t = new Text({ text, style: this._style });
        return { x: t.width, y: t.height };
    }
    get style() { return this._style; }
    _ctx() {
        if (!this._canvasCtx) {
            const c = document.createElement('canvas');
            this._canvasCtx = c.getContext('2d');
            this._canvasCtx.font = `${this._style.fontSize}px ${this._style.fontFamily}`;
        }
        return this._canvasCtx;
    }
    wrapToWidth(text, maxWidth) {
        const lines = [];
        const ctx = this._ctx();
        let line = '';
        for (const word of text.split(' ')) {
            const test = line.length === 0 ? word : `${line} ${word}`;
            if (ctx.measureText(test).width > maxWidth && line.length > 0) {
                lines.push(line);
                line = word;
            }
            else {
                line = test;
            }
        }
        if (line.length > 0)
            lines.push(line);
        if (lines.length === 0)
            lines.push('');
        return lines;
    }
    truncateToWidth(text, maxWidth) {
        const ctx = this._ctx();
        if (ctx.measureText(text).width <= maxWidth)
            return text;
        for (let i = text.length - 1; i > 0; i--) {
            const t = text.substring(0, i) + '…';
            if (ctx.measureText(t).width <= maxWidth)
                return t;
        }
        return text.substring(0, 1) + '…';
    }
}
//# sourceMappingURL=BuiltInFont.js.map