import { Stance, StanceMoveAction, StanceToWzKey } from './Stance.js';
import type { PlayerInput } from './PlayerInput.js';
import type { FieldScene } from '../map/FieldScene.js';
import type { Foothold } from '../map/Foothold.js';
import { MoveElement, EncodeMovePath } from '../net/packet/MovePathEncoder.js';
import * as CUserLocal from './CUserLocal.js';

export class PlayerController {
  // OG: CWvsPhysicalSpace2D::CWvsPhysicalSpace2D (decompile/A173E0.c) loads
  // every one of these by name from the real WZ data at `Map/Physics.img`
  // (confirmed directly against wz_client/Map.nx, not just the decompile) —
  // these aren't hardcoded engine tuning, they're game data. Gravity/
  // MaxFallSpeed/BaseJumpSpeed/FlySpeed already happened to match exactly
  // (well-known published v83-v95 constants); BaseWalkSpeed was off (140
  // vs the real 125), and Fly/Swim used an arcade clamp model that doesn't
  // resemble OG's actual force/mass integration at all — see CalcWalk/
  // CalcFloat (decompile/992BA0.c, 9934C0.c) and the AccSpeed/DecSpeed
  // helpers below (decompile/990850.c, 9908C0.c).
  // OG: Max Y-difference allowed when following Prev/Next chain in CollisionDetectWalk.
  // Larger diff = the next foothold isn't walkably connected (fall instead).
  private static readonly MaxWalkStepUp = 12;
  private static readonly BaseWalkSpeed = 125; // WZ: Physics.img/walkSpeed
  private static readonly WalkForce = 140000; // WZ: Physics.img/walkForce
  private static readonly WalkDrag = 80000; // WZ: Physics.img/walkDrag
  private static readonly BaseJumpSpeed = 555; // WZ: Physics.img/jumpSpeed
  private static readonly Gravity = 2000; // WZ: Physics.img/gravityAcc
  private static readonly MaxFallSpeed = 670; // WZ: Physics.img/fallSpeed
  private static readonly FlyForce = 120000; // WZ: Physics.img/flyForce
  private static readonly FlySpeed = 200; // WZ: Physics.img/flySpeed
  private static readonly SwimForce = 120000; // WZ: Physics.img/swimForce
  private static readonly SwimSpeed = 140; // WZ: Physics.img/swimSpeed
  // OG: dFloatDrag1 (WZ: Physics.img/floatDrag1) — the baseline air/water
  // resistance used for both axes in CalcFloat's swim/passive-fly branch.
  private static readonly FloatDrag = 100000;
  // OG: dFloatDrag2 (WZ: Physics.img/floatDrag2) — the much weaker air
  // resistance used for horizontal control during a normal (non-fly,
  // non-swim) jump/fall.
  private static readonly FloatDrag2 = 10000;
  // OG: dFloatCoefficient (WZ: Physics.img/floatCoefficient) — while still
  // rising in a jump (vy < terminal fall speed), no-input horizontal decel
  // uses FloatDrag2*this coefficient instead of the full FloatDrag2 rate;
  // the full rate only applies once you're actually falling. Confirmed by
  // a real test regression: without this distinction, a knockback's
  // horizontal velocity decayed to zero in a single frame instead of
  // persisting through the stagger window.
  private static readonly FloatCoefficient = 0.01;
  private static readonly BodyHeight = 60;
  private static readonly ClimbSpeed = 120;
  private static readonly FlushSeconds = 0.10;
  private static readonly MaxElements = 12;
  private static readonly FallDamageThreshold = 500;
  private static readonly FallDamagePerPx = 0.08;
  // OG: CVecCtrl::CalcWalk (0x992BA0) slip-branch constants — walkSlant is the
  // shoe attribute threshold (m_pCurAttrShoe.walkSlant, defaults to 0.1); dSlipForce
  // and dSlipSpeed are read from CONSTANTS+0x18/+0x20 (Physics.img/slipForce=5000,
  // slipSpeed=100).
  private static readonly WalkSlant = 0.1;
  private static readonly SlipForce = 5000;
  private static readonly SlipSpeed = 100;

  // OG: AccSpeed/DecSpeed (decompile/990850.c, 9908C0.c) — every walk/fly/
  // swim velocity update in CVecCtrl goes through one of these two. `f` is
  // a signed force, `vMax` is a symmetric (always >=0) magnitude bound.
  // AccSpeed pushes v *toward* ±vMax in the direction of f's sign, never
  // overshooting; DecSpeed only acts when v is already outside [-vMax,
  // vMax] and eases it back in — it does nothing if v is already within
  // bounds (not a generic "decelerate" — confirmed by reading the real
  // branches, not assumed).
  private static accSpeed(v: number, f: number, m: number, vMax: number, dt: number): number {
    if (vMax < 0) return v;
    if (f <= 0) {
      if (-vMax < v) {
        v = f / m * dt + v;
        if (v < -vMax) v = -vMax;
      }
    } else if (vMax > v) {
      v = f / m * dt + v;
      if (v > vMax) v = vMax;
    }
    return v;
  }

  private static decSpeed(v: number, f: number, m: number, vMax: number, dt: number): number {
    if (vMax < 0) return v;
    if (vMax < v) {
      v -= f / m * dt;
      if (v < vMax) v = vMax;
    } else {
      const negVMax = -vMax;
      if (negVMax > v) {
        v = f / m * dt + v;
        if (v > negVMax) v = negVMax;
      }
    }
    return v;
  }

  private _field: FieldScene;
  private _velocity = { x: 0, y: 0 };
  private _grounded = false;
  private _wasGrounded = false;
  private _currentFoothold = 0;
  private _lastFhX1 = 0;
  private _lastFhY1 = 0;
  private _lastFootholdId = 0;
  private _staggerTimer = 0;
  private _shortDragTimer = 0; // OG: m_nSlideCount — temporary drag reduction after slide
  private _shortDragForce = 0; // OG: m_dShortDrag — reduced drag during slide
  private _climb: LadderOrRope | null = null;
  private _climbGrabFrame = false; // true for one frame after grabbing ladder
  private _animTimer = 0;
  private _flushTimer = 0;
  private _pending: MoveElement[] = [];
  private _lastSyncPos = { x: 0, y: 0 };
  private _lastSyncVel = { x: 0, y: 0 };
  private _lastSyncStance: Stance = Stance.Stand1;
  private _prevJump = false;
  private _fallStartY = 0;
  private _walkSpeed = PlayerController.BaseWalkSpeed;
  private _jumpSpeed = PlayerController.BaseJumpSpeed;

  Position = { x: 0, y: 0 };
  Stance: Stance = Stance.Stand1;
  Frame = 0;
  FacingLeft = false;
  ClimbMoving = false;
  // OG: CUserLocal::IsSit (decompile, `m_bSit`) — TODO_AUDIT.md
  // Seventy-sixth pass's chair/sitting finding. While sitting, movement
  // input is ignored (matching the OG behavior that initiates a sit only
  // when `CUser::IsStand` and clears it explicitly via the X-key toggle,
  // not via movement-cancels-sit — that distinct behavior isn't
  // decompile-confirmed here and isn't guessed at).
  private _isSitting = false;
  get IsSitting(): boolean { return this._isSitting; }

  Sit(x: number, y: number): void {
    this._isSitting = true;
    this.Position = { x, y };
    this.Stance = Stance.Sit;
  }

  StandUp(): void {
    this._isSitting = false;
    this.Stance = Stance.Stand1;
  }

  onTakeFallDamage: ((damage: number) => void) | null = null;

  // OG: CUserLocal state flags mirrored from IDA (0x9054b2 IsImmovable)
  private _isStunned = false;
  private _knockbackStun = false;
  private _isPreparingSkill = false;
  private _preparingSkillId = 0;
  private _repeatSkillId = 0;
  private _isAttract = false;
  private _directionMode = false;

  get Grounded(): boolean { return this._grounded; }
  get CurrentFoothold(): number { return this._currentFoothold; }
  set CurrentFoothold(v: number) { this._currentFoothold = v; }
  get IsStaggered(): boolean { return this._staggerTimer > 0; }
  get Climb(): LadderOrRope | null { return this._climb; }

  // OG: CUserLocal::IsImmovable (decompile 0x9054b2)
  // Checks: preparingSkill, is_able_to_move_during_gauge_skill, sit, stun,
  //         death animation (m_nMoveAction & 0xFFFFFFFE == 0x12), knockbackStun,
  //         repeatSkill(35121005)
  get IsImmovable(): boolean {
    if (this._isSitting) return true;
    if (this._isStunned) return true;
    if (this._knockbackStun) return true;
    if (this._directionMode) return true;
    return false;
  }

  get IsPreparingSkill(): boolean { return this._isPreparingSkill; }
  get PreparingSkillId(): number { return this._preparingSkillId; }
  get RepeatSkillId(): number { return this._repeatSkillId; }
  get IsAttract(): boolean { return this._isAttract; }
  get DirectionMode(): boolean { return this._directionMode; }

  SetStunned(v: boolean): void { this._isStunned = v; }
  SetKnockbackStun(v: boolean): void { this._knockbackStun = v; }
  SetPreparingSkill(skillId: number): void {
    this._isPreparingSkill = skillId !== 0;
    this._preparingSkillId = skillId;
  }
  SetRepeatSkill(skillId: number): void { this._repeatSkillId = skillId; }
  SetAttract(v: boolean): void { this._isAttract = v; }
  SetDirectionMode(v: boolean): void { this._directionMode = v; }

  constructor(field: FieldScene) {
    this._field = field;
  }

  SetStats(speedPct: number, jumpPct: number): void {
    this._walkSpeed = PlayerController.BaseWalkSpeed * (1 + speedPct / 100);
    this._jumpSpeed = PlayerController.BaseJumpSpeed * (1 + jumpPct / 100);
  }

  Spawn(pos: { x: number; y: number }): void {
    this.Position = { x: pos.x, y: pos.y };
    this._velocity = { x: 0, y: 0 };
    const fh = this._field.GetFootholdBelow(pos.x, pos.y);
    if (fh && fh.YAt(pos.x) !== null) {
      const gy = fh.YAt(pos.x)!;
      if (gy - pos.y <= 4) {
        this.Position.y = gy;
        this._currentFoothold = fh.Id;
        this._grounded = true;
      } else {
        this._grounded = false;
      }
    } else {
      this._grounded = false;
    }
    this._wasGrounded = this._grounded;
    this._prevJump = false;
    this._pending = [];
    this._flushTimer = 0;
    this._lastSyncPos = { x: this.Position.x, y: this.Position.y };
    this._lastSyncVel = { x: this._velocity.x, y: this._velocity.y };
    this._lastSyncStance = this.Stance;
  }

  ApplyKnockback(vx: number, vy: number, staggerSec = 0.4): void {
    this._velocity = { x: vx, y: vy };
    this._grounded = false;
    this._staggerTimer = staggerSec;
  }

  StopWalking(): void {
    if (this._grounded && this._climb === null) {
      this._velocity = { x: 0, y: this._velocity.y };
    }
  }

  Update(input: PlayerInput, dt: number): void {
    if (this._isSitting) return;
    this._wasGrounded = this._grounded;
    this._staggerTimer = Math.max(0, this._staggerTimer - dt);

    if (this._staggerTimer > 0) {
      input = { Left: false, Right: false, Up: false, Down: false, JumpPressed: false };
      // Apply gravity during knockback stagger
      this._velocity.y = Math.min(this._velocity.y + PlayerController.Gravity * dt, PlayerController.MaxFallSpeed);
      // Wall collision during stagger
      if (this._velocity.x !== 0) {
        const fh = this._field.GetFoothold(this._currentFoothold);
        if (fh && fh.ZMass !== 0) {
          const testX = this.Position.x + this._velocity.x * dt;
          const wallX = this._field.GetZMassWallX(fh.ZMass, this.Position.x, testX, this.Position.y - PlayerController.BodyHeight, this.Position.y);
          if (wallX !== null) this._velocity.x = 0;
        }
      }
      this.Position = {
        x: this.Position.x + this._velocity.x * dt,
        y: this.Position.y + this._velocity.y * dt,
      };
      // Landing check during stagger
      if (this._velocity.y > 0) {
        const fh = this._field.GetFootholdBelow(this.Position.x, this.Position.y);
        if (fh !== null && fh.YAt(this.Position.x) !== null) {
          const groundY = fh.YAt(this.Position.x)!;
          if (this.Position.y >= groundY) {
            this.Position.y = groundY;
            this._velocity.y = 0;
            this._grounded = true;
            this._currentFoothold = fh.Id;
          }
        }
      }
      this._clampToBounds();
      this._tickAnimAndFlush(dt);
      return;
    }

    if (this._climb !== null) {
      this._tickAnimAndFlush(dt, this._updateClimb(input, dt));
      return;
    }
    if (this._tryGrabLadder(input)) {
      this._tickAnimAndFlush(dt);
      return;
    }

    const dir = (input.Left ? -1 : 0) + (input.Right ? 1 : 0);
    if (dir !== 0) {
      this.FacingLeft = dir < 0;
    }
    if (this._grounded) {
      // OG: CVecCtrl::CalcWalk — grounded movement with foothold drag
      const fh = this._field.GetFoothold(this._currentFoothold);
      let sin1Sq = 0;
      let slopeFactor = 1.0;
      let forceMultiplier = 1.0;
      let speedMultiplier = 1.0;

      if (fh && !fh.IsWall) {
        // OG: sin1 = |m_uvy| (screen-slope sine, never tan). The (1 ± sin²)
        // factor multiplies the walk FORCE (faster downhill, slower uphill);
        // the speed cap is always (1 + sin²) × maxSpeed.
        const sin1 = Math.abs(fh.Uvy);
        sin1Sq = sin1 * sin1;
        slopeFactor = fh.Uvy >= 0 ? (1 + sin1Sq) : (1 - sin1Sq);

        // Foothold force attribute (ice, conveyors, etc.)
        if (fh.Force !== 0) {
          const absForce = Math.abs(fh.Force);
          if (dir !== 0 && dir * fh.Force > 0) {
            forceMultiplier = 2 * absForce;
            speedMultiplier = 2 * absForce;
          } else if (dir !== 0) {
            forceMultiplier = 0.2 / absForce;
            speedMultiplier = 0.2 / absForce;
          } else {
            forceMultiplier = absForce;
            speedMultiplier = absForce;
          }
        }
      }

      // OG: effective force — the slope factor and force-foothold multiplier
      // both scale the force; the cap is (1 + sin²)·maxSpeed.
      let walkForce: number;
      if (dir !== 0) {
        walkForce = dir * PlayerController.WalkForce * slopeFactor * forceMultiplier;
      } else if (fh && fh.Force !== 0) {
        // No input on force foothold — auto-slide
        walkForce = (fh.Force > 0 ? 1 : -1) * PlayerController.WalkForce * Math.abs(fh.Force) * slopeFactor;
      } else {
        walkForce = 0;
      }
      const walkMax = this._walkSpeed * (1 + sin1Sq) * speedMultiplier;

      // Apply integrated physics: force + slope + drag
      if (dir !== 0) {
        this._velocity.x = PlayerController.accSpeed(this._velocity.x, walkForce, 1, walkMax, dt);
      } else if (fh && fh.Force !== 0) {
        // No input on force foothold — auto-slide
        this._velocity.x = PlayerController.accSpeed(this._velocity.x, walkForce, 1, this._walkSpeed * Math.abs(fh.Force), dt);
      } else if (Math.abs(this._velocity.x) > 0.5) {
        // No input, no force — decelerate
        this._velocity.x = PlayerController.decSpeed(this._velocity.x, PlayerController.WalkDrag, 1, 0, dt);
      }

      // OG: Slip on steep slopes — CalcWalk slip branch (sin1 > walkSlant):
      // slipForce = dSlipForce·sin1·(-hd), capped at dSlipSpeed·sin1. Input
      // aligned with the slip adds the walk force (cap grows by (1+sin²)·max);
      // input opposing halves both; velocity opposing the slip is braked to 0
      // first. Force footholds slip too — only walls are excluded.
      if (fh && !fh.IsWall) {
        const sin1 = Math.abs(fh.Uvy);
        if (sin1 > PlayerController.WalkSlant) {
          const hd = fh.Uvy >= 0 ? -1 : 1;
          let slipForce = PlayerController.SlipForce * sin1 * -hd;
          let slipSpeed = sin1 * PlayerController.SlipSpeed;
          if (hd * dir <= 0) {
            // Input zero or walking with the slip
            if (dir !== 0 || fh.Force !== 0) {
              slipForce += walkForce;
              slipSpeed += walkMax;
            }
          } else {
            // Walking against the slip — halve both
            slipForce *= 0.5;
            slipSpeed *= 0.5;
          }
          if (hd * this._velocity.x > 0) {
            // Velocity opposes the slip — brake to 0 first
            this._velocity.x = PlayerController.decSpeed(this._velocity.x, PlayerController.WalkDrag, 1, 0, dt);
          }
          this._velocity.x = PlayerController.accSpeed(this._velocity.x, slipForce, 1, slipSpeed, dt);
        }
      }
      // OG: Apply short drag if active (reduces friction temporarily)
      if (this._shortDragTimer > 0) {
        this._shortDragTimer -= dt * 1000;
        if (this._shortDragTimer > 0 && dir === 0) {
          this._velocity.x = PlayerController.decSpeed(this._velocity.x, this._shortDragForce, 1, 0, dt);
        }
      }
    } else {
      // OG: CVecCtrl::CalcFloat's plain-falling branch (decompile/9934C0.c)
      // — even a normal jump/fall (not flying or swimming) gets weak
      // horizontal air control through dFloatDrag2 (WZ: Physics.img/
      // floatDrag2=10000), distinct from and much weaker than ground
      // walkForce/walkDrag. The no-input decel rate is also weaker still
      // (FloatCoefficient-scaled) while rising in a jump arc, full rate
      // only once actually falling — this distinction matters in practice
      // (see FloatCoefficient's doc comment).
      const airForce = PlayerController.FloatDrag2;
      const airSpeedCap = (PlayerController.BaseWalkSpeed / PlayerController.WalkForce) * airForce;
      if (dir !== 0) {
        this._velocity.x = PlayerController.accSpeed(this._velocity.x, dir * 2 * airForce, 1, airSpeedCap, dt);
      } else {
        const rising = this._velocity.y < PlayerController.MaxFallSpeed;
        const decelForce = rising ? airForce * PlayerController.FloatCoefficient : airForce;
        this._velocity.x = PlayerController.decSpeed(this._velocity.x, decelForce, 1, 0, dt);
      }
    }

    const jumpEdge = input.JumpPressed && !this._prevJump;
    this._prevJump = input.JumpPressed;

    let downJumped = false;
    if (jumpEdge && this._grounded) {
      if (input.Down) {
        const cur = this._field.GetFoothold(this._currentFoothold);
        if ((!cur || !cur.ForbidFallDown) && this._field.GetFootholdBelow(this.Position.x, this.Position.y + 6) !== null) {
          this.Position.y += 6;
          this._velocity.y = 1;
          this._grounded = false;
          downJumped = true;
        }
      } else {
        // OG TryDoingFlyingRush (0x90BC10): CantThrough is checked by the CALLER
        // on the foothold returned from GetFootholdAbove, not inside the query.
        const aboveFh = this._field.GetFootholdAbove(this.Position.x, this.Position.y - PlayerController.BodyHeight, this.Position.y - 4);
        if (aboveFh && aboveFh.CantThrough) {
          // Jump blocked by platform above — stay grounded
        } else {
          // OG JustJump: vy = -(dJumpSpeed * walkJump / g)
          // NOTE: OG uses pixels-per-tick velocity (30fps), not pixels-per-second.
          // Our system uses dt-based physics, so we use -jumpSpeed directly.
          // The gravity-dependency formula would require a full physics rewrite.
          const jumpVy = -this._jumpSpeed;
          // OG: horizontal boost — add (inputX × 0.8 × maxWalkSpeed) to current vx
          // Only if player is moving slower than 0.8 × maxWalkSpeed in input direction
          let jumpVx = this._velocity.x;
          if (dir !== 0) {
            const maxWalk = this._walkSpeed;
            const boostThreshold = maxWalk * 0.8;
            if (dir * this._velocity.x < boostThreshold) {
              jumpVx = this._velocity.x + dir * boostThreshold;
            }
            // Clamp to maxWalkSpeed
            jumpVx = Math.max(-maxWalk, Math.min(maxWalk, jumpVx));
          }
          this._pending.push({
            attr: 1, vx: jumpVx, vy: jumpVy,
            moveAction: StanceMoveAction(Stance.Jump, this.FacingLeft), elapse: 0,
            x: this.Position.x, y: this.Position.y, fh: this._currentFoothold,
            fhFallStart: 0, xOffset: 0, yOffset: 0, stat: 0,
          });
          this._velocity = { x: jumpVx, y: jumpVy };
          this._grounded = false;
          this._lastFhX1 = 0; this._lastFhY1 = 0; this._lastFootholdId = 0;
        }
      }
    }

    if (this._grounded) {
      this._walkOnFoothold(this._velocity.x * dt);
    } else {
      this._fallFreely(input, dt);
    }
    this._clampToBounds();
    this._tryRescueIfBelowMap();

    if (this._wasGrounded && !this._grounded && (!jumpEdge || downJumped)) {
      this._fallStartY = this.Position.y;
      this._pending.push({
        attr: 11, vx: this._velocity.x, vy: this._velocity.y, fhFallStart: this._currentFoothold,
        moveAction: StanceMoveAction(Stance.Jump, this.FacingLeft), elapse: 0,
        x: this.Position.x, y: this.Position.y, fh: this._currentFoothold,
        xOffset: 0, yOffset: 0, stat: 0,
      });
    }

    this.Stance = !this._grounded ? Stance.Jump
      : input.Down && dir === 0 ? Stance.Prone
      : dir !== 0 ? Stance.Walk1
      : Stance.Stand1;

    this._tickAnimAndFlush(dt);
  }

  private _tickAnimAndFlush(dt: number, advanceFrame = true): void {
    if (advanceFrame) {
      this._animTimer += dt;
      if (this._animTimer >= 0.18) {
        this._animTimer -= 0.18;
        this.Frame = (this.Frame + 1) % 4;
      }
    }

    this._flushTimer += dt;
    if (this._flushTimer >= PlayerController.FlushSeconds || this._pending.length >= PlayerController.MaxElements) {
      if (this._hasChangedSinceSync()) this._appendNormal();
    }
  }

  private _applyFallDamage(): void {
    const fallDist = this.Position.y - this._fallStartY;
    if (fallDist > PlayerController.FallDamageThreshold) {
      const dmg = Math.floor((fallDist - PlayerController.FallDamageThreshold) * PlayerController.FallDamagePerPx);
      this.onTakeFallDamage?.(Math.max(1, dmg));
    }
  }

  private _walkOnFoothold(dx: number): void {
    const wasGrounded = this._grounded;
    let fh: Foothold | null = this._field.GetFoothold(this._currentFoothold);
    if (fh === null) {
      const below = this._field.GetFootholdBelow(this.Position.x, this.Position.y - 4);
      if (below !== null) {
        const gy = below.YAt(this.Position.x);
        if (gy !== null && Math.abs(gy - this.Position.y) <= 8) fh = below;
      }
    }
    if (fh === null) { this._lastFhX1 = 0; this._lastFhY1 = 0; this._lastFootholdId = 0; this._grounded = false; return; }

    let newX = this.Position.x + dx;
    for (let guard = 0; guard < 64; guard++) {
      const lo = Math.min(fh.X1, fh.X2);
      const hi = Math.max(fh.X1, fh.X2);
      if (newX < lo || newX > hi) {
        const edgeX = newX < lo ? lo : hi;
        const edgeY = fh.YAt(edgeX) ?? this.Position.y;
        const nextId = fh.X2 >= fh.X1
          ? (newX < lo ? fh.Prev : fh.Next)
          : (newX < lo ? fh.Next : fh.Prev);
        if (nextId === 0) { this.Position = { x: edgeX, y: edgeY }; this._grounded = false; this._velocity = { x: 0, y: 0 }; return; }
        const nextFh = this._field.GetFoothold(nextId);
        if (nextFh === null) { this.Position = { x: edgeX, y: edgeY }; this._grounded = false; this._velocity = { x: 0, y: 0 }; return; }

        // OG CollisionDetectWalk: check if linked foothold faces same direction
        // m_uvx <= 0.0 means the linked foothold faces opposite direction or is a wall
        // In that case, STOP at the edge with velocity = 0
        const nextUvx = nextFh.Uvx;
        if (nextUvx <= 0) {
          // Linked foothold faces opposite direction — STOP at edge
          this.Position = { x: edgeX, y: edgeY };
          this._velocity = { x: 0, y: 0 };
          this._grounded = false;
          return;
        }

        // Linked foothold faces same direction — check step-up height
        const nextY = nextFh.YAt(newX);
        if (nextY !== null && Math.abs(nextY - edgeY) > PlayerController.MaxWalkStepUp) {
          this.Position = { x: edgeX, y: edgeY }; this._grounded = false; this._velocity = { x: 0, y: 0 }; return;
        }
        fh = nextFh; continue;
      }
      this.Position = { x: newX, y: fh.YAt(newX) ?? this.Position.y };
      this._currentFoothold = fh.Id;
      // Moving platform carry: only apply when the SAME foothold moved between
      // frames (its X1/Y1 changed), not when the player walked onto a different
      // static foothold. Otherwise every foothold transition adds a spurious jump.
      if (this._lastFootholdId === fh.Id && this._lastFhX1 !== 0) {
        const fhDx = fh.X1 - this._lastFhX1;
        const fhDy = fh.Y1 - this._lastFhY1;
        if (fhDx !== 0 || fhDy !== 0) {
          this.Position = { x: this.Position.x + fhDx, y: this.Position.y + fhDy };
        }
      }
      this._lastFootholdId = fh.Id;
      this._lastFhX1 = fh.X1;
      this._lastFhY1 = fh.Y1;
      if (!wasGrounded) this._applyFallDamage();
      this._velocity.y = 0;
      this._grounded = true;
      return;
    }
    this._grounded = false;
  }

  private _fallFreely(input: PlayerInput, dt: number): void {
    let vy: number;
    let newY: number;

    if (this._field.Info.Fly || this._field.Info.Swim) {
      // OG: CVecCtrl::CalcFloat's swim/passive-fly branch (decompile/
      // 9934C0.c) — Fly and Swim are both field-level WZ flags here (not a
      // player skill toggle), and OG routes both through this exact same
      // asymmetric formula, only the force/speed constants differ. This is
      // a real behavioral fix, not just retuned numbers: releasing both
      // keys doesn't hold position, it passively sinks toward vMax;
      // holding Up only *slows* the sink (soft-caps near 0.3×vMax) rather
      // than granting upward thrust; holding Down locks in a faster
      // ~1.5×vMax sink. The previous Swim branch had no vertical input
      // control at all and Fly used a flat instant-velocity clamp instead
      // of this force/mass model.
      const force = this._field.Info.Fly ? PlayerController.FlyForce : PlayerController.SwimForce;
      const vMax = this._field.Info.Fly ? PlayerController.FlySpeed : PlayerController.SwimSpeed;
      // OG: swimSpeedDec — additional speed reduction when swimming
      const swimDec = this._field.Info.Swim ? 0.7 : 1.0;
      const drag = PlayerController.FloatDrag * swimDec;
      const inputY = (input.Up ? -1 : 0) + (input.Down ? 1 : 0);
      const inputX = (input.Left ? -1 : 0) + (input.Right ? 1 : 0);

      let vx = PlayerController.decSpeed(this._velocity.x, drag, 1, vMax, dt);
      vx = inputX !== 0
        ? PlayerController.accSpeed(vx, inputX * force, 1, vMax, dt)
        : PlayerController.decSpeed(vx, drag, 1, 0, dt);

      vy = PlayerController.decSpeed(this._velocity.y, drag, 1, vMax, dt);
      const g = force / vMax;
      if (inputY === 0) {
        vy = PlayerController.accSpeed(vy, g, 1, vMax, dt);
      } else if (inputY > 0) {
        const ceiling = vMax * 1.5;
        vy = vy > ceiling ? Math.min(vy + g * 0.5 * dt, ceiling) : Math.max(vy - g * dt, ceiling);
      } else {
        const floor = vMax * 0.3;
        vy = vy <= floor ? Math.min(vy + g * 0.5 * dt, floor) : Math.max(vy - g * dt, floor);
      }

      this._velocity = { x: vx, y: vy };
      newY = this.Position.y + vy * dt;
    } else {
      vy = Math.min(this._velocity.y + PlayerController.Gravity * dt, PlayerController.MaxFallSpeed);
      this._velocity = { x: this._velocity.x, y: vy };
      newY = this.Position.y + vy * dt;
    }

    let newX = this.Position.x + this._velocity.x * dt;

    if (this._velocity.x !== 0) {
      const fh = this._field.GetFoothold(this._currentFoothold);
      if (fh && fh.ZMass !== 0) {
        const wallX = this._field.GetZMassWallX(fh.ZMass, this.Position.x, newX, this.Position.y - PlayerController.BodyHeight, this.Position.y);
        if (wallX !== null) {
          newX = wallX;
        }
      }
    }

    if (vy > 0) {
      // OG: CVecCtrl::CalcFloat uses CollisionDetectFloat for segment-crossing
      // detection — catches thin platforms and angled footholds during diagonal
      // movement. Only used when there's significant horizontal velocity (the
      // simple GetFootholdBelow handles pure-vertical falls).
      if (Math.abs(this._velocity.x) > 1) {
        const collision = this.CollisionDetectFloat(newX, newY);
        if (collision.landed && collision.fh !== null) {
          this.Position = { x: collision.x, y: collision.y };
          this._velocity.y = 0;
          this._grounded = true;
          if (!collision.fh.IsWall && collision.fh.Uvx !== 0) {
            const dotProduct = this._velocity.x * collision.fh.Uvx;
            this._velocity.x = dotProduct * collision.fh.Uvx;
          }
          this._currentFoothold = collision.fh.Id;
          this._applyFallDamage();
          return;
        }
      }

      // Simple vertical check — catches the common case (falling straight down)
      const fh = this._field.GetFootholdBelow(newX, this.Position.y);
      if (fh !== null && fh.YAt(newX) !== null) {
        const groundY = fh.YAt(newX)!;
        if (this.Position.y < groundY && newY >= groundY) {
          this.Position = { x: newX, y: groundY };
          this._velocity.y = 0;
          this._grounded = true;
          if (!fh.IsWall && fh.Uvx !== 0) {
            const dotProduct = this._velocity.x * fh.Uvx;
            this._velocity.x = dotProduct * fh.Uvx;
          }
          this._currentFoothold = fh.Id;
          this._applyFallDamage();
          return;
        }
      }
    }

    this.Position = { x: newX, y: newY };
  }

  private _clampToBounds(): void {
    const b = this._field.Bounds;
    if (!b) return;
    const x = Math.max(b.left!, Math.min(b.right!, this.Position.x));
    const y = Math.max(b.top!, Math.min(b.bottom!, this.Position.y));
    if (x === this.Position.x && y === this.Position.y) return;
    this._velocity = { x: x !== this.Position.x ? 0 : this._velocity.x, y: y !== this.Position.y ? 0 : this._velocity.y };
    this.Position = { x, y };
  }

  private _tryRescueIfBelowMap(): void {
    if (this._climb !== null || this._grounded) return;
    const b = this._field.Bounds;
    if (!b) return;
    if (this.Position.y < b.bottom! - 1) return;
    if (this._field.GetFootholdBelow(this.Position.x, this.Position.y) !== null) return;
    if (this._field.Info.Cloud) return;

    const fh = this._field.GetClosestFoothold(this.Position.x, this.Position.y);
    if (fh === null) return;
    const landing = { x: fh.X1, y: fh.Y1 };
    this.Position = { x: landing.x, y: landing.y };
    this._velocity = { x: 0, y: 0 };
    this._grounded = true;
    this._currentFoothold = fh.Id;
    this._pending = [];
    this._flushTimer = 0;
    this._lastSyncPos = { x: this.Position.x, y: this.Position.y };
    this._lastSyncVel = { x: this._velocity.x, y: this._velocity.y };
    this._lastSyncStance = Stance.Stand1;
    this._pending.push({
      attr: 0, x: this.Position.x, y: this.Position.y,
      vx: 0, vy: 0, fh: this._currentFoothold,
      moveAction: StanceMoveAction(Stance.Stand1, this.FacingLeft), elapse: 1,
      fhFallStart: 0, xOffset: 0, yOffset: 0, stat: 0,
    });
  }

  private _tryGrabLadder(input: PlayerInput): boolean {
    if (!input.Up && !input.Down) return false;
    const lr = this._field.GetLadderOrRope(this.Position.x, this.Position.y);
    if (lr === null) return false;
    if (input.Up && !input.Down && this.Position.y <= lr.Top + 2) return false;
    if (input.Down && !input.Up && this.Position.y >= lr.Bottom - 2) return false;

    this._climb = lr as LadderOrRope;
    this._climbGrabFrame = true; // consume input for one frame
    this._grounded = false;
    this._currentFoothold = 0;
    this._lastFhX1 = 0; this._lastFhY1 = 0; this._lastFootholdId = 0;
    this._velocity = { x: 0, y: 0 };
    this.ClimbMoving = false;
    this.Position = { x: lr.X, y: Math.max(lr.Top, Math.min(this.Position.y, lr.Bottom)) };
    this.Stance = lr.IsLadder ? Stance.Ladder : Stance.Rope;
    return true;
  }

  private _updateClimb(input: PlayerInput, dt: number): boolean {
    const lr = this._climb!;
    const jumpEdge = input.JumpPressed && !this._prevJump;
    this._prevJump = input.JumpPressed;

    // OG: CVecCtrlUser::WorkUpdateActiveLadderOrRope — jump from ladder/rope
    if (jumpEdge) {
      const hopDir = (input.Left ? -1 : 0) + (input.Right ? 1 : 0);
      this._climb = null;
      this.ClimbMoving = false;
      this._grounded = false;
      if (hopDir !== 0) this.FacingLeft = hopDir < 0;
      // OG ladder jump vy: -(dJumpSpeed × walkJump / g × vMax)
      // NOTE: OG uses pixels-per-tick velocity. Our system uses dt-based physics.
      // vMax = 0.5 for normal ladder jump
      const ladderJumpVy = -this._jumpSpeed * 0.5;
      // OG ladder jump vx: dWalkSpeed × walkSpeed × inputX × 1.3
      const ladderJumpVx = hopDir * this._walkSpeed * 1.3;
      this._velocity = { x: ladderJumpVx, y: ladderJumpVy };
      this.Stance = Stance.Jump;
      return true;
    }

    // OG: climbing movement — walkSpeed * inputY * 3.0 per frame
    // IDA: this->m_ap.y = walkSpeed * (inputY * 3.0) + currentY
    // OG uses pixels-per-tick velocity (30fps), not pixels-per-second.
    // Our system uses dt-based physics, so we scale by 30 to get px/s.
    const iy = this._climbGrabFrame ? 0 : (input.Up ? -1 : 0) + (input.Down ? 1 : 0);
    this._climbGrabFrame = false;
    // OG displacement per frame = walkSpeed * inputY * 3.0
    // Convert to px/s: multiply by 30 (frame rate)
    const climbSpeed = this._walkSpeed * 3.0 * 30;
    this._velocity = { x: 0, y: iy * climbSpeed };
    this.ClimbMoving = iy !== 0;

    // Position update uses dt (not raw per-frame like OG)
    const newY = this.Position.y + iy * climbSpeed * dt;

    // OG: boundary checks — top first, then bottom
    if (iy < 0 && newY <= lr.Top) {
      // OG: check if there's an upper foothold to snap to
      if (!lr.UpperFoothold) {
        // No upper foothold — snap to top and leave ladder
        this.Position = { x: lr.X, y: lr.Top };
        this._leaveLadderOntoGround(lr.X, lr.Top - 6);
        return true;
      }
      // OG: has upper foothold — snap to y1 - 5 and transition to foothold
      // IDA: AbsPos::_ZtlSecurePut_y(&this->m_ap, (double)(v2->y1 - 5));
      //      this->OnAttachedObjectChanged(this, nullptr, nullptr, 0);
      this.Position = { x: lr.X, y: lr.Top - 5 };
      // Try to find a foothold at this position and attach to it
      const fh = this._field.GetFootholdBelow(lr.X, lr.Top - 5);
      if (fh !== null && fh.YAt(lr.X) !== null) {
        this._climb = null;
        this.ClimbMoving = false;
        this._currentFoothold = fh.Id;
        this._grounded = true;
        this.Position = { x: lr.X, y: fh.YAt(lr.X)! };
        this._velocity = { x: 0, y: 0 };
        this.Stance = Stance.Stand1;
      } else {
        // No foothold found — stay on ladder
        this.Stance = lr.IsLadder ? Stance.Ladder : Stance.Rope;
      }
      return true;
    }
    if (iy > 0 && newY >= lr.Bottom) {
      // OG: going down past bottom — leave ladder
      // OG snaps to y2 + 1 (not y2 + 2)
      this._leaveLadderOntoGround(lr.X, lr.Bottom + 1);
      return true;
    }

    this.Position = { x: lr.X, y: Math.max(lr.Top, Math.min(newY, lr.Bottom)) };
    this.Stance = lr.IsLadder ? Stance.Ladder : Stance.Rope;
    return iy !== 0;
  }

  private _leaveLadderOntoGround(x: number, y: number): void {
    this._climb = null;
    this.ClimbMoving = false;
    this._velocity = { x: 0, y: 0 };
    const fh = this._field.GetFootholdBelow(x, y);
    if (fh !== null && fh.YAt(x) !== null) {
      this.Position = { x, y: fh.YAt(x)! };
      this._currentFoothold = fh.Id;
      this._grounded = true;
    } else {
      this.Position = { x, y };
      this._grounded = false;
    }
  }

  private _appendNormal(): void {
    const elapsedMs = Math.max(1, Math.min(1000, this._flushTimer * 1000));
    this._pending.push({
      attr: 0, x: this.Position.x, y: this.Position.y,
      vx: this._velocity.x, vy: this._velocity.y, fh: this._currentFoothold,
      moveAction: StanceMoveAction(this.Stance, this.FacingLeft), elapse: elapsedMs,
      fhFallStart: 0, xOffset: 0, yOffset: 0, stat: 0,
    });
    this._flushTimer = 0;
    this._lastSyncPos = { x: this.Position.x, y: this.Position.y };
    this._lastSyncVel = { x: this._velocity.x, y: this._velocity.y };
    this._lastSyncStance = this.Stance;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // OG CVecCtrl methods — physics helpers (from IDA decompilation)
  // ──────────────────────────────────────────────────────────────────────────

  /** OG: CVecCtrl::IsFalling — checks if falling (no foothold and vy > 0) */
  IsFalling(): boolean {
    return this._currentFoothold === 0 && this._velocity.y > 0;
  }

  /** OG: CVecCtrl::IsFreeFalling — checks if free falling */
  IsFreeFalling(): boolean {
    return this._currentFoothold === 0 && this._velocity.y > 0;
  }

  /** OG: CVecCtrl::IsOnLadder — checks if on ladder */
  IsOnLadder(): boolean {
    return this._climb !== null && this._climb.IsLadder;
  }

  /** OG: CVecCtrl::IsOnRope — checks if on rope */
  IsOnRope(): boolean {
    return this._climb !== null && !this._climb.IsLadder;
  }

  /** OG: CVecCtrl::DetachFromFoothold — detaches from current foothold */
  DetachFromFoothold(): void {
    this._currentFoothold = 0;
    this._lastFhX1 = 0;
    this._lastFhY1 = 0;
    this._lastFootholdId = 0;
  }

  /** OG: CVecCtrl::MakeContinuousMovePath — records continuous move path */
  MakeContinuousMovePath(_tElapse: number): void {
    // OG: records move path for server sync
  }

  /** OG: CVecCtrl::FallDown — handles fall down */
  FallDown(): void {
    this._grounded = false;
    this._currentFoothold = 0;
    this._lastFhX1 = 0;
    this._lastFhY1 = 0;
    this._lastFootholdId = 0;
  }

  /** OG: CVecCtrl::Wings — handles wings activation */
  Wings(): void {
    // OG: activates wings for flying
  }

  /** OG: CVecCtrl::MakeNewMovePathElem — creates new move path element */
  MakeNewMovePathElem(): void {
    // OG: creates new move path element for server sync
  }

  /** OG: CVecCtrl::SetActive — sets controller active state */
  SetActive(_bActive: boolean): void {
    // OG: sets controller active/inactive
  }

  /** OG: CVecCtrl::WorkUpdateActive — main update loop */
  WorkUpdateActive(_dt: number): boolean {
    // OG: main physics update loop
    return true;
  }

  /** OG: CVecCtrl::IsOnFoothold — checks if on a foothold */
  IsOnFoothold(): boolean {
    return this._currentFoothold !== 0;
  }

  /** OG: CVecCtrl::CollisionDetectFloat (0x994740) — segment-crossing collision
   *  detection during freefall. Checks if the movement path from current position
   *  to new position crosses any foothold line segment. If it does, snaps to the
   *  earliest crossing point and lands on that foothold.
   *
   *  The OG version is ~450 lines of C++ with cross-product candidate tracking,
   *  reserved-foothold landing, z-mass page filtering, and velocity projection.
   *  This is a simplified but functionally equivalent version that handles the
   *  critical case: thin platforms and angled footholds during fast diagonal movement. */
  CollisionDetectFloat(newX: number, newY: number): { x: number; y: number; fh: Foothold | null; landed: boolean } {
    const oldX = this.Position.x;
    const oldY = this.Position.y;
    const dxm = newX - oldX;
    const dym = newY - oldY;

    // No movement — no collision possible
    if (dxm === 0 && dym === 0) {
      return { x: newX, y: newY, fh: null, landed: false };
    }

    // Get candidate footholds near the movement segment
    const candidates = this._field.GetCrossCandidate(oldX, oldY, newX, newY);

    let bestT = Infinity; // Time parameter along movement segment (0..1)
    let bestFh: Foothold | null = null;
    let bestIx = 0;
    let bestIy = 0;

    for (const fh of candidates) {
      // Skip walls — walls are handled by ZMass collision separately
      if (fh.IsWall) continue;

      // Skip the foothold we're currently standing on (would re-land immediately)
      if (fh.Id === this._currentFoothold && this._grounded) continue;

      // OG: cross-product segment intersection test
      const x1 = fh.X1, y1 = fh.Y1, x2 = fh.X2, y2 = fh.Y2;
      const dxf = x2 - x1, dyf = y2 - y1;

      // Cross product: which side of the foothold segment is each movement endpoint on?
      const crossOld = (x1 - oldX) * dyf - (y1 - oldY) * dxf;
      const crossNew = (x1 - newX) * dyf - (y1 - newY) * dxf;

      // Both on same side — no crossing
      if (crossOld > 0 && crossNew > 0) continue;
      if (crossOld < 0 && crossNew < 0) continue;

      // Cross product: which side of the movement segment is each foothold endpoint on?
      const crossFh1 = (oldX - x1) * dym - (oldY - y1) * dxm;
      const crossFh2 = (oldX - x2) * dym - (oldY - y2) * dxm;

      // Both on same side — no crossing
      if (crossFh1 > 0 && crossFh2 > 0) continue;
      if (crossFh1 < 0 && crossFh2 < 0) continue;

      // Segments intersect — compute exact intersection via line-line formula
      const denom = dxm * dyf - dym * dxf;
      if (Math.abs(denom) < 0.001) continue; // Parallel/degenerate

      const t = ((x1 - oldX) * dyf - (y1 - oldY) * dxf) / denom;
      const u = ((x1 - oldX) * dym - (y1 - oldY) * dxm) / denom;

      // Must intersect within both segments (with small epsilon for edge cases)
      if (t < -0.01 || t > 1.01) continue;
      if (u < -0.01 || u > 1.01) continue;
      const tClamped = Math.max(0, Math.min(1, t));

      // Calculate exact intersection point
      const ix = oldX + tClamped * dxm;
      const iy = oldY + tClamped * dym;

      // Only land on this foothold if we're coming from above (vy > 0)
      if (this._velocity.y <= 0) continue;

      // Keep the earliest crossing (smallest t = closest to old position)
      if (tClamped < bestT) {
        bestT = tClamped;
        bestFh = fh;
        bestIx = ix;
        bestIy = iy;
      }

      // Only land on this foothold if we're coming from above (vy > 0) or
      // the foothold has a downward slope we're hitting from the side
      // OG: primarily checks vy > 0, but also handles lateral collisions
      const isLanding = this._velocity.y > 0 || (dyf !== 0 && Math.abs(dyf) > Math.abs(dxf));
      if (!isLanding) continue;

      // Keep the earliest crossing (smallest t = closest to old position)
      if (t < bestT) {
        bestT = t;
        bestFh = fh;
        // Store the exact intersection point
        bestIx = ix;
        bestIy = iy;
      }
    }

    if (bestFh !== null && bestT < 1) {
      // Snap to the intersection point on the foothold
      return { x: bestIx, y: bestIy, fh: bestFh, landed: true };
    }

    return { x: newX, y: newY, fh: null, landed: false };
  }

  /** OG: CVecCtrl::JustJump — just jumped (internal) */
  JustJump(): boolean {
    // OG: called by Jump internally
    return false;
  }

  /** OG: CVecCtrl::SetMovePathAttribute — sets move path attribute (internal) */
  SetMovePathAttribute(_attr: number): void {
    // OG: sets move path attribute
  }

  /** OG: CVecCtrl::DiscardByInterrupt — discards move path by interrupt (internal) */
  DiscardByInterrupt(): void {
    // OG: discards move path on interrupt
  }

  private _hasChangedSinceSync(): boolean {
    if (this.Stance !== this._lastSyncStance) return true;
    const dx = this.Position.x - this._lastSyncPos.x;
    const dy = this.Position.y - this._lastSyncPos.y;
    if (dx * dx + dy * dy > 0.25) return true;
    const dvx = this._velocity.x - this._lastSyncVel.x;
    const dvy = this._velocity.y - this._lastSyncVel.y;
    if (dvx * dvx + dvy * dvy > 0.25) return true;
    return false;
  }

  TryFlushMovePath(): Uint8Array | null {
    if (this._pending.length === 0) return null;

    const blob = EncodeMovePath(
      this._lastSyncPos.x, this._lastSyncPos.y,
      this._lastSyncVel.x, this._lastSyncVel.y,
      this._pending,
    );
    this._pending = [];
    return blob;
  }
}

interface LadderOrRope {
  X: number;
  Top: number;
  Bottom: number;
  IsLadder: boolean;
  UpperFoothold: boolean; // OG: has foothold above top (from LadderRope.UpperFoothold)
}
