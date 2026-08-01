import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Button } from '../Button.js';
import type { WzTextureLoader } from '../../render/WzTextureLoader.js';
import type { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';

export class GamePanel {
  protected _root = new Container({ visible: false });

  private _isVisible = false;
  get isVisible(): boolean { return this._isVisible; }
  set isVisible(v: boolean) { this._isVisible = v; this._root.visible = v; }

  get container(): Container { return this._root; }

  // --- Window drag (OG: CWndMan::m_pDragWnd) ---
  draggable = true;
  private _wndDragging = false;
  private _wndDragOff = { x: 0, y: 0 };

  // --- Close button (OG: CUIWnd::m_pBtClose, id=1000) ---
  private _wndCloseBtn: Button | null = null;
  private _wndCloseX = 0;
  private _wndCloseY = 0;

  beginDrag(lx: number, ly: number, down: boolean): boolean {
    if (!this.draggable) return false;
    if (!down && this._wndDragging) {
      this._wndDragging = false;
      return true;
    }
    if (!down) return false;
    const b = this._root.getLocalBounds();
    if (lx < b.x || lx >= b.x + b.width || ly < b.y || ly >= b.y + b.height) return false;
    if (ly - b.y >= 22) return false;
    this._wndDragging = true;
    this._wndDragOff = { x: lx, y: ly };
    return true;
  }

  updateDrag(): void {
    if (!this._wndDragging) return;
    const mx = (window as any).__mouseX as number | undefined;
    const my = (window as any).__mouseY as number | undefined;
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
  createCloseButton(loader?: WzTextureLoader | null, uiWz?: WzPackage | null, btCloseType = 1, panelW?: number): void {
    if (btCloseType === 0) return; // No close button

    const pw = panelW ?? 184;

    // OG: close button position — top-right corner
    this._wndCloseX = pw - 18;
    this._wndCloseY = 6;

    // Try loading WZ close button
    let loaded = false;
    if (loader && uiWz) {
      // OG: BtCloseType 5 → "UI/Basic.img/BtClose3"
      // BtCloseType 4 → panel-specific close from Skill/main/BtClose etc.
      // BtCloseType 1-3 → StringPool-based close buttons
      const closePath = btCloseType === 5
        ? 'UI/Basic.img/BtClose3'
        : 'UI/Basic.img/BtClose';
      const node = uiWz.GetItem(closePath);
      if (node instanceof WzProperty) {
        const btn = Button.fromWz(loader, node);
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
      t.x = 4; t.y = 1;
      btn.container.addChild(g, t);
      btn.onClick = () => { this.isVisible = false; };
      btn.container.position.set(this._wndCloseX, this._wndCloseY);
      this._root.addChild(btn.container);
      this._wndCloseBtn = btn;
    }
  }

  /** OG: CUIWnd::OnButtonClicked(1000) — close button handler */
  onWndButtonClicked(nId: number): void {
    if (nId === 1000) {
      this.isVisible = false;
    }
  }

  update(_dt: number): void {}
  handleMouseButton(_x: number, _y: number, _down: boolean): boolean { return false; }
  onKeyPress(_key: string): boolean { return false; }

  resetButtonStates(): void {
    this._resetButtonsRecursive(this._root);
  }

  private _resetButtonsRecursive(c: Container): void {
    if ((c as any).__buttonInstance) {
      ((c as any).__buttonInstance as Button).resetState();
    }
    for (const child of c.children) {
      if (child instanceof Container) this._resetButtonsRecursive(child);
    }
  }
}
