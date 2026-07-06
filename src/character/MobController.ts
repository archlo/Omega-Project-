import { EncodeMovePath, type MoveElement } from '../net/packet/MovePathEncoder.js';
import type { FieldScene } from '../map/FieldScene.js';
import { Foothold } from '../map/Foothold.js';
import type { MobLook } from './MobLook.js';
import { MobActionType } from './MobActionType.js';
import type { MobInfo } from './MobInfo.js';

const enum State { Idle, Walking, Chasing, Attacking }

export class MobController {
  private static readonly BaseWalkSpeed    = 60;
  private static readonly BaseFlySpeed     = 90;
  private static readonly MinSpeed         = 20;
  private static readonly IdlePauseMin     = 1.5;
  private static readonly IdlePauseMax     = 4.0;
  private static readonly WalkBurstMin     = 1.0;
  private static readonly WalkBurstMax     = 3.0;
  private static readonly EdgeMargin       = 16;
  private static readonly AttackRangeX     = 50;
  private static readonly AttackRangeY     = 60;
  private static readonly AttackCooldown   = 0.7;
  private static readonly AggroDurationSec       = 8;
  private static readonly HitPlayerCooldownSec   = 2;
  private static readonly FlushIntervalSec = 0.25;
  private static readonly HitKnockbackSec  = 0.2;
  private static readonly _fallGravity = 1500;
  private static readonly _maxMobFall = 500;

  private readonly _mob: MobLook;
  private readonly _field: FieldScene;
  private readonly _info: MobInfo;

  onAttackPlayer: ((damage: number) => void) | null = null;

  private _state = State.Idle;
  private _stateTimer = 0;
  private _attackCooldown = 0;
  private _hitPlayerCooldown = 0;
  private _knockedTimer = 0;
  private _knockedVx = 0;
  private _aggroTimer = 0;
  private _facingLeft = false;
  private _selectedAttack = 0;
  private _velocity = { x: 0, y: 0 };
  private _currentFh = 0;
  private _flyTarget = { x: 0, y: 0 };
  private _flyTargetTimer = 0;

  private readonly _pending: MoveElement[] = [];
  private _lastSyncPos = { x: 0, y: 0 };
  private _lastSyncVel = { x: 0, y: 0 };
  private _flushTimer = 0;
  private _mobCtrlSn = 0;

  private _getFh(id: number): Foothold | null {
    return this._field.Footholds[id] ?? null;
  }

  private _fhLeftEdge(fh: Foothold): number { return Math.min(fh.X1, fh.X2); }
  private _fhRightEdge(fh: Foothold): number { return Math.max(fh.X1, fh.X2); }

  private _getFootholdBelow(x: number, y: number): Foothold | null {
    let best: Foothold | null = null;
    let bestY = -Infinity;
    for (const fh of Object.values(this._field.Footholds)) {
      if (x >= this._fhLeftEdge(fh) && x <= this._fhRightEdge(fh)) {
        const fhY = fh.YAt(x);
        if (fhY !== null && fhY >= y && (best === null || fhY < bestY)) {
          best = fh;
          bestY = fhY;
        }
      }
    }
    return best;
  }

  private _getBounds(): { Left: number; Top: number; Right: number; Bottom: number; Width: number; Height: number } {
    const l = this._field.Info.VRLeft;
    const t = this._field.Info.VRTop;
    const r = this._field.Info.VRRight;
    const b = this._field.Info.VRBottom;
    return { Left: l, Top: t, Right: r, Bottom: b, Width: r - l, Height: b - t };
  }

  constructor(mob: MobLook, field: FieldScene, info: MobInfo) {
    this._mob   = mob;
    this._field = field;
    this._info  = info;

    const below = this._getFootholdBelow(this._mob.Position.x, this._mob.Position.y - 2);
    this._currentFh = below?.Id ?? 0;

    if (this._info.FirstAttack) this._aggroTimer = Infinity;

    this._lastSyncPos = { ...this._mob.Position };
    this._lastSyncVel = { x: 0, y: 0 };
    this._enterIdle();
  }

  get ShouldTick(): boolean { return !this._info.IsStay; }

  get CurrentAction(): MobActionType {
    switch (this._state) {
      case State.Attacking: return MobActionType.Attack1 + Math.min(this._selectedAttack, 8);
      case State.Chasing:   return MobActionType.Chase;
      case State.Walking:   return this._info.IsFly ? MobActionType.Fly : MobActionType.Move;
      default:              return this._info.IsFly ? MobActionType.Fly : MobActionType.Stand;
    }
  }

  get IsChasing(): boolean { return this._state === State.Chasing || this._state === State.Attacking; }

  get Info(): MobInfo { return this._info; }

  get IsAggressive(): boolean { return this._aggroTimer > 0; }

  OnDamagedByPlayer(): void {
    if (this._aggroTimer !== Infinity) this._aggroTimer = MobController.AggroDurationSec;
  }

  get CanHitPlayer(): boolean { return this._hitPlayerCooldown <= 0; }

  NotePlayerHit(): void { this._hitPlayerCooldown = MobController.HitPlayerCooldownSec; }

  ApplyHitKnockback(pushPx: number): void {
    this._knockedTimer = MobController.HitKnockbackSec;
    this._knockedVx    = pushPx / MobController.HitKnockbackSec;
  }

  Update(dt: number, playerPos: { x: number; y: number }): void {
    if (this._info.IsStay) return;

    if (this._aggroTimer > 0 && this._aggroTimer !== Infinity) {
      this._aggroTimer = Math.max(0, this._aggroTimer - dt);
    }
    if (this._attackCooldown > 0)    this._attackCooldown    -= dt;
    if (this._hitPlayerCooldown > 0) this._hitPlayerCooldown -= dt;

    if (this._knockedTimer > 0) {
      this._knockedTimer -= dt;
      let nx = this._mob.Position.x + this._knockedVx * dt;
      if (!this._info.IsFly && this._currentFh !== 0) {
        const knockFh = this._getFh(this._currentFh);
        if (knockFh) {
          nx = Math.max(this._fhLeftEdge(knockFh) + 4, Math.min(nx, this._fhRightEdge(knockFh) - 4));
          const y = knockFh.YAt(nx) ?? this._mob.Position.y;
          this._mob.Position = { x: nx, y };
        }
      } else {
        this._mob.Position = { x: nx, y: this._mob.Position.y };
      }
      this._mob.OnHit();
      this._velocity = { x: this._knockedVx, y: 0 };
      return;
    }

    const aggressive = this._aggroTimer > 0;
    const dx          = playerPos.x - this._mob.Position.x;
    const dy          = playerPos.y - this._mob.Position.y;
    const selectedAttack = this._pickAttack(dx, dy);
    const prev           = this._state;

    if (aggressive) {
      this._facingLeft = dx < 0;
      if (selectedAttack >= 0) {
        if (this._attackCooldown <= 0) {
          this._attackCooldown = MobController.AttackCooldown;
          this.onAttackPlayer?.(Math.floor(this._info.Pad * (0.6 + Math.random() * 0.4)));
        }
        this._state           = State.Attacking;
        this._selectedAttack  = selectedAttack;
        this._velocity = { x: 0, y: 0 };
      } else {
        this._state = State.Chasing;
      }
    } else {
      this._stateTimer -= dt;
      if (this._stateTimer <= 0) {
        if (this._state === State.Walking) this._enterIdle();
        else                               this._enterWalk();
      }
    }

    const moving = this._state === State.Walking || this._state === State.Chasing;
    if (moving) {
      if (this._info.IsFly) this._stepFly(dt, playerPos);
      else                  this._stepWalk(dt);
    } else {
      this._seatOnFoothold();
      this._velocity = { x: 0, y: 0 };
    }

    if (!this._info.NoFlip) this._mob.SetFacing(this._facingLeft);
    this._mob.SetState(
      this._state === State.Walking || this._state === State.Chasing ? 1 /* Move */
        : this._state === State.Attacking ? 2 /* Attack */
        : 0 /* Stand */
    );

    this._flushTimer += dt;
    if ((moving && (this._flushTimer >= MobController.FlushIntervalSec || this._hasChanged()))
        || this._state !== prev) {
      this._appendElement();
    }
  }

  TryFlush(): { blob: Uint8Array; sn: number } | null {
    if (this._pending.length === 0) {
      return null;
    }
    const blob = EncodeMovePath(
      this._lastSyncPos.x, this._lastSyncPos.y,
      this._lastSyncVel.x, this._lastSyncVel.y,
      this._pending,
    );
    this._pending.length = 0;
    this._mobCtrlSn++;
    return { blob, sn: this._mobCtrlSn };
  }

  get FacingLeft(): boolean { return this._facingLeft; }

  // OG CMob::IsTargetInAttackRange (0x645f50): iterates attacks, for each
  // checks range intersection via rcRange (per-attack HitRect, type-dependent),
  // then picks uniformly random among valid attacks via get_rand(nCount, 0).
  // Skipped for now: type-1/2 trapezoid test, type-3/4 area+foothold test,
  // ConMP/bDoFirst/bSpeicalAttack condition gates — only the HitRect range
  // check with uniform random selection is ported (portable subset).
  private _pickAttack(dx: number, dy: number): number {
    const inRange: number[] = [];
    for (const atk of this._info.Attacks.values()) {
      const r = atk.HitRect;
      if (r) {
        const ltx = dx < 0 ? -r.rbx : r.ltx;
        const rbx = dx < 0 ? -r.ltx : r.rbx;
        if (dx < ltx || dx > rbx || dy < r.lty || dy > r.rby) continue;
      } else if (Math.abs(dx) > MobController.AttackRangeX || Math.abs(dy) > MobController.AttackRangeY) {
        continue;
      }
      inRange.push(atk.AttackIndex);
    }
    if (inRange.length === 0) {
      return (Math.abs(dx) <= MobController.AttackRangeX && Math.abs(dy) <= MobController.AttackRangeY) ? 0 : -1;
    }
    // OG: get_rand(nCount, 0) = rand() % nCount — uniform among in-range attacks
    return inRange[Math.floor(Math.random() * inRange.length)];
  }

  private _enterIdle(): void {
    this._state      = State.Idle;
    this._stateTimer = MobController._lerp(MobController.IdlePauseMin, MobController.IdlePauseMax, Math.random());
    this._velocity   = { x: 0, y: 0 };
  }

  private _enterWalk(): void {
    this._state       = State.Walking;
    this._stateTimer  = MobController._lerp(MobController.WalkBurstMin, MobController.WalkBurstMax, Math.random());
    this._facingLeft  = Math.random() < 0.5;
    if (this._info.IsFly) {
      this._pickFlyTarget();
    } else {
      this._velocity = { x: (this._facingLeft ? -1 : 1) * this._walkSpeed, y: 0 };
    }
  }

  private _stepWalk(dt: number): void {
    const dir = this._facingLeft ? -1 : 1;
    this._velocity = { x: dir * this._walkSpeed, y: 0 };
    let nextX = this._mob.Position.x + this._velocity.x * dt;

    const fh = this._currentFh !== 0 ? this._getFh(this._currentFh) : null;
    if (fh) {
      const leftEdge = this._fhLeftEdge(fh);
      const rightEdge = this._fhRightEdge(fh);
      if (nextX < leftEdge + MobController.EdgeMargin) {
        nextX = leftEdge + MobController.EdgeMargin;
        if (this._state !== State.Chasing) this._facingLeft = false;
      } else if (nextX > rightEdge - MobController.EdgeMargin) {
        nextX = rightEdge - MobController.EdgeMargin;
        if (this._state !== State.Chasing) this._facingLeft = true;
      }
      const y = fh.YAt(nextX) ?? this._mob.Position.y;
      this._mob.Position = { x: nextX, y };
    } else {
      const below = this._getFootholdBelow(nextX, this._mob.Position.y);
      if (below) {
        const gy = below.YAt(nextX);
        if (gy !== null && gy >= this._mob.Position.y) {
          this._currentFh = below.Id;
          this._mob.Position = { x: nextX, y: gy };
          return;
        }
      }
      this._velocity.y += MobController._fallGravity * dt;
      const maxFall = MobController._maxMobFall;
      if (this._velocity.y > maxFall) this._velocity.y = maxFall;
      this._mob.Position = { x: nextX, y: this._mob.Position.y + this._velocity.y * dt };
    }
    this._seatOnFoothold();
  }

  private _stepFly(dt: number, playerPos: { x: number; y: number }): void {
    if (this._state === State.Chasing) {
      this._flyTarget = { ...playerPos };
    } else {
      this._flyTargetTimer -= dt;
      const toT = {
        x: this._flyTarget.x - this._mob.Position.x,
        y: this._flyTarget.y - this._mob.Position.y,
      };
      if (toT.x * toT.x + toT.y * toT.y < 64 || this._flyTargetTimer <= 0) this._pickFlyTarget();
    }
    const d = {
      x: this._flyTarget.x - this._mob.Position.x,
      y: this._flyTarget.y - this._mob.Position.y,
    };
    const lenSq = d.x * d.x + d.y * d.y;
    if (lenSq > 1) {
      const invLen = 1 / Math.sqrt(lenSq);
      d.x *= invLen;
      d.y *= invLen;
      this._velocity = { x: d.x * this._flySpeed, y: d.y * this._flySpeed };
      if (!this._info.NoFlip) this._facingLeft = d.x < 0;
    } else {
      this._velocity = { x: 0, y: 0 };
    }
    this._mob.Position = {
      x: this._mob.Position.x + this._velocity.x * dt,
      y: this._mob.Position.y + this._velocity.y * dt,
    };

    const b = this._getBounds();
    this._mob.Position = {
      x: Math.max(b.Left + 8, Math.min(this._mob.Position.x, b.Right - 8)),
      y: Math.max(b.Top + 8, Math.min(this._mob.Position.y, b.Bottom - 8)),
    };
  }

  private _seatOnFoothold(): void {
    if (this._info.IsFly || this._currentFh === 0) return;
    const fh = this._getFh(this._currentFh);
    const y = fh?.YAt(this._mob.Position.x);
    if (y !== null && y !== undefined) {
      if (y <= this._mob.Position.y + 4) {
        this._mob.Position = { x: this._mob.Position.x, y };
        this._velocity.y = 0;
      }
    }
  }

  private _pickFlyTarget(): void {
    const b = this._getBounds();
    this._flyTarget = {
      x: b.Left + Math.random() * b.Width,
      y: b.Top + Math.random() * b.Height,
    };
    this._flyTargetTimer = 2 + Math.random() * 4;
  }

  private get _walkSpeed(): number {
    return Math.max(MobController.MinSpeed, MobController.BaseWalkSpeed * (1 + this._info.Speed / 100));
  }

  private get _flySpeed(): number {
    return Math.max(MobController.MinSpeed, MobController.BaseFlySpeed * (1 + this._info.FlySpeed / 100));
  }

  private _hasChanged(): boolean {
    const dp = {
      x: this._mob.Position.x - this._lastSyncPos.x,
      y: this._mob.Position.y - this._lastSyncPos.y,
    };
    const dv = {
      x: this._velocity.x - this._lastSyncVel.x,
      y: this._velocity.y - this._lastSyncVel.y,
    };
    return dp.x * dp.x + dp.y * dp.y > 0.25 || dv.x * dv.x + dv.y * dv.y > 0.25;
  }

  private _appendElement(): void {
    const elapsedMs = Math.max(1, Math.min(1000, Math.round(this._flushTimer * 1000)));
    this._pending.push({
      attr:      this._info.IsFly ? 17 : 0,
      x:          this._mob.Position.x,
      y:          this._mob.Position.y,
      vx:         this._velocity.x,
      vy:         this._velocity.y,
      fh:         this._currentFh,
      moveAction: this.CurrentAction,
      elapse:     elapsedMs,
      fhFallStart: 0,
      xOffset:    0,
      yOffset:    0,
      stat:       0,
    });
    this._flushTimer  = 0;
    this._lastSyncPos = { ...this._mob.Position };
    this._lastSyncVel = { ...this._velocity };
  }

  private static _lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }
}
