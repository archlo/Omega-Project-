import { Container, Graphics } from 'pixi.js';

export class OpenGateLook {
  readonly container = new Container();
  Position = { x: 0, y: 0 };
  private _animTimer = 0;
  private _pulse = 0;

  constructor(
    public readonly CharacterId: number,
    public State: number,
    public readonly First: boolean,
  ) {
    this._build();
  }

  Update(dt: number): void {
    this._animTimer += dt;
    const p = Math.sin(this._animTimer * 3) * 0.5 + 0.5;
    if (Math.abs(p - this._pulse) > 0.05) {
      this._pulse = p;
      this._build();
    }
  }

  SetState(state: number): void {
    if (state === this.State) return;
    this.State = state;
    this._build();
  }

  private _build(): void {
    this.container.removeChildren();
    const baseAlpha = 0.5 + this._pulse * 0.3;
    const gfx = new Graphics();
    const c = this.First ? 0x44aaff : 0xff8844;
    gfx.ellipse(0, 0, 30, 16).fill({ color: c, alpha: baseAlpha });
    gfx.ellipse(0, 0, 26, 12).fill({ color: 0x000000, alpha: baseAlpha * 0.3 });
    this.container.addChild(gfx);
  }
}
