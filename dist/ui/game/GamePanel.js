import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Button } from '../Button.js';
import { WzProperty } from '../../wz/WzProperty.js';
export class GamePanel {
    static _closeAssets = null;
    static _instances = new Set();
    _root = new Container({ visible: false });
    _isVisible = false;
    get isVisible() { return this._isVisible; }
    set isVisible(v) { this._isVisible = v; this._root.visible = v; }
    get container() { return this._root; }
    // --- Window drag (OG: CWndMan::m_pDragWnd) ---
    draggable = true;
    _wndDragging = false;
    _wndDragOff = { x: 0, y: 0 };
    // --- Close button (OG: CUIWnd::m_pBtClose, id=1000) ---
    _wndCloseBtn = null;
    _wndCloseX = 0;
    _wndCloseY = 0;
    _wndCloseType = 0;
    _wndPanelW = 184;
    constructor() {
        GamePanel._instances.add(this);
    }
    /** Called once UI.wz is ready so panels created before async WZ loading can
     * replace their temporary close button with the authentic BtClose sprite. */
    static configureCloseButtonAssets(loader, uiWz) {
        GamePanel._closeAssets = { loader, uiWz };
        for (const panel of GamePanel._instances)
            panel._upgradeCloseButton();
    }
    beginDrag(lx, ly, down) {
        if (!this.draggable)
            return false;
        if (!down && this._wndDragging) {
            this._wndDragging = false;
            return true;
        }
        if (!down)
            return false;
        const b = this._root.getLocalBounds();
        if (lx < b.x || lx >= b.x + b.width || ly < b.y || ly >= b.y + b.height)
            return false;
        if (ly - b.y >= 22)
            return false;
        this._wndDragging = true;
        this._wndDragOff = { x: lx, y: ly };
        return true;
    }
    updateDrag() {
        if (!this._wndDragging)
            return;
        const mx = window.__mouseX;
        const my = window.__mouseY;
        if (mx !== undefined && my !== undefined) {
            this._root.x = mx - this._wndDragOff.x;
            this._root.y = my - this._wndDragOff.y;
        }
    }
    /**
     * OG: CUIWnd::OnCreate — creates close button based on m_nBtCloseType.
     * Call this from subclass constructors after setting up the panel.
     *
     * @param loader - WZ texture loader for loading button assets
     * @param uiWz - UI WZ package for loading button backgrounds
     * @param btCloseType - Close button type (0=none, 1-5=WZ styles, default=1)
     * @param panelW - Panel width (for positioning close button at top-right)
     */
    createCloseButton(loader, uiWz, btCloseType = 1, panelW) {
        if (btCloseType === 0)
            return; // No close button
        const pw = panelW ?? 184;
        this._wndCloseType = btCloseType;
        this._wndPanelW = pw;
        // OG: close button position — top-right corner
        this._wndCloseX = pw - 18;
        this._wndCloseY = 6;
        // Try loading WZ close button. If this panel was constructed before the
        // async UI package loaded, use the shared asset provider instead.
        const assets = loader && uiWz
            ? { loader, uiWz }
            : GamePanel._closeAssets;
        let loaded = false;
        if (assets) {
            // OG: BtCloseType 5 → "UI/Basic.img/BtClose3"
            // BtCloseType 4 → panel-specific close from Skill/main/BtClose etc.
            // BtCloseType 1-3 → StringPool-based close buttons
            const closePath = btCloseType === 5
                ? 'UI/Basic.img/BtClose3'
                : 'UI/Basic.img/BtClose';
            const node = assets.uiWz.GetItem(closePath);
            if (node instanceof WzProperty) {
                const btn = Button.fromWz(assets.loader, node);
                btn.onClick = () => { this.isVisible = false; };
                btn.container.position.set(this._wndCloseX, this._wndCloseY);
                this._root.addChild(btn.container);
                this._wndCloseBtn = btn;
                loaded = true;
            }
        }
        // Fallback: simple "X" graphics button
        if (!loaded) {
            const btn = new Button();
            const g = new Graphics();
            g.rect(0, 0, 14, 14).fill({ color: 0x1a1a2e, alpha: 0.9 });
            g.rect(0, 0, 14, 14).stroke({ color: 0x505570, width: 1 });
            const t = new Text({ text: 'X', style: new TextStyle({ fill: 0xCCCCEE, fontSize: 10, fontFamily: 'monospace' }) });
            t.x = 4;
            t.y = 1;
            btn.container.addChild(g, t);
            btn.onClick = () => { this.isVisible = false; };
            btn.container.position.set(this._wndCloseX, this._wndCloseY);
            this._root.addChild(btn.container);
            this._wndCloseBtn = btn;
        }
    }
    _upgradeCloseButton() {
        if (this._wndCloseType === 0 || !GamePanel._closeAssets || !this._wndCloseBtn)
            return;
        const assets = GamePanel._closeAssets;
        const closePath = this._wndCloseType === 5 ? 'UI/Basic.img/BtClose3' : 'UI/Basic.img/BtClose';
        const node = assets.uiWz.GetItem(closePath);
        if (!(node instanceof WzProperty))
            return;
        const old = this._wndCloseBtn;
        const visible = old.container.visible;
        const btn = Button.fromWz(assets.loader, node);
        btn.onClick = () => { this.isVisible = false; };
        btn.container.position.set(this._wndCloseX, this._wndCloseY);
        btn.container.visible = visible;
        old.container.removeFromParent();
        old.container.destroy({ children: true });
        this._root.addChild(btn.container);
        this._wndCloseBtn = btn;
    }
    /** OG: CUIWnd::OnButtonClicked(1000) — close button handler */
    onWndButtonClicked(nId) {
        if (nId === 1000) {
            this.isVisible = false;
        }
    }
    update(_dt) { }
    onMouseWheel(x, y, delta) {
        this._dispatchScrollbarWheel(this._root, x - this._root.x, y - this._root.y, delta);
    }
    handleMouseButton(_x, _y, _down) { return false; }
    onKeyPress(_key) { return false; }
    resetButtonStates() {
        this._resetButtonsRecursive(this._root);
    }
    _resetButtonsRecursive(c) {
        if (c.__buttonInstance) {
            c.__buttonInstance.resetState();
        }
        for (const child of c.children) {
            if (child instanceof Container)
                this._resetButtonsRecursive(child);
        }
    }
    _dispatchScrollbarWheel(c, x, y, delta) {
        const scrollbar = c.__scrollBarInstance;
        if (scrollbar?.handleMouseWheel?.(x - c.x, y - c.y, delta))
            return true;
        for (const child of c.children) {
            if (child instanceof Container && this._dispatchScrollbarWheel(child, x, y, delta))
                return true;
        }
        return false;
    }
}
//# sourceMappingURL=GamePanel.js.map