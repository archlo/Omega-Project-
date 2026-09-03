# v95 Foothold and Character Audit

Authority: the v95 client IDA database, cross-checked against the current WZ
loader and TypeScript runtime.

## Static Foothold

`CStaticFoothold` is constructed from:

- serial number
- `(x1, y1)` and `(x2, y2)`
- page/layer
- ZMass/group
- previous and next serial numbers
- optional foothold attributes

The client stores both the original endpoints (`m_xReal1/2`,
`m_yReal1/2`) and mutable endpoints (`m_x1/2`, `m_y1/2`). It caches length and
the normalized direction vector. `SetPosition` changes only the mutable
endpoints and recomputes those cached values.

Current parity:

- WZ endpoint, link, layer, group, `cantThrough`, `forbidFallDown`, force, and
  drag fields are loaded.
- Original endpoint fields and `SetPosition` are now represented.
- Dynamic movement now recomputes length and direction.
- Zero and left-facing segments remain non-walkable through `IsVertical`.

## Physical-Space Queries

IDA-verified behavior:

- `GetCrossCandidate` searches the spatial tree using the movement rectangle.
- `GetFootholdUnderneath` considers only `x1 < x2`, requires interpolated
  ground Y at or below the query Y, and selects the smallest valid Y.
- `GetFootholdAbove` considers only `x1 < x2`, requires the interpolated Y to
  be inside the caller's vertical interval, and selects the highest candidate
  in that interval.
- `GetFootholdClosest` ignores segments shorter than eight horizontal pixels
  and compares squared distance to the integer midpoint, not perpendicular
  distance to the segment.
- `GetLadderOrRope` receives a rectangle, expands its X range by 10 pixels,
  and returns the first ladder/rope whose vertical span overlaps it.
- `CanWalkThrough` requires both footholds to face right and validates the
  complete Prev/Next chain, stopping at a wall or overlapping incompatible
  span.
- `FootHoldStateChange` changes state only.
- `FootHoldMove` translates the selected foothold by the supplied delta,
  updates cached geometry, removes its old spatial-tree entry, and reinserts
  it.

Current parity:

- Linear scans replace the client's spatial tree. This is behaviorally valid
  but not equivalent in performance or candidate ordering.
- The query methods and ladder rectangle tolerance now match the IDA formulas.
- `CanWalkThrough` is now used for player foothold transitions.
- Moving footholds update geometry and cached vectors, but the TypeScript field
  has no spatial-tree index to remove/reinsert.

## Character Controller

IDA shows the client controller uses:

- `RelPos.pos` along the foothold, `RelPos.v`, and elapsed milliseconds.
- exact edge time calculation when a movement step crosses an endpoint.
- Prev/Next attachment with direction checks and chain validation.
- moving-foothold offsets calculated from the previous and current relative
  positions.
- `CollisionDetectWalk` and `CollisionDetectFloat` with map-bound clamping,
  ZMass filtering, collision-time interpolation, and attachment callbacks.
- `CVecCtrlUser::WorkUpdateActiveLadderOrRope` at three transitions:
  upward grab from the previous/current movement rectangle, normal upward grab
  in `[y - 20, y]`, and downward grab in `[y, y + 10]`.
- ladder movement of `walkSpeed * inputY * 3`, top exit at `y1`, top attach at
  `y1 - 5` when an upper foothold exists, and bottom exit at `y2 + 1`.

Current parity:

- Ground walking now tracks `RelPos.pos`-style distance along the active
  foothold and converts it back to absolute coordinates.
- Edge traversal now consumes the remaining movement distance across linked
  footholds and validates the complete chain.
- Freefall collision now applies the verified ZMass, endpoint blocked-area,
  earliest-crossing, and inclusive endpoint filters. It remains a compact
  implementation rather than a literal port of every temporary C++ variable.
- Wall collision is approximated by a ZMass wall scan rather than the client's
  complete `CollisionDetectFloat` path.
- The ladder state machine matches the verified top/bottom constants and now
  uses the client's rectangle queries.
- Character attached-object callbacks, fall-tick timing, and move-path
  generation are not yet 1:1.

## Changes In This Audit

- Added original endpoint tracking and `Foothold.SetPosition`.
- Recomputed foothold vectors after dynamic movement.
- Removed state filtering from physical-space queries because the IDA query
  functions do not inspect `m_nState`.
- Changed ladder lookup to rectangle overlap with ±10 X tolerance.
- Added `FieldScene.CanWalkThrough` and wired it into player edge traversal.
- Added regression coverage for mutable foothold geometry.
- **This session:** verified the live `CVecCtrl::CalcWalk` (0x992BA0)
  decompile against `PlayerController.Update` and closed four genuine gaps:
  - **Friction clamp** — `dMaxFriction = shoe.walkDrag · field.drag ·
    foothold.drag` clamped to `[minFriction, maxFriction]`, `×0.5` when <1,
    then `× dWalkDrag` (or `dWalkDrag·0.2` when the clamp is 0). Added
    `minFriction`/`maxFriction`/`swimSpeedDec` to `PhysicsConstants` +
    `DEFAULT_PHYSICS` (auto-loaded from `Physics.img`).
  - **dSwimSpeedDec** — grounded walk force + speed cap scaled by it while on
    a swim field.
  - **Slope speed cap** — `(1+sin²)·base` only when `hd·f ≤ 0`, else base.
  - **Trapezoidal integration** — `pos = (v_old + v_new)·0.5·dt`.
  - Confirmed `CVecCtrl::IsFalling` (@0x93A140) is `!m_pfh && vy > 0` — the
    TS `IsFalling()` already matched (an earlier draft of `foothold-audit.md`
    claimed "regardless of vy", which the live decompile disproves).

## Next Required Work For Full 1:1

1. Port `CollisionDetectWalk`'s exact elapsed-time interpolation and
   attachment-state transitions (the `tElapse -= tCollide` /
   `MakeContinuousMovePath(tCollide)` timing under moving footholds).
2. Port the remaining `CollisionDetectFloat` CW/CCW tie ordering and wall
   collision path (mostly present; the wall-slip remainder-tick path is the
   residual).
3. Add the physical-space spatial index and dynamic remove/reinsert behavior.
   — ✅ DONE (`src/map/FootholdIndex.ts`, `FieldScene.FootHoldMove` reinserts
   via `footholdIndex.update(fh)`).
4. Add move-path snapshots and attached-object callbacks matching v95 timing
   (partial — `MakeContinuousMovePath`/`OnAttachedObjectChanged` exist).
