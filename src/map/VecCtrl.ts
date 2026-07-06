import type { Foothold } from './Foothold.js';
import type { MoveElement } from '../net/packet/MovePathEncoder.js';
import { MovePathAttr } from '../net/protocol/Enums.js';

export interface VecPos {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
}

export class MovePath {
  OriginX = 0;
  OriginY = 0;
  OriginVx = 0;
  OriginVy = 0;
  Elements: MoveElement[] = [];

  Clear(): void {
    this.Elements = [];
  }

  CalcPassivePos(x: number, y: number, vx: number, vy: number, fh: number, elapsedMs: number): { x: number; y: number; vx: number; vy: number; fh: number } {
    let cx = x, cy = y, cvx = vx, cvy = vy, cfh = fh;
    let remaining = elapsedMs;
    for (const e of this.Elements) {
      if (remaining <= 0) break;
      switch (e.attr) {
        case MovePathAttr.Normal:
        case MovePathAttr.Normal2:
        case MovePathAttr.Normal4:
        case MovePathAttr.Normal5:
        case MovePathAttr.Normal6:
          cx = e.x; cy = e.y; cvx = e.vx; cvy = e.vy; cfh = e.fh;
          break;
        case MovePathAttr.NormalWithFhFall:
          cx = e.x; cy = e.y; cvx = e.vx; cvy = e.vy; cfh = e.fh;
          break;
        case MovePathAttr.Jump:
        case MovePathAttr.Jump2:
        case MovePathAttr.Jump3:
        case MovePathAttr.Jump4:
        case MovePathAttr.Jump5:
        case MovePathAttr.Jump6:
        case MovePathAttr.Jump7:
        case MovePathAttr.Jump8:
          cvx = e.vx; cvy = e.vy;
          break;
        case MovePathAttr.Teleport:
        case MovePathAttr.Teleport2:
        case MovePathAttr.Normal3:
          cx = e.x; cy = e.y; cfh = e.fh;
          break;
        case MovePathAttr.StatChange:
          break;
        case MovePathAttr.FlyingBlock:
          cx = e.x; cy = e.y; cvx = e.vx; cvy = e.vy;
          break;
      }
      remaining -= Math.max(e.elapse, 1);
    }
    return { x: cx, y: cy, vx: cvx, vy: cvy, fh: cfh };
  }
}

export class VecCtrl {
  Pos: VecPos = { x: 0, y: 0, prevX: 0, prevY: 0 };
  Vx = 0;
  Vy = 0;
  Fh: Foothold | null = null;
  FhLeft: Foothold | null = null;
  FhRight: Foothold | null = null;
  FhId = 0;
  MovePath = new MovePath();

  MoveAction = 0;
  IsFloating = false;
  IsFalling = false;
  IsJumping = false;
  IsOnLadder = false;
  IsOnRope = false;

  protected _lastAttr = 0;

  SetPos(x: number, y: number): void {
    this.Pos.prevX = this.Pos.x;
    this.Pos.prevY = this.Pos.y;
    this.Pos.x = x;
    this.Pos.y = y;
  }

  SetV(vx: number, vy: number): void {
    this.Vx = vx;
    this.Vy = vy;
  }

  SetFh(fhId: number, fh: Foothold | null, fhLeft: Foothold | null, fhRight: Foothold | null): void {
    this.FhId = fhId;
    this.Fh = fh;
    this.FhLeft = fhLeft;
    this.FhRight = fhRight;
  }

  SetMovePath(originX: number, originY: number, originVx: number, originVy: number, elements: MoveElement[]): void {
    this.MovePath.OriginX = originX;
    this.MovePath.OriginY = originY;
    this.MovePath.OriginVx = originVx;
    this.MovePath.OriginVy = originVy;
    this.MovePath.Elements = elements;
  }

  BeginUpdateActive(): void {}
  EndUpdateActive(): void {}

  InspectUpdateActive(): void {}

  WorkUpdateActive(dt: number, fhList: Foothold[]): void {
    if (this.IsJumping) this._calcJump(dt);
    else if (this.IsFalling) this._calcFall(dt);
    else this._calcWalk(dt, fhList);
    this._applyGravity(dt);
    this._resolveCollision(dt, fhList);
  }

  WorkUpdatePassive(dt: number, elapsedMs: number): boolean {
    const result = this.MovePath.CalcPassivePos(
      this.Pos.x, this.Pos.y, this.Vx, this.Vy, this.FhId, elapsedMs,
    );
    this.Pos.prevX = this.Pos.x;
    this.Pos.prevY = this.Pos.y;
    this.Pos.x = result.x;
    this.Pos.y = result.y;
    this.Vx = result.vx;
    this.Vy = result.vy;
    this.FhId = result.fh;
    if (this.MovePath.Elements.length > 0) {
      const last = this.MovePath.Elements[this.MovePath.Elements.length - 1];
      this._lastAttr = last.attr;
      const stance = last.moveAction;
      if (stance >= 0) this.MoveAction = stance;
    }
    return false;
  }

  UpdateActive(dt: number, fhList: Foothold[]): void {
    this.BeginUpdateActive();
    this.InspectUpdateActive();
    this.WorkUpdateActive(dt, fhList);
    this.EndUpdateActive();
  }

  UpdatePassive(dt: number, elapsedMs: number): boolean {
    return this.WorkUpdatePassive(dt, elapsedMs);
  }

  protected _calcWalk(dt: number, _fhList: Foothold[]): void {}
  protected _calcJump(dt: number): void {}
  protected _calcFall(dt: number): void {}
  protected _applyGravity(_dt: number): void {}
  protected _resolveCollision(_dt: number, _fhList: Foothold[]): void {}

  /*
   * OG: CVecCtrl::CalcWalk (0x992BA0) — force-driven walk on a foothold.
   * Integrates horizontal forces and clamps to terminal run speed.
   */
  static CalcWalk(vx: number, vy: number, speed: number, force: number, drag: number, dt: number): { vx: number; vy: number } {
    const dtS = dt / 1000;
    const sign = vx >= 0 ? 1 : -1;
    if (vx !== 0 && Math.abs(vx) > speed) {
      vx -= sign * drag * dtS;
      if (sign * vx < 0) vx = 0;
    }
    return { vx, vy };
  }

  /*
   * OG: CVecCtrl::CalcFloat (0x9934C0) — air/water physics integration.
   * Applies gravity and horizontal drag while airborne.
   */
  static CalcFloat(vx: number, vy: number, gravity: number, maxFallSpeed: number, drag: number, dt: number): { vx: number; vy: number } {
    const dtS = dt / 1000;
    vy += gravity * dtS;
    if (vy > maxFallSpeed) vy = maxFallSpeed;
    if (vy < -maxFallSpeed) vy = -maxFallSpeed;
    if (vx !== 0) {
      const sign = vx >= 0 ? 1 : -1;
      vx -= sign * drag * dtS;
      if (sign * vx < 0) vx = 0;
    }
    return { vx, vy };
  }
}
