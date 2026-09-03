import { GamePanel } from './GamePanel.js';
export declare class LogoutGift extends GamePanel {
    private _bg;
    private _title;
    private _body;
    private _closeBtn;
    private _closeLabel;
    constructor();
    Open(): void;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
    private _drawChrome;
    private _hit;
}
//# sourceMappingURL=LogoutGift.d.ts.map