import { Container, Graphics, FederatedPointerEvent } from 'pixi.js';

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

export class CCtrlSlider {
  private _container: Container;
  private _track: Graphics;
  private _fill: Graphics;
  private _thumb: Graphics;

  private _x: number;
  private _y: number;
  private _width: number;
  private _height: number;
  private _min: number;
  private _max: number;
  private _value: number;
  private _orientation: 'horizontal' | 'vertical';

  private _dragging: boolean = false;
  private _onChange: ((value: number) => void) | null = null;

  // OG constants (matching OptionMenu slider style)
  private static readonly THUMB_W = 6;
  private static readonly THUMB_H = 14;
  private static readonly TRACK_HEIGHT = 2;
  private static readonly THUMB_COLOR = 0xEBEBF5;
  private static readonly THUMB_BORDER = 0x46465A;
  private static readonly FILL_COLOR = 0x5A96DC;
  private static readonly TRACK_COLOR = 0x191932;

  constructor(options: SliderOptions = {}) {
    this._x = options.x ?? 0;
    this._y = options.y ?? 0;
    this._width = options.width ?? 100;
    this._height = options.height ?? CCtrlSlider.THUMB_H;
    this._min = options.min ?? 0;
    this._max = options.max ?? 100;
    this._value = Math.max(this._min, Math.min(this._max, options.value ?? this._min));
    this._orientation = options.orientation ?? 'horizontal';
    this._onChange = options.onChange ?? null;

    this._container = new Container();
    this._container.position.set(this._x, this._y);

    this._track = new Graphics();
    this._fill = new Graphics();
    this._thumb = new Graphics();

    this._container.addChild(this._track);
    this._container.addChild(this._fill);
    this._container.addChild(this._thumb);

    this._setupInteraction();
    this._draw();
  }

  get container(): Container { return this._container; }
  get value(): number { return this._value; }
  set value(v: number) {
    const clamped = Math.max(this._min, Math.min(this._max, v));
    if (clamped !== this._value) {
      this._value = clamped;
      this._draw();
    }
  }
  get min(): number { return this._min; }
  set min(v: number) { this._min = v; this.value = this._value; }
  get max(): number { return this._max; }
  set max(v: number) { this._max = v; this.value = this._value; }
  get onChange(): ((value: number) => void) | null { return this._onChange; }
  set onChange(cb: ((value: number) => void) | null) { this._onChange = cb; }
  get orientation(): 'horizontal' | 'vertical' { return this._orientation; }

  setPosition(x: number, y: number): void {
    this._x = x;
    this._y = y;
    this._container.position.set(x, y);
  }

  setSize(width: number, height: number): void {
    this._width = width;
    this._height = height;
    this._draw();
  }

  private _setupInteraction(): void {
    this._container.eventMode = 'static';
    this._container.cursor = 'pointer';

    this._container.on('pointerdown', (e: FederatedPointerEvent) => {
      this._dragging = true;
      this._updateValueFromEvent(e);
    });

    this._container.on('globalpointermove', (e: FederatedPointerEvent) => {
      if (this._dragging) {
        this._updateValueFromEvent(e);
      }
    });

    this._container.on('pointerup', () => {
      this._dragging = false;
    });

    this._container.on('pointerupoutside', () => {
      this._dragging = false;
    });
  }

  private _updateValueFromEvent(e: FederatedPointerEvent): void {
    const local = this._container.toLocal(e.global);
    let newValue: number;

    if (this._orientation === 'horizontal') {
      const trackStart = CCtrlSlider.THUMB_W / 2;
      const trackEnd = this._width - CCtrlSlider.THUMB_W / 2;
      const ratio = Math.max(0, Math.min(1, (local.x - trackStart) / (trackEnd - trackStart)));
      newValue = this._min + ratio * (this._max - this._min);
    } else {
      const trackStart = CCtrlSlider.THUMB_H / 2;
      const trackEnd = this._height - CCtrlSlider.THUMB_H / 2;
      const ratio = Math.max(0, Math.min(1, (local.y - trackStart) / (trackEnd - trackStart)));
      newValue = this._min + ratio * (this._max - this._min);
    }

    const rounded = Math.round(newValue);
    if (rounded !== this._value) {
      this._value = rounded;
      this._draw();
      this._onChange?.(this._value);
    }
  }

  private _draw(): void {
    this._track.clear();
    this._fill.clear();
    this._thumb.clear();

    if (this._orientation === 'horizontal') {
      this._drawHorizontal();
    } else {
      this._drawVertical();
    }
  }

  private _drawHorizontal(): void {
    const trackY = Math.floor(this._height / 2) - 1;
    const thumbX = this._getThumbPos();
    const thumbY = 0;

    // Track background
    this._track.rect(0, trackY, this._width, CCtrlSlider.TRACK_HEIGHT)
      .fill({ color: CCtrlSlider.TRACK_COLOR });

    // Filled portion
    const fillWidth = Math.max(0, thumbX + CCtrlSlider.THUMB_W / 2);
    this._fill.rect(0, trackY, fillWidth, CCtrlSlider.TRACK_HEIGHT)
      .fill({ color: CCtrlSlider.FILL_COLOR });

    // Thumb
    this._thumb.rect(thumbX, thumbY, CCtrlSlider.THUMB_W, CCtrlSlider.THUMB_H)
      .fill({ color: CCtrlSlider.THUMB_COLOR });

    // Thumb border (OG style: top, bottom, left, right borders)
    this._thumb.rect(thumbX, thumbY, CCtrlSlider.THUMB_W, 1)
      .fill({ color: CCtrlSlider.THUMB_BORDER });
    this._thumb.rect(thumbX, thumbY + CCtrlSlider.THUMB_H - 1, CCtrlSlider.THUMB_W, 1)
      .fill({ color: CCtrlSlider.THUMB_BORDER });
    this._thumb.rect(thumbX, thumbY, 1, CCtrlSlider.THUMB_H)
      .fill({ color: CCtrlSlider.THUMB_BORDER });
    this._thumb.rect(thumbX + CCtrlSlider.THUMB_W - 1, thumbY, 1, CCtrlSlider.THUMB_H)
      .fill({ color: CCtrlSlider.THUMB_BORDER });
  }

  private _drawVertical(): void {
    const trackX = Math.floor(this._width / 2) - 1;
    const thumbX = 0;
    const thumbY = this._getThumbPos();

    // Track background
    this._track.rect(trackX, 0, CCtrlSlider.TRACK_HEIGHT, this._height)
      .fill({ color: CCtrlSlider.TRACK_COLOR });

    // Filled portion (from bottom up)
    const fillHeight = Math.max(0, this._height - thumbY - CCtrlSlider.THUMB_H / 2);
    this._fill.rect(trackX, this._height - fillHeight, CCtrlSlider.TRACK_HEIGHT, fillHeight)
      .fill({ color: CCtrlSlider.FILL_COLOR });

    // Thumb
    this._thumb.rect(thumbX, thumbY, CCtrlSlider.THUMB_W, CCtrlSlider.THUMB_H)
      .fill({ color: CCtrlSlider.THUMB_COLOR });

    // Thumb border
    this._thumb.rect(thumbX, thumbY, CCtrlSlider.THUMB_W, 1)
      .fill({ color: CCtrlSlider.THUMB_BORDER });
    this._thumb.rect(thumbX, thumbY + CCtrlSlider.THUMB_H - 1, CCtrlSlider.THUMB_W, 1)
      .fill({ color: CCtrlSlider.THUMB_BORDER });
    this._thumb.rect(thumbX, thumbY, 1, CCtrlSlider.THUMB_H)
      .fill({ color: CCtrlSlider.THUMB_BORDER });
    this._thumb.rect(thumbX + CCtrlSlider.THUMB_W - 1, thumbY, 1, CCtrlSlider.THUMB_H)
      .fill({ color: CCtrlSlider.THUMB_BORDER });
  }

  private _getThumbPos(): number {
    const range = this._max - this._min;
    if (range === 0) return 0;
    const ratio = (this._value - this._min) / range;

    if (this._orientation === 'horizontal') {
      const trackStart = CCtrlSlider.THUMB_W / 2;
      const trackEnd = this._width - CCtrlSlider.THUMB_W / 2;
      return trackStart + ratio * (trackEnd - trackStart);
    } else {
      const trackStart = CCtrlSlider.THUMB_H / 2;
      const trackEnd = this._height - CCtrlSlider.THUMB_H / 2;
      return trackEnd - ratio * (trackEnd - trackStart);
    }
  }

  destroy(): void {
    this._container.removeAllListeners();
    this._container.destroy({ children: true });
  }
}
