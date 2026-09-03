import { Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { Button } from '../Button.js';
const PanelW = 300;
const PanelH = 220;
const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 11, fontFamily: 'monospace' });
const _msgStyle = new TextStyle({ fill: '#FFF', fontSize: 10, fontFamily: 'monospace', wordWrap: true, wordWrapWidth: PanelW - 32 });
export class Claim extends GamePanel {
    OnConfirm = null;
    _background;
    _font;
    _allButtons = [];
    _btOk = null;
    _message = '';
    _msgText;
    constructor(loader, ui, font) {
        super();
        this._font = font;
        this.isVisible = false;
        this.container.position.set(250, 150);
        const claim = ui?.GetItem('UIWindow2.img/Claim');
        const claimProp = claim instanceof WzProperty ? claim : null;
        this._background = claimProp?.Get('backgrnd') instanceof WzCanvas ? loader.Load(claimProp.Get('backgrnd')) : null;
        if (this._background)
            this.container.addChild(this._background.ToPixi());
        const title = new Text({ text: 'Notice', style: _titleStyle });
        title.x = 8;
        title.y = 5;
        this.container.addChild(title);
        this._msgText = new Text({ text: '', style: _msgStyle });
        this._msgText.x = 16;
        this._msgText.y = 40;
        this.container.addChild(this._msgText);
        this._btOk = this._makeButton(loader, claimProp, 'BtOk', () => { this.OnConfirm?.(); this.isVisible = false; });
        if (this._btOk)
            this._btOk.container.position.set(PanelW / 2 - 30, PanelH - 36);
    }
    Show(message) {
        this._message = message;
        this._msgText.text = message;
        this.isVisible = true;
    }
    ShowResult(result, success, claimDelayMinutes) {
        // TODO_AUDIT.md Hundred-and-fifty-fourth pass: claim packet payload is
        // decoded; full OG multi-step claim form remains out of scope here.
        const state = success === undefined ? `result ${result}` : success ? 'accepted' : 'rejected';
        const delay = claimDelayMinutes ? ` (${claimDelayMinutes}min delay)` : '';
        this.Show(`Claim ${state}${delay}.`);
    }
    ShowServiceStatus(message) {
        this.Show(message);
    }
    update(_dt) { }
    _makeButton(loader, root, name, onClick) {
        const pr = root?.Get(name);
        if (!(pr instanceof WzProperty))
            return null;
        const b = Button.fromWz(loader, pr, name);
        b.onClick = onClick;
        this._allButtons.push(b);
        this.container.addChild(b.container);
        return b;
    }
    handleMouseButton(x, y, down) {
        if (!this.isVisible)
            return false;
        if (!down)
            return true;
        const px = this.container.position.x;
        const py = this.container.position.y;
        const lx = x - px;
        const ly = y - py;
        for (const b of this._allButtons) {
            if (b.handleMouseButton(lx, ly, down))
                return true;
        }
        if (lx >= PanelW - 18 && ly < 22) {
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
}
//# sourceMappingURL=Claim.js.map