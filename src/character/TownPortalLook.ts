import { Container, Graphics } from 'pixi.js';

export class TownPortalLook {
  readonly container = new Container();
  Position = { x: 0, y: 0 };

  constructor(
    public readonly ObjId: number,
    public State: number,
    public readonly CharacterId: number,
  ) {
    this._build();
  }

  Update(_dt: number): void {
  }

  private _build(): void {
    this.container.removeChildren();
    const gfx = new Graphics();
    const c = this.State === 1 ? 0x00cc44 : 0xffaa00;
    gfx.poly([0, -24, -14, 14, 14, 14]).fill({ color: c, alpha: 0.85 });
    gfx.circle(0, -4, 4).fill({ color: 0xffffff, alpha: 0.5 });
    this.container.addChild(gfx);
  }

  SetState(state: number): void {
    if (state === this.State) return;
    this.State = state;
    this._build();
  }
}
