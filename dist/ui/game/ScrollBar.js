import { Container, Graphics, Sprite } from 'pixi.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
// OG: Basic.img has 10 VScr variants with different sizes/styles:
// VScr:    12x12  (default, used by CUIItem)
// VScr2:   12x12
// VScr3:   13x12
// VScr4:   15x13
// VScr5:   15x13
// VScr6:   12x12
// VScr7:   15x14
// VScr8:   15x13
// VScr9:   11x12
// VScr10:  12x12
// Each has enabled/{base,prev0,prev1,next0,next1,thumb0,thumb1}
// and disabled/{base,prev,next}.
// The `uol` param selects which variant to use (default 'Basic.img/VScr').
const BTN_SIZE = 12;
const THUMB_SIZE = 12;
export class ScrollBar {
    static _defaultAssets = null;
    static _instances = new Set();
    container = new Container();
    _track;
    _thumb;
    _upBtn;
    _downBtn;
    _onChange = null;
    _pos = 0;
    _range = 0;
    _dragStartY = 0;
    _dragStartPos = 0;
    _dragging = false;
    _repeat = null;
    _repeatElapsed = 0;
    _repeatDelay = 0;
    _upHover = false;
    _downHover = false;
    _thumbHover = false;
    _height;
    // WZ sprite assets
    _trackSprite = null;
    _trackTiles = [];
    _upNormal = null;
    _upHoverSprite = null;
    _downNormal = null;
    _downHoverSprite = null;
    _thumbNormal = null;
    _thumbHoverSprite = null;
    _trackDisabled = null;
    _upDisabled = null;
    _downDisabled = null;
    _hasWzAssets = false;
    _loader = null;
    _uol;
    constructor(x, y, height, onChange, wzAssets) {
        this._onChange = onChange ?? null;
        this._height = height;
        const variant = wzAssets?.variant ?? 0;
        this._uol = wzAssets?.uol ?? `Basic.img/${variant > 0 ? `VScr${variant}` : 'VScr'}`;
        ScrollBar._instances.add(this);
        this._track = new Graphics();
        this._thumb = new Graphics();
        this._upBtn = new Graphics();
        this._downBtn = new Graphics();
        this.container.position.set(x, y);
        this.container.__scrollBarInstance = this;
        this.container.addChild(this._track);
        this.container.addChild(this._upBtn);
        this.container.addChild(this._downBtn);
        this.container.addChild(this._thumb);
        // Try to load WZ assets
        if (wzAssets) {
            this._loader = wzAssets.loader;
            this._loadWzAssets(wzAssets.uiWz, this._uol);
        }
        else if (ScrollBar._defaultAssets) {
            this._loader = ScrollBar._defaultAssets.loader;
            this._loadWzAssets(ScrollBar._defaultAssets.uiWz, this._uol);
        }
        this._redraw();
    }
    static configureDefaultAssets(loader, uiWz) {
        ScrollBar._defaultAssets = { loader, uiWz };
        for (const scrollbar of ScrollBar._instances) {
            if (!scrollbar._hasWzAssets) {
                scrollbar._loader = loader;
                scrollbar._loadWzAssets(uiWz, scrollbar._uol);
                scrollbar._redraw();
            }
        }
    }
    static updateAll(dt) {
        for (const scrollbar of ScrollBar._instances)
            scrollbar.update(dt);
    }
    /** Release every captured scrollbar, including a drag released outside its panel. */
    static releasePointer() {
        for (const scrollbar of ScrollBar._instances)
            scrollbar._releasePointer();
    }
    _loadWzAssets(uiWz, uol) {
        if (!uiWz || !this._loader)
            return;
        const img = uiWz.GetItem(uol.split('/')[0]);
        const root = img?.Root;
        if (!(root instanceof WzProperty))
            return;
        // Navigate to the VScr node (e.g. Basic.img -> VScr -> enabled -> asset)
        const parts = uol.split('/');
        let node = root;
        for (let i = 1; i < parts.length; i++) {
            node = node?.Get?.(parts[i]);
            if (!node)
                return;
        }
        const enabled = node.Get?.('enabled');
        const disabled = node.Get?.('disabled');
        if (!enabled)
            return;
        const loadCanvas = (parent, name) => {
            const c = parent.Get?.(name);
            if (c instanceof WzCanvas) {
                const s = this._loader.Load(c);
                return s?.ToPixi() ?? null;
            }
            return null;
        };
        this._trackSprite = loadCanvas(enabled, 'base');
        this._upNormal = loadCanvas(enabled, 'prev0');
        this._upHoverSprite = loadCanvas(enabled, 'prev1');
        this._downNormal = loadCanvas(enabled, 'next0');
        this._downHoverSprite = loadCanvas(enabled, 'next1');
        this._thumbNormal = loadCanvas(enabled, 'thumb0');
        this._thumbHoverSprite = loadCanvas(enabled, 'thumb1');
        this._trackDisabled = disabled ? loadCanvas(disabled, 'base') : null;
        this._upDisabled = disabled ? loadCanvas(disabled, 'prev') : null;
        this._downDisabled = disabled ? loadCanvas(disabled, 'next') : null;
        this._hasWzAssets = !!(this._trackSprite || this._upNormal || this._thumbNormal);
        if (this._hasWzAssets) {
            // Replace Graphics with WZ sprites
            this.container.removeChild(this._track);
            this.container.removeChild(this._upBtn);
            this.container.removeChild(this._downBtn);
            this.container.removeChild(this._thumb);
            if (this._trackSprite)
                this.container.addChildAt(this._trackSprite, 0);
            if (this._trackDisabled)
                this.container.addChildAt(this._trackDisabled, 0);
            if (this._upNormal)
                this.container.addChild(this._upNormal);
            if (this._upHoverSprite)
                this.container.addChild(this._upHoverSprite);
            if (this._upDisabled)
                this.container.addChild(this._upDisabled);
            if (this._downNormal)
                this.container.addChild(this._downNormal);
            if (this._downHoverSprite)
                this.container.addChild(this._downHoverSprite);
            if (this._downDisabled)
                this.container.addChild(this._downDisabled);
            if (this._thumbNormal)
                this.container.addChild(this._thumbNormal);
            if (this._thumbHoverSprite)
                this.container.addChild(this._thumbHoverSprite);
        }
    }
    get pos() { return this._pos; }
    set pos(v) {
        const clamped = Math.max(0, Math.min(v, this._range));
        if (clamped !== this._pos) {
            this._pos = clamped;
            this._redraw();
            this._onChange?.(this._pos);
        }
    }
    /** Match CCtrlScrollBar::SetScrollRange: rangeCount includes position zero. */
    setRange(rangeCount) {
        this._range = Math.max(0, Math.ceil(rangeCount) - 1);
        this._pos = Math.min(this._pos, this._range);
        this._redraw();
    }
    get maxPosition() { return this._range; }
    get _thumbTrackHeight() {
        return this._height - BTN_SIZE * 2;
    }
    get _thumbSize() {
        return Math.min(THUMB_SIZE, this._thumbTrackHeight);
    }
    _thumbY() {
        if (this._range <= 0)
            return BTN_SIZE;
        // CCtrlScrollBar::ScrHitTest: grid + curPos * (length - 3*grid) /
        // (scrollRange - 1). The thumb itself occupies exactly one grid.
        const travel = Math.max(0, this._height - 3 * BTN_SIZE);
        return BTN_SIZE + (this._pos / this._range) * travel;
    }
    _redraw() {
        if (this._hasWzAssets) {
            this._redrawWz();
        }
        else {
            this._redrawGraphics();
        }
    }
    _redrawWz() {
        const enabled = this._range > 0;
        const track = enabled ? this._trackSprite : (this._trackDisabled ?? this._trackSprite);
        const upNormal = enabled ? this._upNormal : (this._upDisabled ?? this._upNormal);
        const downNormal = enabled ? this._downNormal : (this._downDisabled ?? this._downNormal);
        // Hide every state before selecting the current one. Pixi sprites remain
        // children after a state change, so leaving the old state visible causes
        // doubled arrows/thumbs in the current implementation.
        for (const sprite of [
            this._trackSprite, this._trackDisabled, this._upNormal, this._upHoverSprite,
            this._upDisabled, this._downNormal, this._downHoverSprite, this._downDisabled,
            this._thumbNormal, this._thumbHoverSprite,
        ]) {
            if (sprite)
                sprite.visible = false;
        }
        this._trackTiles.forEach((tile) => { tile.removeFromParent(); tile.destroy(); });
        this._trackTiles = [];
        if (track) {
            // OG repeats the source canvas; stretching it changes the pixel pattern.
            track.visible = false;
            const tileHeight = Math.max(1, track.texture.height);
            let y = BTN_SIZE;
            while (y < BTN_SIZE + this._thumbTrackHeight) {
                const tile = new Sprite(track.texture);
                tile.position.set(0, y);
                tile.height = Math.min(tileHeight, BTN_SIZE + this._thumbTrackHeight - y);
                this.container.addChildAt(tile, 0);
                this._trackTiles.push(tile);
                y += tileHeight;
            }
        }
        // Up button
        const upSprite = enabled && this._upHover
            ? (this._upHoverSprite ?? upNormal)
            : upNormal;
        if (upSprite) {
            upSprite.visible = true;
            upSprite.position.set(0, 0);
        }
        // Down button
        const downSprite = enabled && this._downHover
            ? (this._downHoverSprite ?? downNormal)
            : downNormal;
        if (downSprite) {
            downSprite.visible = true;
            downSprite.position.set(0, this._height - BTN_SIZE);
        }
        // Thumb
        const thumbSprite = this._thumbHover ? (this._thumbHoverSprite ?? this._thumbNormal) : this._thumbNormal;
        if (enabled && thumbSprite) {
            thumbSprite.visible = true;
            const ty = this._thumbY();
            thumbSprite.position.set(0, ty);
        }
    }
    _redrawGraphics() {
        const h = this._height;
        this._track.clear();
        this._track.rect(0, BTN_SIZE, BTN_SIZE, this._thumbTrackHeight).fill({ color: 0x141628 });
        const ty = this._thumbY();
        this._thumb.clear();
        this._thumb.rect(0, ty, BTN_SIZE, this._thumbSize).fill({ color: this._thumbHover ? 0x4C5180 : 0x3C4164 });
        this._upBtn.clear();
        this._upBtn.rect(0, 0, BTN_SIZE, BTN_SIZE).fill({ color: this._upHover ? 0x2A2D58 : 0x1E2140 });
        this._drawArrow(this._upBtn, 0, 0, true);
        this._downBtn.clear();
        this._downBtn.rect(0, h - BTN_SIZE, BTN_SIZE, BTN_SIZE).fill({ color: this._downHover ? 0x2A2D58 : 0x1E2140 });
        this._drawArrow(this._downBtn, 0, h - BTN_SIZE, false);
    }
    _drawArrow(g, ox, oy, up) {
        const cx = ox + BTN_SIZE / 2;
        const cy = oy + BTN_SIZE / 2;
        const color = (up ? this._upHover : this._downHover) ? 0xAABBEE : 0x8888AA;
        if (up) {
            g.moveTo(cx, cy - 3);
            g.lineTo(cx - 5, cy + 3);
            g.lineTo(cx + 5, cy + 3);
        }
        else {
            g.moveTo(cx, cy + 3);
            g.lineTo(cx - 5, cy - 3);
            g.lineTo(cx + 5, cy - 3);
        }
        g.fill({ color });
    }
    handleMouseMove(x, y) {
        if (this._dragging) {
            const dy = y - this._dragStartY;
            const available = this._thumbTrackHeight - this._thumbSize;
            if (available > 0) {
                const newPos = this._dragStartPos + (dy / available) * this._range;
                this.pos = Math.round(newPos);
            }
            return;
        }
        this._upHover = x >= 0 && x < BTN_SIZE && y >= 0 && y < BTN_SIZE;
        this._downHover = x >= 0 && x < BTN_SIZE && y >= this._height - BTN_SIZE && y < this._height;
        const ty = this._thumbY();
        this._thumbHover = x >= 0 && x < BTN_SIZE && y >= ty && y < ty + this._thumbSize;
        this._redraw();
    }
    handleMouseButton(x, y, down) {
        if (!down) {
            if (this._dragging) {
                this._releasePointer();
                return true;
            }
            this._repeat = null;
            return false;
        }
        if (x < 0 || x >= BTN_SIZE || y < 0 || y >= this._height)
            return false;
        // Up button
        if (y < BTN_SIZE) {
            this.pos = this._pos - 1;
            this._beginRepeat('prev');
            this._redraw();
            return true;
        }
        // Down button
        if (y >= this._height - BTN_SIZE) {
            this.pos = this._pos + 1;
            this._beginRepeat('next');
            this._redraw();
            return true;
        }
        // Track click
        const ty = this._thumbY();
        if (y < ty) {
            this.pos = Math.max(0, this._pos - this._pageStep());
            this._beginRepeat('pagePrev');
            return true;
        }
        else if (y > ty + this._thumbSize) {
            this.pos = Math.min(this._range, this._pos + this._pageStep());
            this._beginRepeat('pageNext');
            return true;
        }
        // Start drag
        this._dragging = true;
        this._repeat = null;
        this._dragStartY = y;
        this._dragStartPos = this._pos;
        return true;
    }
    handleMouseWheel(x, y, delta) {
        if (x < 0 || x >= BTN_SIZE || y < 0 || y >= this._height || this._range <= 0 || delta === 0)
            return false;
        this.pos += delta > 0 ? 1 : -1;
        return true;
    }
    update(dt) {
        if (!this._repeat || this._range <= 0)
            return;
        this._repeatElapsed += dt * 1000;
        if (this._repeatElapsed < this._repeatDelay)
            return;
        this._repeatDelay = 50;
        switch (this._repeat) {
            case 'prev':
                this.pos -= 1;
                break;
            case 'next':
                this.pos += 1;
                break;
            case 'pagePrev':
                this.pos -= this._pageStep();
                break;
            case 'pageNext':
                this.pos += this._pageStep();
                break;
        }
        this._repeatElapsed = 0;
    }
    _beginRepeat(kind) {
        this._repeat = kind;
        this._repeatElapsed = 0;
        this._repeatDelay = 400;
    }
    _pageStep() {
        // CCtrlScrollBar::DoPrevNextBar uses max(range / 16, 16).
        return Math.max(16, Math.floor(this._range / 16));
    }
    handleMouseLeave() {
        this._upHover = false;
        this._downHover = false;
        this._thumbHover = false;
        if (!this._dragging)
            this._redraw();
    }
    _releasePointer() {
        this._dragging = false;
        this._repeat = null;
        this._repeatElapsed = 0;
        this._repeatDelay = 0;
    }
    get visible() { return this.container.visible; }
    set visible(v) { this.container.visible = v; }
}
//# sourceMappingURL=ScrollBar.js.map