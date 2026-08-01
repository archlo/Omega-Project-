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
  Drag = 0;
  ZMass = 0;
  State = 1;

  // OG CStaticFoothold fields — computed from endpoints
  // m_uvx, m_uvy: unit vector direction (used for edge transition checks)
  // m_len: foothold length (distance between endpoints)
  private _uvx = 0;
  private _uvy = 0;
  private _len = 0;

  /** Initialize computed fields after endpoints are set */
  InitVectors(): void {
    const dx = this.X2 - this.X1;
    const dy = this.Y2 - this.Y1;
    this._len = Math.sqrt(dx * dx + dy * dy);
    if (this._len > 0) {
      this._uvx = dx / this._len;
      this._uvy = dy / this._len;
    } else {
      this._uvx = 0;
      this._uvy = 0;
    }
  }

  /** OG: m_uvx — unit vector X component */
  get Uvx(): number { return this._uvx; }

  /** OG: m_uvy — unit vector Y component */
  get Uvy(): number { return this._uvy; }

  /** OG: m_len — foothold length */
  get Length(): number { return this._len; }

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

  /** OG: CStaticFoothold::IsVertical (0xA12AF0) — returns m_uvx <= 0.0, i.e. the
   *  foothold does not point right (vertical walls have m_uvx = 0, left-pointing
   *  footholds have m_uvx < 0). Used by the OG space queries as the walkable test. */
  IsVertical(): boolean {
    return this.X2 - this.X1 <= 0;
  }

  /** OG: CStaticFoothold::GetForwardLink — follows foothold chain in a direction
   *  @param d - direction (-1 = backward, +1 = forward)
   *  @param posCur - current position along foothold
   *  @param len - remaining distance to travel
   *  Returns the foothold after traveling len distance in direction d */
  GetForwardLink(d: number, posCur: number, len: number): Foothold | null {
    let remaining = len;
    let pos = posCur;

    if (d < 0) {
      pos = posCur;
    } else if (d <= 0) {
      return this;
    } else {
      pos = this.GetLength() - posCur;
    }

    remaining -= pos;
    if (remaining <= 0) return this;

    let current: Foothold | null = this;
    while (current) {
      const next = d >= 0 ? current.Next : current.Prev;
      if (!next) return null;
      // Find the next foothold in the field
      // This is a simplified version - full implementation would need FieldScene reference
      remaining -= current.GetLength();
      if (remaining <= 0) return current;
      current = null; // Would need field reference to continue
    }
    return this;
  }

  /** OG: CStaticFoothold::GetLength — returns foothold length */
  GetLength(): number {
    const dx = this.X2 - this.X1;
    const dy = this.Y2 - this.Y1;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// OG helper functions — from decompiled.c
// ═══════════════════════════════════════════════════════════════════════════

/** OG cross product helper */
function cross(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): number {
  return (x2 - x1) * (y3 - y1) - (x3 - x1) * (y2 - y1);
}

/** OG is_blocked_area (0x990770) — true when point p lies on the blocked side of the
 *  corner formed by two connected footholds fh1 → fh2. Same cross-product test as the
 *  IDB: cross12 = cross(fh1, fh2); cross1p = cross(fh1, p); cross2p = cross(fh2, p);
 *  returns cross1p>0 && cross2p>0 when cross12 <= 0, else cross1p>0 || cross2p>0. */
export function isBlockedArea(fh1: Foothold, fh2: Foothold, x: number, y: number): boolean {
  const cross12 = (fh1.X2 - fh1.X1) * (fh2.Y2 - fh2.Y1) - (fh2.X2 - fh2.X1) * (fh1.Y2 - fh1.Y1);
  const cross1p = (y - fh1.Y1) * (fh1.X2 - fh1.X1) - (x - fh1.X1) * (fh1.Y2 - fh1.Y1);
  const cross2p = (y - fh2.Y1) * (fh2.X2 - fh2.X1) - (x - fh2.X1) * (fh2.Y2 - fh2.Y1);
  if (cross12 <= 0) return cross1p > 0 && cross2p > 0;
  return cross1p > 0 || cross2p > 0;
}

/** Line segment intersection check for collision detection */
export function segmentsIntersect(
  x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number, x4: number, y4: number,
): boolean {
  const d1 = cross(x3, y3, x4, y4, x1, y1);
  const d2 = cross(x3, y3, x4, y4, x2, y2);
  const d3 = cross(x1, y1, x2, y2, x3, y3);
  const d4 = cross(x1, y1, x2, y2, x4, y4);

  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }
  return false;
}
