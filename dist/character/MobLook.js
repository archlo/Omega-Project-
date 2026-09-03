import { Container, Sprite, Graphics, Text, TextStyle } from 'pixi.js';
import { WzCanvas } from '../wz/WzCanvas.js';
import { WzProperty } from '../wz/WzProperty.js';
import { WzImage } from '../wz/WzImage.js';
import { MobStat } from './MobStat.js';
var MobState;
(function (MobState) {
    MobState[MobState["Stand"] = 0] = "Stand";
    MobState[MobState["Move"] = 1] = "Move";
    MobState[MobState["Attack"] = 2] = "Attack";
    MobState[MobState["Hit"] = 3] = "Hit";
    MobState[MobState["Die"] = 4] = "Die";
    MobState[MobState["Prone"] = 5] = "Prone";
    MobState[MobState["Ladder"] = 6] = "Ladder";
    MobState[MobState["Rope"] = 7] = "Rope";
    MobState[MobState["Fly"] = 8] = "Fly";
    MobState[MobState["Jump"] = 9] = "Jump";
    MobState[MobState["Fall"] = 10] = "Fall";
    MobState[MobState["Chase"] = 11] = "Chase";
    MobState[MobState["Miss"] = 12] = "Miss";
    MobState[MobState["Say"] = 13] = "Say";
    MobState[MobState["Eye"] = 14] = "Eye";
    MobState[MobState["No"] = 15] = "No";
    MobState[MobState["Regen"] = 16] = "Regen";
    MobState[MobState["Bomb"] = 17] = "Bomb";
    MobState[MobState["Attack2"] = 18] = "Attack2";
    MobState[MobState["Attack3"] = 19] = "Attack3";
    MobState[MobState["Attack4"] = 20] = "Attack4";
    MobState[MobState["Attack5"] = 21] = "Attack5";
    MobState[MobState["Attack6"] = 22] = "Attack6";
    MobState[MobState["Attack7"] = 23] = "Attack7";
    MobState[MobState["Attack8"] = 24] = "Attack8";
    MobState[MobState["AttackF"] = 25] = "AttackF";
    MobState[MobState["Skill1"] = 26] = "Skill1";
    MobState[MobState["Skill2"] = 27] = "Skill2";
    MobState[MobState["Skill3"] = 28] = "Skill3";
    MobState[MobState["Skill4"] = 29] = "Skill4";
    MobState[MobState["Skill5"] = 30] = "Skill5";
    MobState[MobState["Skill6"] = 31] = "Skill6";
    MobState[MobState["Skill7"] = 32] = "Skill7";
    MobState[MobState["Skill8"] = 33] = "Skill8";
    MobState[MobState["Skill9"] = 34] = "Skill9";
    MobState[MobState["Skill10"] = 35] = "Skill10";
    MobState[MobState["Skill11"] = 36] = "Skill11";
    MobState[MobState["Skill12"] = 37] = "Skill12";
    MobState[MobState["Skill13"] = 38] = "Skill13";
    MobState[MobState["Skill14"] = 39] = "Skill14";
    MobState[MobState["Skill15"] = 40] = "Skill15";
    MobState[MobState["Skill16"] = 41] = "Skill16";
    MobState[MobState["Hit2"] = 42] = "Hit2";
    MobState[MobState["Hit3"] = 43] = "Hit3";
    MobState[MobState["HitF"] = 44] = "HitF";
    MobState[MobState["Die2"] = 45] = "Die2";
    MobState[MobState["Die3"] = 46] = "Die3";
    MobState[MobState["DieF"] = 47] = "DieF";
})(MobState || (MobState = {}));
const StateNames = {
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
    [MobState.Skill1]: 'skill1', [MobState.Skill2]: 'skill2',
    [MobState.Skill3]: 'skill3', [MobState.Skill4]: 'skill4',
    [MobState.Skill5]: 'skill5', [MobState.Skill6]: 'skill6',
    [MobState.Skill7]: 'skill7', [MobState.Skill8]: 'skill8',
    [MobState.Skill9]: 'skill9', [MobState.Skill10]: 'skill10',
    [MobState.Skill11]: 'skill11', [MobState.Skill12]: 'skill12',
    [MobState.Skill13]: 'skill13', [MobState.Skill14]: 'skill14',
    [MobState.Skill15]: 'skill15', [MobState.Skill16]: 'skill16',
};
/**
 * OG CMob::SetLayerZ — special template ID Z-order overrides.
 * Key = templateId, Value = Z offset added to base formula (0 = fixed top layer).
 * From IDA: Zakum body parts (0x864700-0x86476E), Horntail parts (0x866E13-0x866E8A),
 * Pinkbean parts (8830000-8830013).
 */
const MOB_SPECIAL_Z = {
    // Zakum body parts — varied Z offsets
    0x864702: -1073711835, 0x864766: -1073711835,
    0x864703: -1073711839, 0x864704: -1073711839, 0x864767: -1073711839, 0x864768: -1073711839,
    0x864705: -1073711838, 0x864706: -1073711838, 0x864769: -1073711838, 0x86476A: -1073711838,
    0x864707: -1073711837, 0x864708: -1073711837, 0x86476B: -1073711837, 0x86476C: -1073711837,
    0x864709: -1073711836, 0x86470A: -1073711836, 0x86476D: -1073711836, 0x86476E: -1073711836,
    // Horntail parts — varied Z offsets
    0x866E13: -1073711836, 0x866E1B: -1073711836, 0x866E77: -1073711836,
    0x866E14: -1073711837, 0x866E1A: -1073711837, 0x866E1C: -1073711837, 0x866E76: -1073711837, 0x866E78: -1073711837,
    0x866E15: -1073711838, 0x866E16: -1073711838, 0x866E1D: -1073711838, 0x866E1E: -1073711838, 0x866E79: -1073711838, 0x866E7A: -1073711838,
    0x866E17: -1073711840, 0x866E1F: -1073711840, 0x866E7B: -1073711840,
    0x866E18: -1073711839, 0x866E20: -1073711839, 0x866E7C: -1073711839,
    0x866E19: -1073711841, 0x866E21: -1073711841, 0x866E7D: -1073711841,
    0x866E22: -1073711835, 0x866E8A: -1073711835,
    // Pinkbean parts — top layer
    8830001: 0, 0x86BC32: 0, 8830004: 0, 8830005: 0, 8830006: 0, 8830008: 0, 8830009: 0, 8830011: 0, 0x86BC3C: 0, 8830013: 0,
    // Pinkbean parts — slightly lower
    8830000: 0, 8830003: 0, 0x86BC37: 0, 0x86BC3A: 0,
};
export class MobLook {
    MobId;
    TemplateId;
    _anims = new Map();
    _curState = MobState.Stand;
    _frame = 0;
    _frameTimer = 0;
    _facingLeft = false;
    _dead = false;
    _showLabel = false; // OG: HP bar + name only visible after mob is attacked
    _loaded = false;
    get Loaded() { return this._loaded; }
    _hitFlash = 0;
    _speechText = '';
    _speechTimer = 0;
    _statusBadges = new Map();
    _damageNumbers = [];
    _damageContainer = null;
    // OG CMob fields
    _mobCtrlState = -1; // -1=idle, -2=waiting, -3=active, 1=moving, 3/4=attacking
    _mobCtrlSn = 0;
    _skillCommand = 0;
    _skillLevel = 0;
    _mp = 0;
    _mobChargeCount = 0;
    _attackReady = false;
    _nDeadType = 0;
    _nOneTimeAction = -1;
    _tHitExpire = 0;
    _tLastHitExpire = 0;
    _lastDamage = 0;
    _affectedSkills = [];
    _bullets = [];
    _angerGaugeCount = 0;
    _suspended = 0; // 0=normal, 2=dead/suspended
    _active = true;
    _fadeTimer = 0; // countdown for death fade-out
    _spriteTopY = -50; // cached top of current sprite in local coords
    _playDieSound = false; // OG: play SE_MOB_DIE on death
    _frozen = false; // OG: freeze position on death
    // SetFrameInfo fields — per-frame animation data
    _curFrameOffsetX = 0; // a0 — current frame X offset
    _curFrameAlpha = 255; // a1 — current frame alpha
    _tNextFramesRemain = 0; // total remaining time for all frames
    _tCurFrameRemain = 0; // remaining time for current frame
    _rcBody = { left: 0, top: 0, right: 0, bottom: 0 }; // current body rect
    _rcBodyFlip = { left: 0, top: 0, right: 0, bottom: 0 }; // flipped body rect
    _rcAttackBody = [];
    _rcMultiBody = [];
    // Attack processing
    _attackEntries = [];
    _rushAttackEnd = 0;
    _rushAttackIdx = -1;
    _moveAction = 0; // OG CMob::m_nMoveAction — directional movement action (bit 0 = facing)
    _escortState = 0;
    // Move path interpolation
    _movePathElements = [];
    _movePathIndex = 0;
    _movePathTimer = 0;
    get IsServerMoveActive() {
        return this._movePathElements.length > 0;
    }
    _lastPoisonDamage = 0x7FFFFFFF;
    _lastVenomDamage = 0x7FFFFFFF;
    _lastAmbushDamage = 0x7FFFFFFF;
    _lastObstacleDamage = 0x7FFFFFFF;
    // Boss HP indicator
    _hpIndicatorVisible = false;
    _hpIndicatorPct = 0;
    _hpIndicatorColor = 0xFF0000;
    _hpIndicatorGfx = null;
    container = new Container();
    Position = { x: 0, y: 0 };
    Hp = -1;
    MaxHp = -1;
    MaxMp = 0;
    nameOf = () => '';
    /** Callback for die sound — wired by GameStage */
    onDieSound = null;
    /** Callback for hit sound — wired by GameStage */
    onHitSound = null;
    /** Callback to get local player level — wired by GameStage */
    getPlayerLevel = null;
    Stat = new MobStat();
    IsBoss = false;
    DamagedByMob = false;
    /** OG: entity layer assignment — derived from foothold layer at spawn/move */
    Layer = 7;
    /** OG CMob::m_pTemplate — template data from MobInfoService */
    _info = null;
    // Cached display objects — created once, reused across frames
    _bodySprite = null;
    _placeholderGfx = null;
    _hpBarGfx = null;
    _nameText = null;
    _speechBg = null;
    _speechLabel = null;
    _badgeContainer = null;
    // Dirty tracking — only rebuild when something visual changed
    _lastState = -1;
    _lastFrame = -1;
    _lastFacing = false;
    _lastHitFlash = -1;
    _lastBadgeCount = -1;
    _lastSpeech = '';
    _lastHp = -2;
    _lastMaxHp = -2;
    _lastHpIndicatorVisible = false;
    _lastHpIndicatorPct = 0;
    _lastShowLabel = false;
    constructor(MobId, TemplateId) {
        this.MobId = MobId;
        this.TemplateId = TemplateId;
    }
    get IsDead() { return this._dead; }
    get HeadPosition() {
        const sprite = this._currentFrameSprite();
        if (!sprite)
            return { x: this.Position.x, y: this.Position.y - 50 };
        const left = sprite.Lt?.x ?? -sprite.OriginX;
        const right = sprite.Rb?.x ?? (sprite.Width - sprite.OriginX);
        const top = sprite.Lt?.y ?? -sprite.OriginY;
        const localX = (left + right) / 2;
        return { x: this.Position.x + (this._facingLeft ? -localX : localX), y: this.Position.y + top };
    }
    Load(loader, mobWz) {
        if (mobWz === null)
            return;
        const strid = `${this.TemplateId.toString().padStart(7, '0')}.img`;
        const img = mobWz.GetItem(strid);
        const root = img instanceof WzImage ? img.Root : null;
        if (!root)
            return;
        for (let st = MobState.Stand; st <= MobState.DieF; st++) {
            const name = StateNames[st];
            if (!name)
                continue;
            const stateNode = root.Get(name);
            if (!(stateNode instanceof WzProperty))
                continue;
            const frames = [];
            let fi = 0;
            while (true) {
                const raw = stateNode.Get(`${fi}`);
                if (raw === null)
                    break;
                let delay;
                let sprite = null;
                let frameEntry;
                if (raw instanceof WzCanvas) {
                    delay = 120;
                    sprite = loader.Load(raw);
                }
                else if (raw instanceof WzProperty) {
                    delay = this._readDelay(raw);
                    sprite = this._loadFrame(loader, raw);
                    // Read per-frame data from WZ
                    frameEntry = this._readFrameEntry(raw);
                }
                else
                    break;
                if (sprite)
                    frames.push({ sprite, delayMs: delay, frame: frameEntry });
                fi++;
            }
            if (frames.length > 0)
                this._anims.set(st, frames);
        }
        this._loaded = this._anims.size > 0;
    }
    SetState(state) {
        if (state === this._curState)
            return;
        this._curState = state;
        this._frame = 0;
        this._frameTimer = 0;
    }
    /** OG CMob::ShowHitEffect (0x64b140) — plays a brief hit animation with cooldown */
    ShowHitEffect(_nDamage = 0) {
        // OG: skip if currently in Attack/Hit/Die one-time action
        const cur = this._nOneTimeAction;
        if ((cur >= 13 && cur <= 21) || (cur >= 22 && cur <= 38) || (cur >= 7 && cur <= 9))
            return;
        // OG: skip if damage < pushedDamage threshold
        const pushed = this._info?.Pushed ?? 0;
        if (pushed > 0 && this._lastDamage < pushed)
            return;
        // OG: boss mobs have 10s cooldown between hits
        const now = performance.now();
        if (this.IsBoss && now <= this._tLastHitExpire + 10000)
            return;
        const hitAction = this.GetRandomHitAction();
        if (hitAction < 0)
            return;
        this._nOneTimeAction = hitAction;
        this.SetState(hitAction);
        const delay = this.GetActionDelay(hitAction);
        this._tHitExpire = now + delay;
        this._tLastHitExpire = this._tHitExpire;
    }
    /** OG CMob::OnHit (0x653110) — full 15-param hit processing from server */
    OnHit(dwCharacterId, nSkillID, nHitAction, bLeft, nDamage, bCriticalAttack, nAttackIdx, bChase, nMoveType, nBulletCashItemID, nMoveEndingPosX, nMoveEndingPosY, bMoveLeft, bZigZagDamage) {
        // OG: show hit effect (hit animation)
        if (nHitAction > 0 && nDamage > 0) {
            this.ShowHitEffect(nDamage);
            // OG: play hit sound (SE_MOB_HIT)
            this.onHitSound?.(this.TemplateId);
        }
        // OG: show damage number (skip for certain skills)
        const skipDamageSkills = [1221011, 21120006, 33101005];
        if (!skipDamageSkills.includes(nSkillID)) {
            this.ShowDamage(nDamage, bCriticalAttack, false, bZigZagDamage ? 15 : 0, true);
        }
        // OG: show catch effect for certain skills
        if (nSkillID === 1121001 || nSkillID === 1321001) {
            this.ShowCatchEffect();
        }
    }
    Say(text, durationSec = 4) {
        if (!text)
            return;
        this._speechText = text;
        this._speechTimer = durationSec;
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
    OnDie() {
        // OG CMob::OnDie (0x64E4B0) — full death processing
        this._dead = true;
        this._suspended = 2;
        // Play die sound (OG: play_mob_sound(templateID, SE_MOB_DIE, vol))
        this._playDieSound = true;
        // Freeze position — stop VecCtrl movement (OG: gets current pos, stores in m_ptPos)
        this._frozen = true;
        // Die action: rand() % nDieCount + 10, or action 22 if deadType==3
        const dieCount = this._info ? 3 : 1; // default dieCount from template
        let dieAction;
        if (this._nDeadType === 3) {
            dieAction = 22; // DieF
        }
        else {
            dieAction = dieCount > 0 ? (Math.floor(Math.random() * dieCount) + 10) : 10;
        }
        this._nOneTimeAction = dieAction;
        const stateMap = {
            10: MobState.Die, 11: MobState.Die2, 12: MobState.Die3,
            22: MobState.DieF,
        };
        this.SetState(stateMap[dieAction] ?? MobState.Die);
        // Clear affected skills and bullets
        this._affectedSkills = [];
        this._bullets = [];
        // Reset DoT timers
        this._lastPoisonDamage = 0x7FFFFFFF;
        this._lastVenomDamage = 0x7FFFFFFF;
        this._lastAmbushDamage = 0x7FFFFFFF;
        this._lastObstacleDamage = 0x7FFFFFFF;
    }
    /** OG CMob::ShowDamage — floating damage number with zigzag + direction offset */
    ShowDamage(nDamage, bCritical, bHalfHeight, zigZagDamage = 0, bAdjustHeight = false) {
        // OG: HP bar + name tag only appear after mob takes damage
        if (!this._showLabel && nDamage > 0) {
            this._showLabel = true;
            this._updateDisplay();
        }
        const head = this.HeadPosition;
        // OG: x offset = ±15 based on critical (even/odd) and facing direction
        let offsetX = 0;
        if (bAdjustHeight) {
            const adj = (bCritical ? 1 : 0) % 2 !== 0 ? 15 : -15;
            offsetX = (this._info?.NoFlip || (this._nOneTimeAction & 1) !== 0) ? -adj : adj;
        }
        // OG: y = zigZagDamage - bCritical * (bHalfHeight ? 15 : 30) - 15
        const offsetY = zigZagDamage - (bCritical ? 1 : 0) * (bHalfHeight ? 15 : 30) - 15;
        let color = 0xffffff; // white normal
        let text = `${nDamage}`;
        if (nDamage === 0) {
            text = 'MISS';
            color = 0xaaaaaa;
        }
        else if (bCritical) {
            color = 0xff6600; // orange critical
            text = `${nDamage}!`;
        }
        else if (nDamage < 0) {
            color = 0x00ff00; // green heal
            text = `${Math.abs(nDamage)}`;
        }
        this._damageNumbers.push({
            text,
            x: head.x + offsetX,
            y: head.y + offsetY,
            timer: 1.2,
            color,
            scale: bCritical ? 1.3 : 1.0,
        });
    }
    SetFacing(facingLeft) {
        this._facingLeft = facingLeft;
    }
    // === OG CMob methods ===
    /** OG CMob::SetActive (0x640950) — toggle mob active/inactive state */
    SetActive(active) {
        this._active = active;
        this.container.visible = active;
        if (active) {
            this.container.alpha = 1;
            this._tHitExpire = 0;
        }
    }
    IsActive() { return this._active; }
    /** OG CMob::OnCtrlAck — control acknowledgment from server */
    OnCtrlAck(mobCtrlSn, nextAttackPossible, mp, skillCommand, skillLevel) {
        if (!this._active)
            this.SetActive(true);
        this._mobCtrlSn = mobCtrlSn;
        this._mp = mp;
        if (!this._skillCommand || skillCommand) {
            this._skillCommand = skillCommand;
            this._skillLevel = skillLevel;
        }
        // State: -2=waiting, -1=idle, 0-2=moving, 3=attacking, 4=attacking with next
        this._mobCtrlState = nextAttackPossible ? 4 : 3;
    }
    /** OG CMob::OnIncMobChargeCount — mob charge count update */
    OnIncChargeCount(chargeCount, attackReady) {
        this._mobChargeCount = chargeCount;
        this._attackReady = attackReady;
    }
    /** OG CMob::OnAffected — skill effect applied to mob */
    OnAffected(skillId, duration, now) {
        const entry = {
            skillId,
            startTime: duration + now || 1,
            posX: this.Position.x,
            posY: this.Position.y,
        };
        this._affectedSkills.push(entry);
    }
    /** OG CMob::OnMobSpeaking — mob speech from server */
    TrySpeaking(speakInfoIdx, speechLineIdx, speakEntries) {
        if (!speakEntries || speakEntries.length === 0)
            return;
        // Find matching entry by action (speakInfoIdx) or random
        let entry = speakInfoIdx >= 0
            ? speakEntries.find(e => e.action === speakInfoIdx)
            : speakEntries[Math.floor(Math.random() * speakEntries.length)];
        if (!entry || entry.lines.length === 0)
            return;
        const line = speechLineIdx >= 0 && speechLineIdx < entry.lines.length
            ? entry.lines[speechLineIdx]
            : entry.lines[Math.floor(Math.random() * entry.lines.length)];
        if (line)
            this.Say(line);
    }
    /** OG CMob::OnDie — death processing with die animation variants */
    OnDieComplete(dieCount) {
        this._dead = true;
        this._suspended = 2;
        // Pick die action: nDeadType=3 → Die3(22), else rand()%dieCount + Die1(10)
        let dieAction;
        if (this._nDeadType === 3) {
            dieAction = 22; // DieF
        }
        else {
            dieAction = dieCount > 0 ? (Math.floor(Math.random() * dieCount) + 10) : 10;
        }
        this._nOneTimeAction = dieAction;
        // Map action to state
        const stateMap = {
            10: MobState.Die, 11: MobState.Die2, 12: MobState.Die3,
            22: MobState.DieF,
        };
        this.SetState(stateMap[dieAction] ?? MobState.Die);
        // Clear affected skills and bullets on death
        this._affectedSkills = [];
        this._bullets = [];
        // Reset damage timers
        this._lastPoisonDamage = 0x7FFFFFFF;
        this._lastVenomDamage = 0x7FFFFFFF;
        this._lastAmbushDamage = 0x7FFFFFFF;
        this._lastObstacleDamage = 0x7FFFFFFF;
    }
    /** OG CMob::ShowDamage — damage number display with type variants */
    ShowDamageAdvanced(nHitAction, nDamage, bLeft, nSkillID, nMoveEndingPosY, bMagicAttack) {
        const head = this.HeadPosition;
        const offsetX = (Math.random() - 0.5) * 30;
        const offsetY = -30;
        let color = 0xffffff;
        let text = `${nDamage}`;
        if (nDamage === 0) {
            text = 'MISS';
            color = 0xaaaaaa;
        }
        else if (nSkillID === 35111001 || nSkillID === 35111009 || nSkillID === 35111010 || nSkillID === 35121012) {
            color = 0xff6600; // mechanic special
            text = `${nDamage}!`;
        }
        else if (bLeft) {
            color = 0xff0000; // critical
            text = `${nDamage}!`;
        }
        this._damageNumbers.push({
            text, x: head.x + offsetX, y: head.y + offsetY,
            timer: 1.2, color, scale: bLeft ? 1.3 : 1.0,
        });
    }
    /** OG CMob::CreateHPIndicator — boss HP bar indicator */
    CreateHPIndicator(pct, color) {
        this._hpIndicatorPct = Math.max(0, Math.min(100, pct));
        this._hpIndicatorColor = color;
        this._hpIndicatorVisible = true;
    }
    /** OG CMob::ShowHPIndicator — show boss HP bar */
    ShowHPIndicator() {
        this._hpIndicatorVisible = true;
    }
    /** OG CMob::HideHPIndicator — hide boss HP bar */
    HideHPIndicator() {
        this._hpIndicatorVisible = false;
    }
    /** OG CMob::GetBodyRect — body collision rectangle */
    GetBodyRect() {
        // Use frame entry data if available, else fall back to sprite bounds
        if (this._rcBody.left !== 0 || this._rcBody.top !== 0 || this._rcBody.right !== 0 || this._rcBody.bottom !== 0) {
            return this._facingLeft ? this._rcBodyFlip : this._rcBody;
        }
        const sprite = this._currentFrameSprite();
        if (!sprite)
            return { left: -20, top: -50, right: 20, bottom: 0 };
        return {
            left: sprite.Lt?.x ?? -sprite.OriginX,
            top: sprite.Lt?.y ?? -sprite.OriginY,
            right: sprite.Rb?.x ?? (sprite.Width - sprite.OriginX),
            bottom: sprite.Rb?.y ?? (sprite.Height - sprite.OriginY),
        };
    }
    /** OG CMob::GetAttackBodyRect — attack collision rectangle */
    GetAttackBodyRect() {
        if (this._rcAttackBody.length > 0)
            return this._rcAttackBody[0];
        return this.GetBodyRect();
    }
    /** OG CMob::SetMoveAction — set mob animation action */
    SetMoveAction(action) {
        this._nOneTimeAction = action;
    }
    /** OG CMob::GetCurrentAction (0x649EA0) — combines MoveAction and OneTimeAction */
    GetCurrentAction() {
        // OneTimeAction overrides MoveAction when active (>= 0)
        if (this._nOneTimeAction >= 0)
            return this._nOneTimeAction;
        return this._moveAction;
    }
    /** OG CMob::IsSuspended — check if mob is suspended (dead/frozen) */
    IsSuspended() { return this._suspended !== 0; }
    /** OG CMob::GetMobChargeCount */
    GetMobChargeCount() { return this._mobChargeCount; }
    /** OG CMob::IsAttackReady */
    IsAttackReady() { return this._attackReady; }
    /** OG CMob::GetAngerGaugeCount */
    GetAngerGaugeCount() { return this._angerGaugeCount; }
    /** OG CMob::IncAngerGauge */
    IncAngerGauge() { this._angerGaugeCount = Math.min(10, this._angerGaugeCount + 1); }
    /** OG CMob::GetEscortState */
    GetEscortState() { return this._escortState; }
    /** OG CMob::SetEscortState */
    SetEscortState(state) { this._escortState = state; }
    // ──────────────────────────────────────────────────────────────────────────
    // OG CMob missing getters and utility methods — added from IDA decompilation
    // ──────────────────────────────────────────────────────────────────────────
    /** OG CMob::GetMobID — returns secure-fused mob ID */
    GetMobID() { return this.MobId; }
    /** OG CMob::GetMobStat — returns pointer to MobStat */
    GetMobStat() { return this.Stat; }
    /** OG CMob::GetTemplate — returns mob template pointer */
    /** OG CMob::GetTemplate — returns CMobTemplate (our MobInfo) */
    GetTemplate() { return this._info; }
    /** OG CMob::GetCurTemplate — returns current template (may differ after doom) */
    /** OG CMob::GetCurTemplate — returns template (or m_pTemplateByDoom if doomed) */
    GetCurTemplate() { return this._info; }
    /** OG CMob::GetMoveAbility — returns template nMoveAbility */
    /** OG CMob::GetMoveAbility — reads nMoveAbility from CMobTemplate */
    GetMoveAbility() { return this._info?.MoveAbility ?? 0; }
    /** OG CMob::GetHeight — returns mob collision height from template */
    /** OG CMob::GetHeight — reads canvas height from current animation frame */
    GetHeight() {
        const sprite = this._currentFrameSprite();
        return sprite?.Height ?? 0;
    }
    /** OG CMob::GetHalfWidth — returns mob half-width for collision */
    /** OG CMob::GetHalfWidth — reads canvas width from current frame, returns half */
    GetHalfWidth() {
        const sprite = this._currentFrameSprite();
        return sprite ? Math.floor(sprite.Width / 2) : 0;
    }
    /** OG CMob::IsBossMob — checks template bBoss flag */
    IsBossMob() { return this.IsBoss; }
    /** OG CMob::IsNoFlip — checks if mob should not flip direction */
    IsNoFlip() { return false; }
    /** OG CMob::IsImmovable — checks stun/freeze/web/suspended */
    IsImmovable() {
        return this.Stat.IsStunned || this.Stat.IsFrozen || this._suspended === 4;
    }
    /** OG CMob::IsMobOurTeam — checks if mob is on player's team (PQ/CPQ) */
    IsMobOurTeam() { return false; }
    /** OG CMob::IsNotEnemyMob — checks damagedByMob or escort type or dazzle */
    IsNotEnemyMob() { return this.DamagedByMob || this.Stat.nDazzle_ > 0; }
    /** OG CMob::IsNoFlip */
    IsNoFlipMob() { return !this.Stat.IsDoomed; }
    /** OG CMob::IsPosFixed — checks if nMoveAbility == 0 */
    IsPosFixed() { return this.GetMoveAbility() === 0; }
    /** OG CMob::IsSamePhaseWithMe — checks if mob is in same phase as local player */
    IsSamePhaseWithMe() { return true; }
    /** OG CMob::IsChaseTargetDazzle — checks if chase target is dazzled */
    IsChaseTargetDazzle() { return false; }
    /** OG CMob::IsChaseTargetEscort — checks if chase target is escort */
    IsChaseTargetEscort() { return false; }
    /** OG CMob::IsDazzledMobByMe — checks if mob is dazzled by local player */
    IsDazzledMobByMe() { return this.Stat.nDazzle_ > 0; }
    /** OG CMob::IsOnPlayingOneTimeAction */
    IsOnPlayingOneTimeAction() { return this._nOneTimeAction > -1; }
    /** OG CMob::IsAbleTargetEscortMob */
    IsAbleTargetEscortMob() { return false; }
    /** OG CMob::IsRisingByToss */
    IsRisingByToss() { return false; }
    /** OG CMob::IsRectIntersectWithTrapezoid */
    IsRectIntersectWithTrapezoid(_rect) { return false; }
    /** OG CMob::GetActionDelay — sums tDelay across all frames for given action */
    GetActionDelay(nAction) {
        const state = nAction;
        const frames = this._anims.get(state);
        if (!frames || frames.length === 0)
            return 0;
        let total = 0;
        for (const f of frames)
            total += f.delayMs;
        return total;
    }
    /**
     * OG CMob::SetFrameInfo (0x642560, 0x843 bytes)
     * Processes per-frame animation data: offsets, alpha, body rects, head position.
     * Called from PrepareActionLayer for each frame entry.
     */
    SetFrameInfo(frame) {
        // Per-frame X offset (a0)
        if (frame.offsetX >= 0) {
            this._curFrameOffsetX = frame.offsetX;
        }
        // Per-frame alpha (a1)
        if (frame.alpha >= 0) {
            this._curFrameAlpha = Math.min(255, Math.max(0, frame.alpha));
        }
        // Frame delay tracking
        this._tCurFrameRemain = frame.delayMs;
        // Body rect from frame
        this._rcBody = { ...frame.rcBody };
        // Flipped body rect: negate left/right
        this._rcBodyFlip = {
            left: -frame.rcBody.right,
            top: frame.rcBody.top,
            right: -frame.rcBody.left,
            bottom: frame.rcBody.bottom,
        };
        // Attack body rects
        this._rcAttackBody = frame.rcAttackBody.map(r => ({ ...r }));
        // Multi body rects
        this._rcMultiBody = frame.rcMultiBody.map(r => ({ ...r }));
    }
    /** Get current attack body rects (OG: m_arcAttackBody) */
    GetAttackBodyRects() {
        return this._facingLeft ? [] : this._rcAttackBody; // TODO: flip support
    }
    /** Get current multi body rects (OG: m_arcMultiBody) */
    GetMultiBodyRects() {
        return this._facingLeft ? [] : this._rcMultiBody; // TODO: flip support
    }
    /** OG CMob::LoadMobAction (0x63b690) — loads action frames from WZ */
    LoadMobAction(nAction) {
        if (this._actionFrames.has(nAction))
            return true;
        const stateMap = {
            0: MobState.Stand, 1: MobState.Move, 2: MobState.Attack,
            3: MobState.Attack2, 4: MobState.Attack3, 5: MobState.Attack4,
            6: MobState.Attack5, 7: MobState.Attack6, 8: MobState.Attack7,
            9: MobState.Attack8, 10: MobState.Die, 11: MobState.Die2,
            12: MobState.Die3, 22: MobState.DieF, 39: MobState.Fly,
        };
        const state = stateMap[nAction];
        if (state !== undefined && this._anims.has(state)) {
            this._actionFrames.set(nAction, this._anims.get(state));
            return true;
        }
        return false;
    }
    _actionFrames = new Map();
    /** OG CMob::GetPushedDamage — returns damage when mob pushes player */
    /** OG CMob::GetPushedDamage — reads nPushedDamage from template */
    GetPushedDamage() { return this._info?.Pushed ?? 0; }
    /** OG CMob::GetRandomHitAction — returns random hit animation (7 + rand()%nHitCount) */
    GetRandomHitAction() {
        // OG: if nHitCount <= 0, return -1; else return rand() % nHitCount + 7
        // nHitCount is derived from how many hitN frames exist in WZ
        const hitStates = [MobState.Hit, MobState.Hit2, MobState.Hit3, MobState.HitF];
        let hitCount = 0;
        for (const hs of hitStates) {
            if (this._anims.has(hs) && this._anims.get(hs).length > 0)
                hitCount++;
        }
        if (hitCount <= 0)
            return -1;
        return Math.floor(Math.random() * hitCount) + 7; // 7 = Hit1
    }
    /** OG CMob::GetRemainDamageInfoDelay */
    GetRemainDamageInfoDelay() { return 0; }
    /** OG CMob::CalcCrc — calculates mob CRC from template */
    CalcCrc() { return 0; }
    /** OG CMob::GetAttackInfo — returns attack info structure */
    GetAttackInfo() { return null; }
    /** OG CMob::GetSkillInfo — returns mob skill info */
    GetSkillInfo() { return null; }
    /** OG CMob::GetVecCtrl — returns vector controller */
    GetVecCtrl() { return null; }
    /** OG CMob::GetActiveVecCtrl — returns active vector controller */
    GetActiveVecCtrl() { return null; }
    /** OG CMob::SetLayerZ (0x63ab40) — sets mob Z-layer position */
    SetLayerZ(footholdY) {
        // OG CMob::SetLayerZ (0x63AB50)
        // z = 10 * (3000 * footholdZ - footholdY) - 1073711833
        // Special cases for escort, upperMostLayer, ladder/rope, and specific template IDs
        const y = this.Position.y;
        const fhY = footholdY ?? y;
        let z;
        if (this._info?.EscortType === 1 || this._info?.UpperMostLayer) {
            z = -1073471724;
        }
        else {
            z = 10 * (3000 * y - fhY) - 1073711833;
            // Special template ID overrides (Zakum, Horntail, Pinkbean body parts)
            const specialZ = MOB_SPECIAL_Z[this.TemplateId];
            if (specialZ !== undefined) {
                z = specialZ !== 0 ? 10 * (3000 * y - fhY) + specialZ : -1073471724;
            }
        }
        this.container.zIndex = z;
    }
    /** OG CMob::OnLayerZChanged — called when mob changes Z-layer */
    OnLayerZChanged() { }
    /** OG CMob::SetAffectedLayerPos — positions affected skill layers */
    SetAffectedLayerPos() { }
    /** OG CMob::SetTimeBombTime — sets time bomb countdown */
    SetTimeBombTime(time) { this._timeBombTime = time; }
    /** OG CMob::RawAction2MoveAction — converts raw action to move action */
    RawAction2MoveAction(_rawAction) { return 0; }
    /** OG CMob::MoveAction2RawAction — converts move action to raw action */
    MoveAction2RawAction(_moveAction) { return 0; }
    /** OG CMob::ShowCatchEffect — shows catch animation on mob */
    ShowCatchEffect() { }
    /** OG CMob::ClearActionLayer — clears current action animation */
    ClearActionLayer() { this.SetState(MobState.Stand); }
    // ═══════════════════════════════════════════════════════════════════════════
    // OG CMob::GetFineAction (0x649270) — action errata table
    // Maps raw action indices to actual WZ action indices.
    // If the requested action doesn't exist, falls back to action 1 (stand),
    // then action 3 (attack2). Results are cached per template.
    // ═══════════════════════════════════════════════════════════════════════════
    _fineActionCache = new Map();
    GetFineAction(nAction) {
        // Check cache first
        const cached = this._fineActionCache.get(nAction);
        if (cached !== undefined)
            return cached;
        // If the action exists, use it directly
        if (this.LoadMobAction(nAction)) {
            this._fineActionCache.set(nAction, nAction);
            return nAction;
        }
        // Fallback: try action 1 (stand), then action 3 (attack2)
        let fallback = 1;
        if (!this.LoadMobAction(1)) {
            if (!this.LoadMobAction(3)) {
                // OG throws CTerminateException — we just return stand
                fallback = 0;
            }
            else {
                fallback = 3;
            }
        }
        this._fineActionCache.set(nAction, fallback);
        return fallback;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // OG CMob::DoAttack (0x6504D0, 0x9B0 bytes) — execute attack by action index
    // Creates attack entries or bullets based on attack type.
    // ═══════════════════════════════════════════════════════════════════════════
    DoAttack(nAction, bLeft, targetX, targetY) {
        // OG guard checks
        if (this._info?.SelfDestruction)
            return;
        if (this.Stat.IsStunned || this.Stat.IsFrozen || this.Stat.IsWebbed)
            return;
        if (this._suspended === 4)
            return;
        if (this.Stat.tSeal_ > 0)
            return;
        const attackIdx = nAction - 13;
        const attackInfo = this._info?.Attacks.get(attackIdx);
        if (!attackInfo)
            return;
        // Set effect attack for visual
        this._effectAttack = {
            sEffect: attackInfo.Effect ?? '',
            bLeft,
            tStart: performance.now() + (attackInfo.EffectAfter ?? 0),
        };
        const tCur = performance.now();
        const pos = this.Position;
        // Attack type determines entry creation
        switch (attackInfo.nType ?? 0) {
            case 0: // Melee rect
            case 1: // Melee target
            case 3: // Area rect
            case 4: // Area rect (variant)
                this.AddAttackEntry({
                    nAttackIdx: attackIdx,
                    nType: attackInfo.nType ?? 0,
                    bLeft,
                    tTime: tCur + (attackInfo.AttackAfter ?? 0),
                    rcRange: {
                        left: pos.x + (attackInfo.rcRange?.left ?? -30),
                        top: pos.y + (attackInfo.rcRange?.top ?? -30),
                        right: pos.x + (attackInfo.rcRange?.right ?? 30),
                        bottom: pos.y + (attackInfo.rcRange?.bottom ?? 30),
                    },
                });
                break;
            case 2: // Bullet
                if (attackInfo.Ball) {
                    this._bullets.push({
                        bulletId: attackIdx,
                        x: pos.x,
                        y: pos.y,
                        vx: (targetX - pos.x) * 0.001 * (attackInfo.nBulletSpeed ?? 200),
                        vy: (targetY - pos.y) * 0.001 * (attackInfo.nBulletSpeed ?? 200),
                        timer: (attackInfo.AttackAfter ?? 500) / 1000,
                    });
                }
                break;
        }
        // Rush attack
        if (attackInfo.Rush) {
            this._rushAttackEnd = tCur + this.GetOneTimeActionRemain();
            this._rushAttackIdx = attackIdx;
        }
        // Play attack sound
        this.onHitSound?.(this.TemplateId);
    }
    /** Effect attack data (for WZ visual effects) */
    _effectAttack = null;
    // ═══════════════════════════════════════════════════════════════════════════
    // OG CMob::SetBallDestPoint (0x63A130) — calculate bullet destination
    // Uses law of cosines for trajectory calculation.
    // ═══════════════════════════════════════════════════════════════════════════
    SetBallDestPoint(startX, startY, targetX, targetY) {
        // Simplified trajectory — aim at target
        return { x: targetX, y: targetY };
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // OG CMob::OnBomb (0x650EC0) — handle bomb explosion
    // ═══════════════════════════════════════════════════════════════════════════
    OnBomb() {
        // Time bomb explosion — area damage
        this._dead = true;
        this._suspended = 2;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // OG CMob::UpdateTimeBomb (0x643C30) — update time bomb countdown
    // ═══════════════════════════════════════════════════════════════════════════
    _timeBombTime = 0;
    UpdateTimeBomb(dt) {
        if (this._timeBombTime <= 0)
            return;
        this._timeBombTime -= dt * 1000;
        if (this._timeBombTime <= 0) {
            this.OnBomb();
        }
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // OG CMob::OnDoomed (0x64ED40) — doom transformation
    // Replaces template with doom template, reloads move ability.
    // ═══════════════════════════════════════════════════════════════════════════
    _doomTemplateId = 0;
    OnDoomed(doomTemplateId) {
        this._doomTemplateId = doomTemplateId;
        // OG: stores m_pTemplateByDoom, reloads move ability, recreates VecCtrl
        // In our TS: we track the doom template ID and use GetCurTemplate()
    }
    /** Get current template (doom overrides normal) */
    GetCurTemplateId() {
        return this._doomTemplateId || this.TemplateId;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // OG CMob::ShowAffectedSkill (0x64EF30, 0x10CE bytes)
    // Render affected skill visual effects.
    // ═══════════════════════════════════════════════════════════════════════════
    ShowAffectedSkill(skillId, duration) {
        // OG: creates WZ layer for skill icon/animation
        // Simplified: just track the entry
        this.OnAffected(skillId, duration, performance.now());
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // OG CMob::UpdateAffectedSkillList (0x64A500, 0x652 bytes)
    // Update affected skill timers, remove expired entries.
    // ═══════════════════════════════════════════════════════════════════════════
    UpdateAffectedSkillList(now) {
        for (let i = this._affectedSkills.length - 1; i >= 0; i--) {
            if (this._affectedSkills[i].startTime <= now && this._affectedSkills[i].startTime !== 1) {
                this._affectedSkills.splice(i, 1);
            }
        }
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // OG CMob::ShowEffectByItem (0x63B2D0) — show item-based effect
    // ═══════════════════════════════════════════════════════════════════════════
    ShowEffectByItem(itemId) {
        // OG: decodes item ID, plays effect from WZ
        // Simplified: just track the effect
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // OG CMob::OnCatchEffect (0x63CD00) — handle catch effect from server
    // ═══════════════════════════════════════════════════════════════════════════
    OnCatchEffect() {
        // OG: shows catch animation on mob
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // OG CMob::OnEffectByItem (0x63CD40) — handle item effect from server
    // ═══════════════════════════════════════════════════════════════════════════
    OnEffectByItem() {
        // OG: handles item-based effect packet
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // OG CMob::OnEscortStopEndPermmision — escort stop permission
    // ═══════════════════════════════════════════════════════════════════════════
    OnEscortStopEndPermmision() {
        // Escort system — placeholder
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // OG CMob::OnEscortFullPath (0x643D90) — handle escort full path
    // ═══════════════════════════════════════════════════════════════════════════
    OnEscortFullPath() {
        // Escort system — placeholder
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // OG CMob::OnEscortReturnBefore (0x649410) — handle escort return
    // ═══════════════════════════════════════════════════════════════════════════
    OnEscortReturnBefore() {
        // Escort system — placeholder
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // OG CMob::OnEscortStopSay (0x64C500) — handle escort dialog
    // ═══════════════════════════════════════════════════════════════════════════
    OnEscortStopSay() {
        // Escort system — placeholder
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // OG CMob::OnSuspendReset — suspend/resume control flow
    // ═══════════════════════════════════════════════════════════════════════════
    OnSuspendReset(newSuspended) {
        this._suspended = newSuspended;
        if (newSuspended === 0) {
            // Resume — reset controllers
            this._mobCtrlState = -1;
        }
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // OG CMob::OnNextAttack (0x6528A0) — handle next attack notification
    // ═══════════════════════════════════════════════════════════════════════════
    OnNextAttack() {
        // Server tells mob to prepare next attack
        this._attackReady = true;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // OG CMob::OnMobAttackedByMob (0x6436A0) — mob-vs-mob damage
    // ═══════════════════════════════════════════════════════════════════════════
    OnMobAttackedByMob(attackerId, damage) {
        // Simplified mob-vs-mob damage
        if (damage > 0) {
            this.Hp = Math.max(0, this.Hp - damage);
            this._showLabel = true;
            this.ShowDamage(damage, false, false);
            if (this.Hp <= 0)
                this.OnDie();
        }
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // Anger gauge system (placeholder)
    // ═══════════════════════════════════════════════════════════════════════════
    _angerGauge = 0;
    _angerGaugeMax = 10;
    InitAngerGaugeData() {
        this._angerGauge = 0;
    }
    SetAngerGauge(count) {
        this._angerGauge = Math.min(this._angerGaugeMax, Math.max(0, count));
    }
    GetAngerGauge() {
        return this._angerGauge;
    }
    AngerGaugeFullChargeEffect() {
        // Full anger gauge visual effect
    }
    /** OG CMob::ClearEscortInfo — clears escort state */
    ClearEscortInfo() { this._escortState = 0; }
    /** OG CMob::TryPickUpDrop — mob tries to pick up a drop */
    TryPickUpDrop() { }
    /**
     * OG CMob::ProcessAttack (0x652950)
     * Process pending attacks each frame. Handles melee, bullet, and area attack types.
     * @param currentTime - current game time in ms
     * @param localUserBodyRect - local player's body rect for intersection checks
     * @param onDamage - callback when attack hits: (targetId, attackIdx, direction)
     */
    ProcessAttack(currentTime, localUserBodyRect, onDamage) {
        // OG guard checks: bNotAttack, suspended, our team, same phase, dazzle, disable
        if (this._info?.NotAttack)
            return;
        if (this._suspended !== 0 && this._suspended !== 3)
            return;
        if (this.IsMobOurTeam())
            return;
        if (!this.IsSamePhaseWithMe())
            return;
        if (this.Stat.nDazzle_ > 0 && !this.IsDazzledMobByMe())
            return;
        if (this._info?.Disable)
            return;
        // Process attack entries
        for (let i = this._attackEntries.length - 1; i >= 0; i--) {
            const entry = this._attackEntries[i];
            if (currentTime < entry.tTime)
                continue; // not ready yet
            const attackIdx = entry.nAttackIdx;
            const direction = entry.bLeft ? -1 : 1;
            // Screen tremble for bTremble attacks (simplified — check attack info)
            // OG: if (pInfo && pInfo->bTremble) Effect_Tremble(30.0, ...)
            switch (entry.nType) {
                case 0: // Melee rect attack
                    // OG: rush attack check
                    if (this._rushAttackEnd > 0 && currentTime < this._rushAttackEnd) {
                        // Rush attack in progress — continue moving toward target
                        break;
                    }
                    // Check intersection with local user
                    if (localUserBodyRect && this._rectsIntersect(entry.rcRange, localUserBodyRect)) {
                        if (!this.IsNotEnemyMob()) {
                            onDamage?.(-1, attackIdx, direction); // -1 = local player
                        }
                    }
                    break;
                case 3: // Area rect attack
                case 4: // Area rect attack (variant)
                    // OG: IntersectRect with local user
                    if (localUserBodyRect && this._rectsIntersect(entry.rcRange, localUserBodyRect)) {
                        if (!this.IsNotEnemyMob()) {
                            onDamage?.(-1, attackIdx, direction);
                        }
                    }
                    // OG: also damages mobs in range (mob-vs-mob)
                    // TODO: check other mobs in range
                    break;
                default:
                    // Type 1 (target) and Type 2 (bullet) — simplified
                    if (localUserBodyRect && this._rectsIntersect(entry.rcRange, localUserBodyRect)) {
                        if (!this.IsNotEnemyMob()) {
                            onDamage?.(-1, attackIdx, direction);
                        }
                    }
                    break;
            }
            // Remove processed entry
            this._attackEntries.splice(i, 1);
        }
    }
    /** Add an attack entry to be processed */
    AddAttackEntry(entry) {
        this._attackEntries.push(entry);
    }
    /** Simple rect intersection test */
    _rectsIntersect(a, b) {
        return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    }
    /** OG CMob::CheckDamagedByMob — checks if mob can be damaged by other mobs */
    CheckDamagedByMob() { return this.DamagedByMob; }
    // ──────────────────────────────────────────────────────────────────────────
    // OG CMob stat/damage methods — added from IDA decompilation
    // ──────────────────────────────────────────────────────────────────────────
    /** OG CMob::OnStatSet (0x652680) — processes stat changes from server */
    OnStatSet(statFlags, statValues) {
        for (let i = 0; i < statFlags.length && i < statValues.length; i++) {
            const flag = statFlags[i];
            const value = statValues[i];
            switch (flag) {
                case 0:
                    this.Stat.nPAD = value;
                    break;
                case 1:
                    this.Stat.nPDR = value;
                    break;
                case 2:
                    this.Stat.nMAD = value;
                    break;
                case 3:
                    this.Stat.nMDR = value;
                    break;
                case 4:
                    this.Stat.nACC = value;
                    break;
                case 5:
                    this.Stat.nEVA = value;
                    break;
                case 6:
                    this.Stat.nSpeed = value;
                    break;
                case 7:
                    this.Stat.tStun_ = value;
                    break;
                case 8:
                    this.Stat.tFreeze_ = value;
                    break;
                case 9:
                    this.Stat.tPoison_ = value;
                    break;
                case 10:
                    this.Stat.tSeal_ = value;
                    break;
                case 11:
                    this.Stat.tDarkness_ = value;
                    break;
                case 16:
                    this.Stat.tDoom_ = value;
                    break;
                case 17:
                    this.Stat.nSpeed_ = value;
                    break;
                case 21:
                    this.Stat.nDazzle_ = value;
                    break;
            }
        }
        this._applyStatEffects();
    }
    /** OG CMob::OnStatReset (0x652780) — resets stat changes from server */
    OnStatReset(statFlags) {
        for (const flag of statFlags) {
            switch (flag) {
                case 7:
                    this.Stat.tStun_ = 0;
                    break;
                case 8:
                    this.Stat.tFreeze_ = 0;
                    break;
                case 9:
                    this.Stat.tPoison_ = 0;
                    break;
                case 10:
                    this.Stat.tSeal_ = 0;
                    break;
                case 11:
                    this.Stat.tDarkness_ = 0;
                    break;
                case 16:
                    this.Stat.tDoom_ = 0;
                    break;
                case 17:
                    this.Stat.nSpeed_ = 0;
                    break;
                case 21:
                    this.Stat.nDazzle_ = 0;
                    break;
            }
        }
        this._applyStatEffects();
    }
    /** Apply visual effects based on current stat state */
    _applyStatEffects() {
        if (this.Stat.IsStunned) {
            this.SetStatusBadge('stun', 'Stun', 8);
        }
        else {
            this.ClearStatusBadge('stun');
        }
        if (this.Stat.IsFrozen) {
            this.SetStatusBadge('freeze', 'Frz', 8);
        }
        else {
            this.ClearStatusBadge('freeze');
        }
        if (this.Stat.IsDoomed) {
            this.SetStatusBadge('doom', 'Doom', 8);
        }
        else {
            this.ClearStatusBadge('doom');
        }
        if (this.Stat.nDazzle_ > 0) {
            this.SetStatusBadge('dazzle', 'Dzl', 8);
        }
        else {
            this.ClearStatusBadge('dazzle');
        }
    }
    /** OG CMob::AnimateAngerIndicator — animates anger gauge fill effect */
    AnimateAngerIndicator() { }
    /** OG CMob::ChangeAngerIndicator — changes anger indicator appearance */
    ChangeAngerIndicator(_angerLevel) { }
    /** OG CMob::CreateAngerIndicator — creates anger gauge UI element */
    CreateAngerIndicator() { }
    /** OG CMob::GetOneTimeActionRemain (0x63E6D0) — returns remaining time for one-time action */
    GetOneTimeActionRemain() {
        if (this._nOneTimeAction < 0)
            return 0;
        return Math.max(0, this._tHitExpire - Date.now());
    }
    /** OG CMob::OnResolveMoveAction (0x63CAF0) — resolves move action from direction and nMoveAbility */
    OnResolveMoveAction(inputX, nCurMoveAction, isOnLadder, isOnRope, hasFoothold) {
        const moveAbility = this._info?.MoveAbility ?? 1;
        const hasMGuardUp = this.Stat.HasMGuardUp;
        const actionBase = hasMGuardUp ? 16 : 1;
        switch (moveAbility) {
            case 0: // Immovable — always face, action 4
                return (inputX < 0 ? 1 : 0) | 4;
            case 1: // Walk
                if (!inputX)
                    return (nCurMoveAction & 1) | 4;
                return (inputX < 0 ? 1 : 0) | (2 * actionBase);
            case 3: // Jump
                if (!hasFoothold) {
                    if (!inputX)
                        return (nCurMoveAction & 1) | 6;
                    return (inputX < 0 ? 1 : 0) | 6;
                }
                if (!inputX)
                    return (nCurMoveAction & 1) | 4;
                return (inputX < 0 ? 1 : 0) | (2 * actionBase);
            case 4: // Fly
                if (!inputX)
                    return (nCurMoveAction & 1) | (2 * (hasMGuardUp ? 16 : 6));
                return (inputX < 0 ? 1 : 0) | (2 * (hasMGuardUp ? 16 : 6));
            case 6: // Walk/Fly hybrid
                if (hasFoothold) {
                    if (inputX)
                        return (inputX < 0 ? 1 : 0) | 2;
                    return (nCurMoveAction & 1) | 4;
                }
                else if (isOnLadder || isOnRope) {
                    if (inputX)
                        return (inputX < 0 ? 1 : 0) | 0x10;
                    return (nCurMoveAction & 1) | 0x10;
                }
                else {
                    if (inputX)
                        return (inputX < 0 ? 1 : 0) | 6;
                    return (nCurMoveAction & 1) | 6;
                }
            default:
                return 0;
        }
    }
    Update(dt) {
        // OG: play die sound once on death
        if (this._playDieSound) {
            this._playDieSound = false;
            this.onDieSound?.(this.TemplateId);
        }
        if (this._hitFlash > 0)
            this._hitFlash = Math.max(0, this._hitFlash - dt);
        if (this._speechTimer > 0) {
            this._speechTimer -= dt;
            if (this._speechTimer <= 0)
                this._speechText = '';
        }
        for (const [key, badge] of this._statusBadges) {
            badge.timer -= dt;
            if (badge.timer <= 0)
                this._statusBadges.delete(key);
        }
        // Update damage numbers
        for (let i = this._damageNumbers.length - 1; i >= 0; i--) {
            const d = this._damageNumbers[i];
            d.timer -= dt;
            d.y -= 40 * dt; // float upward
            if (d.timer <= 0)
                this._damageNumbers.splice(i, 1);
        }
        // Death fade-out: after die animation completes, fade over 500ms
        if (this._dead) {
            if (this._fadeTimer > 0) {
                this._fadeTimer -= dt;
                this.container.alpha = Math.max(0, this._fadeTimer / 0.5);
                if (this._fadeTimer <= 0) {
                    this.container.visible = false;
                    this._fadeTimer = -1; // mark fade complete
                }
            }
            else if (this._fadeTimer === 0) {
                // Die animation completed but no fade started (no die anim loaded) — start fade
                this._fadeTimer = 0.5;
            }
        }
        // Move path interpolation — step through path elements over their elapse times
        if (this._movePathElements.length > 0 && this._movePathIndex < this._movePathElements.length) {
            const el = this._movePathElements[this._movePathIndex];
            const elapse = (el.elapse ?? 250) / 1000; // convert ms to seconds, default 250ms
            this._movePathTimer += dt;
            if (this._movePathTimer >= elapse) {
                this._movePathTimer -= elapse;
                this._movePathIndex++;
                if (this._movePathIndex < this._movePathElements.length) {
                    const nextEl = this._movePathElements[this._movePathIndex];
                    this.Position = { x: nextEl.x, y: nextEl.y };
                }
            }
            else {
                // Interpolate between current and next element
                const t = this._movePathTimer / elapse;
                const nextIdx = Math.min(this._movePathIndex + 1, this._movePathElements.length - 1);
                const curr = this._movePathElements[this._movePathIndex];
                const next = this._movePathElements[nextIdx];
                this.Position = {
                    x: curr.x + (next.x - curr.x) * t,
                    y: curr.y + (next.y - curr.y) * t,
                };
            }
        }
        else if (this._movePathElements.length > 0) {
            // Path complete — snap to final position
            const lastEl = this._movePathElements[this._movePathElements.length - 1];
            this.Position = { x: lastEl.x, y: lastEl.y };
            this._movePathElements = [];
            this._movePathIndex = 0;
            this._movePathTimer = 0;
        }
        // Update mob stat timers
        this.Stat.Update(dt);
        // Update affected skill effects
        const now = performance.now();
        for (let i = this._affectedSkills.length - 1; i >= 0; i--) {
            if (this._affectedSkills[i].startTime <= now && this._affectedSkills[i].startTime !== 1) {
                this._affectedSkills.splice(i, 1);
            }
        }
        // Update bullets
        for (let i = this._bullets.length - 1; i >= 0; i--) {
            const b = this._bullets[i];
            b.timer -= dt;
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            if (b.timer <= 0)
                this._bullets.splice(i, 1);
        }
        // Stat-based visual state overrides
        if (this.Stat.IsStunned) {
            this.SetState(MobState.Stand); // Stunned mobs stand still
        }
        else if (this.Stat.IsFrozen) {
            this.SetState(MobState.Stand); // Frozen mobs stand still
        }
        else if (this.Stat.IsDoomed && this.TemplateId !== 0) {
            // Doom changes appearance — handled by server via template swap
        }
        const frames = this._anims.get(this._curState);
        if (!frames || frames.length === 0)
            return;
        if (this._frame >= frames.length)
            this._frame = 0;
        let delayMs = frames[this._frame].delayMs;
        if (delayMs <= 0)
            delayMs = 150;
        this._frameTimer += dt * 1000;
        if (this._frameTimer >= delayMs) {
            this._frameTimer -= delayMs;
            this._frame++;
            // OG SetFrameInfo: apply per-frame data when frame changes
            const curFrame = frames[this._frame % frames.length];
            if (curFrame.frame) {
                this.SetFrameInfo(curFrame.frame);
            }
            if (this._frame >= frames.length) {
                if (this._curState === MobState.Die || this._curState === MobState.Die2
                    || this._curState === MobState.Die3 || this._curState === MobState.DieF) {
                    this._dead = true;
                    this._fadeTimer = 0.5; // 500ms fade-out after die animation
                    return;
                }
                // OG: one-time actions (hit, attack, skill) return to stand when done
                if (this._curState === MobState.Hit || this._curState === MobState.Hit2
                    || this._curState === MobState.Hit3 || this._curState === MobState.HitF
                    || this._curState === MobState.Attack || this._curState === MobState.Attack2
                    || this._curState === MobState.Attack3 || this._curState === MobState.Attack4
                    || this._curState === MobState.Attack5 || this._curState === MobState.Attack6
                    || this._curState === MobState.Attack7 || this._curState === MobState.Attack8
                    || this._curState === MobState.Skill1 || this._curState === MobState.Skill2
                    || this._curState === MobState.Skill3 || this._curState === MobState.Skill4
                    || this._curState === MobState.Skill5 || this._curState === MobState.Skill6
                    || this._curState === MobState.Skill7 || this._curState === MobState.Skill8) {
                    this._nOneTimeAction = -1;
                    this.SetState(MobState.Stand);
                }
                else {
                    this._frame = 0;
                }
            }
        }
        this._updateDisplay();
    }
    _updateDisplay() {
        // Check if anything visual changed
        const changed = this._curState !== this._lastState
            || this._frame !== this._lastFrame
            || this._facingLeft !== this._lastFacing
            || this._hitFlash !== this._lastHitFlash
            || this._statusBadges.size !== this._lastBadgeCount
            || this._speechText !== this._lastSpeech
            || this.Hp !== this._lastHp
            || this.MaxHp !== this._lastMaxHp
            || this._hpIndicatorVisible !== this._lastHpIndicatorVisible
            || this._hpIndicatorPct !== this._lastHpIndicatorPct
            || this._showLabel !== this._lastShowLabel;
        if (!changed)
            return;
        this._lastState = this._curState;
        this._lastFrame = this._frame;
        this._lastFacing = this._facingLeft;
        this._lastHitFlash = this._hitFlash;
        this._lastBadgeCount = this._statusBadges.size;
        this._lastSpeech = this._speechText;
        this._lastHp = this.Hp;
        this._lastMaxHp = this.MaxHp;
        this._lastHpIndicatorVisible = this._hpIndicatorVisible;
        this._lastHpIndicatorPct = this._hpIndicatorPct;
        this._lastShowLabel = this._showLabel;
        this._rebuildDisplay();
    }
    _rebuildDisplay() {
        this.container.removeChildren();
        const frames = this._anims.get(this._curState);
        const flip = this._facingLeft;
        if (this._loaded && frames && frames.length > 0) {
            const { sprite } = frames[Math.min(this._frame, frames.length - 1)];
            // Cache sprite top for HP bar / name tag positioning
            this._spriteTopY = -(sprite.OriginY ?? 0);
            if (!this._bodySprite) {
                this._bodySprite = new Sprite(sprite.Texture);
                this._bodySprite.anchor.set(sprite.Width > 0 ? sprite.OriginX / sprite.Width : 0, sprite.Height > 0 ? sprite.OriginY / sprite.Height : 0);
            }
            else {
                this._bodySprite.texture = sprite.Texture;
            }
            // OG: put_flip((nDoom||!bNoFlip) && !nDir) — WZ sprites face LEFT by default;
            // flip (scale.x=-1) makes them face RIGHT; no flip keeps LEFT.
            // _facingLeft=true → should face LEFT → no flip → scale.x=1
            // _facingLeft=false → should face RIGHT → flip → scale.x=-1
            this._bodySprite.scale.x = this._facingLeft ? 1 : -1;
            // OG: hit flash is NOT a tint — it's a brief hit animation via ShowHitEffect.
            // The tint stays white; the visual "flash" comes from switching to a HitN state.
            this._bodySprite.tint = 0xffffff;
            // OG SetFrameInfo: per-frame offset and alpha
            this._bodySprite.x = this._curFrameOffsetX;
            this.container.alpha = this._curFrameAlpha / 255;
            this.container.addChild(this._bodySprite);
        }
        else {
            if (!this._placeholderGfx) {
                const hue = Math.floor(this.TemplateId / 100) % 6;
                const colors = [0xb43c3c, 0x3cb43c, 0x3c3cb4, 0xb48c28, 0x8c28b4, 0x28a0b4];
                this._placeholderGfx = new Graphics();
                this._placeholderGfx.rect(-20, -50, 40, 50).fill({ color: colors[hue], alpha: 0.78 });
            }
            this.container.addChild(this._placeholderGfx);
        }
        if (this._showLabel) {
            this._drawHpBar();
            this._addNameTag();
        }
        this._drawBadges();
        this._drawSpeechBubble();
        this._drawDamageNumbers();
        this._drawHPIndicator();
    }
    _drawBadges() {
        if (this._statusBadges.size === 0)
            return;
        if (!this._badgeContainer)
            this._badgeContainer = new Container();
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
    _addNameTag() {
        const name = this.nameOf(this.TemplateId);
        if (!name)
            return;
        // OG CMob::MakeNameTag — renders "Lv.XX Name" above mob
        // Font color based on level difference (OG: 3 font colors)
        const mobLevel = this._info?.Level ?? 0;
        const playerLevel = this.getPlayerLevel?.() ?? 0;
        const displayName = mobLevel > 0 ? `Lv.${mobLevel} ${name}` : name;
        // OG: level-based font color selection
        // playerLevel + 20 <= mobLevel → FONT_BASIC_WHITE (can't see level, too high)
        // playerLevel - 20 >= mobLevel → FONT_BASIC_YELLOW (much lower, easy)
        // else → FONT_SALE_DARKRED (dangerous, similar level)
        let nameColor = 0xffffff; // default white
        if (playerLevel > 0 && mobLevel > 0) {
            if (playerLevel + 20 <= mobLevel) {
                nameColor = 0xffffff; // FONT_BASIC_WHITE — too high to see
            }
            else if (playerLevel - 20 >= mobLevel) {
                nameColor = 0xffff00; // FONT_BASIC_YELLOW — much lower
            }
            else {
                nameColor = 0xcc0000; // FONT_SALE_DARKRED — dangerous
            }
        }
        if (!this._nameText) {
            this._nameText = new Text({
                text: displayName,
                style: {
                    fontSize: 11,
                    fill: nameColor,
                    stroke: { color: '#000000', width: 2 },
                    fontFamily: 'Arial',
                },
            });
            this._nameText.anchor.set(0.5, 0);
        }
        else {
            this._nameText.text = displayName;
            this._nameText.style.fill = nameColor;
        }
        // Position: just below HP bar (HP bar at spriteTopY-30, height 10, bottom at spriteTopY-20)
        this._nameText.y = this._spriteTopY - 18;
        this.container.addChild(this._nameText);
    }
    _drawSpeechBubble() {
        if (!this._speechText)
            return;
        const bubbleW = 140;
        const pad = 6;
        if (!this._speechLabel) {
            const textStyle = new TextStyle({ fontSize: 11, fill: '#ffffff', wordWrap: true, wordWrapWidth: bubbleW - pad * 2 });
            this._speechLabel = new Text({ text: this._speechText, style: textStyle });
            this._speechLabel.anchor.set(0.5, 0);
        }
        else {
            this._speechLabel.text = this._speechText;
        }
        const boxH = Math.max(this._speechLabel.height + pad * 2, 24);
        const boxY = -70 - 18 - boxH;
        if (!this._speechBg)
            this._speechBg = new Graphics();
        this._speechBg.clear();
        this._speechBg.roundRect(-bubbleW / 2, boxY, bubbleW, boxH, 4).fill({ color: 0x000000, alpha: 0.75 });
        this._speechBg.roundRect(-bubbleW / 2, boxY + boxH - 4, 10, 8, 2).fill({ color: 0x000000, alpha: 0.75 });
        this._speechLabel.y = boxY + pad;
        this.container.addChild(this._speechBg, this._speechLabel);
    }
    _drawDamageNumbers() {
        if (this._damageNumbers.length === 0)
            return;
        if (!this._damageContainer)
            this._damageContainer = new Container();
        this._damageContainer.removeChildren();
        for (const d of this._damageNumbers) {
            const alpha = Math.min(1, d.timer * 2); // fade out in last 0.5s
            const label = new Text({
                text: d.text,
                style: {
                    fontSize: Math.round(14 * d.scale),
                    fill: d.color,
                    fontWeight: 'bold',
                    stroke: { color: '#000000', width: 2 },
                },
            });
            label.anchor.set(0.5, 0.5);
            // Position relative to mob origin (0,0 = feet)
            label.position.set(d.x - this.Position.x, d.y - this.Position.y);
            label.alpha = alpha;
            this._damageContainer.addChild(label);
        }
        this.container.addChild(this._damageContainer);
    }
    _drawHpBar() {
        if (this.Hp < 0 || this.MaxHp <= 0)
            return;
        // OG CMob::CreateHPIndicator — canvas is 52x10 (0x34 x 0xA)
        const barW = 52;
        const barH = 10;
        const pct = Math.max(0, Math.min(1, this.Hp / this.MaxHp));
        // OG: fill width = 46 * percent / 100 (inner area is 46px wide)
        const fillW = Math.floor(46 * pct);
        const barColor = pct > 0.5 ? 0x50c850 : pct > 0.25 ? 0xdcb428 : 0xdc3c3c;
        // OG: AdjustHPIndicatorPosition — Y = bodyRect.top - mobY - 30 (30px above body top)
        const barY = this._spriteTopY - 30;
        if (!this._hpBarGfx)
            this._hpBarGfx = new Graphics();
        this._hpBarGfx.clear();
        // OG: DrawRectangle(0, 0, 52, 10, 0x000000) — black border
        this._hpBarGfx.rect(-barW / 2, barY, barW, barH).fill({ color: 0x000000 });
        // OG: DrawRectangle(1, 1, 50, 8, 0xFFFFFF) — white background
        this._hpBarGfx.rect(-barW / 2 + 1, barY + 1, 50, 8).fill({ color: 0xffffff });
        // OG: DrawRectangle(2, 2, 48, 6, 0x000000) — black inner
        this._hpBarGfx.rect(-barW / 2 + 2, barY + 2, 48, 6).fill({ color: 0x000000 });
        // OG: DrawRectangle(3, 3, fillWidth, 4, dwColor) — color fill
        if (fillW > 0) {
            this._hpBarGfx.rect(-barW / 2 + 3, barY + 3, fillW, 4).fill({ color: barColor });
        }
        // OG: DrawRectangle(3, 6, fillWidth, 1, 0xFFA040) — shadow line
        if (fillW > 0) {
            this._hpBarGfx.rect(-barW / 2 + 3, barY + 6, fillW, 1).fill({ color: 0xa06030 });
        }
        this.container.addChild(this._hpBarGfx);
    }
    _loadFrame(loader, frameNode) {
        for (const [, v] of Object.entries(frameNode.Items)) {
            if (v instanceof WzCanvas)
                return loader.Load(v);
        }
        return null;
    }
    _currentFrameSprite() {
        const frames = this._anims.get(this._curState);
        if (!frames || frames.length === 0)
            return null;
        return frames[Math.min(this._frame, frames.length - 1)].sprite;
    }
    _readDelay(node) {
        const v = node.Get('delay');
        if (typeof v === 'number')
            return v;
        if (typeof v === 'bigint')
            return Number(v);
        return 150;
    }
    /** Read per-frame animation data from WZ property node */
    _readFrameEntry(node) {
        const readNum = (key, def) => {
            const v = node.Get(key);
            if (typeof v === 'number')
                return v;
            if (typeof v === 'bigint')
                return Number(v);
            return def;
        };
        const readRect = (key) => {
            const sub = node.Get(key);
            if (sub instanceof WzProperty) {
                return {
                    left: readNum.call(null, 'left', 0), // simplified — in OG these are secure-fused
                    top: readNum.call(null, 'top', 0),
                    right: readNum.call(null, 'right', 0),
                    bottom: readNum.call(null, 'bottom', 0),
                };
            }
            return { left: 0, top: 0, right: 0, bottom: 0 };
        };
        return {
            delayMs: this._readDelay(node),
            offsetX: readNum('a0', -1),
            alpha: readNum('a1', -1),
            headX: readNum('headX', 0),
            headY: readNum('headY', 0),
            rcBody: readRect('body'),
            rcAttackBody: [], // TODO: read from WZ arcAttackOnlyBody
            rcMultiBody: [], // TODO: read from WZ arcMultiBody
        };
    }
    /** OG CMob::DrawHPIndicator — boss HP bar above mob */
    _drawHPIndicator() {
        if (!this._hpIndicatorVisible || !this.IsBoss)
            return;
        const barW = 80;
        const barH = 6;
        const pct = Math.max(0, Math.min(1, this._hpIndicatorPct / 100));
        const barY = -90;
        if (!this._hpIndicatorGfx)
            this._hpIndicatorGfx = new Graphics();
        this._hpIndicatorGfx.clear();
        // Background
        this._hpIndicatorGfx.rect(-barW / 2 - 1, barY - 1, barW + 2, barH + 2).fill({ color: 0x000000, alpha: 0.7 });
        // HP fill
        if (pct > 0) {
            this._hpIndicatorGfx.rect(-barW / 2, barY, barW * pct, barH).fill({ color: this._hpIndicatorColor });
        }
        // Border
        this._hpIndicatorGfx.rect(-barW / 2 - 1, barY - 1, barW + 2, barH + 2).stroke({ color: 0xffffff, width: 1, alpha: 0.5 });
        this.container.addChild(this._hpIndicatorGfx);
    }
}
//# sourceMappingURL=MobLook.js.map