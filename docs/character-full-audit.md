# Character System Full Audit — OG v95 vs MapleClaude

## Executive Summary

Audited the full character system against OG v95 decompilation across 3 subsystems:
- **CAvatar** (animation, rendering, action system)
- **CVecCtrl/CUserLocal** (movement, physics, collision)
- **CUser** (hit, death, revive, emotion, HP gauge)

**Total gaps found: 29** (5 CRITICAL, 12 MAJOR, 12 MINOR)

---

## CRITICAL Gaps (5)

### C1. Jump vy missing `÷ g` division
- **OG**: `vy = -(dJumpSpeed × walkJump / g)` — jump height depends on gravity
- **TS**: `vy = -jumpSpeed` — constant regardless of gravity
- **File**: `PlayerController.ts:371`
- **Impact**: On high-gravity fields, OG jumps lower. TS always jumps the same height.

### C2. No horizontal boost on jump
- **OG**: `vx = inputX × maxWalkSpeed × 0.8` — running jump gets horizontal boost
- **TS**: Preserves current vx — no boost
- **File**: `PlayerController.ts:365-374`
- **Impact**: Running jumps are significantly slower than OG.

### C3. No `CollisionDetectFloat` (segment-crossing collision)
- **OG**: Full line-segment cross-product collision with CW/CCW candidate tracking
- **TS**: Only vertical `GetFootholdBelow` check — misses wall footholds and thin platforms during freefall
- **File**: `PlayerController.ts:557-569`
- **Impact**: Player can pass through thin platforms or miss wall footholds.

### C4. Edge walking prevention (m_uvx check) — FIXED
- **OG**: `if (linked.m_uvx <= 0.0) { stop at edge; velocity = 0; }`
- **TS**: Was missing entirely — **FIXED this session** with `InitVectors()` + m_uvx check
- **File**: `PlayerController.ts:453-463`, `MobController.ts:361-396`

### C5. Foothold force attribute (conveyors/ice) absent
- **OG**: When `foothold.force != 0`: opposing input → `0.2/|force|`, matching → `2×|force|`, no input → auto-slide
- **TS**: No foothold force read at all
- **File**: `PlayerController.ts:288`
- **Impact**: Ice maps and conveyor belts don't work.

---

## MAJOR Gaps (12)

### M1. No slope speed modulation
- **OG**: `speed × (uvy² + 1)` — downhill faster, uphill slower
- **TS**: Flat speed regardless of slope
- **File**: `PlayerController.ts:288-294`

### M2. Ladder jump missing `× 1.3` horizontal multiplier
- **OG**: `vx = inputX × walkSpeed × 1.3`
- **TS**: `vx = inputX × walkSpeed`
- **File**: `PlayerController.ts:645`

### M3. Knockback uses direct velocity vs Impact system
- **OG**: Deferred impulse via Impact → next tick applies force through normal physics
- **TS**: Immediate velocity override with artificial stagger timer
- **File**: `PlayerController.ts:219-223`

### M4. No velocity projection on foothold landing
- **OG**: Projects velocity onto foothold direction at landing
- **TS**: Zeroes vy on any landing — slides off angled landings
- **File**: `PlayerController.ts:563`

### M5. No dual-pass collision after walk→fall transition
- **OG**: After `CollisionDetectWalk` detaches, continues with `CollisionDetectFloat(bCalcFloat=0)`
- **TS**: Does nothing
- **File**: `PlayerController.ts:380-382`

### M6. Walk/Stand variant selection missing walk2/stand2
- **OG**: `MoveAction2RawAction` uses per-character `m_nWalkType`/`m_nStandType`
- **TS**: Always walk1/stand1
- **File**: `Stance.ts:42-58`

### M7. Morph/morphed action remapping absent
- **OG**: 50+ case switches for monster morph, superman, ghost, mechanic modes
- **TS**: No morph handling
- **File**: `Stance.ts`, `CharLook.ts`

### M8. Tombstone spawn position wrong for mob attacks
- **OG**: Tombstone spawns at player's current position
- **TS**: Spawns at mob position for mob-attack deaths
- **File**: `GameStage.ts:5775, 5813`

### M9. Death flow timing difference
- **OG**: Opens revive UI immediately, creates tombstone layer, plays dead animation
- **TS**: Delays revive UI until tombstone lands, missing skill sound stop on death
- **File**: `GameStage.ts` death handling

### M10. Damage number uses hardcoded offset
- **OG**: `Position.y - CAvatar::GetHeight()` — adapts to character height
- **TS**: `Position.y - 40` — hardcoded
- **File**: `GameStage.ts:5764`

### M11. Stance dodge effect not rendered
- **OG**: Decodes stance info byte → shows stance skill visual
- **TS**: No stance visual effect
- **File**: `OtherCharLook.OnHit`

### M12. Remote user hit plays generic hit1
- **OG**: Plays mob-specific `sHit` WZ effect via `Effect_General`
- **TS**: Always plays generic `hit1` animation
- **File**: `OtherCharLook.ts:139-143`

---

## MINOR Gaps (12)

| # | Gap | OG | TS | File |
|---|-----|----|----|------|
| m1 | Euler vs Trapezoidal integration | `(v0+v1)*0.5*dt` | `pos += vel*dt` | PlayerController.ts:541,573 |
| m2 | Fly/swim jump missing `× 0.7` | `vy *= 0.7` from foothold | No reduction | PlayerController.ts:371 |
| m3 | Hardcoded slip constants | WZ dSlipForce/dSlipSpeed | 5000/100 | PlayerController.ts:305-306 |
| m4 | Missing drag clamp [dMinFriction, dMaxFriction] | Clamped | No clamp | PlayerController.ts:289 |
| m5 | Bottom ladder snap off-by-1 | `y2 + 1` | `lr.Bottom + 2` | PlayerController.ts:695 |
| m6 | Emotion suppression during prone | Blocks during prone | Runs unconditionally | CharLook.ts:216-238 |
| m7 | GetOneTimeAction numeric remapping for morphs | 50+ case remap | None | CharLook.ts:164-167 |
| m8 | PrepareActionLayer speed clamping [2,10] | Clamped | No clamp | CharLook.ts:164-167 |
| m9 | Hit alpha flash (TS-original, not in OG) | No flash | `_hitFlash = 0.25` | OtherCharLook.ts:142 |
| m10 | Alert remain timer (5s hit stun) | `m_tAlertRemain = 5000` | None | GameStage.ts hit handling |
| m11 | Mob hit sound on remote user | `play_mob_sound(mobId, atk+11)` | Silent | OtherCharLook.ts |
| m12 | Chair sit variant (48-54 → 6 poses) | 6 sit poses by chair type | Single sit pose | Stance.ts |

---

## What TS Does Well (matches OG)

- 5-layer render system (UnderFace/Face/OverFace/UnderChar/OverChar)
- Anchor chaining (navel→arm→hand→head→face)
- Emotion with real WZ per-frame delays
- AttackAction per weapon type with proneStab
- OneTimeAction blocks stance via timer gate
- HP gauge structurally identical (52×10, 5 rects)
- Ladder/rope climbing speed (walkSpeed × 3.0 per frame)
- Edge walking prevention (m_uvx check) — **fixed this session**
- Foothold unit vectors (uvx/uvy/length) — **added this session**
- Falling detection fix (Position.y < groundY) — **fixed this session**
- Hit animation + emotion on local player — **fixed this session**
- Weapon/equip fallback during hit animations — **fixed this session**

---

## Priority Fix Order

1. **C1**: Jump vy ÷ g — most impactful physics difference
2. **C2**: Horizontal jump boost — affects all platforming
3. **C3**: CollisionDetectFloat — prevents passing through platforms
4. **C5**: Foothold force attribute — ice/conveyor maps
5. **M1**: Slope speed modulation — subtle but noticeable
6. **M3**: Impact system for knockback — natural deceleration
7. **M6**: walk2/stand2 variants — visual fidelity
8. **M8**: Tombstone position fix — simple bug fix
9. **M10**: Dynamic damage number Y offset — uses GetHeight()
10. **M12**: Mob-specific hit effects — visual fidelity

## Files Summary

| File | Changes Needed |
|------|---------------|
| `PlayerController.ts` | C1, C2, C3, C5, M1, M2, M3, M4, M5, m1-m5 |
| `CharLook.ts` | M7, m6, m8 |
| `Stance.ts` | M6, M7 |
| `CharacterRenderer.ts` | Review only — solid |
| `OtherCharLook.ts` | M11, M12, m9, m11 |
| `GameStage.ts` | M8, M9, M10 |
| `src/map/Foothold.ts` | C4 — FIXED |
| `src/map/FieldScene.ts` | C4 — FIXED |
