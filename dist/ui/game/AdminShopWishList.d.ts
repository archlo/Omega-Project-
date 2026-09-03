import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
interface WishItem {
    itemId: number;
    name: string;
    count: number;
}
export declare class AdminShopWishList extends GamePanel {
    private _bg;
    private _items;
    onSelect: ((item: WishItem) => void) | null;
    onClose: (() => void) | null;
    constructor(opts?: {
        loader?: WzTextureLoader;
        uiWz?: WzPackage | null;
    });
    setItems(items: {
        itemId: number;
        name: string;
        count: number;
    }[]): void;
    handleMouseButton(x: number, y: number, _down: boolean): boolean;
    onKeyPress(key: string): boolean;
    update(_dt: number): void;
}
export {};
//# sourceMappingURL=AdminShopWishList.d.ts.map