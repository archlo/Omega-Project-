import { VecCtrl } from './VecCtrl.js';

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
      // Grounded users follow the foothold instead of accumulating gravity.
      // Once they leave its span, the controller becomes airborne.
      const speed = VecCtrlUser.WalkSpeed;
      if (this.Vx > speed) this.Vx = Math.max(speed, this.Vx - VecCtrlUser.WalkDrag * dtS);
      else if (this.Vx < -speed) this.Vx = Math.min(-speed, this.Vx + VecCtrlUser.WalkDrag * dtS);
      else if (Math.abs(this.Vx) < 1) this.Vx = 0;
    } else {
      const v = VecCtrl.CalcFloat(this.Vx, this.Vy, VecCtrlUser.Gravity, VecCtrlUser.MaxFallSpeed, 10000, dt);
      this.Vx = v.vx;
      this.Vy = v.vy;
      this.IsFloating = true;
    }

    this.Pos.prevX = this.Pos.x;
    this.Pos.prevY = this.Pos.y;
    this.Pos.x += this.Vx * dtS;
    this.Pos.y += this.Vy * dtS;

    if (!this.IsFloating && this.Fh) {
      const footholdY = this.Fh.YAt(this.Pos.x);
      if (footholdY === null || this.Pos.x < Math.min(this.Fh.X1, this.Fh.X2)
        || this.Pos.x > Math.max(this.Fh.X1, this.Fh.X2)) {
        const right = this.Vx >= 0;
        const linkId = right ? this.Fh.Next : this.Fh.Prev;
        const linked = fhList.find(fh => fh.Id === linkId && !fh.IsWall);
        if (linked) {
          this.Fh = linked;
          this.FhId = linked.Id;
          this.Pos.x = right
            ? Math.min(linked.X1, linked.X2) + 4
            : Math.max(linked.X1, linked.X2) - 4;
          this.Pos.y = linked.YAt(this.Pos.x) ?? this.Pos.y;
          this.Vy = 0;
        } else {
          this.IsFalling = true;
          this.IsFloating = true;
          this.Fh = null;
          this.FhId = 0;
        }
      } else {
        this.Pos.y = footholdY;
        this.Vy = 0;
      }
    }
  }

  private IsOnFoothold(): boolean {
    return this.Fh !== null;
  }
}
