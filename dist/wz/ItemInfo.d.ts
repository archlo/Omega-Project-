import { WzPackage } from '../wz/WzPackage.js';
import { WzProperty } from '../wz/WzProperty.js';
export declare class ItemInfo {
    private _itemWz;
    private _characterWz;
    private _itemCache;
    private _categoryCache;
    private _charImgCache;
    constructor(_itemWz: WzPackage | null, _characterWz: WzPackage | null);
    GetItemProp(itemId: number): WzProperty | null;
    private _resolve;
    private _resolveCategoryPath;
    private _getCategory;
    private _categoryName;
}
//# sourceMappingURL=ItemInfo.d.ts.map