import { Container, Graphics, Text } from 'pixi.js';
import type { AvatarLook } from '../domain/AvatarLook.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import type { WzPackage } from '../wz/WzPackage.js';
import { CharLook } from './CharLook.js';
import { Stance } from './Stance.js';
import type { TempStatBuff } from '../net/handlers/PacketArgs.js';
import { SkillEffectOverlay } from './SkillEffectOverlay.js';
import * as Avatar from './Avatar.js';

/** OG CUser::DrawGauge — 52×10 HP gauge bar rendered above the character.
 *  Three nested border rectangles + red fill proportional to HP ratio. */
const GAUGE_W = 52;
const GAUGE_H = 10;
const GAUGE_FILL_MAX = 48; // inner fill width (52 - 2*2 border - 2*1 inner)
const GAUGE_FILL_Y = 3;
const GAUGE_FILL_H = 4;
const GAUGE_DARK_Y = 6;
const GAUGE_DARK_H = 1;
const COLOR_BORDER = 0x000000;
const COLOR_INNER = 0xFFFFFF;
const COLOR_FILL_BG = 0x000000;
const COLOR_RED = 0xFF0000;
const COLOR_DARK = 0xFF9F00; // dark red/maroon for bottom accent line

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

  // Remote character buff state
  private _tempStatMaskLo = 0n;
  private _tempStatMaskHi = 0n;
  private _tempStatBuffs: TempStatBuff[] = [];
  private _defenseAtt = 0;
  private _defenseState = 0;
  private _diceInfo: number[] = [];
  private _swallowBuffTime = 0;
  private _blessingArmorIncPAD = 0;

  // OG CUser fields — guild/medal/team
  private _guildName = '';
  private _guildMarkBg = 0;
  private _guildMarkBgColor = 0;
  private _guildMark = 0;
  private _guildMarkColor = 0;
  private _medalItemId = 0;
  private _teamName = '';

  // OG CUser::DrawGauge — HP ratio (0..1), -1 = hidden
  private _hpRatio = -1;

  // Buff repeat effect overlays (OG LoadSkillRepeatEffect)
  private _buffOverlays: SkillEffectOverlay | null = null;

  PortableChairItemId = 0;

  // Cached display objects
  private _nameText: Text | null = null;
  private _guildText: Text | null = null;
  private _medalText: Text | null = null;
  private _placeholderGfx: Graphics | null = null;
  private _badgeContainer: Container | null = null;
  private _adBoardBg: Graphics | null = null;
  private _adBoardLabel: Text | null = null;
  private _hpGaugeGfx: Graphics | null = null;
  // Dirty tracking
  private _lastHitFlash = -1;
  private _lastBadgeCount = -1;
  private _lastAdBoard = '';
  private _lastLevel = -1;
  private _lastName = '';
  private _lastGuildName = '';
  private _lastMedalId = -1;
  private _lastHpRatio = -2;
  private _lastTeamName = '';

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
    // OG: when hit, show "hit" face expression (emotionId=1) for ~1 second
    // The face should show pain expression during the hit animation
    this._charLook?.SetEmotion(1); // emotionId=1 = "hit" expression
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

  // ── Remote character temporary stat (buff) state ──

  SetTemporaryStats(
    maskLo: bigint, maskHi: bigint,
    buffs: TempStatBuff[],
    defenseAtt: number, defenseState: number,
    diceInfo: number[], swallowBuffTime: number, blessingArmorIncPAD: number,
  ): void {
    this._tempStatMaskLo = maskLo;
    this._tempStatMaskHi = maskHi;
    this._tempStatBuffs = buffs;
    this._defenseAtt = defenseAtt;
    this._defenseState = defenseState;
    this._diceInfo = diceInfo;
    this._swallowBuffTime = swallowBuffTime;
    this._blessingArmorIncPAD = blessingArmorIncPAD;
  }

  ClearTemporaryStats(maskLo: bigint, maskHi: bigint): void {
    // Clear only the bits that are set in the reset mask
    this._tempStatMaskLo &= ~maskLo;
    this._tempStatMaskHi &= ~maskHi;
    this._tempStatBuffs = this._tempStatBuffs.filter(b => {
      if (b.bit < 64) return (this._tempStatMaskLo & (1n << BigInt(b.bit))) !== 0n;
      return (this._tempStatMaskHi & (1n << BigInt(b.bit - 64))) !== 0n;
    });
  }

  get TempStatBuffs(): readonly TempStatBuff[] { return this._tempStatBuffs; }
  get TempStatMaskLo(): bigint { return this._tempStatMaskLo; }
  get TempStatMaskHi(): bigint { return this._tempStatMaskHi; }
  get DefenseAtt(): number { return this._defenseAtt; }
  get DefenseState(): number { return this._defenseState; }
  get DiceInfo(): readonly number[] { return this._diceInfo; }
  get SwallowBuffTime(): number { return this._swallowBuffTime; }
  get BlessingArmorIncPAD(): number { return this._blessingArmorIncPAD; }

  /** Look up a buff by bit position. Returns undefined if not set. */
  GetBuffByBit(bit: number): TempStatBuff | undefined {
    return this._tempStatBuffs.find(b => b.bit === bit);
  }

  // ── OG guild/medal/team name fields ──

  SetGuildInfo(name: string, markBg: number, markBgColor: number, mark: number, markColor: number): void {
    this._guildName = name;
    this._guildMarkBg = markBg;
    this._guildMarkBgColor = markBgColor;
    this._guildMark = mark;
    this._guildMarkColor = markColor;
  }

  SetMedalItemId(medalId: number): void {
    this._medalItemId = medalId;
  }

  SetTeamName(name: string): void {
    this._teamName = name;
  }

  /** OG CUser::DrawGauge — sets the HP ratio (0..1) for the HP gauge bar.
   *  Pass -1 to hide the gauge entirely. */
  SetHpRatio(curHp: number, maxHp: number): void {
    this._hpRatio = maxHp > 0 ? Math.max(0, Math.min(1, curHp / maxHp)) : 0;
  }

  HideHpGauge(): void {
    this._hpRatio = -1;
  }

  /** Returns a SkillEffectOverlay for persistent buff visuals (OG LoadSkillRepeatEffect).
   *  Lazy-created — only allocates when a buff effect is first needed. */
  GetBuffOverlay(): SkillEffectOverlay {
    if (this._buffOverlays === null) {
      this._buffOverlays = new SkillEffectOverlay(new WzTextureLoader());
    }
    return this._buffOverlays;
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
      || this.Level !== this._lastLevel
      || this.Name !== this._lastName
      || this._guildName !== this._lastGuildName
      || this._medalItemId !== this._lastMedalId
      || this._hpRatio !== this._lastHpRatio
      || this._teamName !== this._lastTeamName;

    if (changed) {
      this._lastHitFlash = this._hitFlash;
      this._lastBadgeCount = this._statusBadges.size;
      this._lastAdBoard = this._adBoardText;
      this._lastLevel = this.Level;
      this._lastName = this.Name;
      this._lastGuildName = this._guildName;
      this._lastMedalId = this._medalItemId;
      this._lastHpRatio = this._hpRatio;
      this._lastTeamName = this._teamName;
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

    // ── OG CUser::DrawGauge — HP gauge bar (52×10) above character ──
    if (this._hpRatio >= 0) {
      this._drawHpGauge();
    }

    // ── Name tags (OG CUser::DrawNameTags) ──
    // Tag 1: Character name (tagType 1000)
    const nameTagY = -78;
    const tag = `[${this.Level}] ${this.Name}`;
    if (!this._nameText) {
      this._nameText = new Text({ text: tag, style: { fontSize: 11, fill: 0xffe664, stroke: '#000000' } });
      this._nameText.anchor.set(0.5, 1);
      this._nameText.y = nameTagY;
    } else {
      this._nameText.text = tag;
    }
    this.container.addChild(this._nameText);

    // Tag 2: Guild name (tagType 1004) — below character name
    const displayGuild = this._teamName || this._guildName;
    if (displayGuild) {
      const guildTagY = nameTagY + 13;
      if (!this._guildText) {
        this._guildText = new Text({ text: displayGuild, style: { fontSize: 10, fill: 0xa0a0ff, stroke: '#000000' } });
        this._guildText.anchor.set(0.5, 1);
        this._guildText.y = guildTagY;
      } else {
        this._guildText.text = displayGuild;
      }
      this.container.addChild(this._guildText);
    }

    // Tag 3: Medal name (tagType 1006) — below guild name
    if (this._medalItemId > 0) {
      const medalTagY = nameTagY + (displayGuild ? 25 : 13);
      if (!this._medalText) {
        this._medalText = new Text({ text: `Medal[${this._medalItemId}]`, style: { fontSize: 10, fill: 0xffc94a, stroke: '#000000' } });
        this._medalText.anchor.set(0.5, 1);
        this._medalText.y = medalTagY;
      } else {
        this._medalText.text = `Medal[${this._medalItemId}]`;
      }
      this.container.addChild(this._medalText);
    }

    this._drawBadges();
    this._drawADBoard();
  }

  /** OG CUser::DrawGauge — renders the 52×10 HP gauge bar.
   *  3 nested border rectangles + red fill proportional to HP. */
  private _drawHpGauge(): void {
    if (!this._hpGaugeGfx) {
      this._hpGaugeGfx = new Graphics();
    }
    const g = this._hpGaugeGfx;
    g.clear();

    // Position gauge above the name tag area
    const gx = -(GAUGE_W / 2);
    const gy = -105;

    // Outer black border (0,0 → 52×10)
    g.rect(gx, gy, GAUGE_W, GAUGE_H).fill({ color: COLOR_BORDER });
    // White inner border (1,1 → 50×8)
    g.rect(gx + 1, gy + 1, GAUGE_W - 2, GAUGE_H - 2).fill({ color: COLOR_INNER });
    // Black fill background (2,2 → 48×6)
    g.rect(gx + 2, gy + 2, GAUGE_FILL_MAX, GAUGE_H - 4).fill({ color: COLOR_FILL_BG });
    // Red fill (3,3 → gaugePos×4)
    const fillW = Math.floor(GAUGE_FILL_MAX * this._hpRatio);
    if (fillW > 0) {
      g.rect(gx + 3, gy + GAUGE_FILL_Y, fillW, GAUGE_FILL_H).fill({ color: COLOR_RED });
      // Dark accent line at bottom of fill (3,6 → gaugePos×1)
      g.rect(gx + 3, gy + GAUGE_DARK_Y, fillW, GAUGE_DARK_H).fill({ color: COLOR_DARK });
    }

    this.container.addChild(this._hpGaugeGfx);
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
