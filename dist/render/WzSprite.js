import { Sprite } from 'pixi.js';
export class WzSprite {
    Texture;
    OriginX;
    OriginY;
    Lt;
    Rb;
    constructor(Texture, OriginX = 0, OriginY = 0, Lt = null, Rb = null) {
        this.Texture = Texture;
        this.OriginX = OriginX;
        this.OriginY = OriginY;
        this.Lt = Lt;
        this.Rb = Rb;
    }
    _pixi = null;
    _lastFlipX = false;
    get width() { return this.Texture.width; }
    get height() { return this.Texture.height; }
    get Width() { return this.Texture.width; }
    get Height() { return this.Texture.height; }
    get x() { return this._pixi?.x ?? 0; }
    set x(v) { if (this._pixi)
        this._pixi.x = v; }
    get y() { return this._pixi?.y ?? 0; }
    set y(v) { if (this._pixi)
        this._pixi.y = v; }
    get visible() { return this._pixi?.visible ?? false; }
    set visible(v) { if (this._pixi)
        this._pixi.visible = v; }
    ToPixi(flipX = false) {
        // PixiJS v8 corrupts cached Sprites after removeChildren() — always
        // create a fresh Sprite to avoid invisible children after reparenting.
        const s = new Sprite(this.Texture);
        s.anchor.set(this.Width > 0 ? this.OriginX / this.Width : 0, this.Height > 0 ? this.OriginY / this.Height : 0);
        if (flipX)
            s.scale.x = -1;
        return s;
    }
    /** Always creates a fresh Sprite (no cache). Use when the same WzSprite must appear in multiple containers simultaneously. */
    NewSprite(flipX = false) {
        const s = new Sprite(this.Texture);
        s.anchor.set(this.Width > 0 ? this.OriginX / this.Width : 0, this.Height > 0 ? this.OriginY / this.Height : 0);
        if (flipX)
            s.scale.x = -1;
        return s;
    }
}
//# sourceMappingURL=WzSprite.js.map