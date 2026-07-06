import { Container, Graphics } from 'pixi.js';

const VISIBILITY_RADIUS = 158;

export class FearEffect {
  readonly container: Container;
  private _overlay: Graphics;
  private _active = false;
  private _screenW = 800;
  private _screenH = 600;

  constructor() {
    this.container = new Container();
    this._overlay = new Graphics();
    this.container.addChild(this._overlay);
    this.container.visible = false;
    this.container.interactiveChildren = false;
  }

  get active(): boolean {
    return this._active;
  }

  onResize(w: number, h: number): void {
    this._screenW = w;
    this._screenH = h;
    if (this._active) this._redraw();
  }

  show(playerScreenX: number, playerScreenY: number): void {
    this._active = true;
    this._px = playerScreenX;
    this._py = playerScreenY;
    this._redraw();
    this.container.visible = true;
  }

  hide(): void {
    this._active = false;
    this.container.visible = false;
    this._overlay.clear();
  }

  update(playerScreenX: number, playerScreenY: number): void {
    if (!this._active) return;
    this._px = playerScreenX;
    this._py = playerScreenY;
    this._redraw();
  }

  private _px = 0;
  private _py = 0;

  private _redraw(): void {
    this._overlay.clear();
    this._overlay.beginPath();
    this._overlay.rect(0, 0, this._screenW, this._screenH);
    this._overlay.fill({ color: 0x000000 });
    this._overlay.beginPath();
    this._overlay.circle(this._px, this._py, VISIBILITY_RADIUS);
    this._overlay.cut();
  }
}
