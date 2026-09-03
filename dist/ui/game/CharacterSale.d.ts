import { GamePanel } from './GamePanel.js';
export declare class CharacterSale extends GamePanel {
    onCheckName: ((name: string) => void) | null;
    private _bg;
    private _title;
    private _body;
    private _checkBtn;
    private _checkLabel;
    private _closeBtn;
    private _closeLabel;
    private _lastCheck;
    private _lastCreate;
    constructor();
    Open(): void;
    SetCheckResult(id: string, resultCode: number): void;
    SetCreateResult(mode: number, code: number): void;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
    private _refresh;
    private _drawChrome;
    private _hit;
}
//# sourceMappingURL=CharacterSale.d.ts.map