/** Position and velocity in CVecCtrl's foothold-relative coordinate space. */
export class RelPos {
    pos = 0;
    v = 0;
    SetFromAbsPos(pos, fh) {
        const dx = pos.x - fh.X1;
        const dy = pos.y - fh.Y1;
        this.pos = dx * fh.Uvx + dy * fh.Uvy;
        this.v = 0;
        this.pos = Math.max(0, Math.min(fh.Length, this.pos));
    }
    SetFromAbsVelocity(vx, vy, fh) {
        this.v = vx * fh.Uvx + vy * fh.Uvy;
    }
    SetFromRelPos(pos, fh) {
        pos.prevX = pos.x;
        pos.prevY = pos.y;
        pos.x = fh.X1 + this.pos * fh.Uvx;
        pos.y = fh.Y1 + this.pos * fh.Uvy;
    }
    static From(pos, vx, vy, fh) {
        const result = new RelPos();
        result.SetFromAbsPos(pos, fh);
        result.SetFromAbsVelocity(vx, vy, fh);
        return result;
    }
}
export class MovePath {
    OriginX = 0;
    OriginY = 0;
    OriginVx = 0;
    OriginVy = 0;
    Elements = [];
    LastAttrMask = 0;
    LastStat = 0;
    LastFhFallStart = 0;
    LastOffset = { x: 0, y: 0 };
    CurrentAttr = -1;
    CurrentElementIndex = -1;
    _elementIndex = 0;
    _elementElapsed = 0;
    _elapsedMs = 0;
    _elementsRef = null;
    Clear() {
        this.Elements = [];
        this._resetProgress();
    }
    CalcPassivePos(x, y, vx, vy, fh, elapsedMs, resolveFh) {
        if (this._elementsRef !== this.Elements)
            this._resetProgress();
        let cx = this._elementIndex === 0 ? (this.Elements.length > 0 ? this.OriginX : x) : x;
        let cy = this._elementIndex === 0 ? (this.Elements.length > 0 ? this.OriginY : y) : y;
        let cvx = this._elementIndex === 0 ? (this.Elements.length > 0 ? this.OriginVx : vx) : vx;
        let cvy = this._elementIndex === 0 ? (this.Elements.length > 0 ? this.OriginVy : vy) : vy;
        let cfh = fh;
        let remaining = Math.max(0, elapsedMs - this._elapsedMs);
        this.LastAttrMask = 0;
        while (this._elementIndex < this.Elements.length) {
            const e = this.Elements[this._elementIndex];
            const duration = Math.max(e.elapse, 1);
            this.CurrentElementIndex = this._elementIndex;
            this.CurrentAttr = e.attr;
            this.LastAttrMask |= 1 << (e.attr & 31);
            this.LastStat = e.stat;
            this.LastFhFallStart = e.fhFallStart;
            this.LastOffset = { x: e.xOffset, y: e.yOffset };
            // Stat/action elements have no time on the wire. Consume them even when
            // the caller advances by 0 ms, preserving their metadata for this tick.
            if (e.attr === 9 /* MovePathAttr.StatChange */ || e.elapse <= 0) {
                if (e.attr === 3 /* MovePathAttr.Teleport */ || e.attr === 7 /* MovePathAttr.Teleport2 */ || e.attr === 10 /* MovePathAttr.Normal3 */) {
                    cx = e.x;
                    cy = e.y;
                    cfh = e.fh;
                    cvx = e.vx;
                    cvy = e.vy;
                }
                this._elementIndex++;
                this._elementElapsed = 0;
                continue;
            }
            if (remaining <= 0)
                break;
            const step = Math.min(remaining, duration - this._elementElapsed);
            const segmentDuration = duration - this._elementElapsed;
            const segmentT = step / segmentDuration;
            switch (e.attr) {
                case 0 /* MovePathAttr.Normal */:
                case 5 /* MovePathAttr.Normal2 */:
                case 6 /* MovePathAttr.NormalAlert */:
                case 14 /* MovePathAttr.Normal4 */:
                case 35 /* MovePathAttr.Normal5 */:
                case 36 /* MovePathAttr.Normal6 */:
                case 12 /* MovePathAttr.NormalWithFhFall */:
                    [cx, cvx] = hermiteSegment(cx, cvx, e.x + e.xOffset, e.vx, 0, segmentT, segmentDuration);
                    [cy, cvy] = hermiteSegment(cy, cvy, e.y + e.yOffset, e.vy, 0, segmentT, segmentDuration);
                    break;
                case 1 /* MovePathAttr.Jump */:
                case 2 /* MovePathAttr.JumpAlert */:
                case 13 /* MovePathAttr.Jump2 */:
                case 16 /* MovePathAttr.Jump3 */:
                case 18 /* MovePathAttr.Jump4 */:
                case 31 /* MovePathAttr.Jump5 */:
                case 32 /* MovePathAttr.Jump6 */:
                case 33 /* MovePathAttr.Jump7 */:
                case 34 /* MovePathAttr.Jump8 */:
                    cvx = e.vx;
                    cvy = e.vy;
                    const seconds = step / 1000;
                    cx += cvx * seconds;
                    cy += cvy * seconds;
                    break;
                case 3 /* MovePathAttr.Teleport */:
                case 4 /* MovePathAttr.TeleportAlert */:
                case 7 /* MovePathAttr.Teleport2 */:
                case 8 /* MovePathAttr.TeleportAlert2 */:
                    // A teleport is a boundary transition, never an interpolation.
                    if (this._elementElapsed + step >= duration) {
                        cx = e.x;
                        cy = e.y;
                        cfh = e.fh;
                        cvx = e.vx;
                        cvy = e.vy;
                    }
                    break;
                case 11 /* MovePathAttr.StartFallDown */:
                    cvx = e.vx;
                    cvy = e.vy;
                    cx += cvx * (step / 1000);
                    cy += cvy * (step / 1000);
                    break;
                case 17 /* MovePathAttr.FlyingBlock */:
                    // Flying blocks carry an authoritative destination and velocity.
                    [cx, cvx] = hermiteSegment(cx, cvx, e.x, e.vx, 0, segmentT, segmentDuration);
                    [cy, cvy] = hermiteSegment(cy, cvy, e.y, e.vy, 0, segmentT, segmentDuration);
                    break;
            }
            if (isGroundPathAttr(e.attr)) {
                const footholdY = resolveFh?.(e.fh || cfh)?.YAt(cx);
                if (footholdY !== null && footholdY !== undefined)
                    cy = footholdY;
            }
            remaining -= step;
            this._elementElapsed += step;
            if (this._elementElapsed >= duration) {
                this._elementIndex++;
                this._elementElapsed = 0;
                if (e.attr === 0 /* MovePathAttr.Normal */ || e.attr === 5 /* MovePathAttr.Normal2 */ || e.attr === 6 /* MovePathAttr.NormalAlert */
                    || e.attr === 10 /* MovePathAttr.Normal3 */ || e.attr === 14 /* MovePathAttr.Normal4 */ || e.attr === 35 /* MovePathAttr.Normal5 */
                    || e.attr === 36 /* MovePathAttr.Normal6 */ || e.attr === 12 /* MovePathAttr.NormalWithFhFall */) {
                    cx = e.x + e.xOffset;
                    cy = e.y + e.yOffset;
                    cfh = e.fh;
                    cvx = e.vx;
                    cvy = e.vy;
                    const footholdY = resolveFh?.(cfh)?.YAt(cx);
                    if (footholdY !== null && footholdY !== undefined)
                        cy = footholdY;
                }
            }
        }
        this._elapsedMs = Math.max(this._elapsedMs, elapsedMs);
        return { x: cx, y: cy, vx: cvx, vy: cvy, fh: cfh };
    }
    get IsComplete() { return this._elementIndex >= this.Elements.length; }
    ResetProgress() { this._resetProgress(); }
    _resetProgress() {
        this._elementsRef = this.Elements;
        this._elementIndex = 0;
        this._elementElapsed = 0;
        this._elapsedMs = 0;
        this.CurrentAttr = -1;
        this.CurrentElementIndex = -1;
    }
}
function hermite(p0, v0, p1, v1, t, durationMs) {
    const t2 = t * t;
    const t3 = t2 * t;
    const d = durationMs / 1000;
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;
    const position = h00 * p0 + h10 * v0 * d + h01 * p1 + h11 * v1 * d;
    const velocity = ((6 * t2 - 6 * t) * p0 + (3 * t2 - 4 * t + 1) * v0 * d
        + (-6 * t2 + 6 * t) * p1 + (3 * t2 - 2 * t) * v1 * d) / Math.max(d, 0.001);
    return [position, velocity];
}
function hermiteSegment(p0, v0, p1, v1, t0, t1, durationMs) {
    const end = hermite(p0, v0, p1, v1, t1, durationMs);
    return [end[0], end[1]];
}
function isGroundPathAttr(attr) {
    return attr === 0 /* MovePathAttr.Normal */ || attr === 5 /* MovePathAttr.Normal2 */
        || attr === 10 /* MovePathAttr.Normal3 */ || attr === 6 /* MovePathAttr.NormalAlert */
        || attr === 14 /* MovePathAttr.Normal4 */ || attr === 35 /* MovePathAttr.Normal5 */
        || attr === 36 /* MovePathAttr.Normal6 */ || attr === 12 /* MovePathAttr.NormalWithFhFall */;
}
export class VecCtrl {
    Pos = { x: 0, y: 0, prevX: 0, prevY: 0 };
    Vx = 0;
    Vy = 0;
    Fh = null;
    FhLeft = null;
    FhRight = null;
    FhId = 0;
    MovePath = new MovePath();
    MoveAction = 0;
    IsFloating = false;
    IsFalling = false;
    IsJumping = false;
    IsOnLadder = false;
    IsOnRope = false;
    InputX = 0;
    InputY = 0;
    LadderOrRope = null;
    _lastAttr = 0;
    SetPos(x, y) {
        this.Pos.prevX = this.Pos.x;
        this.Pos.prevY = this.Pos.y;
        this.Pos.x = x;
        this.Pos.y = y;
    }
    SetV(vx, vy) {
        this.Vx = vx;
        this.Vy = vy;
    }
    SetInput(inputX, inputY) {
        this.InputX = Math.max(-1, Math.min(1, Math.trunc(inputX)));
        this.InputY = Math.max(-1, Math.min(1, Math.trunc(inputY)));
    }
    SetLadderOrRope(value) {
        this.LadderOrRope = value;
        this.IsOnLadder = value !== null && !value.upperFoothold;
        this.IsOnRope = value !== null && !!value.upperFoothold;
        if (value) {
            this.Pos.x = value.x;
            this.Vx = 0;
            this.Vy = 0;
        }
    }
    SetFh(fhId, fh, fhLeft, fhRight) {
        this.FhId = fhId;
        this.Fh = fh;
        this.FhLeft = fhLeft;
        this.FhRight = fhRight;
    }
    SetMovePath(originX, originY, originVx, originVy, elements) {
        this.MovePath.OriginX = originX;
        this.MovePath.OriginY = originY;
        this.MovePath.OriginVx = originVx;
        this.MovePath.OriginVy = originVy;
        this.MovePath.Elements = elements;
        this.MovePath.ResetProgress();
    }
    BeginUpdateActive() { }
    EndUpdateActive() { }
    InspectUpdateActive() { }
    WorkUpdateActive(dt, fhList) {
        if (this.IsJumping)
            this._calcJump(dt);
        else if (this.IsFalling)
            this._calcFall(dt);
        else
            this._calcWalk(dt, fhList);
        this._applyGravity(dt);
        this._resolveCollision(dt, fhList);
    }
    WorkUpdatePassive(dt, elapsedMs, resolveFh) {
        const result = this.MovePath.CalcPassivePos(this.Pos.x, this.Pos.y, this.Vx, this.Vy, this.FhId, elapsedMs, resolveFh);
        this.Pos.prevX = this.Pos.x;
        this.Pos.prevY = this.Pos.y;
        this.Pos.x = result.x;
        this.Pos.y = result.y;
        this.Vx = result.vx;
        this.Vy = result.vy;
        this.FhId = result.fh;
        if (this.MovePath.CurrentAttr >= 0) {
            this._lastAttr = this.MovePath.CurrentAttr;
            const current = this.MovePath.Elements[this.MovePath.CurrentElementIndex];
            const stance = current?.moveAction ?? -1;
            if (stance >= 0)
                this.MoveAction = stance;
        }
        return this.MovePath.IsComplete;
    }
    UpdateActive(dt, fhList) {
        this.BeginUpdateActive();
        this.InspectUpdateActive();
        this.WorkUpdateActive(dt, fhList);
        this.EndUpdateActive();
    }
    UpdatePassive(dt, elapsedMs, resolveFh) {
        return this.WorkUpdatePassive(dt, elapsedMs, resolveFh);
    }
    _calcWalk(dt, _fhList) { }
    _calcJump(dt) { }
    _calcFall(dt) { }
    _applyGravity(_dt) { }
    _resolveCollision(_dt, _fhList) { }
    /*
     * OG: CVecCtrl::CalcWalk (0x992BA0) — force-driven walk on a foothold.
     * Integrates horizontal forces and clamps to terminal run speed.
     */
    static CalcWalk(vx, vy, speed, force, drag, dt) {
        const dtS = dt / 1000;
        if (force !== 0)
            vx += force * dtS;
        else if (vx !== 0) {
            const sign = Math.sign(vx);
            vx -= sign * drag * dtS;
            if (sign * vx < 0)
                vx = 0;
        }
        if (speed >= 0)
            vx = Math.max(-speed, Math.min(speed, vx));
        return { vx, vy };
    }
    /*
     * OG: CVecCtrl::CalcFloat (0x9934C0) — air/water physics integration.
     * Applies gravity and horizontal drag while airborne.
     */
    static CalcFloat(vx, vy, gravity, maxFallSpeed, drag, dt) {
        const dtS = dt / 1000;
        vy += gravity * dtS;
        if (vy > maxFallSpeed)
            vy = maxFallSpeed;
        if (vy < -maxFallSpeed)
            vy = -maxFallSpeed;
        if (vx !== 0 && drag > 0) {
            const sign = vx >= 0 ? 1 : -1;
            vx -= sign * drag * dtS;
            if (sign * vx < 0)
                vx = 0;
        }
        return { vx, vy };
    }
}
//# sourceMappingURL=VecCtrl.js.map