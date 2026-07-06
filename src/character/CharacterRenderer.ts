import { Sprite } from 'pixi.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import { WzSprite } from '../render/WzSprite.js';
import { WzPackage } from '../wz/WzPackage.js';
import { WzProperty } from '../wz/WzProperty.js';
import { WzCanvas } from '../wz/WzCanvas.js';
import { WzUol } from '../wz/WzUol.js';
import { WzVector } from '../wz/WzVector.js';
import { AvatarLook } from '../domain/AvatarLook.js';
import { BodyPartSlot } from '../domain/BodyPartSlot.js';
import { AvatarZMap } from './AvatarZMap.js';
import { AttackAction } from './AttackAction.js';
import { Stance, StanceToWzKey } from './Stance.js';

const EmotionNames = [
  'default', 'hit', 'smile', 'troubled', 'cry', 'angry', 'bewildered', 'stunned',
  'vomit', 'oops', 'cheers', 'chu', 'wink', 'pain', 'glitter', 'blaze', 'shine',
  'love', 'despair', 'hum', 'bowing', 'hot', 'dam', 'qBlue',
];

function EmotionName(id: number): string {
  return id >= 0 && id < EmotionNames.length ? EmotionNames[id] : 'default';
}

interface AvatarPart {
  sprite: WzSprite;
  map: Record<string, { x: number; y: number }>;
  z: string;
}

/** Real per-frame avatar anchor points, world-space (post mirror-flip).
    Mirrors OG's CActionFrame::Draw output points (ptNavel/ptHead/ptBrow/
    ptMuzzle, confirmed live via IDA) — that function is otherwise a pure
    native-engine canvas-merge optimization with no PixiJS equivalent, but
    these four named points are genuinely useful and were previously only
    approximated by hardcoded per-consumer Y-offset guesses (ChatBalloon
    -50, EmotionBubble -50, DamageNumber -60, ProjectileOverlay -40) that
    don't account for actual character height/equips varying per frame. */
export interface AvatarAnchors {
  navel: { x: number; y: number };
  head: { x: number; y: number };
  brow: { x: number; y: number };
  /** Weapon-tip point (from the weapon canvas's own 'muzzle' map key) —
      falls back to the weapon's own pen position (or the hand's, if no
      weapon equipped) when the equipped weapon has no muzzle anchor
      (true for most melee weapons; ranged weapons are the common case
      that authors one). */
  muzzle: { x: number; y: number };
}

export class CharacterRenderer {
  private _characterWz: WzPackage | null;
  private _itemWz: WzPackage | null;
  private _loader: WzTextureLoader;
  private _zmap: AvatarZMap;
  private _partCache = new Map<string, AvatarPart | null>();

  constructor(
    characterWz: WzPackage | null,
    itemWz: WzPackage | null,
    baseWz: WzPackage | null,
    loader: WzTextureLoader,
  ) {
    this._characterWz = characterWz;
    this._itemWz = itemWz;
    this._loader = loader;
    this._zmap = new AvatarZMap(baseWz);
  }

  IsTwoHanded(look: AvatarLook): boolean {
    const w = this._visibleWeaponId(look);
    if (w === 0) return false;
    const info = this._characterWz?.GetItem(`Weapon/${w.toString().padStart(8, '0')}.img/info`);
    const walk = info instanceof WzProperty ? info.Get('walk') : undefined;
    if (typeof walk === 'number') return walk !== 1;
    if (typeof walk === 'bigint') return Number(walk) !== 1;
    return false;
  }

  FrameCount(look: AvatarLook, actionKey: string): number {
    if (this._characterWz === null) return 1;
    const skin = look.skin;
    const bodyId = `00002${skin.toString().padStart(3, '0')}.img`;
    let n = 0;
    while (this._characterWz.GetItem(`${bodyId}/${actionKey}/${n}`) !== null) n++;
    return Math.max(1, n);
  }

  FrameCountForStance(look: AvatarLook, stance: Stance): number {
    return this.FrameCount(look, StanceToWzKey(stance));
  }

  private _weaponAttackType(look: AvatarLook): number {
    const w = this._visibleWeaponId(look);
    if (w === 0) return 0;
    const info = this._characterWz?.GetItem(`Weapon/${w.toString().padStart(8, '0')}.img/info`);
    if (info instanceof WzProperty) {
      const atk = info.Get('attack');
      if (typeof atk === 'number') return atk;
      if (typeof atk === 'bigint') return Number(atk);
    }
    return 0;
  }

  PickAttackAction(look: AvatarLook, prone: boolean): string {
    return AttackAction.Pick(this._weaponAttackType(look), prone, () => Math.random());
  }

  // ── Face blink (shared clock) ──

  private _blinking = false;
  private _blinkFrame = 0;
  private _blinkFrameTimer = 0;
  private _blinksRemaining = 0;
  private _idleTimer = 0;
  private _nextBlinkIn = 3000;
  private _activeBlinkDelays: number[] = [];
  private _blinkDelaysByFace = new Map<number, number[]>();
  private _emotionDelaysByFace = new Map<string, number[]>();

  Update(dt: number): void {
    const ms = dt * 1000;
    if (!this._blinking) {
      this._idleTimer += ms;
      if (this._idleTimer >= this._nextBlinkIn && this._activeBlinkDelays.length > 0) {
        this._blinking = true;
        this._blinkFrame = 0;
        this._blinkFrameTimer = 0;
        this._blinksRemaining = 1 + Math.floor(Math.random() * 3);
      }
      return;
    }
    this._blinkFrameTimer += ms;
    const delay = this._blinkFrame < this._activeBlinkDelays.length
      ? this._activeBlinkDelays[this._blinkFrame]
      : 60;
    if (this._blinkFrameTimer < delay) return;
    this._blinkFrameTimer -= delay;
    this._blinkFrame++;
    if (this._blinkFrame < this._activeBlinkDelays.length) return;
    this._blinkFrame = 0;
    this._blinksRemaining--;
    if (this._blinksRemaining > 0) return;
    this._blinking = false;
    this._idleTimer = 0;
    this._nextBlinkIn = 2000 + Math.floor(Math.random() * 3000);
  }

  // ── Draw ──


  Draw(
    look: AvatarLook,
    actionKey: string,
    frame: number,
    positionX: number,
    positionY: number,
    facingLeft: boolean,
    emotionId = 0,
    emotionFrame = 0,
  ): { layers: Sprite[][]; anchors: AvatarAnchors } {
    const fallbackAnchors: AvatarAnchors = {
      navel: { x: positionX, y: positionY },
      head: { x: positionX, y: positionY },
      brow: { x: positionX, y: positionY },
      muzzle: { x: positionX, y: positionY },
    };
    if (this._characterWz === null) return { layers: [[], [], [], [], []], anchors: fallbackAnchors };

    const st = actionKey;
    const isClimbing = actionKey === 'ladder' || actionKey === 'rope';
    const skin = look.skin;
    const bodyId = `00002${skin.toString().padStart(3, '0')}.img`;
    const headId = `00012${skin.toString().padStart(3, '0')}.img`;

    const body = this._loadPart(`${bodyId}/${st}/${frame}/body`);
    const arm = this._loadPart(`${bodyId}/${st}/${frame}/arm`);
    const armOverHair = this._loadPart(`${bodyId}/${st}/${frame}/armOverHair`);
    const hand = this._loadPart(`${bodyId}/${st}/${frame}/hand`);
    const head = this._loadPart(`${headId}/${st}/${frame}/head`);
    const face = this._loadFace(look.face, emotionId, emotionFrame);

    let hairBelow: AvatarPart | null, hairShade: AvatarPart | null, hair: AvatarPart | null, hairOver: AvatarPart | null;
    if (isClimbing) {
      const backHair = (part: string): AvatarPart | null =>
        this._loadPart(`Hair/${look.hair.toString().padStart(8, '0')}.img/${st}/${frame}/${part}`)
        ?? this._loadPart(`Hair/${look.hair.toString().padStart(8, '0')}.img/${st}/0/${part}`)
        ?? this._loadPart(`Hair/${look.hair.toString().padStart(8, '0')}.img/backDefault/${part}`);
      hairBelow = backHair('backHairBelowCap');
      hair = backHair('backHair');
      hairShade = null;
      hairOver = null;
    } else {
      hairBelow = this._loadHair(look.hair, 'hairBelowBody');
      hairShade = this._loadHair(look.hair, 'hairShade');
      hair = this._loadHair(look.hair, 'hair');
      hairOver = this._loadHair(look.hair, 'hairOverHead');
    }

    let cape: AvatarPart | null = null, coat: AvatarPart | null = null, coatArm: AvatarPart | null = null;
    let pants: AvatarPart | null = null, shoes: AvatarPart | null = null;
    let gloves: AvatarPart | null = null, cap: AvatarPart | null = null, weapon: AvatarPart | null = null;
    // TODO_AUDIT.md Hundred-and-forty-ninth pass: render decoded accessory/shield/cash weapon slots instead of dropping them.
    let shield: AvatarPart | null = null, faceAcc: AvatarPart | null = null, eyeAcc: AvatarPart | null = null, earAcc: AvatarPart | null = null;

    for (const [slot, itemId] of look.hairEquip) {
      const st_ = st;
      const fr = frame;
      switch (slot) {
        case BodyPartSlot.Cape:
          cape = this._loadEquip('Cape', itemId, st_, fr, 'cape');
          break;
        case BodyPartSlot.Clothes: {
          const coatCat = Math.floor(itemId / 10000) === 105 ? 'Longcoat' : 'Coat';
          coat = this._loadEquip(coatCat, itemId, st_, fr, 'mail');
          coatArm = this._loadEquip(coatCat, itemId, st_, fr, 'mailArm');
          break;
        }
        case BodyPartSlot.Pants:
          pants = this._loadEquip('Pants', itemId, st_, fr, 'pants');
          break;
        case BodyPartSlot.Shoes:
          shoes = this._loadEquip('Shoes', itemId, st_, fr, 'shoes');
          break;
        case BodyPartSlot.Gloves:
          gloves = this._loadEquip('Glove', itemId, st_, fr, 'glove');
          break;
        case BodyPartSlot.FaceAcc:
          faceAcc = this._loadAccessory(itemId, emotionId, emotionFrame);
          break;
        case BodyPartSlot.EyeAcc:
          eyeAcc = this._loadAccessory(itemId, emotionId, emotionFrame);
          break;
        case BodyPartSlot.EarAcc:
          earAcc = this._loadAccessory(itemId, emotionId, emotionFrame);
          break;
        case BodyPartSlot.Shield:
          shield = this._loadEquip('Shield', itemId, st_, fr, 'shield');
          break;
        case BodyPartSlot.Cap:
          cap = this._loadEquip('Cap', itemId, st_, fr, 'cap');
          break;
        case BodyPartSlot.Weapon:
          if (look.weaponStickerId === 0 && !look.hairEquip.has(BodyPartSlot.CashWeapon)) weapon = this._loadWeapon(itemId, st_, fr);
          break;
        case BodyPartSlot.CashWeapon:
          weapon = this._loadWeapon(itemId, st_, fr);
          break;
      }
    }
    if (look.weaponStickerId !== 0) weapon = this._loadWeapon(look.weaponStickerId, st, frame);

    // ── anchor chaining ──
    const bodyPenX = positionX;
    const bodyPenY = positionY;
    const armPen = this._align(arm, body, bodyPenX, bodyPenY, 'navel');
    const headPen = this._align(head, body, bodyPenX, bodyPenY, 'neck');

    type DrawEntry = { spr: WzSprite; penX: number; penY: number; z: number; layer: number; order: number };
    const draws: DrawEntry[] = [];
    let emitOrder = 0;
    const emit = (part: AvatarPart | null, px: number, py: number) => {
      if (part !== null) draws.push({
        spr: part.sprite, penX: px, penY: py,
        z: this._zmap.FrontIndex(part.z),
        layer: this._zmap.LayerOf(part.z),
        order: emitOrder++,
      });
    };

    emit(body, bodyPenX, bodyPenY);

    // Hand pen computed early — weapon positioning depends on it.
    const handPen = this._align(hand, body, bodyPenX, bodyPenY, 'navel');

    // Weapon: emit right after body so it sits between body and hand.
    // Parent anchor varies by stance (first vector key in its map).
    const wKey = this._firstMapKey(weapon);
    let wRefPart: AvatarPart | null;
    let wRefPenX: number;
    let wRefPenY: number;
    if (wKey === 'handMove') {
      wRefPart = hand; wRefPenX = handPen.x; wRefPenY = handPen.y;
    } else if (wKey === 'navel') {
      wRefPart = body; wRefPenX = bodyPenX; wRefPenY = bodyPenY;
    } else {
      wRefPart = arm; wRefPenX = armPen.x; wRefPenY = armPen.y;
    }
    const weapPen = this._align(weapon, wRefPart, wRefPenX, wRefPenY, wKey ?? 'hand');
    emit(weapon, weapPen.x, weapPen.y);

    emit(arm, armPen.x, armPen.y);
    const armOverHairPen = this._align(armOverHair, body, bodyPenX, bodyPenY, 'navel');
    emit(armOverHair, armOverHairPen.x, armOverHairPen.y);
    emit(hand, handPen.x, handPen.y);
    emit(head, headPen.x, headPen.y);
    if (!isClimbing) {
      const facePen = this._align(face, head, headPen.x, headPen.y, 'brow');
      emit(face, facePen.x, facePen.y);
    }

    const emitHair = (part: AvatarPart | null) => {
      if (part === null) return;
      const p = this._align(part, head, headPen.x, headPen.y, 'brow');
      emit(part, p.x, p.y);
    };
    emitHair(hairBelow);
    emitHair(hairShade);
    emitHair(hair);
    emitHair(hairOver);

    const emitAtNavel = (part: AvatarPart | null) => {
      if (part === null) return;
      const p = this._align(part, body, bodyPenX, bodyPenY, 'navel');
      emit(part, p.x, p.y);
    };
    emitAtNavel(cape);
    emitAtNavel(coat);
    emitAtNavel(coatArm);
    emitAtNavel(pants);
    emitAtNavel(shoes);

    const glovesPen = this._align(gloves, arm, armPen.x, armPen.y, 'hand');
    emit(gloves, glovesPen.x, glovesPen.y);

    const shieldPen = this._align(shield, arm, armPen.x, armPen.y, this._firstMapKey(shield) ?? 'hand');
    emit(shield, shieldPen.x, shieldPen.y);

    const capPen = this._align(cap, head, headPen.x, headPen.y, 'brow');
    emit(cap, capPen.x, capPen.y);

    const emitFacePart = (part: AvatarPart | null) => {
      if (part === null) return;
      const p = this._align(part, head, headPen.x, headPen.y, 'brow');
      emit(part, p.x, p.y);
    };
    emitFacePart(faceAcc);
    emitFacePart(eyeAcc);
    emitFacePart(earAcc);

    // Muzzle: weapon's own 'muzzle' map key (ranged weapons author one) is
    // a point WITHIN the weapon sprite, not a chaining anchor between two
    // parts — add it directly to the weapon's own pen rather than going
    // through `_align` (which computes "where to draw part B so its anchor
    // meets part A's anchor", not "where is point P inside this sprite").
    // Falls back to the weapon's own pen (or the hand's, if nothing is
    // equipped) when there's no muzzle key (true for most melee weapons).
    const muzzleOffset = weapon?.map['muzzle'];
    const muzzlePen = muzzleOffset !== undefined
      ? { x: weapPen.x + muzzleOffset.x, y: weapPen.y + muzzleOffset.y }
      : (weapon ? weapPen : handPen);

    // Group by OG layer (0-4), sorted by emit order within each layer.
    // The emit order matches the OG's correct draw order: body first (behind),
    // then equips (in front), regardless of zmap.img child ordering.
    // Sprites use pen positions relative to (positionX, positionY) — callers
    // that need facing apply a container-level flip at the draw origin.
    const layers: Sprite[][] = [[], [], [], [], []];
    draws.sort((a, b) => a.order - b.order);
    for (const d of draws) {
      const sp = d.spr.NewSprite(false);
      sp.x = d.penX - positionX;
      sp.y = d.penY - positionY;
      layers[d.layer].push(sp);
    }

    // WZ body sprites are authored facing LEFT. When facing right, mirror
    // each part's pen about the body anchor so layered parts stay aligned.
    const mirror = (pen: { x: number; y: number }): { x: number; y: number } =>
      facingLeft ? pen : { x: 2 * positionX - pen.x, y: pen.y };

    const navelPen = { x: bodyPenX + (body?.map['navel']?.x ?? 0), y: bodyPenY + (body?.map['navel']?.y ?? 0) };
    const browPen = this._align(face, head, headPen.x, headPen.y, 'brow');

    return {
      layers,
      anchors: {
        navel: mirror(navelPen),
        head: mirror(headPen),
        brow: mirror(browPen),
        muzzle: mirror(muzzlePen),
      },
    };
  }

  // ── Frame delay lookup ──

  EmotionFrameDelays(faceId: number, emotionId: number): number[] {
    if (emotionId <= 0 || emotionId >= EmotionNames.length) return [];
    const key = `${faceId}-${emotionId}`;
    const cached = this._emotionDelaysByFace.get(key);
    if (cached !== undefined) return cached;

    const name = EmotionName(emotionId);
    const delays: number[] = [];
    for (let i = 0; i < 32; i++) {
      const frame = this._characterWz?.GetItem(`Face/${faceId.toString().padStart(8, '0')}.img/${name}/${i}`);
      if (!(frame instanceof WzProperty)) break;
      const d = frame.Get('delay');
      const delayMs = typeof d === 'number' ? d : typeof d === 'bigint' ? Number(d) : 2500;
      delays.push(delayMs <= 0 ? 2500 : delayMs);
    }
    if (delays.length === 0) {
      const root = this._characterWz?.GetItem(`Face/${faceId.toString().padStart(8, '0')}.img/${name}`);
      if (root instanceof WzProperty && root.Get('face') instanceof WzCanvas) {
        const d = root.Get('delay');
        const delayMs = typeof d === 'number' ? d : typeof d === 'bigint' ? Number(d) : 2500;
        delays.push(delayMs <= 0 ? 2500 : delayMs);
      }
    }
    this._emotionDelaysByFace.set(key, delays);
    return delays;
  }

  EmotionDurationMs(faceId: number, emotionId: number): number {
    const d = this.EmotionFrameDelays(faceId, emotionId);
    let sum = 0;
    for (const x of d) sum += x;
    return sum;
  }

  GetFrameDelay(look: AvatarLook, actionKey: string, frameIdx: number): number {
    const skin = look.skin;
    const bodyId = `00002${skin.toString().padStart(3, '0')}.img`;
    const prop = this._characterWz?.GetItem(`${bodyId}/${actionKey}/${frameIdx}`);
    if (prop instanceof WzProperty) {
      const d = prop.Get('delay');
      if (typeof d === 'number') return d;
      if (typeof d === 'bigint') return Number(d);
    }
    return 120;
  }

  // ── Private helpers ──

  private _ensureBlinkDelays(faceId: number): number[] {
    const cached = this._blinkDelaysByFace.get(faceId);
    if (cached !== undefined) return cached;
    const delays: number[] = [];
    for (let i = 0; i < 16; i++) {
      const frame = this._characterWz?.GetItem(`Face/${faceId.toString().padStart(8, '0')}.img/blink/${i}`);
      if (!(frame instanceof WzProperty)) break;
      const d = frame.Get('delay');
      const delayMs = typeof d === 'number' ? d : typeof d === 'bigint' ? Number(d) : 60;
      delays.push(delayMs <= 0 ? 60 : delayMs);
    }
    this._blinkDelaysByFace.set(faceId, delays);
    return delays;
  }

  private _loadFace(faceId: number, emotionId: number, emotionFrame: number): AvatarPart | null {
    if (emotionId > 0) {
      const name = EmotionName(emotionId);
      let node = this._loadPart(`Face/${faceId.toString().padStart(8, '0')}.img/${name}/${emotionFrame}/face`);
      if (node !== null) return node;
      node = this._loadPart(`Face/${faceId.toString().padStart(8, '0')}.img/${name}/face`);
      if (node !== null) return node;
    }
    this._activeBlinkDelays = this._ensureBlinkDelays(faceId);
    if (this._blinking && this._activeBlinkDelays.length > 0) {
      const bf = Math.min(this._blinkFrame, this._activeBlinkDelays.length - 1);
      const blink = this._loadPart(`Face/${faceId.toString().padStart(8, '0')}.img/blink/${bf}/face`);
      if (blink !== null) return blink;
    }
    return this._loadPart(`Face/${faceId.toString().padStart(8, '0')}.img/default/face`);
  }

  private _loadHair(hairId: number, layer: string): AvatarPart | null {
    return this._loadPart(`Hair/${hairId.toString().padStart(8, '0')}.img/default/${layer}`)
      ?? this._loadPart(`Hair/${hairId.toString().padStart(8, '0')}.img/stand1/0/${layer}`);
  }

  private _loadEquip(category: string, itemId: number, st: string, frame: number, vslot: string): AvatarPart | null {
    return this._loadPart(`${category}/${itemId.toString().padStart(8, '0')}.img/${st}/${frame}/${vslot}`);
  }

  private _loadAccessory(itemId: number, emotionId: number, emotionFrame: number): AvatarPart | null {
    const root = `Accessory/${itemId.toString().padStart(8, '0')}.img`;
    const name = EmotionName(emotionId);
    return this._loadPart(`${root}/${name}/${emotionFrame}/default`)
      ?? this._loadPart(`${root}/${name}/default`)
      ?? this._loadPart(`${root}/default/default`);
  }

  private _loadWeapon(itemId: number, st: string, frame: number): AvatarPart | null {
    const wt = Math.floor(itemId / 10000) % 100;
    return this._loadPart(`Weapon/${itemId.toString().padStart(8, '0')}.img/${wt}/${st}/${frame}/weapon`)
      ?? this._loadPart(`Weapon/${itemId.toString().padStart(8, '0')}.img/${st}/${frame}/weapon`);
  }

  private _visibleWeaponId(look: AvatarLook): number {
    if (look.weaponStickerId !== 0) return look.weaponStickerId;
    const cashWeapon = look.hairEquip.get(BodyPartSlot.CashWeapon);
    if (cashWeapon) return cashWeapon;
    return look.hairEquip.get(BodyPartSlot.Weapon) ?? 0;
  }

  private _loadPart(path: string): AvatarPart | null {
    const cached = this._partCache.get(path);
    if (cached !== undefined) return cached;
    let part: AvatarPart | null = null;
    try {
      let node = this._characterWz?.GetItem(path);
      if (node instanceof WzUol) node = node.Resolve();
      if (node instanceof WzCanvas) {
        const sprite = this._loader.Load(node);
        if (sprite !== null) {
          part = { sprite, map: this._readMap(node), z: this._readZ(node) };
        }
      }
    } catch {
      // part not found — keep null
    }
    this._partCache.set(path, part);
    return part;
  }

  private _align(
    part: AvatarPart | null,
    refPart: AvatarPart | null,
    refPenX: number,
    refPenY: number,
    key: string,
  ): { x: number; y: number } {
    if (part === null || refPart === null) return { x: refPenX, y: refPenY };
    const refAnchor = refPart.map[key];
    if (refAnchor === undefined) return { x: refPenX, y: refPenY };
    const px = refPenX + refAnchor.x;
    const py = refPenY + refAnchor.y;
    const partAnchor = part.map[key];
    if (partAnchor === undefined) return { x: px, y: py };
    return { x: px - partAnchor.x, y: py - partAnchor.y };
  }

  private _firstMapKey(part: AvatarPart | null): string | null {
    if (part === null) return null;
    for (const k of Object.keys(part.map)) return k;
    return null;
  }

  private _readMap(canvas: WzCanvas): Record<string, { x: number; y: number }> {
    const map: Record<string, { x: number; y: number }> = {};
    const mp = canvas.Property.Get('map');
    if (mp instanceof WzProperty) {
      for (const [key, value] of Object.entries(mp.Items)) {
        if (value instanceof WzVector) {
          map[key] = { x: value.X, y: value.Y };
        }
      }
    }
    return map;
  }

  private _readZ(canvas: WzCanvas): string {
    const z = canvas.Property.Get('z');
    return typeof z === 'string' ? z : '';
  }
}
