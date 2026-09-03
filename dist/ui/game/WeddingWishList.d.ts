import { GamePanel } from './GamePanel.js';
import type { WeddingItemTab } from '../../net/handlers/PacketArgs.js';
export declare class WeddingWishList extends GamePanel {
    onGetItem: ((tab: number, index: number) => void) | null;
    private _bg;
    private _title;
    private _body;
    private _getBtn;
    private _getLabel;
    private _closeBtn;
    private _closeLabel;
    private _subAction;
    private _wishList;
    private _itemTabs;
    constructor();
    SetResult(subAction: number, wishList?: string[], itemTabs?: WeddingItemTab[]): void;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
    private _refresh;
    private _drawChrome;
    private _hit;
}
//# sourceMappingURL=WeddingWishList.d.ts.map