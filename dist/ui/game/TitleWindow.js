import { Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
const PanelW = 280;
const PanelH = 200;
const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 11, fontFamily: 'monospace' });
const _nameStyle = new TextStyle({ fill: '#FFD700', fontSize: 10, fontFamily: 'monospace' });
// OG class: CUITitle (TSingleton<CUITitle>, ~20 reference sites across
// pointers.txt — standard singleton-window pattern, no separate "CTitleDlg").
export class TitleWindow extends GamePanel {
    _background;
    _font;
    _mainTitle = '';
    _subTitle = '';
    _dynamicChildren = [];
    constructor(loader, ui, font) {
        super();
        this._font = font;
        this.isVisible = false;
        this.container.position.set(260, 150);
        const t = ui?.GetItem('UIWindow2.img/Title');
        const tProp = t instanceof WzProperty ? t : null;
        this._background = tProp?.Get('backgrnd') instanceof WzCanvas ? loader.Load(tProp.Get('backgrnd')) : null;
        const title = new Text({ text: 'Title', style: _titleStyle });
        title.x = 8;
        title.y = 5;
        this.container.addChild(title);
    }
    Set(main, sub) {
        this._mainTitle = main;
        this._subTitle = sub;
    }
    update(_dt) { this.draw(); }
    draw() {
        if (!this.isVisible)
            return;
        if (this._background)
            this.container.addChildAt(this._background.ToPixi(), 0);
        for (const c of this._dynamicChildren)
            c.destroy();
        this._dynamicChildren = [];
        const main = new Text({ text: this._mainTitle || '(no title equipped)', style: _nameStyle });
        main.x = 20;
        main.y = 50;
        this.container.addChild(main);
        this._dynamicChildren.push(main);
        const sub = new Text({ text: this._subTitle || '', style: new TextStyle({ fill: '#AAA', fontSize: 9, fontFamily: 'monospace' }) });
        sub.x = 20;
        sub.y = 80;
        this.container.addChild(sub);
        this._dynamicChildren.push(sub);
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
//# sourceMappingURL=TitleWindow.js.map