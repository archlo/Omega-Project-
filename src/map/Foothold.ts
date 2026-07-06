// ponytail: State mirrors OG CStaticFoothold::m_nState — 1=enabled, 0=disabled, 2=moving
export class Foothold {
  Id = 0;
  Layer = 0;
  Group = 0;
  X1 = 0;
  Y1 = 0;
  X2 = 0;
  Y2 = 0;
  Prev = 0;
  Next = 0;
  CantThrough = false;
  ForbidFallDown = false;
  Force = 0;
  ZMass = 0;
  State = 1;

  get Slope(): number {
    return this.X1 === this.X2 ? 0 : (this.Y2 - this.Y1) / (this.X2 - this.X1);
  }

  get IsWall(): boolean {
    return this.X1 === this.X2;
  }

  get LeftEdgeX(): number {
    return Math.min(this.X1, this.X2);
  }

  get RightEdgeX(): number {
    return Math.max(this.X1, this.X2);
  }

  YAt(x: number): number | null {
    const lo = Math.min(this.X1, this.X2);
    const hi = Math.max(this.X1, this.X2);
    if (x < lo || x > hi) return null;
    if (this.X1 === this.X2) return Math.min(this.Y1, this.Y2);
    const t = (x - this.X1) / (this.X2 - this.X1);
    return this.Y1 + t * (this.Y2 - this.Y1);
  }

  DistanceSquaredTo(x: number, y: number): number {
    const dx = this.X2 - this.X1;
    const dy = this.Y2 - this.Y1;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) {
      const ex = x - this.X1, ey = y - this.Y1;
      return ex * ex + ey * ey;
    }
    let t = ((x - this.X1) * dx + (y - this.Y1) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = this.X1 + t * dx, py = this.Y1 + t * dy;
    const ex = x - px, ey = y - py;
    return ex * ex + ey * ey;
  }
}
