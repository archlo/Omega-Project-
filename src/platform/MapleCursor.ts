import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import { WzCanvas } from '../wz/WzCanvas.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import type { WzPackage } from '../wz/WzPackage.js';

export class MapleCursor {
  enabled = true;
  position = { x: 0, y: 0 };
  clicked = false;

  private _container = new Container();
  private _defaultGfx: Graphics;
  private _fallbackSprite: Sprite;
  private _customTexture: Texture | null = null;

  private _wzLoader: WzTextureLoader | null = null;
  private _normalSprite: Sprite | null = null;
  private _clickedSprite: Sprite | null = null;
  private _wzLoaded = false;

  constructor() {
    this._defaultGfx = new Graphics();
    this._defaultGfx.poly([0, 0, 0, 16, 4, 12, 8, 18, 11, 16, 7, 10, 12, 10]).fill({ color: 0xFFFFFF });
    this._defaultGfx.poly([0, 0, 0, 16, 4, 12, 8, 18, 11, 16, 7, 10, 12, 10]).stroke({ color: 0x000000, width: 1 });

    this._fallbackSprite = new Sprite();
    this._fallbackSprite.visible = false;

    this._container.addChild(this._defaultGfx);
    this._container.addChild(this._fallbackSprite);
    this._container.zIndex = 999999;
  }

  get container(): Container { return this._container; }

  async loadFromWz(uiWz: WzPackage): Promise<void> {
    this._wzLoader = new WzTextureLoader();
    try {
      const normalNode = uiWz.GetItem('Basic.img/Cursor/0/0');
      const clickedNode = uiWz.GetItem('Basic.img/Cursor/12/0');
      if (normalNode instanceof WzCanvas) {
        const wzs = this._wzLoader.Load(normalNode);
        if (wzs) this._normalSprite = wzs.ToPixi();
      }
      if (clickedNode instanceof WzCanvas) {
        const wzs = this._wzLoader.Load(clickedNode);
        if (wzs) this._clickedSprite = wzs.ToPixi();
      }
      if (this._normalSprite || this._clickedSprite) {
        this._wzLoaded = true;
        this._applyWzCursor();
      }
    } catch (e) {
      console.warn('[MapleCursor] WZ load failed, using fallback', e);
    }
  }

  setClicked(clicked: boolean): void {
    this.clicked = clicked;
    if (this._wzLoaded) this._applyWzCursor();
  }

  setCursorTexture(texture: Texture | null): void {
    this._customTexture = texture;
    if (!this._wzLoaded) this._updateFallback();
  }

  private _applyWzCursor(): void {
    this._container.removeChildren();
    const sprite = this.clicked
      ? (this._clickedSprite ?? this._normalSprite)
      : (this._normalSprite ?? this._clickedSprite);
    if (sprite) {
      this._container.addChild(sprite);
    } else {
      this._container.addChild(this._defaultGfx);
    }
  }

  private _updateFallback(): void {
    if (this._customTexture) {
      this._fallbackSprite.texture = this._customTexture;
      this._fallbackSprite.visible = true;
      if (this._defaultGfx.parent) this._container.removeChild(this._defaultGfx);
    } else {
      this._fallbackSprite.visible = false;
      if (!this._defaultGfx.parent) this._container.addChild(this._defaultGfx);
    }
  }

  update(_dt: number): void {
    // Container position is set directly in mousemove handler (MapleClaudeGame).
  }
}
