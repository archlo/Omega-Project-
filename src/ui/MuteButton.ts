import { Container, Graphics } from 'pixi.js';
import { BuiltInFont } from './BuiltInFont.js';

const Width = 24;
const Height = 20;
const MarginRight = 12;
const MarginTop = 12;

export class MuteButton {
  private _isMuted: () => boolean;
  private _onToggle: () => void;
  private _font: BuiltInFont | null;
  private _bounds = { x: 0, y: 0, width: Width, height: Height };
  private _hover = false;
  private _pressedInside = false;
  private _container: Container;
  private _g: Graphics;

  constructor(isMuted: () => boolean, onToggle: () => void, font: BuiltInFont | null) {
    this._isMuted = isMuted;
    this._onToggle = onToggle;
    this._font = font;
    this._container = new Container();
    this._g = new Graphics();
    this._container.addChild(this._g);
  }

  get container(): Container { return this._container; }

  SetMouse(x: number, y: number): void {
    const inside = x >= this._bounds.x && x < this._bounds.x + this._bounds.width &&
      y >= this._bounds.y && y < this._bounds.y + this._bounds.height;
    this._hover = inside;
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this._hover) return false;
    if (down) {
      this._pressedInside = true;
    } else if (this._pressedInside) {
      this._pressedInside = false;
      if (this._hover) this._onToggle();
      return true;
    }
    return this._hover;
  }

  ServiceAndDraw(viewW: number, _viewH: number): void {
    // Position in frame-local space (the MuteButton is added to the 800-px frame
    // container, not the full canvas). The C# original positioned against the full
    // canvas with the 800-px frame centred — equivalent to (frameW - margin) here.
    this._bounds = {
      x: viewW - Width - MarginRight,
      y: MarginTop,
      width: Width,
      height: Height,
    };
    const g = this._g;
    g.clear();
    const color = this._isMuted() ? 0x666666 : 0x888888;
    const border = this._hover ? 0xAACCFF : 0x446688;
    g.rect(this._bounds.x, this._bounds.y, Width, Height).fill({ color, alpha: 0.7 });
    g.rect(this._bounds.x, this._bounds.y, Width, 1).fill({ color: border });
    g.rect(this._bounds.x, this._bounds.y + Height - 1, Width, 1).fill({ color: border });
    g.rect(this._bounds.x, this._bounds.y, 1, Height).fill({ color: border });
    g.rect(this._bounds.x + Width - 1, this._bounds.y, 1, Height).fill({ color: border });
  }
}
