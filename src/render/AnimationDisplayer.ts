import { Container, Graphics } from 'pixi.js';
import type { WzPackage } from '../wz/WzPackage.js';
import { WzProperty } from '../wz/WzProperty.js';
import { WzCanvas } from '../wz/WzCanvas.js';
import type { WzSprite } from './WzSprite.js';
import type { WzTextureLoader } from './WzTextureLoader.js';

export interface OneTimeInfo {
  pos: { x: number; y: number };
  z: number;
  origin: { x: number; y: number };
  flipX: boolean;
  duration: number;
}

export interface RepeatInfo {
  pos: { x: number; y: number };
  z: number;
  origin: { x: number; y: number };
  alpha: number;
  duration: number;
}

export interface SquibInfo {
  pos: { x: number; y: number };
  z: number;
  color: { r: number; g: number; b: number };
  duration: number;
}

class ActiveEffect {
  container = new Container();
  elapsed = 0;
  duration = 0;
  repeats = 0;
  ended = false;
  constructor(readonly totalDuration: number) { this.duration = totalDuration; }
}

export class AnimationDisplayer {
  private _effects: ActiveEffect[] = [];
  private _effectWz: WzPackage | null;

  constructor(effectWz: WzPackage | null) {
    this._effectWz = effectWz;
  }

  get container(): Container {
    const root = new Container();
    for (const e of this._effects) root.addChild(e.container);
    return root;
  }

  Update(dt: number): void {
    for (let i = this._effects.length - 1; i >= 0; i--) {
      const e = this._effects[i];
      e.elapsed += dt;
      if (e.elapsed >= e.duration) {
        if (e.repeats > 0) {
          e.repeats--;
          e.elapsed = 0;
        } else {
          e.ended = true;
          e.container.removeFromParent();
          this._effects.splice(i, 1);
        }
      }
    }
  }

  EffectGeneral(info: OneTimeInfo, path: string, loader: WzTextureLoader): void {
    this._playOneTime(info, path, loader);
  }

  EffectSkillUse(info: OneTimeInfo, skillPath: string, loader: WzTextureLoader): void {
    const path = `SkillUse/${skillPath}`;
    this._playOneTime(info, path, loader);
  }

  EffectSkillPrepare(info: OneTimeInfo, skillPath: string, loader: WzTextureLoader): void {
    const path = `SkillPrepare/${skillPath}`;
    this._playOneTime(info, path, loader);
  }

  EffectMiss(info: OneTimeInfo, loader: WzTextureLoader): void {
    this._playOneTime(info, 'Miss', loader);
  }

  EffectGuard(info: OneTimeInfo, loader: WzTextureLoader): void {
    this._playOneTime(info, 'Guard', loader);
  }

  EffectTremble(info: OneTimeInfo): void {
    const e = new ActiveEffect(info.duration);
    // tremble is a camera shake, not a sprite
    this._effects.push(e);
  }

  EffectHP(type: number, pos: { x: number; y: number }, loader: WzTextureLoader): void {
    const path = type === 0 ? 'Damage/Fix' : type === 1 ? 'Damage/' : 'Damage/Miss';
    const sprite = this._loadLayer(path, loader);
    if (!sprite) return;
    const e = new ActiveEffect(1500);
    const g = new Graphics();
    g.rect(-15, -30, 30, 60).fill({ color: type === 1 ? 0xff0000 : 0xffff00, alpha: 0.8 });
    e.container.addChild(g);
    e.container.position.set(pos.x, pos.y);
    this._effects.push(e);
  }

  EffectSquib(info: SquibInfo, loader: WzTextureLoader): void {
    const e = new ActiveEffect(info.duration);
    const g = new Graphics();
    g.circle(0, 0, 8).fill({ color: (info.color.r << 16) | (info.color.g << 8) | info.color.b, alpha: 1 });
    e.container.addChild(g);
    e.container.position.set(info.pos.x, info.pos.y);
    this._effects.push(e);
  }

  EffectCatch(info: OneTimeInfo, loader: WzTextureLoader): void {
    this._playOneTime(info, 'Catch', loader);
  }

  EffectByItem(info: OneTimeInfo, itemId: number, loader: WzTextureLoader): void {
    this._playOneTime(info, `ByItem/${itemId}`, loader);
  }

  EffectQuest(info: OneTimeInfo, loader: WzTextureLoader): void {
    this._playOneTime(info, 'Quest', loader);
  }

  private _playOneTime(info: OneTimeInfo, path: string, loader: WzTextureLoader): void {
    const sprite = this._loadLayer(path, loader);
    const e = new ActiveEffect(info.duration);
    if (sprite) {
      const sp = sprite.NewSprite(info.flipX);
      sp.position.set(info.origin.x, info.origin.y);
      e.container.addChild(sp);
    }
    e.container.position.set(info.pos.x, info.pos.y);
    this._effects.push(e);
  }

  private _loadLayer(path: string, loader: WzTextureLoader): WzSprite | null {
    if (!this._effectWz) return null;
    const node = this._effectWz.GetItem(`${path}.img`);
    if (!(node instanceof WzProperty)) return null;
    const sub = node.Get('0');
    if (sub instanceof WzCanvas) return loader.Load(sub);
    if (sub instanceof WzProperty) {
      const canvas = sub.Get('0');
      if (canvas instanceof WzCanvas) return loader.Load(canvas);
    }
    return null;
  }

  Clear(): void {
    for (const e of this._effects) e.container.removeFromParent();
    this._effects = [];
  }

  get ActiveCount(): number { return this._effects.length; }
}
