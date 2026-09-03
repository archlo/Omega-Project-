import { Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { TooltipAssets } from './TooltipAssets.js';
import { ItemTooltip } from './ItemTooltip.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { Button } from '../Button.js';
// OG: CUIItemUpgrade — inherits CUniqueModeless (modeless dialog).
// Constructor: (COutPacket, nPOS, nItemID) — pre-built packet + slot position + item ID.
// WZ: UI/UIWindow2.img/ItemUpgrade/backgrnd (from StringPool(0x13CB)).
// Has: m_pBtCancel, m_pBtUpgrade, m_pSelectedItem, m_uiToolTip, m_oPacket, m_oResultPacket
//       m_pCanvas_GaugeBar, m_pCanvas_GaugeBarBack, m_nState, m_bRequestSent
const PANEL_W = 215;
const PANEL_H = 164;
export class ItemUpgrade extends GamePanel {
    _bg;
    _wzBg;
    _loader;
    _font;
    _icons;
    _tooltip;
    _viewW = 800;
    _viewH = 600;
    _slotIcon;
    _gradeFrame;
    _gaugeBar;
    _gaugeBarBack;
    _btUpgrade = null;
    _btCancel = null;
    _buttons = [];
    // OG: CUIItemUpgrade fields
    _nPOS = 0;
    _nItemID = 0;
    _selectedItemId = 0;
    _selectedItemName = '';
    _selectedItemGrade = 0;
    _nState = 0; // 0=idle, 1=upgrading, 2=done
    _bRequestSent = false;
    _gaugeProgress = 0;
    _gaugeTarget = 0;
    _mouseX = 0;
    _mouseY = 0;
    // Callbacks
    onUpgrade = null;
    onClose = null;
    constructor(opts) {
        super();
        this._nPOS = opts.nPOS;
        this._nItemID = opts.nItemID;
        this._loader = opts.loader ?? null;
        this._font = opts.font ?? null;
        this._icons = opts.icons ?? null;
        if (opts.font && opts.icons) {
            const assets = new TooltipAssets(opts.loader ?? new WzTextureLoader(), opts.uiWz ?? null);
            this._tooltip = new ItemTooltip(opts.font, opts.icons, assets, opts.descOf ?? null, opts.setItemOf ?? null, opts.optionOf ?? null, opts.itemInfo ?? null, opts.strings ?? null);
        }
        else {
            this._tooltip = null;
        }
        // Load WZ background
        const bgNode = opts.uiWz?.GetItem('UIWindow2.img/ItemUpgrade/backgrnd');
        this._wzBg = (bgNode instanceof WzCanvas && opts.loader) ? opts.loader.Load(bgNode) : null;
        this._bg = new Graphics();
        this._root.addChild(this._bg);
        if (this._wzBg) {
            const s = this._wzBg.ToPixi();
            this._root.addChild(s);
        }
        else {
            this._rebuildBg();
        }
        // Item slot icon (center of dialog)
        this._slotIcon = new Sprite(Texture.EMPTY);
        this._slotIcon.x = 88;
        this._slotIcon.y = 55;
        this._root.addChild(this._slotIcon);
        // Grade frame
        this._gradeFrame = new Graphics();
        this._root.addChild(this._gradeFrame);
        // Gauge bar background
        this._gaugeBarBack = new Graphics();
        this._gaugeBarBack.rect(40, 120, 135, 12).fill({ color: '#1A1D2E' });
        this._gaugeBarBack.rect(40, 120, 135, 12).stroke({ color: '#3C4164', width: 1 });
        this._root.addChild(this._gaugeBarBack);
        // Gauge bar (progress)
        this._gaugeBar = new Graphics();
        this._root.addChild(this._gaugeBar);
        // Create buttons from WZ
        const charProp = opts.uiWz?.GetItem('UIWindow2.img/ItemUpgrade') instanceof WzProperty
            ? opts.uiWz.GetItem('UIWindow2.img/ItemUpgrade') : null;
        if (opts.loader && charProp) {
            // OG: BtUpgrade — upgrade button
            const btUpgradeNode = charProp.Get('BtUpgrade');
            if (btUpgradeNode instanceof WzProperty) {
                this._btUpgrade = Button.fromWz(opts.loader, btUpgradeNode, 'Upgrade');
                this._btUpgrade.onClick = () => this._doUpgrade();
                this._buttons.push(this._btUpgrade);
                this._root.addChild(this._btUpgrade.container);
            }
            // OG: BtCancel — cancel button
            const btCancelNode = charProp.Get('BtCancel');
            if (btCancelNode instanceof WzProperty) {
                this._btCancel = Button.fromWz(opts.loader, btCancelNode, 'Cancel');
                this._btCancel.onClick = () => this._doClose();
                this._buttons.push(this._btCancel);
                this._root.addChild(this._btCancel.container);
            }
        }
        // Fallback buttons if WZ unavailable
        if (!this._btUpgrade) {
            const btnStyle = new TextStyle({ fill: '#DCC896', fontSize: 11, fontFamily: 'monospace' });
            const upgradeBtn = new Text({ text: 'Upgrade', style: btnStyle });
            upgradeBtn.x = 88;
            upgradeBtn.y = 140;
            upgradeBtn.eventMode = 'static';
            upgradeBtn.cursor = 'pointer';
            upgradeBtn.on('pointertap', () => this._doUpgrade());
            this._root.addChild(upgradeBtn);
        }
        if (!this._btCancel) {
            const btnStyle = new TextStyle({ fill: '#DCC896', fontSize: 11, fontFamily: 'monospace' });
            const cancelBtn = new Text({ text: 'Cancel', style: btnStyle });
            cancelBtn.x = 148;
            cancelBtn.y = 140;
            cancelBtn.eventMode = 'static';
            cancelBtn.cursor = 'pointer';
            cancelBtn.on('pointertap', () => this._doClose());
            this._root.addChild(cancelBtn);
        }
        // Set item in slot
        this._setItem(opts.nItemID);
    }
    _rebuildBg() {
        this._bg.clear();
        this._bg.rect(0, 0, PANEL_W, PANEL_H).fill({ color: '#0C0E18', alpha: 240 / 255 });
        this._bg.rect(0, 0, PANEL_W, PANEL_H).stroke({ color: '#3C4164', width: 1 });
        this._bg.rect(0, 0, PANEL_W, 22).fill({ color: '#0F1224' });
    }
    _setItem(itemId) {
        this._selectedItemId = itemId;
        if (this._icons) {
            const icon = this._icons.LoadIcon(itemId);
            if (icon) {
                this._slotIcon.texture = icon.Texture;
            }
        }
    }
    _doUpgrade() {
        if (this._bRequestSent || this._nState !== 0)
            return;
        this._bRequestSent = true;
        this._nState = 1;
        this._gaugeTarget = 1;
        this.onUpgrade?.(this._nPOS, this._nItemID);
    }
    _doClose() {
        this.onClose?.();
        this.isVisible = false;
    }
    // OG: ShowResult — show upgrade result animation
    showResult(success) {
        this._nState = 2;
        this._gaugeTarget = success ? 1 : 0;
        this._bRequestSent = false;
    }
    putItem(itemId) {
        this._setItem(itemId);
        this._nState = 0;
        this._bRequestSent = false;
        this._gaugeProgress = 0;
        this._gaugeTarget = 0;
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
    onMouseMove(x, y) {
        this._mouseX = x;
        this._mouseY = y;
    }
    onKeyPress(key) {
        if (key === 'Escape' && this.isVisible) {
            this._doClose();
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
        if (lx >= 72 && lx < 108 && ly >= 39 && ly < 75) {
            this._setItem(p.itemId);
            return true;
        }
        return false;
    }
    update(dt) {
        if (!this.isVisible) {
            this._tooltip?.Hide();
            return;
        }
        // Animate gauge bar
        if (this._gaugeProgress !== this._gaugeTarget) {
            const diff = this._gaugeTarget - this._gaugeProgress;
            this._gaugeProgress += Math.sign(diff) * Math.min(Math.abs(diff), 0.02 * dt);
            if (Math.abs(this._gaugeTarget - this._gaugeProgress) < 0.01) {
                this._gaugeProgress = this._gaugeTarget;
            }
        }
        // Draw gauge bar
        this._gaugeBar.clear();
        const gaugeW = Math.floor(133 * this._gaugeProgress);
        if (gaugeW > 0) {
            const color = this._nState === 2 ? (this._gaugeProgress >= 1 ? 0x55EE77 : 0xFF4444) : 0x5CA1FF;
            this._gaugeBar.rect(41, 121, gaugeW, 10).fill({ color, alpha: 0.8 });
        }
        // Draw grade frame
        this._gradeFrame.clear();
        if (this._selectedItemGrade > 0) {
            let color;
            switch (this._selectedItemGrade) {
                case 1:
                    color = 0x5CA1FF;
                    break;
                case 2:
                    color = 0xC261FF;
                    break;
                case 3:
                    color = 0xFF0066;
                    break;
                case 4:
                    color = 0x55EE77;
                    break;
                default: color = 0;
            }
            if (color) {
                this._gradeFrame.rect(88, 55, 32, 1).fill({ color, alpha: 0.7 });
                this._gradeFrame.rect(88, 86, 32, 1).fill({ color, alpha: 0.7 });
                this._gradeFrame.rect(88, 55, 1, 32).fill({ color, alpha: 0.7 });
                this._gradeFrame.rect(119, 55, 1, 32).fill({ color, alpha: 0.7 });
            }
        }
        // Tooltip
        if (this._selectedItemId && this._tooltip) {
            this._tooltip.Draw(this._selectedItemId, this._selectedItemName, 0, 1, this._mouseX, this._mouseY, this._viewW, this._viewH, 0);
        }
    }
    onResize(viewW, viewH) {
        this._viewW = viewW;
        this._viewH = viewH;
    }
}
//# sourceMappingURL=ItemUpgrade.js.map