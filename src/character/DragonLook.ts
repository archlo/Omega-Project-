import { Container, Graphics, Text } from 'pixi.js';
import type { WzPackage } from '../wz/WzPackage.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import { TamingMobLook } from './TamingMobLook.js';
import type { DecodedMovePath } from '../net/packet/MovePathDecoder.js';
import { RemoteMoveReplay } from './RemoteMoveReplay.js';
import type { Foothold } from '../map/Foothold.js';

export class DragonLook {
  readonly container = new Container();
  Position = { x: 0, y: 0 };
  private _actionTimer = 0;
  private _action = 0;
  private _sprite: TamingMobLook | null = null;
  private _replay = new RemoteMoveReplay();

  constructor(public readonly OwnerCharId: number) {}

  Load(loader: WzTextureLoader, tamingMobWz: WzPackage | null): void {
    // Evan dragon movement uses the dragon packet family, but this client has
    // no dedicated Dragon.wz loader. TamingMob.nx contains mount-style action
    // sprites with the same stand/move/action shape, so use the smallest WZ-
    // backed renderer available and fall back to the vector placeholder.
    this._sprite = new TamingMobLook(1932000);
    this._sprite.Load(loader, tamingMobWz);
  }

  SetOwnerPosition(x: number, y: number): void {
    this.Position = { x: x - 42, y: y - 22 };
  }

  PlayAction(action: number): void {
    // TODO_AUDIT.md Hundred-and-forty-sixth pass: no dragon WZ renderer exists
    // yet, so packets now maintain a visible placeholder entity instead of
    // disappearing into log-only callbacks.
    this._action = action;
    this._actionTimer = 0.8;
    this._sprite?.SetAction(action > 0 ? 'move' : 'stand');
  }

  ReplayMove(path: DecodedMovePath): void {
    this._replay.SetPath(path, this.Position);
    this._sprite?.SetAction('move');
  }

  SetFootholds(footholds: readonly Foothold[]): void { this._replay.SetFootholds(footholds); }

  Update(dt: number): void {
    if (this._replay.Update(dt, this.Position)) this._sprite?.SetAction('move');
    if (this._actionTimer > 0) this._actionTimer = Math.max(0, this._actionTimer - dt);
    if (this._sprite) {
      this._sprite.Position = this.Position;
      this._sprite.Update(dt);
    }
    this._rebuild();
  }

  private _rebuild(): void {
    this.container.removeChildren();
    if (this._sprite && this._sprite.container.children.length > 0) {
      this.container.addChild(this._sprite.container);
    } else {
    const gfx = new Graphics();
    const alpha = this._actionTimer > 0 ? 0.95 : 0.65;
    gfx.ellipse(0, -8, 22, 12).fill({ color: 0x6b8cff, alpha });
    gfx.circle(-18, -14, 9).fill({ color: 0x9bb2ff, alpha });
    gfx.moveTo(18, -8).lineTo(34, -18).lineTo(28, -4).closePath().fill({ color: 0x4865c8, alpha });
    this.container.addChild(gfx);
    }
    if (this._actionTimer > 0) {
      const label = new Text({ text: `${this._action}`, style: { fontSize: 9, fill: 0xffffff, stroke: '#000000' } });
      label.anchor.set(0.5, 1);
      label.y = -28;
      this.container.addChild(label);
    }
  }
}
