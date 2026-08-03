import { RelPos, VecCtrl } from './VecCtrl.js';
import type { Foothold } from './Foothold.js';

export class VecCtrlUser extends VecCtrl {
  // v95 CVecCtrlUser uses walkSpeed * inputY * 3 per 30 Hz tick.
  LadderSpeed = 125 * 3 * 30;
  IsClimbing = false;
  IsSwimming = false;
  SwimSpeedMultiplier = 1;
  private _fhOffset = { id: 0, x: 0, y: 0 };

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

  SetSwimming(value: boolean, speedMultiplier = 1): void {
    this.IsSwimming = value;
    this.SwimSpeedMultiplier = speedMultiplier > 0 ? speedMultiplier : 1;
  }

  override WorkUpdatePassive(dt: number, elapsedMs: number, resolveFh?: (id: number) => Foothold | null): boolean {
    const complete = super.WorkUpdatePassive(dt, elapsedMs, resolveFh);
    const fh = this.Fh ?? resolveFh?.(this.FhId) ?? null;
    if (fh?.State === 2 && (this.MovePath.LastOffset.x !== 0 || this.MovePath.LastOffset.y !== 0)) {
      this.Pos.x -= this.MovePath.LastOffset.x;
      this.Pos.y -= this.MovePath.LastOffset.y;
    }
    return complete;
  }

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

    if (this.IsFloating && this.IsSwimming) {
      const vMax = 140 * this.SwimSpeedMultiplier;
      const force = 120000;
      const inputY = this.InputY || (this.IsUp ? -1 : this.IsDown ? 1 : 0);
      this.Vx = VecCtrlUser._swimAxis(this.Vx, this.InputX, force, vMax, dtS);
      this.Vy = VecCtrlUser._swimVertical(this.Vy, inputY, force, vMax, dtS);
    } else if (this.IsFloating) {
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
    if (this._fhOffset.id !== fh.Id) {
      this._fhOffset = { id: fh.Id, x: fh.MovementOffsetX, y: fh.MovementOffsetY };
    } else {
      this.Pos.x += fh.MovementOffsetX - this._fhOffset.x;
      this.Pos.y += fh.MovementOffsetY - this._fhOffset.y;
      this._fhOffset = { id: fh.Id, x: fh.MovementOffsetX, y: fh.MovementOffsetY };
    }
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

  private static _swimAxis(v: number, input: number, force: number, max: number, dt: number): number {
    v = VecCtrlUser._dec(v, 100000, max, dt);
    return input !== 0 ? Math.max(-max, Math.min(max, v + input * force * dt)) : VecCtrlUser._dec(v, 100000, 0, dt);
  }

  private static _swimVertical(v: number, input: number, force: number, max: number, dt: number): number {
    v = VecCtrlUser._dec(v, 100000, max, dt);
    const g = force / max;
    if (input === 0) return Math.min(max, v + g * dt);
    const floor = input < 0 ? max * 0.3 : max * 1.5;
    return input < 0 ? Math.max(floor, v - g * dt) : Math.min(floor, v + g * 0.5 * dt);
  }

  private static _dec(v: number, force: number, max: number, dt: number): number {
    if (v > max) return Math.max(max, v - force * dt);
    if (v < -max) return Math.min(-max, v + force * dt);
    return v;
  }
}
