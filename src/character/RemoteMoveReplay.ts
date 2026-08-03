import type { DecodedMovePath } from '../net/packet/MovePathDecoder.js';
import { MovePath } from '../map/VecCtrl.js';
import type { Foothold } from '../map/Foothold.js';

export class RemoteMoveReplay {
  private readonly _path = new MovePath();
  private _elapsedMs = 0;
  private _active = false;
  private _footholds: readonly Foothold[] = [];

  SetFootholds(footholds: readonly Foothold[]): void { this._footholds = footholds; }

  SetPath(path: DecodedMovePath, current: { x: number; y: number }): void {
    this._path.OriginX = path.elements.length > 0 ? path.originX : current.x;
    this._path.OriginY = path.elements.length > 0 ? path.originY : current.y;
    this._path.OriginVx = path.originVx;
    this._path.OriginVy = path.originVy;
    this._path.Elements = [];
    this._path.Elements = path.elements;
    this._elapsedMs = 0;
    this._active = path.elements.length > 0;
  }

  Update(dt: number, position: { x: number; y: number }): boolean {
    if (!this._active) return false;
    this._elapsedMs += dt * 1000;
    const next = this._path.CalcPassivePos(
      position.x, position.y, 0, 0, 0, this._elapsedMs,
      id => this._footholds.find(fh => fh.Id === id) ?? null,
    );
    position.x = next.x;
    position.y = next.y;
    if (this._path.IsComplete) this._active = false;
    return true;
  }
}
