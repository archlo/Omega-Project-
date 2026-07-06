import type { DecodedMovePath } from '../net/packet/MovePathDecoder.js';

export class RemoteMoveReplay {
  private _segments: { x: number; y: number; duration: number; elapsed: number }[] = [];
  private _from = { x: 0, y: 0 };

  SetPath(path: DecodedMovePath, current: { x: number; y: number }): void {
    // TODO_AUDIT.md Hundred-and-forty-seventh pass: replay decoded pet/dragon
    // CMovePath endpoints instead of discarding the path. This is endpoint
    // interpolation, not a full CVecCtrl physics clone.
    this._from = { x: current.x, y: current.y };
    this._segments = path.elements
      .filter((e) => e.elapse > 0)
      .map((e) => ({ x: e.x, y: e.y, duration: Math.max(e.elapse / 1000, 0.016), elapsed: 0 }));
    if (this._segments.length === 0) {
      const last = path.elements[path.elements.length - 1];
      if (last) this._segments = [{ x: last.x, y: last.y, duration: 0.016, elapsed: 0 }];
    }
  }

  Update(dt: number, position: { x: number; y: number }): boolean {
    const seg = this._segments[0];
    if (!seg) return false;
    seg.elapsed += dt;
    const t = Math.min(1, seg.elapsed / seg.duration);
    position.x = this._from.x + (seg.x - this._from.x) * t;
    position.y = this._from.y + (seg.y - this._from.y) * t;
    if (t >= 1) {
      this._from = { x: seg.x, y: seg.y };
      this._segments.shift();
    }
    return true;
  }
}
