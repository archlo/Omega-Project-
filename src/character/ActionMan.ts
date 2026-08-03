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
import { WzImage } from '../wz/WzImage.js';
import { WzCanvas } from '../wz/WzCanvas.js';
import { WzVector } from '../wz/WzVector.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Interfaces
// ═══════════════════════════════════════════════════════════════════════════════

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
  bodyRect: { left: number; top: number; right: number; bottom: number };
  anchor: { x: number; y: number };
  flip: boolean;
  rotate: number;
  move: { x: number; y: number };
  head: boolean;
}

// ── ACTIONDATA (Init table) ─────────────────────────────────────────────────

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
  ptMove: { x: number; y: number };
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

// ── Entity image entries ─────────────────────────────────────────────────────

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

// ═══════════════════════════════════════════════════════════════════════════════
// Static data
// ═══════════════════════════════════════════════════════════════════════════════

/** Equipment body part indices (OG g_anRingBodyPart equivalents) */
const RING_BODY_PARTS = [19, 20];

/** Special item IDs that are hidden in certain actions */
const HIDDEN_ITEMS: Record<number, number> = {
  1: 1002186, 4: 1032024, 3: 1022079, 7: 1072153,
  8: 1082102, 9: 1102039, 10: 1092067,
};

const VEHICLE_PREFIXES = [190, 193];
const VEHICLE_SPECIALS = [1902040, 1902041, 1902042];
const VEHICLE_1983_PREFIX = 1983;
const HIDDEN_WEAPON_STICKERS = [1702099, 1702190];
const SKIP_WEAPON_SLOT_ACTIONS = [88, 96, 112, 138, 87, 27, 28];

// ── Mob action name mapping ──────────────────────────────────────────────────
// Maps OG mob action codes to WZ node names under Mob.wz/{id}.img
const MOB_ACTION_NAMES: Record<number, string> = {
  0: 'stand', 1: 'move',
  2: 'attack1', 3: 'attack2', 4: 'attack3', 5: 'attack4',
  6: 'attack5', 7: 'attack6', 8: 'attack7', 9: 'attack8',
  10: 'hit1', 11: 'hit2', 12: 'hit3',
  13: 'die1', 14: 'die2', 15: 'die3',
  16: 'fly', 17: 'prone', 18: 'ladder', 19: 'rope',
  20: 'jump', 21: 'fall', 22: 'chase', 23: 'miss',
  24: 'say', 25: 'eye', 26: 'no', 27: 'regen',
  28: 'bomb', 29: 'skill1', 30: 'skill2', 31: 'skill3',
  32: 'skill4', 33: 'skill5', 34: 'skill6', 35: 'skill7',
  36: 'skill8', 37: 'skill9', 38: 'skill10', 39: 'skill11',
  40: 'skill12', 41: 'skill13', 42: 'skill14', 43: 'skill15',
  44: 'skill16',
};

// ── Summoned action name mapping ────────────────────────────────────────────
const SUMMONED_ACTION_NAMES: Record<number, string> = {
  0: 'stand', 1: 'move', 2: 'fly', 3: 'hit', 4: 'die',
};

// ── Employee action name mapping ─────────────────────────────────────────────
const EMPLOYEE_ACTION_NAMES: Record<number, string> = {
  0: 'stand', 1: 'move', 2: 'alert', 3: 'talk',
};

// ── Dragon action name mapping ───────────────────────────────────────────────
const DRAGON_ACTION_NAMES: Record<number, string> = {
  0: 'walk1', 1: 'walk2', 2: 'stand1', 3: 'stand2',
  5: 'swingO1', 6: 'swingO2', 7: 'swingO3',
  9: 'swingT1', 10: 'swingT2', 11: 'swingT3',
  13: 'stabO1', 14: 'stabO2',
  16: 'stabT1', 17: 'stabT2',
  19: 'swingP1', 20: 'swingP2', 21: 'swingP3',
  23: 'shoot1', 24: 'shoot2',
  26: 'proneStab', 27: 'prone',
  29: 'fly', 30: 'jump', 31: 'sit',
  32: 'ladder', 33: 'rope', 34: 'dead', 35: 'rise',
  36: 'attack1', 37: 'attack2', 38: 'attack3', 39: 'attack4',
  40: 'attack5', 41: 'attack6', 42: 'attack7', 43: 'attack8',
  44: 'skill1', 45: 'skill2', 46: 'skill3', 47: 'skill4',
  48: 'charge', 50: 'combo',
  55: 'special1', 56: 'special2',
  60: 'alert', 61: 'tamingMob',
};

// ── TamingMob action name mapping ───────────────────────────────────────────
const TAMINGMOB_ACTION_NAMES: Record<number, string> = {
  0: 'fly', 1: 'stand', 2: 'move', 3: 'jump',
  4: 'alert', 5: 'sit', 13: 'die1', 14: 'die2', 15: 'die3',
  44: 'attack1', 45: 'attack2', 46: 'attack3',
  47: 'attack4', 48: 'attack5',
  55: 'tired', 58: 'skill1', 59: 'skill2',
  118: 'skill3', 119: 'skill4',
  132: 'skill5', 133: 'skill6',
  144: 'skill7',
  210: 'skill8',
  257: 'attack1', 258: 'attack2',
  264: 'attack3', 265: 'attack4',
};

// ── Morph action name mapping ────────────────────────────────────────────────
// Morphs use numeric action codes mapped to WZ node names
const MORPH_ACTION_NAMES: Record<number, string> = {
  0: 'stand', 1: 'walk', 2: 'jump', 3: 'sit',
  4: 'alert', 5: 'attack1', 6: 'attack2', 7: 'attack3',
  8: 'hit', 9: 'die', 10: 'fly',
};

// ── Face emotion name mapping ────────────────────────────────────────────────
const FACE_EMOTION_NAMES: Record<number, string> = {
  0: 'default', 1: 'smile', 2: 'troubled', 3: 'cry',
  4: 'angry', 5: 'bewildered', 6: 'stunned', 7: 'embarrassed',
  8: 'closed_eye', 9: 'bulled', 10: 'painful', 11: 'blaze',
  12: 'tight', 13: 'admire', 14: 'love', 15: 'shy',
  16: 'cheers', 17: 'chu', 18: 'hum', 19: 'ikari',
  20: 'smile2', 21: 'smile3',
};

// ── TamingMob vehicle checks ────────────────────────────────────────────────
function isVehicle(itemId: number): boolean {
  const cat = Math.floor(itemId / 10000);
  return cat === 190 || cat === 193;
}

function isEventVehicleType1(itemId: number): boolean {
  return itemId >= 1932000 && itemId <= 1932006;
}

function isEventVehicleType2(itemId: number): boolean {
  return itemId >= 1932010 && itemId <= 1932016;
}

function isWildHunterJaguarVehicle(itemId: number): boolean {
  return itemId >= 1932020 && itemId <= 1932026;
}

function isAbleTamingMobAction(action: number, templateId: number): boolean {
  const cat = Math.floor(templateId / 10000);
  if (cat === 190) {
    return action >= 0 && action <= 55;
  }
  return true;
}

function isAbleTamingMobOneTimeAction(action: number, templateId: number): boolean {
  return false; // placeholder — OG checks specific one-time actions
}

// ═══════════════════════════════════════════════════════════════════════════════
// ActionMan class
// ═══════════════════════════════════════════════════════════════════════════════

export class ActionMan {
  private static _instance: ActionMan | null = null;

  // ── Character caches ────────────────────────────────────────────────────
  private _characterImgs = new Map<number, CharacterImgEntry>();

  // ── Weapon afterimage ───────────────────────────────────────────────────
  private _afterimages = new Map<string, WeaponAfterimage>();

  // ── ACTIONDATA table (273 entries, loaded by Init) ──────────────────────
  private _actionData: ActionData[] = [];

  // ── Entity image caches ─────────────────────────────────────────────────
  private _mobImgs = new Map<number, EntityImgEntry>();
  private _npcImgs = new Map<number, EntityImgEntry>();
  private _petImgs = new Map<number, EntityImgEntry>();
  private _employeeImgs = new Map<number, EntityImgEntry>();
  private _summonedProps = new Map<number, WzProperty | null>();
  private _morphImgs = new Map<number, EntityImgEntry>();

  // ── Action frame caches ─────────────────────────────────────────────────
  private _mobActions = new Map<number, MobActionEntry>();
  private _npcActions = new Map<number, NpcActionEntry>();
  private _petActions = new Map<number, PetActionEntry>();
  private _employeeActions = new Map<number, EmployeeActionEntry>();
  private _summonedActions = new Map<number, SummonedActionEntry>();
  private _dragonActions = new Map<number, Map<number, DragonActionEntry>>();
  private _shadowPartnerActions = new Map<number, ShadowPartnerActionEntry>();
  private _morphActions = new Map<number, MorphActionEntry>();
  private _tamingMobActions = new Map<number, MobActionEntry>();

  // ── Face look cache ─────────────────────────────────────────────────────
  private _faceLookEntries = new Map<number, FaceLookEntry>();

  // ── Cache sweep ─────────────────────────────────────────────────────────
  private _lastSweep = 0;
  private static readonly SWEEP_INTERVAL_MS = 60_000;
  private static readonly STALE_THRESHOLD_MS = 5 * 60 * 1000;

  // ── WZ package references (set by GameStage after loading) ──────────────
  private _mobWz: WzPackage | null = null;
  private _npcWz: WzPackage | null = null;
  private _characterWz: WzPackage | null = null;
  private _skillWz: WzPackage | null = null;
  private _mapWz: WzPackage | null = null;
  private _summonWz: WzPackage | null = null;

  private constructor() {}

  static GetInstance(): ActionMan {
    if (!ActionMan._instance) {
      ActionMan._instance = new ActionMan();
      ActionMan._instance._lastSweep = Date.now();
    }
    return ActionMan._instance;
  }

  // ── WZ package setters (called by GameStage after loading) ──────────────

  SetMobWz(wz: WzPackage | null) { this._mobWz = wz; }
  SetNpcWz(wz: WzPackage | null) { this._npcWz = wz; }
  SetCharacterWz(wz: WzPackage | null) { this._characterWz = wz; }
  SetSkillWz(wz: WzPackage | null) { this._skillWz = wz; }
  SetMapWz(wz: WzPackage | null) { this._mapWz = wz; }
  SetSummonWz(wz: WzPackage | null) { this._summonWz = wz; }

  // ═══════════════════════════════════════════════════════════════════════════
  // Init — build ACTIONDATA table (OG: CActionMan::Init at 0x41BEB0)
  // ═══════════════════════════════════════════════════════════════════════════

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
  Init(): void {
    if (!this._characterWz) return;

    const baseImg = this._characterWz.GetItem('00002000.img');
    const baseRoot = baseImg instanceof WzImage ? baseImg.Root : null;
    if (!baseRoot) return;

    this._actionData = new Array(273);
    for (let i = 0; i < 273; i++) {
      this._actionData[i] = { bPieced: false, bZigZag: false, aPiece: [], tTotalDelay: 0, tEventDelay: 0 };
    }

    for (let actionCode = 0; actionCode < 273; actionCode++) {
      if (actionCode === 55) continue;

      const actionName = ActionNames[actionCode] ?? `action${actionCode}`;
      let actionProp = baseRoot.Get(actionName);

      // Actions 124-131 use sub-property "1"
      if (actionCode >= 124 && actionCode <= 131 && actionProp instanceof WzProperty) {
        const sub = actionProp.Get('1');
        if (sub instanceof WzProperty) actionProp = sub;
      }

      const ad = this._actionData[actionCode];
      if (!(actionProp instanceof WzProperty)) continue;

      // Determine if this action is pieced (has named sub-entries like "0", "1" with their own delay/flip/move)
      // versus simple (flat frames with just delay/flip/rotate/move)
      // Check if the first child is a WzProperty with a "delay" child (simple) vs a WzProperty with sub-actions (pieced)
      const firstChild = actionProp.Get('0');
      const isPieced = this._detectPieced(actionProp, firstChild);

      if (isPieced) {
        ad.bPieced = true;
        const count = this._countChildren(actionProp);
        ad.aPiece = [];
        for (let pi = 0; pi < count; pi++) {
          const pieceProp = actionProp.Get(`${pi}`);
          if (!(pieceProp instanceof WzProperty)) continue;

          const piece: ActionDataPiece = {
            nAction: this._readActionCode(pieceProp, 'delay'),
            nSubAction: pi,
            tFrameDelay: this._readInt(pieceProp, 'delay', 150),
            nHead: this._readInt(pieceProp, 'head', 0),
            bFlip: this._readInt(pieceProp, 'flip', 0) !== 0,
            nRotate: this._readInt(pieceProp, 'rotate', 0),
            ptMove: this._readMove(pieceProp),
            bFace: this._readInt(pieceProp, 'face', 0) !== 0,
          };

          if (piece.tFrameDelay < 0) {
            ad.tEventDelay += -piece.tFrameDelay;
            piece.tFrameDelay = -piece.tFrameDelay;
          }
          ad.tTotalDelay += piece.tFrameDelay;
          ad.aPiece.push(piece);
        }
      } else {
        // Simple frame action
        ad.bPieced = false;
        const count = this._countChildren(actionProp);
        ad.bZigZag = this._readInt(actionProp, 'zigzag', 0) !== 0;

        const frameCount = ad.bZigZag ? 2 * count - 2 : count;
        ad.aPiece = [];
        for (let fi = 0; fi < count; fi++) {
          const frameProp = actionProp.Get(`${fi}`);
          if (!(frameProp instanceof WzProperty)) continue;

          const piece: ActionDataPiece = {
            nAction: 0,
            nSubAction: fi,
            tFrameDelay: this._readInt(frameProp, 'delay', 150),
            nHead: 0,
            bFlip: this._readInt(frameProp, 'flip', 0) !== 0,
            nRotate: this._readInt(frameProp, 'rotate', 0),
            ptMove: this._readMove(frameProp),
            bFace: this._readInt(frameProp, 'face', 0) !== 0,
          };

          ad.tTotalDelay += piece.tFrameDelay;
          ad.aPiece.push(piece);
        }

        // Zigzag: duplicate frames in reverse order (excluding first and last)
        if (ad.bZigZag && count > 2) {
          for (let fi = count - 2; fi >= 1; fi--) {
            const clone = { ...ad.aPiece[fi] };
            ad.aPiece.push(clone);
          }
        }

        ad.tEventDelay = ad.bZigZag ? 0 : (ad.tTotalDelay - (ad.aPiece.length > 0 ? ad.aPiece[ad.aPiece.length - 1].tFrameDelay : 0));
      }
    }
  }

  GetActionData(actionCode: number): ActionData | null {
    return this._actionData[actionCode] ?? null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Character image entry (OG: 0x417FD0)
  // ═══════════════════════════════════════════════════════════════════════════

  GetCharacterImgEntry(nUOLKey: number, pImg: WzProperty | null): CharacterImgEntry | null {
    if (nUOLKey <= 0) return null;

    const cached = this._characterImgs.get(nUOLKey);
    if (cached) {
      cached.tLastAccessed = Date.now();
      return cached;
    }

    if (!pImg) {
      // OG: GetCharacterImgEntry resolves the img itself via get_equip_data_path (0x5A6060).
      if (!this._characterWz) return null;
      const path = this._getEquipDataPath(nUOLKey);
      if (path) {
        const img = this._characterWz.GetItem(path);
        if (img instanceof WzImage) pImg = img.Root;
      }
      if (!pImg) return null;
    }

    const infoNode = pImg.Get('info') instanceof WzProperty ? pImg.Get('info') as WzProperty : null;

    // OG: weapon-specific info fields (afterimage/walk/stand/attack/attackSpeed)
    // are only read when GetWeaponType(nUOLKey) != 0.
    const isWeapon = this._getWeaponType(nUOLKey) !== 0;

    const entry: CharacterImgEntry = {
      pImg,
      sISlot: this._readStr(infoNode, 'islot'),
      sVSlot: this._readStr(infoNode, 'vslot'),
      sWeaponAfterimage: isWeapon ? this._readStr(infoNode, 'afterImage') : '',
      sSfx: this._readStr(infoNode, 'sfx'),
      bWeekly: this._readInt(infoNode, 'weekly', 0) !== 0,
      nWeapon: this._getWeaponType(nUOLKey),
      nWalk: isWeapon ? this._readInt(infoNode, 'walk', 0) : 0,
      nStand: isWeapon ? this._readInt(infoNode, 'stand', 0) : 0,
      nAttack: isWeapon ? this._readInt(infoNode, 'attack', 0) : 0,
      nAttackSpeed: isWeapon ? this._readInt(infoNode, 'attackSpeed', 0) : 0,
      tLastAccessed: Date.now(),
    };

    this._characterImgs.set(nUOLKey, entry);
    return entry;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Mob image entry (OG: 0x419F20)
  // ═══════════════════════════════════════════════════════════════════════════

  GetMobImgEntry(nTemplateID: number): EntityImgEntry | null {
    if (nTemplateID <= 0) return null;

    const cached = this._mobImgs.get(nTemplateID);
    if (cached) {
      cached.tLastAccessed = Date.now();
      return cached;
    }

    if (!this._mobWz) return null;

    const strId = `${nTemplateID.toString().padStart(7, '0')}.img`;
    const img = this._mobWz.GetItem(strId);
    const root = img instanceof WzImage ? img.Root : null;
    if (!root) return null;

    const entry: EntityImgEntry = { pImg: root, tLastAccessed: Date.now() };
    this._mobImgs.set(nTemplateID, entry);
    return entry;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NPC image entry (OG: 0x41A840)
  // ═══════════════════════════════════════════════════════════════════════════

  GetNpcImgEntry(nTemplateID: number): EntityImgEntry | null {
    if (nTemplateID <= 0) return null;

    const cached = this._npcImgs.get(nTemplateID);
    if (cached) {
      cached.tLastAccessed = Date.now();
      return cached;
    }

    if (!this._npcWz) return null;

    const strId = `${nTemplateID.toString().padStart(7, '0')}.img`;
    const img = this._npcWz.GetItem(strId);
    const root = img instanceof WzImage ? img.Root : null;
    if (!root) return null;

    const entry: EntityImgEntry = { pImg: root, tLastAccessed: Date.now() };
    this._npcImgs.set(nTemplateID, entry);
    return entry;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Pet image entry (OG: 0x41B0D0)
  // ═══════════════════════════════════════════════════════════════════════════

  GetPetImgEntry(nTemplateID: number): EntityImgEntry | null {
    if (nTemplateID <= 0) return null;

    const cached = this._petImgs.get(nTemplateID);
    if (cached) {
      cached.tLastAccessed = Date.now();
      return cached;
    }

    if (!this._characterWz) return null;

    const strId = `${nTemplateID.toString().padStart(8, '0')}.img`;
    const img = this._characterWz.GetItem(strId);
    const root = img instanceof WzImage ? img.Root : null;
    if (!root) return null;

    const entry: EntityImgEntry = { pImg: root, tLastAccessed: Date.now() };
    this._petImgs.set(nTemplateID, entry);
    return entry;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Employee image entry (OG: 0x41B490)
  // ═══════════════════════════════════════════════════════════════════════════

  GetEmployeeImgEntry(nTemplateID: number): EntityImgEntry | null {
    if (nTemplateID <= 0) return null;

    const cached = this._employeeImgs.get(nTemplateID);
    if (cached) {
      cached.tLastAccessed = Date.now();
      return cached;
    }

    if (!this._characterWz) return null;

    const strId = `${nTemplateID.toString().padStart(7, '0')}.img`;
    const img = this._characterWz.GetItem(strId);
    const root = img instanceof WzImage ? img.Root : null;
    if (!root) return null;

    const entry: EntityImgEntry = { pImg: root, tLastAccessed: Date.now() };
    this._employeeImgs.set(nTemplateID, entry);
    return entry;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Summoned prop (OG: 0x41B830)
  // ═══════════════════════════════════════════════════════════════════════════

  GetSummonedProp(nSkillID: number): WzProperty | null {
    const cached = this._summonedProps.get(nSkillID);
    if (cached !== undefined) return cached;

    if (!this._skillWz) return null;

    const strId = `${nSkillID.toString().padStart(7, '0')}.img`;
    const img = this._skillWz.GetItem(strId);
    const root = img instanceof WzImage ? img.Root : null;
    if (!root) {
      this._summonedProps.set(nSkillID, null);
      return null;
    }

    // Navigate to summon sub-node
    const summonNode = root.Get('summon') ?? root.Get('summoned');
    if (summonNode instanceof WzProperty) {
      this._summonedProps.set(nSkillID, summonNode);
      return summonNode;
    }

    this._summonedProps.set(nSkillID, null);
    return null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Morph image entry (OG: 0x418B30)
  // ═══════════════════════════════════════════════════════════════════════════

  GetMorphImgEntry(nMorphID: number): EntityImgEntry | null {
    if (nMorphID <= 0) return null;

    const cached = this._morphImgs.get(nMorphID);
    if (cached) {
      cached.tLastAccessed = Date.now();
      return cached;
    }

    if (!this._characterWz) return null;

    const strId = `${nMorphID.toString().padStart(7, '0')}.img`;
    const img = this._characterWz.GetItem(strId);
    const root = img instanceof WzImage ? img.Root : null;
    if (!root) return null;

    const entry: EntityImgEntry = { pImg: root, tLastAccessed: Date.now() };
    this._morphImgs.set(nMorphID, entry);
    return entry;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LoadMobAction (OG: 0x41F530)
  // Cache key: nAction | (nTemplateID << 8)
  // ═══════════════════════════════════════════════════════════════════════════

  LoadMobAction(nTemplateID: number, nAction: number, outFrames: ActionFrame[]): void {
    const key = nAction | (nTemplateID << 8);

    // Check cache
    const cached = this._mobActions.get(key);
    if (cached) {
      cached.tLastAccessed = Date.now();
      outFrames.length = 0;
      outFrames.push(...cached.frames);
      return;
    }

    const imgEntry = this.GetMobImgEntry(nTemplateID);
    if (!imgEntry?.pImg) return;

    const actionName = MOB_ACTION_NAMES[nAction] ?? `attack${nAction}`;
    const actionProp = imgEntry.pImg.Get(actionName);
    if (!(actionProp instanceof WzProperty)) return;

    const frames = this._loadEntityFrames(actionProp);

    // Check for zigzag
    const bZigZag = this._readInt(actionProp, 'zigzag', 0) !== 0;
    if (bZigZag && frames.length > 2) {
      for (let i = frames.length - 2; i >= 1; i--) {
        frames.push({ ...frames[i] });
      }
    }

    const entry: MobActionEntry = {
      nTemplateID, nAction, tLastAccessed: Date.now(),
      frames, bZigZag,
    };
    this._mobActions.set(key, entry);

    outFrames.length = 0;
    outFrames.push(...frames);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LoadNpcAction (OG: 0x420AE0)
  // ═══════════════════════════════════════════════════════════════════════════

  LoadNpcAction(nTemplateID: number, nAction: number, outFrames: ActionFrame[]): void {
    const key = nAction | (nTemplateID << 8);

    const cached = this._npcActions.get(key);
    if (cached) {
      cached.tLastAccessed = Date.now();
      outFrames.length = 0;
      outFrames.push(...cached.frames);
      return;
    }

    const imgEntry = this.GetNpcImgEntry(nTemplateID);
    if (!imgEntry?.pImg) return;

    // Check link redirect
    let root = imgEntry.pImg;
    const linkNode = root.Get('info') instanceof WzProperty ? (root.Get('info') as WzProperty).Get('link') : null;
    if (typeof linkNode === 'number') {
      const linkEntry = this.GetNpcImgEntry(linkNode);
      if (linkEntry?.pImg) root = linkEntry.pImg;
    }

    const actionName = this._getNpcActionName(nAction);
    const actionProp = root.Get(actionName);
    if (!(actionProp instanceof WzProperty)) return;

    const frames = this._loadEntityFrames(actionProp);

    const entry: NpcActionEntry = {
      nTemplateID, nAction, tLastAccessed: Date.now(), frames,
    };
    this._npcActions.set(key, entry);

    outFrames.length = 0;
    outFrames.push(...frames);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LoadPetAction (OG: 0x4213F0)
  // ═══════════════════════════════════════════════════════════════════════════

  LoadPetAction(nTemplateID: number, nAction: number, outFrames: ActionFrame[]): void {
    const key = nAction | (nTemplateID << 8);

    const cached = this._petActions.get(key);
    if (cached) {
      cached.tLastAccessed = Date.now();
      outFrames.length = 0;
      outFrames.push(...cached.frames);
      return;
    }

    const imgEntry = this.GetPetImgEntry(nTemplateID);
    if (!imgEntry?.pImg) return;

    // Check link redirect
    let root = imgEntry.pImg;
    const linkNode = root.Get('info') instanceof WzProperty ? (root.Get('info') as WzProperty).Get('link') : null;
    if (typeof linkNode === 'number') {
      const linkEntry = this.GetPetImgEntry(linkNode);
      if (linkEntry?.pImg) root = linkEntry.pImg;
    }

    const actionName = this._getPetActionName(nAction);
    const actionProp = root.Get(actionName);
    if (!(actionProp instanceof WzProperty)) return;

    const frames = this._loadEntityFrames(actionProp);

    const entry: PetActionEntry = {
      nTemplateID, nAction, tLastAccessed: Date.now(), frames,
    };
    this._petActions.set(key, entry);

    outFrames.length = 0;
    outFrames.push(...frames);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LoadEmployeeAction (OG: 0x422940)
  // ═══════════════════════════════════════════════════════════════════════════

  LoadEmployeeAction(nTemplateID: number, nAction: number, outFrames: ActionFrame[]): void {
    const key = nAction | (nTemplateID << 8);

    const cached = this._employeeActions.get(key);
    if (cached) {
      cached.tLastAccessed = Date.now();
      outFrames.length = 0;
      outFrames.push(...cached.frames);
      return;
    }

    const imgEntry = this.GetEmployeeImgEntry(nTemplateID);
    if (!imgEntry?.pImg) return;

    const actionName = EMPLOYEE_ACTION_NAMES[nAction] ?? `stand`;
    const actionProp = imgEntry.pImg.Get(actionName);
    if (!(actionProp instanceof WzProperty)) return;

    const frames = this._loadEntityFrames(actionProp);

    const entry: EmployeeActionEntry = {
      nTemplateID, nAction, tLastAccessed: Date.now(), frames,
    };
    this._employeeActions.set(key, entry);

    outFrames.length = 0;
    outFrames.push(...frames);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LoadSummonedAction (OG: 0x423100)
  // ═══════════════════════════════════════════════════════════════════════════

  LoadSummonedAction(nSkillID: number, nAction: number, outFrames: ActionFrame[]): void {
    const key = nAction | (nSkillID << 8);

    const cached = this._summonedActions.get(key);
    if (cached) {
      cached.tLastAccessed = Date.now();
      outFrames.length = 0;
      outFrames.push(...cached.frames);
      return;
    }

    const summonProp = this.GetSummonedProp(nSkillID);
    if (!summonProp) return;

    const actionName = SUMMONED_ACTION_NAMES[nAction] ?? `stand`;
    const actionProp = summonProp.Get(actionName);
    if (!(actionProp instanceof WzProperty)) return;

    const frames = this._loadEntityFrames(actionProp);

    const entry: SummonedActionEntry = {
      nSkillID, nAction, tLastAccessed: Date.now(), frames,
    };
    this._summonedActions.set(key, entry);

    outFrames.length = 0;
    outFrames.push(...frames);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LoadShadowPartnerAction (OG: 0x423D0E)
  // ═══════════════════════════════════════════════════════════════════════════

  LoadShadowPartnerAction(nSkillID: number, nAction: number, outFrames: ShadowPartnerFrame[]): void {
    const key = nAction | (nSkillID << 8);

    const cached = this._shadowPartnerActions.get(key);
    if (cached) {
      cached.tLastAccessed = Date.now();
      outFrames.length = 0;
      outFrames.push(...cached.frames);
      return;
    }

    const shadowProp = this.GetShadowPartnerProp(nSkillID);
    if (!shadowProp) return;

    // Get the action's base piece data to know which sub-actions to load
    const actionData = this._actionData[nAction];
    const frames: ShadowPartnerFrame[] = [];

    const actionName = ActionNames[nAction] ?? `action${nAction}`;
    const actionProp = shadowProp.Get(actionName);

    if (actionProp instanceof WzProperty) {
      // Shadow partner uses the same frame structure as the character action
      // but with "a0" and "a1" alpha values per canvas
      for (let fi = 0; ; fi++) {
        const frameNode = actionProp.Get(`${fi}`);
        if (!frameNode) break;

        if (frameNode instanceof WzCanvas) {
          const frame: ShadowPartnerFrame = {
            pCanvas: frameNode,
            a0: this._readCanvasInt(frameNode, 'a0', -1),
            a1: this._readCanvasInt(frameNode, 'a1', -1),
          };
          frames.push(frame);
        } else if (frameNode instanceof WzProperty) {
          // Property node containing canvas children
          const canvas = this._findFirstCanvas(frameNode);
          if (canvas) {
            const frame: ShadowPartnerFrame = {
              pCanvas: canvas,
              a0: this._readCanvasInt(canvas, 'a0', -1),
              a1: this._readCanvasInt(canvas, 'a1', -1),
            };
            frames.push(frame);
          }
        }
      }
    }

    const entry: ShadowPartnerActionEntry = {
      nSkillID, nAction, tLastAccessed: Date.now(), frames,
    };
    this._shadowPartnerActions.set(key, entry);

    outFrames.length = 0;
    outFrames.push(...frames);
  }

  GetShadowPartnerProp(nSkillID: number): WzProperty | null {
    // Shadow partner data is stored within the skill WZ
    // Path: Skill.wz/{skillId}.img/skill/{skillId}/shadow
    if (!this._skillWz) return null;

    const strId = `${nSkillID.toString().padStart(7, '0')}.img`;
    const img = this._skillWz.GetItem(strId);
    const root = img instanceof WzImage ? img.Root : null;
    if (!root) return null;

    const skillNode = root.Get('skill');
    if (skillNode instanceof WzProperty) {
      const specificSkill = skillNode.Get(`${nSkillID}`);
      if (specificSkill instanceof WzProperty) {
        const shadowNode = specificSkill.Get('shadow');
        if (shadowNode instanceof WzProperty) return shadowNode;
      }
    }

    return null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LoadDragonAction (OG: 0x4247C0)
  // Uses Map.wz/Effect/0907.img/{jobId}/{actionName}
  // ═══════════════════════════════════════════════════════════════════════════

  LoadDragonAction(nJob: number, nAction: number, outFrames: ActionFrame[]): void {
    // Dragon uses nested cache: [job][action]
    let jobMap = this._dragonActions.get(nJob);
    if (jobMap) {
      const cached = jobMap.get(nAction);
      if (cached) {
        cached.tLastAccessed = Date.now();
        outFrames.length = 0;
        outFrames.push(...cached.frames);
        return;
      }
    }

    if (!this._mapWz) return;

    // Load dragon WZ from Map.wz/Effect/0907.img/{jobId}
    const effectImg = this._mapWz.GetItem('Effect/0907.img');
    const effectRoot = effectImg instanceof WzImage ? effectImg.Root : null;
    if (!effectRoot) return;

    const jobNode = effectRoot.Get(`${nJob}`);
    if (!(jobNode instanceof WzProperty)) return;

    const actionName = DRAGON_ACTION_NAMES[nAction] ?? `action${nAction}`;
    const actionProp = jobNode.Get(actionName);
    if (!(actionProp instanceof WzProperty)) return;

    const frames = this._loadEntityFrames(actionProp);

    if (!jobMap) {
      jobMap = new Map();
      this._dragonActions.set(nJob, jobMap);
    }

    const entry: DragonActionEntry = {
      nJob, nAction, tLastAccessed: Date.now(), frames,
    };
    jobMap.set(nAction, entry);

    outFrames.length = 0;
    outFrames.push(...frames);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LoadTamingMobAction (OG: 0x427A10)
  // ═══════════════════════════════════════════════════════════════════════════

  LoadTamingMobAction(
    nVehicleID: number,
    nAction: number,
    aAvatarHairEquip: number[],
    bTamingMobTired: boolean,
    outFrames: ActionFrame[],
  ): void {
    if (!isVehicle(nVehicleID)) return;

    let resolvedAction = nAction;
    let bModified = false;

    // Action mapping
    if (nAction === 4) { resolvedAction = 2; bModified = true; }
    else if (nAction === 0x10E) { resolvedAction = 43; bModified = true; }
    else if (nAction === 0x10F || nAction === 0x110) { resolvedAction = 2; bModified = true; }
    else if (nAction < 4 || nAction === 55 || nAction === 44 || nAction === 42 || nAction === 43 || nAction === 210) {
      bModified = true;
    }

    const vehicleCat = Math.floor(nVehicleID / 10000);

    if (vehicleCat === 190) {
      if (!bModified && resolvedAction !== 45 && resolvedAction !== 46) {
        if (!isAbleTamingMobOneTimeAction(resolvedAction, nVehicleID) && !isAbleTamingMobAction(resolvedAction, nVehicleID)) {
          resolvedAction = 2;
        }
      }
    } else if (vehicleCat === 193) {
      if (!bModified) {
        switch (resolvedAction) {
          case 45: case 46:
            if (!isEventVehicleType2(nVehicleID) && !isWildHunterJaguarVehicle(nVehicleID) && nVehicleID !== 1932016) {
              if (!isAbleTamingMobOneTimeAction(resolvedAction, nVehicleID) && !isAbleTamingMobAction(resolvedAction, nVehicleID)) {
                resolvedAction = 2;
              }
            }
            break;
          case 58: case 59: case 118: case 119: case 132: case 133:
            break;
          case 144:
            if (!isEventVehicleType1(nVehicleID)) {
              if (!isAbleTamingMobOneTimeAction(resolvedAction, nVehicleID) && !isAbleTamingMobAction(resolvedAction, nVehicleID)) {
                resolvedAction = 2;
              }
            }
            break;
          default:
            if (!isAbleTamingMobOneTimeAction(resolvedAction, nVehicleID) && !isAbleTamingMobAction(resolvedAction, nVehicleID)) {
              resolvedAction = 2;
            }
            break;
        }
      }
    } else if (Math.floor(nVehicleID / 1000) === 1983) {
      resolvedAction = 48;
    } else if (!bModified) {
      if (!isAbleTamingMobOneTimeAction(resolvedAction, nVehicleID) && !isAbleTamingMobAction(resolvedAction, nVehicleID)) {
        resolvedAction = 2;
      }
    }

    if (bTamingMobTired && (resolvedAction === 2 || resolvedAction === 3)) {
      resolvedAction = 55;
    }

    // Load frames via load_tamingmob_action helper
    this._loadTamingMobActionInternal(resolvedAction, nVehicleID, aAvatarHairEquip, outFrames);
  }

  private _loadTamingMobActionInternal(
    nAction: number, nVehicleID: number, aAvatarHairEquip: number[], outFrames: ActionFrame[],
  ): void {
    const vehicleCat = Math.floor(nVehicleID / 10000);

    if (vehicleCat === 190) {
      // Multi-part taming mob (racing bike etc.)
      const bodyIds = [aAvatarHairEquip[18], aAvatarHairEquip[19], aAvatarHairEquip[20]];
      if (bodyIds[0]) {
        this._loadSingleTamingMobPart(nAction, nVehicleID, bodyIds[0], outFrames);
        if (bodyIds[1]) this._loadSingleTamingMobPart(nAction, nVehicleID, bodyIds[1], outFrames);
        if (bodyIds[2]) this._loadSingleTamingMobPart(nAction, nVehicleID, bodyIds[2], outFrames);
      }
    } else if (nVehicleID) {
      this._loadSingleTamingMobPart(nAction, nVehicleID, nVehicleID, outFrames);
    }
  }

  private _loadSingleTamingMobPart(nAction: number, nVehicleID: number, nBodyID: number, outFrames: ActionFrame[]): void {
    // TamingMob parts use Character.wz entries like regular characters
    const imgEntry = this.GetCharacterImgEntry(nBodyID, null);
    if (!imgEntry?.pImg) return;

    let root = imgEntry.pImg;
    // For vehicles, navigate to the specific body part
    if (!isVehicle(nVehicleID) && nBodyID !== nVehicleID) {
      const bodyProp = root.Get(`${nBodyID}`);
      if (bodyProp instanceof WzProperty) root = bodyProp;
    }

    const actionName = TAMINGMOB_ACTION_NAMES[nAction] ?? `stand`;
    const actionProp = root.Get(actionName);
    if (!(actionProp instanceof WzProperty)) return;

    const frames = this._loadEntityFrames(actionProp);

    // Merge body rects for taming mob parts
    for (const frame of frames) {
      if (frame.canvas) {
        const prop = frame.canvas.Property;
        const lt = prop?.Get('lt');
        const rb = prop?.Get('rb');
        if (lt instanceof WzVector && rb instanceof WzVector) {
          frame.bodyRect = { left: lt.X, top: lt.Y, right: rb.X, bottom: rb.Y };
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LoadMorphAction (OG: 0x4193C0)
  // ═══════════════════════════════════════════════════════════════════════════

  LoadMorphAction(nMorphID: number, nAction: number, outFrames: ActionFrame[]): void {
    const key = nAction | (nMorphID << 8);

    const cached = this._morphActions.get(key);
    if (cached) {
      cached.tLastAccessed = Date.now();
      outFrames.length = 0;
      outFrames.push(...cached.frames);
      return;
    }

    const imgEntry = this.GetMorphImgEntry(nMorphID);
    if (!imgEntry?.pImg) return;

    const actionName = MORPH_ACTION_NAMES[nAction] ?? `stand`;
    const actionProp = imgEntry.pImg.Get(actionName);
    if (!(actionProp instanceof WzProperty)) return;

    const frames = this._loadEntityFrames(actionProp);

    const entry: MorphActionEntry = {
      nMorphID, nAction, tLastAccessed: Date.now(), frames,
    };
    this._morphActions.set(key, entry);

    outFrames.length = 0;
    outFrames.push(...frames);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LoadFaceLook (OG: 0x41CAB0)
  // Loads face canvases for a specific emotion + accessory combination
  // ═══════════════════════════════════════════════════════════════════════════

  LoadFaceLook(nFaceID: number, nEmotion: number, nAcc: number): FaceLookEntry | null {
    // Cache key: combine face + emotion + acc
    const cacheKey = nFaceID | (nEmotion << 16) | (nAcc << 24);

    const cached = this._faceLookEntries.get(cacheKey);
    if (cached) {
      cached.tLastAccessed = Date.now();
      return cached;
    }

    if (!this._characterWz) return null;

    const strId = `${nFaceID.toString().padStart(8, '0')}.img`;
    const img = this._characterWz.GetItem(`Face/${strId}`);
    const root = img instanceof WzImage ? img.Root : null;
    if (!root) return null;

    const emotionName = FACE_EMOTION_NAMES[nEmotion] ?? `default`;
    const emotionProp = root.Get(emotionName);
    if (!(emotionProp instanceof WzProperty)) return null;

    // Read face canvases (emotion frames)
    const canvases: WzCanvas[] = [];
    for (let fi = 0; ; fi++) {
      const frameNode = emotionProp.Get(`${fi}`);
      if (!frameNode) break;

      if (frameNode instanceof WzCanvas) {
        canvases.push(frameNode);
      } else if (frameNode instanceof WzProperty) {
        const canvas = this._findFirstCanvas(frameNode);
        if (canvas) canvases.push(canvas);
      }
    }

    // If nAcc > 0, also load accessory overlay canvases
    if (nAcc > 0) {
      const accStrId = `${nAcc.toString().padStart(8, '0')}.img`;
      const accImg = this._characterWz.GetItem(`Accessory/${accStrId}`);
      const accRoot = accImg instanceof WzImage ? accImg.Root : null;
      if (accRoot) {
        const accEmotion = accRoot.Get(emotionName);
        if (accEmotion instanceof WzProperty) {
          for (let fi = 0; ; fi++) {
            const frameNode = accEmotion.Get(`${fi}`);
            if (!frameNode) break;

            if (frameNode instanceof WzCanvas) {
              canvases.push(frameNode);
            } else if (frameNode instanceof WzProperty) {
              const canvas = this._findFirstCanvas(frameNode);
              if (canvas) canvases.push(canvas);
            }
          }
        }
      }
    }

    const entry: FaceLookEntry = {
      nFaceID, nEmotion, nAcc, tLastAccessed: Date.now(), canvases,
    };
    this._faceLookEntries.set(cacheKey, entry);
    return entry;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Melee attack range (OG: 0x428D00)
  // ═══════════════════════════════════════════════════════════════════════════

  GetMeleeAttackRange(sAfterimageUOL: string | null, nAction: number): AttackRange | null {
    if (nAction === 74) {
      return { left: -88, top: -62, right: -18, bottom: -6 };
    }

    const action = nAction === 57 ? 41 : nAction;
    if (!sAfterimageUOL) return null;

    const afterimage = this._afterimages.get(sAfterimageUOL);
    if (afterimage && afterimage.ranges[action]) {
      return afterimage.ranges[action];
    }

    return null;
  }

  GetDefaultAttackRange(weaponType: number): AttackRange {
    return DEFAULT_ATTACK_RANGES[weaponType] ?? { left: -80, top: -60, right: 80, bottom: 20 };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Weapon afterimage (OG: 0x428080)
  // ═══════════════════════════════════════════════════════════════════════════

  GetWeaponAfterImage(sUOL: string, effectWz: WzPackage | null): WeaponAfterimage | null {
    if (!sUOL) return null;

    const cached = this._afterimages.get(sUOL);
    if (cached) return cached;

    if (!effectWz) return null;

    const afterimageRoot = effectWz.GetItem('afterimage.img');
    const root = afterimageRoot instanceof WzImage ? afterimageRoot.Root : null;
    if (!root) return null;

    const weaponNode = root.Get(sUOL);
    if (!(weaponNode instanceof WzProperty)) return null;

    const ranges: AttackRange[] = [];
    for (let action = 0; action < 200; action++) {
      const rangeNode = weaponNode.Get(`${action}`);
      if (rangeNode instanceof WzProperty) {
        ranges[action] = {
          left: this._readInt(rangeNode, 'l', 0),
          top: this._readInt(rangeNode, 't', 0),
          right: this._readInt(rangeNode, 'r', 0),
          bottom: this._readInt(rangeNode, 'b', 0),
        };
      }
    }

    const frames: WzCanvas[] = [];
    let fi = 0;
    while (true) {
      const frameNode = weaponNode.Get(`${fi}`);
      if (frameNode instanceof WzCanvas) frames.push(frameNode);
      else if (frameNode === null) break;
      fi++;
    }

    const afterimage: WeaponAfterimage = { uol: sUOL, ranges, frames };
    this._afterimages.set(sUOL, afterimage);
    return afterimage;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ProcessEquipmentForAction (OG: 0x427D00 equipment overrides)
  // ═══════════════════════════════════════════════════════════════════════════

  ProcessEquipmentForAction(
    nAction: number, nGender: number, aAvatarHairEquip: number[],
    nWeaponStickerID: number, nVehicleID: number,
  ): number[] {
    const b = [...aAvatarHairEquip];

    if (nAction === 47) {
      b.fill(0);
      b[0] = aAvatarHairEquip[0];
      b[1] = aAvatarHairEquip[1];
      b[3] = aAvatarHairEquip[3];
      b[4] = aAvatarHairEquip[4];
    } else {
      b[14] = 0;
      b[2] = 0;
      b[RING_BODY_PARTS[0]] = 0;

      const slot5 = b[5];
      const slot6 = b[6];
      if (Math.floor(slot5 / 10000) === 105 && slot6) {
        if (this._isCashItem(slot5) || !this._isCashItem(slot6)) {
          b[6] = 0;
        }
      }
      if (!b[5] && Math.floor(slot5 / 10000) !== 105) {
        b[5] = nGender !== 0 ? 1041046 : 1040036;
      }
      if (!b[6] && Math.floor(b[5] / 10000) !== 105) {
        b[6] = nGender !== 0 ? 1061039 : 1060026;
      }
    }

    for (const [slotStr, itemId] of Object.entries(HIDDEN_ITEMS)) {
      const slot = parseInt(slotStr);
      if (b[slot] === itemId) b[slot] = 0;
    }

    let weaponSticker = nWeaponStickerID;
    if (HIDDEN_WEAPON_STICKERS.includes(nWeaponStickerID)) {
      b[11] = 0;
      weaponSticker = 0;
    }

    const vCat = Math.floor(nVehicleID / 10000);
    if (VEHICLE_PREFIXES.includes(vCat)
        || VEHICLE_SPECIALS.includes(nVehicleID)
        || Math.floor(nVehicleID / 1000) === VEHICLE_1983_PREFIX) {
      b[10] = 0;
      b[11] = 0;
      if (nAction !== 257 && nAction !== 258 && nAction !== 64 && nAction !== 65) {
        if (nAction !== 45 && nAction !== 46) {
          b[0] = b[0];
        }
      }
    }

    if (nAction === 100) {
      b[10] = 0;
      b[11] = 0;
    }

    if (nGhostIndex(nAction) > 0) {
      for (let i = 0; i <= 59; i++) {
        if (i >= 2 && i !== 3 && i !== 4) b[i] = 0;
      }
    }

    if (weaponSticker && (nAction === 80 || nAction === 81)) {
      weaponSticker = 0;
    }

    return b;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SweepCache (OG: 0x415F60) — extended for all entity caches
  // ═══════════════════════════════════════════════════════════════════════════

  SweepCache(): void {
    const now = Date.now();
    if (now - this._lastSweep < ActionMan.SWEEP_INTERVAL_MS) return;
    this._lastSweep = now;

    const stale = now - ActionMan.STALE_THRESHOLD_MS;

    this._sweepMap(this._characterImgs, stale);
    this._sweepEntityMap(this._mobImgs, stale);
    this._sweepEntityMap(this._npcImgs, stale);
    this._sweepEntityMap(this._petImgs, stale);
    this._sweepEntityMap(this._employeeImgs, stale);
    this._sweepEntityMap(this._morphImgs, stale);

    this._sweepActionMap(this._mobActions, stale);
    this._sweepActionMap(this._npcActions, stale);
    this._sweepActionMap(this._petActions, stale);
    this._sweepActionMap(this._employeeActions, stale);
    this._sweepActionMap(this._summonedActions, stale);
    this._sweepActionMap(this._morphActions, stale);
    this._sweepActionMap(this._tamingMobActions, stale);
    this._sweepShadowPartnerMap(this._shadowPartnerActions, stale);

    for (const [, jobMap] of this._dragonActions) {
      this._sweepActionMap(jobMap, stale);
    }

    for (const [, entry] of this._faceLookEntries) {
      if (entry.tLastAccessed < stale) {
        this._faceLookEntries.delete(entry.nFaceID | (entry.nEmotion << 16) | (entry.nAcc << 24));
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Generic entity frame loader — the core WZ enumeration loop
  // ═══════════════════════════════════════════════════════════════════════════

  private _loadEntityFrames(actionProp: WzProperty): ActionFrame[] {
    const frames: ActionFrame[] = [];

    for (let fi = 0; ; fi++) {
      const frameNode = actionProp.Get(`${fi}`);
      if (!frameNode) break;

      let canvas: WzCanvas | null = null;
      let delay = 150;
      let flip = false;
      let move = { x: 0, y: 0 };
      let bodyRect = { left: 0, top: 0, right: 0, bottom: 0 };

      if (frameNode instanceof WzCanvas) {
        canvas = frameNode;
        const prop = canvas.Property;
        delay = this._readDelayProp(prop);
        flip = this._readFlipProp(prop);
        move = this._readMoveProp(prop);
        bodyRect = this._readBodyRectProp(prop);
      } else if (frameNode instanceof WzProperty) {
        // Property node — find first canvas child
        canvas = this._findFirstCanvas(frameNode);
        delay = this._readInt(frameNode, 'delay', 150);
        flip = this._readInt(frameNode, 'flip', 0) !== 0;
        move = this._readMove(frameNode);
        bodyRect = this._readBodyRect(frameNode);
      }

      if (canvas) {
        frames.push({
          canvas, delay,
          anchor: this._readAnchor(canvas),
          flip, rotate: 0, move,
          bodyRect,
          head: false,
        });
      }
    }

    return frames;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Internal helpers
  // ═══════════════════════════════════════════════════════════════════════════

  private _findFirstCanvas(prop: WzProperty): WzCanvas | null {
    for (const [, v] of Object.entries(prop.Items)) {
      if (v instanceof WzCanvas) return v;
    }
    return null;
  }

  private _readInt(node: WzProperty | null, key: string, defaultVal: number): number {
    if (!node) return defaultVal;
    const val = node.Get(key);
    if (typeof val === 'number') return val;
    if (typeof val === 'bigint') return Number(val);
    return defaultVal;
  }

  private _readStr(node: WzProperty | null, key: string): string {
    if (!node) return '';
    const val = node.Get(key);
    return typeof val === 'string' ? val : '';
  }

  private _readDelayProp(prop: WzProperty | null): number {
    if (!prop) return 150;
    const val = prop.Get('delay');
    if (typeof val === 'number') return val;
    if (typeof val === 'bigint') return Number(val);
    return 150;
  }

  private _readFlipProp(prop: WzProperty | null): boolean {
    if (!prop) return false;
    const val = prop.Get('flip');
    if (typeof val === 'number') return val !== 0;
    return false;
  }

  private _readMoveProp(prop: WzProperty | null): { x: number; y: number } {
    if (!prop) return { x: 0, y: 0 };
    const val = prop.Get('move');
    if (val instanceof WzVector) return { x: val.X, y: val.Y };
    return { x: 0, y: 0 };
  }

  private _readBodyRectProp(prop: WzProperty | null): { left: number; top: number; right: number; bottom: number } {
    if (!prop) return { left: 0, top: 0, right: 0, bottom: 0 };
    const lt = prop.Get('lt');
    const rb = prop.Get('rb');
    const ltX = lt instanceof WzVector ? lt.X : 0;
    const ltY = lt instanceof WzVector ? lt.Y : 0;
    const rbX = rb instanceof WzVector ? rb.X : 0;
    const rbY = rb instanceof WzVector ? rb.Y : 0;
    return { left: ltX, top: ltY, right: rbX, bottom: rbY };
  }

  private _readMove(node: WzProperty): { x: number; y: number } {
    const moveNode = node.Get('move');
    if (moveNode instanceof WzVector) return { x: moveNode.X, y: moveNode.Y };
    return { x: 0, y: 0 };
  }

  private _readBodyRect(node: WzProperty): { left: number; top: number; right: number; bottom: number } {
    const lt = node.Get('lt');
    const rb = node.Get('rb');
    return {
      left: lt instanceof WzVector ? lt.X : 0,
      top: lt instanceof WzVector ? lt.Y : 0,
      right: rb instanceof WzVector ? rb.X : 0,
      bottom: rb instanceof WzVector ? rb.Y : 0,
    };
  }

  private _readAnchor(canvas: WzCanvas): { x: number; y: number } {
    const prop = canvas.Property;
    if (!prop) return { x: 0, y: 0 };
    const origin = prop.Get('origin');
    if (origin instanceof WzVector) return { x: origin.X, y: origin.Y };
    return { x: 0, y: 0 };
  }

  private _readCanvasInt(canvas: WzCanvas, key: string, defaultVal: number): number {
    const prop = canvas.Property;
    if (!prop) return defaultVal;
    return this._readInt(prop, key, defaultVal);
  }

  private _readActionCode(prop: WzProperty, key: string): number {
    return this._readInt(prop, key, 0);
  }

  private _countChildren(prop: WzProperty): number {
    let count = 0;
    for (const key of Object.keys(prop.Items)) {
      if (/^\d+$/.test(key)) count++;
    }
    return count;
  }

  private _detectPieced(actionProp: WzProperty, firstChild: unknown): boolean {
    // An action is "pieced" if its children are WzProperty nodes with a "delay" sub-node
    // that maps to an action code (not a literal delay value)
    if (!(firstChild instanceof WzProperty)) return false;
    // Check if the first child has a "delay" key whose value resolves to an action code
    // In the OG, pieced actions have named sub-entries (like body parts) with their own delays
    // Simple actions have numeric frame entries with literal delay values
    const delayVal = firstChild.Get('delay');
    if (typeof delayVal === 'number' && delayVal >= 0 && delayVal < 273) {
      // Could be either — check if it has move/flip/face (simple) or sub-canvases (pieced)
      const hasCanvas = this._findFirstCanvas(firstChild) !== null;
      const hasMove = firstChild.Get('move') !== undefined;
      return !hasCanvas && !hasMove;
    }
    return false;
  }

  private _getNpcActionName(action: number): string {
    // NPC actions follow the same naming convention as characters
    return ActionNames[action] ?? `action${action}`;
  }

  private _getPetActionName(action: number): string {
    // OG: pet WZ node names differ from character ActionNames.
    // Pet templates use: walk1(0), stand1(1), alert(2), sit(3), fly(4),
    // ride1(5), ride2(6), ride3(7), hang(8)
    return PetActionNames[action] ?? `action${action}`;
  }

  /**
   * Character.nx image path for an equip/body id.
   * OG: get_equip_data_path (0x5A6060) — StringPool IDs 0x93E..0x18FA.
   */
  private _getEquipDataPath(itemId: number): string | null {
    const cat = Math.floor(itemId / 10000);
    const id8 = itemId.toString().padStart(8, '0');
    switch (true) {
      case cat === 0 || cat === 1: return `${id8}.img`; // body template (Character.nx root)
      case cat === 100: return `Cap/${id8}.img`;
      case cat >= 101 && cat <= 103: return `Accessory/${id8}.img`;
      case cat === 104: return `Coat/${id8}.img`;
      case cat === 105: return `Longcoat/${id8}.img`;
      case cat === 106: return `Pants/${id8}.img`;
      case cat === 107: return `Shoes/${id8}.img`;
      case cat === 108: return `Glove/${id8}.img`;
      case cat === 109 || cat === 119: return `Shield/${id8}.img`;
      case cat === 110: return `Cape/${id8}.img`;
      case cat === 111: return `Ring/${id8}.img`;
      case cat >= 112 && cat <= 115: return `Accessory/${id8}.img`;
      case cat >= 116 && cat <= 118: return null;
      case cat >= 130 && cat <= 160: return `Weapon/${id8}.img`;
      case cat >= 161 && cat <= 165: return `Mechanic/${id8}.img`;
      case cat >= 166 && cat <= 179: return `Weapon/${id8}.img`;
      case cat >= 180 && cat <= 183: return `PetEquip/${id8}.img`;
      case cat >= 190 && cat <= 193: return `TamingMob/${id8}.img`;
      case cat >= 194 && cat <= 197: return `Dragon/${id8}.img`;
      case cat === 198: return `TamingMob/${id8}.img`;
      default: return null;
    }
  }

  private _getWeaponType(itemId: number): number {
    const cat = Math.floor(itemId / 10000);
    if (cat >= 130 && cat <= 139) return 1;
    if (cat >= 140 && cat <= 149) return 12;
    if (cat >= 150 && cat <= 159) return 7;
    if (cat >= 160 && cat <= 169) return 8;
    if (cat >= 170 && cat <= 179) return 9;
    if (cat >= 120 && cat <= 129) return 10;
    if (cat >= 110 && cat <= 119) return 11;
    return 0;
  }

  private _isCashItem(itemId: number): boolean {
    const cat = Math.floor(itemId / 10000);
    return cat === 502 || cat === 517;
  }

  // ── Sweep helpers ──────────────────────────────────────────────────────

  private _sweepMap<K>(map: Map<K, { tLastAccessed: number }>, stale: number): void {
    for (const [key, entry] of map) {
      if (entry.tLastAccessed < stale) map.delete(key);
    }
  }

  private _sweepEntityMap(map: Map<number, EntityImgEntry>, stale: number): void {
    for (const [key, entry] of map) {
      if (entry.tLastAccessed < stale) map.delete(key);
    }
  }

  private _sweepActionMap<T extends { tLastAccessed: number }>(map: Map<number, T>, stale: number): void {
    for (const [key, entry] of map) {
      if (entry.tLastAccessed < stale) map.delete(key);
    }
  }

  private _sweepShadowPartnerMap(map: Map<number, ShadowPartnerActionEntry>, stale: number): void {
    for (const [key, entry] of map) {
      if (entry.tLastAccessed < stale) map.delete(key);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Static action code mappings (OG g_as*ActionName tables)
  // ═══════════════════════════════════════════════════════════════════════════

  static GetActionName(actionCode: number): string {
    return ActionNames[actionCode] ?? `action${actionCode}`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Character action names (273 entries, from OG s_aCharacterActionData)
// Maps action code → WZ node name under Character.wz/00002000.img
// ═══════════════════════════════════════════════════════════════════════════════

const ActionNames: Record<number, string> = {
  0: 'walk1', 1: 'walk2', 2: 'stand1', 3: 'stand2',
  4: 'alert', 5: 'swingO1', 6: 'swingO2', 7: 'swingO3',
  8: 'swingOF', 9: 'swingT1', 10: 'swingT2', 11: 'swingT3',
  12: 'swingTF', 13: 'stabO1', 14: 'stabO2', 15: 'stabOF',
  16: 'stabT1', 17: 'stabT2', 18: 'stabTF', 19: 'swingP1',
  20: 'swingP2', 21: 'swingP3', 22: 'swingPF', 23: 'shoot1',
  24: 'shoot2', 25: 'shootF', 26: 'proneStab', 27: 'prone',
  28: 'heal', 29: 'fly', 30: 'jump', 31: 'sit',
  32: 'ladder', 33: 'rope', 34: 'dead', 35: 'rise',
  36: 'attack1', 37: 'attack2', 38: 'attack3', 39: 'attack4',
  40: 'attack5', 41: 'attack6', 42: 'attack7', 43: 'attack8',
  44: 'skill1', 45: 'skill2', 46: 'skill3', 47: 'skill4',
  48: 'charge', 50: 'combo', 51: 'double', 52: 'triple',
  53: 'quadruple', 54: 'quintuple', 55: 'special1', 56: 'special2',
  57: 'proneStab', 60: 'alert', 61: 'tamingMob',
  62: 'horse', 63: 'attack6', 64: 'attack7', 65: 'attack8',
  66: 'attack1', 67: 'attack2', 68: 'attack3', 69: 'attack4',
  70: 'attack5', 71: 'attack6', 72: 'attack7', 73: 'attack8',
  74: 'attack9', 75: 'attack10', 76: 'attack11', 77: 'attack12',
  78: 'attack13', 79: 'attack14', 80: 'skill5', 81: 'skill6',
  82: 'skill7', 83: 'skill8', 84: 'skill9', 85: 'skill10',
  86: 'skill11', 87: 'skill12', 88: 'skill13', 89: 'skill14',
  90: 'skill15', 91: 'skill16', 92: 'skill17', 93: 'skill18',
  94: 'skill19', 95: 'skill20', 96: 'skill21', 97: 'skill22',
  98: 'skill23', 99: 'skill24', 100: 'skill25',
  200: 'alert1', 201: 'alert2', 202: 'alert3',
  257: 'attack1', 258: 'attack2',
};

/** OG: pet WZ node names — pets use different node names than characters. */
const PetActionNames: Record<number, string> = {
  0: 'walk1', 1: 'stand1', 2: 'alert', 3: 'sit',
  4: 'fly', 5: 'ride1', 6: 'ride2', 7: 'ride3', 8: 'hang',
};

// ═══════════════════════════════════════════════════════════════════════════════
// Default attack ranges per weapon type
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_ATTACK_RANGES: Record<number, AttackRange> = {
  1:  { left: -80, top: -60, right: 80, bottom: 20 },
  2:  { left: -80, top: -60, right: 80, bottom: 20 },
  3:  { left: -80, top: -60, right: 80, bottom: 20 },
  4:  { left: -60, top: -50, right: 60, bottom: 10 },
  5:  { left: -100, top: -60, right: 100, bottom: 20 },
  6:  { left: -100, top: -60, right: 100, bottom: 20 },
  7:  { left: -80, top: -60, right: 200, bottom: 20 },
  8:  { left: -80, top: -60, right: 200, bottom: 20 },
  9:  { left: -60, top: -50, right: 60, bottom: 10 },
  10: { left: -80, top: -60, right: 80, bottom: 20 },
  11: { left: -80, top: -60, right: 80, bottom: 20 },
  12: { left: -100, top: -60, right: 100, bottom: 20 },
  13: { left: -100, top: -60, right: 100, bottom: 20 },
  14: { left: -100, top: -60, right: 100, bottom: 20 },
  15: { left: -60, top: -50, right: 60, bottom: 10 },
  16: { left: -80, top: -60, right: 200, bottom: 20 },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Helper: ghost index (returns >0 for ghost actions)
// ═══════════════════════════════════════════════════════════════════════════════

function nGhostIndex(action: number): number {
  // Ghost actions: action 47 maps to ghost index 1
  return action === 47 ? 1 : 0;
}
