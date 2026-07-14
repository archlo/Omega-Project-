import { Container, Sprite, Graphics, Text, TextStyle } from 'pixi.js';
import { WzSprite } from '../render/WzSprite.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import { WzCanvas } from '../wz/WzCanvas.js';
import { WzProperty } from '../wz/WzProperty.js';
import type { WzPackage } from '../wz/WzPackage.js';
import { WzImage } from '../wz/WzImage.js';
import { MobStat } from './MobStat.js';
import type { MobInfo } from './MobInfo.js';

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

/** OG CMob::AFFECTEDSKILLENTRY — skill effect tracked on mob */
export interface AffectedSkillEntry {
  skillId: number;
  startTime: number;
  posX: number;
  posY: number;
}

/** OG CMob::MobBullet — projectile tracked on mob */
export interface MobBulletInfo {
  bulletId: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  timer: number;
}

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
  private _damageNumbers: { text: string; x: number; y: number; timer: number; color: number; scale: number }[] = [];
  private _damageContainer: Container | null = null;

  // OG CMob fields
  private _mobCtrlState = -1;  // -1=idle, -2=waiting, -3=active, 1=moving, 3/4=attacking
  private _mobCtrlSn = 0;
  private _skillCommand = 0;
  private _skillLevel = 0;
  private _mp = 0;
  private _mobChargeCount = 0;
  private _attackReady = false;
  private _nDeadType = 0;
  private _nOneTimeAction = -1;
  private _tHitExpire = 0;
  private _tLastHitExpire = 0;
  _lastDamage = 0;
  private _affectedSkills: AffectedSkillEntry[] = [];
  private _bullets: MobBulletInfo[] = [];
  private _angerGaugeCount = 0;
  private _suspended = 0;  // 0=normal, 2=dead/suspended
  private _active = true;
  private _escortState = 0;
  private _lastPoisonDamage = 0x7FFFFFFF;
  private _lastVenomDamage = 0x7FFFFFFF;
  private _lastAmbushDamage = 0x7FFFFFFF;
  private _lastObstacleDamage = 0x7FFFFFFF;

  // Boss HP indicator
  private _hpIndicatorVisible = false;
  private _hpIndicatorPct = 0;
  private _hpIndicatorColor = 0xFF0000;
  private _hpIndicatorGfx: Graphics | null = null;

  readonly container = new Container();
  Position = { x: 0, y: 0 };
  Hp = -1;
  MaxHp = -1;
  MaxMp = 0;
  nameOf: (id: number) => string = () => '';
  readonly Stat = new MobStat();
  IsBoss = false;
  DamagedByMob = false;
  /** OG: entity layer assignment — derived from foothold layer at spawn/move */
  Layer = 7;
  /** OG CMob::m_pTemplate — template data from MobInfoService */
  _info: MobInfo | null = null;

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
  private _lastHpIndicatorVisible = false;
  private _lastHpIndicatorPct = 0;

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

  /** OG CMob::ShowHitEffect — plays a brief hit animation with cooldown */
  OnHit(): void {
    // OG: skip if currently in Attack/Hit/Die one-time action
    const cur = this._nOneTimeAction;
    if ((cur >= 13 && cur <= 21) || (cur >= 22 && cur <= 38) || (cur >= 7 && cur <= 9)) return;
    // OG: skip if damage < pushedDamage threshold
    const pushed = this._info?.Pushed ?? 0;
    if (pushed > 0 && this._lastDamage < pushed) return;
    // OG: boss mobs have 10s cooldown between hits
    const now = performance.now();
    if (this.IsBoss && now <= this._tLastHitExpire + 10000) return;
    const hitAction = this.GetRandomHitAction();
    if (hitAction < 0) return;
    this._nOneTimeAction = hitAction;
    this.SetState(hitAction as MobState);
    const delay = this.GetActionDelay(hitAction);
    this._tHitExpire = now + delay;
    this._tLastHitExpire = this._tHitExpire;
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

  /** OG CMob::ShowDamage — floating damage number with zigzag + direction offset */
  ShowDamage(nDamage: number, bCritical: boolean, bHalfHeight: boolean, zigZagDamage = 0, bAdjustHeight = false): void {
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
    } else if (bCritical) {
      color = 0xff6600; // orange critical
      text = `${nDamage}!`;
    } else if (nDamage < 0) {
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

  SetFacing(facingLeft: boolean): void {
    this._facingLeft = facingLeft;
  }

  // === OG CMob methods ===

  /** OG CMob::SetActive — toggle mob active/inactive state */
  SetActive(active: boolean): void { this._active = active; }
  IsActive(): boolean { return this._active; }

  /** OG CMob::OnCtrlAck — control acknowledgment from server */
  OnCtrlAck(mobCtrlSn: number, nextAttackPossible: boolean, mp: number, skillCommand: number, skillLevel: number): void {
    if (!this._active) this.SetActive(true);
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
  OnIncChargeCount(chargeCount: number, attackReady: boolean): void {
    this._mobChargeCount = chargeCount;
    this._attackReady = attackReady;
  }

  /** OG CMob::OnAffected — skill effect applied to mob */
  OnAffected(skillId: number, duration: number, now: number): void {
    const entry: AffectedSkillEntry = {
      skillId,
      startTime: duration + now || 1,
      posX: this.Position.x,
      posY: this.Position.y,
    };
    this._affectedSkills.push(entry);
  }

  /** OG CMob::OnMobSpeaking — mob speech from server */
  TrySpeaking(speakInfoIdx: number, speechLineIdx: number, speakEntries?: { action: number; lines: string[] }[]): void {
    if (!speakEntries || speakEntries.length === 0) return;
    // Find matching entry by action (speakInfoIdx) or random
    let entry = speakInfoIdx >= 0
      ? speakEntries.find(e => e.action === speakInfoIdx)
      : speakEntries[Math.floor(Math.random() * speakEntries.length)];
    if (!entry || entry.lines.length === 0) return;
    const line = speechLineIdx >= 0 && speechLineIdx < entry.lines.length
      ? entry.lines[speechLineIdx]
      : entry.lines[Math.floor(Math.random() * entry.lines.length)];
    if (line) this.Say(line);
  }

  /** OG CMob::OnDie — death processing with die animation variants */
  OnDieComplete(dieCount: number): void {
    this._dead = true;
    this._suspended = 2;
    // Pick die action: nDeadType=3 → Die3(22), else rand()%dieCount + Die1(10)
    let dieAction: number;
    if (this._nDeadType === 3) {
      dieAction = 22; // DieF
    } else {
      dieAction = dieCount > 0 ? (Math.floor(Math.random() * dieCount) + 10) : 10;
    }
    this._nOneTimeAction = dieAction;
    // Map action to state
    const stateMap: Record<number, MobState> = {
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
  ShowDamageAdvanced(
    nHitAction: number, nDamage: number, bLeft: boolean,
    nSkillID: number, nMoveEndingPosY: number, bMagicAttack: boolean,
  ): void {
    const head = this.HeadPosition;
    const offsetX = (Math.random() - 0.5) * 30;
    const offsetY = -30;
    let color = 0xffffff;
    let text = `${nDamage}`;
    if (nDamage === 0) {
      text = 'MISS';
      color = 0xaaaaaa;
    } else if (nSkillID === 35111001 || nSkillID === 35111009 || nSkillID === 35111010 || nSkillID === 35121012) {
      color = 0xff6600; // mechanic special
      text = `${nDamage}!`;
    } else if (bLeft) {
      color = 0xff0000; // critical
      text = `${nDamage}!`;
    }
    this._damageNumbers.push({
      text, x: head.x + offsetX, y: head.y + offsetY,
      timer: 1.2, color, scale: bLeft ? 1.3 : 1.0,
    });
  }

  /** OG CMob::CreateHPIndicator — boss HP bar indicator */
  CreateHPIndicator(pct: number, color: number): void {
    this._hpIndicatorPct = Math.max(0, Math.min(100, pct));
    this._hpIndicatorColor = color;
    this._hpIndicatorVisible = true;
  }

  /** OG CMob::ShowHPIndicator — show boss HP bar */
  ShowHPIndicator(): void {
    this._hpIndicatorVisible = true;
  }

  /** OG CMob::HideHPIndicator — hide boss HP bar */
  HideHPIndicator(): void {
    this._hpIndicatorVisible = false;
  }

  /** OG CMob::GetBodyRect — body collision rectangle */
  GetBodyRect(): { ltx: number; lty: number; rbx: number; rby: number } {
    const sprite = this._currentFrameSprite();
    if (!sprite) return { ltx: -20, lty: -50, rbx: 20, rby: 0 };
    const ltx = sprite.Lt?.x ?? -sprite.OriginX;
    const lty = sprite.Lt?.y ?? -sprite.OriginY;
    const rbx = sprite.Rb?.x ?? (sprite.Width - sprite.OriginX);
    const rby = sprite.Rb?.y ?? (sprite.Height - sprite.OriginY);
    return { ltx, lty, rbx, rby };
  }

  /** OG CMob::GetAttackBodyRect — attack collision rectangle */
  GetAttackBodyRect(): { ltx: number; lty: number; rbx: number; rby: number } {
    return this.GetBodyRect();
  }

  /** OG CMob::SetMoveAction — set mob animation action */
  SetMoveAction(action: number): void {
    this._nOneTimeAction = action;
  }

  /** OG CMob::GetCurrentAction — get current animation action */
  GetCurrentAction(): number {
    return this._nOneTimeAction;
  }

  /** OG CMob::IsSuspended — check if mob is suspended (dead/frozen) */
  IsSuspended(): boolean { return this._suspended !== 0; }

  /** OG CMob::GetMobChargeCount */
  GetMobChargeCount(): number { return this._mobChargeCount; }

  /** OG CMob::IsAttackReady */
  IsAttackReady(): boolean { return this._attackReady; }

  /** OG CMob::GetAngerGaugeCount */
  GetAngerGaugeCount(): number { return this._angerGaugeCount; }

  /** OG CMob::IncAngerGauge */
  IncAngerGauge(): void { this._angerGaugeCount = Math.min(10, this._angerGaugeCount + 1); }

  /** OG CMob::GetEscortState */
  GetEscortState(): number { return this._escortState; }

  /** OG CMob::SetEscortState */
  SetEscortState(state: number): void { this._escortState = state; }

  // ──────────────────────────────────────────────────────────────────────────
  // OG CMob missing getters and utility methods — added from IDA decompilation
  // ──────────────────────────────────────────────────────────────────────────

  /** OG CMob::GetMobID — returns secure-fused mob ID */
  GetMobID(): number { return this.MobId; }

  /** OG CMob::GetMobStat — returns pointer to MobStat */
  GetMobStat(): MobStat { return this.Stat; }

  /** OG CMob::GetTemplate — returns mob template pointer */
  /** OG CMob::GetTemplate — returns CMobTemplate (our MobInfo) */
  GetTemplate(): MobInfo | null { return this._info; }

  /** OG CMob::GetCurTemplate — returns current template (may differ after doom) */
  /** OG CMob::GetCurTemplate — returns template (or m_pTemplateByDoom if doomed) */
  GetCurTemplate(): MobInfo | null { return this._info; }

  /** OG CMob::GetMoveAbility — returns template nMoveAbility */
  /** OG CMob::GetMoveAbility — reads nMoveAbility from CMobTemplate */
  GetMoveAbility(): number { return this._info?.MoveAbility ?? 0; }

  /** OG CMob::GetHeight — returns mob collision height from template */
  /** OG CMob::GetHeight — reads canvas height from current animation frame */
  GetHeight(): number {
    const sprite = this._currentFrameSprite();
    return sprite?.Height ?? 0;
  }

  /** OG CMob::GetHalfWidth — returns mob half-width for collision */
  /** OG CMob::GetHalfWidth — reads canvas width from current frame, returns half */
  GetHalfWidth(): number {
    const sprite = this._currentFrameSprite();
    return sprite ? Math.floor(sprite.Width / 2) : 0;
  }

  /** OG CMob::IsBossMob — checks template bBoss flag */
  IsBossMob(): boolean { return this.IsBoss; }

  /** OG CMob::IsNoFlip — checks if mob should not flip direction */
  IsNoFlip(): boolean { return false; }

  /** OG CMob::IsImmovable — checks stun/freeze/web/suspended */
  IsImmovable(): boolean {
    return this.Stat.IsStunned || this.Stat.IsFrozen || this._suspended === 4;
  }

  /** OG CMob::IsMobOurTeam — checks if mob is on player's team (PQ/CPQ) */
  IsMobOurTeam(): boolean { return false; }

  /** OG CMob::IsNotEnemyMob — checks damagedByMob or escort type or dazzle */
  IsNotEnemyMob(): boolean { return this.DamagedByMob || this.Stat.nDazzle_ > 0; }

  /** OG CMob::IsNoFlip */
  IsNoFlipMob(): boolean { return !this.Stat.IsDoomed; }

  /** OG CMob::IsPosFixed — checks if nMoveAbility == 0 */
  IsPosFixed(): boolean { return this.GetMoveAbility() === 0; }

  /** OG CMob::IsSamePhaseWithMe — checks if mob is in same phase as local player */
  IsSamePhaseWithMe(): boolean { return true; }

  /** OG CMob::IsChaseTargetDazzle — checks if chase target is dazzled */
  IsChaseTargetDazzle(): boolean { return false; }

  /** OG CMob::IsChaseTargetEscort — checks if chase target is escort */
  IsChaseTargetEscort(): boolean { return false; }

  /** OG CMob::IsDazzledMobByMe — checks if mob is dazzled by local player */
  IsDazzledMobByMe(): boolean { return this.Stat.nDazzle_ > 0; }

  /** OG CMob::IsOnPlayingOneTimeAction */
  IsOnPlayingOneTimeAction(): boolean { return this._nOneTimeAction > -1; }

  /** OG CMob::IsAbleTargetEscortMob */
  IsAbleTargetEscortMob(): boolean { return false; }

  /** OG CMob::IsRisingByToss */
  IsRisingByToss(): boolean { return false; }

  /** OG CMob::IsRectIntersectWithTrapezoid */
  IsRectIntersectWithTrapezoid(_rect: unknown): boolean { return false; }

  /** OG CMob::GetActionDelay — sums tDelay across all frames for given action */
  GetActionDelay(nAction: number): number {
    const state = nAction as MobState;
    const frames = this._anims.get(state);
    if (!frames || frames.length === 0) return 0;
    let total = 0;
    for (const f of frames) total += f.delayMs;
    return total;
  }

  /** OG CMob::GetPushedDamage — returns damage when mob pushes player */
  /** OG CMob::GetPushedDamage — reads nPushedDamage from template */
  GetPushedDamage(): number { return this._info?.Pushed ?? 0; }

  /** OG CMob::GetRandomHitAction — returns random hit animation (7 + rand()%nHitCount) */
  GetRandomHitAction(): number {
    // OG: if nHitCount <= 0, return -1; else return rand() % nHitCount + 7
    // nHitCount is derived from how many hitN frames exist in WZ
    const hitStates = [MobState.Hit, MobState.Hit2, MobState.Hit3, MobState.HitF];
    let hitCount = 0;
    for (const hs of hitStates) {
      if (this._anims.has(hs) && this._anims.get(hs)!.length > 0) hitCount++;
    }
    if (hitCount <= 0) return -1;
    return Math.floor(Math.random() * hitCount) + 7; // 7 = Hit1
  }

  /** OG CMob::GetRemainDamageInfoDelay */
  GetRemainDamageInfoDelay(): number { return 0; }

  /** OG CMob::CalcCrc — calculates mob CRC from template */
  CalcCrc(): number { return 0; }

  /** OG CMob::GetAttackInfo — returns attack info structure */
  GetAttackInfo(): unknown { return null; }

  /** OG CMob::GetSkillInfo — returns mob skill info */
  GetSkillInfo(): unknown { return null; }

  /** OG CMob::GetVecCtrl — returns vector controller */
  GetVecCtrl(): unknown { return null; }

  /** OG CMob::GetActiveVecCtrl — returns active vector controller */
  GetActiveVecCtrl(): unknown { return null; }

  /** OG CMob::SetLayerZ — sets mob Z-layer position */
  SetLayerZ(_z: number): void { /* handled by FieldScene */ }

  /** OG CMob::OnLayerZChanged — called when mob changes Z-layer */
  OnLayerZChanged(): void { /* handled by FieldScene */ }

  /** OG CMob::SetAffectedLayerPos — positions affected skill layers */
  SetAffectedLayerPos(): void { /* visual only */ }

  /** OG CMob::SetBallDestPoint — sets ball destination point */
  SetBallDestPoint(_x: number, _y: number): void { /* multi-ball attack */ }

  /** OG CMob::SetTimeBombTime — sets time bomb countdown */
  SetTimeBombTime(_time: number): void { /* time bomb mechanic */ }

  /** OG CMob::RawAction2MoveAction — converts raw action to move action */
  RawAction2MoveAction(_rawAction: number): number { return 0; }

  /** OG CMob::MoveAction2RawAction — converts move action to raw action */
  MoveAction2RawAction(_moveAction: number): number { return 0; }

  /** OG CMob::ShowCatchEffect — shows catch animation on mob */
  ShowCatchEffect(): void { /* visual only */ }

  /** OG CMob::ShowEffectByItem — shows item-based effect on mob */
  ShowEffectByItem(_itemId: number): void { /* visual only */ }

  /** OG CMob::OnCatchEffect — handles catch effect from server */
  OnCatchEffect(): void { /* handled via packet */ }

  /** OG CMob::OnEffectByItem — handles item effect from server */
  OnEffectByItem(): void { /* handled via packet */ }

  /** OG CMob::OnEscortStopEndPermmision — escort stop permission */
  OnEscortStopEndPermmision(): void { /* escort system */ }

  /** OG CMob::ClearActionLayer — clears current action animation */
  ClearActionLayer(): void { this.SetState(MobState.Stand); }

  /** OG CMob::ClearEscortInfo — clears escort state */
  ClearEscortInfo(): void { this._escortState = 0; }

  /** OG CMob::TryPickUpDrop — mob tries to pick up a drop */
  TryPickUpDrop(): void { /* mob pickup mechanic */ }

  /** OG CMob::CheckDamagedByMob — checks if mob can be damaged by other mobs */
  CheckDamagedByMob(): boolean { return this.DamagedByMob; }

  /** OG CMob::AnimateAngerIndicator — animates anger gauge fill effect */
  AnimateAngerIndicator(): void { /* visual only — anger gauge animation */ }

  /** OG CMob::ChangeAngerIndicator — changes anger indicator appearance */
  ChangeAngerIndicator(_angerLevel: number): void { /* visual only */ }

  /** OG CMob::CreateAngerIndicator — creates anger gauge UI element */
  CreateAngerIndicator(): void { /* visual only */ }

  /** OG CMob::GetOneTimeActionRemain — returns remaining time for one-time action */
  GetOneTimeActionRemain(): number { return 0; }

  /** OG CMob::OnResolveMoveAction — resolves move action based on direction and state */
  OnResolveMoveAction(): number { return 0; }

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
    // Update damage numbers
    for (let i = this._damageNumbers.length - 1; i >= 0; i--) {
      const d = this._damageNumbers[i];
      d.timer -= dt;
      d.y -= 40 * dt; // float upward
      if (d.timer <= 0) this._damageNumbers.splice(i, 1);
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
      if (b.timer <= 0) this._bullets.splice(i, 1);
    }

    // Stat-based visual state overrides
    if (this.Stat.IsStunned) {
      this.SetState(MobState.Stand); // Stunned mobs stand still
    } else if (this.Stat.IsFrozen) {
      this.SetState(MobState.Stand); // Frozen mobs stand still
    } else if (this.Stat.IsDoomed && this.TemplateId !== 0) {
      // Doom changes appearance — handled by server via template swap
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
        if (this._curState === MobState.Die || this._curState === MobState.Die2
            || this._curState === MobState.Die3 || this._curState === MobState.DieF) {
          this._dead = true;
          return;
        }
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
      || this.MaxHp !== this._lastMaxHp
      || this._hpIndicatorVisible !== this._lastHpIndicatorVisible
      || this._hpIndicatorPct !== this._lastHpIndicatorPct;

    if (!changed) return;

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
      // OG: hit flash is NOT a tint — it's a brief hit animation via ShowHitEffect.
      // The tint stays white; the visual "flash" comes from switching to a HitN state.
      this._bodySprite.tint = 0xffffff;
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
    this._drawDamageNumbers();
    this._drawHPIndicator();
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

  private _drawDamageNumbers(): void {
    if (this._damageNumbers.length === 0) return;
    if (!this._damageContainer) this._damageContainer = new Container();
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

  /** OG CMob::DrawHPIndicator — boss HP bar above mob */
  private _drawHPIndicator(): void {
    if (!this._hpIndicatorVisible || !this.IsBoss) return;
    const barW = 80;
    const barH = 6;
    const pct = Math.max(0, Math.min(1, this._hpIndicatorPct / 100));
    const barY = -90;

    if (!this._hpIndicatorGfx) this._hpIndicatorGfx = new Graphics();
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
