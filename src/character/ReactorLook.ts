import { Container, Graphics, Sprite } from 'pixi.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import { WzCanvas } from '../wz/WzCanvas.js';
import { WzProperty } from '../wz/WzProperty.js';
import type { WzPackage } from '../wz/WzPackage.js';
import { WzImage } from '../wz/WzImage.js';
import { WzSprite } from '../render/WzSprite.js';

interface Frame {
  sprite: WzSprite;
  delayMs: number;
}

/**
 * OG CReactor display model (live IDB: CReactorPool::LoadReactorLayer,
 * CReactorPool::Update, CReactorPool::FindHitReactor, play_reactor_sound).
 *
 * - One looping layer per numeric state node (`<id>.img/<state>/`). The
 *   native engine animates numbered canvas children; the `hit` child is a
 *   SEPARATE one-shot overlay (SKILLENTRY-style `GetHitProp` resolves
 *   `<prop>/<state>/hit`), never part of the loop.
 * - `info/link` redirects to another template img (numeric or "0002000"
 *   string form). States are unbounded (surveyed 0..31 in the wild), not 0..7.
 * - On ChangeState the visual switch happens after the hit-start delay
 *   (aniDelay), the OLD state's `Sound/Reactor.img/<id>/<oldState>/Hit`
 *   plays, the new state's `hit` overlay flashes once, and hittability
 *   resumes after the state-end window. properEventIdx -2 arms removal once
 *   the new state's animation completes a loop.
 * - Hit testing uses the CURRENT canvas lt/rb at the placed position
 *   (FindHitReactor reads the live layer vectors, not a fixed box).
 */
export class ReactorLook {
  private _anims = new Map<number, Frame[]>();
  private _hitAnims = new Map<number, Frame[]>();
  private _curState = 0;
  private _frame = 0;
  private _frameTimer = 0;
  private _loaded = false;
  private _flip = false;

  // Pending visual switch (hit-start delay from ChangeState).
  private _pending: { state: number; properEventIdx: number; timerMs: number } | null = null;
  // One-shot hit overlay (state `hit` frames).
  private _hitOverlay: { frames: Frame[]; index: number; timerMs: number } | null = null;
  // Removal armed (properEventIdx -2): despawn after one full anim loop.
  private _removalArmed = false;
  private _looped = false;
  // Hittability gate (tStateEnd): FindHitReactor skips reactors inside it.
  private _hittableAfter = 0;

  /** OG play_reactor_sound sink — GameStage plays
      Sound/Reactor.img/<templateId>/<oldState>/Hit here on every switch. */
  onHitSound: ((templateId: number, oldState: number) => void) | null = null;
  /** Set when a removal-armed state animation completes (GameStage despawns). */
  Finished = false;

  readonly container = new Container();
  Position = { x: 0, y: 0 };

  constructor(
    public readonly ObjId: number,
    public readonly TemplateId: number,
    public State: number,
  ) {}

  Load(loader: WzTextureLoader, reactorWz: WzPackage | null): void {
    this._loader = loader;
    if (reactorWz === null) return;
    const strid = `${this.TemplateId.toString().padStart(7, '0')}.img`;
    const img = reactorWz.GetItem(strid);
    const root = img instanceof WzImage ? img.Root : null;
    if (!root) return;
    const info = root.Get('info');
    if (info instanceof WzProperty) {
      const link = info.Get('link');
      const linkId = typeof link === 'number' ? link : typeof link === 'string' ? parseInt(link, 10) : NaN;
      if (!isNaN(linkId) && linkId !== this.TemplateId) {
        const linkImg = reactorWz.GetItem(`${linkId.toString().padStart(7, '0')}.img`);
        const linkRoot = linkImg instanceof WzImage ? linkImg.Root : null;
        if (linkRoot) {
          this._loadStates(linkRoot);
          return;
        }
      }
    }
    this._loadStates(root);
  }

  private _loadStates(root: WzProperty): void {
    // All numeric state children, unbounded (not capped at 7).
    const indices = Object.keys(root.Items)
      .map((k) => parseInt(k, 10))
      .filter((n) => !isNaN(n))
      .sort((a, b) => a - b);
    for (const st of indices) {
      const stateNode = root.Get(`${st}`);
      if (!(stateNode instanceof WzProperty)) continue;
      this._anims.set(st, this._loadFrames(stateNode, ['hit']));
      const hitNode = stateNode.Get('hit');
      if (hitNode instanceof WzProperty || hitNode instanceof WzCanvas) {
        const hitFrames = this._loadFrames(hitNode, []);
        if (hitFrames.length > 0) this._hitAnims.set(st, hitFrames);
      }
    }
    this._loaded = this._anims.size > 0;
  }

  /** Numbered canvas children only — named children (`hit`, `event`, …)
      are never loop frames. Missing indices terminate the scan. */
  private _loadFrames(node: WzProperty | WzCanvas, skip: string[]): Frame[] {
    if (node instanceof WzCanvas) {
      const sprite = this._loader.Load(node);
      return sprite ? [{ sprite, delayMs: 120 }] : [];
    }
    const frames: Frame[] = [];
    for (let fi = 0; ; fi++) {
      const raw = node.Get(`${fi}`);
      if (raw === null || raw === undefined) break;
      let delay = 120;
      let sprite: WzSprite | null = null;
      if (raw instanceof WzCanvas) {
        sprite = this._loader.Load(raw);
      } else if (raw instanceof WzProperty) {
        const v = raw.Get('delay');
        delay = typeof v === 'number' ? v : typeof v === 'bigint' ? Number(v) : 120;
        for (const [key, cv] of Object.entries(raw.Items)) {
          if (skip.includes(key)) continue;
          if (cv instanceof WzCanvas) { sprite = this._loader.Load(cv); break; }
        }
      } else break;
      if (sprite) frames.push({ sprite, delayMs: delay });
    }
    return frames;
  }

  private _loader!: WzTextureLoader;

  LoadWith(loader: WzTextureLoader, reactorWz: WzPackage | null): void {
    this._loader = loader;
    this.Load(loader, reactorWz);
  }

  set Flip(flip: boolean) {
    if (flip === this._flip) return;
    this._flip = flip;
    this._rebuildDisplay();
  }

  get Flip(): boolean { return this._flip; }

  /** Seed the enter state directly (no sound/overlay — OG enter plays none). */
  SeedState(state: number): void {
    this._curState = state;
    this.State = state;
    this._frame = 0;
    this._frameTimer = 0;
    this._pending = null;
    this._hitOverlay = null;
    this._removalArmed = false;
    this._looped = false;
  }

  SetState(state: number): void {
    this.ApplyChangeState(state, { hitDelayMs: 0, properEventIdx: 0, stateEndMs: 0 });
  }

  /** OG OnReactorChangeState: records the switch immediately but the visual
      layer flips after the hit-start delay; hittability resumes after the
      state-end window; properEventIdx -2 arms despawn after one anim loop. */
  ApplyChangeState(state: number, opts: { hitDelayMs: number; properEventIdx: number; stateEndMs: number }): void {
    this.State = state;
    this._hittableAfter = Date.now() + Math.max(0, opts.stateEndMs);
    this._pending = { state, properEventIdx: opts.properEventIdx, timerMs: Math.max(0, opts.hitDelayMs) };
  }

  /** OG FindHitReactor gate (nAniState/tStateEnd): no hits land inside the
      state-end window after a change. */
  IsHittable(nowMs = Date.now()): boolean {
    return nowMs >= this._hittableAfter && !this.Finished;
  }

  /** OG FindHitReactor hit-box: the CURRENT canvas lt/rb at the placed
      position, mirrored when flipped. Falls back to the drawn bounds when
      the canvas carries no lt/rb, and to null when nothing is loaded (the
      caller keeps its legacy box then). */
  HitRect(): { left: number; top: number; right: number; bottom: number } | null {
    const frames = this._anims.get(this._curState);
    const sprite = frames?.[Math.min(this._frame, frames.length - 1)]?.sprite;
    if (!sprite || sprite.Width <= 0 || sprite.Height <= 0) return null;
    const baseX = this.Position.x - sprite.OriginX;
    const baseY = this.Position.y - sprite.OriginY;
    const ltX = sprite.Lt?.x ?? 0;
    const ltY = sprite.Lt?.y ?? 0;
    const rbX = sprite.Rb?.x ?? sprite.Width;
    const rbY = sprite.Rb?.y ?? sprite.Height;
    if (!this._flip) {
      return { left: baseX + ltX, top: baseY + ltY, right: baseX + rbX, bottom: baseY + rbY };
    }
    // Mirrored around the anchor: canvas pixel c lands at X + OriginX - c.
    return {
      left: this.Position.x + sprite.OriginX - rbX,
      top: baseY + ltY,
      right: this.Position.x + sprite.OriginX - ltX,
      bottom: baseY + rbY,
    };
  }

  get Loaded(): boolean { return this._loaded; }

  EnsureDisplay(): void { this._rebuildDisplay(); }

  Update(dt: number): void {
    const ms = dt * 1000;
    // Pending visual switch (hit-start delay).
    if (this._pending) {
      this._pending.timerMs -= ms;
      if (this._pending.timerMs <= 0) {
        const oldState = this._curState;
        const next = this._pending;
        this._pending = null;
        this._curState = next.state;
        this._frame = 0;
        this._frameTimer = 0;
        this._looped = false;
        this._removalArmed = next.properEventIdx === -2;
        const hit = this._hitAnims.get(next.state);
        if (hit && hit.length > 0) {
          this._hitOverlay = { frames: hit, index: 0, timerMs: 0 };
        }
        this.onHitSound?.(this.TemplateId, oldState);
        this._rebuildDisplay();
      }
    }
    // Hit overlay plays once, then clears.
    if (this._hitOverlay) {
      const ov = this._hitOverlay;
      ov.timerMs += ms;
      const d = ov.frames[ov.index].delayMs;
      if (ov.timerMs >= (d > 0 ? d : 150)) {
        ov.timerMs -= d > 0 ? d : 150;
        ov.index++;
        if (ov.index >= ov.frames.length) this._hitOverlay = null;
        else this._rebuildDisplay();
      }
    }
    // State loop.
    const frames = this._anims.get(this._curState);
    if (!frames || frames.length === 0) { this._rebuildDisplay(); return; }
    let delayMs = frames[this._frame].delayMs;
    if (delayMs <= 0) delayMs = 150;
    this._frameTimer += ms;
    if (this._frameTimer >= delayMs) {
      this._frameTimer -= delayMs;
      this._frame++;
      if (this._frame >= frames.length) {
        this._frame = 0;
        this._looped = true;
        if (this._removalArmed) {
          // OG nAniState 3 + finished layer → RemoveReactor.
          this.Finished = true;
          return;
        }
      }
      this._rebuildDisplay();
    }
  }

  private _rebuildDisplay(): void {
    this.container.removeChildren();
    // Hit overlay draws over the state frame while it plays.
    const ov = this._hitOverlay;
    const over = ov ? ov.frames[Math.min(ov.index, ov.frames.length - 1)]?.sprite : undefined;
    const frames = this._anims.get(this._curState);
    const base = this._loaded && frames && frames.length > 0
      ? frames[Math.min(this._frame, frames.length - 1)].sprite
      : undefined;
    for (const sprite of [base, over]) {
      if (!sprite) continue;
      const s = new Sprite(sprite.Texture);
      s.anchor.set(
        sprite.Width > 0 ? sprite.OriginX / sprite.Width : 0,
        sprite.Height > 0 ? sprite.OriginY / sprite.Height : 0,
      );
      if (this._flip) s.scale.x = -1;
      this.container.addChild(s);
    }
    if (!base) {
      const hue = Math.floor(this.TemplateId / 100) % 6;
      const colors = [0x44aaff, 0xff8844, 0x88ff44, 0xff4488, 0x8844ff, 0x44ff88];
      const gfx = new Graphics();
      gfx.roundRect(-15, -30, 30, 30, 4).fill({ color: colors[hue], alpha: 0.7 });
      this.container.addChild(gfx);
    }
  }
}
