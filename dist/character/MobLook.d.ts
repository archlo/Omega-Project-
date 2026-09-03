import { Container } from 'pixi.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import type { WzPackage } from '../wz/WzPackage.js';
import { MobStat } from './MobStat.js';
import type { MobInfo } from './MobInfo.js';
declare enum MobState {
    Stand = 0,
    Move = 1,
    Attack = 2,
    Hit = 3,
    Die = 4,
    Prone = 5,
    Ladder = 6,
    Rope = 7,
    Fly = 8,
    Jump = 9,
    Fall = 10,
    Chase = 11,
    Miss = 12,
    Say = 13,
    Eye = 14,
    No = 15,
    Regen = 16,
    Bomb = 17,
    Attack2 = 18,
    Attack3 = 19,
    Attack4 = 20,
    Attack5 = 21,
    Attack6 = 22,
    Attack7 = 23,
    Attack8 = 24,
    AttackF = 25,
    Skill1 = 26,
    Skill2 = 27,
    Skill3 = 28,
    Skill4 = 29,
    Skill5 = 30,
    Skill6 = 31,
    Skill7 = 32,
    Skill8 = 33,
    Skill9 = 34,
    Skill10 = 35,
    Skill11 = 36,
    Skill12 = 37,
    Skill13 = 38,
    Skill14 = 39,
    Skill15 = 40,
    Skill16 = 41,
    Hit2 = 42,
    Hit3 = 43,
    HitF = 44,
    Die2 = 45,
    Die3 = 46,
    DieF = 47
}
/** OG CActionMan::MOBACTIONFRAMEENTRY — per-frame animation data */
export interface MobFrameEntry {
    delayMs: number;
    offsetX: number;
    alpha: number;
    headX: number;
    headY: number;
    rcBody: {
        left: number;
        top: number;
        right: number;
        bottom: number;
    };
    rcAttackBody: {
        left: number;
        top: number;
        right: number;
        bottom: number;
    }[];
    rcMultiBody: {
        left: number;
        top: number;
        right: number;
        bottom: number;
    }[];
}
/** OG CMob::ATTACKENTRY — pending attack to process */
export interface AttackEntry {
    nAttackIdx: number;
    nType: number;
    bLeft: boolean;
    tTime: number;
    rcRange: {
        left: number;
        top: number;
        right: number;
        bottom: number;
    };
}
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
export declare class MobLook {
    readonly MobId: number;
    readonly TemplateId: number;
    private _anims;
    private _curState;
    private _frame;
    private _frameTimer;
    private _facingLeft;
    private _dead;
    private _showLabel;
    private _loaded;
    get Loaded(): boolean;
    private _hitFlash;
    private _speechText;
    private _speechTimer;
    private _statusBadges;
    private _damageNumbers;
    private _damageContainer;
    private _mobCtrlState;
    private _mobCtrlSn;
    private _skillCommand;
    private _skillLevel;
    private _mp;
    private _mobChargeCount;
    private _attackReady;
    private _nDeadType;
    private _nOneTimeAction;
    private _tHitExpire;
    private _tLastHitExpire;
    _lastDamage: number;
    private _affectedSkills;
    private _bullets;
    private _angerGaugeCount;
    private _suspended;
    private _active;
    private _fadeTimer;
    private _spriteTopY;
    private _playDieSound;
    private _frozen;
    private _curFrameOffsetX;
    private _curFrameAlpha;
    private _tNextFramesRemain;
    private _tCurFrameRemain;
    private _rcBody;
    private _rcBodyFlip;
    private _rcAttackBody;
    private _rcMultiBody;
    private _attackEntries;
    private _rushAttackEnd;
    private _rushAttackIdx;
    private _moveAction;
    private _escortState;
    _movePathElements: {
        x: number;
        y: number;
        elapse?: number;
        moveAction?: number;
        foothold?: number;
    }[];
    private _movePathIndex;
    private _movePathTimer;
    get IsServerMoveActive(): boolean;
    private _lastPoisonDamage;
    private _lastVenomDamage;
    private _lastAmbushDamage;
    private _lastObstacleDamage;
    private _hpIndicatorVisible;
    private _hpIndicatorPct;
    private _hpIndicatorColor;
    private _hpIndicatorGfx;
    readonly container: Container<import("pixi.js").ContainerChild>;
    Position: {
        x: number;
        y: number;
    };
    Hp: number;
    MaxHp: number;
    MaxMp: number;
    nameOf: (id: number) => string;
    /** Callback for die sound — wired by GameStage */
    onDieSound: ((templateId: number) => void) | null;
    /** Callback for hit sound — wired by GameStage */
    onHitSound: ((templateId: number) => void) | null;
    /** Callback to get local player level — wired by GameStage */
    getPlayerLevel: (() => number) | null;
    readonly Stat: MobStat;
    IsBoss: boolean;
    DamagedByMob: boolean;
    /** OG: entity layer assignment — derived from foothold layer at spawn/move */
    Layer: number;
    /** OG CMob::m_pTemplate — template data from MobInfoService */
    _info: MobInfo | null;
    private _bodySprite;
    private _placeholderGfx;
    private _hpBarGfx;
    private _nameText;
    private _speechBg;
    private _speechLabel;
    private _badgeContainer;
    private _lastState;
    private _lastFrame;
    private _lastFacing;
    private _lastHitFlash;
    private _lastBadgeCount;
    private _lastSpeech;
    private _lastHp;
    private _lastMaxHp;
    private _lastHpIndicatorVisible;
    private _lastHpIndicatorPct;
    private _lastShowLabel;
    constructor(MobId: number, TemplateId: number);
    get IsDead(): boolean;
    get HeadPosition(): {
        x: number;
        y: number;
    };
    Load(loader: WzTextureLoader, mobWz: WzPackage | null): void;
    SetState(state: MobState): void;
    /** OG CMob::ShowHitEffect (0x64b140) — plays a brief hit animation with cooldown */
    ShowHitEffect(_nDamage?: number): void;
    /** OG CMob::OnHit (0x653110) — full 15-param hit processing from server */
    OnHit(dwCharacterId: number, nSkillID: number, nHitAction: number, bLeft: boolean, nDamage: number, bCriticalAttack: boolean, nAttackIdx: number, bChase: number, nMoveType: number, nBulletCashItemID: number, nMoveEndingPosX: number, nMoveEndingPosY: number, bMoveLeft: boolean, bZigZagDamage: boolean): void;
    Say(text: string, durationSec?: number): void;
    SetStatusBadge(key: string, text: string, durationSec?: number): void;
    ClearStatusBadge(key: string): void;
    OnDie(): void;
    /** OG CMob::ShowDamage — floating damage number with zigzag + direction offset */
    ShowDamage(nDamage: number, bCritical: boolean, bHalfHeight: boolean, zigZagDamage?: number, bAdjustHeight?: boolean): void;
    SetFacing(facingLeft: boolean): void;
    /** OG CMob::SetActive (0x640950) — toggle mob active/inactive state */
    SetActive(active: boolean): void;
    IsActive(): boolean;
    /** OG CMob::OnCtrlAck — control acknowledgment from server */
    OnCtrlAck(mobCtrlSn: number, nextAttackPossible: boolean, mp: number, skillCommand: number, skillLevel: number): void;
    /** OG CMob::OnIncMobChargeCount — mob charge count update */
    OnIncChargeCount(chargeCount: number, attackReady: boolean): void;
    /** OG CMob::OnAffected — skill effect applied to mob */
    OnAffected(skillId: number, duration: number, now: number): void;
    /** OG CMob::OnMobSpeaking — mob speech from server */
    TrySpeaking(speakInfoIdx: number, speechLineIdx: number, speakEntries?: {
        action: number;
        lines: string[];
    }[]): void;
    /** OG CMob::OnDie — death processing with die animation variants */
    OnDieComplete(dieCount: number): void;
    /** OG CMob::ShowDamage — damage number display with type variants */
    ShowDamageAdvanced(nHitAction: number, nDamage: number, bLeft: boolean, nSkillID: number, nMoveEndingPosY: number, bMagicAttack: boolean): void;
    /** OG CMob::CreateHPIndicator — boss HP bar indicator */
    CreateHPIndicator(pct: number, color: number): void;
    /** OG CMob::ShowHPIndicator — show boss HP bar */
    ShowHPIndicator(): void;
    /** OG CMob::HideHPIndicator — hide boss HP bar */
    HideHPIndicator(): void;
    /** OG CMob::GetBodyRect — body collision rectangle */
    GetBodyRect(): {
        left: number;
        top: number;
        right: number;
        bottom: number;
    };
    /** OG CMob::GetAttackBodyRect — attack collision rectangle */
    GetAttackBodyRect(): {
        left: number;
        top: number;
        right: number;
        bottom: number;
    };
    /** OG CMob::SetMoveAction — set mob animation action */
    SetMoveAction(action: number): void;
    /** OG CMob::GetCurrentAction (0x649EA0) — combines MoveAction and OneTimeAction */
    GetCurrentAction(): number;
    /** OG CMob::IsSuspended — check if mob is suspended (dead/frozen) */
    IsSuspended(): boolean;
    /** OG CMob::GetMobChargeCount */
    GetMobChargeCount(): number;
    /** OG CMob::IsAttackReady */
    IsAttackReady(): boolean;
    /** OG CMob::GetAngerGaugeCount */
    GetAngerGaugeCount(): number;
    /** OG CMob::IncAngerGauge */
    IncAngerGauge(): void;
    /** OG CMob::GetEscortState */
    GetEscortState(): number;
    /** OG CMob::SetEscortState */
    SetEscortState(state: number): void;
    /** OG CMob::GetMobID — returns secure-fused mob ID */
    GetMobID(): number;
    /** OG CMob::GetMobStat — returns pointer to MobStat */
    GetMobStat(): MobStat;
    /** OG CMob::GetTemplate — returns mob template pointer */
    /** OG CMob::GetTemplate — returns CMobTemplate (our MobInfo) */
    GetTemplate(): MobInfo | null;
    /** OG CMob::GetCurTemplate — returns current template (may differ after doom) */
    /** OG CMob::GetCurTemplate — returns template (or m_pTemplateByDoom if doomed) */
    GetCurTemplate(): MobInfo | null;
    /** OG CMob::GetMoveAbility — returns template nMoveAbility */
    /** OG CMob::GetMoveAbility — reads nMoveAbility from CMobTemplate */
    GetMoveAbility(): number;
    /** OG CMob::GetHeight — returns mob collision height from template */
    /** OG CMob::GetHeight — reads canvas height from current animation frame */
    GetHeight(): number;
    /** OG CMob::GetHalfWidth — returns mob half-width for collision */
    /** OG CMob::GetHalfWidth — reads canvas width from current frame, returns half */
    GetHalfWidth(): number;
    /** OG CMob::IsBossMob — checks template bBoss flag */
    IsBossMob(): boolean;
    /** OG CMob::IsNoFlip — checks if mob should not flip direction */
    IsNoFlip(): boolean;
    /** OG CMob::IsImmovable — checks stun/freeze/web/suspended */
    IsImmovable(): boolean;
    /** OG CMob::IsMobOurTeam — checks if mob is on player's team (PQ/CPQ) */
    IsMobOurTeam(): boolean;
    /** OG CMob::IsNotEnemyMob — checks damagedByMob or escort type or dazzle */
    IsNotEnemyMob(): boolean;
    /** OG CMob::IsNoFlip */
    IsNoFlipMob(): boolean;
    /** OG CMob::IsPosFixed — checks if nMoveAbility == 0 */
    IsPosFixed(): boolean;
    /** OG CMob::IsSamePhaseWithMe — checks if mob is in same phase as local player */
    IsSamePhaseWithMe(): boolean;
    /** OG CMob::IsChaseTargetDazzle — checks if chase target is dazzled */
    IsChaseTargetDazzle(): boolean;
    /** OG CMob::IsChaseTargetEscort — checks if chase target is escort */
    IsChaseTargetEscort(): boolean;
    /** OG CMob::IsDazzledMobByMe — checks if mob is dazzled by local player */
    IsDazzledMobByMe(): boolean;
    /** OG CMob::IsOnPlayingOneTimeAction */
    IsOnPlayingOneTimeAction(): boolean;
    /** OG CMob::IsAbleTargetEscortMob */
    IsAbleTargetEscortMob(): boolean;
    /** OG CMob::IsRisingByToss */
    IsRisingByToss(): boolean;
    /** OG CMob::IsRectIntersectWithTrapezoid */
    IsRectIntersectWithTrapezoid(_rect: unknown): boolean;
    /** OG CMob::GetActionDelay — sums tDelay across all frames for given action */
    GetActionDelay(nAction: number): number;
    /**
     * OG CMob::SetFrameInfo (0x642560, 0x843 bytes)
     * Processes per-frame animation data: offsets, alpha, body rects, head position.
     * Called from PrepareActionLayer for each frame entry.
     */
    SetFrameInfo(frame: MobFrameEntry): void;
    /** Get current attack body rects (OG: m_arcAttackBody) */
    GetAttackBodyRects(): {
        left: number;
        top: number;
        right: number;
        bottom: number;
    }[];
    /** Get current multi body rects (OG: m_arcMultiBody) */
    GetMultiBodyRects(): {
        left: number;
        top: number;
        right: number;
        bottom: number;
    }[];
    /** OG CMob::LoadMobAction (0x63b690) — loads action frames from WZ */
    LoadMobAction(nAction: number): boolean;
    private _actionFrames;
    /** OG CMob::GetPushedDamage — returns damage when mob pushes player */
    /** OG CMob::GetPushedDamage — reads nPushedDamage from template */
    GetPushedDamage(): number;
    /** OG CMob::GetRandomHitAction — returns random hit animation (7 + rand()%nHitCount) */
    GetRandomHitAction(): number;
    /** OG CMob::GetRemainDamageInfoDelay */
    GetRemainDamageInfoDelay(): number;
    /** OG CMob::CalcCrc — calculates mob CRC from template */
    CalcCrc(): number;
    /** OG CMob::GetAttackInfo — returns attack info structure */
    GetAttackInfo(): unknown;
    /** OG CMob::GetSkillInfo — returns mob skill info */
    GetSkillInfo(): unknown;
    /** OG CMob::GetVecCtrl — returns vector controller */
    GetVecCtrl(): unknown;
    /** OG CMob::GetActiveVecCtrl — returns active vector controller */
    GetActiveVecCtrl(): unknown;
    /** OG CMob::SetLayerZ (0x63ab40) — sets mob Z-layer position */
    SetLayerZ(footholdY?: number): void;
    /** OG CMob::OnLayerZChanged — called when mob changes Z-layer */
    OnLayerZChanged(): void;
    /** OG CMob::SetAffectedLayerPos — positions affected skill layers */
    SetAffectedLayerPos(): void;
    /** OG CMob::SetTimeBombTime — sets time bomb countdown */
    SetTimeBombTime(time: number): void;
    /** OG CMob::RawAction2MoveAction — converts raw action to move action */
    RawAction2MoveAction(_rawAction: number): number;
    /** OG CMob::MoveAction2RawAction — converts move action to raw action */
    MoveAction2RawAction(_moveAction: number): number;
    /** OG CMob::ShowCatchEffect — shows catch animation on mob */
    ShowCatchEffect(): void;
    /** OG CMob::ClearActionLayer — clears current action animation */
    ClearActionLayer(): void;
    private _fineActionCache;
    GetFineAction(nAction: number): number;
    DoAttack(nAction: number, bLeft: boolean, targetX: number, targetY: number): void;
    /** Effect attack data (for WZ visual effects) */
    private _effectAttack;
    SetBallDestPoint(startX: number, startY: number, targetX: number, targetY: number): {
        x: number;
        y: number;
    };
    OnBomb(): void;
    private _timeBombTime;
    UpdateTimeBomb(dt: number): void;
    private _doomTemplateId;
    OnDoomed(doomTemplateId: number): void;
    /** Get current template (doom overrides normal) */
    GetCurTemplateId(): number;
    ShowAffectedSkill(skillId: number, duration: number): void;
    UpdateAffectedSkillList(now: number): void;
    ShowEffectByItem(itemId: number): void;
    OnCatchEffect(): void;
    OnEffectByItem(): void;
    OnEscortStopEndPermmision(): void;
    OnEscortFullPath(): void;
    OnEscortReturnBefore(): void;
    OnEscortStopSay(): void;
    OnSuspendReset(newSuspended: number): void;
    OnNextAttack(): void;
    OnMobAttackedByMob(attackerId: number, damage: number): void;
    private _angerGauge;
    private _angerGaugeMax;
    InitAngerGaugeData(): void;
    SetAngerGauge(count: number): void;
    GetAngerGauge(): number;
    AngerGaugeFullChargeEffect(): void;
    /** OG CMob::ClearEscortInfo — clears escort state */
    ClearEscortInfo(): void;
    /** OG CMob::TryPickUpDrop — mob tries to pick up a drop */
    TryPickUpDrop(): void;
    /**
     * OG CMob::ProcessAttack (0x652950)
     * Process pending attacks each frame. Handles melee, bullet, and area attack types.
     * @param currentTime - current game time in ms
     * @param localUserBodyRect - local player's body rect for intersection checks
     * @param onDamage - callback when attack hits: (targetId, attackIdx, direction)
     */
    ProcessAttack(currentTime: number, localUserBodyRect: {
        left: number;
        top: number;
        right: number;
        bottom: number;
    } | null, onDamage?: (targetId: number, attackIdx: number, direction: number) => void): void;
    /** Add an attack entry to be processed */
    AddAttackEntry(entry: AttackEntry): void;
    /** Simple rect intersection test */
    private _rectsIntersect;
    /** OG CMob::CheckDamagedByMob — checks if mob can be damaged by other mobs */
    CheckDamagedByMob(): boolean;
    /** OG CMob::OnStatSet (0x652680) — processes stat changes from server */
    OnStatSet(statFlags: number[], statValues: number[]): void;
    /** OG CMob::OnStatReset (0x652780) — resets stat changes from server */
    OnStatReset(statFlags: number[]): void;
    /** Apply visual effects based on current stat state */
    private _applyStatEffects;
    /** OG CMob::AnimateAngerIndicator — animates anger gauge fill effect */
    AnimateAngerIndicator(): void;
    /** OG CMob::ChangeAngerIndicator — changes anger indicator appearance */
    ChangeAngerIndicator(_angerLevel: number): void;
    /** OG CMob::CreateAngerIndicator — creates anger gauge UI element */
    CreateAngerIndicator(): void;
    /** OG CMob::GetOneTimeActionRemain (0x63E6D0) — returns remaining time for one-time action */
    GetOneTimeActionRemain(): number;
    /** OG CMob::OnResolveMoveAction (0x63CAF0) — resolves move action from direction and nMoveAbility */
    OnResolveMoveAction(inputX: number, nCurMoveAction: number, isOnLadder: boolean, isOnRope: boolean, hasFoothold: boolean): number;
    Update(dt: number): void;
    private _updateDisplay;
    private _rebuildDisplay;
    private _drawBadges;
    private _addNameTag;
    private _drawSpeechBubble;
    private _drawDamageNumbers;
    private _drawHpBar;
    private _loadFrame;
    private _currentFrameSprite;
    private _readDelay;
    /** Read per-frame animation data from WZ property node */
    private _readFrameEntry;
    /** OG CMob::DrawHPIndicator — boss HP bar above mob */
    private _drawHPIndicator;
}
export {};
//# sourceMappingURL=MobLook.d.ts.map