import { Texture, Sprite } from 'pixi.js';

export class WzSprite {
  constructor(
    public readonly Texture: Texture,
    public readonly OriginX: number = 0,
    public readonly OriginY: number = 0,
    public readonly Lt: { x: number; y: number } | null = null,
    public readonly Rb: { x: number; y: number } | null = null,
  ) {}

  private _pixi: Sprite | null = null;
  private _lastFlipX = false;

  get width(): number { return this.Texture.width; }
  get height(): number { return this.Texture.height; }
  get Width(): number { return this.Texture.width; }
  get Height(): number { return this.Texture.height; }

  get x(): number { return this._pixi?.x ?? 0; }
  set x(v: number) { if (this._pixi) this._pixi.x = v; }
  get y(): number { return this._pixi?.y ?? 0; }
  set y(v: number) { if (this._pixi) this._pixi.y = v; }
  get visible(): boolean { return this._pixi?.visible ?? false; }
  set visible(v: boolean) { if (this._pixi) this._pixi.visible = v; }

  ToPixi(flipX = false): Sprite {
    // PixiJS v8 corrupts cached Sprites after removeChildren() — always
    // create a fresh Sprite to avoid invisible children after reparenting.
    const s = new Sprite(this.Texture);
    s.anchor.set(
      this.Width > 0 ? this.OriginX / this.Width : 0,
      this.Height > 0 ? this.OriginY / this.Height : 0,
    );
    if (flipX) s.scale.x = -1;
    return s;
  }

  /** Always creates a fresh Sprite (no cache). Use when the same WzSprite must appear in multiple containers simultaneously. */
  NewSprite(flipX = false): Sprite {
    const s = new Sprite(this.Texture);
    s.anchor.set(
      this.Width > 0 ? this.OriginX / this.Width : 0,
      this.Height > 0 ? this.OriginY / this.Height : 0,
    );
    if (flipX) s.scale.x = -1;
    return s;
  }
}
