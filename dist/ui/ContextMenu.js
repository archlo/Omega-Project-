import { Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './game/GamePanel.js';
const ITEM_H = 20;
const PAD_X = 8;
const PAD_Y = 4;
const SEPARATOR_H = 8;
const MIN_W = 100;
const MAX_W = 300;
const FRAME_W = 800;
const FRAME_H = 600;
const HOVER_COLOR = 0x3C4164;
const BG_COLOR = 0x0F0F19;
const BG_ALPHA = 0.92;
const BORDER_COLOR = 0x444444;
const TEXT_COLOR = '#FFF';
const DISABLED_COLOR = '#666';
const SEPARATOR_COLOR = 0x444444;
const _textStyle = new TextStyle({ fill: TEXT_COLOR, fontSize: 11, fontFamily: 'monospace' });
const _disabledStyle = new TextStyle({ fill: DISABLED_COLOR, fontSize: 11, fontFamily: 'monospace' });
export class ContextMenu extends GamePanel {
    _entries = [];
    _bg = new Graphics();
    _hoverBg = new Graphics();
    _texts = [];
    _itemBounds = [];
    _menuW = 0;
    _menuH = 0;
    _hoveredIndex = -1;
    _mouseLeaveTimer = null;
    _onDismiss = null;
    _dynamicChildren = [];
    constructor() {
        super();
        this.draggable = false;
        this._root.addChild(this._bg);
        this._root.addChild(this._hoverBg);
    }
    /** Show the context menu at screen position (x, y) with the given entries. */
    show(x, y, entries, onDismiss) {
        this._entries = entries;
        this._onDismiss = onDismiss ?? null;
        this._hoveredIndex = -1;
        this._clearMouseLeaveTimer();
        this._rebuild();
        this._positionMenu(x, y);
        this.isVisible = true;
    }
    /** Hide and clear the context menu. */
    close() {
        this.isVisible = false;
        this._clearMouseLeaveTimer();
        this._onDismiss?.();
    }
    // --- Layout ---
    _rebuild() {
        // Clean previous dynamic children
        for (const c of this._dynamicChildren)
            c.destroy();
        this._dynamicChildren = [];
        this._texts = [];
        this._itemBounds = [];
        const ctx = document.createElement('canvas').getContext('2d');
        ctx.font = `${_textStyle.fontSize}px ${_textStyle.fontFamily}`;
        // Measure max label width
        let maxLabelW = 0;
        for (const e of this._entries) {
            if ('separator' in e)
                continue;
            const w = ctx.measureText(e.label).width;
            if (w > maxLabelW)
                maxLabelW = w;
        }
        this._menuW = Math.max(MIN_W, Math.min(MAX_W, Math.ceil(maxLabelW) + PAD_X * 2 + 4));
        // Compute height and lay out items
        let curY = PAD_Y;
        let index = 0;
        for (const entry of this._entries) {
            if ('separator' in entry) {
                this._itemBounds.push({ x: 0, y: curY, w: this._menuW, h: SEPARATOR_H, index: -1 });
                curY += SEPARATOR_H;
                continue;
            }
            const item = entry;
            const t = new Text({
                text: item.label,
                style: item.enabled === false ? _disabledStyle : _textStyle,
            });
            t.x = PAD_X;
            t.y = curY + 3;
            this._root.addChild(t);
            this._texts.push(t);
            this._dynamicChildren.push(t);
            this._itemBounds.push({ x: 0, y: curY, w: this._menuW, h: ITEM_H, index });
            curY += ITEM_H;
            index++;
        }
        this._menuH = curY + PAD_Y;
        // Draw background
        this._bg.clear();
        this._bg.rect(0, 0, this._menuW, this._menuH).fill({ color: BG_COLOR, alpha: BG_ALPHA });
        this._bg.rect(0, 0, this._menuW, this._menuH).stroke({ color: BORDER_COLOR, width: 1 });
        // Draw separators
        for (const b of this._itemBounds) {
            if (b.index === -1) {
                this._bg.rect(PAD_X, b.y + 3, this._menuW - PAD_X * 2, 1).fill({ color: SEPARATOR_COLOR });
            }
        }
        // Hover background (initially hidden)
        this._hoverBg.clear();
        this._hoverBg.visible = false;
    }
    _positionMenu(x, y) {
        // Clamp to frame bounds
        if (x + this._menuW > FRAME_W)
            x = FRAME_W - this._menuW;
        if (y + this._menuH > FRAME_H)
            y = FRAME_H - this._menuH;
        if (x < 0)
            x = 0;
        if (y < 0)
            y = 0;
        this._root.x = x;
        this._root.y = y;
    }
    // --- Hover ---
    _updateHover(lx, ly) {
        let found = -1;
        for (let i = 0; i < this._itemBounds.length; i++) {
            const b = this._itemBounds[i];
            if (b.index === -1)
                continue; // separator
            if (lx >= b.x && lx < b.x + b.w && ly >= b.y && ly < b.y + b.h) {
                found = i;
                break;
            }
        }
        if (found === this._hoveredIndex)
            return;
        this._hoveredIndex = found;
        this._hoverBg.clear();
        if (found >= 0) {
            const b = this._itemBounds[found];
            this._hoverBg.rect(1, b.y, this._menuW - 2, b.h).fill({ color: HOVER_COLOR, alpha: 0.6 });
            this._hoverBg.visible = true;
        }
        else {
            this._hoverBg.visible = false;
        }
        // Reset mouse-leave timer on movement within the menu
        this._clearMouseLeaveTimer();
    }
    // --- Mouse-leave auto-close ---
    _clearMouseLeaveTimer() {
        if (this._mouseLeaveTimer !== null) {
            clearTimeout(this._mouseLeaveTimer);
            this._mouseLeaveTimer = null;
        }
    }
    _scheduleMouseLeaveClose() {
        this._clearMouseLeaveTimer();
        this._mouseLeaveTimer = setTimeout(() => {
            if (this.isVisible)
                this.close();
        }, 500);
    }
    // --- Input ---
    onMouseMove(x, y) {
        if (!this.isVisible)
            return;
        const lx = x - this._root.x;
        const ly = y - this._root.y;
        if (lx >= 0 && lx < this._menuW && ly >= 0 && ly < this._menuH) {
            this._updateHover(lx, ly);
        }
        else {
            // Mouse is outside menu bounds — start leave timer
            if (this._hoveredIndex >= 0) {
                this._hoveredIndex = -1;
                this._hoverBg.clear();
                this._hoverBg.visible = false;
            }
            this._scheduleMouseLeaveClose();
        }
    }
    handleMouseButton(x, y, down) {
        if (!this.isVisible)
            return false;
        // Mouse up outside menu → close (outside click)
        if (!down) {
            const lx = x - this._root.x;
            const ly = y - this._root.y;
            if (lx < 0 || lx >= this._menuW || ly < 0 || ly >= this._menuH) {
                this.close();
                return true;
            }
            return false;
        }
        // Mouse down inside menu
        const lx = x - this._root.x;
        const ly = y - this._root.y;
        if (lx < 0 || lx >= this._menuW || ly < 0 || ly >= this._menuH) {
            this.close();
            return true;
        }
        // Find which item was clicked
        for (const b of this._itemBounds) {
            if (b.index === -1)
                continue;
            if (lx >= b.x && lx < b.x + b.w && ly >= b.y && ly < b.y + b.h) {
                const entry = this._entries[this._itemBounds.indexOf(b)];
                if (entry && !('separator' in entry)) {
                    const item = entry;
                    if (item.enabled !== false && item.onClick) {
                        this.close();
                        item.onClick();
                    }
                }
                return true;
            }
        }
        // Click on separator or empty space inside menu
        return true;
    }
    onKeyPress(key) {
        if (!this.isVisible)
            return false;
        if (key === 'Escape') {
            this.close();
            return true;
        }
        return true; // consume all keys while menu is open
    }
}
//# sourceMappingURL=ContextMenu.js.map