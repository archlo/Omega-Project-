import { Sprite } from 'pixi.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import { WzPackage } from '../wz/WzPackage.js';
import { AvatarLook } from '../domain/AvatarLook.js';
import { Stance } from './Stance.js';
/** Real per-frame avatar anchor points, world-space (post mirror-flip).
    Mirrors OG's CActionFrame::Draw output points (ptNavel/ptHead/ptBrow/
    ptMuzzle, confirmed live via IDA) — that function is otherwise a pure
    native-engine canvas-merge optimization with no PixiJS equivalent, but
    these four named points are genuinely useful and were previously only
    approximated by hardcoded per-consumer Y-offset guesses (ChatBalloon
    -50, EmotionBubble -50, DamageNumber -60, ProjectileOverlay -40) that
    don't account for actual character height/equips varying per frame. */
export interface AvatarAnchors {
    navel: {
        x: number;
        y: number;
    };
    head: {
        x: number;
        y: number;
    };
    brow: {
        x: number;
        y: number;
    };
    /** Weapon-tip point (from the weapon canvas's own 'muzzle' map key) —
        falls back to the weapon's own pen position (or the hand's, if no
        weapon equipped) when the equipped weapon has no muzzle anchor
        (true for most melee weapons; ranged weapons are the common case
        that authors one). */
    muzzle: {
        x: number;
        y: number;
    };
}
export declare class CharacterRenderer {
    private _characterWz;
    private _itemWz;
    private _loader;
    private _zmap;
    private _partCache;
    constructor(characterWz: WzPackage | null, itemWz: WzPackage | null, baseWz: WzPackage | null, loader: WzTextureLoader);
    IsTwoHanded(look: AvatarLook): boolean;
    FrameCount(look: AvatarLook, actionKey: string): number;
    FrameCountForStance(look: AvatarLook, stance: Stance): number;
    private _weaponAttackType;
    PickAttackAction(look: AvatarLook, prone: boolean): string;
    private _blinking;
    private _blinkFrame;
    private _blinkFrameTimer;
    private _blinksRemaining;
    private _idleTimer;
    private _nextBlinkIn;
    private _activeBlinkDelays;
    private _blinkDelaysByFace;
    private _emotionDelaysByFace;
    Update(dt: number): void;
    Draw(look: AvatarLook, actionKey: string, frame: number, positionX: number, positionY: number, facingLeft: boolean, emotionId?: number, emotionFrame?: number): {
        layers: Sprite[][];
        anchors: AvatarAnchors;
    };
    EmotionFrameDelays(faceId: number, emotionId: number): number[];
    EmotionDurationMs(faceId: number, emotionId: number): number;
    GetFrameDelay(look: AvatarLook, actionKey: string, frameIdx: number): number;
    private _ensureBlinkDelays;
    private _loadFace;
    private _loadHair;
    private _loadEquip;
    private _loadAccessory;
    private _loadWeapon;
    private _visibleWeaponId;
    private _loadPart;
    /** Load body part with fallback to stand1/walk1 if action doesn't exist */
    private _loadBodyPart;
    /** Load head part with fallback to stand1/walk1 if action doesn't exist */
    private _loadHeadPart;
    private _align;
    private _firstMapKey;
    private _readMap;
    private _readZ;
}
//# sourceMappingURL=CharacterRenderer.d.ts.map