import { GamePanel } from './GamePanel.js';
import type { IncubatorResultArgs } from '../../net/handlers/PacketArgs.js';
import type { DragTarget } from '../DragController.js';
export declare class Incubator extends GamePanel implements DragTarget {
    private _bg;
    private _title;
    private _body;
    private _eggSlot;
    private _eggSlotLabel;
    private _hintText;
    private _closeBtn;
    private _closeLabel;
    private _selectedItemId;
    private _selectedSlotPos;
    private _selectedItemTI;
    private _itemName;
    private _result;
    constructor();
    /** OG: CUIIncubator::PutItem — accepts an egg item for incubation. */
    PutItem(pItem: {
        itemId: number;
        slotPos: number;
        ti: number;
    }): boolean;
    /** Called when the server sends an incubation result. */
    SetResult(result: IncubatorResultArgs, itemName: string): void;
    /** OG: HitTest — click above 24px = zone 1, below = zone 2. */
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    /** OG: OnKey — Enter or Escape closes. */
    onKeyPress(key: string): boolean;
    /** DragTarget: accept egg item drops. */
    tryAcceptDrag(payload: unknown, _x: number, _y: number): boolean;
    private _refresh;
    private _drawChrome;
    /** OG: Click zone: top 24px = title bar (draggable). */
    beginDrag(lx: number, ly: number, down: boolean): boolean;
}
//# sourceMappingURL=Incubator.d.ts.map