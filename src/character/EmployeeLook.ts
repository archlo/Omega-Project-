import { Container, Graphics, Text } from 'pixi.js';

export class EmployeeLook {
  readonly container = new Container();
  Position = { x: 0, y: 0 };

  constructor(
    public readonly ObjId: number,
    public readonly EmployerObjId: number,
    public readonly NameTag: string | number | null = null,
  ) {
    this._build();
  }

  Update(_dt: number): void {
  }

  private _build(): void {
    this.container.removeChildren();
    const gfx = new Graphics();
    gfx.rect(-20, -32, 40, 32).fill({ color: 0x8b4513, alpha: 0.8 });
    gfx.rect(-16, -28, 32, 24).fill({ color: 0xdeb887, alpha: 0.6 });
    gfx.poly([-16, -32, 0, -44, 16, -32]).fill({ color: 0xa0522d, alpha: 0.9 });
    this.container.addChild(gfx);
    if (this.NameTag !== null && this.NameTag !== '' && this.NameTag !== 0) {
      this.container.addChild(this._makeNameTag(String(this.NameTag)));
    }
  }

  private _makeNameTag(label: string): Container {
    const tag = new Container();
    const text = new Text({ text: label, style: { fontFamily: 'Arial', fontSize: 12, fill: 0xffff00 } });
    const w = Math.ceil(text.width) + 5;
    const h = 16;
    const bg = new Graphics();
    // IDA: CEmployee::Init calls CLife::MakeNameTag type 1000 for the decoded shop/employee tag string.
    bg.rect(0, 0, w, h).fill({ color: 0xffffff, alpha: 178 / 255 });
    bg.rect(0, 0, w, h).stroke({ color: 0xffffff, width: 1 });
    text.position.set(2, 0);
    tag.addChild(bg, text);
    tag.pivot.set(w / 2, h);
    tag.position.set(0, -50);
    return tag;
  }
}
