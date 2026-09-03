import { Container } from 'pixi.js';
export interface TabItem {
    label: string;
    enabled: boolean;
    x: number;
    width: number;
}
export interface TabCreateParams {
    type?: number;
    customHeight?: number;
    tabSpace?: number;
    bDrawBaseImage?: boolean;
    bSameWidth?: boolean;
}
export declare class CCtrlTab {
    readonly container: Container<import("pixi.js").ContainerChild>;
    readonly id: number;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    private _type;
    private _tabSpace;
    private _bDrawBaseImage;
    private _bSameWidth;
    private _items;
    private _curTab;
    private _parent;
    private _bg;
    private _tabTexts;
    private _normalFont;
    private _selectedFont;
    constructor(id: number, x: number, y: number, width: number, params?: TabCreateParams);
    setParent(p: {
        onTabChanged?: (tab: number) => void;
        onChildNotify?: (nId: number, param1: number, param2: number) => void;
    }): void;
    addItem(label: string, enabled?: boolean): void;
    removeAllItems(): void;
    setTab(nTab: number): void;
    get curTab(): number;
    get itemCount(): number;
    private _relocateTabPos;
    private _redraw;
    handleMouseButton(lx: number, ly: number, down: boolean): boolean;
    get visible(): boolean;
    set visible(v: boolean);
}
//# sourceMappingURL=CCtrlTab.d.ts.map