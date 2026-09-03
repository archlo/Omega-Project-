import { GamePanel } from './GamePanel.js';
export interface StoreBankActionState {
    subAction: number;
    passingDay?: number;
    fee?: number;
    accountId?: number;
    value?: number;
    channel?: number;
}
export declare class StoreBank extends GamePanel {
    onGetAllConfirm: (() => void) | null;
    private _bg;
    private _title;
    private _body;
    private _okBtn;
    private _okLabel;
    private _closeBtn;
    private _closeLabel;
    private _lastResult;
    private _action;
    constructor();
    SetResult(resultCode: number): void;
    SetAction(action: StoreBankActionState): void;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
    private _refresh;
    private _drawChrome;
    private _hit;
}
//# sourceMappingURL=StoreBank.d.ts.map