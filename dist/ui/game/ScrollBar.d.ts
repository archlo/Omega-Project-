import { Container } from 'pixi.js';
import type { WzPackage } from '../../wz/WzPackage.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
export declare class ScrollBar {
    private static _defaultAssets;
    private static readonly _instances;
    readonly container: Container<import("pixi.js").ContainerChild>;
    private _track;
    private _thumb;
    private _upBtn;
    private _downBtn;
    private _onChange;
    private _pos;
    private _range;
    private _dragStartY;
    private _dragStartPos;
    private _dragging;
    private _repeat;
    private _repeatElapsed;
    private _repeatDelay;
    private _upHover;
    private _downHover;
    private _thumbHover;
    private _height;
    private _trackSprite;
    private _trackTiles;
    private _upNormal;
    private _upHoverSprite;
    private _downNormal;
    private _downHoverSprite;
    private _thumbNormal;
    private _thumbHoverSprite;
    private _trackDisabled;
    private _upDisabled;
    private _downDisabled;
    private _hasWzAssets;
    private _loader;
    private _uol;
    constructor(x: number, y: number, height: number, onChange?: (pos: number) => void, wzAssets?: {
        loader: WzTextureLoader;
        uiWz: WzPackage | null;
        uol?: string;
        /** v95 Basic.img variant: 0=VScr, 2..10=VScr2..VScr10. */
        variant?: number;
    });
    static configureDefaultAssets(loader: WzTextureLoader, uiWz: WzPackage): void;
    static updateAll(dt: number): void;
    /** Release every captured scrollbar, including a drag released outside its panel. */
    static releasePointer(): void;
    private _loadWzAssets;
    get pos(): number;
    set pos(v: number);
    /** Match CCtrlScrollBar::SetScrollRange: rangeCount includes position zero. */
    setRange(rangeCount: number): void;
    get maxPosition(): number;
    private get _thumbTrackHeight();
    private get _thumbSize();
    private _thumbY;
    private _redraw;
    private _redrawWz;
    private _redrawGraphics;
    private _drawArrow;
    handleMouseMove(x: number, y: number): void;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    handleMouseWheel(x: number, y: number, delta: number): boolean;
    update(dt: number): void;
    private _beginRepeat;
    private _pageStep;
    handleMouseLeave(): void;
    private _releasePointer;
    get visible(): boolean;
    set visible(v: boolean);
}
//# sourceMappingURL=ScrollBar.d.ts.map