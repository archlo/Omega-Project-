import { Container } from 'pixi.js';
import type { WzPackage } from '../wz/WzPackage.js';
import { WzProperty } from '../wz/WzProperty.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
export declare class MapScene {
    private _mapPkg;
    private _loader;
    readonly container: Container<import("pixi.js").ContainerChild>;
    private _backgrounds;
    private _foregrounds;
    private _layer0Objects;
    private _bgScrollX;
    private _bgScrollY;
    private _fgScrollX;
    private _fgScrollY;
    private _sprites;
    BgmPath: string | null;
    /** World-coordinate position of the map's `sp` (start point) portal, or null if absent. */
    StartPoint: {
        x: number;
        y: number;
    } | null;
    Camera: {
        x: number;
        y: number;
    };
    /** When false (default for login/char select), backgrounds ignore Rx/Ry parallax
     *  and alpha — they render as static decorations matching the original client's
     *  non-gameplay screens. */
    ParallaxEnabled: boolean;
    private _screenW;
    private _screenH;
    constructor(_mapPkg: WzPackage | null, _loader: WzTextureLoader);
    Load(mapRoot: WzProperty): void;
    /**
     * Updates the camera position and rebuilds the display list. screenW/screenH
     * should be the real canvas size (e.g. `pixiApp.screen.width/height`), not
     * a hardcoded 800x600 — previously `_rebuildDisplay()` ignored real canvas
     * size entirely, which mis-centered/under-tiled the backdrop on any canvas
     * that wasn't exactly 800x600.
     */
    SetCamera(camera: {
        x: number;
        y: number;
    }, screenW?: number, screenH?: number): void;
    /** Transforms a map-space coordinate to screen pixel coordinates. */
    WorldToScreen(mapX: number, mapY: number, screenW: number, screenH: number): {
        x: number;
        y: number;
    };
    private _rebuildDisplay;
    /** Advance animations and auto-scroll offsets. Call every frame with elapsed ms. */
    private static readonly _ScrollPxSec;
    private _scrollLogged;
    update(dtMs: number): void;
    private _drawBackEntry;
    /** Create a cached Pixi Sprite for non-tiled entries (Normal). Reuses same sprite per texture+origin combo. */
    private _newSprite;
    /** Create a fresh Pixi Sprite for tiled entries — each tile needs its own instance with a unique position. */
    private _cloneSprite;
    private _makeSprite;
    /**
     * Viewport-aware horizontal tiling matching the reference (backgrnd_render_system.cpp).
     * Calculates tile count from viewport bounds using modular arithmetic, then
     * renders only the tiles visible within [0, screenWidth] x [0, screenHeight].
     */
    private _tileH;
    /**
     * Viewport-aware vertical tiling. Same approach as _tileH but on Y axis.
     */
    private _tileV;
    /**
     * Viewport-aware bidirectional tiling.
     */
    private _tileBoth;
    private _tileHLegacy;
    private _tileVLegacy;
    private _tileBothLegacy;
    private _loadBackEntry;
    private _loadObjEntry;
    private _readInt;
}
//# sourceMappingURL=MapScene.d.ts.map