import { Container, Graphics, Sprite } from 'pixi.js';
import { AnimFrame } from './WzFrameAnimation.js';

interface Entry {
  x1: number; y1: number;
  x2: number; y2: number;
  elapsedMs: number;
  durationMs: number;
  frames?: AnimFrame[];
  fadeOut: boolean;
  frameIndex: number;
  frameTimerMs: number;
}

interface ChainEntry {
  points: { x: number; y: number }[];
  elapsedMs: number;
  durationMs: number;
}

const DefaultDurationMs = 200;
const ChainSegmentLen = 48;

export class ProjectileOverlay {
  private _entries: Entry[] = [];
  private _chainEntries: ChainEntry[] = [];

  Spawn(x1: number, y1: number, x2: number, y2: number, durationMs: number = DefaultDurationMs, frames?: AnimFrame[], fadeOut = false): void {
    this._entries.push({ x1, y1, x2, y2, elapsedMs: 0, durationMs, frames, fadeOut, frameIndex: 0, frameTimerMs: 0 });
  }

  SpawnChainLightning(points: { x: number; y: number }[], durationMs: number = 220): void {
    if (points.length < 2) return;
    this._chainEntries.push({ points, elapsedMs: 0, durationMs });
  }

  Clear(): void {
    this._entries = [];
    this._chainEntries = [];
  }

  Update(dt: number): void {
    const ms = dt * 1000;
    for (let i = this._entries.length - 1; i >= 0; i--) {
      const e = this._entries[i];
      e.elapsedMs += ms;
      e.frameTimerMs += ms;
      if (e.frames && e.frames.length > 0) {
        while (e.frameIndex < e.frames.length - 1 && e.frameTimerMs >= (e.frames[e.frameIndex]?.delayMs ?? 100)) {
          e.frameTimerMs -= e.frames[e.frameIndex]?.delayMs ?? 100;
          e.frameIndex++;
        }
      }
      if (e.elapsedMs >= e.durationMs) this._entries.splice(i, 1);
    }
    for (let i = this._chainEntries.length - 1; i >= 0; i--) {
      const e = this._chainEntries[i];
      e.elapsedMs += ms;
      if (e.elapsedMs >= e.durationMs) this._chainEntries.splice(i, 1);
    }
  }

  RebuildDisplay(worldToScreen: (wx: number, wy: number) => { x: number; y: number }): Container {
    const root = new Container();
    for (const e of this._entries) {
      const t = Math.min(1, e.elapsedMs / e.durationMs);
      const wx = e.x1 + (e.x2 - e.x1) * t;
      const wy = e.y1 + (e.y2 - e.y1) * t;
      const screen = worldToScreen(wx, wy);
      const alpha = e.fadeOut ? 1 - t : 1;
      if (e.frames && e.frames.length > 0) {
        const fi = Math.min(e.frameIndex, e.frames.length - 1);
        const frame = e.frames[fi];
        const sprite = frame.sprite.NewSprite(false);
        sprite.position.set(screen.x, screen.y);
        sprite.alpha = alpha;
        // TODO_AUDIT.md Hundred-and-forty-ninth pass: orient projectile sprites along their actual travel path.
        sprite.rotation = Math.atan2(e.y2 - e.y1, e.x2 - e.x1);
        root.addChild(sprite);
      } else {
        const g = new Graphics();
        g.circle(0, 0, 3).fill({ color: 0xFFE664 });
        g.alpha = alpha;
        g.position.set(screen.x, screen.y);
        root.addChild(g);
      }
    }
    for (const e of this._chainEntries) {
      const g = new Graphics();
      const alpha = 1 - Math.min(1, e.elapsedMs / e.durationMs);
      for (let i = 0; i < e.points.length - 1; i++) {
        this._drawChain(g, e.points[i], e.points[i + 1], worldToScreen, alpha);
      }
      root.addChild(g);
    }
    return root;
  }

  private _drawChain(
    g: Graphics,
    from: { x: number; y: number },
    to: { x: number; y: number },
    worldToScreen: (wx: number, wy: number) => { x: number; y: number },
    alpha: number,
  ): void {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.hypot(dx, dy);
    const count = Math.max(1, Math.ceil(dist / ChainSegmentLen));
    for (let i = 0; i < count; i++) {
      const a = i / count;
      const b = (i + 0.75) / count;
      const p1 = worldToScreen(from.x + dx * a, from.y + dy * a);
      const p2 = worldToScreen(from.x + dx * Math.min(1, b), from.y + dy * Math.min(1, b));
      // TODO_AUDIT.md Hundred-and-seventy-second pass: CHAINLIGHTNINGINFO is a
      // straight segmented line; WZ ball sprite variants are deferred until the exact UOL is verified.
      g.moveTo(p1.x, p1.y).lineTo(p2.x, p2.y).stroke({ color: 0x9eeaff, width: 3, alpha });
      g.circle(p2.x, p2.y, 2).fill({ color: 0xffffff, alpha });
    }
  }
}
