/**
 * CActionMan — centralized animation/action cache and weapon data manager.
 *
 * Full 1:1 port of the OG v95 CActionMan (TSingleton). Caches WZ image entries
 * for every entity type (character, mob, NPC, pet, employee, summoned, dragon,
 * morph, shadow partner, taming mob) and provides:
 *
 * - **ACTIONDATA table** (273 entries): per-action piece definitions (delay,
 *   head, move, flip, rotate, zigzag) loaded from Character.wz during Init
 * - **Melee attack range** per weapon afterimage + action
 * - **Weapon afterimage** data (visual trail effect paths + range rectangles)
 * - **Character action frames** with body/face layer separation
 * - **Equipment slot processing** (60 slots, cash item overrides, vehicle/ghost)
 * - **Cache sweep** every 60s to evict stale entries
 *
 * Cache key pattern (OG): `dwKey = nAction | (dwTemplateID << 8)`
 */
import { WzPackage } from '../wz/WzPackage.js';
import { WzProperty } from '../wz/WzProperty.js';
import { WzCanvas } from '../wz/WzCanvas.js';
/** Per-action attack range rectangle (left, top, right, bottom) in local coords. */
export interface AttackRange {
    left: number;
    top: number;
    right: number;
    bottom: number;
}
/** Weapon afterimage entry — one per weapon UOL path. */
export interface WeaponAfterimage {
    uol: string;
    ranges: AttackRange[];
    frames: WzCanvas[];
}
/** A single loaded action frame with delay + anchor/body data. */
export interface ActionFrame {
    canvas: WzCanvas | null;
    delay: number;
    bodyRect: {
        left: number;
        top: number;
        right: number;
        bottom: number;
    };
    anchor: {
        x: number;
        y: number;
    };
    flip: boolean;
    rotate: number;
    move: {
        x: number;
        y: number;
    };
    head: boolean;
}
/** A single piece definition within an ACTIONDATA entry. */
export interface ActionDataPiece {
    /** Action code for this piece's body frame */
    nAction: number;
    /** Sub-action index (e.g. 0, 1, 2) */
    nSubAction: number;
    /** Delay in ms for this piece */
    tFrameDelay: number;
    /** Head index (which head to overlay) */
    nHead: number;
    /** Whether to flip horizontally */
    bFlip: boolean;
    /** Rotation angle */
    nRotate: number;
    /** Movement offset */
    ptMove: {
        x: number;
        y: number;
    };
    /** Whether this piece is a face element */
    bFace: boolean;
}
/** ACTIONDATA entry — one per action code (0..272). */
export interface ActionData {
    bPieced: boolean;
    bZigZag: boolean;
    aPiece: ActionDataPiece[];
    tTotalDelay: number;
    tEventDelay: number;
}
/** Base entity image entry (cached WZ property for an entity template). */
export interface EntityImgEntry {
    pImg: WzProperty | null;
    tLastAccessed: number;
}
/** Cached character image entry — one per body template ID. */
export interface CharacterImgEntry {
    pImg: WzProperty | null;
    sISlot: string;
    sVSlot: string;
    sWeaponAfterimage: string;
    sSfx: string;
    bWeekly: boolean;
    nWeapon: number;
    nWalk: number;
    nStand: number;
    nAttack: number;
    nAttackSpeed: number;
    tLastAccessed: number;
}
/** Cached mob action entry. */
export interface MobActionEntry {
    nTemplateID: number;
    nAction: number;
    tLastAccessed: number;
    frames: ActionFrame[];
    bZigZag: boolean;
}
/** Cached NPC action entry. */
export interface NpcActionEntry {
    nTemplateID: number;
    nAction: number;
    tLastAccessed: number;
    frames: ActionFrame[];
}
/** Cached pet action entry. */
export interface PetActionEntry {
    nTemplateID: number;
    nAction: number;
    tLastAccessed: number;
    frames: ActionFrame[];
}
/** Cached employee action entry. */
export interface EmployeeActionEntry {
    nTemplateID: number;
    nAction: number;
    tLastAccessed: number;
    frames: ActionFrame[];
}
/** Cached summoned action entry. */
export interface SummonedActionEntry {
    nSkillID: number;
    nAction: number;
    tLastAccessed: number;
    frames: ActionFrame[];
}
/** Cached dragon action entry. */
export interface DragonActionEntry {
    nJob: number;
    nAction: number;
    tLastAccessed: number;
    frames: ActionFrame[];
}
/** Shadow partner action frame (canvas + alpha values). */
export interface ShadowPartnerFrame {
    pCanvas: WzCanvas | null;
    a0: number;
    a1: number;
}
/** Cached shadow partner action entry. */
export interface ShadowPartnerActionEntry {
    nSkillID: number;
    nAction: number;
    tLastAccessed: number;
    frames: ShadowPartnerFrame[];
}
/** Cached morph action entry. */
export interface MorphActionEntry {
    nMorphID: number;
    nAction: number;
    tLastAccessed: number;
    frames: ActionFrame[];
}
/** Face look entry — cached face canvases per emotion. */
export interface FaceLookEntry {
    nFaceID: number;
    nEmotion: number;
    nAcc: number;
    tLastAccessed: number;
    canvases: WzCanvas[];
}
export declare class ActionMan {
    private static _instance;
    private _characterImgs;
    private _afterimages;
    private _actionData;
    private _mobImgs;
    private _npcImgs;
    private _petImgs;
    private _employeeImgs;
    private _summonedProps;
    private _morphImgs;
    private _mobActions;
    private _npcActions;
    private _petActions;
    private _employeeActions;
    private _summonedActions;
    private _dragonActions;
    private _shadowPartnerActions;
    private _morphActions;
    private _tamingMobActions;
    private _faceLookEntries;
    private _lastSweep;
    private static readonly SWEEP_INTERVAL_MS;
    private static readonly STALE_THRESHOLD_MS;
    private _mobWz;
    private _npcWz;
    private _characterWz;
    private _skillWz;
    private _mapWz;
    private _summonWz;
    private constructor();
    static GetInstance(): ActionMan;
    SetMobWz(wz: WzPackage | null): void;
    SetNpcWz(wz: WzPackage | null): void;
    SetCharacterWz(wz: WzPackage | null): void;
    SetSkillWz(wz: WzPackage | null): void;
    SetMapWz(wz: WzPackage | null): void;
    SetSummonWz(wz: WzPackage | null): void;
    /**
     * Initialize the ACTIONDATA table by reading per-action piece definitions
     * from Character.wz/00002000.img (the base character template).
     *
     * For each action code 0..272 (skipping 55), loads:
     * - bPieced: whether the action has sub-piece definitions
     * - bZigZag: whether frames are played in zigzag order
     * - aPiece[]: array of piece definitions (action, delay, head, flip, rotate, move, face)
     * - tTotalDelay, tEventDelay: computed timing
     */
    Init(): void;
    GetActionData(actionCode: number): ActionData | null;
    GetCharacterImgEntry(nUOLKey: number, pImg: WzProperty | null): CharacterImgEntry | null;
    GetMobImgEntry(nTemplateID: number): EntityImgEntry | null;
    GetNpcImgEntry(nTemplateID: number): EntityImgEntry | null;
    GetPetImgEntry(nTemplateID: number): EntityImgEntry | null;
    GetEmployeeImgEntry(nTemplateID: number): EntityImgEntry | null;
    GetSummonedProp(nSkillID: number): WzProperty | null;
    GetMorphImgEntry(nMorphID: number): EntityImgEntry | null;
    LoadMobAction(nTemplateID: number, nAction: number, outFrames: ActionFrame[]): void;
    LoadNpcAction(nTemplateID: number, nAction: number, outFrames: ActionFrame[]): void;
    LoadPetAction(nTemplateID: number, nAction: number, outFrames: ActionFrame[]): void;
    LoadEmployeeAction(nTemplateID: number, nAction: number, outFrames: ActionFrame[]): void;
    LoadSummonedAction(nSkillID: number, nAction: number, outFrames: ActionFrame[]): void;
    LoadShadowPartnerAction(nSkillID: number, nAction: number, outFrames: ShadowPartnerFrame[]): void;
    GetShadowPartnerProp(nSkillID: number): WzProperty | null;
    LoadDragonAction(nJob: number, nAction: number, outFrames: ActionFrame[]): void;
    LoadTamingMobAction(nVehicleID: number, nAction: number, aAvatarHairEquip: number[], bTamingMobTired: boolean, outFrames: ActionFrame[]): void;
    private _loadTamingMobActionInternal;
    private _loadSingleTamingMobPart;
    LoadMorphAction(nMorphID: number, nAction: number, outFrames: ActionFrame[]): void;
    LoadFaceLook(nFaceID: number, nEmotion: number, nAcc: number): FaceLookEntry | null;
    GetMeleeAttackRange(sAfterimageUOL: string | null, nAction: number): AttackRange | null;
    GetDefaultAttackRange(weaponType: number): AttackRange;
    GetWeaponAfterImage(sUOL: string, effectWz: WzPackage | null): WeaponAfterimage | null;
    ProcessEquipmentForAction(nAction: number, nGender: number, aAvatarHairEquip: number[], nWeaponStickerID: number, nVehicleID: number): number[];
    SweepCache(): void;
    private _loadEntityFrames;
    private _findFirstCanvas;
    private _readInt;
    private _readStr;
    private _readDelayProp;
    private _readFlipProp;
    private _readMoveProp;
    private _readBodyRectProp;
    private _readMove;
    private _readBodyRect;
    private _readAnchor;
    private _readCanvasInt;
    private _readActionCode;
    private _countChildren;
    private _detectPieced;
    private _getNpcActionName;
    private _getPetActionName;
    /**
     * Character.nx image path for an equip/body id.
     * OG: get_equip_data_path (0x5A6060) — StringPool IDs 0x93E..0x18FA.
     */
    private _getEquipDataPath;
    private _getWeaponType;
    private _isCashItem;
    private _sweepMap;
    private _sweepEntityMap;
    private _sweepActionMap;
    private _sweepShadowPartnerMap;
    static GetActionName(actionCode: number): string;
}
//# sourceMappingURL=ActionMan.d.ts.map