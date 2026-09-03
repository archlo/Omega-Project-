import { GamePanel } from './GamePanel.js';
export declare class Parcel extends GamePanel {
    private _bg;
    private _title;
    private _body;
    private _closeBtn;
    private _closeLabel;
    private _subAction;
    constructor();
    SetSubAction(subAction: number): void;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
    private _refresh;
    private _drawChrome;
    private _hit;
}
//# sourceMappingURL=Parcel.d.ts.map