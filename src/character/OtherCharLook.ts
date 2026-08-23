import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import type { AvatarLook } from '../domain/AvatarLook.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import type { WzPackage } from '../wz/WzPackage.js';
import { WzProperty } from '../wz/WzProperty.js';
import { WzCanvas } from '../wz/WzCanvas.js';
import { WzSprite } from '../render/WzSprite.js';
import { CharLook } from './CharLook.js';
import { Stance } from './Stance.js';
import type { TempStatBuff } from '../net/handlers/PacketArgs.js';
import { SkillEffectOverlay } from './SkillEffectOverlay.js';
import { MovePath } from '../map/VecCtrl.js';
import type { DecodedMovePath } from '../net/packet/MovePathDecoder.js';
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
  private _movePath = new MovePath();
  private _movePathElapsed = 0;
  private _movePathActive = false;
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
  private _nameTagPlate: Sprite | null = null;
  private _nameTagSprite: Sprite | null = null;
  private _guildText: Text | null = null;
  private _medalText: Text | null = null;
  /** NameTag.img 3-piece plates keyed by tagType/100 (10=name, 14=guild, 16=medal). */
  private _nameTagWce = new Map<number, { w: WzSprite | null; c: WzSprite | null; e: WzSprite | null; clr: number }>();
  /** Guild mark canvases cached per (bgId,color)/(markId,color). */
  private _guildMarkCache = new Map<string, WzSprite | null>();
  /** Rebuilt-every-draw name plate group (name tag only). */
  private _nameTagGroup: Container | null = null;
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

  /** Resolves a medal item id to its display name (OG CUser::DrawNameTags →
      CItemInfo::GetItemName for the type-1006 medal tag). */
  itemNameOf: ((id: number) => string) | null = null;

  LoadSprites(loader: WzTextureLoader, charWz: WzPackage | null, itemWz: WzPackage | null, baseWz: WzPackage | null): void {
    this._loader = loader;
    this._charWz = charWz;
    this._itemWz = itemWz;
    this._baseWz = baseWz;
    if (this._charLook === null) return;
    this._charLook.Load(charWz, itemWz, baseWz, loader);

    // OG: Name tag plate from UIWindow2.img/UtilDlgEx/bar (109x19)
    // Composed into a 121x23 plate with bar at (6,3), text centered at y=5 from top
    if (baseWz) {
      const utilDlgEx = baseWz.GetItem('UIWindow2.img/UtilDlgEx');
      if (utilDlgEx instanceof WzProperty) {
        const barNode = utilDlgEx.Get('bar');
        if (barNode instanceof WzCanvas) {
          const wzSprite = loader.Load(barNode);
          if (wzSprite) {
            this._nameTagPlate = wzSprite.ToPixi();
          }
        }
      }
    }

    // OG CLife::MakeNameTag — authentic 3-piece plates from UI/NameTag.img,
    // keyed by tagType/100: 10 = character name (1000), 14 = guild (1004),
    // 16 = medal (1006). Each piece carries its own origin; `clr` is the
    // text color.
    if (baseWz) {
      const nameTagRoot = baseWz.GetItem('NameTag.img');
      if (nameTagRoot instanceof WzProperty) {
        for (const key of [10, 14, 16]) {
          const node = nameTagRoot.Get(String(key));
          if (!(node instanceof WzProperty)) continue;
          const pieces: Array<WzSprite | null> = [];
          let clr = -1;
          const clrNode = node.Get('clr');
          if (typeof clrNode === 'number') clr = clrNode;
          else if (typeof clrNode === 'bigint') clr = Number(clrNode);
          for (const p of ['w', 'c', 'e']) {
            const c = node.Get(p);
            pieces.push(c instanceof WzCanvas ? loader.Load(c) : null);
          }
          this._nameTagWce.set(key, { w: pieces[0], c: pieces[1], e: pieces[2], clr });
        }
      }
    }
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

  // Legacy dead flag. OG CUserRemote has NO death visual: OnReceiveHP
  // (0x953F50) only updates the party HP gauge, and CUser::OnSetDead's
  // tomb flow is reached solely from CUserLocal::OnSetDead. Nothing in the
  // v95 client sets this on a remote character anymore.
  private _isDead = false;
  get IsDead(): boolean { return this._isDead; }

  /** Play a one-shot body action. */
  PlayOneTimeAction(actionKey: string): void {
    if (actionKey === 'dead') this._isDead = true;
    this._charLook?.PlayOneTimeAction(actionKey);
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

  SetMovePath(path: DecodedMovePath): void {
    this._movePath.OriginX = path.originX;
    this._movePath.OriginY = path.originY;
    this._movePath.OriginVx = path.originVx;
    this._movePath.OriginVy = path.originVy;
    this._movePath.Elements = path.elements;
    this._movePathElapsed = 0;
    this._movePathActive = path.elements.length > 0;
  }

  /** World-space hit test against the fixed 30x78 body box (matches placeholder/avatar footprint). */
  HitTest(worldX: number, worldY: number): boolean {
    const dx = worldX - this.Position.x;
    const dy = worldY - this.Position.y;
    return dx >= -15 && dx < 15 && dy >= -78 && dy < 0;
  }

  Update(dt: number): void {
    if (this._movePathActive) {
      this._movePathElapsed += dt * 1000;
      const next = this._movePath.CalcPassivePos(
        this.Position.x, this.Position.y, 0, 0, 0, this._movePathElapsed,
      );
      this.Position = { x: next.x, y: next.y };
      if (this._movePathElapsed >= this._movePath.Elements.reduce((sum, e) => sum + Math.max(e.elapse, 1), 0)) {
        this._movePathActive = false;
      }
    }
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

    // ── Name tags (OG CUser::DrawNameTags → CLife::MakeNameTag) ──
    // Three tags stacked below the feet: name (1000), guild (1004, with
    // guild mark), medal (1006). Plates are the NameTag.img 3-piece
    // (w/c/e) sets; text color comes from each set's `clr` node.
    const nameTagY = 10;
    this._drawWcePlate(10, this.Name ?? '', nameTagY);

    // Tag 2: Guild name (tagType 1004) — below character name; OG draws the
    // guild mark on the plate when the character has one.
    const displayGuild = this._teamName || this._guildName;
    if (displayGuild) {
      const guildTagY = nameTagY + 13;
      const markSprites = this._loadGuildMarkSprites();
      this._drawWcePlate(14, displayGuild, guildTagY, markSprites);
    }

    // Tag 3: Medal name (tagType 1006) — below guild name; OG uses the real
    // medal item name (CItemInfo::GetItemName), not the raw id.
    if (this._medalItemId > 0) {
      const medalTagY = nameTagY + (displayGuild ? 25 : 13);
      const medalName = this.itemNameOf?.(this._medalItemId) || `Medal[${this._medalItemId}]`;
      this._drawWcePlate(16, medalName, medalTagY);
    }

    this._drawBadges();
    this._drawADBoard();
  }

  /** Builds a NameTag.img w/c/e plate with centered text at (0, y). The
      middle piece stretches to fit the text. Returns the consumed width. */
  private _drawWcePlate(typeKey: number, text: string, y: number, mark?: { bg: Sprite | null; markImg: Sprite | null }): void {
    const set = this._nameTagWce.get(typeKey);
    if (!set?.w || !set.c || !set.e) {
      // Fallback: plain yellow text (old behavior) when WZ pieces missing.
      let t = this._guildText;
      if (typeKey === 10) t = this._nameText;
      if (!t) {
        t = new Text({ text, style: { fontSize: 11, fill: 0xffe664, stroke: '#000000' } });
        t.anchor.set(0.5, 1);
        t.y = y;
        if (typeKey === 10) this._nameText = t;
        else this._guildText = t;
      } else {
        t.text = text;
        t.y = y;
      }
      this.container.addChild(t);
      return;
    }

    const measure = new Text({ text, style: { fontSize: 11, fontFamily: 'Arial' } });
    const textW = measure.width;
    const innerW = Math.max(set.c.Width, Math.ceil(textW) + (mark ? 20 : 8));
    const totalW = set.w.Width + innerW + set.e.Height * 0 + set.e.Width;

    const clr = (set.clr >>> 0) & 0xFFFFFF;
    const style = { fontSize: 11, fill: clr === 0xFFFFFF ? 0xFFFFFF : (clr), fontFamily: 'Arial' };
    let t: Text;
    if (typeKey === 10 && this._nameText) {
      t = this._nameText;
      t.text = text;
      (t as any).style = style;
    } else {
      t = new Text({ text, style });
    }
    t.anchor.set(0, 0);
    t.scale.x = this.container.scale.x;

    const build = (): Container => {
      const plate = new Container();
      const ws = set.w!.ToPixi();
      ws.position.set(-totalW / 2, y - set.w!.Height);
      const cs = set.c!.ToPixi();
      cs.position.set(-totalW / 2 + set.w!.Width, y - set.c!.Height);
      cs.width = innerW;
      const es = set.e!.ToPixi();
      es.position.set(totalW / 2 - set.e!.Width, y - set.e!.Height);
      plate.addChild(ws, cs, es);
      t.position.set(-textW / 2, y - set.c!.Height + 5);
      plate.addChild(t);
      if (mark?.bg) {
        mark.bg.position.set(-totalW / 2 + set.w!.Width + 2, y - set.c!.Height + 3);
        plate.addChild(mark.bg);
        if (mark.markImg) {
          mark.markImg.position.set(mark.bg.position.x + 1, mark.bg.position.y + 1);
          plate.addChild(mark.markImg);
        }
      }
      return plate;
    };

    if (typeKey === 10) {
      // Rebuild the name plate each draw (cheap — few sprites).
      if (this._nameTagGroup) {
        this._nameTagGroup.destroy({ children: true });
      }
      this._nameTagGroup = build();
      this._nameTagGroup.scale.x = this.container.scale.x;
      this.container.addChild(this._nameTagGroup);
    } else {
      const g = build();
      g.scale.x = this.container.scale.x;
      this.container.addChild(g);
    }
  }

  /** Loads GuildMark.img BackGround/Mark canvases for this character's
   *  guild-mark ints (cached per id pair). Returns nulls when unset. */
  private _loadGuildMarkSprites(): { bg: Sprite | null; markImg: Sprite | null } {
    if (!this._baseWz || this._guildMarkBg <= 0 || this._guildMark <= 0) {
      return { bg: null, markImg: null };
    }
    const cacheKey = `${this._guildMarkBg}/${this._guildMarkBgColor}/${this._guildMark}/${this._guildMarkColor}`;
    if (this._guildMarkCache.has(cacheKey)) {
      const cached = this._guildMarkCache.get(cacheKey)!;
      return { bg: cached ? cached.ToPixi() : null, markImg: null };
    }
    const pad = (n: number): string => n.toString().padStart(8, '0');
    let bgSprite: WzSprite | null = null;
    try {
      const node = this._baseWz!.GetItem(`GuildMark.img/BackGround/${pad(this._guildMarkBg)}/${this._guildMarkBgColor}`);
      if (node instanceof WzCanvas && this._loader) bgSprite = this._loader.Load(node);
    } catch { /* missing canvas */ }
    this._guildMarkCache.set(cacheKey, bgSprite);
    void cacheKey;
    return { bg: bgSprite ? bgSprite.ToPixi() : null, markImg: null };
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
