import { Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
const PanelW = 220;
const PanelH = 112;
const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 12, fontFamily: 'monospace' });
const _bodyStyle = new TextStyle({ fill: '#FFFFFF', fontSize: 11, fontFamily: 'monospace' });
const _btnStyle = new TextStyle({ fill: '#D8D8D8', fontSize: 10, fontFamily: 'monospace' });
export class Parcel extends GamePanel {
    _bg = new Graphics();
    _title = new Text({ text: 'Parcel', style: _titleStyle });
    _body = new Text({ text: '', style: _bodyStyle });
    _closeBtn = new Graphics();
    _closeLabel = new Text({ text: 'Close', style: _btnStyle });
    _subAction = 0;
    constructor() {
        super();
        this.container.position.set(354, 196);
        this._title.position.set(10, 8);
        this._body.position.set(12, 36);
        this._closeLabel.position.set(146, 84);
        this.container.addChild(this._bg, this._title, this._body, this._closeBtn, this._closeLabel);
        this._drawChrome();
        this._refresh();
    }
    SetSubAction(subAction) {
        // TODO_AUDIT.md Hundred-and-fifty-fourth pass: CParcelDlg only has the
        // leading sub-action byte decoded; per-action item/mail tails are opaque.
        this._subAction = subAction;
        this.isVisible = true;
        this._refresh();
    }
    handleMouseButton(x, y, down) {
        if (!this.isVisible)
            return false;
        if (!down)
            return true;
        const lx = x - this.container.position.x;
        const ly = y - this.container.position.y;
        if (this._hit(lx, ly, 136, 78, 58, 24)) {
            this.isVisible = false;
            return true;
        }
        return lx >= 0 && lx < PanelW && ly >= 0 && ly < PanelH;
    }
    onKeyPress(key) {
        if (!this.isVisible)
            return false;
        if (key === 'Escape') {
            this.isVisible = false;
            return true;
        }
        return false;
    }
    _refresh() {
        this._body.text = `Sub-action: ${this._subAction}`;
    }
    _drawChrome() {
        this._bg.clear().roundRect(0, 0, PanelW, PanelH, 5).fill({ color: 0x141c24, alpha: 0.92 }).stroke({ color: 0x99ddff, width: 1 });
        this._closeBtn.clear().rect(136, 78, 58, 24).fill({ color: 0x1E2030, alpha: 0.9 }).stroke({ color: 0x557070, width: 1 });
    }
    _hit(x, y, bx, by, bw, bh) {
        return x >= bx && x < bx + bw && y >= by && y < by + bh;
    }
}
//# sourceMappingURL=Parcel.js.map