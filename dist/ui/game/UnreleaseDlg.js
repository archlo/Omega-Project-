import { Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
// OG: CUIUnreleaseDlg — inherits CUniqueModeless (modeless dialog).
// Reverses item release (returns scrolls to normal state).
// PutItem: place item to un-release.
const PANEL_W = 180;
const PANEL_H = 120;
export class UnreleaseDlg extends GamePanel {
    _bg;
    _slotIcon;
    _gradeFrame;
    _buttons = [];
    _btConfirm = null;
    _btCancel = null;
    _selectedItemId = 0;
    _mouseX = 0;
    _mouseY = 0;
    _viewW = 800;
    _viewH = 600;
    onConfirm = null;
    onClose = null;
    constructor(opts = {}) {
        super();
        this._bg = new Graphics();
        this._bg.rect(0, 0, PANEL_W, PANEL_H).fill({ color: '#0C0E18', alpha: 240 / 255 });
        this._bg.rect(0, 0, PANEL_W, PANEL_H).stroke({ color: '#3C4164', width: 1 });
        this._bg.rect(0, 0, PANEL_W, 22).fill({ color: '#0F1224' });
        this._root.addChild(this._bg);
        this._slotIcon = new Sprite(Texture.EMPTY);
        this._slotIcon.x = 74;
        this._slotIcon.y = 40;
        this._root.addChild(this._slotIcon);
        this._gradeFrame = new Graphics();
        this._root.addChild(this._gradeFrame);
        // Fallback buttons
        const btnStyle = new TextStyle({ fill: '#DCC896', fontSize: 11, fontFamily: 'monospace' });
        const confirmBtn = new Text({ text: 'Confirm', style: btnStyle });
        confirmBtn.x = 50;
        confirmBtn.y = 95;
        confirmBtn.eventMode = 'static';
        confirmBtn.cursor = 'pointer';
        confirmBtn.on('pointertap', () => { this.onConfirm?.(this._selectedItemId); this.isVisible = false; });
        this._root.addChild(confirmBtn);
        const cancelBtn = new Text({ text: 'Cancel', style: btnStyle });
        cancelBtn.x = 110;
        cancelBtn.y = 95;
        cancelBtn.eventMode = 'static';
        cancelBtn.cursor = 'pointer';
        cancelBtn.on('pointertap', () => { this.onClose?.(); this.isVisible = false; });
        this._root.addChild(cancelBtn);
    }
    putItem(itemId, name, grade = 0) {
        this._selectedItemId = itemId;
    }
    handleMouseButton(x, y, down) {
        if (!this.isVisible)
            return false;
        const lx = x - this._root.x;
        const ly = y - this._root.y;
        for (const button of this._buttons) {
            if (button.handleMouseButton(lx, ly, down))
                return true;
        }
        return lx >= 0 && lx < PANEL_W && ly >= 0 && ly < PANEL_H;
    }
    onMouseMove(x, y) { this._mouseX = x; this._mouseY = y; }
    onKeyPress(key) {
        if (key === 'Escape' && this.isVisible) {
            this.onClose?.();
            this.isVisible = false;
            return true;
        }
        return false;
    }
    tryAcceptDrag(payload, x, y) {
        if (!this.isVisible)
            return false;
        if (!payload || typeof payload !== 'object' || !('invType' in payload))
            return false;
        const p = payload;
        if (p.invType !== 1 /* InventoryType.Equip */)
            return false;
        const lx = x - this._root.x;
        const ly = y - this._root.y;
        if (lx >= 58 && lx < 90 && ly >= 40 && ly < 72) {
            this._selectedItemId = p.itemId;
            return true;
        }
        return false;
    }
    update(_dt) { }
    onResize(viewW, viewH) { this._viewW = viewW; this._viewH = viewH; }
}
//# sourceMappingURL=UnreleaseDlg.js.map