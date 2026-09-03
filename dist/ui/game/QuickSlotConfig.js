import { GamePanel } from './GamePanel.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { Button } from '../Button.js';
const PanelW = 266;
const PanelH = 238;
// OG class: CQuickslotKeyModifyDlg, backed by manager singleton
// CQuickslotKeyMappedMan (SaveQuickslotKeyMap). Separate from the always-
// visible CQuickSlot hotbar widget (see QuickSlotBar.ts).
export class QuickSlotConfig extends GamePanel {
    OnOpenKeyConfig = null;
    _background;
    _btSetting;
    _font;
    _windowDrag = false;
    _windowDragOff = { x: 0, y: 0 };
    constructor(loader, ui, font) {
        super();
        this._font = font;
        this.isVisible = false;
        this.container.position.set(360, 250);
        const qs = ui?.GetItem('UIWindow2.img/KeyConfig/quickslotConfig');
        const qsProp = qs instanceof WzProperty ? qs : null;
        this._background = qsProp?.Get('backgrnd') instanceof WzCanvas ? loader.Load(qsProp.Get('backgrnd')) : null;
        if (this._background)
            this.container.addChild(this._background.ToPixi());
        const st = qsProp?.Get('BtQuickSetting');
        this._btSetting = st instanceof WzProperty ? Button.fromWz(loader, st, 'Setting') : null;
        if (this._btSetting) {
            this._btSetting.onClick = () => { this.OnOpenKeyConfig?.(); };
            this.container.addChild(this._btSetting.container);
        }
    }
    Open() { this.isVisible = true; this._windowDrag = false; }
    update(_dt) {
        if (!this.isVisible)
            return;
        if (this._btSetting) {
            this._btSetting.container.position.set(220, 5);
        }
    }
    setMouse(x, y) {
        if (!this._windowDrag)
            return;
        this.container.position.set(x - this._windowDragOff.x, y - this._windowDragOff.y);
    }
    handleMouseButton(x, y, down) {
        if (!this.isVisible)
            return false;
        const px = this.container.position.x;
        const py = this.container.position.y;
        const inside = x >= px && x < px + PanelW && y >= py && y < py + PanelH;
        if (this._btSetting !== null && this._btSetting.handleMouseButton(x, y, down))
            return true;
        if (!down)
            return inside;
        if (!inside)
            return false;
        if (y - py < 24) {
            this._windowDrag = true;
            this._windowDragOff = { x: x - px, y: y - py };
        }
        return true;
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
//# sourceMappingURL=QuickSlotConfig.js.map