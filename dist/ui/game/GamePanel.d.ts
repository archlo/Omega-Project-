import { Container } from 'pixi.js';
import type { WzTextureLoader } from '../../render/WzTextureLoader.js';
import type { WzPackage } from '../../wz/WzPackage.js';
export declare class GamePanel {
    private static _closeAssets;
    private static readonly _instances;
    protected _root: Container<import("pixi.js").ContainerChild>;
    private _isVisible;
    get isVisible(): boolean;
    set isVisible(v: boolean);
    get container(): Container;
    draggable: boolean;
    private _wndDragging;
    private _wndDragOff;
    private _wndCloseBtn;
    private _wndCloseX;
    private _wndCloseY;
    private _wndCloseType;
    private _wndPanelW;
    constructor();
    /** Called once UI.wz is ready so panels created before async WZ loading can
     * replace their temporary close button with the authentic BtClose sprite. */
    static configureCloseButtonAssets(loader: WzTextureLoader, uiWz: WzPackage): void;
    beginDrag(lx: number, ly: number, down: boolean): boolean;
    updateDrag(): void;
    /**
     * OG: CUIWnd::OnCreate — creates close button based on m_nBtCloseType.
     * Call this from subclass constructors after setting up the panel.
     *
     * @param loader - WZ texture loader for loading button assets
     * @param uiWz - UI WZ package for loading button backgrounds
     * @param btCloseType - Close button type (0=none, 1-5=WZ styles, default=1)
     * @param panelW - Panel width (for positioning close button at top-right)
     */
    createCloseButton(loader?: WzTextureLoader | null, uiWz?: WzPackage | null, btCloseType?: number, panelW?: number): void;
    private _upgradeCloseButton;
    /** OG: CUIWnd::OnButtonClicked(1000) — close button handler */
    onWndButtonClicked(nId: number): void;
    update(_dt: number): void;
    onMouseWheel(x: number, y: number, delta: number): void;
    handleMouseButton(_x: number, _y: number, _down: boolean): boolean;
    onKeyPress(_key: string): boolean;
    resetButtonStates(): void;
    private _resetButtonsRecursive;
    private _dispatchScrollbarWheel;
}
//# sourceMappingURL=GamePanel.d.ts.map