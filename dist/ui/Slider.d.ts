import { Container } from 'pixi.js';
/**
 * CCtrlSlider — reusable horizontal slider control.
 * OG reference: CCtrlSlider from CWnd/Ctrl system, used for BGM/SFX volume in OptionMenu.
 *
 * Features:
 * - Horizontal orientation (default)
 * - Track with filled region
 * - Draggable thumb (knob)
 * - Value range with min/max
 * - onChange callback
 * - Graphics fallback (no WZ required)
 */
export interface SliderOptions {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    min?: number;
    max?: number;
    value?: number;
    orientation?: 'horizontal' | 'vertical';
    onChange?: (value: number) => void;
}
export declare class CCtrlSlider {
    private _container;
    private _track;
    private _fill;
    private _thumb;
    private _x;
    private _y;
    private _width;
    private _height;
    private _min;
    private _max;
    private _value;
    private _orientation;
    private _dragging;
    private _onChange;
    private static readonly THUMB_W;
    private static readonly THUMB_H;
    private static readonly TRACK_HEIGHT;
    private static readonly THUMB_COLOR;
    private static readonly THUMB_BORDER;
    private static readonly FILL_COLOR;
    private static readonly TRACK_COLOR;
    constructor(options?: SliderOptions);
    get container(): Container;
    get value(): number;
    set value(v: number);
    get min(): number;
    set min(v: number);
    get max(): number;
    set max(v: number);
    get onChange(): ((value: number) => void) | null;
    set onChange(cb: ((value: number) => void) | null);
    get orientation(): 'horizontal' | 'vertical';
    setPosition(x: number, y: number): void;
    setSize(width: number, height: number): void;
    private _setupInteraction;
    private _updateValueFromEvent;
    private _draw;
    private _drawHorizontal;
    private _drawVertical;
    private _getThumbPos;
    destroy(): void;
}
//# sourceMappingURL=Slider.d.ts.map