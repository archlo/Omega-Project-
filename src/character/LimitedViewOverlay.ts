import { Container, Graphics } from 'pixi.js';

const VIEW_RADIUS = 158;

export class LimitedViewOverlay {
  readonly container = new Container({ visible: false });
  private readonly _overlay = new Graphics();
  private _screenW = 800;
  private _screenH = 600;

  constructor() {
    this.container.addChild(this._overlay);
    this.container.interactiveChildren = false;
  }

  onResize(w: number, h: number): void {
    this._screenW = w;
    this._screenH = h;
  }

  hide(): void {
    this.container.visible = false;
    this._overlay.clear();
  }

  draw(points: { x: number; y: number }[]): void {
    if (points.length === 0) { this.hide(); return; }
    this.container.visible = true;
    this._overlay.clear();
    this._overlay.beginPath();
    this._overlay.rect(0, 0, this._screenW, this._screenH);
    this._overlay.fill({ color: 0x000000 });
    for (const p of points) {
      this._overlay.beginPath();
      this._overlay.circle(p.x, p.y, VIEW_RADIUS);
      this._overlay.cut();
    }
  }
}
