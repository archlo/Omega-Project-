import { GamePanel } from './GamePanel.js';
import type { DragTarget } from '../DragController.js';
export declare class MegaphoneCompose extends GamePanel implements DragTarget {
    OnSend: ((invPos: number, itemId: number, message: string, isWhisper: boolean) => void) | null;
    private _invPos;
    private _itemId;
    private _targetTI;
    private _targetPOS;
    private readonly _gfx;
    constructor();
    Open(invPos: number, itemId: number): void;
    tryAcceptDrag(payload: unknown, _x: number, _y: number): boolean;
    update(_dt: number): void;
    handleMouseButton(_x: number, _y: number, _down: boolean): boolean;
    onKeyPress(_key: string): boolean;
}
//# sourceMappingURL=MegaphoneCompose.d.ts.map