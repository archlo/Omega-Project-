import { Container, Texture } from 'pixi.js';
import type { WzPackage } from '../wz/WzPackage.js';
export declare class MapleCursor {
    enabled: boolean;
    position: {
        x: number;
        y: number;
    };
    clicked: boolean;
    private _container;
    private _defaultGfx;
    private _fallbackSprite;
    private _customTexture;
    private _wzLoader;
    private _normalSprite;
    private _clickedSprite;
    private _wzLoaded;
    constructor();
    get container(): Container;
    loadFromWz(uiWz: WzPackage): Promise<void>;
    setClicked(clicked: boolean): void;
    setCursorTexture(texture: Texture | null): void;
    private _applyWzCursor;
    private _updateFallback;
    update(_dt: number): void;
}
//# sourceMappingURL=MapleCursor.d.ts.map