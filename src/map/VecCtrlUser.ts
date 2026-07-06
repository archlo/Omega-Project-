import { VecCtrl } from './VecCtrl.js';

export class VecCtrlUser extends VecCtrl {
  LadderSpeed = 120;
  IsClimbing = false;

  private static readonly WalkSpeed = 125;
  private static readonly WalkForce = 140000;
  private static readonly WalkDrag = 80000;
  private static readonly JumpSpeed = 555;
  private static readonly Gravity = 2000;
  private static readonly MaxFallSpeed = 670;

  WorkUpdateActiveLadderOrRope(dt: number): void {
    if (!this.IsOnLadder && !this.IsOnRope) return;
    const dtS = dt / 1000;
    if (this.IsUp) {
      this.Vy = -this.LadderSpeed;
    } else if (this.IsDown) {
      this.Vy = this.LadderSpeed;
    } else {
      this.Vy = 0;
    }
    this.Pos.y += this.Vy * dtS;
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
      this.Vy += VecCtrlUser.Gravity * dtS;
      const maxV = VecCtrlUser.MaxFallSpeed;
      if (Math.abs(this.Vy) > maxV) this.Vy = this.Vy > 0 ? maxV : -maxV;

      const speed = VecCtrlUser.WalkSpeed;
      if (this.Vx > speed) this.Vx -= VecCtrlUser.WalkDrag * dtS;
      else if (this.Vx < -speed) this.Vx += VecCtrlUser.WalkDrag * dtS;
      else if (Math.abs(this.Vx) < 1) this.Vx = 0;
    }

    this.Pos.prevX = this.Pos.x;
    this.Pos.prevY = this.Pos.y;
    this.Pos.x += this.Vx * dtS;
    this.Pos.y += this.Vy * dtS;
  }

  private IsOnFoothold(): boolean {
    return this.Fh !== null;
  }
}
