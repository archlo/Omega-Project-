import { Container } from 'pixi.js';
import type { WzPackage } from '../wz/WzPackage.js';
import type { WzTextureLoader } from './WzTextureLoader.js';
export interface OneTimeInfo {
    pos: {
        x: number;
        y: number;
    };
    z: number;
    origin: {
        x: number;
        y: number;
    };
    flipX: boolean;
    duration: number;
}
export interface RepeatInfo {
    pos: {
        x: number;
        y: number;
    };
    z: number;
    origin: {
        x: number;
        y: number;
    };
    alpha: number;
    duration: number;
}
export interface SquibInfo {
    pos: {
        x: number;
        y: number;
    };
    z: number;
    color: {
        r: number;
        g: number;
        b: number;
    };
    duration: number;
}
/** OG: CAnimationDisplayer::ABSORBITEM (size=28, +0000..+0018) */
export interface AbsorbItemInfo {
    characterId: number;
    mobId: number;
    x: number;
    y: number;
    /** Duration of absorb animation (ms). OG reads from tStarted. */
    duration: number;
    petIndex: number;
}
/** OG: CAnimationDisplayer::CHAINLIGHTNINGINFO (size=32, +0000..+001C) */
export interface ChainLightningInfo {
    tStart: number;
    tEnd: number;
    pt: {
        x: number;
        y: number;
    };
    z: number;
    /** Path to ball UOL in Effect.wz (e.g. "ChainLightning/ball") */
    ballUOL: string;
    angle: number;
}
/** OG: CAnimationDisplayer::EXPLOSIONINFO (size=44, +0000..+0028) */
export interface ExplosionInfo {
    x: number;
    y: number;
    width: number;
    curWidth: number;
    height: number;
    curHeight: number;
    updateInterval: number;
    updateCount: number;
    updateNext: number;
    tEnd: number;
    /** WZ property nodes for each explosion frame */
    properties: unknown[];
}
/** OG: CAnimationDisplayer::FALLINGINFO (size=56) */
export interface FallingInfo {
    x: number;
    y: number;
    width: number;
    curWidth: number;
    height: number;
    curHeight: number;
    updateInterval: number;
    updateCount: number;
    updateNext: number;
    tEnd: number;
    /** Number of items to fall */
    nItemCount: number;
    /** Path to item UOL */
    itemUOL: string;
    /** Z-order offset */
    z: number;
}
/** OG: CAnimationDisplayer::FIRECRACKER (size=44, +0000..+0028) */
export interface FireCrackerInfo {
    x: number;
    y: number;
    width: number;
    curWidth: number;
    height: number;
    curHeight: number;
    updateInterval: number;
    updateCount: number;
    updateNext: number;
    tEnd: number;
    /** WZ property nodes for each firecracker frame */
    properties: unknown[];
}
/** OG: CAnimationDisplayer::FOLLOWINFO (size=96, +0000..+0058) */
export interface FollowInfo {
    /** WZ property nodes for animation frames */
    properties: unknown[];
    originX: number;
    originY: number;
    parentLayer: Container | null;
    /** World-space generation points */
    genPoints: Array<{
        x: number;
        y: number;
    }>;
    rectStart: {
        left: number;
        top: number;
        right: number;
        bottom: number;
    };
    offset0: {
        w: number;
        h: number;
    };
    offset1: {
        w: number;
        h: number;
    };
    z: number;
    tDelay: number;
    tUpdateInterval: number;
    relPos: boolean;
    emission: boolean;
    theta: number;
    noFlip: boolean;
}
/** OG: CAnimationDisplayer::FOOTHOLDINFO (size=20) */
export interface FootHoldInfo {
    /** Path to foothold animation UOL */
    footholdUOL: string;
    rect: {
        left: number;
        top: number;
        right: number;
        bottom: number;
    };
    /** Layers array (matching OG ZArray<IWzGr2DLayer>) */
    layers: Container[];
    z: number;
    updateInterval: number;
}
/** OG: CAnimationDisplayer::HOOKING_CHAIN_INFO (size=64, +0000..+003C) */
export interface HookingChainInfo {
    tEnd1: number;
    tEnd2: number;
    chainLength: number;
    stretchSpeed: number;
    characterId: number;
    mobId: number;
    ptUser: {
        x: number;
        y: number;
    };
    ptTarget: {
        x: number;
        y: number;
    };
    catchDone: boolean;
    left: boolean;
    imageUOL: string;
}
/** OG: CAnimationDisplayer::MOTIONBLURINFO (size=32, +0000..+0018) */
export interface MotionBlurInfo {
    tDelay: number;
    tUpdateInterval: number;
    alpha: number;
}
/** OG: CAnimationDisplayer::NEWYEARINFO (size=52, +0000..+0030) */
export interface NewYearInfo {
    x: number;
    y: number;
    width: number;
    curWidth: number;
    height: number;
    curHeight: number;
    updateInterval: number;
    updateCount: number;
    updateNext: number;
    tEnd: number;
    soundUOL: string;
    newYearCookie: number;
    /** WZ property for animation */
    property: unknown;
}
/** OG: CAnimationDisplayer::RESERVEDINFO (size=544) — generalized effect.
    Complex multi-phase animation with optional item-linkage that may
    drive Effect_Squib via its sub-phases. Simplified here as a timed
    container-based animation. */
export interface ReservedInfo {
    /** WZ UOL path for the effect */
    uol: string;
    /** Total duration (ms) */
    duration: number;
    /** Position offset */
    x: number;
    y: number;
}
/** OG: CAnimationDisplayer::USERSTATEINFO (size=20, +0000..+0010) */
export interface UserStateInfo {
    /** Character this state is attached to */
    characterId: number;
    /** Current effect phase: 0=start, 1=repeat, 2=end */
    nCurEffect: number;
}
/** OG: CAnimationDisplayer::FADEINFO (size=16) */
export interface FadeInfo {
    /** Duration of fade (ms) */
    duration: number;
    /** Target alpha (0..1) */
    targetAlpha: number;
    /** Character ID this fade applies to (0 = field-wide) */
    characterId: number;
}
export declare class AnimationDisplayer {
    private _effectWz;
    private _oneTime;
    private _repeat;
    private _squib;
    private _reserved;
    private _absorbItem;
    private _falling;
    private _explosion;
    private _chainlightning;
    private _hookingChain;
    private _fireCracker;
    private _newYear;
    private _follow;
    private _motionBlur;
    private _fade;
    private _userState;
    private _footHold;
    private _prepare;
    private _chainlightningMap;
    private _centerOrigin;
    private _localFadeLayer;
    private _localFadeAlpha;
    constructor(effectWz: WzPackage | null);
    get container(): Container;
    private _addChildAll;
    Update(dt: number): void;
    /** OG: CAnimationDisplayer::NonFieldUpdate (0x45B6C0) — update when not
        on a field (e.g. cash shop, login). Only processes non-field effects. */
    NonFieldUpdate(dt: number): void;
    /** OG: CAnimationDisplayer::UpdateBeforeUserUpdate (0x4498C0) — update
        effects that need to render before user sprites (e.g. behind-user
        follow effects). Called before the user draw pass. */
    UpdateBeforeUserUpdate(_dt: number): void;
    private _updateEffects;
    private _updateReserved;
    private _updateAbsorbItem;
    private _updateFalling;
    private _updateExplosion;
    private _updateChainlightning;
    private _updateHookingChain;
    private _updateFireCracker;
    private _updateNewYear;
    private _updateFollow;
    private _updateMotionBlur;
    private _updateFade;
    private _updateUserState;
    private _updateFootHold;
    /** OG: RegisterOneTimeAnimation (0x444410) */
    RegisterOneTimeAnimation(info: OneTimeInfo, loader: WzTextureLoader): void;
    /** OG: RegisterRepeatAnimation (0x444620) */
    RegisterRepeatAnimation(info: RepeatInfo, loader: WzTextureLoader): void;
    /** OG: RegisterAbsorbItemAnimation (0x4446B0) */
    RegisterAbsorbItemAnimation(info: AbsorbItemInfo, loader: WzTextureLoader): void;
    /** OG: RegisterFadeInOutAnimation (0x444770) */
    RegisterFadeInOutAnimation(characterId: number, duration: number, _targetAlpha: number, _startAlpha: number, _flags: number): void;
    /** OG: RegisterUserStateAnimation (0x444D30) */
    RegisterUserStateAnimation(characterId: number, startLayer: Container | null, repeatLayer: Container | null, endLayer: Container | null, _flags: number): void;
    /** OG: RegisterExplosionAnimation (0x45A1D0) */
    RegisterExplosionAnimation(info: ExplosionInfo, loader: WzTextureLoader): void;
    /** OG: RegisterFallingAnimation (0x459B40) */
    RegisterFallingAnimation(info: FallingInfo, loader: WzTextureLoader): void;
    /** OG: RegisterFireCrackerAnimation (0x45A6E0) */
    RegisterFireCrackerAnimation(info: FireCrackerInfo, loader: WzTextureLoader): void;
    /** OG: RegisterNewYearAnimation (0x4556F0) */
    RegisterNewYearAnimation(info: NewYearInfo, loader: WzTextureLoader): void;
    /** OG: RegisterFollowAnimation (0x45AC50) */
    RegisterFollowAnimation(info: FollowInfo, _loader: WzTextureLoader): void;
    /** OG: RegisterMotionBlurAnimation (0x45AD00) */
    RegisterMotionBlurAnimation(overlay: Container, layers: Container[], _delay: number, _updateInterval: number, alpha: number): void;
    /** OG: RegisterBulletAnimation (0x455410) */
    RegisterBulletAnimation(_nWeaponItemID: number, _nBulletDelay: number, _ptFrom: {
        x: number;
        y: number;
    }, _ptTo: {
        x: number;
        y: number;
    }, _pOrigin: unknown, _z: number, _sBallUOL: string, _nLayer: number, _nEffect: number): void;
    /** OG: RegisterMagicBulletAnimation (0x455570) */
    RegisterMagicBulletAnimation(_nWeaponItemID: number, _nBulletDelay: number, _ptFrom: {
        x: number;
        y: number;
    }, _ptTo: {
        x: number;
        y: number;
    }, _pOrigin: unknown, _z: number, _sBallUOL: string, _nAngle: number): void;
    /** OG: RegisterMobBulletAnimation (0x455B10) */
    RegisterMobBulletAnimation(_mobId: number, _nBulletDelay: number, _ptFrom: {
        x: number;
        y: number;
    }, _ptTo: {
        x: number;
        y: number;
    }, _pOrigin: unknown, _z: number, _nItemId: number, _sBallUOL: string, _nAngle: number): void;
    /** OG: RegisterMobSwallowAnimation (0x4559B0) */
    RegisterMobSwallowAnimation(_mobId: number, _nBulletDelay: number, _ptFrom: {
        x: number;
        y: number;
    }, _ptTo: {
        x: number;
        y: number;
    }, _pOrigin: unknown, _z: number, _pCanvas: unknown, _nAngle: number): void;
    /** OG: RegisterChainlightningAnimation (0x45D1B0) */
    RegisterChainlightningAnimation(info: ChainLightningInfo): void;
    /** OG: RegisterHookingChainAnimation (0x45CBD0) */
    RegisterHookingChainAnimation(info: HookingChainInfo): void;
    /** OG: RegisterTeslacoilAnimation (0x45D650) */
    RegisterTeslacoilAnimation(_casterId: number, _mobId: number, _ptFrom: {
        x: number;
        y: number;
    }, _ptTo: {
        x: number;
        y: number;
    }, _z: number, _sBallUOL: string, _delay: number): void;
    /** OG: RegisterPrepareAnimation (0x45B420) — keyed by characterId in m_mPrepare */
    RegisterPrepareAnimation(characterId: number, layers: Container[], keyLayer: Container): void;
    /** OG: RegisterReservedAnimation — generalized reserved effect */
    RegisterReservedAnimation(info: ReservedInfo, _loader: WzTextureLoader): void;
    /** OG: RemoveAll (0x4415A0) */
    RemoveAll(): void;
    /** OG: RemoveAllFadeInAnimation (0x441550) */
    RemoveAllFadeInAnimation(characterId: number): void;
    /** OG: RemovePrepareAnimation (0x441B50) */
    RemovePrepareAnimation(characterId: number): void;
    /** OG: RemoveTeslacoilAnimation (0x441C00) */
    RemoveTeslacoilAnimation(_characterId: number): void;
    private _removeAll;
    private _removeAllReserved;
    private _removeAllAbsorbItem;
    private _removeAllFalling;
    private _removeAllExplosion;
    private _removeAllChainlightning;
    private _removeAllHookingChain;
    private _removeAllFireCracker;
    private _removeAllNewYear;
    private _removeAllFollow;
    private _removeAllMotionBlur;
    private _removeAllFade;
    private _removeAllUserState;
    private _removeAllFootHold;
    /** OG: Effect_General (0x455D10) — generic one-shot WZ effect */
    EffectGeneral(info: OneTimeInfo, path: string, loader: WzTextureLoader): void;
    /** OG: Effect_SkillUse (0x459100) — skill cast effect */
    EffectSkillUse(info: OneTimeInfo, skillPath: string, loader: WzTextureLoader): void;
    /** OG: Effect_SkillPrepare (0x45B840) — skill prepare/charging effect */
    EffectSkillPrepare(info: OneTimeInfo, skillPath: string, loader: WzTextureLoader): void;
    /** OG: Effect_SkillBookUsed (0x4581B0) */
    EffectSkillBookUsed(info: OneTimeInfo, loader: WzTextureLoader): void;
    /** OG: Effect_Miss (0x449A50) */
    EffectMiss(info: OneTimeInfo, loader: WzTextureLoader): void;
    /** OG: Effect_Guard (0x4498E0) */
    EffectGuard(info: OneTimeInfo, loader: WzTextureLoader): void;
    /** OG: Effect_Tremble (0x439A70) — camera shake */
    EffectTremble(info: OneTimeInfo): void;
    /** OG: Effect_HP (0x444EB0) — HP/damage number display */
    EffectHP(type: number, pos: {
        x: number;
        y: number;
    }, loader: WzTextureLoader): void;
    /** OG: Effect_BasicFloat (0x446530) — floating text/number */
    EffectBasicFloat(x: number, y: number, _canvas: unknown): void;
    /** OG: Effect_Squib (0x455F30) — ink splat / hit splat */
    EffectSquib(info: SquibInfo, loader: WzTextureLoader): void;
    /** OG: Effect_Catch (0x44FDB0) — catch/pet pickup animation */
    EffectCatch(info: OneTimeInfo, loader: WzTextureLoader): void;
    /** OG: Effect_ByItem (0x44F330) — item-specific effect */
    EffectByItem(info: OneTimeInfo, itemId: number, loader: WzTextureLoader): void;
    /** OG: Effect_Quest (0x459410) — quest completion effect */
    EffectQuest(info: OneTimeInfo, loader: WzTextureLoader): void;
    /** OG: Effect_QuestDeliveryItemUse (0x459530) */
    EffectQuestDeliveryItemUse(info: OneTimeInfo, loader: WzTextureLoader): void;
    /** OG: Effect_Cool (0x44A700) — cooldown effect */
    EffectCool(info: OneTimeInfo, loader: WzTextureLoader): void;
    /** OG: Effect_BuffItemUse (0x456020) — buff item usage effect */
    EffectBuffItemUse(info: OneTimeInfo, loader: WzTextureLoader): void;
    /** OG: Effect_ItemMake (0x456F80) — item crafting effect */
    EffectItemMake(info: OneTimeInfo, loader: WzTextureLoader): void;
    /** OG: Effect_ItemUnrelease (0x456360) */
    EffectItemUnrelease(info: OneTimeInfo, loader: WzTextureLoader): void;
    /** OG: Effect_ItemUpgrade (0x4567F0) */
    EffectItemUpgrade(info: OneTimeInfo, loader: WzTextureLoader): void;
    /** OG: Effect_CashItemGachapon (0x457F30) */
    EffectCashItemGachapon(info: OneTimeInfo, loader: WzTextureLoader): void;
    /** OG: Effect_RewardRullet (0x458820) — equipment-tier preview */
    EffectRewardRullet(info: OneTimeInfo, loader: WzTextureLoader): void;
    /** OG: Effect_Vega (0x457600) */
    EffectVega(info: OneTimeInfo, loader: WzTextureLoader): void;
    /** OG: Effect_ViciousHammer (0x457210) — gold/viceous hammer effect */
    EffectViciousHammer(info: OneTimeInfo, loader: WzTextureLoader): void;
    /** OG: Effect_FullChargedAngerGauge (0x457D00) */
    EffectFullChargedAngerGauge(info: OneTimeInfo, loader: WzTextureLoader): void;
    /** OG: Effect_ApplyStartDelay (0x449BC0) — delayed start effect */
    EffectApplyStartDelay(info: OneTimeInfo, loader: WzTextureLoader): void;
    /** OG: Effect_Transformed (0x450BA0) — transformation effect */
    EffectTransformed(info: OneTimeInfo, loader: WzTextureLoader): void;
    /** OG: Effect_Reserved (0x45BF90) — generalized reserved effect */
    EffectReserved(info: OneTimeInfo, loader: WzTextureLoader): void;
    /** OG: RegisterSquibAnimation — registers a squib (hit spark) effect */
    RegisterSquibAnimation(_info: SquibInfo): void;
    /** OG: RegisterFootholdAnimation — registers foothold-related animation */
    RegisterFootholdAnimation(_footholdId: number, _info: unknown): void;
    /** OG: SetCenterOrigin (0x442E10) */
    SetCenterOrigin(x: number, y: number): void;
    /** OG: SetLocalFadeLayer (0x442870) */
    SetLocalFadeLayer(width: number, height: number): void;
    /** OG: ResetLocalFadeLayer (0x43B6F0) */
    ResetLocalFadeLayer(): void;
    /** OG: CalcTotalDelay (0x4474B0) — calculate total animation delay */
    CalcTotalDelay(_loader: WzTextureLoader): number;
    /** Get all active follow effect containers (used by character renderer) */
    GetFollowContainers(): Container[];
    /** Get all active user state containers (used by character renderer) */
    GetUserStateContainers(characterId: number): Container[];
    /** Get active motion blur containers */
    GetMotionBlurContainers(): Container[];
    /** Get active hooking chain containers */
    GetHookingChainContainers(): Container[];
    /** Get active chain lightning containers */
    GetChainLightningContainers(): Container[];
    /** Get active foot hold containers */
    GetFootHoldContainers(): Container[];
    /** Get local fade layer for field-wide fade effects */
    GetLocalFadeLayer(): Container | null;
    /** Get center origin */
    GetCenterOrigin(): {
        x: number;
        y: number;
    };
    private _playOneTime;
    private _loadLayer;
    /** Get the total number of active effects across all types */
    get ActiveCount(): number;
    /** Clear all effects */
    Clear(): void;
}
//# sourceMappingURL=AnimationDisplayer.d.ts.map