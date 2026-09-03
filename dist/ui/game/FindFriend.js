import { Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
const PanelW = 260;
const PanelH = 126;
const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 12, fontFamily: 'monospace' });
const _bodyStyle = new TextStyle({ fill: '#FFFFFF', fontSize: 11, fontFamily: 'monospace' });
const _btnStyle = new TextStyle({ fill: '#D8D8D8', fontSize: 10, fontFamily: 'monospace' });
export class FindFriend extends GamePanel {
    onMyInfo = null;
    onSearch = null;
    _bg = new Graphics();
    _title = new Text({ text: 'Find Friend', style: _titleStyle });
    _body = new Text({ text: '', style: _bodyStyle });
    _myInfoBtn = new Graphics();
    _myInfoLabel = new Text({ text: 'My Info', style: _btnStyle });
    _searchBtn = new Graphics();
    _searchLabel = new Text({ text: 'Search', style: _btnStyle });
    _closeBtn = new Graphics();
    _closeLabel = new Text({ text: 'Close', style: _btnStyle });
    _flag1 = 0;
    _flag2 = 0;
    constructor() {
        super();
        this.container.position.set(338, 178);
        this._title.position.set(10, 8);
        this._body.position.set(12, 34);
        this._myInfoLabel.position.set(31, 96);
        this._searchLabel.position.set(111, 96);
        this._closeLabel.position.set(188, 96);
        this.container.addChild(this._bg, this._title, this._body, this._myInfoBtn, this._myInfoLabel, this._searchBtn, this._searchLabel, this._closeBtn, this._closeLabel);
        this._drawChrome();
        this._refresh();
    }
    SetResult(flag1, flag2) {
        // TODO_AUDIT.md Hundred-and-fifty-fourth pass: CUIFindFriend's verified
        // senders are only sub-action 0/1, so this exposes decoded state + those
        // two requests rather than inventing a name-query payload.
        this._flag1 = flag1;
        this._flag2 = flag2;
        this.isVisible = true;
        this._refresh();
    }
    Open() {
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
        if (this._hit(lx, ly, 22, 90, 68, 24)) {
            this.onMyInfo?.();
            return true;
        }
        if (this._hit(lx, ly, 102, 90, 62, 24)) {
            this.onSearch?.();
            return true;
        }
        if (this._hit(lx, ly, 178, 90, 58, 24)) {
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
        this._body.text = `Result flag1: ${this._flag1}\nResult flag2: ${this._flag2}`;
    }
    _drawChrome() {
        this._bg.clear().roundRect(0, 0, PanelW, PanelH, 5).fill({ color: 0x101923, alpha: 0.92 }).stroke({ color: 0x88ccff, width: 1 });
        this._myInfoBtn.clear().rect(22, 90, 68, 24).fill({ color: 0x1E2030, alpha: 0.9 }).stroke({ color: 0x506070, width: 1 });
        this._searchBtn.clear().rect(102, 90, 62, 24).fill({ color: 0x1E2030, alpha: 0.9 }).stroke({ color: 0x506070, width: 1 });
        this._closeBtn.clear().rect(178, 90, 58, 24).fill({ color: 0x1E2030, alpha: 0.9 }).stroke({ color: 0x506070, width: 1 });
    }
    _hit(x, y, bx, by, bw, bh) {
        return x >= bx && x < bx + bw && y >= by && y < by + bh;
    }
}
//# sourceMappingURL=FindFriend.js.map