import { Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { Button } from '../Button.js';
const PanelW = 340;
const PanelH = 260;
const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 11, fontFamily: 'monospace' });
const _slotStyle = new TextStyle({ fill: '#FFF', fontSize: 10, fontFamily: 'monospace' });
// OG class: CRepairDurabilityDlg (SetNPC/ResetInfo/OnMouseButton/Move/Enter/
// OnCreate/OnButtonClicked/Draw/ClearToolTip).
export class Repair extends GamePanel {
    OnRepair = null;
    OnRepairAll = null;
    OnClosed = null;
    _background;
    _font;
    _allButtons = [];
    _items = [];
    _selectedSlot = -1;
    _dynamicChildren = [];
    constructor(loader, ui, font) {
        super();
        this._font = font;
        this.isVisible = false;
        this.container.position.set(230, 120);
        const rp = ui?.GetItem('UIWindow2.img/Repair');
        const rpProp = rp instanceof WzProperty ? rp : null;
        this._background = rpProp?.Get('backgrnd') instanceof WzCanvas ? loader.Load(rpProp.Get('backgrnd')) : null;
        if (this._background)
            this.container.addChild(this._background.ToPixi());
        const title = new Text({ text: 'Repair', style: _titleStyle });
        title.x = 8;
        title.y = 5;
        this.container.addChild(title);
        // OG CRepairDurabilityDlg button id 0x3E8 — "Repair All"
        const allBtn = new Button('Repair All');
        allBtn.container.position.set(PanelW - 110, PanelH - 32);
        allBtn.onClick = () => this.OnRepairAll?.();
        this.container.addChild(allBtn.container);
        this._allButtons.push(allBtn);
    }
    Open(items) {
        this._items = items;
        this._selectedSlot = -1;
        this.isVisible = true;
    }
    update(_dt) { this.draw(); }
    draw() {
        if (!this.isVisible)
            return;
        for (const c of this._dynamicChildren)
            c.destroy();
        this._dynamicChildren = [];
        const listY = 48;
        const itemH = 20;
        for (let i = 0; i < this._items.length; i++) {
            const item = this._items[i];
            const iy = listY + i * itemH;
            const bg = new Graphics();
            bg.rect(10, iy, PanelW - 20, itemH - 2).fill({ color: i === this._selectedSlot ? '#2E2E4C' : (i % 2 === 0 ? '#13131F' : '#181828'), alpha: 0.8 });
            this.container.addChild(bg);
            this._dynamicChildren.push(bg);
            const name = new Text({ text: item.name, style: _slotStyle });
            name.x = 14;
            name.y = iy + 2;
            this.container.addChild(name);
            this._dynamicChildren.push(name);
            const dur = new Text({ text: `${item.durability} / ${item.maxDurability}`, style: new TextStyle({ fill: '#AAA', fontSize: 9, fontFamily: 'monospace' }) });
            dur.x = PanelW - 100;
            dur.y = iy + 2;
            this.container.addChild(dur);
            this._dynamicChildren.push(dur);
        }
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
            this.OnClosed?.();
            this.isVisible = false;
            return true;
        }
        const listY = 48;
        const itemH = 20;
        for (let i = 0; i < this._items.length; i++) {
            if (lx >= 10 && lx < PanelW - 10 && ly >= listY + i * itemH && ly < listY + (i + 1) * itemH) {
                this._selectedSlot = i;
                this.OnRepair?.(this._items[i].slot);
                return true;
            }
        }
        return lx >= 0 && lx < PanelW && ly >= 0 && ly < PanelH;
    }
    onKeyPress(key) {
        if (!this.isVisible)
            return false;
        if (key === 'Escape') {
            this.OnClosed?.();
            this.isVisible = false;
            return true;
        }
        return false;
    }
}
//# sourceMappingURL=Repair.js.map