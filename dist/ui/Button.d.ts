import { Container } from 'pixi.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import { WzProperty } from '../wz/WzProperty.js';
export declare class Button {
    onClick: (() => void) | null;
    onHoverSound: (() => void) | null;
    onClickSound: (() => void) | null;
    private _enabled;
    get enabled(): boolean;
    set enabled(v: boolean);
    width: number;
    height: number;
    label: string;
    container: Container;
    private _bg;
    private _labelText;
    private _hovered;
    private _pressed;
    private _normal;
    private _hover;
    private _pressedSprite;
    private _disabled;
    private _sprite;
    constructor(label?: string);
    /**
     * Builds a button from a WZ `Bt*` subtree with `normal/0`, `mouseOver/0`,
     * `pressed/0`, `disabled/0` canvas states (mirrors C# `Button.LoadFirst`).
     * Falls back to the Graphics label rendering if the root or sprites are
     * unavailable.
     */
    static fromWz(loader: WzTextureLoader, buttonRoot: WzProperty | null, fallbackLabel?: string): Button;
    private static _loadFirst;
    get position(): {
        x: number;
        y: number;
    };
    set position(v: {
        x: number;
        y: number;
    });
    hitTest(x: number, y: number): boolean;
    get bounds(): {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    setHover(hovered: boolean): void;
    /** Reset pressed/hover state — call on global mouse-up or focus change */
    resetState(): void;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    private _refreshSprite;
    private drawBg;
}
//# sourceMappingURL=Button.d.ts.map