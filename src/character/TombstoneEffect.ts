import { Container, Sprite } from 'pixi.js';
import type { WzPackage } from '../wz/WzPackage.js';
import { WzSound } from '../wz/WzSound.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import { WzAudioPlayer } from '../render/WzAudioPlayer.js';
import { AnimFrame, loadFrameSequence } from './WzFrameAnimation.js';

export class TombstoneEffect {
  readonly container = new Container();
  private _sprite: Sprite | null = null;

  private _effectWz: WzPackage | null;
  private _soundWz: WzPackage | null;
  private _loader: WzTextureLoader;
  private _audio: WzAudioPlayer | null;

  private _fallFrames: AnimFrame[] = [];
  private _landFrames: AnimFrame[] = [];
  private _burialSound: WzSound | null = null;

  private _world = { x: 0, y: 0 };
  private _frameIndex = 0;
  private _frameTimerMs = 0;
  private _fellDown = false;
  private _soundPlayed = false;

  Started = false;
  Landed = false;
  OnLanded: (() => void) | null = null;

  constructor(
    effectWz: WzPackage | null,
    soundWz: WzPackage | null,
    loader: WzTextureLoader,
    audio: WzAudioPlayer | null,
  ) {
    this._effectWz = effectWz;
    this._soundWz  = soundWz;
    this._loader   = loader;
    this._audio    = audio;
  }

  Spawn(foothold: { x: number; y: number }): void {
    if (this.Started) return;
    this.Started = true;
    this._world  = { ...foothold };
    this._fallFrames = this._loadFrames('fall');
    this._landFrames = this._loadFrames('land');
    const tombItem = this._soundWz?.GetItem('Game.img/Tombstone');
    this._burialSound = tombItem instanceof WzSound ? tombItem : null;
    this._frameIndex = 0;
    this._frameTimerMs = 0;
    this._fellDown = false;
    this._soundPlayed = false;
    if (this._fallFrames.length === 0 && this._landFrames.length === 0) {
      console.warn('TombstoneEffect: no frames at Effect.wz/Tomb.img — degrading to no-op visual.');
      this._land();
    }
  }

  Reset(): void {
    this.Started = false;
    this._fellDown = false;
    this._frameIndex = 0;
    this._frameTimerMs = 0;
  }

  Update(dt: number): void {
    if (!this.Started) { this.container.visible = false; return; }
    const ms = dt * 1000;

    if (!this._fellDown) {
      if (this._fallFrames.length === 0) {
        this._land();
        return;
      }
      this._frameTimerMs += ms;
      while (this._frameIndex < this._fallFrames.length - 1) {
        const d = this._fallFrames[this._frameIndex].delayMs;
        if (this._frameTimerMs < d) break;
        this._frameTimerMs -= d;
        this._frameIndex++;
      }
      if (this._frameIndex >= this._fallFrames.length - 1 &&
          this._frameTimerMs >= this._fallFrames[this._fallFrames.length - 1].delayMs) {
        this._land();
      }
    } else if (this._landFrames.length > 1) {
      this._frameTimerMs += ms;
      while (true) {
        const d = this._landFrames[this._frameIndex].delayMs;
        if (this._frameTimerMs < d) break;
        this._frameTimerMs -= d;
        this._frameIndex = (this._frameIndex + 1) % this._landFrames.length;
      }
    }
  }

  /** Rebuild the pixi display for the current frame. Call each frame after
      Update, with the live world->screen transform (the tombstone has a
      fixed world position, same as DamageNumber/EmotionBubble). */
  Draw(worldToScreen: (wx: number, wy: number) => { x: number; y: number }): void {
    if (!this.Started) { this.container.visible = false; return; }
    const frames = this._fellDown ? this._landFrames : this._fallFrames;
    if (frames.length === 0) { this.container.visible = false; return; }
    const f = frames[Math.min(this._frameIndex, frames.length - 1)];
    const screen = worldToScreen(this._world.x, this._world.y);
    if (!this._sprite) {
      this._sprite = new Sprite();
      this.container.addChild(this._sprite);
    }
    this._sprite.texture = f.sprite.Texture;
    this._sprite.anchor.set(
      f.sprite.Width > 0 ? f.sprite.OriginX / f.sprite.Width : 0,
      f.sprite.Height > 0 ? f.sprite.OriginY / f.sprite.Height : 0,
    );
    this._sprite.position.set(screen.x, screen.y);
    this.container.visible = true;
  }

  private _land(): void {
    this._fellDown = true;
    this.Landed = true;
    this._frameIndex = 0;
    this._frameTimerMs = 0;
    if (!this._soundPlayed) {
      this._soundPlayed = true;
      if (this._burialSound && this._audio) {
        this._audio.PlayEffect(this._burialSound.AudioBytes);
      }
    }
    this.OnLanded?.();
  }

  private _loadFrames(kind: string): AnimFrame[] {
    if (!this._effectWz) return [];
    const root = this._effectWz.GetItem(`Tomb.img/${kind}`);
    return loadFrameSequence(this._loader, root, 100, 500);
  }
}
