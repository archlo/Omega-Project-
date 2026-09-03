import { Container } from 'pixi.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
export interface DetailItem {
    itemId: number;
    name: string;
    info: string;
}
export declare class UserInfoDetail {
    readonly container: Container<import("pixi.js").ContainerChild>;
    private _loader;
    private _bg;
    private _texts;
    private _scrollBar;
    private _scrollPos;
    private _items;
    constructor(loader: WzTextureLoader, ui: WzPackage | null);
    setItems(chairItems: DetailItem[], wishItems: DetailItem[]): void;
    private _rebuild;
}
//# sourceMappingURL=UserInfoDetail.d.ts.map