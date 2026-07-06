import { Container } from 'pixi.js';
import type { AvatarLook } from '../domain/AvatarLook.js';
import type { WzPackage } from '../wz/WzPackage.js';
import { WzProperty } from '../wz/WzProperty.js';
import { WzVector } from '../wz/WzVector.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import type { AnimFrame } from './WzFrameAnimation.js';
import { loadFrameSequence, totalDurationMs } from './WzFrameAnimation.js';

type AnchorKind = 'face' | 'body';

export interface ItemEffectSpec {
  itemId: number;
  bodyPart: number;
  path: string;
  animate: boolean;
  follow: boolean;
  emission: boolean;
  genOnMove: boolean;
  noFlip: boolean;
  fixed: boolean;
  z: number;
  intervalMs: number;
  delayMs: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
  dx: number;
  dy: number;
  theta: number;
  genPoints: { x: number; y: number }[];
  anchor: AnchorKind;
}

interface LoadedEffect {
  spec: ItemEffectSpec;
  frames: AnimFrame[];
  frameIndex: number;
  frameTimerMs: number;
  emitTimerMs: number;
  particles: Particle[];
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ageMs: number;
  lifeMs: number;
  frameIndex: number;
  frameTimerMs: number;
  relative: boolean;
}

type AnchorDisplay = { face: { x: number; y: number }; body: { x: number; y: number }; facingLeft: boolean };

export class ItemEffectOverlay {
  private _entries = new Map<number, LoadedEffect[]>();

  constructor(
    private _loader: WzTextureLoader,
    private _characterWz: WzPackage | null,
    private _effectWz: WzPackage | null,
    private _rng: () => number = Math.random,
  ) {}

  /** TODO_AUDIT.md Hundred-and-seventy-eighth pass: CItemEffectManager keeps
      60 slots parallel to equipped hairEquip/body-part IDs and reloads each
      slot when the equipped item changes. */
  SetCharacter(charId: number, look: AvatarLook | null): void {
    if (!look) { this._entries.delete(charId); return; }
    const effects: LoadedEffect[] = [];
    for (const [bodyPart, itemId] of look.hairEquip) {
      const loaded = this._load(itemId, bodyPart);
      if (loaded) effects.push(loaded);
    }
    if (effects.length === 0) this._entries.delete(charId);
    else this._entries.set(charId, effects);
  }

  RemoveCharacter(charId: number): void {
    this._entries.delete(charId);
  }

  Clear(): void {
    this._entries.clear();
  }

  Update(dt: number): void {
    const ms = dt * 1000;
    for (const effects of this._entries.values()) {
      for (const effect of effects) {
        this._advanceFrames(effect, ms);
        if (!effect.spec.animate) this._updateEmitter(effect, ms);
      }
    }
  }

  RebuildDisplay(resolve: (charId: number) => AnchorDisplay | null): Container {
    const root = new Container();
    for (const [charId, effects] of this._entries) {
      const anchors = resolve(charId);
      if (!anchors) continue;
      for (const effect of effects) {
        const anchor = effect.spec.anchor === 'face' ? anchors.face : anchors.body;
        if (effect.spec.animate) {
          const frame = effect.frames[Math.min(effect.frameIndex, effect.frames.length - 1)];
          const sprite = frame.sprite.NewSprite(!effect.spec.noFlip && !anchors.facingLeft);
          sprite.position.set(anchor.x + this._flipX(effect.spec.dx, anchors, effect.spec), anchor.y + effect.spec.dy);
          root.addChild(sprite);
          continue;
        }
        for (const particle of effect.particles) {
          const frame = effect.frames[Math.min(particle.frameIndex, effect.frames.length - 1)];
          const sprite = frame.sprite.NewSprite(!effect.spec.noFlip && !anchors.facingLeft);
          const x = particle.relative ? anchor.x + this._flipX(particle.x, anchors, effect.spec) : particle.x;
          const y = particle.relative ? anchor.y + particle.y : particle.y;
          sprite.position.set(x, y);
          sprite.alpha = Math.max(0, 1 - particle.ageMs / particle.lifeMs);
          root.addChild(sprite);
        }
      }
    }
    return root;
  }

  static ParseSpec(itemId: number, bodyPart: number, effect: WzProperty): ItemEffectSpec | null {
    const rawPath = S(effect, 'path');
    if (!rawPath) return null;
    const follow = B(effect, 'follow');
    const rel = B(effect, 'rel');
    return {
      itemId,
      bodyPart,
      path: rawPath.replace(/^Effect\//, ''),
      animate: B(effect, 'animate'),
      follow,
      emission: B(effect, 'emission'),
      genOnMove: B(effect, 'genOnMove'),
      noFlip: B(effect, 'noFlip'),
      fixed: B(effect, 'fixed'),
      z: N(effect, 'z', 0),
      intervalMs: Math.max(16, N(effect, 'interval', 250)),
      delayMs: Math.max(100, N(effect, 'delay', 1000)),
      left: N(effect, 'left', -25),
      top: N(effect, 'top', -25),
      right: N(effect, 'right', 25),
      bottom: N(effect, 'bottom', 25),
      dx: N(effect, 'dx', N(effect, 'x', 0)),
      dy: N(effect, 'dy', rel ? 0 : -20),
      theta: N(effect, 'theta', 0),
      genPoints: points(effect.Get('genPoint')),
      anchor: faceAnchoredBodyParts.has(bodyPart) ? 'face' : 'body',
    };
  }

  private _load(itemId: number, bodyPart: number): LoadedEffect | null {
    if (!this._characterWz || !this._effectWz || itemId <= 0) return null;
    const effect = this._itemEffectNode(itemId);
    if (!(effect instanceof WzProperty)) return null;
    const spec = ItemEffectOverlay.ParseSpec(itemId, bodyPart, effect);
    if (!spec) return null;
    const frames = loadFrameSequence(this._loader, this._effectWz.GetItem(spec.path), spec.intervalMs, spec.intervalMs);
    if (frames.length === 0) return null;
    return { spec, frames, frameIndex: 0, frameTimerMs: 0, emitTimerMs: spec.intervalMs, particles: [] };
  }

  private _itemEffectNode(itemId: number): unknown {
    const category = equipCategory(itemId);
    if (!category || !this._characterWz) return null;
    return this._characterWz.GetItem(`${category}/${itemId.toString().padStart(8, '0')}.img/info/effect`);
  }

  private _advanceFrames(effect: LoadedEffect, ms: number): void {
    effect.frameTimerMs += ms;
    while (effect.frames.length > 0 && effect.frameTimerMs >= effect.frames[effect.frameIndex].delayMs) {
      effect.frameTimerMs -= effect.frames[effect.frameIndex].delayMs;
      effect.frameIndex = (effect.frameIndex + 1) % effect.frames.length;
    }
  }

  private _updateEmitter(effect: LoadedEffect, ms: number): void {
    // TODO_AUDIT.md ItemEffectOverlay emitter-double-fire fix: emitTimerMs is
    // primed to intervalMs on load (emit-on-first-update). Using `>=` meant a
    // dt of exactly one interval crossed the boundary twice (primed interval +
    // the elapsed interval) and spawned two particles for a single tick. Emit
    // on strictly exceeding the interval so the primed boundary counts once.
    effect.emitTimerMs += ms;
    while (effect.emitTimerMs > effect.spec.intervalMs) {
      effect.emitTimerMs -= effect.spec.intervalMs;
      effect.particles.push(this._spawnParticle(effect.spec));
    }
    for (let i = effect.particles.length - 1; i >= 0; i--) {
      const p = effect.particles[i];
      p.ageMs += ms;
      p.x += p.vx * (ms / 1000);
      p.y += p.vy * (ms / 1000);
      p.frameTimerMs += ms;
      while (p.frameTimerMs >= effect.frames[p.frameIndex].delayMs) {
        p.frameTimerMs -= effect.frames[p.frameIndex].delayMs;
        p.frameIndex = (p.frameIndex + 1) % effect.frames.length;
      }
      if (p.ageMs >= p.lifeMs) effect.particles.splice(i, 1);
    }
  }

  private _spawnParticle(spec: ItemEffectSpec): Particle {
    const gp = spec.genPoints.length > 0 ? spec.genPoints[Math.floor(this._rng() * spec.genPoints.length)] : null;
    const x = gp ? gp.x : spec.left + this._rng() * (spec.right - spec.left);
    const y = gp ? gp.y : spec.top + this._rng() * (spec.bottom - spec.top);
    const theta = (spec.theta * Math.PI) / 180;
    const speed = spec.emission ? 12 : 0;
    return {
      x: x + spec.dx,
      y: y + spec.dy,
      vx: Math.cos(theta) * speed,
      vy: -Math.sin(theta) * speed,
      ageMs: 0,
      lifeMs: Math.max(spec.delayMs, totalDurationMs([]) || spec.delayMs),
      frameIndex: 0,
      frameTimerMs: 0,
      relative: spec.follow,
    };
  }

  private _flipX(x: number, anchors: AnchorDisplay, spec: ItemEffectSpec): number {
    return !spec.noFlip && anchors.facingLeft ? -x : x;
  }
}

const faceAnchoredBodyParts = new Set([0, 1, 2, 3, 4, 9, 12, 13, 15, 16]);

function equipCategory(itemId: number): string | null {
  const cat = Math.floor(itemId / 10000);
  switch (true) {
    case cat === 100: return 'Cap';
    case cat === 101 || cat === 102 || cat === 103: return 'Accessory';
    case cat === 104: return 'Coat';
    case cat === 105: return 'Longcoat';
    case cat === 106: return 'Pants';
    case cat === 107: return 'Shoes';
    case cat === 108: return 'Glove';
    case cat === 109: return 'Shield';
    case cat === 110: return 'Cape';
    case cat === 111: return 'Ring';
    case cat >= 112 && cat <= 119: return 'Accessory';
    case cat >= 130 && cat <= 179: return 'Weapon';
    case cat >= 190 && cat <= 193: return 'TamingMob';
    default: return null;
  }
}

function N(p: WzProperty, key: string, fallback: number): number {
  const v = p.Get(key);
  if (typeof v === 'number') return v;
  if (typeof v === 'bigint') return Number(v);
  return fallback;
}

function B(p: WzProperty, key: string): boolean {
  return N(p, key, 0) !== 0;
}

function S(p: WzProperty, key: string): string {
  const v = p.Get(key);
  return typeof v === 'string' ? v : '';
}

function points(node: unknown): { x: number; y: number }[] {
  if (!(node instanceof WzProperty)) return [];
  const out: { x: number; y: number }[] = [];
  const keys = Object.keys(node.Items).map((k) => Number(k)).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  for (const k of keys) {
    const v = node.Get(String(k));
    if (v instanceof WzVector) out.push({ x: v.X, y: v.Y });
  }
  return out;
}
