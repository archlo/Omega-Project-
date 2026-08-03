import { RelPos, VecCtrl } from './VecCtrl.js';
import type { Foothold } from './Foothold.js';

export class VecCtrlUser extends VecCtrl {
  // v95 CVecCtrlUser uses walkSpeed * inputY * 3 per 30 Hz tick.
  LadderSpeed = 125 * 3 * 30;
  IsClimbing = false;

  private static readonly WalkSpeed = 125;
  private static readonly WalkForce = 140000;
  private static readonly WalkDrag = 80000;
  private static readonly JumpSpeed = 555;
  private static readonly Gravity = 2000;
  private static readonly MaxFallSpeed = 670;

  WorkUpdateActiveLadderOrRope(dt: number): void {
    if (!this.IsOnLadder && !this.IsOnRope) return;
    const inputY = this.InputY || (this.IsUp ? -1 : this.IsDown ? 1 : 0);
    this.Vy = inputY * VecCtrlUser.WalkSpeed * 3 * dt / 30;
    this.Pos.x = this.LadderOrRope?.x ?? this.Pos.x;
    this.Pos.y += this.Vy;
    if (this.LadderOrRope) {
      const top = Math.min(this.LadderOrRope.y1, this.LadderOrRope.y2);
      const bottom = Math.max(this.LadderOrRope.y1, this.LadderOrRope.y2);
      this.Pos.y = Math.max(top, Math.min(bottom, this.Pos.y));
    }
  }

  IsUp = false;
  IsDown = false;

  WorkUpdateActive(dt: number, fhList: any[]): void {
    if (this.IsOnLadder || this.IsOnRope) {
      this.WorkUpdateActiveLadderOrRope(dt);
      return;
    }

    const dtS = dt / 1000;

    if (this.IsJumping) {
      this.Vy = -VecCtrlUser.JumpSpeed;
      this.IsJumping = false;
      this.IsFloating = true;
    }

    if (this.IsFloating) {
      const v = VecCtrl.CalcFloat(this.Vx, this.Vy, VecCtrlUser.Gravity, VecCtrlUser.MaxFallSpeed, 10000, dt);
      this.Vx = v.vx;
      this.Vy = v.vy;
    } else if (this.IsOnFoothold()) {
      this._walkRelative(dt, fhList as Foothold[]);
    } else {
      const v = VecCtrl.CalcFloat(this.Vx, this.Vy, VecCtrlUser.Gravity, VecCtrlUser.MaxFallSpeed, 10000, dt);
      this.Vx = v.vx;
      this.Vy = v.vy;
      this.IsFloating = true;
    }

    if (this.IsFloating) {
      this.Pos.prevX = this.Pos.x;
      this.Pos.prevY = this.Pos.y;
      this.Pos.x += this.Vx * dtS;
      this.Pos.y += this.Vy * dtS;
    }
  }

  private _walkRelative(dt: number, fhList: Foothold[]): void {
    if (!this.Fh) return;
    const fh = this.Fh;
    const rel = RelPos.From(this.Pos, this.Vx, this.Vy, fh);
    const slope = Math.abs(fh.Uvy);
    const downhill = fh.Uvy >= 0 ? 1 : -1;
    const slopeFactor = downhill > 0 ? 1 + slope * slope : 1 - slope * slope;
    const force = fh.Force === 0 ? this.InputX * VecCtrlUser.WalkForce * (fh.Drag || 1)
      : this.InputX === 0 ? fh.Force * VecCtrlUser.WalkForce
        : (this.InputX * fh.Force > 0 ? 2 * Math.abs(fh.Force) : 0.2 / Math.abs(fh.Force))
          * this.InputX * VecCtrlUser.WalkForce;
    const maxSpeed = VecCtrlUser.WalkSpeed * Math.max(0.5, slopeFactor)
      * (fh.Force !== 0 && this.InputX !== 0 ? (this.InputX * fh.Force > 0 ? 2 * Math.abs(fh.Force) : 0.2 / Math.abs(fh.Force)) : 1);
    const drag = this.InputX === 0 ? 0 : VecCtrlUser.WalkDrag * (fh.Drag || 1);
    // With no key input CVecCtrl decelerates an existing velocity; it does not
    // snap that velocity to the ordinary walk cap before collision detection.
    const next = VecCtrl.CalcWalk(rel.v, 0, this.InputX === 0 ? -1 : maxSpeed, force, drag, dt);
    rel.v = next.vx;
    rel.pos += (rel.v * dt) / 1000;
    const direction = Math.sign(rel.v) || Math.sign(this.InputX);
    if (rel.pos < 0 || rel.pos > fh.Length) {
      const linkId = direction < 0 ? fh.Prev : fh.Next;
      const linked = fhList.find(candidate => candidate.Id === linkId && !candidate.IsWall);
      if (linked) {
        this.Fh = linked;
        this.FhId = linked.Id;
        rel.pos = direction < 0 ? linked.Length : 0;
        rel.SetFromRelPos(this.Pos, linked);
        this.Vx = rel.v * linked.Uvx;
        this.Vy = rel.v * linked.Uvy;
        return;
      }
      rel.pos = Math.max(0, Math.min(fh.Length, rel.pos));
      this.IsFalling = true;
      this.IsFloating = true;
      this.Fh = null;
      this.FhId = 0;
    } else {
      rel.SetFromRelPos(this.Pos, fh);
      this.Vx = rel.v * fh.Uvx;
      this.Vy = rel.v * fh.Uvy;
    }
  }

  private IsOnFoothold(): boolean {
    return this.Fh !== null;
  }
}
