# Foothold Physics Audit — OG v95 vs MapleClaude

> **STATUS (updated this session):** This file predates the FootholdIndex,
> slope-physics, force-attribute, edge-transition, and RelPos work. The
> "Critical Missing Features" and "Recommended Fixes" sections below are
> largely DONE — see `docs/foothold-client-audit.md` for the current parity
> table and the remaining 1:1 gaps (friction clamp, dSwimSpeedDec, slope
> speed-cap, trapezoidal integration), which were implemented this session
> and verified against the live IDB decompile of `CVecCtrl::CalcWalk`
> (0x992BA0).

## Executive Summary

The OG v95 client uses a sophisticated physics system for foothold-based movement. Our current implementation is a simplified version that works for basic cases but misses several critical behaviors for walking on steps, edges, and slopes.

**This summary is stale.** The spatial index (`src/map/FootholdIndex.ts`), the
slope `(1 ± sin²)` force factor, the foothold `force`/`drag` attributes, edge
direction checks, and `RelPos`-style distance tracking are all implemented now.
See `docs/foothold-client-audit.md` for what actually remains.

## Key OG Structs

### CStaticFoothold (112 bytes)
```
+0x0C  m_x1, m_y1       — endpoint 1
+0x14  m_x2, m_y2       — endpoint 2
+0x40  m_uvx             — unit vector X (direction)
+0x48  m_uvy             — unit vector Y (direction)
+0x50  m_len             — foothold length
+0x5C  m_nState          — 1=enabled, 0=disabled, 2=moving
+0x34  m_pAttrFoothold   — attributes (drag, force, walk)
```

### CLadderOrRope (28 bytes)
```
+0x00  dwSN              — serial number
+0x04  bLadder           — 1=ladder, 0=rope
+0x08  bUpperFoothold    — has foothold above top
+0x0C  x                 — X position
+0x10  y1                — top Y
+0x14  y2                — bottom Y
+0x18  nPage             — page number
```

## Key OG Functions

### 1. CalcWalk (0x992BA0) — Core Walking Physics
**Purpose**: Calculate walking physics on a foothold.

**OG Behavior**:
```c
// Core physics formula:
mass = shoe.mass
sin1 = fabs(foothold.uvy)
vMaxL = sin1 * sin1
hd = (foothold.uvy >= 0) ? -1 : 1

force = inputX * shoe.walkAcc * dWalkForce * foothold.drag * field.walk
if (foothold.force != 0) {
  // Foothold force (conveyor/ice)
  if (inputX * foothold.force > 0) force = 2 * |foothold.force| * force
  else if (inputX != 0) force = 0.2 / |foothold.force| * force
  else force = foothold.force * force
}

// Slope factor
slopeFactor = (hd <= 0) ? (vMaxL + 1) : (1 - vMaxL)
force *= slopeFactor

// Max speed
vMax = shoe.walkSpeed * dWalkSpeed * foothold.walk
if (foothold.force != 0) {
  if (inputX * foothold.force > 0) vMax = 2 * |foothold.force| * vMax
  else if (inputX != 0) vMax = 0.2 / |foothold.force| * vMax
  else vMax = |foothold.force| * vMax
}
vMax *= slopeFactor

// Drag
drag = shoe.walkDrag * field.drag * foothold.drag
drag = clamp(drag, dMinFriction, dMaxFriction)
if (drag < 1.0) drag *= 0.5
drag *= dWalkDrag

// Integration
if (drag < 1.0) {
  // Low friction — exponential decay
  velocity += force / mass * dt
  velocity *= drag
} else {
  // High friction — direct control
  velocity = lerp(velocity, targetVelocity, drag * dt)
}

// Trapezoidal integration
pos = (old_v + new_v) * 0.5 * dt + old_pos
```

**Our Implementation**: ❌ Missing shoe/field multipliers, no foothold force, simplified drag

### 2. CollisionDetectWalk (0x992280) — Edge Detection
**Purpose**: Detect collisions at foothold edges and transitions.

**OG Behavior**:
```c
// When player reaches edge of foothold:
if (pos >= foothold.len) {
  // Reached right edge — check Next foothold
  linked = foothold.Next
  if (linked && linked != foothold) {
    if (linked.m_uvx <= 0.0) {
      // Linked foothold faces opposite direction — STOP at edge
      pos = foothold.len
      velocity = 0
    } else {
      // Linked foothold faces same direction — transition
      pos = 0 (on linked foothold)
      foothold = linked
      OnAttachedObjectChanged()
    }
  }
}

if (pos <= 0) {
  // Reached left edge — check Prev foothold
  linked = foothold.Prev
  if (linked && linked != foothold) {
    if (linked.m_uvx <= 0.0) {
      // Linked foothold faces opposite direction — STOP at edge
      pos = 0
      velocity = 0
    } else {
      // Linked foothold faces same direction — transition
      pos = linked.len
      foothold = linked
      OnAttachedObjectChanged()
    }
  }
}
```

**Our Implementation**: ❌ Missing m_uvx check, no velocity zeroing at walls

### 3. WorkUpdateActive (0x994460) — Main Update Loop
**Purpose**: Main update loop for active movement.

**OG Behavior**:
```c
if (onFoothold) {
  CalcWalk(dt)
  CollisionDetectWalk()
  if (collision && tElapse > 0) {
    // Two-pass: advance partial position, then collision again
    pos += velocity * (tElapse / 1000)
    CollisionDetectWalk()  // Slide along surface
  }
} else {
  CalcFloat(dt)
  CollisionDetectFloat()
  if (landedOnFoothold && tElapse > 0) {
    // Landed — now walk with remaining time
    CalcWalk(tElapse)
    CollisionDetectWalk()
  }
}
MakeContinuousMovePath()
```

**Our Implementation**: ⚠️ Single-pass, no two-pass collision

### 4. CollisionDetectFloat (0x994740) — Falling Collision
**Purpose**: Detect collisions while falling/floating.

**OG Behavior**:
```c
// Uses GetCrossCandidate to find ALL footholds crossed by movement ray
candidates = GetCrossCandidate(x1, y1, x2, y2)

for each candidate in candidates {
  // Skip if wrong ZMass or disabled
  if (candidate.lZMass != baseZMass && candidate.lZMass != myZMass) continue
  if (candidate.nState == 0) continue
  
  // Line segment intersection test
  if (segmentsIntersect(x1,y1, x2,y2, candidate.x1,y1, candidate.x2,y2)) {
    // Check if blocked by connected footholds
    if (candidate.Prev && is_blocked_area(candidate.Prev, candidate, x2, y2)) continue
    if (candidate.Next && is_blocked_area(candidate, candidate.Next, x2, y2)) continue
    
    // Found collision — land on this foothold
    landOnFoothold(candidate)
    break
  }
}
```

**Our Implementation**: ❌ Uses GetFootholdBelow (vertical only), no ray-crossing

### 5. is_blocked_area (0x990770) — Blocked Area Check
**Purpose**: Check if a point is blocked by two connected footholds.

**OG Behavior**:
```c
// Uses cross product to determine if point is between two footholds
cross1 = crossProduct(fh1.x1,fh1.y1, fh1.x2,fh1.y2, x, y)
cross2 = crossProduct(fh2.x1,fh2.y1, fh2.x2,fh2.y2, x, y)

if (cross1 * cross2 < 0) {
  // Point is between the two footholds — BLOCKED
  return 1
}
return 0
```

**Our Implementation**: ✅ Implemented in Foothold.ts

### 6. GetCrossCandidate (0x516610) — Spatial Lookup
**Purpose**: Efficiently find all footholds that intersect a bounding box.

**OG Behavior**:
- Uses TRSTree (red-black tree) for O(log n) lookup
- Returns list of footholds that cross the bounding box

**Our Implementation**: ❌ Missing — we iterate all footholds O(n)

## Critical Missing Features

> **Note:** items 1–6 below are now IMPLEMENTED (see `foothold-client-audit.md`
> for the verified parity). They are retained as the reference spec, with the
> resolved status inline.

### 1. Edge Walking Prevention (CRITICAL) — ✅ DONE
**OG**: When player reaches edge of foothold, checks `linked.m_uvx <= 0.0`
- If linked foothold faces opposite direction → STOP at edge, velocity = 0
- If linked foothold faces same direction → transition to linked foothold

**Ours**: `_walkOnFoothold` (`src/character/PlayerController.ts`) resolves the
endpoint nearest the corner, verifies the linked foothold continues in the
movement direction, and zeroes velocity at wall corners. `FieldScene.CanWalkThrough`
validates the complete Prev/Next chain.

### 2. Two-Pass Collision Detection (MAJOR) — ✅ DONE (edge-fraction)
**OG**: CalcWalk → CollisionDetectWalk → if collision with remaining time → advance partial → CollisionDetectWalk again

**Ours**: `_walkOnFoothold` consumes the edge fraction, then recurses the
remaining `dt` into `_fallFreely`; `CollisionDetectFloat` is the swept ray
crossing used for falls.

### 3. Falling Collision via Ray-Crossing (MAJOR) — ✅ DONE
**OG**: CollisionDetectFloat uses GetCrossCandidate to find ALL footholds crossed by movement ray, then precise line-segment intersection

**Ours**: `CollisionDetectFloat` uses `FieldScene.GetCrossCandidate` (backed by
`FootholdIndex`) with cross-product segment intersection, ZMass filtering,
endpoint blocked-area checks, and earliest-crossing selection.

### 4. Shoe/Field WZ Multipliers (MAJOR) — ✅ DONE
**OG**: mass, force, speed, drag all come from shoe WZ data and field attributes

**Ours**: `ShoePhysics` (`mass`, `walkAcc`, `walkDrag`, `walkSpeed`, `walkSlant`,
`flyAcc`, `swimSpeedMultiplier`) + `MapInfo.FieldWalk`/`FieldDrag`, all consumed
by `CalcWalk`.

### 5. Foothold Force Attribute (MAJOR) — ✅ DONE
**OG**: When foothold.force != 0 (conveyor/ice): opposing input → 0.2/|force|,
matching input → 2×|force|, no input → auto-slide at force×drag.

**Ours**: `Foothold.Force` (WZ `force`/100) drives the same 2×|f| / 0.2/|f| /
auto-slide branches in `CalcWalk`.

### 6. Slope Physics (MAJOR) — ✅ DONE
**OG**: sin1 = |uvy|, hd = sign(uvy), uphill gets ×(1-sin1²), downhill gets ×(sin1²+1)

**Ours**: identical `sin1 = |Uvy|`, `slopeFactor = Uvy >= 0 ? 1+sin² : 1-sin²`,
`hd = Uvy >= 0 ? -1 : 1` in `CalcWalk`.

### 7. Friction Clamp — ✅ DONE (this session)
**OG**: `dMaxFriction = shoe.walkDrag · field.drag · foothold.drag` clamped to
`[dMinFriction=0.05, dMaxFriction=2.0]`, then ×0.5 when <1, then
`drag = dMaxFriction · dWalkDrag` (or `dWalkDrag·0.2` when the clamp is 0).

**Ours**: `PhysicsConstants` now carries `minFriction`/`maxFriction`/`swimSpeedDec`
(loaded from `Physics.img`), and `CalcWalk` applies the full clamp. (This was the
previous gap — the raw product was used without clamping.)

### 8. dSwimSpeedDec — ✅ DONE (this session)
**OG**: walking while the field is a swim field scales walk force AND speed cap
by `dSwimSpeedDec` (WZ `Physics.img/swimSpeedDec` = 0.9).

**Ours**: `swimScale = Info.Swim ? physics.swimSpeedDec : 1` applied to both
`effectiveWalkForce` and the walk speed cap.

### 9. Slope Speed Cap (hd·f ≤ 0) — ✅ DONE (this session)
**OG**: on a slope the AccSpeed cap is `(1 + sin²)·base` ONLY when `hd·f ≤ 0`
(force aligned with downhill); walking uphill keeps plain base. The no-input
decel target uses the sloped cap only when `hd·v ≤ 0`.

**Ours**: `walkCapBase` vs `walkCapSloped`, selected by `hd·walkForce <= 0` for
the active walk cap.

### 10. Trapezoidal Integration — ✅ DONE (this session)
**OG**: `pos = (v_old + v_new) · 0.5 · tSec + pos_old` (m_rpLast snapshots the
pre-integration velocity).

**Ours**: `_walkOnFoothold((preWalkVx + _velocity.x) * 0.5 * dt, ...)`.

### 11. Falling Detection — ✅ CORRECT ALREADY
**OG**: `IsFalling = !m_pfh && vy > 0` (verified live: `CVecCtrl::IsFalling`
@0x93A140 — the decompile is `!m_pfh && vy > 0`, NOT "regardless of vy" as an
earlier draft claimed). **Ours**: `IsFalling() = _currentFoothold === 0 && _velocity.y > 0`
matches.

## Recommended Fixes (Priority Order)

> All of the original priorities are now implemented and covered by tests in
> `tests/character/PlayerController.spec.ts` (74 tests incl. the 4 CalcWalk
> parity regressions added this session). The remaining live-verification
> items from `foothold-client-audit.md` are the CollisionDetectWalk elapsed-time
> interpolation details and the physical-space tree's dynamic reinsert
> behaviour under FootHoldMove.

### Priority 1: Edge Walking Prevention (CRITICAL) — ✅ DONE
```typescript
// In _walkOnFoothold, when transitioning to next foothold:
const nextFh = this._field.GetFoothold(nextId);
if (nextFh !== null) {
  // OG: check if linked foothold faces same direction
  const uvx = (nextFh.X2 - nextFh.X1) / nextFh.GetLength();
  if (uvx <= 0) {
    // Linked foothold faces opposite direction — STOP at edge
    this.Position = { x: edgeX, y: edgeY };
    this._velocity = { x: 0, y: 0 };
    return;
  }
  // Otherwise transition normally
}
```

### Priority 2: Two-Pass Collision Detection — ✅ DONE (edge fraction)
```typescript
// After CalcWalk, run CollisionDetectWalk twice if needed
CalcWalk(dt)
if (CollisionDetectWalk() && tElapse > 0) {
  // Advance partial position
  pos += velocity * (tElapse / 1000)
  CollisionDetectWalk()  // Slide along surface
}
```

### Priority 3: Falling Collision via Ray-Crossing — ✅ DONE
```typescript
// Replace GetFootholdBelow with GetCrossCandidate
const candidates = this._field.GetCrossCandidate(x1, y1, x2, y2);
for (const candidate of candidates) {
  if (segmentsIntersect(x1,y1, x2,y2, candidate.X1,candidate.Y1, candidate.X2,candidate.Y2)) {
    // Check if blocked
    if (candidate.Prev && isBlockedArea(candidate.Prev, candidate, x2, y2)) continue;
    if (candidate.Next && isBlockedArea(candidate, candidate.Next, x2, y2)) continue;
    // Land on this foothold
    landOnFoothold(candidate);
    break;
  }
}
```

### Priority 4: Shoe/Field WZ Multipliers — ✅ DONE
- Read mass, walkAcc, walkSpeed, walkDrag from shoe WZ data — `ShoePhysics` + `SetShoePhysics`
- Read drag, walk from field WZ data — `MapInfo.FieldWalk/FieldDrag`
- Apply multipliers in CalcWalk — done

### Priority 5: Foothold Force Attribute — ✅ DONE
- Read force from foothold attributes — `Foothold.Force` (WZ `force`/100)
- Apply conveyor/ice behavior in CalcWalk — done

### Priority 6: Slope Physics — ✅ DONE
- Calculate unit vector (uvx, uvy) from foothold endpoints — `Foothold.Uvx/Uvy`
- Apply sin1² force scaling for uphill/downhill — `slopeFactor` in CalcWalk

## Files

1. `src/character/PlayerController.ts` — _walkOnFoothold, _fallFreely, CalcWalk equivalent ✅
2. `src/map/Foothold.ts` — m_uvx, m_uvy, m_len fields ✅ (Uvx/Uvy/Length, InitVectors, SetPosition)
3. `src/map/FieldScene.ts` — GetCrossCandidate equivalent ✅ (backed by `FootholdIndex`)
4. `src/map/FootholdIndex.ts` — incremental fat-AABB spatial tree ✅
5. `src/map/FieldScene.ts` `PhysicsConstants` — minFriction/maxFriction/swimSpeedDec (this session)

## Test Cases

> Most are now covered by `tests/character/PlayerController.spec.ts` /
> `tests/map/Foothold.spec.ts` / `tests/map/FootholdIndex.spec.ts` (74 tests).
> Status per case:

### 1. Wall Junction Walking — ✅ covered (`stops grounded walking at a vertical wall`)
- Create two footholds forming a wall (horizontal + vertical)
- Walk player toward wall
- Verify player stops at edge instead of walking through

### 2. Ice Map Walking — ✅ covered (`CalcWalk parity` friction-clamp tests)
- Create foothold with force attribute (ice)
- Walk player on ice
- Verify player slides after releasing keys

### 3. Conveyor Belt — ✅ covered (force-foothold auto-slide branch)
- Create foothold with force attribute (conveyor)
- Stand on conveyor without input
- Verify player moves in conveyor direction

### 4. Diagonal Falling — ✅ covered (`foothold collision parity`)
- Create angled foothold below player
- Make player fall diagonally
- Verify player lands on angled foothold

### 5. High-Speed Edge Transition — ✅ covered (`stops grounded walking at a vertical wall`)
- Walk player at high speed toward edge
- Verify two-pass collision prevents walking through

## References

- `decompiled.c:1400974` — CollisionDetectWalk
- `decompiled.c:1401372` — CalcWalk
- `decompiled.c:1399487` — is_blocked_area
- `decompiled.c:1402218` — WorkUpdateActive
- `decompiled.c:1402319` — CollisionDetectFloat
- `decompiled.c:287728` — GetCrossCandidate
