import { Container, Sprite, Texture } from 'pixi.js';

/**
 * OG: `IDraggable`/`CWndMan::BeginDragDrop` (IDA 0x9b3380) +
 * `IDraggable::OnDropped` (IDA 0x5001c0). TODO_AUDIT.md Ninety-seventh pass:
 * this client had no generic drag-and-drop system at all, the real root
 * cause behind several "dead wiring" bugs (`QuickSlotBar.TryBindSkillAt`,
 * `GameSender.GuildCreate` had no caller because nothing could ever start
 * a drag). Minimal port: no IUIMsgHandler/IGObj plumbing, just
 * mousedown-start / mousemove-follow / mouseup-dispatch-to-whichever-target-
 * claims-it, matching `OnDropped(pFrom, pTo, rx, ry)`'s claim-or-decline shape.
 */
export interface DragTarget {
  /** Mirrors `IDraggable::OnDropped` — return true if this panel accepted
   * the drop at (x, y) in screen coordinates, false to let the next
   * candidate target try. */
  tryAcceptDrag(payload: unknown, x: number, y: number): boolean;
}

export class DragController {
  readonly container = new Container();
  private _icon: Sprite | null = null;
  private _payload: unknown = null;

  get isDragging(): boolean { return this._payload !== null; }
  /** Peek the in-flight payload before calling `endDrag` (which clears it) —
   * lets a caller apply a fallback action when no target claims the drop. */
  get payload(): unknown { return this._payload; }

  beginDrag(payload: unknown, texture: Texture, x: number, y: number): void {
    this.cancelDrag();
    this._payload = payload;
    this._icon = new Sprite(texture);
    this._icon.anchor.set(0.5);
    this._icon.alpha = 0.8;
    this._icon.x = x;
    this._icon.y = y;
    this.container.addChild(this._icon);
  }

  updatePosition(x: number, y: number): void {
    if (this._icon) { this._icon.x = x; this._icon.y = y; }
  }

  /** Mouse-up: offer the payload to each target in z-order (topmost first). */
  endDrag(targets: ReadonlyArray<DragTarget | null | undefined>, x: number, y: number): boolean {
    const payload = this._payload;
    this.cancelDrag();
    if (payload === null) return false;
    for (const t of targets) {
      if (typeof t?.tryAcceptDrag === 'function' && t.tryAcceptDrag(payload, x, y)) return true;
    }
    return false;
  }

  cancelDrag(): void {
    this._payload = null;
    if (this._icon) { this.container.removeChild(this._icon); this._icon = null; }
  }
}
