import { Container, Sprite, Graphics, Text, TextStyle } from 'pixi.js';
import { WzSprite } from '../render/WzSprite.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import { WzCanvas } from '../wz/WzCanvas.js';
import { WzProperty } from '../wz/WzProperty.js';
import type { WzPackage } from '../wz/WzPackage.js';
import { WzImage } from '../wz/WzImage.js';

enum MobState {
  Stand, Move, Attack, Hit, Die,
  Prone, Ladder, Rope,
  Fly, Jump, Fall,
  Chase, Miss, Say, Eye, No, Regen, Bomb,
  Attack2, Attack3, Attack4, Attack5, Attack6, Attack7, Attack8, AttackF,
  Skill1, Skill2, Skill3, Skill4, Skill5, Skill6, Skill7, Skill8,
  Skill9, Skill10, Skill11, Skill12, Skill13, Skill14, Skill15, Skill16,
  Hit2, Hit3, HitF,
  Die2, Die3, DieF,
}

const StateNames: Record<number, string> = {
  [MobState.Stand]: 'stand',
  [MobState.Move]: 'move',
  [MobState.Attack]: 'attack1',
  [MobState.Attack2]: 'attack2',
  [MobState.Attack3]: 'attack3',
  [MobState.Attack4]: 'attack4',
  [MobState.Attack5]: 'attack5',
  [MobState.Attack6]: 'attack6',
  [MobState.Attack7]: 'attack7',
  [MobState.Attack8]: 'attack8',
  [MobState.AttackF]: 'attackF',
  [MobState.Hit]: 'hit1',
  [MobState.Hit2]: 'hit2',
  [MobState.Hit3]: 'hit3',
  [MobState.HitF]: 'hitF',
  [MobState.Die]: 'die1',
  [MobState.Die2]: 'die2',
  [MobState.Die3]: 'die3',
  [MobState.DieF]: 'dieF',
  [MobState.Prone]: 'prone',
  [MobState.Ladder]: 'ladder',
  [MobState.Rope]: 'rope',
  [MobState.Fly]: 'fly',
  [MobState.Jump]: 'jump',
  [MobState.Fall]: 'fall',
  [MobState.Chase]: 'chase',
  [MobState.Miss]: 'miss',
  [MobState.Say]: 'say',
  [MobState.Eye]: 'eye',
  [MobState.No]: 'no',
  [MobState.Regen]: 'regen',
  [MobState.Bomb]: 'bomb',
  [MobState.Skill1]: 'skill1',  [MobState.Skill2]: 'skill2',
  [MobState.Skill3]: 'skill3',  [MobState.Skill4]: 'skill4',
  [MobState.Skill5]: 'skill5',  [MobState.Skill6]: 'skill6',
  [MobState.Skill7]: 'skill7',  [MobState.Skill8]: 'skill8',
  [MobState.Skill9]: 'skill9',  [MobState.Skill10]: 'skill10',
  [MobState.Skill11]: 'skill11', [MobState.Skill12]: 'skill12',
  [MobState.Skill13]: 'skill13', [MobState.Skill14]: 'skill14',
  [MobState.Skill15]: 'skill15', [MobState.Skill16]: 'skill16',
};

export class MobLook {
  private _anims = new Map<MobState, { sprite: WzSprite; delayMs: number }[]>();
  private _curState: MobState = MobState.Stand;
  private _frame = 0;
  private _frameTimer = 0;
  private _facingLeft = false;
  private _dead = false;
  private _loaded = false;
  get Loaded(): boolean { return this._loaded; }
  private _hitFlash = 0;
  private _speechText = '';
  private _speechTimer = 0;
  private _statusBadges = new Map<string, { text: string; timer: number }>();

  readonly container = new Container();
  Position = { x: 0, y: 0 };
  Hp = -1;
  MaxHp = -1;
  nameOf: (id: number) => string = () => '';

  // Cached display objects — created once, reused across frames
  private _bodySprite: Sprite | null = null;
  private _placeholderGfx: Graphics | null = null;
  private _hpBarGfx: Graphics | null = null;
  private _nameText: Text | null = null;
  private _speechBg: Graphics | null = null;
  private _speechLabel: Text | null = null;
  private _badgeContainer: Container | null = null;
  // Dirty tracking — only rebuild when something visual changed
  private _lastState: MobState = -1 as MobState;
  private _lastFrame = -1;
  private _lastFacing = false;
  private _lastHitFlash = -1;
  private _lastBadgeCount = -1;
  private _lastSpeech = '';
  private _lastHp = -2;
  private _lastMaxHp = -2;

  constructor(
    public readonly MobId: number,
    public readonly TemplateId: number,
  ) {}

  get IsDead(): boolean { return this._dead; }

  get HeadPosition(): { x: number; y: number } {
    const sprite = this._currentFrameSprite();
    if (!sprite) return { x: this.Position.x, y: this.Position.y - 50 };

    const left = sprite.Lt?.x ?? -sprite.OriginX;
    const right = sprite.Rb?.x ?? (sprite.Width - sprite.OriginX);
    const top = sprite.Lt?.y ?? -sprite.OriginY;
    const localX = (left + right) / 2;
    return { x: this.Position.x + (this._facingLeft ? -localX : localX), y: this.Position.y + top };
  }

  Load(loader: WzTextureLoader, mobWz: WzPackage | null): void {
    if (mobWz === null) return;

    const strid = `${this.TemplateId.toString().padStart(7, '0')}.img`;
    const img = mobWz.GetItem(strid);
    const root = img instanceof WzImage ? img.Root : null;
    if (!root) return;

    for (let st = MobState.Stand; st <= MobState.DieF; st++) {
      const name = StateNames[st];
      if (!name) continue;
      const stateNode = root.Get(name);
      if (!(stateNode instanceof WzProperty)) continue;

      const frames: { sprite: WzSprite; delayMs: number }[] = [];
      let fi = 0;
      while (true) {
        const raw = stateNode.Get(`${fi}`);
        if (raw === null) break;
        let delay: number;
        let sprite: WzSprite | null = null;

        if (raw instanceof WzCanvas) {
          delay = 120;
          sprite = loader.Load(raw);
        } else if (raw instanceof WzProperty) {
          delay = this._readDelay(raw);
          sprite = this._loadFrame(loader, raw);
        } else break;

        if (sprite) frames.push({ sprite, delayMs: delay });
        fi++;
      }
      if (frames.length > 0) this._anims.set(st as MobState, frames);
    }

    this._loaded = this._anims.size > 0;
  }

  SetState(state: MobState): void {
    if (state === this._curState) return;
    this._curState = state;
    this._frame = 0;
    this._frameTimer = 0;
  }

  OnHit(): void {
    this._hitFlash = 0.15;
    const hitStates = [MobState.Hit, MobState.Hit2, MobState.Hit3, MobState.HitF]
      .filter(s => this._anims.has(s));
    const st = hitStates.length > 0
      ? hitStates[Math.floor(Math.random() * hitStates.length)]
      : MobState.Hit;
    this.SetState(st);
  }

  Say(text: string, durationSec = 4): void {
    if (!text) return;
    this._speechText = text;
    this._speechTimer = durationSec;
  }

  SetStatusBadge(key: string, text: string, durationSec = 6): void {
    if (!text) this._statusBadges.delete(key);
    else this._statusBadges.set(key, { text, timer: durationSec });
  }

  ClearStatusBadge(key: string): void {
    this._statusBadges.delete(key);
  }

  OnDie(): void {
    this._dead = true;
    this.SetState(MobState.Die);
  }

  SetFacing(facingLeft: boolean): void {
    this._facingLeft = facingLeft;
  }

  Update(dt: number): void {
    if (this._hitFlash > 0) this._hitFlash = Math.max(0, this._hitFlash - dt);
    if (this._speechTimer > 0) {
      this._speechTimer -= dt;
      if (this._speechTimer <= 0) this._speechText = '';
    }
    for (const [key, badge] of this._statusBadges) {
      badge.timer -= dt;
      if (badge.timer <= 0) this._statusBadges.delete(key);
    }

    const frames = this._anims.get(this._curState);
    if (!frames || frames.length === 0) return;

    let delayMs = frames[this._frame].delayMs;
    if (delayMs <= 0) delayMs = 150;
    this._frameTimer += dt * 1000;
    if (this._frameTimer >= delayMs) {
      this._frameTimer -= delayMs;
      this._frame++;
      if (this._frame >= frames.length) {
        if (this._curState === MobState.Die) { this._dead = true; return; }
        if (this._curState === MobState.Hit || this._curState === MobState.Hit2
            || this._curState === MobState.Hit3 || this._curState === MobState.HitF)
          this.SetState(MobState.Stand);
        else this._frame = 0;
      }
    }

    this._updateDisplay();
  }

  private _updateDisplay(): void {
    // Check if anything visual changed
    const changed = this._curState !== this._lastState
      || this._frame !== this._lastFrame
      || this._facingLeft !== this._lastFacing
      || this._hitFlash !== this._lastHitFlash
      || this._statusBadges.size !== this._lastBadgeCount
      || this._speechText !== this._lastSpeech
      || this.Hp !== this._lastHp
      || this.MaxHp !== this._lastMaxHp;

    if (!changed) return;

    this._lastState = this._curState;
    this._lastFrame = this._frame;
    this._lastFacing = this._facingLeft;
    this._lastHitFlash = this._hitFlash;
    this._lastBadgeCount = this._statusBadges.size;
    this._lastSpeech = this._speechText;
    this._lastHp = this.Hp;
    this._lastMaxHp = this.MaxHp;

    this._rebuildDisplay();
  }

  private _rebuildDisplay(): void {
    this.container.removeChildren();

    const frames = this._anims.get(this._curState);
    const flip = this._facingLeft;

    if (this._loaded && frames && frames.length > 0) {
      const { sprite } = frames[Math.min(this._frame, frames.length - 1)];
      if (!this._bodySprite) {
        this._bodySprite = new Sprite(sprite.Texture);
        this._bodySprite.anchor.set(
          sprite.Width > 0 ? sprite.OriginX / sprite.Width : 0,
          sprite.Height > 0 ? sprite.OriginY / sprite.Height : 0,
        );
      } else {
        this._bodySprite.texture = sprite.Texture;
      }
      this._bodySprite.scale.x = flip ? -1 : 1;
      this._bodySprite.tint = this._hitFlash > 0 ? 0xff6464 : 0xffffff;
      this.container.addChild(this._bodySprite);
    } else {
      if (!this._placeholderGfx) {
        const hue = Math.floor(this.TemplateId / 100) % 6;
        const colors = [0xb43c3c, 0x3cb43c, 0x3c3cb4, 0xb48c28, 0x8c28b4, 0x28a0b4];
        this._placeholderGfx = new Graphics();
        this._placeholderGfx.rect(-20, -50, 40, 50).fill({ color: colors[hue], alpha: 0.78 });
      }
      this.container.addChild(this._placeholderGfx);
    }

    this._drawHpBar();
    this._addNameTag();
    this._drawBadges();
    this._drawSpeechBubble();
  }

  private _drawBadges(): void {
    if (this._statusBadges.size === 0) return;
    if (!this._badgeContainer) this._badgeContainer = new Container();
    this._badgeContainer.removeChildren();

    let x = -((this._statusBadges.size - 1) * 18) / 2;
    for (const badge of this._statusBadges.values()) {
      const bg = new Graphics();
      bg.roundRect(x - 7, -86, 14, 14, 3).fill({ color: 0x281b31, alpha: 0.85 });
      bg.roundRect(x - 7, -86, 14, 14, 3).stroke({ color: 0xd784ff, width: 1, alpha: 0.9 });
      const label = new Text({ text: badge.text, style: { fontSize: 9, fill: 0xd784ff, stroke: { color: '#000000' } } });
      label.anchor.set(0.5, 0.5);
      label.position.set(x, -79);
      this._badgeContainer.addChild(bg, label);
      x += 18;
    }
    this.container.addChild(this._badgeContainer);
  }

  private _addNameTag(): void {
    const name = this.nameOf(this.TemplateId);
    if (!name) return;
    if (!this._nameText) {
      this._nameText = new Text({ text: name, style: { fontSize: 11, fill: 0xffffff, stroke: { color: '#000000' } } });
      this._nameText.anchor.set(0.5, 1);
      this._nameText.y = -70 - 18;
    } else {
      this._nameText.text = name;
    }
    this.container.addChild(this._nameText);
  }

  private _drawSpeechBubble(): void {
    if (!this._speechText) return;

    const bubbleW = 140;
    const pad = 6;
    if (!this._speechLabel) {
      const textStyle = new TextStyle({ fontSize: 11, fill: '#ffffff', wordWrap: true, wordWrapWidth: bubbleW - pad * 2 });
      this._speechLabel = new Text({ text: this._speechText, style: textStyle });
      this._speechLabel.anchor.set(0.5, 0);
    } else {
      this._speechLabel.text = this._speechText;
    }
    const boxH = Math.max(this._speechLabel.height + pad * 2, 24);
    const boxY = -70 - 18 - boxH;

    if (!this._speechBg) this._speechBg = new Graphics();
    this._speechBg.clear();
    this._speechBg.roundRect(-bubbleW / 2, boxY, bubbleW, boxH, 4).fill({ color: 0x000000, alpha: 0.75 });
    this._speechBg.roundRect(-bubbleW / 2, boxY + boxH - 4, 10, 8, 2).fill({ color: 0x000000, alpha: 0.75 });

    this._speechLabel.y = boxY + pad;

    this.container.addChild(this._speechBg, this._speechLabel);
  }

  private _drawHpBar(): void {
    if (this.Hp < 0 || this.MaxHp <= 0) return;
    const barW = 42;
    const barH = 5;
    const pct = Math.max(0, Math.min(1, this.Hp / this.MaxHp));
    const barColor = pct > 0.5 ? 0x50c850 : pct > 0.25 ? 0xdcb428 : 0xdc3c3c;

    if (!this._hpBarGfx) this._hpBarGfx = new Graphics();
    this._hpBarGfx.clear();
    this._hpBarGfx.rect(-barW / 2, -58, barW, barH).fill({ color: 0x000000, alpha: 0.63 });
    if (pct > 0) {
      this._hpBarGfx.rect(-barW / 2, -58, barW * pct, barH).fill({ color: barColor });
    }
    this.container.addChild(this._hpBarGfx);
  }

  private _loadFrame(loader: WzTextureLoader, frameNode: WzProperty): WzSprite | null {
    for (const [, v] of Object.entries(frameNode.Items)) {
      if (v instanceof WzCanvas) return loader.Load(v);
    }
    return null;
  }

  private _currentFrameSprite(): WzSprite | null {
    const frames = this._anims.get(this._curState);
    if (!frames || frames.length === 0) return null;
    return frames[Math.min(this._frame, frames.length - 1)].sprite;
  }

  private _readDelay(node: WzProperty): number {
    const v = node.Get('delay');
    if (typeof v === 'number') return v;
    if (typeof v === 'bigint') return Number(v);
    return 150;
  }
}
