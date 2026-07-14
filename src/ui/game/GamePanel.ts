import { Container } from 'pixi.js';
import { Button } from '../Button.js';

export class GamePanel {
  // Pixi's Container defaults to visible:true; field initializers don't go
  // through the isVisible setter below, so this has to be set explicitly or
  // every panel would render from the moment it's constructed, regardless
  // of whether its own constructor happens to call `this.isVisible = false`.
  protected _root = new Container({ visible: false });

  // Pixi's actual render visibility lives on `_root.visible`, not on this
  // flag — several panels only ever set `isVisible` and relied on that
  // alone to make themselves appear, which silently did nothing since
  // nothing else touched `_root.visible` for them. Keeping them in lockstep
  // here fixes every such panel at once instead of patching each site.
  private _isVisible = false;
  get isVisible(): boolean { return this._isVisible; }
  set isVisible(v: boolean) { this._isVisible = v; this._root.visible = v; }

  get container(): Container { return this._root; }

  // --- Generic window drag support (OG: CWndMan::m_pDragWnd) ---
  /** Override to false for fixed-position panels (StatusBar, ChatBar, HUDs). */
  draggable = true;
  private _wndDragging = false;
  private _wndDragOff = { x: 0, y: 0 };

  /** Check if local coords (lx, ly) hit the panel's title bar.
   *  Uses getLocalBounds() so it works regardless of how the panel
   *  positions its children. Returns true if drag started or click consumed. */
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

  /** Move the panel during drag. */
  updateDrag(): void {
    if (!this._wndDragging) return;
    const mx = (window as any).__mouseX as number | undefined;
    const my = (window as any).__mouseY as number | undefined;
    if (mx !== undefined && my !== undefined) {
      this._root.x = mx - this._wndDragOff.x;
      this._root.y = my - this._wndDragOff.y;
    }
  }

  update(_dt: number): void {}
  handleMouseButton(_x: number, _y: number, _down: boolean): boolean { return false; }
  onKeyPress(_key: string): boolean { return false; }

  /** Reset pressed/hover state on all buttons in this panel's container tree. */
  resetButtonStates(): void {
    this._resetButtonsRecursive(this._root);
  }

  private _resetButtonsRecursive(c: Container): void {
    // Check if this container is a Button's container
    if ((c as any).__buttonInstance) {
      ((c as any).__buttonInstance as Button).resetState();
    }
    for (const child of c.children) {
      if (child instanceof Container) this._resetButtonsRecursive(child);
    }
  }
}
