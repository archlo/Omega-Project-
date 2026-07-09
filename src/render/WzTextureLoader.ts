import { Texture, BufferImageSource } from 'pixi.js';
import { WzCanvas } from '../wz/WzCanvas.js';
import { WzProperty } from '../wz/WzProperty.js';
import { WzVector } from '../wz/WzVector.js';
import { WzSprite } from './WzSprite.js';
import { AnimatedSprite } from './AnimatedSprite.js';

export class WzTextureLoader {
  private _cache = new Map<WzCanvas, WzSprite>();

  Load(canvas: WzCanvas | null): WzSprite | null {
    if (canvas === null) return null;
    if (!(canvas instanceof WzCanvas)) return null;

    const cached = this._cache.get(canvas);
    if (cached) return cached;

    if (canvas.Width <= 0 || canvas.Height <= 0) {
      console.warn(`[WzLoader] skip ${canvas.Width}x${canvas.Height} (fmt=${canvas.Format})`);
      return null;
    }

    let pixels: Uint8Array;
    try {
      pixels = canvas.DecodeBgra();
    } catch (e) {
      console.warn(`[WzLoader] DecodeBgra failed (fmt=${canvas.Format})`, e);
      return null;
    }

    let texture: Texture;
    try {
      const source = new BufferImageSource({
        resource: pixels,
        width: canvas.Width,
        height: canvas.Height,
      });
      texture = new Texture({ source });
    } catch (e) {
      console.warn('[WzLoader] BufferImageSource threw', e);
      return null;
    }

    let originX = 0, originY = 0;
    try {
      const prop = canvas.Property;
      if (prop) {
        const origin = prop.Get('origin');
        if (origin instanceof WzVector) {
          originX = origin.X;
          originY = origin.Y;
        }
      }
    } catch { /* NX bitmap nodes may not have origin property */ }

    let lt: { x: number; y: number } | null = null;
    let rb: { x: number; y: number } | null = null;
    try {
      const prop = canvas.Property;
      if (prop) {
        const ltV = prop.Get('lt');
        if (ltV instanceof WzVector) lt = { x: ltV.X, y: ltV.Y };
        const rbV = prop.Get('rb');
        if (rbV instanceof WzVector) rb = { x: rbV.X, y: rbV.Y };
      }
    } catch { /* NX bitmap nodes may not have lt/rb properties */ }

    const sprite = new WzSprite(texture, originX, originY, lt, rb);
    this._cache.set(canvas, sprite);
    return sprite;
  }

  LoadAnimation(node: unknown): AnimatedSprite | null {
    if (node instanceof WzCanvas) {
      const s = this.Load(node);
      return s === null ? null : new AnimatedSprite([s], [100]);
    }
    if (node instanceof WzProperty) {
      const frames: WzSprite[] = [];
      const delays: number[] = [];
      for (let i = 0; ; i++) {
        const frame = node.Get(String(i));
        if (!(frame instanceof WzCanvas)) break;
        const sprite = this.Load(frame);
        if (sprite === null) break;
        frames.push(sprite);
        const d = this._readDelay(frame.Property.Get('delay'), 100);
        delays.push(d <= 0 ? 100 : d);
      }
      return frames.length === 0 ? null : new AnimatedSprite(frames, delays);
    }
    return null;
  }

  private _readDelay(v: unknown, fallback: number): number {
    if (typeof v === 'number') return v;
    if (typeof v === 'bigint') return Number(v);
    return fallback;
  }

  Dispose(): void {
    // Do not call texture.destroy() — sprites in the outgoing scene may still
    // reference these textures during the final render frame after onExit().
    // PixiJS GCSystem will reclaim GPU memory automatically.
    this._cache.clear();
  }
}
