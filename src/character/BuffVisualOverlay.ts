import { Container, Graphics, Sprite, BlurFilter } from 'pixi.js';
import type { CharLook } from './CharLook.js';

/**
 * OG buff visual effects on characters.
 * Each buff has a persistent visual that exists while the buff is active.
 * Uses PixiJS Graphics for procedural effects (stun stars, poison bubbles,
 * seal X, etc.) and alpha tinting for DarkSight.
 */

interface BuffVisual {
  key: string;
  container: Container;
  active: boolean;
}

export class BuffVisualOverlay {
  readonly container = new Container();
  private _buffs = new Map<string, BuffVisual>();
  private _timer = 0;

  constructor() {}

  Update(dt: number): void {
    this._timer += dt;
    // Animate active buff visuals
    for (const [key, buff] of this._buffs) {
      if (!buff.active) continue;
      this._animateBuff(key, buff, dt);
    }
  }

  /** Show/hide DarkSight visual — player becomes semi-transparent. */
  SetDarkSight(active: boolean, charLook: CharLook | null): void {
    this._setBuff('darkSight', active);
    if (charLook) {
      charLook.container.alpha = active ? 0.4 : 1.0;
    }
  }

  /** Show/hide Stun visual — spinning stars above head. */
  SetStun(active: boolean): void {
    if (active) {
      const existing = this._buffs.get('stun');
      if (existing?.active) return;
      const c = new Container();
      this._drawStunStars(c);
      this._buffs.set('stun', { key: 'stun', container: c, active: true });
      this.container.addChild(c);
    } else {
      this._removeBuff('stun');
    }
  }

  /** Show/hide Poison visual — green bubbles rising from character. */
  SetPoison(active: boolean): void {
    if (active) {
      const existing = this._buffs.get('poison');
      if (existing?.active) return;
      const c = new Container();
      this._buffs.set('poison', { key: 'poison', container: c, active: true });
      this.container.addChild(c);
    } else {
      this._removeBuff('poison');
    }
  }

  /** Show/hide Seal visual — X mark over character. */
  SetSeal(active: boolean): void {
    if (active) {
      const existing = this._buffs.get('seal');
      if (existing?.active) return;
      const c = new Container();
      this._drawSealX(c);
      this._buffs.set('seal', { key: 'seal', container: c, active: true });
      this.container.addChild(c);
    } else {
      this._removeBuff('seal');
    }
  }

  /** Show/hide HyperBody visual — character grows larger. */
  SetHyperBody(active: boolean, charLook: CharLook | null): void {
    this._setBuff('hyperBody', active);
    if (charLook) {
      charLook.container.scale.set(active ? 1.3 : 1.0);
    }
  }

  /** Show/hide ShadowPartner visual — shadow clone behind character. */
  SetShadowPartner(active: boolean): void {
    if (active) {
      const existing = this._buffs.get('shadowPartner');
      if (existing?.active) return;
      const c = new Container();
      this._drawShadowClone(c);
      this._buffs.set('shadowPartner', { key: 'shadowPartner', container: c, active: true });
      this.container.addChild(c);
    } else {
      this._removeBuff('shadowPartner');
    }
  }

  /** Show/hide Booster visual — weapon glow effect. */
  SetBooster(active: boolean): void {
    if (active) {
      const existing = this._buffs.get('booster');
      if (existing?.active) return;
      const c = new Container();
      this._drawWeaponGlow(c);
      this._buffs.set('booster', { key: 'booster', container: c, active: true });
      this.container.addChild(c);
    } else {
      this._removeBuff('booster');
    }
  }

  /** Position buff visuals relative to character. */
  SetPosition(x: number, y: number, facingLeft: boolean): void {
    this.container.position.set(x, y);
    // Mirror for facing
    this.container.scale.x = facingLeft ? 1 : -1;
  }

  private _setBuff(key: string, active: boolean): void {
    if (active) {
      if (!this._buffs.has(key)) {
        this._buffs.set(key, { key, container: new Container(), active: true });
        this.container.addChild(this._buffs.get(key)!.container);
      }
      this._buffs.get(key)!.active = true;
    } else {
      this._removeBuff(key);
    }
  }

  private _removeBuff(key: string): void {
    const buff = this._buffs.get(key);
    if (buff) {
      buff.container.removeFromParent();
      buff.container.destroy({ children: true });
      this._buffs.delete(key);
    }
  }

  private _animateBuff(key: string, buff: BuffVisual, dt: number): void {
    const t = this._timer;
    switch (key) {
      case 'stun':
        this._animateStunStars(buff.container, t);
        break;
      case 'poison':
        this._animatePoisonBubbles(buff.container, dt);
        break;
      case 'seal':
        this._animateSealX(buff.container, t);
        break;
      case 'shadowPartner':
        this._animateShadowClone(buff.container, t);
        break;
      case 'booster':
        this._animateWeaponGlow(buff.container, t);
        break;
    }
  }

  // ── Stun Stars ──

  private _drawStunStars(container: Container): void {
    // 3 stars orbiting above character head
    for (let i = 0; i < 3; i++) {
      const star = new Graphics();
      this._drawStar(star, 0, 0, 5, 6, 3, 0xFFFF00);
      star.y = -80;
      container.addChild(star);
    }
  }

  private _animateStunStars(container: Container, t: number): void {
    const children = container.children;
    for (let i = 0; i < children.length; i++) {
      const star = children[i];
      const angle = t * 3 + (i * Math.PI * 2) / children.length;
      star.x = Math.cos(angle) * 15;
      star.y = -80 + Math.sin(angle) * 5;
      star.rotation = t * 2;
    }
  }

  private _drawStar(g: Graphics, cx: number, cy: number, spikes: number, outerR: number, innerR: number, color: number): void {
    g.clear();
    g.moveTo(cx + outerR, cy);
    for (let i = 0; i < spikes; i++) {
      const outerAngle = (i * 2 * Math.PI) / spikes - Math.PI / 2;
      const innerAngle = outerAngle + Math.PI / spikes;
      g.lineTo(cx + Math.cos(outerAngle) * outerR, cy + Math.sin(outerAngle) * outerR);
      g.lineTo(cx + Math.cos(innerAngle) * innerR, cy + Math.sin(innerAngle) * innerR);
    }
    g.closePath();
    g.fill({ color, alpha: 0.9 });
  }

  // ── Poison Bubbles ──

  private _animatePoisonBubbles(container: Container, dt: number): void {
    // Spawn new bubbles periodically
    if (Math.random() < dt * 3 && container.children.length < 8) {
      const bubble = new Graphics();
      const r = 2 + Math.random() * 3;
      bubble.circle(0, 0, r).fill({ color: 0x00CC00, alpha: 0.7 });
      bubble.x = (Math.random() - 0.5) * 30;
      bubble.y = -20 - Math.random() * 40;
      container.addChild(bubble);
    }
    // Move existing bubbles upward and fade
    for (let i = container.children.length - 1; i >= 0; i--) {
      const b = container.children[i];
      b.y -= dt * 30;
      b.alpha -= dt * 0.5;
      if (b.alpha <= 0) {
        b.removeFromParent();
        b.destroy();
      }
    }
  }

  // ── Seal X ──

  private _drawSealX(container: Container): void {
    const x = new Graphics();
    x.moveTo(-10, -10).lineTo(10, 10).stroke({ color: 0xFF0000, width: 3, alpha: 0.9 });
    x.moveTo(10, -10).lineTo(-10, 10).stroke({ color: 0xFF0000, width: 3, alpha: 0.9 });
    x.y = -60;
    container.addChild(x);
  }

  private _animateSealX(container: Container, t: number): void {
    if (container.children.length > 0) {
      container.children[0].alpha = 0.7 + Math.sin(t * 4) * 0.3;
    }
  }

  // ── Shadow Clone ──

  private _drawShadowClone(container: Container): void {
    const clone = new Graphics();
    // Simplified shadow clone silhouette
    clone.rect(-12, -70, 24, 70).fill({ color: 0x000000, alpha: 0.3 });
    clone.rect(-8, -80, 16, 14).fill({ color: 0x000000, alpha: 0.3 });
    clone.x = 20;
    container.addChild(clone);
  }

  private _animateShadowClone(container: Container, t: number): void {
    if (container.children.length > 0) {
      const clone = container.children[0];
      clone.alpha = 0.2 + Math.sin(t * 2) * 0.1;
      clone.x = 20 + Math.sin(t * 1.5) * 3;
    }
  }

  // ── Weapon Glow (Booster) ──

  private _drawWeaponGlow(container: Container): void {
    const glow = new Graphics();
    glow.rect(-3, -40, 6, 30).fill({ color: 0x6699FF, alpha: 0.5 });
    glow.y = -10;
    container.addChild(glow);
  }

  private _animateWeaponGlow(container: Container, t: number): void {
    if (container.children.length > 0) {
      const glow = container.children[0];
      glow.alpha = 0.3 + Math.sin(t * 5) * 0.2;
    }
  }
}
