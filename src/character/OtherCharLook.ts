import { Container, Graphics, Text } from 'pixi.js';
import type { AvatarLook } from '../domain/AvatarLook.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import type { WzPackage } from '../wz/WzPackage.js';
import { CharLook } from './CharLook.js';
import { Stance } from './Stance.js';

export class OtherCharLook {
  readonly container = new Container();
  Position = { x: 0, y: 0 };
  private _facingLeft = false;
  private _stance: Stance = Stance.Stand1;
  private _charLook: CharLook | null = null;
  private _loader: WzTextureLoader | null = null;
  private _charWz: WzPackage | null = null;
  private _itemWz: WzPackage | null = null;
  private _baseWz: WzPackage | null = null;
  private _hitFlash = 0;
  private _adBoardText = '';
  private _adBoardTimer = 0;
  private _statusBadges = new Map<string, { text: string; timer: number }>();

  PortableChairItemId = 0;

  // Cached display objects
  private _nameText: Text | null = null;
  private _placeholderGfx: Graphics | null = null;
  private _badgeContainer: Container | null = null;
  private _adBoardBg: Graphics | null = null;
  private _adBoardLabel: Text | null = null;
  // Dirty tracking
  private _lastHitFlash = -1;
  private _lastBadgeCount = -1;
  private _lastAdBoard = '';
  private _lastLevel = -1;

  constructor(
    public readonly CharId: number,
    public readonly Name: string,
    public readonly Level: number,
    public Look: AvatarLook | null,
  ) {
    if (Look) {
      this._charLook = new CharLook(Look.skin);
      // Twenty-fourth pass: CharLook.SetAvatar had exactly one real caller
      // anywhere in src/ before this fix (CharSelectStage.ts's char-select
      // preview) — this inner CharLook's own `_avatar` field stayed null
      // forever, so every other player on screen rendered only the generic
      // colored-rectangle placeholder (_rebuildDisplay's `_avatar === null`
      // branch) regardless of LoadSprites() below having real WZ data ready
      // to draw their actual skin/face/hair/equips. SetAvatar only needs the
      // AvatarLook data itself (no WZ access), so it's safe to call here in
      // the constructor rather than waiting for LoadSprites().
      this._charLook.SetAvatar(Look);
    }
  }

  LoadSprites(loader: WzTextureLoader, charWz: WzPackage | null, itemWz: WzPackage | null, baseWz: WzPackage | null): void {
    this._loader = loader;
    this._charWz = charWz;
    this._itemWz = itemWz;
    this._baseWz = baseWz;
    if (this._charLook === null) return;
    this._charLook.Load(charWz, itemWz, baseWz, loader);
  }

  SetPosition(x: number, y: number): void {
    this.Position = { x, y };
  }

  get FacingLeft(): boolean { return this._facingLeft; }
  SetFacing(facingLeft: boolean): void {
    this._facingLeft = facingLeft;
  }

  Attack(): void {
    this._charLook?.Attack();
  }

  PlayAttackCode(action: number): boolean {
    return this._charLook?.PlayAttackCode(action) ?? false;
  }

  PlayAttackAction(actionKey: string): void {
    this._charLook?.PlayAttackAction(actionKey);
  }

  OnHit(): void {
    // TODO_AUDIT.md Hundred-and-forty-sixth pass: remote UserHit now drives
    // an actual avatar one-shot instead of only a chat/toast line.
    this._hitFlash = 0.25;
    this._charLook?.PlayOneTimeAction('hit1');
  }

  SetADBoard(message: string): void {
    this._adBoardText = message;
    this._adBoardTimer = message ? 12 : 0;
  }

  SetStatusBadge(key: string, text: string, durationSec = 6): void {
    if (!text) this._statusBadges.delete(key);
    else this._statusBadges.set(key, { text, timer: durationSec });
  }

  ClearStatusBadge(key: string): void {
    this._statusBadges.delete(key);
  }

  SetEmotion(emotionId: number): void {
    this._charLook?.SetEmotion(emotionId);
  }

  SetChairHeight(itemId: number): void {
    this._charLook?.SetChairHeight(itemId);
  }

  UpdateAvatar(look: AvatarLook): void {
    // TODO_AUDIT.md Hundred-and-sixty-fourth pass follow-up: a remote user can
    // enter through the no-look fallback and receive UserAvatarModified later;
    // create the inner CharLook then instead of leaving the placeholder forever.
    this.Look = look;
    if (this._charLook === null) {
      this._charLook = new CharLook(look.skin);
      if (this._loader) this._charLook.Load(this._charWz, this._itemWz, this._baseWz, this._loader);
    }
    this._charLook.SetAvatar(look);
  }

  // The inner CharLook's own `Position` is never set (always {0,0} — see
  // the `_rebuildDisplay` comment below), so its anchor getters already
  // return the local offset unmodified; add this wrapper's own world
  // Position on top, same as `Draw()` does for the container itself.
  private _anchor(local: { x: number; y: number } | undefined): { x: number; y: number } {
    return { x: this.Position.x + (local?.x ?? 0), y: this.Position.y + (local?.y ?? 0) };
  }
  get NavelPosition(): { x: number; y: number } { return this._anchor(this._charLook?.NavelPosition); }
  get HeadPosition(): { x: number; y: number } { return this._anchor(this._charLook?.HeadPosition); }
  get BrowPosition(): { x: number; y: number } { return this._anchor(this._charLook?.BrowPosition); }
  get MuzzlePosition(): { x: number; y: number } { return this._anchor(this._charLook?.MuzzlePosition); }

  SetStance(stance: Stance): void {
    this._stance = stance;
  }

  /** World-space hit test against the fixed 30x78 body box (matches placeholder/avatar footprint). */
  HitTest(worldX: number, worldY: number): boolean {
    const dx = worldX - this.Position.x;
    const dy = worldY - this.Position.y;
    return dx >= -15 && dx < 15 && dy >= -78 && dy < 0;
  }

  Update(dt: number): void {
    if (this._hitFlash > 0) this._hitFlash = Math.max(0, this._hitFlash - dt);
    if (this._adBoardTimer > 0) {
      this._adBoardTimer = Math.max(0, this._adBoardTimer - dt);
      if (this._adBoardTimer === 0) this._adBoardText = '';
    }
    for (const [key, badge] of this._statusBadges) {
      badge.timer -= dt;
      if (badge.timer <= 0) this._statusBadges.delete(key);
    }
    this._charLook?.UpdateFromPhysics(dt, this._stance, this._facingLeft);
  }

  Draw(camX: number, camY: number, cx: number, cy: number): void {
    // Only rebuild when something visual changed
    const changed = this._hitFlash !== this._lastHitFlash
      || this._statusBadges.size !== this._lastBadgeCount
      || this._adBoardText !== this._lastAdBoard
      || this.Level !== this._lastLevel;

    if (changed) {
      this._lastHitFlash = this._hitFlash;
      this._lastBadgeCount = this._statusBadges.size;
      this._lastAdBoard = this._adBoardText;
      this._lastLevel = this.Level;
      this._rebuildDisplay();
    }

    this.container.position.set(
      this.Position.x - camX + cx,
      this.Position.y - camY + cy,
    );
  }

  private _rebuildDisplay(): void {
    this.container.removeChildren();

    if (this._charLook) {
      this._charLook.RebuildDisplay();
      this._charLook.container.alpha = this._hitFlash > 0 ? 0.55 : 1;
      this.container.addChild(this._charLook.container);
    } else {
      if (!this._placeholderGfx) {
        this._placeholderGfx = new Graphics();
        this._placeholderGfx.rect(-15, -60, 30, 60).fill({ color: 0x3c3c64, alpha: 0.78 });
        this._placeholderGfx.rect(-12, -78, 24, 18).fill({ color: 0xdcb48c, alpha: 0.78 });
      }
      this.container.addChild(this._placeholderGfx);
    }

    const tag = `[${this.Level}] ${this.Name}`;
    if (!this._nameText) {
      this._nameText = new Text({ text: tag, style: { fontSize: 11, fill: 0xffe664, stroke: '#000000' } });
      this._nameText.anchor.set(0.5, 1);
      this._nameText.y = -78;
    } else {
      this._nameText.text = tag;
    }
    this.container.addChild(this._nameText);

    this._drawBadges();
    this._drawADBoard();
  }

  private _drawBadges(): void {
    let x = -((this._statusBadges.size - 1) * 18) / 2;
    for (const badge of this._statusBadges.values()) {
      const bg = new Graphics();
      bg.roundRect(x - 7, -104, 14, 14, 3).fill({ color: 0x1e2440, alpha: 0.85 });
      bg.roundRect(x - 7, -104, 14, 14, 3).stroke({ color: 0x7cc8ff, width: 1, alpha: 0.9 });
      const label = new Text({ text: badge.text, style: { fontSize: 9, fill: 0x7cc8ff, stroke: '#000000' } });
      label.anchor.set(0.5, 0.5);
      label.position.set(x, -97);
      this.container.addChild(bg, label);
      x += 18;
    }
  }

  private _drawADBoard(): void {
    if (!this._adBoardText) return;
    const w = Math.min(180, Math.max(80, this._adBoardText.length * 7 + 14));
    const bg = new Graphics();
    bg.roundRect(-w / 2, -132, w, 24, 4).fill({ color: 0x2a2114, alpha: 0.9 });
    bg.roundRect(-w / 2, -132, w, 24, 4).stroke({ color: 0xffc94a, width: 1, alpha: 0.95 });
    const label = new Text({ text: this._adBoardText, style: { fontSize: 11, fill: 0xfff2a8, stroke: '#000000' } });
    label.anchor.set(0.5, 0.5);
    label.position.set(0, -120);
    this.container.addChild(bg, label);
  }
}
