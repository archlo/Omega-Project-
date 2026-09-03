import { Container } from 'pixi.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
export interface WishItem {
    itemId: number;
    name: string;
    count: number;
    isCash: boolean;
}
export declare class UserInfoWishList {
    readonly container: Container<import("pixi.js").ContainerChild>;
    private _loader;
    private _bg;
    private _texts;
    private _scrollBar;
    private _scrollPos;
    private _items;
    private _btPresents;
    constructor(loader: WzTextureLoader, ui: WzPackage | null);
    setItems(items: WishItem[]): void;
    private _rebuild;
}
//# sourceMappingURL=UserInfoWishList.d.ts.map