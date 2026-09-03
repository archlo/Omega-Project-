export declare class Foothold {
    Id: number;
    Layer: number;
    Group: number;
    X1: number;
    Y1: number;
    X2: number;
    Y2: number;
    RealX1: number;
    RealY1: number;
    RealX2: number;
    RealY2: number;
    MovementOffsetX: number;
    MovementOffsetY: number;
    Prev: number;
    Next: number;
    CantThrough: boolean;
    ForbidFallDown: boolean;
    Force: number;
    Drag: number;
    ZMass: number;
    State: number;
    private _uvx;
    private _uvy;
    private _len;
    /** Initialize computed fields after endpoints are set */
    InitVectors(): void;
    /** CStaticFoothold::SetPosition: updates live endpoints and cached geometry. */
    SetPosition(x1: number, x2: number, y1: number, y2: number): void;
    MoveBy(dx: number, dy: number): void;
    private _recomputeVectors;
    /** OG: m_uvx — unit vector X component */
    get Uvx(): number;
    /** OG: m_uvy — unit vector Y component */
    get Uvy(): number;
    /** OG: m_len — foothold length */
    get Length(): number;
    get Slope(): number;
    get IsWall(): boolean;
    get LeftEdgeX(): number;
    get RightEdgeX(): number;
    YAt(x: number): number | null;
    DistanceSquaredTo(x: number, y: number): number;
    /** OG: CStaticFoothold::IsVertical (0xA12AF0) — returns m_uvx <= 0.0, i.e. the
     *  foothold does not point right (vertical walls have m_uvx = 0, left-pointing
     *  footholds have m_uvx < 0). Used by the OG space queries as the walkable test. */
    IsVertical(): boolean;
    /** OG: CStaticFoothold::GetForwardLink — follows foothold chain in a direction
     *  @param d - direction (-1 = backward, +1 = forward)
     *  @param posCur - current position along foothold
     *  @param len - remaining distance to travel
     *  Returns the foothold after traveling len distance in direction d */
    GetForwardLink(d: number, posCur: number, len: number, resolve?: (id: number) => Foothold | null): Foothold | null;
    /** OG: CStaticFoothold::GetLength — returns foothold length */
    GetLength(): number;
}
/** OG is_blocked_area (0x990770) — true when point p lies on the blocked side of the
 *  corner formed by two connected footholds fh1 → fh2. Same cross-product test as the
 *  IDB: cross12 = cross(fh1, fh2); cross1p = cross(fh1, p); cross2p = cross(fh2, p);
 *  returns cross1p>0 && cross2p>0 when cross12 <= 0, else cross1p>0 || cross2p>0. */
export declare function isBlockedArea(fh1: Foothold, fh2: Foothold, x: number, y: number): boolean;
/** Line segment intersection check for collision detection */
export declare function segmentsIntersect(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number): boolean;
//# sourceMappingURL=Foothold.d.ts.map