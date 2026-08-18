import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { WzSprite } from '../render/WzSprite.js';

export class DropSprite {
  readonly container = new Container();
  Position = { x: 0, y: 0 };
  Layer = 7;

  private static readonly Vy = 400;
  private static readonly FadeDur = 3.0; // FadingOut duration in seconds
  private _source: { x: number; y: number };
  private _ground: { x: number; y: number };
  private _tEnd: number;
  private _icon: WzSprite | null = null;
  // OG: CDropPool::MakeMoneyAnimation — meso bag spin frames (iconRaw/0..3)
  // + per-frame delays. When present and IsMoney, Update cycles the sprite.
  private _moneyFrames: (WzSprite | null)[] = [];
  private _moneyDelays: number[] = [];
  private _moneyFrame = 0;
  private _moneyTimer = 0;
  private _moneySprite: import('pixi.js').Sprite | null = null;
  private _state: number;
  private _tick = 0;
  private _angle = 0;
  private _absorbing = false;
  private _absorbFrom = { x: 0, y: 0 };
  private _absorbTarget: (() => { x: number; y: number }) | null = null;
  private _absorbT = 0;
  private _alpha = 1;
  private _explodeVel = { x: 0, y: 0 };
  // OG: CAnimationDisplayer::ABSORBITEM::Update (0x441650) — 700ms pickup
  // flight. X/Y lerp linearly from the drop position to the target body over
  // 700ms; a 40px arc peaks mid-flight (arc term = 11488774560*(v16-350)² >> 45);
  // alpha holds 255 until 420ms then fades 255 → 63 over the last 280ms.
  private static readonly AbsorbMs = 700;
  Finished = false;
  nameOf: (id: number) => string = () => '';

  constructor(
    public readonly DropId: number,
    public readonly IsMoney: boolean,
    public readonly ItemIdOrAmount: number,
    source: { x: number; y: number },
    ground: { x: number; y: number },
    animated: boolean,
    icon?: WzSprite | null,
    font?: unknown,
    fading = false,
    moneyFrames?: { frames: (WzSprite | null)[]; delays: number[] } | null,
  ) {
    this._ground = { x: ground.x, y: ground.y };
    this._source = animated ? { x: source.x, y: source.y } : { x: ground.x, y: ground.y };
    this._icon = icon ?? null;
    if (moneyFrames) {
      this._moneyFrames = moneyFrames.frames;
      this._moneyDelays = moneyFrames.delays;
      // Skip null frames when building the cycleable list.
      this._moneyFrames = moneyFrames.frames.filter((f): f is WzSprite => f !== null);
      this._moneyDelays = this._moneyFrames.length === moneyFrames.frames.length
        ? moneyFrames.delays
        : moneyFrames.frames.map((f, i) => (f !== null ? moneyFrames.delays[i] : -1)).filter((d) => d >= 0);
    }
    this._tEnd = this._parabolicDuration(this._source.y, this._ground.y);
    // state 1=parabolic fall, 2=fall after apex, 3=idle bob, 4=fading out
    this._state = fading ? 4 : (animated ? 1 : 3);
    this.Position = fading ? { x: ground.x, y: ground.y } : { x: this._source.x, y: this._source.y };
    this._rebuildDisplay();
  }

  StartAbsorb(target: () => { x: number; y: number }): void {
    this._absorbing = true;
    this._absorbFrom = { x: this.Position.x, y: this.Position.y };
    this._absorbTarget = target;
    this._absorbT = 0;
  }

  /** Meso explosion scatter: fly outward with random velocity + fade. */
  StartExplode(): void {
    this._state = 5; // exploding
    this._tick = 0;
    const angle = Math.random() * Math.PI * 2;
    const speed = 150 + Math.random() * 200;
    this._explodeVel = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed - 200 };
  }

  private _parabolicDuration(y1: number, y2: number): number {
    if (y1 <= y2) return 1000;
    const v6 = 30 * (Math.floor(Math.sqrt(1000 * (2 * (100 + y2 - y1)) / 800)) + 1) + 500;
    return Math.min(1000, v6);
  }

  Update(dt: number): void {
    if (this._absorbing) {
      this._absorbT += dt;
      // OG ABSORBITEM::Update: elapsed = v16 = tCur - tStarted (ms).
      const v16 = this._absorbT * 1000;
      if (v16 >= DropSprite.AbsorbMs) { this.Finished = true; return; }
      const tgt = this._absorbTarget ? this._absorbTarget() : this._absorbFrom;
      // X: (x2*v16 + x1.x*(700-v16))/700 — linear from drop → target.
      const x = (tgt.x * v16 + this._absorbFrom.x * (DropSprite.AbsorbMs - v16)) / DropSprite.AbsorbMs;
      // Y: (v10*v16 + x1.y*(700-v16))/700 + arc - 40. The arc term
      // 11488774560*(v16-350)² >> 45 is 40 at both ends and 0 mid-flight, so
      // the effective -40 lifts the drop up 40px at the halfway point.
      const d = v16 - 350;
      // arc = (11488774560 * d * d) >> 45 (OG fixed-point) → float division.
      const arc = (11488774560 * d * d) / 35184372088832;
      const y = (tgt.y * v16 + this._absorbFrom.y * (DropSprite.AbsorbMs - v16)) / DropSprite.AbsorbMs + arc - 40;
      this.Position = { x, y };
      // Alpha: 255 for the first 420ms, then 192*(420-v16)/280 + 255 → 63 at 700ms.
      let alpha = 255;
      if (v16 > 420) alpha = Math.floor((192 * (420 - v16)) / 280) + 255;
      this._alpha = Math.max(0, Math.min(1, alpha / 255));
      return;
    }

    const dtMs = dt * 1000;
    switch (this._state) {
      case 1: {
        this._tick += dtMs;
        const dx = this._ground.x - this._source.x;
        const t = this._tick / 1000;
        const xf = Math.min(1, this._tick / 500)
          + (this._tick > 500 ? Math.min(1, (this._tick - 500) / Math.max(1, this._tEnd - 500)) : 0);
        const x = this._source.x + xf * dx * 0.5;
        const y = this._source.y - DropSprite.Vy * t + 400 * t * t;
        this.Position = { x, y };
        if (this._tick >= this._tEnd) {
          if (this._source.y < this._ground.y) { this._state = 2; this._tick = 0; }
          else { this._state = 3; this._tick = 0; this.Position = { x: this._ground.x, y: this._ground.y }; }
        }
        break;
      }
      case 2: {
        this._tick += dtMs;
        const y = this._source.y + (this._tick / 1000) * DropSprite.Vy;
        if (y >= this._ground.y) { this._state = 3; this.Position = { x: this._ground.x, y: this._ground.y }; }
        else this.Position = { x: this._ground.x, y };
        break;
      }
      case 5: {
        // Explode scatter: apply velocity + gravity, fade out
        this._tick += dt;
        this._explodeVel.y += 600 * dt; // gravity
        this.Position = {
          x: this.Position.x + this._explodeVel.x * dt,
          y: this.Position.y + this._explodeVel.y * dt,
        };
        this._alpha = Math.max(0, 1 - this._tick / 0.6);
        if (this._alpha <= 0) { this.Finished = true; return; }
        break;
      }
      default: {
        // state 3 = idle bob, state 4 = fading out
        if (this._state === 4) {
          this._tick += dt;
          this._alpha = Math.max(0, 1 - this._tick / DropSprite.FadeDur);
          if (this._alpha <= 0) { this.Finished = true; return; }
        }
        this._angle += Math.PI * dt;
        this.Position = { x: this._ground.x, y: this._ground.y + Math.sin(this._angle) * 3 };
        break;
      }
    }

    // OG: CDropPool::MakeMoneyAnimation — the meso bag spins through its
    // iconRaw/0..3 canvases on a per-bucket delay loop (80ms small, 200ms
    // medium, [4000,120,120,120] big). Cycles only when resting on the ground
    // (absorb/explode/fade already early-return or change the display).
    if (this._moneyFrames.length > 1 && this._moneySprite) {
      this._moneyTimer += dtMs;
      const delay = this._moneyDelays[this._moneyFrame] ?? this._moneyDelays[0] ?? 80;
      if (this._moneyTimer >= delay) {
        this._moneyTimer = 0;
        this._moneyFrame = (this._moneyFrame + 1) % this._moneyFrames.length;
        const next = this._moneyFrames[this._moneyFrame];
        if (next && this._moneySprite.parent) {
          const newSprite = next.NewSprite();
          this._moneySprite.parent.addChildAt(newSprite, this._moneySprite.parent.getChildIndex(this._moneySprite));
          this._moneySprite.parent.removeChild(this._moneySprite);
          this._moneySprite = newSprite;
        }
      }
    }
  }

  draw(camX: number, camY: number, cx: number, cy: number): void {
    this.container.position.set(
      this.Position.x - camX + cx,
      this.Position.y - camY + cy,
    );
    this.container.alpha = this._alpha;
  }

  private _rebuildDisplay(): void {
    this.container.removeChildren();
    const iconW = 20;
    const iconH = 20;
    const gfx = new Graphics();
    if (this.IsMoney && (this._icon || this._moneyFrames.length > 0)) {
      // OG meso bag sprite (Item.wz/Special/0900.img/0900000X/iconRaw/N).
      // NewSprite() anchors by the canvas origin (e.g. (0,32) = ground/feet),
      // so placing it at (0,0) puts the coin at the drop point. With a spin
      // animation (MakeMoneyAnimation) the first frame is shown and swapped
      // in Update; the last trailing child is the empty Graphics placeholder.
      this._moneySprite = (this._moneyFrames.length > 0 ? this._moneyFrames[0] : this._icon)?.NewSprite() ?? null;
      if (this._moneySprite) this.container.addChild(this._moneySprite);
      this.container.addChild(gfx);
      return;
    }
    if (this.IsMoney) {
      const mesoColors = [
        { min: 1, color: 0xdcc864 },
        { min: 1000, color: 0xc8c8c8 },
        { min: 10000, color: 0xffd700 },
        { min: 100000, color: 0xff6464 },
      ];
      let coinColor = mesoColors[0].color;
      for (const mc of mesoColors) {
        if (this.ItemIdOrAmount >= mc.min) coinColor = mc.color;
      }
      gfx.rect(-iconW / 2, -iconH, iconW, iconH).fill({ color: coinColor });
    } else if (this._icon) {
      // Real WZ item icon loaded — draw it instead of the placeholder
      // rectangle. Previously this branch only suppressed the placeholder
      // and never actually added the icon sprite to the container, so any
      // drop with a real `_icon` rendered as a completely empty Graphics
      // (worse than the no-icon placeholder below).
      this.container.addChild(this._icon.NewSprite());
      const name = this.nameOf(this.ItemIdOrAmount);
      if (name) {
        const nameStyle = new TextStyle({ fontSize: 9, fill: 0xffffff, stroke: '#000000' });
        const nameText = new Text({ text: name, style: nameStyle });
        nameText.anchor.set(0.5, 0);
        nameText.y = -iconH - 2;
        this.container.addChild(nameText);
      }
    } else {
      const invType = Math.floor(this.ItemIdOrAmount / 1000000);
      const itemColor = (() => {
        switch (invType) {
          case 1: return 0x5078c8;
          case 2: return 0x50b450;
          case 3: return 0xa0783c;
          case 4: return 0x969696;
          case 5: return 0xc850c8;
          default: return 0x8c8c8c;
        }
      })();
      gfx.rect(-iconW / 2, -iconH, iconW, iconH).fill({ color: itemColor, alpha: 0.86 });
      const name = this.nameOf(this.ItemIdOrAmount);
      if (name) {
        const nameStyle = new TextStyle({ fontSize: 9, fill: 0xffffff, stroke: '#000000' });
        const nameText = new Text({ text: name, style: nameStyle });
        nameText.anchor.set(0.5, 0);
        nameText.y = -iconH - 2;
        this.container.addChild(nameText);
      }
    }
    this.container.addChild(gfx);
  }
}
