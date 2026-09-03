import { GamePanel } from './GamePanel.js';
export declare class WildHunterInfo extends GamePanel {
    private _bg;
    private _title;
    private _body;
    private _closeBtn;
    private _closeLabel;
    private _packedByte;
    private _capturedMobIds;
    constructor();
    SetInfo(packedByte: number, capturedMobIds: number[]): void;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
    private _refresh;
    private _drawChrome;
    private _hit;
}
//# sourceMappingURL=WildHunterInfo.d.ts.map