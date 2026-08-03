import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { WzSprite } from '../render/WzSprite.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import { WzProperty } from '../wz/WzProperty.js';
import { WzCanvas } from '../wz/WzCanvas.js';

export class Button {
  onClick: (() => void) | null = null;
  onHoverSound: (() => void) | null = null;
  onClickSound: (() => void) | null = null;
  private _enabled = true;
  get enabled() { return this._enabled; }
  set enabled(v: boolean) {
    if (this._enabled === v) return;
    this._enabled = v;
    if (this._normal) this._refreshSprite();
    else this.drawBg();
  }
  width = 120;
  height = 28;
  label = '';
  container: Container;
  private _bg: Graphics;
  private _labelText: Text;
  private _hovered = false;
  private _pressed = false;

  // Optional WZ-sprite states (normal/mouseOver/pressed/disabled). When
  // `_normal` is set, the button renders these sprites instead of the
  // Graphics fallback box.
  private _normal: WzSprite | null = null;
  private _hover: WzSprite | null = null;
  private _pressedSprite: WzSprite | null = null;
  private _disabled: WzSprite | null = null;
  private _sprite: import('pixi.js').Sprite | null = null;

  constructor(label?: string) {
    this.label = label ?? '';
    this.container = new Container();
    (this.container as any).__buttonInstance = this;
    this._bg = new Graphics();
    this._labelText = new Text({
      text: this.label,
      style: new TextStyle({ fill: 0xFFFFFF, fontSize: 12, fontFamily: 'monospace' }),
    });
    this._labelText.anchor.set(0.5);
    this.container.addChild(this._bg);
    this.container.addChild(this._labelText);
    this.drawBg();
  }

  /**
   * Builds a button from a WZ `Bt*` subtree with `normal/0`, `mouseOver/0`,
   * `pressed/0`, `disabled/0` canvas states (mirrors C# `Button.LoadFirst`).
   * Falls back to the Graphics label rendering if the root or sprites are
   * unavailable.
   */
  static fromWz(loader: WzTextureLoader, buttonRoot: WzProperty | null, fallbackLabel?: string): Button {
    const b = new Button(fallbackLabel);
    b._normal = Button._loadFirst(loader, buttonRoot, 'normal');
    b._hover = Button._loadFirst(loader, buttonRoot, 'mouseOver');
    b._pressedSprite = Button._loadFirst(loader, buttonRoot, 'pressed');
    b._disabled = Button._loadFirst(loader, buttonRoot, 'disabled');
    b._refreshSprite();
    return b;
  }

  private static _loadFirst(loader: WzTextureLoader, root: WzProperty | null, state: string): WzSprite | null {
    const statePr = root?.Get(state);
    if (!(statePr instanceof WzProperty)) return null;
    const canvas = statePr.Get('0');
    if (canvas instanceof WzCanvas) return loader.Load(canvas);
    return null;
  }

  get position() { return this.container.position; }
  set position(v: { x: number; y: number }) { this.container.position.set(v.x, v.y); }

  hitTest(x: number, y: number): boolean {
    const b = this.bounds;
    return x >= b.x && x < b.x + b.width && y >= b.y && y < b.y + b.height;
  }

  get bounds() {
    const p = this.container.position;
    if (this._normal) {
      return {
        x: p.x - this._normal.OriginX,
        y: p.y - this._normal.OriginY,
        width: this._normal.Width,
        height: this._normal.Height,
      };
    }
    return { x: p.x, y: p.y, width: this.width, height: this.height };
  }

  setHover(hovered: boolean): void {
    if (this._hovered === hovered) return;
    this._hovered = hovered;
    if (hovered) this.onHoverSound?.();
    if (this._normal) {
      this._refreshSprite();
    } else {
      this.drawBg();
    }
  }

  /** Reset pressed/hover state — call on global mouse-up or focus change */
  resetState(): void {
    if (this._pressed || this._hovered) {
      this._pressed = false;
      this._hovered = false;
      if (this._normal) this._refreshSprite();
      else this.drawBg();
    }
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.enabled) return false;
    // An invisible button must not intercept clicks (OG: only the current-mode
    // button exists; TS panels sometimes keep a hidden sibling at the same spot).
    if (!this.container.visible) return false;
    const b = this.bounds;
    const inside = x >= b.x && x < b.x + b.width && y >= b.y && y < b.y + b.height;
    this.setHover(inside);
    if (this._normal) {
      if (down) {
        if (inside) {
          this._pressed = true;
          this._refreshSprite();
          return true;
        }
      } else {
        // Always reset pressed state on mouse-up, even if outside the button.
        // This prevents buttons from staying stuck in pressed visual state
        // when a panel opens during mouse-down and the mouse-up goes to the panel.
        const wasPressed = this._pressed;
        this._pressed = false;
        this._refreshSprite();
        if (wasPressed && inside) {
          this.onClickSound?.();
          this.onClick?.();
          return true;
        }
      }
      return inside;
    }
    if (inside && !down && this.onClick) { this.onClickSound?.(); this.onClick(); }
    return inside;
  }

  private _refreshSprite(): void {
    if (!this._normal) return;
    const sprite = !this.enabled ? (this._disabled ?? this._normal)
      : this._pressed ? (this._pressedSprite ?? this._normal)
      : this._hovered ? (this._hover ?? this._normal)
      : this._normal;

    if (this._sprite) {
      this.container.removeChild(this._sprite);
      this._sprite = null;
    }
    this._sprite = sprite.ToPixi();
    this.container.addChildAt(this._sprite, 0);
    // Hide the Graphics fallback and label when a WZ sprite is active —
    // the sprite already has the button text baked into the image.
    this._bg.visible = false;
    this._labelText.visible = false;
  }

  private drawBg(): void {
    const g = this._bg;
    g.clear();
    const color = !this.enabled ? 0x444444
      : this._hovered ? 0x336699
      : 0x225577;
    g.roundRect(0, 0, this.width, this.height, 4).fill({ color });
    g.setStrokeStyle({ width: 1, color: 0x88CCFF });
    g.roundRect(0, 0, this.width, this.height, 4).stroke();
    this._labelText.position.set(this.width / 2, this.height / 2);
  }
}
