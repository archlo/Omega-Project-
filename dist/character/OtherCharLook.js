import { Container, Graphics, Text } from 'pixi.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import { CharLook } from './CharLook.js';
import { Stance } from './Stance.js';
import { SkillEffectOverlay } from './SkillEffectOverlay.js';
import { MovePath } from '../map/VecCtrl.js';
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
    CharId;
    Name;
    Level;
    Look;
    container = new Container();
    Position = { x: 0, y: 0 };
    _facingLeft = false;
    _stance = Stance.Stand1;
    _charLook = null;
    _loader = null;
    _charWz = null;
    _itemWz = null;
    _baseWz = null;
    _movePath = new MovePath();
    _movePathElapsed = 0;
    _movePathActive = false;
    _hitFlash = 0;
    _adBoardText = '';
    _adBoardTimer = 0;
    _statusBadges = new Map();
    // Remote character buff state
    _tempStatMaskLo = 0n;
    _tempStatMaskHi = 0n;
    _tempStatBuffs = [];
    _defenseAtt = 0;
    _defenseState = 0;
    _diceInfo = [];
    _swallowBuffTime = 0;
    _blessingArmorIncPAD = 0;
    // OG CUser fields — guild/medal/team
    _guildName = '';
    _guildMarkBg = 0;
    _guildMarkBgColor = 0;
    _guildMark = 0;
    _guildMarkColor = 0;
    _medalItemId = 0;
    _teamName = '';
    // OG CUser::DrawGauge — HP ratio (0..1), -1 = hidden
    _hpRatio = -1;
    // Buff repeat effect overlays (OG LoadSkillRepeatEffect)
    _buffOverlays = null;
    PortableChairItemId = 0;
    // Cached display objects
    _nameText = null;
    _guildText = null;
    _medalText = null;
    _placeholderGfx = null;
    _badgeContainer = null;
    _adBoardBg = null;
    _adBoardLabel = null;
    _hpGaugeGfx = null;
    // Dirty tracking
    _lastHitFlash = -1;
    _lastBadgeCount = -1;
    _lastAdBoard = '';
    _lastLevel = -1;
    _lastName = '';
    _lastGuildName = '';
    _lastMedalId = -1;
    _lastHpRatio = -2;
    _lastTeamName = '';
    constructor(CharId, Name, Level, Look) {
        this.CharId = CharId;
        this.Name = Name;
        this.Level = Level;
        this.Look = Look;
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
    LoadSprites(loader, charWz, itemWz, baseWz) {
        this._loader = loader;
        this._charWz = charWz;
        this._itemWz = itemWz;
        this._baseWz = baseWz;
        if (this._charLook === null)
            return;
        this._charLook.Load(charWz, itemWz, baseWz, loader);
    }
    SetPosition(x, y) {
        this.Position = { x, y };
    }
    get FacingLeft() { return this._facingLeft; }
    SetFacing(facingLeft) {
        this._facingLeft = facingLeft;
    }
    Attack() {
        this._charLook?.Attack();
    }
    PlayAttackCode(action) {
        return this._charLook?.PlayAttackCode(action) ?? false;
    }
    PlayAttackAction(actionKey) {
        this._charLook?.PlayAttackAction(actionKey);
    }
    OnHit() {
        // TODO_AUDIT.md Hundred-and-forty-sixth pass: remote UserHit now drives
        // an actual avatar one-shot instead of only a chat/toast line.
        this._hitFlash = 0.25;
        // OG: when hit, show "hit" face expression (emotionId=1) for ~1 second
        // The face should show pain expression during the hit animation
        this._charLook?.SetEmotion(1); // emotionId=1 = "hit" expression
        this._charLook?.PlayOneTimeAction('hit1');
    }
    SetADBoard(message) {
        this._adBoardText = message;
        this._adBoardTimer = message ? 12 : 0;
    }
    SetStatusBadge(key, text, durationSec = 6) {
        if (!text)
            this._statusBadges.delete(key);
        else
            this._statusBadges.set(key, { text, timer: durationSec });
    }
    ClearStatusBadge(key) {
        this._statusBadges.delete(key);
    }
    // ── Remote character temporary stat (buff) state ──
    SetTemporaryStats(maskLo, maskHi, buffs, defenseAtt, defenseState, diceInfo, swallowBuffTime, blessingArmorIncPAD) {
        this._tempStatMaskLo = maskLo;
        this._tempStatMaskHi = maskHi;
        this._tempStatBuffs = buffs;
        this._defenseAtt = defenseAtt;
        this._defenseState = defenseState;
        this._diceInfo = diceInfo;
        this._swallowBuffTime = swallowBuffTime;
        this._blessingArmorIncPAD = blessingArmorIncPAD;
    }
    ClearTemporaryStats(maskLo, maskHi) {
        // Clear only the bits that are set in the reset mask
        this._tempStatMaskLo &= ~maskLo;
        this._tempStatMaskHi &= ~maskHi;
        this._tempStatBuffs = this._tempStatBuffs.filter(b => {
            if (b.bit < 64)
                return (this._tempStatMaskLo & (1n << BigInt(b.bit))) !== 0n;
            return (this._tempStatMaskHi & (1n << BigInt(b.bit - 64))) !== 0n;
        });
    }
    get TempStatBuffs() { return this._tempStatBuffs; }
    get TempStatMaskLo() { return this._tempStatMaskLo; }
    get TempStatMaskHi() { return this._tempStatMaskHi; }
    get DefenseAtt() { return this._defenseAtt; }
    get DefenseState() { return this._defenseState; }
    get DiceInfo() { return this._diceInfo; }
    get SwallowBuffTime() { return this._swallowBuffTime; }
    get BlessingArmorIncPAD() { return this._blessingArmorIncPAD; }
    /** Look up a buff by bit position. Returns undefined if not set. */
    GetBuffByBit(bit) {
        return this._tempStatBuffs.find(b => b.bit === bit);
    }
    // ── OG guild/medal/team name fields ──
    SetGuildInfo(name, markBg, markBgColor, mark, markColor) {
        this._guildName = name;
        this._guildMarkBg = markBg;
        this._guildMarkBgColor = markBgColor;
        this._guildMark = mark;
        this._guildMarkColor = markColor;
    }
    SetMedalItemId(medalId) {
        this._medalItemId = medalId;
    }
    SetTeamName(name) {
        this._teamName = name;
    }
    /** OG CUser::DrawGauge — sets the HP ratio (0..1) for the HP gauge bar.
     *  Pass -1 to hide the gauge entirely. */
    SetHpRatio(curHp, maxHp) {
        this._hpRatio = maxHp > 0 ? Math.max(0, Math.min(1, curHp / maxHp)) : 0;
    }
    HideHpGauge() {
        this._hpRatio = -1;
    }
    /** Returns a SkillEffectOverlay for persistent buff visuals (OG LoadSkillRepeatEffect).
     *  Lazy-created — only allocates when a buff effect is first needed. */
    GetBuffOverlay() {
        if (this._buffOverlays === null) {
            this._buffOverlays = new SkillEffectOverlay(new WzTextureLoader());
        }
        return this._buffOverlays;
    }
    SetEmotion(emotionId) {
        this._charLook?.SetEmotion(emotionId);
    }
    SetChairHeight(itemId) {
        this._charLook?.SetChairHeight(itemId);
    }
    UpdateAvatar(look) {
        // TODO_AUDIT.md Hundred-and-sixty-fourth pass follow-up: a remote user can
        // enter through the no-look fallback and receive UserAvatarModified later;
        // create the inner CharLook then instead of leaving the placeholder forever.
        this.Look = look;
        if (this._charLook === null) {
            this._charLook = new CharLook(look.skin);
            if (this._loader)
                this._charLook.Load(this._charWz, this._itemWz, this._baseWz, this._loader);
        }
        this._charLook.SetAvatar(look);
    }
    // The inner CharLook's own `Position` is never set (always {0,0} — see
    // the `_rebuildDisplay` comment below), so its anchor getters already
    // return the local offset unmodified; add this wrapper's own world
    // Position on top, same as `Draw()` does for the container itself.
    _anchor(local) {
        return { x: this.Position.x + (local?.x ?? 0), y: this.Position.y + (local?.y ?? 0) };
    }
    get NavelPosition() { return this._anchor(this._charLook?.NavelPosition); }
    get HeadPosition() { return this._anchor(this._charLook?.HeadPosition); }
    get BrowPosition() { return this._anchor(this._charLook?.BrowPosition); }
    get MuzzlePosition() { return this._anchor(this._charLook?.MuzzlePosition); }
    SetStance(stance) {
        this._stance = stance;
    }
    SetMovePath(path) {
        this._movePath.OriginX = path.originX;
        this._movePath.OriginY = path.originY;
        this._movePath.OriginVx = path.originVx;
        this._movePath.OriginVy = path.originVy;
        this._movePath.Elements = path.elements;
        this._movePathElapsed = 0;
        this._movePathActive = path.elements.length > 0;
    }
    /** World-space hit test against the fixed 30x78 body box (matches placeholder/avatar footprint). */
    HitTest(worldX, worldY) {
        const dx = worldX - this.Position.x;
        const dy = worldY - this.Position.y;
        return dx >= -15 && dx < 15 && dy >= -78 && dy < 0;
    }
    Update(dt) {
        if (this._movePathActive) {
            this._movePathElapsed += dt * 1000;
            const next = this._movePath.CalcPassivePos(this.Position.x, this.Position.y, 0, 0, 0, this._movePathElapsed);
            this.Position = { x: next.x, y: next.y };
            if (this._movePathElapsed >= this._movePath.Elements.reduce((sum, e) => sum + Math.max(e.elapse, 1), 0)) {
                this._movePathActive = false;
            }
        }
        if (this._hitFlash > 0)
            this._hitFlash = Math.max(0, this._hitFlash - dt);
        if (this._adBoardTimer > 0) {
            this._adBoardTimer = Math.max(0, this._adBoardTimer - dt);
            if (this._adBoardTimer === 0)
                this._adBoardText = '';
        }
        for (const [key, badge] of this._statusBadges) {
            badge.timer -= dt;
            if (badge.timer <= 0)
                this._statusBadges.delete(key);
        }
        this._charLook?.UpdateFromPhysics(dt, this._stance, this._facingLeft);
    }
    Draw(camX, camY, cx, cy) {
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
        this.container.position.set(this.Position.x - camX + cx, this.Position.y - camY + cy);
    }
    _rebuildDisplay() {
        this.container.removeChildren();
        if (this._charLook) {
            this._charLook.RebuildDisplay();
            this._charLook.container.alpha = this._hitFlash > 0 ? 0.55 : 1;
            this.container.addChild(this._charLook.container);
        }
        else {
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
        }
        else {
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
            }
            else {
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
            }
            else {
                this._medalText.text = `Medal[${this._medalItemId}]`;
            }
            this.container.addChild(this._medalText);
        }
        this._drawBadges();
        this._drawADBoard();
    }
    /** OG CUser::DrawGauge — renders the 52×10 HP gauge bar.
     *  3 nested border rectangles + red fill proportional to HP. */
    _drawHpGauge() {
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
    _drawBadges() {
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
    _drawADBoard() {
        if (!this._adBoardText)
            return;
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
//# sourceMappingURL=OtherCharLook.js.map