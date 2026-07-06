import { Sprite } from 'pixi.js';
import { WzSprite } from './WzSprite.js';

export interface ISprite {
  draw(x: number, y: number, flipX?: boolean): void;
}

export class AnimatedSprite {
  private readonly _frames: WzSprite[];
  private readonly _delaysMs: number[];
  private _index = 0;
  private _accumMs = 0;
  private _pixiSprite: Sprite;

  constructor(frames: WzSprite[], delaysMs: number[]) {
    if (frames.length === 0) throw new Error("At least one frame required");
    this._frames = frames;
    this._delaysMs = delaysMs;
    let total = 0;
    for (const d of delaysMs) total += d > 0 ? d : 100;
    this.TotalDurationMs = total;
    this._pixiSprite = new Sprite(frames[0].Texture);
    this._applyOrigin(frames[0]);
  }

  get FrameCount(): number { return this._frames.length; }
  readonly TotalDurationMs: number;
  get Current(): WzSprite { return this._frames[this._index]; }
  get Target(): Sprite { return this._pixiSprite; }

  Update(dtMs: number): void {
    if (this._frames.length < 2) return;
    this._accumMs += dtMs;
    let guard = 0;
    // Twenty-fourth pass: the constructor's own TotalDurationMs sum (above)
    // already falls back to 100ms for any delay <=0 — this loop previously
    // read `this._delaysMs[this._index]` raw, with no such fallback. Both of
    // today's two real construction sites (WzTextureLoader.LoadAnimation,
    // confirmed by grep) already guarantee every delay is a positive number
    // before ever reaching this constructor, so this was a latent-only gap,
    // not a live bug — but a 0/negative/undefined (out-of-range index, if
    // delaysMs/frames length ever desynced) delay here would either spin the
    // `guard` cap every single frame forever (0/negative: `_accumMs -= 0`
    // never shrinks) or permanently freeze the frame index (`undefined`:
    // `_accumMs >= undefined` is always false) for any future caller that
    // doesn't pre-sanitize its delays array. Hardened to match the
    // constructor's own existing `d > 0 ? d : 100` fallback.
    while (guard++ < 256) {
      const delay = this._delaysMs[this._index];
      const realDelay = delay > 0 ? delay : 100;
      if (this._accumMs < realDelay) break;
      this._accumMs -= realDelay;
      this._index = (this._index + 1) % this._frames.length;
    }
    const frame = this._frames[this._index];
    this._pixiSprite.texture = frame.Texture;
    this._applyOrigin(frame);
  }

  Draw(x: number, y: number, flipX = false): Sprite {
    const frame = this._frames[this._index];
    this._pixiSprite.texture = frame.Texture;
    this._applyOrigin(frame);
    this._pixiSprite.position.set(x, y);
    this._pixiSprite.scale.x = flipX ? -1 : 1;
    return this._pixiSprite;
  }

  private _applyOrigin(frame: WzSprite): void {
    this._pixiSprite.anchor.set(
      frame.width > 0 ? frame.OriginX / frame.width : 0,
      frame.height > 0 ? frame.OriginY / frame.height : 0,
    );
  }
}
