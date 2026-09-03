import { GamePanel } from './GamePanel.js';
export interface ShopScannerDisplayItem {
    id: number;
    name: string;
    price: number;
}
export declare class ShopScanner extends GamePanel {
    private _bg;
    private _title;
    private _body;
    private _closeBtn;
    private _closeLabel;
    private _subType;
    private _items;
    constructor();
    SetResult(subType: number, items?: ShopScannerDisplayItem[]): void;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
    private _refresh;
    private _drawChrome;
    private _hit;
}
//# sourceMappingURL=ShopScanner.d.ts.map