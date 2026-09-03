import { Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
const PanelW = 260;
const PanelH = 136;
const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 12, fontFamily: 'monospace' });
const _bodyStyle = new TextStyle({ fill: '#FFFFFF', fontSize: 10, fontFamily: 'monospace' });
const _btnStyle = new TextStyle({ fill: '#D8D8D8', fontSize: 10, fontFamily: 'monospace' });
export class WildHunterInfo extends GamePanel {
    _bg = new Graphics();
    _title = new Text({ text: 'Wild Hunter Info', style: _titleStyle });
    _body = new Text({ text: '', style: _bodyStyle });
    _closeBtn = new Graphics();
    _closeLabel = new Text({ text: 'Close', style: _btnStyle });
    _packedByte = 0;
    _capturedMobIds = [];
    constructor() {
        super();
        this.container.position.set(338, 188);
        this._title.position.set(10, 8);
        this._body.position.set(12, 34);
        this._closeLabel.position.set(176, 108);
        this.container.addChild(this._bg, this._title, this._body, this._closeBtn, this._closeLabel);
        this._drawChrome();
        this._refresh();
    }
    SetInfo(packedByte, capturedMobIds) {
        // TODO_AUDIT.md Hundred-and-fifty-fourth pass: WildHunterInfo's 21-byte
        // decode is verified, but bit semantics for the packed byte are not.
        this._packedByte = packedByte;
        this._capturedMobIds = capturedMobIds;
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
        if (this._hit(lx, ly, 166, 102, 58, 24)) {
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
        this._body.text = `Packed: ${this._packedByte}\nCaptured mobs:\n${this._capturedMobIds.join(', ') || '-'}`;
    }
    _drawChrome() {
        this._bg.clear().roundRect(0, 0, PanelW, PanelH, 5).fill({ color: 0x142018, alpha: 0.92 }).stroke({ color: 0x99cc66, width: 1 });
        this._closeBtn.clear().rect(166, 102, 58, 24).fill({ color: 0x1E2030, alpha: 0.9 }).stroke({ color: 0x557055, width: 1 });
    }
    _hit(x, y, bx, by, bw, bh) {
        return x >= bx && x < bx + bw && y >= by && y < by + bh;
    }
}
//# sourceMappingURL=WildHunterInfo.js.map