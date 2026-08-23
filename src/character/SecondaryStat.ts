import { InPacket } from '../net/packet/InPacket.js';

function popcount64(x: bigint): number {
  let c = 0;
  let v = x;
  while (v) { c += Number(v & 1n); v >>= 1n; }
  return c;
}

// CharacterTemporaryStat bit positions — v95 wire layout matching the server's
// CharacterTemporaryStat enum (henesys port) and OG DecodeForLocal. Entry order
// is NOT ascending bit order (see LOCAL_ENTRY_ORDER below).
const CTS_PAD                = 0n;
const CTS_PDD                = 1n;
const CTS_MAD                = 2n;
const CTS_MDD                = 3n;
const CTS_ACC                = 4n;
const CTS_EVA                = 5n;
const CTS_CRAFT              = 6n;
const CTS_SPEED              = 7n;
const CTS_JUMP               = 8n;
const CTS_MAGIC_GUARD        = 9n;
const CTS_DARK_SIGHT         = 10n;
const CTS_BOOSTER            = 11n;
const CTS_POWER_GUARD        = 12n;
const CTS_MAX_HP             = 13n;
const CTS_MAX_MP             = 14n;
const CTS_INVINCIBLE         = 15n;
const CTS_SOUL_ARROW         = 16n;
const CTS_STUN               = 17n;
const CTS_POISON             = 18n;
const CTS_SEAL               = 19n;
const CTS_DARKNESS           = 20n;
const CTS_COMBO              = 21n;   // ComboCounter
const CTS_CHARGE             = 22n;   // WeaponCharge
const CTS_DRAGON_BLOOD       = 23n;
const CTS_HOLY_SYMBOL        = 24n;
const CTS_MESO_UP            = 25n;
const CTS_SHADOW_PARTNER     = 26n;
const CTS_PICK_POCKET        = 27n;
const CTS_MESO_GUARD         = 28n;
const CTS_THAW               = 29n;
const CTS_WEAKNESS           = 30n;
const CTS_CURSE              = 31n;
const CTS_SLOW               = 32n;
const CTS_MORPH              = 33n;
const CTS_REGEN              = 34n;
const CTS_BASIC_STAT_UP      = 35n;   // Maple Warrior %
const CTS_STANCE             = 36n;
const CTS_SHARP_EYES         = 37n;
const CTS_MANA_REFLECTION    = 38n;
const CTS_ATTRACT            = 39n;
const CTS_INFINITY           = 41n;
const CTS_BARRIER            = 50n;
const CTS_SPARK              = 61n;
const CTS_WIND_WALK          = 66n;
const CTS_ARAN_COMBO         = 68n;   // ComboAbilityBuff
const CTS_COMBO_DRAIN        = 69n;
const CTS_COMBO_BARRIER      = 70n;
const CTS_BODY_PRESSURE      = 71n;
const CTS_SMART_KNOCKBACK    = 72n;
const CTS_REPEAT_EFFECT      = 73n;
const CTS_EXP_BUFF_RATE      = 74n;
const CTS_STOP_PORTION       = 75n;
const CTS_STOP_MOTION        = 76n;
const CTS_FEAR               = 77n;
const CTS_EVAN_SLOW          = 78n;
const CTS_MAGIC_SHIELD       = 79n;
const CTS_MAGIC_RESISTANCE   = 80n;
const CTS_SOUL_STONE         = 81n;
const CTS_FLYING             = 82n;
const CTS_FROZEN             = 83n;
const CTS_SUDDEN_DEATH       = 86n;
const CTS_NOT_DAMAGED        = 87n;
const CTS_FINAL_CUT          = 88n;
const CTS_THORNS_EFFECT      = 89n;
const CTS_SWALLOW_CRITICAL   = 102n;
const CTS_DICE               = 116n;  // inline: 22 extra ints
const CTS_BLESSING_ARMOR     = 117n;  // inline: 1 extra int
const CTS_DAMR               = 118n;
const CTS_TELEPORT_MASTERY   = 119n;
const CTS_COMBAT_ORDERS      = 120n;
const CTS_BEHOLDER           = 121n;
const CTS_RIDE_VEHICLE       = 125n;  // also written again in the two-state tail
const CTS_GUIDED_BULLET      = 127n;  // also written again in the two-state tail

// Swallow-buff group (jaguar): one shared trailing byte when any is set.
const SWALLOW_GROUP_BITS = [90n, 102n, 103n, 104n, 105n];

// Two-state tail stats: byte+int+int+int+short each.
const TWO_STATE_ORDER: Array<[bigint, keyof BuffStatValues | null]> = [
  [CTS_RIDE_VEHICLE, 'rideVehicle'],
  [126n, null],                    // PartyBooster
  [CTS_GUIDED_BULLET, 'guidedBullet'],
];

/**
 * LOCAL_ENCODE_ORDER mirror — the exact entry sequence of the v95 local
 * TemporaryStatSet body (NOT ascending bit order: EMHP/EMMP/EPAD/EPDD/EMDD sit
 * between Jump and MagicGuard). `null` field = read the 10-byte entry, discard.
 */
const LOCAL_ENTRY_ORDER: Array<[bigint, keyof BuffStatValues | null]> = [
  [CTS_PAD, 'pad'], [CTS_PDD, 'pdd'], [CTS_MAD, 'mad'], [CTS_MDD, 'mdd'],
  [CTS_ACC, 'acc'], [CTS_EVA, 'eva'], [CTS_CRAFT, 'craft'],
  [CTS_SPEED, 'speed'], [CTS_JUMP, 'jump'],
  [93n, null], [94n, null], [95n, null], [96n, null], [97n, null],
  [CTS_MAGIC_GUARD, 'magicGuard'], [CTS_DARK_SIGHT, 'darkSight'],
  [CTS_BOOSTER, 'booster'], [CTS_POWER_GUARD, 'powerGuard'],
  [98n, null], [99n, null], [100n, null],
  [CTS_MAX_HP, 'maxHp'], [CTS_MAX_MP, 'maxMp'],
  [CTS_INVINCIBLE, 'invincible'], [CTS_SOUL_ARROW, 'soulArrow'],
  [CTS_STUN, 'stun'], [CTS_POISON, 'poison'], [CTS_SEAL, 'seal'], [CTS_DARKNESS, 'darkness'],
  [CTS_COMBO, 'combo'], [CTS_CHARGE, 'charge'], [CTS_DRAGON_BLOOD, 'dragonBlood'],
  [CTS_HOLY_SYMBOL, 'holySymbol'], [CTS_MESO_UP, 'mesoUp'],
  [CTS_SHADOW_PARTNER, 'shadowPartner'], [CTS_PICK_POCKET, 'pickPocket'],
  [CTS_MESO_GUARD, 'mesoGuard'], [CTS_THAW, 'thaw'], [CTS_WEAKNESS, 'weakness'],
  [CTS_CURSE, 'curse'], [CTS_SLOW, 'slow'], [CTS_MORPH, 'morph'],
  [49n, null],
  [CTS_REGEN, 'regen'], [CTS_BASIC_STAT_UP, 'basicStatUp'], [CTS_STANCE, 'stance'],
  [CTS_SHARP_EYES, 'sharpEyes'], [CTS_MANA_REFLECTION, 'manaReflection'],
  [CTS_ATTRACT, 'attract'], [40n, null],
  [CTS_INFINITY, 'infinity'],
  [42n, null], [43n, null], [44n, null], [45n, null], [46n, null],
  [47n, null],
  [CTS_BARRIER, 'barrier'],
  [51n, null], [48n, null], [52n, null],
  [53n, null], [54n, null],
  [55n, null], [56n, null],
  [59n, null], [60n, null],
  [CTS_SPARK, 'spark'],
  [63n, null], [64n, null], [65n, null],
  [CTS_WIND_WALK, 'windWalk'],
  [67n, null],
  [CTS_ARAN_COMBO, 'aranCombo'], [CTS_COMBO_DRAIN, 'comboDrain'],
  [CTS_COMBO_BARRIER, 'comboBarrier'], [CTS_BODY_PRESSURE, 'bodyPressure'],
  [CTS_SMART_KNOCKBACK, 'smartKnockback'], [CTS_REPEAT_EFFECT, 'repeatEffect'],
  [CTS_EXP_BUFF_RATE, 'expBuffRate'],
  [57n, null], [58n, null],
  [CTS_STOP_PORTION, 'stopPortion'], [CTS_STOP_MOTION, 'stopMotion'],
  [CTS_FEAR, 'fear'], [CTS_EVAN_SLOW, 'evanSlow'],
  [CTS_MAGIC_SHIELD, 'magicShield'], [CTS_MAGIC_RESISTANCE, 'magicResistance'],
  [CTS_SOUL_STONE, 'soulStone'], [CTS_FLYING, 'flying'], [CTS_FROZEN, 'frozen'],
  [84n, null], [85n, null],
  [CTS_SUDDEN_DEATH, 'suddenDeath'], [CTS_NOT_DAMAGED, 'notDamaged'],
  [CTS_FINAL_CUT, 'finalCut'], [CTS_THORNS_EFFECT, 'thornsEffect'],
  [90n, null],
  [91n, null], [92n, null],
  [101n, null],
  [CTS_SWALLOW_CRITICAL, 'swallowCritical'],
  [103n, null], [104n, null], [105n, null],
  [106n, null], [107n, null], [108n, null],
  [109n, null],
  [110n, null], [111n, null], [112n, null], [113n, null],
  [114n, null], [115n, null],
  [CTS_DICE, 'dice'], [CTS_BLESSING_ARMOR, 'blessingArmor'],
  [CTS_DAMR, 'damR'], [CTS_TELEPORT_MASTERY, 'teleportMastery'],
  [CTS_COMBAT_ORDERS, 'combatOrders'], [CTS_BEHOLDER, 'beholder'],
  [129n, null],
  // Two-state stats also encoded as normal entries in this loop (the server
  // writes them here AND again in the two-state tail).
  [122n, null], [123n, null], [124n, null],
  [CTS_RIDE_VEHICLE, 'rideVehicle'], [126n, null],
  [CTS_GUIDED_BULLET, 'guidedBullet'],
];

/**
 * Per-stat buff values. Each field stores the raw buff value for that stat type.
 * Only populated when the corresponding bit is set in the TemporaryStatSet mask.
 */
export interface BuffStatValues {
  // Common stats
  pad: number;   // Physical ATK (buff)
  pdd: number;
  mad: number;
  mdd: number;
  acc: number;
  eva: number;
  craft: number;
  speed: number;
  jump: number;

  // Skill-specific
  magicGuard: number;
  darkSight: number;
  booster: number;
  powerGuard: number;
  maxHp: number;
  maxMp: number;
  invincible: number;
  soulArrow: number;
  stun: number;
  poison: number;
  seal: number;
  darkness: number;
  combo: number;
  charge: number;
  dragonBlood: number;
  holySymbol: number;
  mesoUp: number;
  shadowPartner: number;
  pickPocket: number;
  mesoGuard: number;
  thaw: number;
  weakness: number;
  curse: number;
  slow: number;
  morph: number;
  regen: number;
  basicStatUp: number;
  stance: number;
  sharpEyes: number;
  manaReflection: number;
  attract: number;
  noBulletConsume: number;
  infinity: number;
  advancedBless: number;
  illusion: number;
  berserkFury: number;
  divineBody: number;
  spark: number;
  finalAttack: number;
  windWalk: number;
  aranCombo: number;
  comboDrain: number;
  comboBarrier: number;
  bodyPressure: number;
  smartKnockback: number;
  repeatEffect: number;
  expBuffRate: number;
  stopPortion: number;
  stopMotion: number;
  fear: number;
  evanSlow: number;
  magicShield: number;
  magicResistance: number;
  soulStone: number;
  flying: number;
  frozen: number;
  elementLight: number;
  elementDark: number;
  elementFire: number;
  elementIce: number;
  addAttackCount: number;
  addAttackX: number;
  crushItemEnchant: number;
  blessingArmor: number;
  damR: number;
  teleportMastery: number;
  combatOrders: number;
  beholder: number;
  addBuffItemId: number;
  hyperBody: number;
  rush: number;
  web: number;
  elementalCharge: number;
  venom: number;
  darkAtomic: number;
  bombArrow: number;
  suddenDeath: number;
  boarding: number;
  additionalPmp: number;
  aranWhirlwind: number;
  magnet: number;
  flashBang: number;
  swallowBuff: number;
  hitTeleport: number;
  moreWildBuff: number;
  hide: number;
  cygnusFlame: number;
  strBuff: number;
  dexBuff: number;
  intBuff: number;
  lukBuff: number;
  attackCount: number;
  buffImmune: number;
  skillFixed: number;
  aranBind: number;
  notDamaged: number;
  finalCut: number;
  damageUp: number;
  hyperBodyDef: number;
  hyperBodyHp: number;
  hyperBodyMp: number;
  elementCharge2: number;
  barrier: number;
  guidedBullet: number;
  undead: number;
  rideVehicle: number;
  dice: number;
  thornsEffect: number;
  swallowCritical: number;
}

function defaultBuffValues(): BuffStatValues {
  return {
    pad: 0, pdd: 0, mad: 0, mdd: 0,
    acc: 0, eva: 0, craft: 0, speed: 0, jump: 0,
    magicGuard: 0, darkSight: 0, booster: 0, powerGuard: 0,
    maxHp: 0, maxMp: 0, invincible: 0, soulArrow: 0,
    stun: 0, poison: 0, seal: 0, darkness: 0,
    combo: 0, charge: 0, dragonBlood: 0, holySymbol: 0,
    mesoUp: 0, shadowPartner: 0, pickPocket: 0, mesoGuard: 0,
    thaw: 0, weakness: 0, curse: 0, slow: 0,
    morph: 0, regen: 0, basicStatUp: 0, stance: 0,
    sharpEyes: 0, manaReflection: 0, attract: 0, noBulletConsume: 0,
    infinity: 0, advancedBless: 0, illusion: 0, berserkFury: 0,
    divineBody: 0, spark: 0, finalAttack: 0, windWalk: 0,
    aranCombo: 0, comboDrain: 0, comboBarrier: 0, bodyPressure: 0,
    smartKnockback: 0, repeatEffect: 0, expBuffRate: 0,
    stopPortion: 0, stopMotion: 0, fear: 0, evanSlow: 0,
    magicShield: 0, magicResistance: 0, soulStone: 0, flying: 0,
    frozen: 0, elementLight: 0, elementDark: 0, elementFire: 0,
    elementIce: 0, addAttackCount: 0, addAttackX: 0, crushItemEnchant: 0,
    blessingArmor: 0, damR: 0, teleportMastery: 0, combatOrders: 0,
    beholder: 0, addBuffItemId: 0, hyperBody: 0, rush: 0,
    web: 0, elementalCharge: 0, venom: 0, darkAtomic: 0,
    bombArrow: 0, suddenDeath: 0, boarding: 0, additionalPmp: 0,
    aranWhirlwind: 0, magnet: 0, flashBang: 0, swallowBuff: 0,
    hitTeleport: 0, moreWildBuff: 0, hide: 0, cygnusFlame: 0,
    strBuff: 0, dexBuff: 0, intBuff: 0, lukBuff: 0,
    attackCount: 0, buffImmune: 0, skillFixed: 0, aranBind: 0,
    notDamaged: 0, finalCut: 0, damageUp: 0, hyperBodyDef: 0,
    hyperBodyHp: 0, hyperBodyMp: 0, elementCharge2: 0,
    barrier: 0, guidedBullet: 0, undead: 0, rideVehicle: 0,
    dice: 0, thornsEffect: 0, swallowCritical: 0,
  };
}

/** Per-entry decoded from the packet: value + skillId + seconds. */
interface RawEntry {
  bit: number;
  value: number;
  skillId: number;
  seconds: number;
}

export class SecondaryStat {
  /** Flat buff values indexed by stat type. */
  private _buff = defaultBuffValues();

  /** Map skillId → { value, seconds } for backward compat (combo counter, etc.) */
  private _stats = new Map<number, { value: number; seconds: number }>();

  /** Per-bit raw entries for inline-data post-processing. */
  private _rawEntries: RawEntry[] = [];

  /** DefenseAtt/DefenseState trailing bytes. */
  private _defenseAtt = 0;
  private _defenseState = 0;

  /** Dice info array (22 ints) when CTS_Dice is set. */
  private _diceInfo: number[] = [];

  /** SwallowBuff timer when CTS_SwallowBuff is set. */
  private _swallowBuffTime = 0;

  /** BlessingArmor extra PAD when CTS_BlessingArmor is set. */
  private _blessingArmorIncPAD = 0;

  clear(): void {
    this._buff = defaultBuffValues();
    this._stats.clear();
    this._rawEntries = [];
    this._defenseAtt = 0;
    this._defenseState = 0;
    this._diceInfo = [];
    this._swallowBuffTime = 0;
    this._blessingArmorIncPAD = 0;
  }

  // ── Per-stat getters ──

  get buff(): Readonly<BuffStatValues> { return this._buff; }

  // Convenience getters for commonly accessed stats
  getTempSpeed(): number { return this._buff.speed; }
  getTempJump(): number { return this._buff.jump; }
  getBasicStatUp(): number { return this._buff.basicStatUp; }
  get defenseAtt(): number { return this._defenseAtt; }
  get defenseState(): number { return this._defenseState; }
  get diceInfo(): readonly number[] { return this._diceInfo; }
  get swallowBuffTime(): number { return this._swallowBuffTime; }
  get blessingArmorIncPAD(): number { return this._blessingArmorIncPAD; }

  /** Combo counter from skills 1111003/1111004/1111005. */
  getComboCounter(): number {
    for (const skillId of [1111003, 1111004, 1111005]) {
      const s = this._stats.get(skillId);
      if (s) return s.value;
    }
    return 0;
  }

  getBySkillId(skillId: number): { value: number; seconds: number } | undefined {
    return this._stats.get(skillId);
  }

  /** All decoded entries (skillId → { value, seconds }) — backward compat. */
  allEntries(): Iterable<[number, { value: number; seconds: number }]> {
    return this._stats.entries();
  }

  // ── Combat stat contribution getters ──

  /** Total physical ATK buff. */
  getBuffPAD(): number { return this._buff.pad; }

  /** Total magical ATK buff. */
  getBuffMAD(): number { return this._buff.mad; }

  /** Total physical DEF buff. */
  getBuffPDD(): number { return this._buff.pdd; }

  /** Total magical DEF buff. */
  getBuffMDD(): number { return this._buff.mdd; }

  /** Flat accuracy buff value. */
  getBuffACC(): number { return this._buff.acc; }

  /** Flat avoidability buff value. */
  getBuffEVA(): number { return this._buff.eva; }

  /** Magic Guard damage-to-MP conversion percentage (0-100). */
  getMagicGuardReduction(): number { return this._buff.magicGuard; }

  /** Power Guard damage-to-HP reflection percentage (0-100). */
  getPowerGuardReduction(): number { return this._buff.powerGuard; }

  /** Meso Guard damage-to-meso absorption percentage (0-100). */
  getMesoGuardReduction(): number { return this._buff.mesoGuard; }

  /** Holy Symbol EXP rate bonus (0-100%). */
  getHolySymbolExpRate(): number { return this._buff.holySymbol; }

  /** Sharp Eyes critical rate bonus (0-100%). The CTS value is packed as
   *  (critRate << 8) | critDamageMax (server SkillProcessor encodes
   *  `(x<<8)+criticaldamageMax`); OG GetCriticalProp reads `fuse(nSharpEyes) >> 8`
   *  clamped [0,100]. */
  getSharpEyesCritRate(): number { return Math.min(100, Math.max(0, this._buff.sharpEyes >> 8)); }

  /** Stance dodge probability (0-100%). */
  getStanceRate(): number { return this._buff.stance; }

  /** DarkSight active (non-zero = active). */
  isDarkSightActive(): boolean { return this._buff.darkSight !== 0; }

  /** Booster active (non-zero = active). */
  isBoosterActive(): boolean { return this._buff.booster !== 0; }

  /** ShadowPartner active (non-zero = active). */
  isShadowPartnerActive(): boolean { return this._buff.shadowPartner !== 0; }

  /** HyperBody active (non-zero = active). */
  isHyperBodyActive(): boolean { return this._buff.hyperBody !== 0; }

  /** Stun active (non-zero = active). */
  isStunActive(): boolean { return this._buff.stun !== 0; }

  /** Poison active (non-zero = active). */
  isPoisonActive(): boolean { return this._buff.poison !== 0; }

  /** Seal active (non-zero = active). */
  isSealActive(): boolean { return this._buff.seal !== 0; }

  /** Freeze active (non-zero = active). */
  isFrozenActive(): boolean { return this._buff.frozen !== 0; }

  /** Web/bind active (non-zero = active). */
  isWebActive(): boolean { return this._buff.web !== 0; }

  /** Combo counter from aran combo skill (non-zero = active). */
  getAranCombo(): number { return this._buff.aranCombo; }

  /** Combo drain percentage. */
  getComboDrainRate(): number { return this._buff.comboDrain; }

  /** ShadowPartner damage percentage bonus (0-100%). */
  getShadowPartnerDamageRate(): number { return this._buff.shadowPartner; }

  /** Booster attack speed bonus (negative = faster). */
  getBoosterSpeedBonus(): number { return this._buff.booster; }

  /** HyperBody HP/MP multiplier percentage. */
  getHyperBodyHpMultiplier(): number { return this._buff.hyperBodyHp; }

  getHyperBodyMpMultiplier(): number { return this._buff.hyperBodyMp; }

  /**
   * Decode a TemporaryStatSet packet body — mirrors the server's
   * SecondaryStat.encodeForLocal (port of OG DecodeForLocal):
   *   1. 128-bit mask (16 raw bytes)
   *   2. LOCAL_ENCODE_ORDER entries for set stats: (value: short, skillId: int, seconds: int)
   *   3. Unconditional: DefenseAtt (byte), DefenseState (byte)
   *   4. Swallow-buff group byte (seconds/1000) when any swallow stat is set
   *   5. Dice (22 ints) / BlessingArmor (1 int) inline data when set
   *   6. Two-state tail [RideVehicle, PartyBooster, GuidedBullet]:
   *      (expire: byte, nOption: int, rOption: int, tOption: int, secondValue: short)
   */
  decode(p: InPacket): void {
    this.clear();

    const maskLo = p.readLong();
    const maskHi = p.readLong();
    const mask = [maskLo, maskHi]; // mask[0]=lo, mask[1]=hi

    // Phase 2: entries appear in LOCAL_ENCODE_ORDER sequence, only for set stats.
    this._rawEntries = [];
    for (const [bit, fieldName] of LOCAL_ENTRY_ORDER) {
      if (!this._isBitSet(mask, bit)) continue;
      const value = p.readShort();
      const skillId = p.readInt();
      const seconds = p.readInt();
      const bitNum = Number(bit);
      this._rawEntries.push({ bit: bitNum, value, skillId, seconds });
      if (fieldName && fieldName in this._buff) {
        (this._buff as any)[fieldName] = value;
      }
      this._stats.set(skillId, { value, seconds });
    }

    // Phase 3: unconditional DefenseAtt + DefenseState bytes.
    this._defenseAtt = p.readByte();
    this._defenseState = p.readByte();

    // Phase 4: swallow-buff group — one shared byte when any swallow stat is set.
    for (const bit of SWALLOW_GROUP_BITS) {
      if (this._isBitSet(mask, bit)) {
        this._swallowBuffTime = p.readByte();
        break;
      }
    }

    // Phase 5: inline data.
    if (this._isBitSet(mask, CTS_DICE)) {
      this._diceInfo = [];
      for (let j = 0; j < 22; j++) {
        this._diceInfo.push(p.readInt());
      }
    }
    if (this._isBitSet(mask, CTS_BLESSING_ARMOR)) {
      this._blessingArmorIncPAD = p.readInt();
    }

    // Phase 6: two-state tail.
    for (const [bit, fieldName] of TWO_STATE_ORDER) {
      if (!this._isBitSet(mask, bit)) continue;
      p.readByte();               // expire mode (EXPIRE_BASED_ON_LAST_UPDATED_TIME)
      const nOption = p.readInt();
      p.readInt();                // rOption
      p.readInt();                // tOption
      p.readShort();              // secondValue
      if (fieldName && fieldName in this._buff) {
        (this._buff as any)[fieldName] = nOption;
      }
    }
  }

  private _isBitSet(mask: bigint[], bit: bigint): boolean {
    if (bit < 64n) {
      return (mask[0] & (1n << bit)) !== 0n;
    }
    return (mask[1] & (1n << (bit - 64n))) !== 0n;
  }

  // ---- remote (OG SecondaryStat::DecodeForRemote @0x72B7B0) -----

  /**
   * Per-stat byte sizes in the OG DecodeForRemote order.
   * Each tuple: [CTS bit position, bytes to skip when bit is set].
   * Bit positions match the server's CharacterTemporaryStat enum.
   */
  private static readonly REMOTE_STAT_SKIP: readonly [number, number][] = [
    [7, 1],    // Speed → Decode1
    [21, 1],   // ComboCounter → Decode1
    [22, 4],   // WeaponCharge → Decode4
    [17, 4],   // Stun → Decode4
    [20, 4],   // Darkness → Decode4
    [19, 4],   // Seal → Decode4
    [30, 4],   // Weakness → Decode4
    [31, 4],   // Curse → Decode4
    [18, 6],   // Poison → Decode2 + Decode4
    [26, 4],   // ShadowPartner → Decode4
    [10, 0],   // DarkSight → flag only
    [16, 0],   // SoulArrow → flag only
    [33, 2],   // Morph → Decode2
    [49, 2],   // Ghost → Decode2
    [39, 4],   // Attract → Decode4
    [40, 4],   // SpiritJavelin → Decode4
    [46, 4],   // BanMap → Decode4
    [50, 4],   // Barrier → Decode4
    [62, 4],   // DojangShield → Decode4
    [51, 4],   // ReverseInput → Decode4
    [53, 4],   // RespectPImmune → Decode4
    [54, 4],   // RespectMImmune → Decode4
    [55, 4],   // DefenseAtt → Decode4
    [56, 4],   // DefenseState → Decode4
    [59, 0],   // DojangBerserk → flag only
    [60, 0],   // DojangInvincible → flag only
    [66, 0],   // WindWalk → flag only
    [73, 4],   // RepeatEffect → Decode4
    [75, 4],   // StopPortion → Decode4
    [76, 4],   // StopMotion → Decode4
    [77, 4],   // Fear → Decode4
    [79, 4],   // MagicShield → Decode4
    [82, 0],   // Flying → flag only
    [83, 4],   // Frozen → Decode4
    [86, 4],   // SuddenDeath → Decode4
    [88, 4],   // FinalCut → Decode4
    [101, 1],  // Cyclone → Decode1
    [108, 0],  // Sneak → flag only
    [91, 0],   // MorewildDamageUp → flag only
    [109, 4],  // Mechanic → Decode4
    [111, 4],  // DarkAura → Decode4
    [112, 4],  // BlueAura → Decode4
    [113, 4],  // YellowAura → Decode4
    [117, 0],  // BlessingArmor → flag only
  ];

  /**
   * Per-stat layout of the REMOTE temporary-stat payload (OG
   * DecodeForRemote 0x72B7B0 — same sequence the server's
   * encodeForRemoteWithFlag writes). kind: 'n1'/'n2'/'n4' = nOption byte/
   * short/int, 'r4' = rOption int (the skillId/reason), 'si' = Poison
   * short+int pair, 'flag' = no payload bytes.
   */
  private static readonly REMOTE_DECODE_ORDER: readonly [number, string][] = [
    [7, 'n1'],    // Speed
    [21, 'n1'],   // ComboCounter
    [22, 'r4'],   // WeaponCharge
    [17, 'r4'],   // Stun
    [20, 'r4'],   // Darkness
    [19, 'r4'],   // Seal
    [30, 'r4'],   // Weakness
    [31, 'r4'],   // Curse
    [18, 'si'],   // Poison → short nOption + int rOption
    [26, 'r4'],   // ShadowPartner
    [10, 'flag'], // DarkSight
    [16, 'flag'], // SoulArrow
    [33, 'n2'],   // Morph
    [49, 'n2'],   // Ghost
    [39, 'r4'],   // Attract
    [40, 'n4'],   // SpiritJavelin
    [46, 'r4'],   // BanMap
    [50, 'r4'],   // Barrier
    [62, 'r4'],   // DojangShield
    [51, 'r4'],   // ReverseInput
    [53, 'n4'],   // RespectPImmune
    [54, 'n4'],   // RespectMImmune
    [55, 'n4'],   // DefenseAtt
    [56, 'n4'],   // DefenseState
    [59, 'flag'], // DojangBerserk
    [60, 'flag'], // DojangInvincible
    [66, 'flag'], // WindWalk
    [73, 'r4'],   // RepeatEffect
    [75, 'r4'],   // StopPortion
    [76, 'r4'],   // StopMotion
    [77, 'r4'],   // Fear
    [79, 'n4'],   // MagicShield
    [82, 'flag'], // Flying
    [83, 'r4'],   // Frozen
    [86, 'r4'],   // SuddenDeath
    [88, 'r4'],   // FinalCut
    [101, 'n1'],  // Cyclone
    [108, 'flag'],// Sneak
    [91, 'flag'], // MorewildDamageUp
    [109, 'r4'],  // Mechanic
    [111, 'r4'],  // DarkAura
    [112, 'r4'],  // BlueAura
    [113, 'r4'],  // YellowAura
    [117, 'flag'],// BlessingArmor
  ];

  /** Remote-decode result: raw per-stat entries plus the trailing bytes. */
  static decodeRemote(p: InPacket): {
    maskLo: bigint; maskHi: bigint;
    entries: RawEntry[];
    defenseAtt: number; defenseState: number;
  } {
    const maskLo = p.readLong();
    const maskHi = p.readLong();
    const mask = [maskLo, maskHi];
    const isSet = (bit: number): boolean =>
      bit < 64 ? (maskLo & (1n << BigInt(bit))) !== 0n
               : (maskHi & (1n << BigInt(bit - 64))) !== 0n;

    const entries: RawEntry[] = [];
    for (const [bit, kind] of SecondaryStat.REMOTE_DECODE_ORDER) {
      if (!isSet(bit)) continue;
      let nOption = 0;
      let skillId = 0;
      switch (kind) {
        case 'n1': nOption = p.readByte(); break;
        case 'n2': nOption = p.readShort(); break;
        case 'n4': nOption = p.readInt(); break;
        case 'r4': skillId = p.readInt(); nOption = 1; break;
        case 'si': nOption = p.readShort(); skillId = p.readInt(); break;
        case 'flag': nOption = 1; break;
      }
      entries.push({ bit, value: nOption, skillId, seconds: 0 });
    }

    // Trailing bytes: DefenseAtt_Elem (byte) + DefenseState_Stat (byte)
    const defenseAtt = p.readByte();
    const defenseState = p.readByte();

    // Two-state entries: bits 122..128, each 15 bytes when set
    // (Decode1 + Decode4 + Decode4 + Decode4 + Decode2 = 15)
    for (let i = 0; i < 7; i++) {
      if (isSet(122 + i)) {
        p.skip(15);
      }
    }

    return { maskLo, maskHi, entries, defenseAtt, defenseState };
  }

  /**
   * Skip the remote secondary stat payload from an InPacket.
   * Matches OG SecondaryStat::DecodeForRemote (0x72B7B0):
   *   - 16-byte UINT128 flag
   *   - per-stat variable data (order/size per REMOTE_STAT_SKIP)
   *   - 2 trailing bytes (DefenseAtt, DefenseState)
   *   - up to 7 two-state entries (bits 122-128), each 15 bytes when set
   */
  static skipForRemote(p: InPacket): void {
    const maskLo = p.readLong();
    const maskHi = p.readLong();
    const mask = [maskLo, maskHi];

    for (const [bit, nbytes] of SecondaryStat.REMOTE_STAT_SKIP) {
      if (nbytes > 0 && bit < 128) {
        const bigBit = BigInt(bit);
        const isSet = bit < 64
          ? (maskLo & (1n << bigBit)) !== 0n
          : (maskHi & (1n << (bigBit - 64n))) !== 0n;
        if (isSet) p.skip(nbytes);
      }
    }

    // Trailing bytes: DefenseAtt_Elem (byte) + DefenseState_Stat (byte)
    p.skip(2);

    // Two-state entries: bits 122..128, each 15 bytes when set
    // (Decode1 + Decode4 + Decode4 + Decode4 + Decode2 = 15)
    for (let i = 0; i < 7; i++) {
      const bit = 122 + i;
      const bigBit = BigInt(bit);
      const isSet = bit < 64
        ? (maskLo & (1n << bigBit)) !== 0n
        : (maskHi & (1n << (bigBit - 64n))) !== 0n;
      if (isSet) p.skip(15);
    }
  }
}
