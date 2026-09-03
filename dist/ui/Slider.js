import { Container, Graphics } from 'pixi.js';
export class CCtrlSlider {
    _container;
    _track;
    _fill;
    _thumb;
    _x;
    _y;
    _width;
    _height;
    _min;
    _max;
    _value;
    _orientation;
    _dragging = false;
    _onChange = null;
    // OG constants (matching OptionMenu slider style)
    static THUMB_W = 6;
    static THUMB_H = 14;
    static TRACK_HEIGHT = 2;
    static THUMB_COLOR = 0xEBEBF5;
    static THUMB_BORDER = 0x46465A;
    static FILL_COLOR = 0x5A96DC;
    static TRACK_COLOR = 0x191932;
    constructor(options = {}) {
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
    get container() { return this._container; }
    get value() { return this._value; }
    set value(v) {
        const clamped = Math.max(this._min, Math.min(this._max, v));
        if (clamped !== this._value) {
            this._value = clamped;
            this._draw();
        }
    }
    get min() { return this._min; }
    set min(v) { this._min = v; this.value = this._value; }
    get max() { return this._max; }
    set max(v) { this._max = v; this.value = this._value; }
    get onChange() { return this._onChange; }
    set onChange(cb) { this._onChange = cb; }
    get orientation() { return this._orientation; }
    setPosition(x, y) {
        this._x = x;
        this._y = y;
        this._container.position.set(x, y);
    }
    setSize(width, height) {
        this._width = width;
        this._height = height;
        this._draw();
    }
    _setupInteraction() {
        this._container.eventMode = 'static';
        this._container.cursor = 'pointer';
        this._container.on('pointerdown', (e) => {
            this._dragging = true;
            this._updateValueFromEvent(e);
        });
        this._container.on('globalpointermove', (e) => {
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
    _updateValueFromEvent(e) {
        const local = this._container.toLocal(e.global);
        let newValue;
        if (this._orientation === 'horizontal') {
            const trackStart = CCtrlSlider.THUMB_W / 2;
            const trackEnd = this._width - CCtrlSlider.THUMB_W / 2;
            const ratio = Math.max(0, Math.min(1, (local.x - trackStart) / (trackEnd - trackStart)));
            newValue = this._min + ratio * (this._max - this._min);
        }
        else {
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
    _draw() {
        this._track.clear();
        this._fill.clear();
        this._thumb.clear();
        if (this._orientation === 'horizontal') {
            this._drawHorizontal();
        }
        else {
            this._drawVertical();
        }
    }
    _drawHorizontal() {
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
    _drawVertical() {
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
    _getThumbPos() {
        const range = this._max - this._min;
        if (range === 0)
            return 0;
        const ratio = (this._value - this._min) / range;
        if (this._orientation === 'horizontal') {
            const trackStart = CCtrlSlider.THUMB_W / 2;
            const trackEnd = this._width - CCtrlSlider.THUMB_W / 2;
            return trackStart + ratio * (trackEnd - trackStart);
        }
        else {
            const trackStart = CCtrlSlider.THUMB_H / 2;
            const trackEnd = this._height - CCtrlSlider.THUMB_H / 2;
            return trackEnd - ratio * (trackEnd - trackStart);
        }
    }
    destroy() {
        this._container.removeAllListeners();
        this._container.destroy({ children: true });
    }
}
//# sourceMappingURL=Slider.js.map