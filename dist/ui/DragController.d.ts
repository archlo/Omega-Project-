import { Container, Texture } from 'pixi.js';
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
export declare class DragController {
    readonly container: Container<import("pixi.js").ContainerChild>;
    private _icon;
    private _payload;
    get isDragging(): boolean;
    /** Peek the in-flight payload before calling `endDrag` (which clears it) —
     * lets a caller apply a fallback action when no target claims the drop. */
    get payload(): unknown;
    beginDrag(payload: unknown, texture: Texture, x: number, y: number): void;
    updatePosition(x: number, y: number): void;
    /** Mouse-up: offer the payload to each target in z-order (topmost first). */
    endDrag(targets: ReadonlyArray<DragTarget | null | undefined>, x: number, y: number): boolean;
    cancelDrag(): void;
}
//# sourceMappingURL=DragController.d.ts.map