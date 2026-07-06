import { Container, Graphics } from 'pixi.js';

export class AffectedAreaLook {
  readonly container = new Container();
  Position = { x: 0, y: 0 };

  constructor(
    public readonly ObjId: number,
    public readonly Type: number,
    public readonly OwnerId: number,
    public readonly SkillId: number,
    public readonly SkillLevel: number,
    public left: number,
    public top: number,
    public right: number,
    public bottom: number,
  ) {
    this._build();
  }

  Update(_dt: number): void {
  }

  private _build(): void {
    this.container.removeChildren();
    const w = this.right - this.left;
    const h = this.bottom - this.top;
    const hue = this.Type % 6;
    const colors = [0x4488ff, 0xff4444, 0x44ff44, 0xffaa00, 0xaa44ff, 0x44ffff];
    const c = colors[hue];
    const gfx = new Graphics();
    gfx.rect(-w / 2, -h / 2, w, h).fill({ color: c, alpha: 0.15 });
    gfx.rect(-w / 2, -h / 2, w, h).stroke({ color: c, alpha: 0.4, width: 2 });
    if (this.SkillId) {
      gfx.circle(0, 0, 8).fill({ color: 0xffffff, alpha: 0.3 });
    }
    this.container.addChild(gfx);
  }
}
