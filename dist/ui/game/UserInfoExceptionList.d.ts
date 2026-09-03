import { Container } from 'pixi.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
export declare class UserInfoExceptionList {
    readonly container: Container<import("pixi.js").ContainerChild>;
    private _loader;
    private _bg;
    private _texts;
    private _highlights;
    private _scrollBar;
    private _scrollPos;
    private _items;
    private _selectedIndex;
    private _mouseOverIndex;
    private _btMeso;
    private _btRegist;
    private _btDelete;
    onRemove: ((selectedIdx: number) => void) | null;
    onAddAll: (() => void) | null;
    onOpenSearch: (() => void) | null;
    constructor(loader: WzTextureLoader, ui: WzPackage | null);
    setItems(itemIds: number[]): void;
    handleClick(lx: number, ly: number): boolean;
    handleMouseMove(lx: number, ly: number): void;
    private _rebuild;
}
//# sourceMappingURL=UserInfoExceptionList.d.ts.map