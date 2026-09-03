import { GamePanel } from './GamePanel.js';
export declare class CakePieEventItemInfo extends GamePanel {
    private _bg;
    private _slotIcon;
    private _itemCount;
    private _requiredCount;
    private _eventName;
    private _itemId;
    onUse: ((itemId: number) => void) | null;
    onClose: (() => void) | null;
    constructor(opts?: {
        eventName?: string;
        itemId?: number;
        itemCount?: number;
        requiredCount?: number;
    });
    setItemCount(count: number): void;
    handleMouseButton(x: number, y: number, _down: boolean): boolean;
    onKeyPress(key: string): boolean;
    update(_dt: number): void;
}
//# sourceMappingURL=CakePieEventItemInfo.d.ts.map