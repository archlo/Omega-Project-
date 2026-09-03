import { GamePanel } from './GamePanel.js';
export declare class ReceiveGift extends GamePanel {
    private _bg;
    private _buttons;
    private _senderName;
    private _message;
    private _itemName;
    onAccept: ((senderName: string) => void) | null;
    onClose: (() => void) | null;
    constructor(opts?: {
        senderName?: string;
        message?: string;
        itemName?: string;
    });
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
    update(_dt: number): void;
}
//# sourceMappingURL=ReceiveGift.d.ts.map