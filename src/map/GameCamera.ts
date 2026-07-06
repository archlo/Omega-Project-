export class GameCamera {
  Position = { x: 0, y: 0 };
  Target = { x: 0, y: 0 };

  MapBounds = { left: -10000, top: -10000, right: 10000, bottom: 10000 };
  ViewWidth = 800;
  ViewHeight = 600;
  FollowSpeed = 6;

  // OG: CAnimationDisplayer::Effect_Tremble drives the field's centerpoint
  // through native-engine RelMove() random offsets that decay over time
  // (CAnimationDisplayer::Update) — that exact tween isn't replicated (see
  // plan's non-goals); this is a simple linear-decaying random jitter
  // applied only to the screen-space output, not `Position` itself, so
  // other camera-position-dependent logic is unaffected by an active shake.
  private _shakeIntensity = 0;
  private _shakeRemainingMs = 0;
  private _shakeTotalMs = 0;
  private _shakeOffset = { x: 0, y: 0 };

  constructor(startPosition?: { x: number; y: number }) {
    if (startPosition) {
      this.Position = { ...startPosition };
      this.Target = { ...startPosition };
    }
  }

  /** OG: FieldEffect subType 1 / CUserRemote::OnAttack's per-skill tremble
      calls -> CAnimationDisplayer::Effect_Tremble(force, intensity,
      durationMs, ...). `intensity` scales the random jitter radius (px);
      decays linearly to 0 over `durationMs`. */
  Shake(intensity: number, durationMs: number): void {
    this._shakeIntensity = intensity;
    this._shakeRemainingMs = durationMs;
    this._shakeTotalMs = durationMs;
  }

  Update(deltaTime: number): void {
    const t = 1 - Math.pow(1 - Math.max(0, Math.min(1, this.FollowSpeed * deltaTime)), 1);
    this.Position.x += (this.Target.x - this.Position.x) * t;
    this.Position.y += (this.Target.y - this.Position.y) * t;
    this._clamp();
    this._updateShake(deltaTime * 1000);
  }

  private _updateShake(ms: number): void {
    if (this._shakeRemainingMs <= 0) {
      this._shakeOffset.x = 0;
      this._shakeOffset.y = 0;
      return;
    }
    this._shakeRemainingMs -= ms;
    const fraction = Math.max(0, this._shakeRemainingMs) / this._shakeTotalMs;
    const radius = this._shakeIntensity * fraction;
    this._shakeOffset.x = (Math.random() * 2 - 1) * radius;
    this._shakeOffset.y = (Math.random() * 2 - 1) * radius;
  }

  private _clamp(): void {
    const hw = this.ViewWidth / 2;
    const hh = this.ViewHeight / 2;
    this.Position.x = Math.max(this.MapBounds.left + hw, Math.min(this.MapBounds.right - hw, this.Position.x));
    this.Position.y = Math.max(this.MapBounds.top + hh, Math.min(this.MapBounds.bottom - hh, this.Position.y));
  }

  WorldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: worldX - this.Position.x + this._shakeOffset.x + this.ViewWidth / 2,
      y: worldY - this.Position.y + this._shakeOffset.y + this.ViewHeight / 2,
    };
  }

  ScreenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: screenX - this.ViewWidth / 2 + this.Position.x,
      y: screenY - this.ViewHeight / 2 + this.Position.y,
    };
  }

  IsVisible(worldRect: { x: number; y: number; w: number; h: number }, margin = 64): boolean {
    const s = this.WorldToScreen(worldRect.x, worldRect.y);
    return (
      s.x + worldRect.w + margin >= 0 &&
      s.x - margin < this.ViewWidth &&
      s.y + worldRect.h + margin >= 0 &&
      s.y - margin < this.ViewHeight
    );
  }
}
